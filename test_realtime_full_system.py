import urllib.request
import urllib.parse
import json
import time
import io

BASE_URL = "http://127.0.0.1:8000"

results = []

def record(test_name, success, details=""):
    results.append({
        "test": test_name,
        "status": "PASS" if success else "FAIL",
        "details": details
    })
    icon = "PASS" if success else "FAIL"
    print(f"[{icon}] {test_name}: {details}")

def api_call(endpoint, method="GET", data=None, token=None, files=None, form_fields=None):
    url = f"{BASE_URL}{endpoint}"
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    if files or form_fields:
        boundary = f"----WebKitFormBoundary{int(time.time()*1000)}"
        headers["Content-Type"] = f"multipart/form-data; boundary={boundary}"
        body = io.BytesIO()
        if form_fields:
            for k, v in form_fields.items():
                body.write(f"--{boundary}\r\n".encode())
                body.write(f'Content-Disposition: form-data; name="{k}"\r\n\r\n'.encode())
                body.write(str(v).encode())
                body.write(b"\r\n")
        if files:
            for field_name, (filename, file_bytes, content_type) in files.items():
                body.write(f"--{boundary}\r\n".encode())
                body.write(f'Content-Disposition: form-data; name="{field_name}"; filename="{filename}"\r\n'.encode())
                body.write(f"Content-Type: {content_type}\r\n\r\n".encode())
                body.write(file_bytes)
                body.write(b"\r\n")
        body.write(f"--{boundary}--\r\n".encode())
        req_data = body.getvalue()
    elif data is not None:
        headers["Content-Type"] = "application/json"
        req_data = json.dumps(data).encode("utf-8")
    else:
        req_data = None

    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            content = resp.read().decode("utf-8")
            return resp.status, json.loads(content) if content else {}
    except urllib.error.HTTPError as e:
        err_content = e.read().decode("utf-8")
        try:
            return e.code, json.loads(err_content)
        except Exception:
            return e.code, {"raw": err_content}
    except Exception as e:
        return 500, {"error": str(e)}

def run_tests():
    print("=" * 70)
    print("STARTING REAL-TIME AUTOMATED VERIFICATION OF BOTH PORTALS")
    print("=" * 70)

    # 1. AUTHENTICATION & REGISTRATION
    ts = int(time.time())
    new_inst_email = f"autotest_inst_{ts}@college.edu"
    new_rev_email = f"autotest_rev_{ts}@aicte.gov.in"

    # Register Institution User
    status, res = api_call("/api/auth/register", "POST", {
        "email": new_inst_email,
        "password": "Password@123",
        "full_name": "Dr. Automatic Tester",
        "role": "institution",
        "institution_name": f"Automated Engineering Campus {ts}",
        "phone": "9876543210",
        "designation": "Principal"
    })
    record("Institution Registration", status == 201, f"Registered {new_inst_email}")

    # Login Fresh Institution User
    status, res = api_call("/api/auth/login", "POST", {
        "email": new_inst_email,
        "password": "Password@123"
    })
    fresh_inst_token = res.get("access_token")
    record("Fresh Institution Login", status == 200 and fresh_inst_token is not None, f"Token received, Role: {res.get('role')}")

    # Register Reviewer User
    status, res = api_call("/api/auth/register", "POST", {
        "email": new_rev_email,
        "password": "Password@123",
        "full_name": "Er. Automatic Reviewer",
        "role": "reviewer",
        "phone": "9123456789",
        "designation": "Senior Scrutiny Officer"
    })
    record("Reviewer Registration", status == 201, f"Registered {new_rev_email}")

    # Login Fresh Reviewer User
    status, res = api_call("/api/auth/login", "POST", {
        "email": new_rev_email,
        "password": "Password@123"
    })
    fresh_rev_token = res.get("access_token")
    record("Fresh Reviewer Login", status == 200 and fresh_rev_token is not None, f"Token received, Role: {res.get('role')}")

    # Demo Logins
    status, res = api_call("/api/auth/login", "POST", {"email": "institution@greenfield.edu", "password": "password123"})
    demo_inst_token = res.get("access_token")
    record("Demo Institution Login", status == 200 and demo_inst_token is not None, "institution@greenfield.edu authenticated")

    status, res = api_call("/api/auth/login", "POST", {"email": "reviewer@aicte.gov.in", "password": "password123"})
    demo_rev_token = res.get("access_token")
    record("Demo Reviewer Login", status == 200 and demo_rev_token is not None, "reviewer@aicte.gov.in authenticated")

    # RBAC Security Isolation Test
    status, _ = api_call("/api/dashboard/reviewer-live-status", "GET", token=fresh_inst_token)
    record("RBAC Isolation (Institution blocked from Reviewer API)", status == 403, f"HTTP {status} Forbidden returned")

    # 2. INSTITUTION PORTAL APPLICATION LIFECYCLE
    # Dashboard summary
    status, res = api_call("/api/dashboard/summary", "GET", token=fresh_inst_token)
    record("Institution Dashboard Summary", status == 200, f"Total apps: {res.get('total_applications')}")

    # Create Application
    status, new_app = api_call("/api/applications", "POST", {
        "category": "Extension of Approval (EoA)",
        "academic_year": "2026-27",
        "program": "Computer Science & Engineering",
        "level": "Undergraduate (UG)",
        "total_faculty_declared": 50,
        "total_intake_declared": 360,
        "built_up_area_sqm": 16000.0,
        "land_area_acres": 10.0
    }, token=fresh_inst_token)
    app_id = new_app.get("id")
    app_num = new_app.get("application_number")
    record("Application Creation", status == 201 and app_id is not None, f"App ID: {app_id}, No: {app_num}, Status: {new_app.get('status')}")

    # Upload Document (Valid minimal PDF)
    valid_pdf = b"""%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length 55 >> stream
BT /F1 12 Tf 100 700 Td (AICTE Statutory Land Deed: 10.0 Acres, Built-up: 16000 sqm) Tj ET
endstream endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000350 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
427
%%EOF"""

    status, doc_res = api_call(
        f"/api/applications/{app_id}/documents",
        "POST",
        form_fields={"category": "Land Documents"},
        token=fresh_inst_token,
        files={"file": ("land_noc_deed.pdf", valid_pdf, "application/pdf")}
    )
    doc_id = doc_res.get("id")
    file_hash = doc_res.get("file_hash", "")
    record("Document Upload", status == 201 and doc_id is not None, f"Uploaded doc ID: {doc_id}, Hash: {file_hash[:16]}...")

    # Document Text Processing & OCR Extraction
    status, proc_res = api_call(f"/api/documents/{doc_id}/process", "POST", token=fresh_inst_token)
    record("Document OCR / Text Processing", status == 200, f"Extraction status: {proc_res.get('extraction_status')}")

    # Digital Twin Simulator Check
    status, dt_res = api_call(f"/api/applications/{app_id}/digital-twin/simulate", "POST", {
        "simulated_faculty_count": 55,
        "simulated_built_up_area": 16500.0,
        "simulated_land_area": 10.5
    }, token=fresh_inst_token)
    projected = dt_res.get("projected_readiness_score")
    record("Digital Twin What-If Simulator", status == 200 and projected is not None, f"Projected Score: {projected}%")

    # Run Statutory Compliance Assessment
    status, comp_res = api_call(f"/api/applications/{app_id}/compliance/run", "POST", token=fresh_inst_token)
    record("Statutory Compliance Evaluation", status == 200, f"Readiness Score: {comp_res.get('readiness_score')}%, Status: {comp_res.get('overall_status')}")

    # Submit Application
    status, sub_res = api_call(f"/api/applications/{app_id}/submit", "POST", token=fresh_inst_token)
    record("Application Submission", status == 200 and sub_res.get("status") == "Submitted", f"Status transitioned to: {sub_res.get('status')}")

    # 3. REVIEWER PORTAL WORKBENCH & QUERY CYCLE
    # Verify app is visible in Reviewer Queue
    status, rev_apps = api_call("/api/applications", "GET", token=fresh_rev_token)
    found_in_queue = any(a.get("id") == app_id for a in rev_apps)
    record("Reviewer Queue Visibility", status == 200 and found_in_queue, f"App {app_num} is visible in reviewer queue")

    # Reviewer Live Telemetry
    status, tel_res = api_call("/api/dashboard/reviewer-live-status", "GET", token=fresh_rev_token)
    record("Reviewer Live Telemetry", status == 200, f"Active/Completed stats: {tel_res.get('completed')} done, {tel_res.get('ready_for_reviewer_decision')} ready")

    # Reviewer issues deficiency query / requests correction
    status, corr_res = api_call(f"/api/applications/{app_id}/request-correction", "POST", {
        "title": "Fire Safety NOC Verification Needed",
        "comment": "Please provide the updated municipal fire NOC endorsement certificate."
    }, token=fresh_rev_token)
    record("Reviewer Correction Query Issued", status == 200 and corr_res.get("status") == "Correction Required", f"Status: {corr_res.get('status')}")

    # 4. INSTITUTION REFLECTION & RESUBMISSION
    # Check that Institution sees 'Correction Required'
    status, inst_app = api_call(f"/api/applications/{app_id}", "GET", token=fresh_inst_token)
    record("Institution Reflection (Correction Required)", status == 200 and inst_app.get("status") == "Correction Required", f"Status in institution: {inst_app.get('status')}")

    # Institution verifies notification received
    status, notifs = api_call("/api/notifications", "GET", token=fresh_inst_token)
    has_notif = any(n.get("application_id") == app_id for n in notifs)
    record("Institution Notification Dispatch", status == 200 and has_notif, f"{len(notifs)} alerts received")

    # Institution Resubmission
    status, resub_res = api_call(f"/api/applications/{app_id}/resubmit", "POST", {
        "comments": "Fire NOC updated and municipal compliance affirmation uploaded."
    }, token=fresh_inst_token)
    record("Institution Application Resubmit", status == 200 and resub_res.get("status") in ["Resubmitted", "Under Review"], f"Status: {resub_res.get('status')}")

    # 5. REVIEWER APPROVE & REJECT WORKFLOW WITH INSTANT REFLECTION
    # Reviewer Approves
    status, app_res = api_call(
        f"/api/applications/{app_id}/approve?decision_reason=Statutory+standards+verified+in+full",
        "POST",
        token=fresh_rev_token
    )
    record("Reviewer Formal Approval", status == 200 and app_res.get("status") == "Approved", f"Decision Reason: {app_res.get('decision_reason')}")

    # Verify instant reflection in Institution Portal
    status, inst_app_approved = api_call(f"/api/applications/{app_id}", "GET", token=fresh_inst_token)
    record(
        "Instant Reflection in Institution (Approved)",
        status == 200 and inst_app_approved.get("status") == "Approved",
        f"Institution reflects: {inst_app_approved.get('status')}, Reason: {inst_app_approved.get('decision_reason')}"
    )

    # Reviewer Rejection test (transition to Rejected)
    status, rej_res = api_call(
        f"/api/applications/{app_id}/reject?decision_reason=Deficiency+in+cadre+ratio",
        "POST",
        token=fresh_rev_token
    )
    record("Reviewer Formal Rejection", status == 200 and rej_res.get("status") == "Rejected", f"Decision Reason: {rej_res.get('decision_reason')}")

    # Verify instant reflection in Institution Portal
    status, inst_app_rejected = api_call(f"/api/applications/{app_id}", "GET", token=fresh_inst_token)
    record(
        "Instant Reflection in Institution (Rejected)",
        status == 200 and inst_app_rejected.get("status") == "Rejected",
        f"Institution reflects: {inst_app_rejected.get('status')}, Reason: {inst_app_rejected.get('decision_reason')}"
    )

    # 6. REPORTS & CRYPTOGRAPHIC AUDIT LEDGER
    # Verification report detail
    status, rep_res = api_call(f"/api/reports/application/{app_id}", "GET", token=fresh_rev_token)
    rep_id = rep_res.get("id")
    record("Verification Report Detail", status == 200 and rep_id is not None, f"Report ID: {rep_id}, Risk: {rep_res.get('risk_level')}")

    # Compliance matrix
    status, matrix_res = api_call("/api/reports/compliance-matrix", "GET", token=fresh_rev_token)
    record("Statutory Compliance Matrix", status == 200, f"Matrix categories: {len(matrix_res.get('categories', []))}")

    # Cryptographic Audit Chain Verification
    status, chain_res = api_call("/api/audit-events/verify-chain", "POST", token=fresh_rev_token)
    record(
        "SHA-256 Audit Chain Verification",
        status == 200 and chain_res.get("is_valid") is True,
        f"Total events: {chain_res.get('total_events')}, Chain valid: {chain_res.get('is_valid')}"
    )

    # 7. DELETE BUTTONS & DATA CLEARING WORKFLOWS
    # Delete uploaded document
    status, del_doc = api_call(f"/api/documents/{doc_id}", "DELETE", token=fresh_inst_token)
    record("Delete Single Document", status == 200, del_doc.get("message"))

    # Delete single notification
    if notifs:
        n_id = notifs[0].get("id")
        status, del_n = api_call(f"/api/notifications/{n_id}", "DELETE", token=fresh_inst_token)
        record("Delete Single Notification", status == 200, del_n.get("message"))

    # Delete application from Institution Portal
    status, del_app = api_call(f"/api/applications/{app_id}", "DELETE", token=fresh_inst_token)
    record("Delete Single Application (Institution)", status == 200, del_app.get("message"))

    # Bulk Clear Endpoints
    status, del_all_n = api_call("/api/notifications", "DELETE", token=fresh_inst_token)
    record("Clear All Notifications", status == 200, del_all_n.get("message"))

    status, del_all_dl = api_call("/api/deadlines", "DELETE", token=fresh_inst_token)
    record("Clear All Deadlines", status == 200, del_all_dl.get("message"))

    status, del_all_aud = api_call("/api/audit-events", "DELETE", token=fresh_rev_token)
    record("Clear Audit Ledger", status == 200, del_all_aud.get("message"))

    status, clear_scrutiny = api_call("/api/dashboard/clear-scrutiny-data", "DELETE", token=fresh_rev_token)
    record("Clear Scrutiny Overview Data", status == 200, clear_scrutiny.get("message"))

    status, del_all_apps = api_call("/api/applications", "DELETE", token=fresh_inst_token)
    record("Delete All Applications (Institution)", status == 200, del_all_apps.get("message"))

    print("=" * 70)
    total = len(results)
    passed = sum(1 for r in results if r["status"] == "PASS")
    failed = total - passed
    print(f"VERIFICATION SUMMARY: {passed}/{total} TESTS PASSED ({failed} FAILED)")
    print("=" * 70)
    return failed == 0

if __name__ == "__main__":
    success = run_tests()
    exit(0 if success else 1)
