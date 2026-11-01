import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.services.audit_service import verify_audit_chain

client = TestClient(app)

def run_tests():
    print("=" * 70)
    print("AICTE SMARTAPPROVAL — TWO INDEPENDENT PORTALS VERIFICATION")
    print("=" * 70)

    # 1. Health check
    r = client.get("/health")
    assert r.status_code == 200
    print("[PASS] 1. Backend API operational and healthy (/health -> 200).")

    # 2. Dedicated Portal Login & Cross-Portal Access Denial
    print("\n[TEST] 2. Verifying Portal-Specific Authentication & Cross-Portal Denial...")
    
    # Institution login to Institution Portal -> 200
    r_inst = client.post("/api/auth/login", json={
        "email": "institution@greenfield.edu",
        "password": "password123",
        "portal": "institution"
    })
    assert r_inst.status_code == 200, f"Institution login failed: {r_inst.text}"
    inst_token = r_inst.json()["access_token"]
    print("  [PASS] Institution credentials authenticated on Institution Portal.")

    # Institution login to Reviewer Portal -> 403 Forbidden
    r_inst_on_rev = client.post("/api/auth/login", json={
        "email": "institution@greenfield.edu",
        "password": "password123",
        "portal": "reviewer"
    })
    assert r_inst_on_rev.status_code == 403
    assert "reserved for" in r_inst_on_rev.json()["detail"]
    print("  [PASS] Cross-portal block: Institution account rejected on Reviewer Portal (HTTP 403).")

    # Reviewer login to Reviewer Portal -> 200
    r_rev = client.post("/api/auth/login", json={
        "email": "reviewer@aicte.gov.in",
        "password": "password123",
        "portal": "reviewer"
    })
    assert r_rev.status_code == 200
    rev_token = r_rev.json()["access_token"]
    print("  [PASS] Reviewer credentials authenticated on Reviewer Workbench.")

    # Reviewer login to Institution Portal -> 403 Forbidden
    r_rev_on_inst = client.post("/api/auth/login", json={
        "email": "reviewer@aicte.gov.in",
        "password": "password123",
        "portal": "institution"
    })
    assert r_rev_on_inst.status_code == 403
    print("  [PASS] Cross-portal block: Reviewer account rejected on Institution Portal (HTTP 403).")

    # Admin login attempt on Institution Portal -> 403 Forbidden (No UI portal access)
    r_adm_on_inst = client.post("/api/auth/login", json={
        "email": "admin@aicte.gov.in",
        "password": "password123",
        "portal": "institution"
    })
    assert r_adm_on_inst.status_code == 403
    print("  [PASS] Admin account rejected on Institution Portal (HTTP 403).")

    # Admin login attempt on Reviewer Portal -> 403 Forbidden (No UI portal access)
    r_adm_on_rev = client.post("/api/auth/login", json={
        "email": "admin@aicte.gov.in",
        "password": "password123",
        "portal": "reviewer"
    })
    assert r_adm_on_rev.status_code == 403
    print("  [PASS] Admin account rejected on Reviewer Portal (HTTP 403).")

    # Admin direct authentication via API for maintenance procedure -> 200
    r_adm = client.post("/api/auth/login", json={
        "email": "admin@aicte.gov.in",
        "password": "password123"
    })
    assert r_adm.status_code == 200
    admin_token = r_adm.json()["access_token"]
    print("  [PASS] Admin credentials authenticated via Backend API for Maintenance Operations.")

    # Invalid password test
    r_invalid = client.post("/api/auth/login", json={
        "email": "institution@greenfield.edu",
        "password": "wrongpassword",
        "portal": "institution"
    })
    assert r_invalid.status_code == 401
    print("  [PASS] Invalid password rejected with HTTP 401 Unauthorized.")

    # 3. RBAC Enforcement Across Portals & Maintenance API
    print("\n[TEST] 3. Verifying Server-Side RBAC Enforcement on Protected Resources...")
    inst_headers = {"Authorization": f"Bearer {inst_token}"}
    rev_headers = {"Authorization": f"Bearer {rev_token}"}
    adm_headers = {"Authorization": f"Bearer {admin_token}"}

    # Institution blocked from Admin endpoints
    assert client.get("/api/users", headers=inst_headers).status_code == 403
    print("  [PASS] Institution user blocked from /api/users (HTTP 403).")

    # Reviewer blocked from Admin endpoints
    assert client.get("/api/users", headers=rev_headers).status_code == 403
    print("  [PASS] Reviewer user blocked from /api/users (HTTP 403).")

    # Admin permitted on Admin endpoints via maintenance API
    r_users = client.get("/api/users", headers=adm_headers)
    assert r_users.status_code == 200
    print(f"  [PASS] Admin permitted on /api/users for maintenance ({len(r_users.json())} users managed).")

    # Reviewer blocked from creating draft applications
    r_draft = client.post("/api/applications", headers=rev_headers, json={
        "academic_year": "2026-27",
        "category": "Extension of Approval (EoA)",
        "level": "Under Graduate",
        "program": "Engineering & Technology"
    })
    assert r_draft.status_code == 403
    print("  [PASS] Reviewer blocked from creating draft applications (HTTP 403).")

    # Institution blocked from resolving compliance findings
    assert client.post("/api/findings/1/resolve", headers=inst_headers, json={
        "status": "Resolved",
        "resolution_notes": "Institution self resolution attempt"
    }).status_code == 403
    print("  [PASS] Institution blocked from resolving compliance findings (HTTP 403).")

    # Institution blocked from reviewer workload metrics
    assert client.get("/api/reports/reviewer-workload", headers=inst_headers).status_code == 403
    assert client.get("/api/reports/reviewer-workload", headers=rev_headers).status_code == 200
    print("  [PASS] Workload report accessible to Reviewer but forbidden to Institution.")

    # Anonymous user blocked
    assert client.get("/api/applications").status_code == 401
    print("  [PASS] Anonymous request rejected with HTTP 401 Unauthorized.")

    # 4. Innovation Preservation
    print("\n[TEST] 4. Verifying Innovation Preservation...")

    # Digital Twin Simulation Isolation
    r_sim = client.post("/api/applications/1/digital-twin/simulate", headers=inst_headers, json={
        "resolved_finding_ids": [1],
        "simulated_upload_missing_docs": True
    })
    assert r_sim.status_code == 200
    sim_data = r_sim.json()
    assert sim_data.get("is_simulation") is True
    print(f"  [PASS] Digital Twin What-If Simulator: Baseline={sim_data.get('baseline_score')}, Simulated={sim_data.get('simulated_score')}, Delta={sim_data.get('score_delta')}.")

    # Tamper-Evident SHA-256 Audit Chain Verification
    db = SessionLocal()
    try:
        is_valid, count, broken_id, msg, first_h, last_h = verify_audit_chain(db)
        assert is_valid is True
        assert count > 0
        print(f"  [PASS] Tamper-Evident SHA-256 Cryptographic Audit Chain Verified: {count} chained blocks, valid={is_valid}.")
    finally:
        db.close()

    # 5. Independent Frontend Application Builds Validation (Two Portals Architecture)
    print("\n[TEST] 5. Validating Two Independent Frontend Build Outputs...")
    root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    
    inst_dist = os.path.join(root_dir, "apps", "institution-portal", "dist", "index.html")
    rev_dist = os.path.join(root_dir, "apps", "reviewer-portal", "dist", "index.html")
    adm_dir = os.path.join(root_dir, "apps", "admin-portal")

    assert os.path.exists(inst_dist), f"Missing build: {inst_dist}"
    print(f"  [PASS] apps/institution-portal/dist verified (Size: {os.path.getsize(inst_dist)} bytes, Port 5173).")

    assert os.path.exists(rev_dist), f"Missing build: {rev_dist}"
    print(f"  [PASS] apps/reviewer-portal/dist verified (Size: {os.path.getsize(rev_dist)} bytes, Port 5174).")

    assert not os.path.exists(adm_dir), f"apps/admin-portal must NOT exist: {adm_dir}"
    print("  [PASS] apps/admin-portal verified absent (Administrator Portal completely removed from frontend).")

    print("\n" + "=" * 70)
    print("ALL TWO-PORTAL ACCEPTANCE SCENARIOS PASSED SUCCESSFULLY!")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()
