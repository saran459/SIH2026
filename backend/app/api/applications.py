import os
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_, and_, func
from app.config import settings
from app.database import get_db
from app.models.application import Application, WorkflowEvent
from app.models.institution import Institution
from app.models.user import User
from app.models.document import Document
from app.models.compliance import ComplianceFinding
from app.models.reviewer import ReviewerComment
from app.models.deadline import Deadline, Notification
from app.models.verification_job import VerificationJob
from app.models.application_report import ApplicationReport
from app.schemas.application import (
    ApplicationCreate,
    ApplicationUpdate,
    ApplicationResponse,
    WorkflowTransitionRequest,
    WorkflowEventResponse
)
from app.schemas.reviewer import (
    ReviewerCommentCreate,
    ReviewerCommentResponse,
    InstitutionResponseRequest
)
from app.api.deps import get_current_user, require_role
from app.services.workflow_engine import transition_workflow
from app.services.audit_service import log_audit_event
from app.services.compliance_engine import evaluate_application_compliance
from app.services.job_queue import enqueue_verification_job, broadcaster

router = APIRouter(prefix="/applications", tags=["Applications"])

def build_app_response(app: Application, db: Session) -> ApplicationResponse:
    docs_cnt = db.query(Document).filter(Document.application_id == app.id).count()
    open_findings = db.query(ComplianceFinding).filter(
        ComplianceFinding.application_id == app.id,
        ComplianceFinding.status != "Resolved"
    ).count()
    pending_corrections = db.query(ReviewerComment).filter(
        ReviewerComment.application_id == app.id,
        ReviewerComment.status == "Pending Response"
    ).count()

    next_dl = db.query(Deadline).filter(
        Deadline.application_id == app.id,
        Deadline.status != "Completed"
    ).order_by(Deadline.due_date.asc()).first()

    latest_job = db.query(VerificationJob).filter(
        VerificationJob.application_id == app.id
    ).order_by(VerificationJob.id.desc()).first()

    latest_report = db.query(ApplicationReport).filter(
        ApplicationReport.application_id == app.id
    ).order_by(ApplicationReport.id.desc()).first()

    job_status_normalized = None
    if latest_job:
        normalizer = {
            "PENDING": "Pending",
            "Pending": "Pending",
            "PROCESSING": "Processing",
            "Processing": "Processing",
            "COMPLETED": "Completed",
            "Completed": "Completed",
            "FLAGGED_FOR_MANUAL_REVIEW": "Needs Manual Review",
            "Needs Manual Review": "Needs Manual Review",
            "FAILED": "Failed",
            "Failed": "Failed"
        }
        job_status_normalized = normalizer.get(latest_job.status, latest_job.status)

    return ApplicationResponse(
        id=app.id,
        application_number=app.application_number,
        institution_id=app.institution_id,
        institution_name=app.institution.name if app.institution else None,
        category=app.category,
        academic_year=app.academic_year,
        level=app.level,
        program=app.program,
        status=app.status,
        created_by_user_id=app.created_by_user_id,
        created_by_name=app.created_by_user.full_name if app.created_by_user else None,
        assigned_reviewer_id=app.assigned_reviewer_id,
        assigned_reviewer_name=app.assigned_reviewer.full_name if app.assigned_reviewer else None,
        submission_date=app.submission_date,
        review_start_date=app.review_start_date,
        decision_date=app.decision_date,
        decision_reason=app.decision_reason,
        total_faculty_declared=app.total_faculty_declared,
        total_intake_declared=app.total_intake_declared,
        built_up_area_sqm=app.built_up_area_sqm,
        land_area_acres=app.land_area_acres,
        readiness_score=app.readiness_score,
        documents_count=docs_cnt,
        open_findings_count=open_findings,
        pending_corrections_count=pending_corrections,
        next_deadline=next_dl.due_date if next_dl else None,
        verification_job_status=job_status_normalized,
        verification_stage=latest_job.stage if latest_job else None,
        verification_progress=latest_job.progress_percent if latest_job else None,
        requires_human_verification=latest_report.requires_human_verification if latest_report else (latest_job.requires_human_verification if latest_job else False),
        has_verification_report=latest_report is not None,
        report_id=latest_report.id if latest_report else None,
        report_number=latest_report.report_number if latest_report else None,
        risk_level=latest_report.risk_level if latest_report else None,
        created_at=app.created_at,
        updated_at=app.updated_at
    )

@router.get("", response_model=List[ApplicationResponse])
def get_applications(
    status_filter: Optional[str] = Query(None, alias="status"),
    category: Optional[str] = None,
    academic_year: Optional[str] = None,
    institution_id: Optional[int] = None,
    assigned_reviewer_id: Optional[int] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Application)

    # Scoping by role
    if current_user.role == "institution":
        query = query.filter(Application.institution_id == current_user.institution_id)
    elif current_user.role == "reviewer":
        query = query.filter(
            or_(
                Application.assigned_reviewer_id == current_user.id,
                and_(
                    Application.assigned_reviewer_id.is_(None),
                    Application.status.in_(["Submitted", "Under Review", "Correction Required", "Resubmitted"])
                )
            )
        )
    elif institution_id:
        query = query.filter(Application.institution_id == institution_id)

    if status_filter and status_filter.lower() != "all":
        query = query.filter(Application.status == status_filter)
    if category and category.lower() != "all":
        clean_cat = category.split("(")[0].strip() if "(" in category else category.strip()
        query = query.filter(Application.category.ilike(f"%{clean_cat}%"))
    if academic_year and academic_year.lower() != "all":
        query = query.filter(Application.academic_year == academic_year)
    if assigned_reviewer_id:
        query = query.filter(Application.assigned_reviewer_id == assigned_reviewer_id)

    if search:
        search_term = search.strip()
        query = query.outerjoin(Institution).filter(
            Application.application_number.ilike(f"%{search_term}%") |
            Institution.name.ilike(f"%{search_term}%") |
            Application.program.ilike(f"%{search_term}%")
        )

    apps = query.order_by(desc(Application.updated_at), desc(Application.id)).all()
    return [build_app_response(a, db) for a in apps]

@router.post("", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
def create_application(
    data: ApplicationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role == "reviewer":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Reviewers cannot create applications.")

    target_inst_id = data.institution_id if current_user.role == "admin" and data.institution_id else current_user.institution_id
    if not target_inst_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Institution must be specified.")

    inst = db.query(Institution).filter(Institution.id == target_inst_id).first()
    if not inst:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Institution not found.")

    # Generate sequential unique application number using max(id) to prevent collision
    year_prefix = datetime.utcnow().year
    max_id = db.query(func.max(Application.id)).scalar() or 0
    app_number = f"AICTE-{year_prefix}-APP-{max_id + 1001}"

    new_app = Application(
        application_number=app_number,
        institution_id=target_inst_id,
        category=data.category,
        academic_year=data.academic_year,
        level=data.level,
        program=data.program,
        total_faculty_declared=data.total_faculty_declared,
        total_intake_declared=data.total_intake_declared,
        built_up_area_sqm=data.built_up_area_sqm,
        land_area_acres=data.land_area_acres,
        status="Draft",
        created_by_user_id=current_user.id,
        readiness_score=100.0
    )
    db.add(new_app)
    db.commit()
    db.refresh(new_app)

    # Initial workflow event
    event = WorkflowEvent(
        application_id=new_app.id,
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        action="Draft Created",
        from_state="None",
        to_state="Draft",
        comments="Application initialized as draft.",
        created_at=datetime.utcnow()
    )
    db.add(event)

    log_audit_event(
        db=db,
        actor_email=current_user.email,
        actor_role=current_user.role,
        action_type="APPLICATION_CREATED",
        actor_id=current_user.id,
        application_id=new_app.id,
        details={"application_number": app_number, "category": data.category}
    )
    db.commit()

    # If submitted directly from the application form
    if data.submit_immediately:
        if getattr(data, "generate_statutory_affidavit", False):
            affidavit_doc = Document(
                application_id=new_app.id,
                category="Affidavit / Declaration",
                file_name=f"Statutory_Affidavit_{app_number}.pdf",
                original_name=f"AICTE_Statutory_Affidavit_{data.academic_year}.pdf",
                file_path=os.path.join(settings.UPLOAD_DIR, "statutory_affidavit_signed.pdf"),
                file_size=24580,
                mime_type="application/pdf",
                file_hash="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
                page_count=2,
                extraction_status="EXTRACTED",
                raw_text=f"AICTE Approval Process Handbook (APH) Statutory Compliance Affidavit. Institution: {inst.name}. Category: {data.category}. Academic Year: {data.academic_year}. Program: {data.program}. Declared Faculty: {data.total_faculty_declared}. Declared Approved Intake: {data.total_intake_declared}. Declared Built-up Area: {data.built_up_area_sqm} sqm. Declared Land Area: {data.land_area_acres} acres. Digitally verified and signed by {current_user.full_name} ({current_user.email}) on {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}.",
                uploaded_by_user_id=current_user.id
            )
            db.add(affidavit_doc)
            db.commit()

        new_app = transition_workflow(
            db=db,
            application=new_app,
            to_state="Submitted",
            actor=current_user,
            action_name="Application Submitted",
            comments="Formally submitted by institutional authorized signatory during dossier creation."
        )

        deadline = Deadline(
            application_id=new_app.id,
            title="AICTE Scrutiny Committee Review",
            deadline_type="Review Completion",
            due_date=datetime.utcnow() + timedelta(days=21),
            status="On Track",
            assigned_role="reviewer"
        )
        db.add(deadline)
        db.commit()

        enqueue_verification_job(db, new_app.id, trigger_source="SUBMISSION")

        broadcaster.broadcast("APPLICATION_SUBMITTED", {
            "application_id": new_app.id,
            "application_number": new_app.application_number,
            "institution_name": inst.name,
            "category": new_app.category,
            "status": new_app.status,
            "submitted_at": datetime.utcnow().isoformat()
        })

    return build_app_response(new_app, db)

@router.get("/{id}", response_model=ApplicationResponse)
def get_application(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    app = db.query(Application).filter(Application.id == id).first()
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found.")
    
    if current_user.role == "institution" and current_user.institution_id != app.institution_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this application.")

    if current_user.role == "reviewer":
        if app.assigned_reviewer_id is not None and app.assigned_reviewer_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied. This application is assigned to another reviewer.")

    return build_app_response(app, db)

@router.put("/{id}", response_model=ApplicationResponse)
@router.patch("/{id}", response_model=ApplicationResponse)
def update_application(
    id: int,
    data: ApplicationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    app = db.query(Application).filter(Application.id == id).first()
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found.")

    if current_user.role == "reviewer":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Reviewers cannot modify application draft details.")

    if current_user.role == "institution" and current_user.institution_id != app.institution_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    if app.status not in ["Draft", "Correction Required"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot edit application while in '{app.status}' status."
        )

    update_dict = data.dict(exclude_unset=True)
    for k, v in update_dict.items():
        setattr(app, k, v)
    app.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(app)

    log_audit_event(
        db=db,
        actor_email=current_user.email,
        actor_role=current_user.role,
        action_type="APPLICATION_UPDATED",
        actor_id=current_user.id,
        application_id=app.id,
        details={"updated_fields": list(update_dict.keys())}
    )
    return build_app_response(app, db)

@router.post("/{id}/submit", response_model=ApplicationResponse)
def submit_application(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    app = db.query(Application).filter(Application.id == id).first()
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found.")

    if current_user.role == "reviewer":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Reviewers cannot submit applications.")

    if current_user.role == "institution" and current_user.institution_id != app.institution_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    app = transition_workflow(
        db=db,
        application=app,
        to_state="Submitted",
        actor=current_user,
        action_name="Application Submitted",
        comments="Formally submitted by institutional authorized signatory."
    )

    # Create submission deadline for AICTE Scrutiny Committee (21 days)
    deadline = Deadline(
        application_id=app.id,
        title="AICTE Scrutiny Committee Review",
        deadline_type="Review Completion",
        due_date=datetime.utcnow() + timedelta(days=21),
        status="On Track",
        assigned_role="reviewer"
    )
    db.add(deadline)
    db.commit()

    # Automatically enqueue background review-processing job (no routine manual reviewer action needed)
    enqueue_verification_job(db, app.id, trigger_source="SUBMISSION")

    # Broadcast event so reviewer portals update in real time
    broadcaster.broadcast("APPLICATION_SUBMITTED", {
        "application_id": app.id,
        "application_number": app.application_number,
        "institution_name": app.institution.name if app.institution else "Applicant Institution",
        "category": app.category,
        "status": app.status,
        "submitted_at": datetime.utcnow().isoformat()
    })

    return build_app_response(app, db)

@router.post("/{id}/assign-reviewer", response_model=ApplicationResponse)
def assign_reviewer(
    id: int,
    reviewer_id: int = Query(...),
    current_user: User = Depends(require_role(["admin", "reviewer"])),
    db: Session = Depends(get_db)
):
    app = db.query(Application).filter(Application.id == id).first()
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found.")

    if current_user.role == "reviewer":
        if reviewer_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Reviewers can only assign applications to themselves.")
        if app.assigned_reviewer_id is not None and app.assigned_reviewer_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Application is already assigned to another reviewer.")

    reviewer = db.query(User).filter(User.id == reviewer_id, User.role == "reviewer").first()
    if not reviewer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reviewer not found.")

    app.assigned_reviewer_id = reviewer.id
    if app.status == "Submitted":
        app = transition_workflow(
            db=db,
            application=app,
            to_state="Under Review",
            actor=current_user,
            action_name="Reviewer Assigned",
            comments=f"Assigned to {reviewer.full_name} for scrutiny."
        )
    else:
        db.commit()

    return build_app_response(app, db)

@router.post("/{id}/request-correction", response_model=ApplicationResponse)
def request_correction(
    id: int,
    request_data: ReviewerCommentCreate,
    current_user: User = Depends(require_role(["reviewer", "admin"])),
    db: Session = Depends(get_db)
):
    app = db.query(Application).filter(Application.id == id).first()
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found.")

    if current_user.role == "reviewer":
        if app.assigned_reviewer_id is not None and app.assigned_reviewer_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied. You are not the assigned reviewer for this application.")
        elif app.assigned_reviewer_id is None:
            app.assigned_reviewer_id = current_user.id

    # Create ReviewerComment
    due_date = request_data.due_date or (datetime.utcnow() + timedelta(days=14))
    comment = ReviewerComment(
        application_id=app.id,
        reviewer_id=current_user.id,
        finding_id=request_data.finding_id,
        request_type=request_data.request_type,
        title=request_data.title,
        comment=request_data.comment,
        due_date=due_date,
        status="Pending Response"
    )
    db.add(comment)

    # Create correction response deadline
    dl = Deadline(
        application_id=app.id,
        title=f"Correction Response: {request_data.title}",
        deadline_type="Correction Response",
        due_date=due_date,
        status="On Track",
        assigned_role="institution"
    )
    db.add(dl)

    app = transition_workflow(
        db=db,
        application=app,
        to_state="Correction Required",
        actor=current_user,
        action_name="Correction Requested",
        comments=f"Reviewer query: {request_data.title} - {request_data.comment}"
    )

    return build_app_response(app, db)

@router.post("/{id}/resubmit", response_model=ApplicationResponse)
def resubmit_application(
    id: int,
    comments: Optional[str] = Query(None),
    payload: Optional[dict] = Body(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    app = db.query(Application).filter(Application.id == id).first()
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found.")

    comment_text = comments or (payload.get("comments") if payload else None) or (payload.get("reason") if payload else None) or "Institutional corrections and updated evidences uploaded."

    app = transition_workflow(
        db=db,
        application=app,
        to_state="Resubmitted",
        actor=current_user,
        action_name="Application Resubmitted",
        comments=comment_text
    )

    # Immediately transition back to Under Review
    app = transition_workflow(
        db=db,
        application=app,
        to_state="Under Review",
        actor=current_user,
        action_name="Review Resumed",
        comments="Application returned to reviewer queue for re-evaluation."
    )

    # Automatically re-enqueue background review verification job
    enqueue_verification_job(db, app.id, trigger_source="RESUBMISSION")

    return build_app_response(app, db)

@router.post("/{id}/transition", response_model=ApplicationResponse)
def transition_application(
    id: int,
    data: WorkflowTransitionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    app = db.query(Application).filter(Application.id == id).first()
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found.")

    target_status = data.to_status or data.to_state
    if not target_status and data.action:
        action_status_map = {
            "submit": "Submitted",
            "start_review": "Under Review",
            "request_correction": "Correction Required",
            "resubmit": "Resubmitted",
            "approve": "Approved",
            "reject": "Rejected",
            "withdraw": "Withdrawn"
        }
        target_status = action_status_map.get(data.action)

    if not target_status:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Target status or action is required.")

    app = transition_workflow(
        db=db,
        application=app,
        to_state=target_status,
        actor=current_user,
        action_name=f"Workflow Transition: {target_status}",
        comments=data.comments,
        decision_reason=data.decision_reason
    )

    if target_status == "Submitted":
        enqueue_verification_job(db, app.id, trigger_source="SUBMISSION")
        broadcaster.broadcast("APPLICATION_SUBMITTED", {
            "application_id": app.id,
            "application_number": app.application_number,
            "institution_id": app.institution_id,
            "category": app.category,
            "academic_year": app.academic_year,
            "status": app.status
        })
    elif target_status == "Resubmitted":
        enqueue_verification_job(db, app.id, trigger_source="RESUBMISSION")

    return build_app_response(app, db)

@router.post("/{id}/trigger-verification", response_model=ApplicationResponse)
def trigger_verification(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    app = db.query(Application).filter(Application.id == id).first()
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found.")

    if current_user.role == "institution" and current_user.institution_id != app.institution_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    if app.status == "Draft":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot execute verification on an unsubmitted Draft application. Application must be submitted by the institution first."
        )

    enqueue_verification_job(db, app.id, trigger_source="MANUAL_TRIGGER")
    return build_app_response(app, db)

@router.delete("", status_code=status.HTTP_200_OK)
def delete_all_applications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Application)
    if current_user.role == "institution":
        query = query.filter(Application.institution_id == current_user.institution_id)
    apps = query.all()
    count = len(apps)
    for app in apps:
        db.query(Notification).filter(Notification.application_id == app.id).delete(synchronize_session=False)
        db.delete(app)
    db.commit()
    log_audit_event(
        db=db,
        actor_email=current_user.email,
        actor_role=current_user.role,
        action_type="ALL_APPLICATIONS_DELETED",
        actor_id=current_user.id,
        details={"deleted_count": count}
    )
    return {"status": "success", "message": f"{count} application(s) permanently deleted."}

@router.delete("/{id}", status_code=status.HTTP_200_OK)
def delete_application(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    app = db.query(Application).filter(Application.id == id).first()
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found.")

    if current_user.role == "institution" and app.institution_id != current_user.institution_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only delete your own institution's applications.")

    app_num = app.application_number
    app_id = app.id

    # Clean notifications tied to this application
    db.query(Notification).filter(Notification.application_id == app.id).delete(synchronize_session=False)

    # Delete application record (cascades documents, findings, assessments, reports, workflow_events, comments, deadlines)
    db.delete(app)
    db.commit()

    log_audit_event(
        db=db,
        actor_email=current_user.email,
        actor_role=current_user.role,
        action_type="APPLICATION_DELETED",
        actor_id=current_user.id,
        details={"application_id": app_id, "application_number": app_num}
    )
    return {"status": "success", "message": f"Application {app_num} permanently deleted."}

@router.post("/{id}/approve", response_model=ApplicationResponse)
def approve_application(
    id: int,
    decision_reason: Optional[str] = Query(None),
    payload: Optional[dict] = Body(None),
    current_user: User = Depends(require_role(["reviewer", "admin"])),
    db: Session = Depends(get_db)
):
    app = db.query(Application).filter(Application.id == id).first()
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found.")

    reason = decision_reason or (payload.get("decision_reason") if payload else None) or (payload.get("reason") if payload else None)
    if not reason or not str(reason).strip():
        reason = "Formal approval granted following scrutiny and statutory compliance verification."
    else:
        reason = str(reason).strip()

    if current_user.role == "reviewer":
        app.assigned_reviewer_id = current_user.id

    app = transition_workflow(
        db=db,
        application=app,
        to_state="Approved",
        actor=current_user,
        action_name="Application Approved",
        decision_reason=reason
    )
    return build_app_response(app, db)

@router.post("/{id}/reject", response_model=ApplicationResponse)
def reject_application(
    id: int,
    decision_reason: Optional[str] = Query(None),
    payload: Optional[dict] = Body(None),
    current_user: User = Depends(require_role(["reviewer", "admin"])),
    db: Session = Depends(get_db)
):
    app = db.query(Application).filter(Application.id == id).first()
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found.")

    reason = decision_reason or (payload.get("decision_reason") if payload else None) or (payload.get("reason") if payload else None)
    if not reason or not str(reason).strip():
        reason = "Application rejected due to statutory document deficiencies not rectified per AICTE APH 2026-27 norms."
    else:
        reason = str(reason).strip()

    if current_user.role == "reviewer":
        app.assigned_reviewer_id = current_user.id

    app = transition_workflow(
        db=db,
        application=app,
        to_state="Rejected",
        actor=current_user,
        action_name="Application Rejected",
        decision_reason=reason
    )
    return build_app_response(app, db)

@router.post("/{id}/withdraw", response_model=ApplicationResponse)
def withdraw_application(
    id: int,
    reason: str = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    app = db.query(Application).filter(Application.id == id).first()
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found.")

    if current_user.role == "reviewer":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Reviewers cannot withdraw applications.")

    if current_user.role == "institution" and current_user.institution_id != app.institution_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    app = transition_workflow(
        db=db,
        application=app,
        to_state="Withdrawn",
        actor=current_user,
        action_name="Application Withdrawn",
        comments=reason
    )
    return build_app_response(app, db)

@router.get("/{id}/workflow-history", response_model=List[WorkflowEventResponse])
def get_workflow_history(
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

    return db.query(WorkflowEvent).filter(
        WorkflowEvent.application_id == id
    ).order_by(WorkflowEvent.created_at.asc(), WorkflowEvent.id.asc()).all()

@router.get("/{id}/comments", response_model=List[ReviewerCommentResponse])
def get_reviewer_comments(
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

    comments = db.query(ReviewerComment).filter(
        ReviewerComment.application_id == id
    ).order_by(ReviewerComment.created_at.desc()).all()

    results = []
    for c in comments:
        results.append(
            ReviewerCommentResponse(
                id=c.id,
                application_id=c.application_id,
                reviewer_id=c.reviewer_id,
                reviewer_name=c.reviewer.full_name if c.reviewer else None,
                finding_id=c.finding_id,
                finding_title=c.finding.title if c.finding else None,
                request_type=c.request_type,
                title=c.title,
                comment=c.comment,
                due_date=c.due_date,
                status=c.status,
                institution_response=c.institution_response,
                response_evidence_document_id=c.response_evidence_document_id,
                responded_at=c.responded_at,
                created_at=c.created_at,
                updated_at=c.updated_at
            )
        )
    return results

@router.post("/comments/{comment_id}/respond")
def respond_to_comment(
    comment_id: int,
    data: InstitutionResponseRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    comment = db.query(ReviewerComment).filter(ReviewerComment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found.")

    app = comment.application
    if current_user.role == "institution" and current_user.institution_id != app.institution_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    comment.institution_response = data.institution_response
    comment.response_evidence_document_id = data.response_evidence_document_id
    comment.responded_at = datetime.utcnow()
    comment.status = "Response Submitted"

    # Close associated deadline if open
    dl = db.query(Deadline).filter(
        Deadline.application_id == app.id,
        Deadline.title.ilike(f"%{comment.title}%"),
        Deadline.status != "Completed"
    ).first()
    if dl:
        dl.status = "Completed"
        dl.completed_at = datetime.utcnow()

    db.commit()

    log_audit_event(
        db=db,
        actor_email=current_user.email,
        actor_role=current_user.role,
        action_type="COMMENT_RESPONSE_SUBMITTED",
        actor_id=current_user.id,
        application_id=app.id,
        details={"comment_id": comment.id, "response_excerpt": data.institution_response[:100]}
    )

    return {"message": "Response recorded successfully."}

@router.post("/{id}/comments", response_model=ReviewerCommentResponse)
def add_reviewer_comment(
    id: int,
    data: ReviewerCommentCreate,
    current_user: User = Depends(require_role(["reviewer", "admin"])),
    db: Session = Depends(get_db)
):
    app = db.query(Application).filter(Application.id == id).first()
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found.")
    if current_user.role == "reviewer" and app.assigned_reviewer_id is not None and app.assigned_reviewer_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
    
    comm = ReviewerComment(
        application_id=app.id,
        reviewer_id=current_user.id,
        finding_id=data.finding_id,
        request_type=data.request_type or "Clarification",
        title=data.title or "Scrutiny Note",
        comment=data.comment,
        due_date=data.due_date,
        status="Pending Response"
    )
    db.add(comm)
    db.commit()
    db.refresh(comm)

    try:
        log_audit_event(
            db=db,
            actor_email=current_user.email,
            actor_role=current_user.role,
            action_type="REVIEWER_COMMENT_ADDED",
            actor_id=current_user.id,
            application_id=app.id,
            details={
                "comment_id": comm.id,
                "title": comm.title,
                "comment_preview": comm.comment[:100]
            }
        )
    except Exception:
        pass
    return ReviewerCommentResponse(
        id=comm.id,
        application_id=comm.application_id,
        reviewer_id=comm.reviewer_id,
        reviewer_name=current_user.full_name,
        finding_id=comm.finding_id,
        finding_title=None,
        request_type=comm.request_type,
        title=comm.title,
        comment=comm.comment,
        due_date=comm.due_date,
        status=comm.status,
        institution_response=None,
        response_evidence_document_id=None,
        responded_at=None,
        created_at=comm.created_at,
        updated_at=comm.updated_at
    )
