from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional
from pydantic import BaseModel

from app.database import get_db
from app.models.user import User
from app.models.application import Application
from app.api.deps import get_current_user, require_role
from app.services.external_verification_service import (
    verify_society_registration,
    verify_fire_safety_noc,
    verify_university_affiliation,
    verify_land_records,
    run_application_simulated_verifications,
    SIMULATION_DISCLAIMER
)

router = APIRouter(prefix="/external-verification", tags=["External Verification (Simulated)"])

class MockVerificationRequest(BaseModel):
    authority: str # society_registry | fire_safety_noc | university_affiliation | land_records
    reference_number: Optional[str] = ""
    declared_name: Optional[str] = ""
    intake: Optional[int] = 0
    academic_year: Optional[str] = "2026-2027"
    land_acres: Optional[float] = 0.0
    scenario: Optional[str] = "success" # success | failure | unavailable | mismatch

@router.get("/applications/{id}/results")
def get_application_external_verifications(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieves simulated external verification records for an application.
    """
    app = db.query(Application).filter(Application.id == id).first()
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found.")

    if current_user.role == "institution" and current_user.institution_id != app.institution_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    results = run_application_simulated_verifications(db, app)
    return {
        "application_id": id,
        "application_number": app.application_number,
        "is_simulated": True,
        "simulation_disclaimer": SIMULATION_DISCLAIMER,
        "verifications": results
    }

@router.post("/applications/{id}/run")
def trigger_external_verification(
    id: int,
    current_user: User = Depends(require_role(["reviewer", "admin"])),
    db: Session = Depends(get_db)
):
    """
    Executes simulated external registry queries on demand for authorized reviewers.
    """
    app = db.query(Application).filter(Application.id == id).first()
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found.")

    results = run_application_simulated_verifications(db, app)
    return {
        "message": "Simulated external verification complete.",
        "application_id": id,
        "is_simulated": True,
        "simulation_disclaimer": SIMULATION_DISCLAIMER,
        "verifications": results
    }

@router.post("/mock/verify-single")
def verify_single_mock_endpoint(req: MockVerificationRequest):
    """
    Standalone endpoint to test simulated external authority verification across scenarios:
    success, failure (not found), unavailable (timeout), and mismatch.
    """
    auth = req.authority.lower()
    if "society" in auth or "trust" in auth:
        res = verify_society_registration(
            registration_no=req.reference_number or "",
            declared_name=req.declared_name or "",
            scenario_override=req.scenario
        )
    elif "fire" in auth or "noc" in auth:
        res = verify_fire_safety_noc(
            noc_reference=req.reference_number or "",
            declared_institution=req.declared_name or "",
            scenario_override=req.scenario
        )
    elif "university" in auth or "affiliation" in auth:
        res = verify_university_affiliation(
            app_number=req.reference_number or "AICTE-2026-APP-1001",
            declared_intake=req.intake or 0,
            academic_year=req.academic_year or "2026-2027",
            scenario_override=req.scenario
        )
    elif "land" in auth or "revenue" in auth:
        res = verify_land_records(
            declared_acres=req.land_acres or 0.0,
            institution_name=req.declared_name or "",
            scenario_override=req.scenario
        )
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unknown authority '{req.authority}'.")

    return res

