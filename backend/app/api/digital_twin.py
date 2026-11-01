from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.application import Application
from app.models.user import User
from app.schemas.digital_twin import (
    DigitalTwinResponse,
    WhatIfScenarioRequest,
    WhatIfScenarioResponse
)
from app.api.deps import get_current_user
from app.services.digital_twin_service import (
    get_digital_twin_state,
    simulate_what_if_scenario
)
from app.services.compliance_engine import evaluate_application_compliance

router = APIRouter(prefix="/applications", tags=["Digital Twin"])

@router.get("/{id}/digital-twin", response_model=DigitalTwinResponse)
def get_digital_twin(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    app = db.query(Application).filter(Application.id == id).first()
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found.")

    if current_user.role == "institution" and current_user.institution_id != app.institution_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    if current_user.role == "reviewer" and app.assigned_reviewer_id is not None and app.assigned_reviewer_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    return get_digital_twin_state(db, application_id=id)

@router.post("/{id}/digital-twin/assess", response_model=DigitalTwinResponse)
def run_digital_twin_assessment(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    app = db.query(Application).filter(Application.id == id).first()
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found.")

    if current_user.role == "institution" and current_user.institution_id != app.institution_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    if current_user.role == "reviewer" and app.assigned_reviewer_id is not None and app.assigned_reviewer_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    evaluate_application_compliance(db, application_id=id, assessor_id=current_user.id)
    return get_digital_twin_state(db, application_id=id)

@router.post("/{id}/digital-twin/simulate", response_model=WhatIfScenarioResponse)
def simulate_scenario(
    id: int,
    scenario: WhatIfScenarioRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    app = db.query(Application).filter(Application.id == id).first()
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found.")

    if current_user.role == "institution" and current_user.institution_id != app.institution_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    if current_user.role == "reviewer" and app.assigned_reviewer_id is not None and app.assigned_reviewer_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    return simulate_what_if_scenario(db, application_id=id, scenario=scenario)
