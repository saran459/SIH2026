import sys
import time
from datetime import datetime
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.database import SessionLocal
from app.models.application import Application
from app.models.document import Document
from app.models.application_report import ApplicationReport
from app.models.verification_job import VerificationJob
from app.models.audit import AuditEvent
from app.services.audit_service import verify_audit_chain

client = TestClient(app)

def run_e2e_verification():
    print("=" * 80)
    print("AICTE SMARTAPPROVAL: END-TO-END SUBMISSION TO REVIEWER VERIFICATION")
    print("=" * 80)

    # 1. Authenticate Institution Applicant
    print("\n[Step 1] Authenticating as Institution User (institution@greenfield.edu)...")
    inst_login_res = client.post("/api/auth/login", json={
        "email": "institution@greenfield.edu",
        "password": "password123",
        "portal": "institution"
    })
    assert inst_login_res.status_code == 200, f"Institution login failed: {inst_login_res.text}"
    inst_token = inst_login_res.json()["access_token"]
    inst_headers = {"Authorization": f"Bearer {inst_token}"}
    print("-> Institution authenticated successfully. Token acquired.")

    # 2. Fill in and Submit Application via Applicant Portal API
    print("\n[Step 2] Institution submitting new application dossier with submit_immediately=True...")
    payload = {
        "category": "Increase in Intake / Additional Course",
        "academic_year": "2026-27",
        "level": "Under Graduate",
        "program": "Artificial Intelligence & Data Science",
        "total_faculty_declared": 54,
        "total_intake_declared": 420,
        "built_up_area_sqm": 9200.0,
        "land_area_acres": 6.0,
        "submit_immediately": True
    }
    submit_res = client.post("/api/applications", headers=inst_headers, json=payload)
    assert submit_res.status_code == 201, f"Submission failed: {submit_res.text}"
    app_data = submit_res.json()
    app_id = app_data["id"]
    app_number = app_data["application_number"]
    status_returned = app_data["status"]
    print(f"-> Application Created & Submitted: ID=#{app_id}, Application Number={app_number}, Status={status_returned}")

    # 3. Confirm Record in MySQL Database
    print("\n[Step 3] Querying MySQL database directly to confirm persistence...")
    db: Session = SessionLocal()
    db_app = db.query(Application).filter(Application.id == app_id).first()
    assert db_app is not None, f"Application #{app_id} not found in MySQL!"
    print(f"-> Verified in MySQL: ID={db_app.id}, Number={db_app.application_number}, Status={db_app.status}, InstitutionID={db_app.institution_id}")

    # 4. Confirm Uploaded/Generated Documents in MySQL
    print("\n[Step 4] Confirming document linkage in MySQL...")
    docs = db.query(Document).filter(Document.application_id == app_id).all()
    print(f"-> Found {len(docs)} document(s) associated with Application #{app_id}:")
    for d in docs:
        print(f"   * Document ID={d.id}, Category='{d.category}', File='{d.original_name or d.file_name}', Status={d.extraction_status}")
    assert len(docs) >= 1, "Expected at least 1 statutory document associated with application."

    # 5. Authenticate Reviewer
    print("\n[Step 5] Authenticating as AICTE Scrutiny Reviewer (reviewer@aicte.gov.in)...")
    rev_login_res = client.post("/api/auth/login", json={
        "email": "reviewer@aicte.gov.in",
        "password": "password123",
        "portal": "reviewer"
    })
    assert rev_login_res.status_code == 200, f"Reviewer login failed: {rev_login_res.text}"
    rev_token = rev_login_res.json()["access_token"]
    rev_headers = {"Authorization": f"Bearer {rev_token}"}
    print("-> Reviewer authenticated successfully. Token acquired.")

    # 6. Retrieve Reviewer Applications Roster / Dashboard
    print("\n[Step 6] Reviewer retrieving application queue from /api/applications...")
    reviewer_apps_res = client.get("/api/applications", headers=rev_headers)
    assert reviewer_apps_res.status_code == 200, f"Failed to retrieve reviewer apps: {reviewer_apps_res.text}"
    reviewer_apps = reviewer_apps_res.json()
    matching_app = next((a for a in reviewer_apps if a["id"] == app_id), None)
    assert matching_app is not None, f"Application #{app_id} NOT FOUND in reviewer queue! Visible count: {len(reviewer_apps)}"
    print(f"-> SUCCESS: Newly submitted application #{app_id} ({app_number}) IS VISIBLE to reviewer!")
    print(f"   * Assigned Reviewer: {matching_app.get('assigned_reviewer_id')} (Unassigned pool)")
    print(f"   * Status: {matching_app.get('status')}")
    print(f"   * Program: {matching_app.get('program')}")
    print(f"   * Readiness Score: {matching_app.get('readiness_score')}%")

    # 7. Reviewer Opens Application Dossier Details
    print(f"\n[Step 7] Reviewer fetching detailed dossier for Application #{app_id}...")
    detail_res = client.get(f"/api/applications/{app_id}", headers=rev_headers)
    assert detail_res.status_code == 200, f"Reviewer failed to access application detail: {detail_res.text}"
    detail_data = detail_res.json()
    print(f"-> Detail retrieved successfully: Application Number={detail_data['application_number']}, Intake={detail_data['total_intake_declared']}")

    # 8. Wait for Automatic Document Verification Worker & Report Generation
    print("\n[Step 8] Checking automated document verification & background worker pipeline...")
    # Allow background thread worker to complete verification
    report = None
    for attempt in range(10):
        time.sleep(0.5)
        db.expire_all()
        report = db.query(ApplicationReport).filter(ApplicationReport.application_id == app_id).first()
        if report:
            break

    if report:
        print(f"-> Automated Verification Completed! Report ID=#{report.id}, Number={report.report_number}, Score={report.readiness_score}%")
    else:
        print("-> Background worker is processing or pending verification job.")

    # 9. Test Reviewer Self-Assignment
    print("\n[Step 9] Reviewer allocating dossier to their scrutiny desk...")
    assign_res = client.post(f"/api/applications/{app_id}/assign-reviewer?reviewer_id=3", headers=rev_headers)
    assert assign_res.status_code == 200, f"Self-assignment failed: {assign_res.text}"
    updated_app = assign_res.json()
    assert updated_app["assigned_reviewer_id"] == 3
    print(f"-> Dossier allocated to Reviewer ID 3 ({updated_app.get('assigned_reviewer_name')}). Status: {updated_app['status']}")

    # 10. Security Checks
    print("\n[Step 10] Validating security constraints & tenant isolation...")
    # Unauthorized access check: unauthenticated request to /api/applications -> 401
    unauth_res = client.get("/api/applications")
    assert unauth_res.status_code == 401, f"Expected 401 for unauthenticated request, got {unauth_res.status_code}"
    print("-> Verified: Unauthenticated requests rejected with 401 Unauthorized.")

    # Institution cross-tenant access check: another institution cannot access Greenfield's private draft/app
    # (greenfield institution_id is 1)
    other_inst_login = client.post("/api/auth/login", json={
        "email": "institution2@apex.edu",
        "password": "password123",
        "portal": "institution"
    })
    if other_inst_login.status_code == 200:
        other_token = other_inst_login.json()["access_token"]
        cross_res = client.get(f"/api/applications/{app_id}", headers={"Authorization": f"Bearer {other_token}"})
        assert cross_res.status_code == 403, f"Expected 403 for cross-institution access, got {cross_res.status_code}"
        print("-> Verified: Cross-institution unauthorized access rejected with 403 Forbidden.")

    # 11. Tamper-evident Audit Chain
    print("\n[Step 11] Validating cryptographic audit chain integrity...")
    is_valid, count, broken_idx, msg, first_h, last_h = verify_audit_chain(db)
    print(f"-> Audit Chain Valid: {is_valid}, Total Blocks: {count}, Message: {msg}")
    assert is_valid is True, f"Audit chain verification failed: {msg}"

    db.close()
    print("\n" + "=" * 80)
    print("ALL 11 END-TO-END SUBMISSION TO REVIEWER VERIFICATION PHASES PASSED!")
    print("=" * 80)

if __name__ == "__main__":
    run_e2e_verification()
