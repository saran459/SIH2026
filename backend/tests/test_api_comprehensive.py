import os
import io
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.database import SessionLocal, engine, Base
from app.models.user import User
from app.models.application import Application, WorkflowEvent
from app.models.document import Document, ExtractedField
from app.models.compliance import ComplianceFinding, ComplianceRule
from app.models.reviewer import ReviewerComment
from app.models.deadline import Deadline, Notification
from app.models.audit import AuditEvent
from app.services.audit_service import verify_audit_chain
from app.services.consistency_engine import check_cross_document_consistency
from app.services.digital_twin_service import get_digital_twin_state, simulate_what_if_scenario

client = TestClient(app)

# Helper tokens
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


# ==============================================================================
# FEATURE 1: Authentication, Logout, Invalid Credentials, Role Rejection
# ==============================================================================

def test_feature1_valid_logins_both_portals(inst_token, reviewer_token):
    """Verify valid login returns proper token, role, and user details."""
    assert inst_token is not None and len(inst_token) > 20
    assert reviewer_token is not None and len(reviewer_token) > 20

    # Verify /api/auth/me returns corresponding user
    me_inst = client.get("/api/auth/me", headers={"Authorization": f"Bearer {inst_token}"})
    assert me_inst.status_code == 200
    assert me_inst.json()["role"] == "institution"
    assert me_inst.json()["email"] == "institution@greenfield.edu"

    me_rev = client.get("/api/auth/me", headers={"Authorization": f"Bearer {reviewer_token}"})
    assert me_rev.status_code == 200
    assert me_rev.json()["role"] == "reviewer"
    assert me_rev.json()["email"] == "reviewer@aicte.gov.in"

def test_feature1_invalid_credentials():
    """Verify invalid password and non-existent email return 401 Unauthorized."""
    # Wrong password
    res_wrong_pw = client.post("/api/auth/login", json={
        "email": "institution@greenfield.edu",
        "password": "WrongPassword!999",
        "portal": "institution"
    })
    assert res_wrong_pw.status_code == 401
    assert "Invalid email or password" in res_wrong_pw.json()["detail"]

    # Non-existent user
    res_no_user = client.post("/api/auth/login", json={
        "email": "ghost.user@doesnotexist.edu",
        "password": "password123",
        "portal": "institution"
    })
    assert res_no_user.status_code == 401

def test_feature1_cross_portal_denial():
    """Verify role-based access denial when attempting to log in to the wrong portal."""
    # Institution attempting Reviewer Portal login -> 403
    res_inst_on_rev = client.post("/api/auth/login", json={
        "email": "institution@greenfield.edu",
        "password": "password123",
        "portal": "reviewer"
    })
    assert res_inst_on_rev.status_code == 403
    assert "reserved for Scrutiny Reviewers" in res_inst_on_rev.json()["detail"]

    # Reviewer attempting Institution Portal login -> 403
    res_rev_on_inst = client.post("/api/auth/login", json={
        "email": "reviewer@aicte.gov.in",
        "password": "password123",
        "portal": "institution"
    })
    assert res_rev_on_inst.status_code == 403
    assert "reserved for Institutional applicants" in res_rev_on_inst.json()["detail"]


# ==============================================================================
# FEATURE 2: Institution Dashboard, Applications Lifecycle, Uploads, Resubmission
# ==============================================================================

def test_feature2_institution_dashboard(inst_token):
    """Verify institution dashboard returns analytics and summary scoped to institution."""
    headers = {"Authorization": f"Bearer {inst_token}"}
    res = client.get("/api/dashboard/summary", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "total_applications" in data
    assert "draft_applications" in data
    assert "average_readiness_score" in data

    analytics_res = client.get("/api/dashboard/analytics", headers=headers)
    assert analytics_res.status_code == 200
    an_data = analytics_res.json()
    assert "summary" in an_data
    assert "status_breakdown" in an_data

def test_feature2_institution_create_update_and_cleanup_application(inst_token):
    """Verify creating an application, saving/updating it, and cleaning it up non-destructively."""
    headers = {"Authorization": f"Bearer {inst_token}"}
    db = SessionLocal()
    temp_app_id = None
    try:
        # Create draft application
        create_res = client.post("/api/applications", headers=headers, json={
            "academic_year": "2026-27",
            "category": "Extension of Approval (EoA)",
            "level": "Under Graduate",
            "program": "Engineering & Technology",
            "total_faculty_declared": 45,
            "total_intake_declared": 360,
            "built_up_area_sqm": 8200.0,
            "land_area_acres": 5.0
        })
        assert create_res.status_code == 201, f"Create failed: {create_res.text}"
        app_data = create_res.json()
        temp_app_id = app_data["id"]
        assert app_data["status"] == "Draft"
        assert app_data["total_faculty_declared"] == 45

        # Update / save changes
        update_res = client.put(f"/api/applications/{temp_app_id}", headers=headers, json={
            "total_faculty_declared": 48,
            "built_up_area_sqm": 8500.0
        })
        assert update_res.status_code == 200
        assert update_res.json()["total_faculty_declared"] == 48

        # Verify in application list
        list_res = client.get("/api/applications?status=Draft", headers=headers)
        assert list_res.status_code == 200
        ids = [a["id"] for a in list_res.json()]
        assert temp_app_id in ids

        # Verify application detail
        detail_res = client.get(f"/api/applications/{temp_app_id}", headers=headers)
        assert detail_res.status_code == 200
        assert detail_res.json()["id"] == temp_app_id
    finally:
        # Clean up temporary test application safely
        if temp_app_id:
            from app.models.verification_job import VerificationJob
            from app.models.application_report import ApplicationReport
            from app.models.document import Document
            from app.models.compliance import ComplianceFinding
            from app.models.deadline import Deadline, Notification
            from app.models.reviewer import ReviewerComment

            db.query(ApplicationReport).filter(ApplicationReport.application_id == temp_app_id).delete()
            db.query(VerificationJob).filter(VerificationJob.application_id == temp_app_id).delete()
            db.query(Document).filter(Document.application_id == temp_app_id).delete()
            db.query(ComplianceFinding).filter(ComplianceFinding.application_id == temp_app_id).delete()
            db.query(ReviewerComment).filter(ReviewerComment.application_id == temp_app_id).delete()
            db.query(Notification).filter(Notification.application_id == temp_app_id).delete()
            db.query(Deadline).filter(Deadline.application_id == temp_app_id).delete()
            db.query(WorkflowEvent).filter(WorkflowEvent.application_id == temp_app_id).delete()
            db.query(Application).filter(Application.id == temp_app_id).delete()
            db.commit()
        db.close()

def test_feature2_resubmission_flow(inst_token, reviewer_token):
    """Verify resubmission workflow for an application with Correction Required status."""
    headers_inst = {"Authorization": f"Bearer {inst_token}"}
    headers_rev = {"Authorization": f"Bearer {reviewer_token}"}
    db = SessionLocal()
    temp_app_id = None
    try:
        # Create draft application for Greenfield Institute (inst_id=1)
        create_res = client.post("/api/applications", headers=headers_inst, json={
            "academic_year": "2026-27",
            "category": "Extension of Approval (EoA)",
            "level": "Under Graduate",
            "program": "Engineering & Technology",
            "total_faculty_declared": 38,
            "total_intake_declared": 300,
            "built_up_area_sqm": 7500.0,
            "land_area_acres": 4.5
        })
        assert create_res.status_code == 201
        temp_app_id = create_res.json()["id"]

        # 1. Submit application
        sub_res = client.post(f"/api/applications/{temp_app_id}/transition", headers=headers_inst, json={
            "to_status": "Submitted",
            "comments": "Initial institutional submission."
        })
        assert sub_res.status_code == 200
        assert sub_res.json()["status"] == "Submitted"

        # 2. Reviewer moves to Under Review
        rev_start = client.post(f"/api/applications/{temp_app_id}/transition", headers=headers_rev, json={
            "to_status": "Under Review",
            "comments": "Commencing scrutiny."
        })
        assert rev_start.status_code == 200

        # 3. Reviewer requests correction
        rev_corr = client.post(f"/api/applications/{temp_app_id}/transition", headers=headers_rev, json={
            "to_status": "Correction Required",
            "comments": "Faculty list discrepancy noted."
        })
        assert rev_corr.status_code == 200
        assert rev_corr.json()["status"] == "Correction Required"

        # 4. Institution Resubmits application
        inst_resub = client.post(f"/api/applications/{temp_app_id}/transition", headers=headers_inst, json={
            "to_status": "Resubmitted",
            "comments": "Updated documentation attached."
        })
        assert inst_resub.status_code == 200
        assert inst_resub.json()["status"] == "Resubmitted"
    finally:
        if temp_app_id:
            from app.models.verification_job import VerificationJob
            from app.models.application_report import ApplicationReport
            from app.models.document import Document
            from app.models.compliance import ComplianceFinding
            from app.models.deadline import Deadline, Notification
            from app.models.reviewer import ReviewerComment

            db.query(ApplicationReport).filter(ApplicationReport.application_id == temp_app_id).delete()
            db.query(VerificationJob).filter(VerificationJob.application_id == temp_app_id).delete()
            db.query(Document).filter(Document.application_id == temp_app_id).delete()
            db.query(ComplianceFinding).filter(ComplianceFinding.application_id == temp_app_id).delete()
            db.query(ReviewerComment).filter(ReviewerComment.application_id == temp_app_id).delete()
            db.query(Notification).filter(Notification.application_id == temp_app_id).delete()
            db.query(Deadline).filter(Deadline.application_id == temp_app_id).delete()
            db.query(WorkflowEvent).filter(WorkflowEvent.application_id == temp_app_id).delete()
            db.query(Application).filter(Application.id == temp_app_id).delete()
            db.commit()
        db.close()


# ==============================================================================
# FEATURE 3: Reviewer Dashboard, Assigned Applications, Workbench, Decisions
# ==============================================================================

def test_feature3_reviewer_dashboard_and_assigned_apps(reviewer_token):
    """Verify reviewer dashboard metrics and assigned applications queue."""
    headers = {"Authorization": f"Bearer {reviewer_token}"}
    dash_res = client.get("/api/dashboard/summary", headers=headers)
    assert dash_res.status_code == 200
    assert dash_res.json()["total_applications"] >= 1

    # Assigned applications
    apps_res = client.get("/api/applications", headers=headers)
    assert apps_res.status_code == 200
    apps = apps_res.json()
    assert len(apps) >= 1

def test_feature3_reviewer_comment_and_correction_request(reviewer_token, inst_token):
    """Verify reviewer can create correction comments and institution can respond."""
    headers_rev = {"Authorization": f"Bearer {reviewer_token}"}
    headers_inst = {"Authorization": f"Bearer {inst_token}"}
    db = SessionLocal()

    # Application 1 is assigned to reviewer 3 and belongs to institution 1
    # Post comment as reviewer
    comment_res = client.post("/api/applications/1/comments", headers=headers_rev, json={
        "document_id": None,
        "section_reference": "Section 4.1 APH",
        "comment_type": "Deficiency",
        "comment_text": "Automated test deficiency comment for scrutiny."
    })
    assert comment_res.status_code == 201
    comment_data = comment_res.json()
    comment_id = comment_data["id"]
    assert comment_data["status"] == "Pending Response"

    try:
        # Institution responds to comment
        resp_res = client.post(f"/api/applications/1/comments/{comment_id}/respond", headers=headers_inst, json={
            "institution_response": "Corrected figures submitted."
        })
        assert resp_res.status_code == 200
        assert resp_res.json()["status"] == "Responded"
    finally:
        # Clean up comment
        db.query(ReviewerComment).filter(ReviewerComment.id == comment_id).delete()
        db.commit()
        db.close()

def test_feature3_reviewer_reports(reviewer_token):
    """Verify reviewer reports: workload, compliance matrix, SLA performance."""
    headers = {"Authorization": f"Bearer {reviewer_token}"}

    workload = client.get("/api/reports/reviewer-workload", headers=headers)
    assert workload.status_code == 200
    assert "reviewers" in workload.json()

    matrix = client.get("/api/reports/compliance-matrix", headers=headers)
    assert matrix.status_code == 200
    assert "matrix" in matrix.json()

    sla = client.get("/api/reports/sla-performance", headers=headers)
    assert sla.status_code == 200
    assert "records" in sla.json()


# ==============================================================================
# FEATURE 4: PDF Extraction, Integrity Checks, OCR Evaluation
# ==============================================================================

def test_feature4_pdf_text_extraction_and_hashing(inst_token):
    """Verify PDF upload, SHA-256 calculation, PyMuPDF text extraction, and extracted fields."""
    import pymupdf

    # Create an in-memory sample statutory PDF
    doc = pymupdf.open()
    page = doc.new_page(width=595, height=842)
    sample_text = (
        "Name of the Institution: Greenfield Institute of Technology\n"
        "Academic Year: 2026-27\n"
        "Total Regular Faculty: 42\n"
        "Approved Intake: 480\n"
        "Built-up Area: 8500 sqm\n"
        "Land Area: 5.2 Acres\n"
        "NOC Reference: AICTE/NOC/2026/KA-8812\n"
    )
    page.insert_text((50, 72), sample_text, fontsize=12)
    pdf_bytes = doc.tobytes()
    doc.close()

    headers = {"Authorization": f"Bearer {inst_token}"}
    files = {"file": ("statutory_compliance_doc.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
    data = {"category": "Audited Financial Statements"}

    # Upload to Application 1
    upload_res = client.post("/api/applications/1/documents", headers=headers, files=files, data=data)
    assert upload_res.status_code == 201
    doc_data = upload_res.json()
    doc_id = doc_data["id"]

    db = SessionLocal()
    try:
        # Verify SHA-256 integrity hash is populated and 64 hex characters
        assert len(doc_data["file_hash"]) == 64
        assert doc_data["extraction_status"] == "Extraction Complete"
        assert doc_data["page_count"] == 1
        assert "Greenfield Institute of Technology" in doc_data["raw_text"]

        # Verify extracted fields parsed automatically
        fields = doc_data["extracted_fields"]
        assert len(fields) >= 3
        field_dict = {f["field_name"]: f["extracted_value"] for f in fields}
        assert field_dict.get("faculty_count") == "42"
        assert field_dict.get("academic_year") == "2026-27"
        assert field_dict.get("built_up_area_sqm") == "8500"

        # Test field verification endpoint
        target_field = fields[0]
        patch_res = client.patch(
            f"/api/documents/{doc_id}/fields/{target_field['id']}",
            headers=headers,
            json={"verified_value": target_field["extracted_value"], "is_verified": True}
        )
        assert patch_res.status_code == 200
        assert patch_res.json()["is_verified"] is True
    finally:
        # Clean up uploaded test document record and file
        doc_record = db.query(Document).filter(Document.id == doc_id).first()
        if doc_record:
            if os.path.exists(doc_record.file_path):
                try:
                    os.remove(doc_record.file_path)
                except OSError:
                    pass
            db.query(ExtractedField).filter(ExtractedField.document_id == doc_id).delete()
            db.query(Document).filter(Document.id == doc_id).delete()
            db.commit()
        db.close()

def test_feature4_image_ocr_check_and_status():
    """Inspect and verify image OCR processing behavior in document_service."""
    from app.services.document_service import extract_text_and_metadata

    # Image upload fallback inspection
    raw_text, page_count = extract_text_and_metadata("sample_faculty_sheet.png", "image/png")
    assert page_count == 1
    # Verify the real behavior: document_service uses lightweight header/metadata tagging for images
    assert "Scanned Image Document" in raw_text


# ==============================================================================
# FEATURE 5: Cross-Document Consistency Intelligence
# ==============================================================================

def test_feature5_cross_document_consistency_engine():
    """Verify cross-document consistency engine identifies discrepancies across files."""
    db = SessionLocal()
    try:
        # Check consistency for Application 1
        findings = check_cross_document_consistency(db, application_id=1)
        # Application 1 has multiple pre-seeded documents
        # Verify function runs without errors and returns finding list
        assert isinstance(findings, list)

        # Check existing consistency findings in DB for App 1
        inconsistencies = db.query(ComplianceFinding).filter(
            ComplianceFinding.application_id == 1,
            ComplianceFinding.finding_type == "Cross-Document Inconsistency"
        ).all()
        assert len(inconsistencies) >= 1
        first_inc = inconsistencies[0]
        assert first_inc.comparison_document_id is not None
        assert "Discrepancy" in first_inc.title or "Mismatch" in first_inc.title
    finally:
        db.close()


# ==============================================================================
# FEATURE 6: ELA Tampering & YOLOv8 Infrastructure Checks
# ==============================================================================

def test_feature6_ela_and_yolov8_not_implemented():
    """
    Verify architectural check for ELA tampering analysis and YOLOv8 infrastructure checks:
    Must report NOT IMPLEMENTED accurately without fabricating results.
    """
    # Check 1: Verify YOLO / ultralytics module absence
    has_yolo = False
    try:
        import ultralytics
        has_yolo = True
    except ImportError:
        has_yolo = False

    assert has_yolo is False, "Expected YOLOv8 to not be installed in the project."

    # Check 2: Verify ELA (Error Level Analysis) implementation status
    import app.services.document_service as doc_service
    has_ela = hasattr(doc_service, "analyze_ela") or hasattr(doc_service, "error_level_analysis")
    assert has_ela is False, "Expected ELA tampering analysis to not be implemented in document_service."


# ==============================================================================
# FEATURE 7: Compliance Rules, Digital Twin & What-If Simulation Invariance
# ==============================================================================

def test_feature7_compliance_rules_and_assessment(inst_token):
    """Verify compliance rules listing and assessment execution."""
    headers = {"Authorization": f"Bearer {inst_token}"}
    rules_res = client.get("/api/compliance/rules", headers=headers)
    assert rules_res.status_code == 200
    rules = rules_res.json()
    assert len(rules) >= 4
    rule_codes = [r["rule_code"] for r in rules]
    assert "FSR-001" in rule_codes  # Faculty-to-Student Ratio norm

    # Assessment endpoint
    assess_res = client.get("/api/applications/1/compliance", headers=headers)
    assert assess_res.status_code == 200
    comp_data = assess_res.json()
    assert "readiness_score" in comp_data
    assert "findings" in comp_data

def test_feature7_what_if_simulation_state_invariance(inst_token):
    """Verify What-If simulation calculates hypothetical score without mutating persistent database records."""
    headers = {"Authorization": f"Bearer {inst_token}"}

    # Fetch baseline state
    baseline_app = client.get("/api/applications/1", headers=headers).json()
    baseline_score = baseline_app["readiness_score"]
    baseline_status = baseline_app["status"]

    # Run simulation
    sim_res = client.post("/api/applications/1/digital-twin/simulate", headers=headers, json={
        "resolved_finding_ids": [1],
        "simulated_upload_missing_docs": True
    })
    assert sim_res.status_code == 200
    sim_data = sim_res.json()
    assert sim_data["is_simulation"] is True
    assert sim_data["simulated_score"] > sim_data["baseline_score"]
    assert sim_data["delta"] > 0

    # Invariance check: Application record in MySQL must remain completely untouched
    app_after = client.get("/api/applications/1", headers=headers).json()
    assert app_after["readiness_score"] == baseline_score
    assert app_after["status"] == baseline_status


# ==============================================================================
# FEATURE 8: Notifications, Deadlines, and Cryptographic Hash Chain
# ==============================================================================

def test_feature8_notifications_and_deadlines(inst_token):
    """Verify notifications endpoints, marking read, and SLA deadline alerts."""
    headers = {"Authorization": f"Bearer {inst_token}"}

    # Notifications list
    notif_res = client.get("/api/notifications", headers=headers)
    assert notif_res.status_code == 200
    notifs = notif_res.json()
    assert isinstance(notifs, list)

    # Mark all read
    read_all = client.post("/api/notifications/read-all", headers=headers)
    assert read_all.status_code == 200

    # Deadlines
    dl_res = client.get("/api/deadlines", headers=headers)
    assert dl_res.status_code == 200
    deadlines = dl_res.json()
    assert len(deadlines) >= 1

    summary_res = client.get("/api/deadlines/status-summary", headers=headers)
    assert summary_res.status_code == 200
    summary = summary_res.json()
    assert "total" in summary
    assert "on_track" in summary

def test_feature8_audit_hash_chain_verification(admin_token):
    """Verify SHA-256 cryptographic audit hash-chain walk and verification endpoint."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    verify_res = client.post("/api/audit/verify-chain", headers=headers)
    assert verify_res.status_code == 200
    data = verify_res.json()
    assert data["chain_valid"] is True
    assert data["verified_event_count"] > 100
    assert data["compromised_event_id"] is None


# ==============================================================================
# FEATURE 10: Security, Role Restrictions, and Cross-Tenant Isolation
# ==============================================================================

def test_feature10_security_unauthenticated():
    """Verify unauthenticated requests to protected endpoints return 401 Unauthorized."""
    endpoints = [
        "/api/applications",
        "/api/dashboard/summary",
        "/api/compliance/rules",
        "/api/notifications",
        "/api/audit/events",
        "/api/users"
    ]
    for ep in endpoints:
        res = client.get(ep)
        assert res.status_code == 401, f"Expected 401 on {ep}, got {res.status_code}"

def test_feature10_wrong_role_authorization(inst_token, reviewer_token):
    """Verify wrong-role requests return 403 Forbidden."""
    headers_inst = {"Authorization": f"Bearer {inst_token}"}
    headers_rev = {"Authorization": f"Bearer {reviewer_token}"}

    # 1. Institution forbidden on Admin-only /api/users
    assert client.get("/api/users", headers=headers_inst).status_code == 403

    # 2. Reviewer forbidden on Admin-only /api/users
    assert client.get("/api/users", headers=headers_rev).status_code == 403

    # 3. Reviewer forbidden on Application Creation (Institution only)
    res_rev_create = client.post("/api/applications", headers=headers_rev, json={
        "academic_year": "2026-27",
        "category": "Extension of Approval (EoA)",
        "level": "Under Graduate",
        "program": "Engineering & Technology"
    })
    assert res_rev_create.status_code == 403

    # 4. Reviewer forbidden on Document Upload
    res_rev_upload = client.post("/api/applications/1/documents", headers=headers_rev, files={}, data={"category": "Land Certificate"})
    assert res_rev_upload.status_code == 403

    # 5. Institution forbidden on resolving compliance findings
    assert client.post("/api/findings/1/resolve", headers=headers_inst, json={
        "status": "Resolved",
        "resolution_notes": "Attempted self-resolution"
    }).status_code == 403

def test_feature10_cross_tenant_isolation(inst_token):
    """Verify Institution A cannot read or modify Institution B's application or documents."""
    headers_inst1 = {"Authorization": f"Bearer {inst_token}"}

    # Application 2 belongs to Coastal Valley (inst_id=2)
    # Greenfield Institute (inst_id=1) must receive 403 Forbidden
    res_app2 = client.get("/api/applications/2", headers=headers_inst1)
    assert res_app2.status_code == 403
    assert "Access denied" in res_app2.json()["detail"]

    # Documents of Application 2 must be 403 Forbidden
    res_docs2 = client.get("/api/applications/2/documents", headers=headers_inst1)
    assert res_docs2.status_code == 403

    # Update on Application 2 must be 403 Forbidden
    res_update2 = client.put("/api/applications/2", headers=headers_inst1, json={"total_faculty_declared": 99})
    assert res_update2.status_code == 403
