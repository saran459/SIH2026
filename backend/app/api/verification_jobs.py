import json
import asyncio
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models.application import Application
from app.models.verification_job import VerificationJob
from app.models.application_report import ApplicationReport
from app.models.user import User
from app.schemas.verification import (
    VerificationJobResponse,
    ReviewerLiveStatusResponse,
    ApplicationReportListItemResponse
)
from app.api.deps import get_current_user, require_role, security
from app.services.auth_service import decode_token
from app.services.job_queue import broadcaster, run_job_sync
from fastapi.security import HTTPAuthorizationCredentials
import threading

router = APIRouter(tags=["Automated Verification Jobs"])

JOB_STATUS_NORMALIZER = {
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

def build_job_response(job: VerificationJob) -> VerificationJobResponse:
    app_num = job.application.application_number if job.application else None
    inst_name = job.application.institution.name if (job.application and job.application.institution) else None
    reasons = json.loads(job.human_verification_reasons) if job.human_verification_reasons else []

    standard_status = JOB_STATUS_NORMALIZER.get(job.status, job.status)

    return VerificationJobResponse(
        id=job.id,
        job_id=job.job_id,
        application_id=job.application_id,
        application_number=app_num,
        institution_name=inst_name,
        status=standard_status,
        stage=job.stage,
        progress_percent=job.progress_percent,
        attempt_count=job.attempt_count,
        max_retries=job.max_retries,
        error_message=job.error_message,
        requires_human_verification=job.requires_human_verification,
        human_verification_reasons=reasons,
        trigger_source=job.trigger_source,
        started_at=job.started_at,
        completed_at=job.completed_at,
        created_at=job.created_at,
        updated_at=job.updated_at
    )

@router.get("/verification-jobs", response_model=List[VerificationJobResponse])
def get_verification_jobs(
    status_filter: Optional[str] = Query(None, alias="status"),
    application_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(VerificationJob).join(Application)

    if current_user.role == "institution":
        query = query.filter(Application.institution_id == current_user.institution_id)

    if status_filter and status_filter.lower() != "all":
        query = query.filter(VerificationJob.status == status_filter)

    if application_id:
        query = query.filter(VerificationJob.application_id == application_id)

    jobs = query.order_by(desc(VerificationJob.created_at)).limit(50).all()
    return [build_job_response(j) for j in jobs]

@router.get("/verification-jobs/{job_id}", response_model=VerificationJobResponse)
def get_verification_job_status(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    job = db.query(VerificationJob).filter(VerificationJob.job_id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Verification job not found.")

    if current_user.role == "institution" and job.application.institution_id != current_user.institution_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    return build_job_response(job)

@router.post("/verification-jobs/{job_id}/retry", response_model=VerificationJobResponse)
def retry_failed_job(
    job_id: str,
    current_user: User = Depends(require_role(["reviewer", "admin"])),
    db: Session = Depends(get_db)
):
    job = db.query(VerificationJob).filter(VerificationJob.job_id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Verification job not found.")

    # Reset job
    job.status = "Pending"
    job.stage = "RETRY_QUEUED"
    job.progress_percent = 0
    job.attempt_count = 0
    job.error_message = None
    job.error_details = None
    db.commit()
    db.refresh(job)

    # Dispatch worker
    worker_thread = threading.Thread(target=run_job_sync, args=(job.job_id,), daemon=True)
    worker_thread.start()

    return build_job_response(job)

@router.get("/dashboard/reviewer-live-status", response_model=ReviewerLiveStatusResponse)
def get_reviewer_live_status(
    current_user: User = Depends(require_role(["reviewer", "admin"])),
    db: Session = Depends(get_db)
):
    # Query distinct counts supporting standardized and legacy labels
    pending_cnt = db.query(VerificationJob).filter(
        VerificationJob.status.in_(["Pending", "PENDING"])
    ).count()

    processing_cnt = db.query(VerificationJob).filter(
        VerificationJob.status.in_(["Processing", "PROCESSING"])
    ).count()

    completed_cnt = db.query(VerificationJob).filter(
        VerificationJob.status.in_(["Completed", "COMPLETED"])
    ).count()

    flagged_cnt = db.query(VerificationJob).filter(
        VerificationJob.status.in_(["Needs Manual Review", "FLAGGED_FOR_MANUAL_REVIEW"])
    ).count()

    failed_cnt = db.query(VerificationJob).filter(
        VerificationJob.status.in_(["Failed", "FAILED"])
    ).count()

    # Ready for decision: Applications in Under Review that have a report and are clean or completed
    ready_cnt = db.query(Application).filter(
        Application.status == "Under Review",
        Application.readiness_score >= 70.0
    ).count()

    total_active = db.query(Application).filter(
        Application.status.in_(["Submitted", "Under Review", "Correction Required", "Resubmitted"])
    ).count()

    recent_jobs = db.query(VerificationJob).order_by(desc(VerificationJob.created_at)).limit(10).all()

    return ReviewerLiveStatusResponse(
        pending=pending_cnt,
        processing=processing_cnt,
        completed=completed_cnt,
        needs_manual_review=flagged_cnt,
        flagged_for_manual_review=flagged_cnt,
        failed=failed_cnt,
        processing_failed=failed_cnt,
        ready_for_reviewer_decision=ready_cnt,
        total_active_queue=total_active,
        recent_jobs=[build_job_response(j) for j in recent_jobs]
    )

@router.get("/events/reviewer-stream")
async def reviewer_event_stream(
    request: Request,
    current_user: User = Depends(get_current_user)
):
    """
    Server-Sent Events (SSE) live feed delivering real-time verification job state
    transitions and automated report generation notifications.
    """
    queue = broadcaster.subscribe()

    async def event_generator():
        try:
            # Initial ping
            yield f"event: connected\ndata: {json.dumps({'message': 'Connected to AICTE SmartApproval Reviewer Stream', 'user': current_user.email})}\n\n"
            while True:
                if await request.is_disconnected():
                    break
                try:
                    payload = await asyncio.wait_for(queue.get(), timeout=15.0)
                    yield f"event: update\ndata: {payload}\n\n"
                except asyncio.TimeoutError:
                    # Keep-alive heartbeat comment
                    yield ": heartbeat\n\n"
        finally:
            broadcaster.unsubscribe(queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
