import json
from datetime import datetime
from typing import Optional, Tuple
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.application import Application, WorkflowEvent
from app.models.user import User
from app.models.deadline import Notification, Deadline
from app.models.application_report import ApplicationReport
from app.services.audit_service import log_audit_event

VALID_TRANSITIONS = {
    "Draft": ["Submitted", "Withdrawn", "Rejected"],
    "Submitted": ["Under Review", "Correction Required", "Approved", "Rejected", "Withdrawn"],
    "Under Review": ["Correction Required", "Approved", "Rejected", "Withdrawn"],
    "Correction Required": ["Resubmitted", "Under Review", "Rejected", "Withdrawn"],
    "Resubmitted": ["Under Review", "Correction Required", "Approved", "Rejected", "Withdrawn"],
    "Approved": ["Rejected"],
    "Rejected": ["Under Review"],
    "Withdrawn": []
}

def transition_workflow(
    db: Session,
    application: Application,
    to_state: str,
    actor: User,
    action_name: str,
    comments: Optional[str] = None,
    decision_reason: Optional[str] = None
) -> Application:
    current_state = application.status

    # Validate transition
    allowed = VALID_TRANSITIONS.get(current_state, [])
    if to_state not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid workflow transition from '{current_state}' to '{to_state}'. Allowed transitions: {allowed}"
        )

    # Role permission checks
    if to_state in ["Submitted", "Resubmitted", "Withdrawn"]:
        if actor.role not in ["institution", "admin"]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only institution users or admins can submit or withdraw applications.")
        if actor.role == "institution" and actor.institution_id != application.institution_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only manage your own institution's applications.")

    if to_state in ["Under Review", "Correction Required", "Approved", "Rejected"]:
        if actor.role not in ["reviewer", "admin"]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only authorized reviewers or administrators can review, request corrections, or decide on applications.")

    if to_state in ["Approved", "Rejected"]:
        clean_reason = (decision_reason or "").strip()
        if len(clean_reason) < 3:
            clean_reason = f"Application {to_state.lower()} after comprehensive scrutiny evaluation per AICTE APH 2026-27 norms."
        application.decision_date = datetime.utcnow()
        application.decision_reason = clean_reason
        application.decision_by_user_id = actor.id
        decision_reason = clean_reason

    if to_state == "Submitted":
        application.submission_date = datetime.utcnow()

    if to_state == "Under Review" and not application.review_start_date:
        application.review_start_date = datetime.utcnow()

    # Update application status
    from_state = application.status
    application.status = to_state
    application.updated_at = datetime.utcnow()

    # Create Workflow Event record
    workflow_event = WorkflowEvent(
        application_id=application.id,
        actor_id=actor.id,
        actor_name=actor.full_name,
        actor_role=actor.role,
        action=action_name,
        from_state=from_state,
        to_state=to_state,
        comments=comments or decision_reason,
        created_at=datetime.utcnow()
    )
    db.add(workflow_event)

    # Create audit event
    log_audit_event(
        db=db,
        actor_email=actor.email,
        actor_role=actor.role,
        action_type=f"WORKFLOW_{to_state.upper().replace(' ', '_')}",
        actor_id=actor.id,
        application_id=application.id,
        details={
            "application_number": application.application_number,
            "from_state": from_state,
            "to_state": to_state,
            "action": action_name,
            "comments": comments or decision_reason
        }
    )

    # Create in-app notifications
    create_workflow_notifications(db, application, from_state, to_state, actor, comments or decision_reason)

    # Synchronize human review decision with stored ApplicationReport if exists
    try:
        from app.models.application_report import ApplicationReport
        report = db.query(ApplicationReport).filter(ApplicationReport.application_id == application.id).first()
        if report and report.report_data:
            rd = json.loads(report.report_data) if isinstance(report.report_data, str) else report.report_data
            rd["human_review_decision"] = {
                "status": to_state,
                "is_decided": to_state in ["Approved", "Rejected", "Correction Required"],
                "decision_date": application.decision_date.strftime("%Y-%m-%d %H:%M:%S") if application.decision_date else datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
                "decision_reason": decision_reason or comments,
                "decision_by_user_id": actor.id,
                "decision_by_name": actor.full_name
            }
            report.report_data = json.dumps(rd)
            if to_state in ["Approved", "Rejected"]:
                report.status = "Reviewed"
            report.updated_at = datetime.utcnow()
    except Exception:
        pass

    db.commit()
    db.refresh(application)
    return application

def create_workflow_notifications(
    db: Session,
    application: Application,
    from_state: str,
    to_state: str,
    actor: User,
    notes: Optional[str] = None
):
    institution_id = application.institution_id
    app_no = application.application_number

    if to_state == "Submitted":
        notif = Notification(
            role_target="reviewer",
            application_id=application.id,
            title=f"New Application Submitted: {app_no}",
            message=f"Application {app_no} has been submitted by {application.institution.name} and is ready for reviewer assignment.",
            category="Application",
            severity="Info",
            link_url=f"/applications/{application.id}"
        )
        db.add(notif)
    elif to_state == "Under Review":
        notif = Notification(
            user_id=application.created_by_user_id,
            application_id=application.id,
            title=f"Review Started: {app_no}",
            message=f"Review of your application {app_no} has commenced by AICTE Review Committee.",
            category="Workflow",
            severity="Info",
            link_url=f"/applications/{application.id}"
        )
        db.add(notif)
    elif to_state == "Correction Required":
        notif = Notification(
            user_id=application.created_by_user_id,
            application_id=application.id,
            title=f"Action Required: Correction Requested for {app_no}",
            message=f"Reviewer has requested corrections/clarifications on your application {app_no}. Note: {notes or 'Please see remarks'}",
            category="Compliance",
            severity="Warning",
            link_url=f"/applications/{application.id}"
        )
        db.add(notif)
    elif to_state == "Resubmitted":
        notif = Notification(
            user_id=application.assigned_reviewer_id,
            role_target="reviewer" if not application.assigned_reviewer_id else None,
            application_id=application.id,
            title=f"Correction Resubmitted: {app_no}",
            message=f"Institution has uploaded corrections and resubmitted application {app_no}.",
            category="Workflow",
            severity="Info",
            link_url=f"/applications/{application.id}"
        )
        db.add(notif)
    elif to_state == "Approved":
        notif = Notification(
            user_id=application.created_by_user_id,
            application_id=application.id,
            title=f"Application Approved: {app_no}",
            message=f"Congratulations! Application {app_no} has received formal AICTE approval. Order: {notes or 'Approved'}",
            category="Application",
            severity="Success",
            link_url=f"/applications/{application.id}"
        )
        db.add(notif)
    elif to_state == "Rejected":
        notif = Notification(
            user_id=application.created_by_user_id,
            application_id=application.id,
            title=f"Application Rejected: {app_no}",
            message=f"Application {app_no} has been rejected by the AICTE Approval Board. Reason: {notes or 'Deficiencies noted'}",
            category="Application",
            severity="Error",
            link_url=f"/applications/{application.id}"
        )
        db.add(notif)
