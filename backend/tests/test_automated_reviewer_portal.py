import time
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models.application import Application
from app.models.document import Document
from app.models.verification_job import VerificationJob
from app.models.application_report import ApplicationReport
from app.services.audit_service import verify_audit_chain
from app.services.job_queue import run_job_sync

client = TestClient(app)

def get_token(email: str, password: str = "password123", portal: str = None) -> str:
    payload = {"email": email, "password": password}
    if portal:
        payload["portal"] = portal
    res = client.post("/api/auth/login", json=payload)
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    return res.json()["access_token"]

@pytest.fixture(scope="module")
def inst_token():
    return get_token("institution@greenfield.edu", "password123", portal="institution")

@pytest.fixture(scope="module")
def reviewer_token():
    return get_token("reviewer@aicte.gov.in", "password123", portal="reviewer")

@pytest.fixture(scope="module")
def admin_token():
    return get_token("admin@aicte.gov.in", "password123")

def test_automated_review_trigger_on_submission(inst_token, reviewer_token):
    """
    Validates Pillar 1 & 4: Submitting an application automatically triggers
    a persistent verification job in MySQL, executes real checks, and persists
    an ApplicationReport without manual reviewer intervention.
    """
    inst_headers = {"Authorization": f"Bearer {inst_token}"}
    rev_headers = {"Authorization": f"Bearer {reviewer_token}"}

    # 1. Create a fresh draft application for Greenfield Institute (Institution ID: 1)
    create_payload = {
        "category": "Extension of Approval (EOA)",
        "academic_year": "2026-27",
        "level": "Undergraduate (UG)",
        "program": "Computer Science & Engineering",
        "total_faculty_declared": 42,
        "total_intake_declared": 600,
        "built_up_area_sqm": 14500.0,
        "land_area_acres": 8.5
    }
    create_res = client.post("/api/applications", headers=inst_headers, json=create_payload)
    assert create_res.status_code == 201
    new_app = create_res.json()
    app_id = new_app["id"]

    # 2. Upload a valid test PDF document to satisfy submission checklist
    pdf_content = (
        b"%PDF-1.4\n1 0 obj<< /Type /Catalog /Pages 2 0 R>>endobj\n"
        b"2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1>>endobj\n"
        b"3 0 obj<< /Type /Page /Parent 2 0 R /Resources <<>> /MediaBox [0 0 612 792] /Contents 4 0 R>>endobj\n"
        b"4 0 obj<< /Length 120>>stream\n"
        b"BT /F1 12 Tf 72 712 Td (Greenfield Institute of Technology) Tj "
        b"(Total Faculty: 42 Approved Intake: 600 Built-up Area: 14500.0 sqm Land Area: 8.5 Acres) Tj ET\n"
        b"endstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n"
        b"0000000115 00000 n \n0000000216 00000 n \ntrailer<< /Size 5 /Root 1 0 R>>\nstartxref\n386\n%%EOF"
    )
    files = {"file": ("test_compliance_dossier.pdf", pdf_content, "application/pdf")}
    data = {"category": "Faculty Information"}
    upload_res = client.post(f"/api/applications/{app_id}/documents", headers=inst_headers, files=files, data=data)
    assert upload_res.status_code == 201

    # 3. Formally Submit Application as Institution signatory
    submit_res = client.post(f"/api/applications/{app_id}/submit", headers=inst_headers)
    assert submit_res.status_code == 200
    submitted_app = submit_res.json()
    assert submitted_app["status"] in ["Submitted", "Under Review"]

    # 4. Confirm persistent VerificationJob was created in MySQL
    db = SessionLocal()
    job = db.query(VerificationJob).filter(VerificationJob.application_id == app_id).first()
    assert job is not None
    assert job.status in ["Pending", "Processing", "Completed", "Needs Manual Review", "Failed", "PENDING", "PROCESSING", "COMPLETED", "FLAGGED_FOR_MANUAL_REVIEW"]
    assert job.trigger_source == "SUBMISSION"
    
    # Wait for background job to finish
    max_wait = 10.0
    start_time = time.time()
    while time.time() - start_time < max_wait:
        db.rollback()
        job = db.query(VerificationJob).filter(VerificationJob.application_id == app_id).first()
        if job and job.status in ["Completed", "Needs Manual Review", "Failed", "COMPLETED", "FLAGGED_FOR_MANUAL_REVIEW", "FAILED"]:
            break
        time.sleep(0.3)

    if job.status in ["Pending", "Processing", "PENDING", "PROCESSING"]:
        run_job_sync(job.job_id)
        db.rollback()
        job = db.query(VerificationJob).filter(VerificationJob.application_id == app_id).first()

    assert job.status in ["Completed", "Needs Manual Review", "COMPLETED", "FLAGGED_FOR_MANUAL_REVIEW"]
    assert job.progress_percent == 100

    # 5. Confirm official ApplicationReport was persisted in MySQL
    report = db.query(ApplicationReport).filter(ApplicationReport.application_id == app_id).first()
    assert report is not None
    assert report.report_number.startswith("AICTE-RPT-")
    assert report.readiness_score > 0
    assert report.risk_level in ["Low Risk", "Moderate Risk", "High Risk", "Critical Risk"]
    assert report.audit_event_hash is not None
    db.close()

    # 6. Confirm Report appears in Reviewer Portal via API queries
    # Query /reports/verification
    rep_list_res = client.get("/api/reports/verification", headers=rev_headers)
    assert rep_list_res.status_code == 200
    report_items = rep_list_res.json()
    matching_reports = [r for r in report_items if r["application_id"] == app_id]
    assert len(matching_reports) >= 1
    assert matching_reports[0]["report_number"] == report.report_number

    # Query /reports/application/{app_id}
    app_report_res = client.get(f"/api/reports/application/{app_id}", headers=rev_headers)
    assert app_report_res.status_code == 200
    detail = app_report_res.json()
    assert detail["id"] == report.id
    assert "report_data" in detail
    assert "compliance_checklist" in detail["report_data"]
    assert "detailed_findings" in detail["report_data"]
    assert "score_explanation" in detail

def test_reviewer_live_status_telemetry(reviewer_token):
    """
    Validates Pillar 5: Live telemetry endpoint returns separate counts for:
    - processing
    - completed
    - flagged_for_manual_review
    - processing_failed
    - ready_for_reviewer_decision
    """
    headers = {"Authorization": f"Bearer {reviewer_token}"}
    res = client.get("/api/dashboard/reviewer-live-status", headers=headers)
    assert res.status_code == 200
    data = res.json()

    assert "processing" in data
    assert "completed" in data
    assert "flagged_for_manual_review" in data
    assert "processing_failed" in data
    assert "ready_for_reviewer_decision" in data
    assert isinstance(data["recent_jobs"], list)

def test_job_retry_mechanism(admin_token):
    """
    Validates Pillar 5: Safe retry mechanism for verification jobs.
    """
    headers = {"Authorization": f"Bearer {admin_token}"}
    db = SessionLocal()
    # Find any existing job
    job = db.query(VerificationJob).first()
    assert job is not None
    job_id = job.job_id
    db.close()

    retry_res = client.post(f"/api/verification-jobs/{job_id}/retry", headers=headers)
    assert retry_res.status_code == 200
    retried_job = retry_res.json()
    assert retried_job["job_id"] == job_id

def test_rbac_report_isolation(inst_token, reviewer_token):
    """
    Validates Pillar 6: RBAC isolation for reports.
    Institution users only see reports belonging to their institution.
    """
    inst_headers = {"Authorization": f"Bearer {inst_token}"}
    res = client.get("/api/reports/verification", headers=inst_headers)
    assert res.status_code == 200
    inst_reports = res.json()
    # All returned reports must belong to institution 1 (Greenfield)
    for r in inst_reports:
        assert r["institution_id"] == 1

def test_tamper_evident_audit_chain_intact(admin_token):
    """
    Validates Pillar 6: Cryptographic audit chain remains unbroken and valid
    after automated review and report generation.
    """
    db = SessionLocal()
    is_valid, count, broken_idx, msg, first_h, last_h = verify_audit_chain(db)
    db.close()
    assert is_valid is True, f"Audit chain broken: {msg}"
    assert count > 0
    assert broken_idx is None
