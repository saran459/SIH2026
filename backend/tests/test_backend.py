import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal, engine, Base
from app.models.application import Application
from app.models.compliance import ComplianceFinding
from app.models.user import User
from app.seed.seed_data import seed_database
from app.services.audit_service import verify_audit_chain

@pytest.fixture(scope="session", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    seed_database()

client = TestClient(app)

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_demo_accounts_endpoint():
    response = client.get("/api/auth/demo-accounts")
    assert response.status_code == 200
    accounts = response.json()
    assert len(accounts) == 3
    roles = [a["role"] for a in accounts]
    assert "institution" in roles
    assert "reviewer" in roles
    assert "admin" in roles

def test_institution_login():
    response = client.post("/api/auth/login", json={
        "email": "institution@greenfield.edu",
        "password": "password123"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["role"] == "institution"
    assert data["email"] == "institution@greenfield.edu"

def test_reviewer_login():
    response = client.post("/api/auth/login", json={
        "email": "reviewer@aicte.gov.in",
        "password": "password123"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["role"] == "reviewer"

def test_dashboard_summary():
    # Login as reviewer
    login_res = client.post("/api/auth/login", json={
        "email": "reviewer@aicte.gov.in",
        "password": "password123"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/dashboard/summary", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total_applications"] >= 8
    assert "draft_applications" in data
    assert "under_review_applications" in data

def test_digital_twin_simulation_isolation():
    # Login as institution
    login_res = client.post("/api/auth/login", json={
        "email": "institution@greenfield.edu",
        "password": "password123"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Fetch app for institution 1 dynamically
    db = SessionLocal()
    app1 = db.query(Application).filter(Application.institution_id == 1).first()
    assert app1 is not None
    app1_id = app1.id
    finding = db.query(ComplianceFinding).filter(ComplianceFinding.application_id == app1_id).first()
    finding_ids = [finding.id] if finding else []
    db.close()

    app_res = client.get(f"/api/applications/{app1_id}", headers=headers)
    assert app_res.status_code == 200
    baseline_status = app_res.json()["status"]

    # Run simulation
    sim_res = client.post(f"/api/applications/{app1_id}/digital-twin/simulate", headers=headers, json={
        "resolved_finding_ids": finding_ids,
        "simulated_upload_missing_docs": True
    })
    assert sim_res.status_code == 200
    sim_data = sim_res.json()
    assert sim_data["is_simulation"] is True
    assert sim_data["simulated_score"] >= sim_data["baseline_score"]

    # Verify that the real application record in the DB remained untouched
    app_res_after = client.get(f"/api/applications/{app1_id}", headers=headers)
    assert app_res_after.json()["status"] == baseline_status

def test_audit_hash_chain_integrity():
    db = SessionLocal()
    try:
        is_valid, count, broken_id, msg, first_h, last_h = verify_audit_chain(db)
        assert is_valid is True
        assert count > 0
        assert broken_id is None
    finally:
        db.close()

def test_portal_specific_login_enforcement():
    # 1. Institution trying to log into reviewer portal -> 403 Forbidden
    res = client.post("/api/auth/login", json={
        "email": "institution@greenfield.edu",
        "password": "password123",
        "portal": "reviewer"
    })
    assert res.status_code == 403
    assert "reserved for" in res.json()["detail"]

    # 2. Reviewer trying to log into institution portal -> 403 Forbidden
    res = client.post("/api/auth/login", json={
        "email": "reviewer@aicte.gov.in",
        "password": "password123",
        "portal": "institution"
    })
    assert res.status_code == 403

    # 3. Admin trying to log into institution portal -> 403 Forbidden
    res = client.post("/api/auth/login", json={
        "email": "admin@aicte.gov.in",
        "password": "password123",
        "portal": "institution"
    })
    assert res.status_code == 403

    # 4. Each persona in their own portal -> 200 OK
    res_inst = client.post("/api/auth/login", json={
        "email": "institution@greenfield.edu",
        "password": "password123",
        "portal": "institution"
    })
    assert res_inst.status_code == 200

    res_rev = client.post("/api/auth/login", json={
        "email": "reviewer@aicte.gov.in",
        "password": "password123",
        "portal": "reviewer"
    })
    assert res_rev.status_code == 200

    res_adm = client.post("/api/auth/login", json={
        "email": "admin@aicte.gov.in",
        "password": "password123",
        "portal": "admin"
    })
    assert res_adm.status_code == 200

def test_rbac_endpoint_isolation():
    # Login institution
    inst_token = client.post("/api/auth/login", json={
        "email": "institution@greenfield.edu",
        "password": "password123"
    }).json()["access_token"]
    inst_headers = {"Authorization": f"Bearer {inst_token}"}

    # Login reviewer
    rev_token = client.post("/api/auth/login", json={
        "email": "reviewer@aicte.gov.in",
        "password": "password123"
    }).json()["access_token"]
    rev_headers = {"Authorization": f"Bearer {rev_token}"}

    # Login admin
    adm_token = client.post("/api/auth/login", json={
        "email": "admin@aicte.gov.in",
        "password": "password123"
    }).json()["access_token"]
    adm_headers = {"Authorization": f"Bearer {adm_token}"}

    # 1. Institution cannot access /users (Admin only)
    assert client.get("/api/users", headers=inst_headers).status_code == 403
    # 2. Reviewer cannot access /users (Admin only)
    assert client.get("/api/users", headers=rev_headers).status_code == 403
    # 3. Admin can access /users
    assert client.get("/api/users", headers=adm_headers).status_code == 200

    # 4. Reviewer cannot create applications
    assert client.post("/api/applications", headers=rev_headers, json={
        "academic_year": "2026-27",
        "category": "Extension of Approval (EoA)",
        "level": "Under Graduate",
        "program": "Engineering & Technology"
    }).status_code == 403

    # 5. Institution cannot resolve compliance findings
    assert client.post("/api/findings/1/resolve", headers=inst_headers, json={
        "status": "Resolved",
        "resolution_notes": "Institution self resolution attempt"
    }).status_code == 403

    # 6. Institution cannot access reviewer workload metrics
    assert client.get("/api/reports/reviewer-workload", headers=inst_headers).status_code == 403
    assert client.get("/api/reports/reviewer-workload", headers=rev_headers).status_code == 200

    # 7. Unauthenticated request rejected
    assert client.get("/api/applications").status_code == 401

def test_institution_cross_tenant_isolation():
    # Login institution 1 (Greenfield Institute, inst_id=1)
    inst1_token = client.post("/api/auth/login", json={
        "email": "institution@greenfield.edu",
        "password": "password123"
    }).json()["access_token"]
    inst1_headers = {"Authorization": f"Bearer {inst1_token}"}

    # Dynamically find applications for inst 1 and inst 2
    db = SessionLocal()
    app1 = db.query(Application).filter(Application.institution_id == 1).first()
    assert app1 is not None
    app1_id = app1.id

    app2 = db.query(Application).filter(Application.institution_id == 2).first()
    if not app2:
        u2 = db.query(User).filter(User.email == "principal@coastalvalley.ac.in").first()
        app2 = Application(
            application_number="AICTE-2026-COASTAL-01",
            institution_id=2,
            category="Extension of Approval (EoA)",
            academic_year="2026-2027",
            level="Undergraduate",
            program="Engineering and Technology",
            status="Draft",
            created_by_user_id=u2.id if u2 else 2
        )
        db.add(app2)
        db.commit()
        db.refresh(app2)
    app2_id = app2.id
    db.close()

    # Application belongs to inst_id=1 -> should be 200
    res1 = client.get(f"/api/applications/{app1_id}", headers=inst1_headers)
    assert res1.status_code == 200

    # Application belongs to Coastal Valley (inst_id=2) -> should be 403 Forbidden
    res2 = client.get(f"/api/applications/{app2_id}", headers=inst1_headers)
    assert res2.status_code == 403
    assert "Access denied" in res2.json()["detail"]

    # Documents of Application 2 -> should be 403 Forbidden
    res_docs = client.get(f"/api/applications/{app2_id}/documents", headers=inst1_headers)
    assert res_docs.status_code == 403

    # Digital twin of Application 2 -> should be 403 Forbidden
    res_dt = client.get(f"/api/applications/{app2_id}/digital-twin", headers=inst1_headers)
    assert res_dt.status_code == 403

