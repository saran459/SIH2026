from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.application import Application
from app.models.compliance import ComplianceRule, ComplianceAssessment, ComplianceFinding
from app.models.document import Document
from app.models.user import User
from app.schemas.compliance import (
    ComplianceRuleCreate,
    ComplianceRuleResponse,
    ComplianceAssessmentResponse,
    ComplianceFindingResponse,
    FindingResolveRequest
)
from app.api.deps import get_current_user, require_role
from app.services.compliance_engine import evaluate_application_compliance
from app.services.audit_service import log_audit_event

router = APIRouter(tags=["Compliance"])

def build_finding_response(f: ComplianceFinding) -> ComplianceFindingResponse:
    return ComplianceFindingResponse(
        id=f.id,
        assessment_id=f.assessment_id,
        application_id=f.application_id,
        rule_id=f.rule_id,
        rule_code=f.rule.rule_code if f.rule else None,
        finding_type=f.finding_type,
        title=f.title,
        description=f.description,
        severity=f.severity,
        status=f.status,
        expected_value=f.expected_value,
        observed_value=f.observed_value,
        document_id=f.document_id,
        document_name=f.document.original_name if f.document else None,
        comparison_document_id=f.comparison_document_id,
        comparison_document_name=f.comparison_document.original_name if f.comparison_document else None,
        page_number=f.page_number,
        evidence_excerpt=f.evidence_excerpt,
        recommended_action=f.recommended_action,
        resolution_notes=f.resolution_notes,
        resolved_by_name=f.resolved_by.full_name if f.resolved_by else None,
        created_at=f.created_at,
        updated_at=f.updated_at
    )

@router.get("/compliance/rules", response_model=List[ComplianceRuleResponse])
def get_compliance_rules(
    category: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(ComplianceRule)
    if category:
        query = query.filter(ComplianceRule.category == category)
    return query.order_by(ComplianceRule.rule_code.asc()).all()

@router.post("/compliance/rules", response_model=ComplianceRuleResponse, status_code=status.HTTP_201_CREATED)
def create_compliance_rule(
    data: ComplianceRuleCreate,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    existing = db.query(ComplianceRule).filter(ComplianceRule.rule_code == data.rule_code).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Rule code already exists.")

    rule = ComplianceRule(**data.dict())
    db.add(rule)
    db.commit()
    db.refresh(rule)

    log_audit_event(
        db=db,
        actor_email=current_user.email,
        actor_role=current_user.role,
        action_type="COMPLIANCE_RULE_CREATED",
        actor_id=current_user.id,
        details={"rule_code": rule.rule_code, "title": rule.title}
    )
    return rule

@router.post("/applications/{id}/compliance/run", response_model=ComplianceAssessmentResponse)
def run_compliance_assessment(
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

    assessment = evaluate_application_compliance(db, application_id=id, assessor_id=current_user.id)

    findings = db.query(ComplianceFinding).filter(ComplianceFinding.application_id == id).all()

    log_audit_event(
        db=db,
        actor_email=current_user.email,
        actor_role=current_user.role,
        action_type="COMPLIANCE_ASSESSMENT_RUN",
        actor_id=current_user.id,
        application_id=id,
        details={
            "readiness_score": assessment.readiness_score,
            "status": assessment.status,
            "failed_count": assessment.failed_count
        }
    )

    return ComplianceAssessmentResponse(
        id=assessment.id,
        application_id=assessment.application_id,
        assessed_by_user_id=assessment.assessed_by_user_id,
        readiness_score=assessment.readiness_score,
        total_rules_evaluated=assessment.total_rules_evaluated,
        passed_count=assessment.passed_count,
        failed_count=assessment.failed_count,
        needs_review_count=assessment.needs_review_count,
        status=assessment.status,
        created_at=assessment.created_at,
        findings=[build_finding_response(f) for f in findings]
    )

@router.get("/applications/{id}/compliance", response_model=ComplianceAssessmentResponse)
def get_application_compliance(
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

    assessment = db.query(ComplianceAssessment).filter(
        ComplianceAssessment.application_id == id
    ).order_by(ComplianceAssessment.id.desc()).first()

    if not assessment:
        # Run initial assessment if none recorded
        assessment = evaluate_application_compliance(db, application_id=id, assessor_id=current_user.id)

    findings = db.query(ComplianceFinding).filter(ComplianceFinding.application_id == id).all()

    return ComplianceAssessmentResponse(
        id=assessment.id,
        application_id=assessment.application_id,
        assessed_by_user_id=assessment.assessed_by_user_id,
        readiness_score=assessment.readiness_score,
        total_rules_evaluated=assessment.total_rules_evaluated,
        passed_count=assessment.passed_count,
        failed_count=assessment.failed_count,
        needs_review_count=assessment.needs_review_count,
        status=assessment.status,
        created_at=assessment.created_at,
        findings=[build_finding_response(f) for f in findings]
    )

@router.get("/findings/{id}", response_model=ComplianceFindingResponse)
@router.get("/compliance/findings/{id}", response_model=ComplianceFindingResponse)
def get_finding(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    finding = db.query(ComplianceFinding).filter(ComplianceFinding.id == id).first()
    if not finding:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Finding not found.")
    
    app = finding.application
    if current_user.role == "institution" and current_user.institution_id != app.institution_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
    if current_user.role == "reviewer" and app.assigned_reviewer_id is not None and app.assigned_reviewer_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    return build_finding_response(finding)

@router.post("/findings/{id}/resolve", response_model=ComplianceFindingResponse)
@router.post("/compliance/findings/{id}/resolve", response_model=ComplianceFindingResponse)
def resolve_finding(
    id: int,
    data: FindingResolveRequest,
    current_user: User = Depends(require_role(["reviewer", "admin"])),
    db: Session = Depends(get_db)
):
    # 1. RBAC authorization order enforced: user's role is checked before verifying finding entity
    if current_user.role not in ["reviewer", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only reviewers and administrators can resolve compliance findings."
        )

    # 2. Check if finding exists only after RBAC role check succeeds
    finding = db.query(ComplianceFinding).filter(ComplianceFinding.id == id).first()
    if not finding:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Finding not found.")

    app = finding.application
    if current_user.role == "reviewer":
        if app.assigned_reviewer_id is not None and app.assigned_reviewer_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied. You are not assigned to review this application.")
        elif app.assigned_reviewer_id is None:
            app.assigned_reviewer_id = current_user.id

    if not data.resolution_notes or len(data.resolution_notes.strip()) < 5:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Substantive resolution notes/justification required.")

    finding.status = data.status
    finding.resolution_notes = data.resolution_notes
    finding.resolved_by_user_id = current_user.id
    db.commit()

    # Recalculate score after resolution
    evaluate_application_compliance(db, application_id=app.id, assessor_id=current_user.id)
    db.refresh(finding)

    log_audit_event(
        db=db,
        actor_email=current_user.email,
        actor_role=current_user.role,
        action_type="COMPLIANCE_FINDING_RESOLVED",
        actor_id=current_user.id,
        application_id=app.id,
        details={
            "finding_id": finding.id,
            "title": finding.title,
            "resolution_status": data.status,
            "notes": data.resolution_notes
        }
    )

    return build_finding_response(finding)

@router.delete("/compliance/findings/{id}", status_code=status.HTTP_200_OK)
@router.delete("/findings/{id}", status_code=status.HTTP_200_OK)
def delete_finding(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    finding = db.query(ComplianceFinding).filter(ComplianceFinding.id == id).first()
    if not finding:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Finding not found.")
    db.delete(finding)
    db.commit()
    return {"status": "success", "message": "Compliance finding deleted."}

@router.delete("/compliance/findings", status_code=status.HTTP_200_OK)
@router.delete("/findings", status_code=status.HTTP_200_OK)
def delete_all_findings(
    application_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from app.models.application import Application
    if application_id:
        count = db.query(ComplianceFinding).filter(ComplianceFinding.application_id == application_id).delete(synchronize_session=False)
    elif current_user.role == "institution":
        app_ids = [a.id for a in db.query(Application.id).filter(Application.institution_id == current_user.institution_id).all()]
        count = db.query(ComplianceFinding).filter(ComplianceFinding.application_id.in_(app_ids)).delete(synchronize_session=False) if app_ids else 0
    else:
        count = db.query(ComplianceFinding).delete(synchronize_session=False)
    db.commit()
    return {"status": "success", "message": f"{count} compliance finding(s) deleted."}
