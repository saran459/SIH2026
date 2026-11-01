import uuid
import json
import logging
import asyncio
import threading
import traceback
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any, AsyncGenerator
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import SessionLocal
from app.models.application import Application
from app.models.verification_job import VerificationJob
from app.models.application_report import ApplicationReport
from app.services.automated_review_service import generate_and_persist_verification_report

logger = logging.getLogger("aicte_smartapproval.job_queue")

# In-memory SSE subscriber queue manager for real-time dashboard updates
class EventBroadcaster:
    def __init__(self):
        self._subscribers: List[asyncio.Queue] = []
        self._lock = threading.Lock()

    def subscribe(self) -> asyncio.Queue:
        q = asyncio.Queue(maxsize=100)
        with self._lock:
            self._subscribers.append(q)
        return q

    def unsubscribe(self, q: asyncio.Queue):
        with self._lock:
            if q in self._subscribers:
                self._subscribers.remove(q)

    def broadcast(self, event_type: str, data: Dict[str, Any]):
        payload = json.dumps({"event": event_type, "timestamp": datetime.utcnow().isoformat(), "data": data})
        with self._lock:
            for q in list(self._subscribers):
                try:
                    q.put_nowait(payload)
                except asyncio.QueueFull:
                    pass
                except Exception:
                    pass

broadcaster = EventBroadcaster()

_active_job_ids = set()
_active_jobs_lock = threading.Lock()

def run_job_sync(job_id: str):
    """
    Synchronous worker execution function that can run in a background thread
    or standalone worker process.
    """
    with _active_jobs_lock:
        if job_id in _active_job_ids:
            logger.info(f"Job {job_id} is currently being processed by another worker. Skipping duplicate invocation.")
            return
        _active_job_ids.add(job_id)

    db: Session = SessionLocal()
    try:
        job = db.query(VerificationJob).filter(VerificationJob.job_id == job_id).first()
        if not job:
            logger.error(f"Job {job_id} not found in database.")
            return

        if job.status in ["Completed", "Needs Manual Review", "COMPLETED", "FLAGGED_FOR_MANUAL_REVIEW"]:
            logger.info(f"Job {job_id} is already completed. Skipping.")
            return

        # Mark Processing
        job.status = "Processing"
        job.stage = "DOCUMENT_PARSING"
        job.progress_percent = 20
        job.started_at = datetime.utcnow()
        job.attempt_count += 1
        db.commit()

        broadcaster.broadcast("JOB_STARTED", {
            "job_id": job.job_id,
            "application_id": job.application_id,
            "status": "Processing",
            "stage": job.stage,
            "progress": job.progress_percent
        })

        app = db.query(Application).filter(Application.id == job.application_id).first()
        if not app:
            raise ValueError(f"Application {job.application_id} not found.")

        # Stage 2: Compliance and cross-doc inspection
        job.stage = "COMPLIANCE_EVALUATION"
        job.progress_percent = 60
        db.commit()

        broadcaster.broadcast("JOB_PROGRESS", {
            "job_id": job.job_id,
            "application_id": job.application_id,
            "stage": job.stage,
            "progress": job.progress_percent
        })

        # Run full automated review and generate persisted report
        report = generate_and_persist_verification_report(db, app, job)

        job.stage = "COMPLETED"
        job.progress_percent = 100
        job.completed_at = datetime.utcnow()
        job.requires_human_verification = report.requires_human_verification
        job.human_verification_reasons = report.human_verification_reasons

        if report.requires_human_verification:
            job.status = "Needs Manual Review"
        else:
            job.status = "Completed"

        db.commit()

        broadcaster.broadcast("JOB_COMPLETED", {
            "job_id": job.job_id,
            "application_id": job.application_id,
            "status": job.status,
            "report_id": report.id,
            "report_number": report.report_number,
            "readiness_score": report.readiness_score,
            "risk_level": report.risk_level,
            "requires_human_verification": report.requires_human_verification
        })
        logger.info(f"Verification job {job_id} successfully finished. Status: {job.status}")

    except Exception as e:
        logger.exception(f"Error processing verification job {job_id}: {str(e)}")
        try:
            job = db.query(VerificationJob).filter(VerificationJob.job_id == job_id).first()
            if job:
                if job.attempt_count < job.max_retries:
                    job.status = "Pending"
                    job.stage = "RETRY_QUEUED"
                    job.error_message = f"Attempt {job.attempt_count} failed: {str(e)}. Will retry."
                else:
                    job.status = "Failed"
                    job.stage = "FAILED"
                    job.error_message = str(e)
                    job.error_details = traceback.format_exc()
                job.updated_at = datetime.utcnow()
                db.commit()

                broadcaster.broadcast("JOB_FAILED", {
                    "job_id": job.job_id,
                    "application_id": job.application_id,
                    "status": job.status,
                    "error": str(e)
                })
        except Exception:
            pass
    finally:
        db.close()
        with _active_jobs_lock:
            _active_job_ids.discard(job_id)

def enqueue_verification_job(
    db: Session,
    application_id: int,
    trigger_source: str = "SUBMISSION"
) -> VerificationJob:
    """
    Idempotently creates a persistent VerificationJob in MySQL and dispatches background processing.
    Ensures safe retries and prevents redundant duplicate processing.
    """
    # Check if an active job is already queued or processing
    active_job = db.query(VerificationJob).filter(
        VerificationJob.application_id == application_id,
        VerificationJob.status.in_(["Pending", "Processing", "PENDING", "PROCESSING"])
    ).first()

    if active_job:
        logger.info(f"Active verification job {active_job.job_id} already exists for application {application_id}.")
        return active_job

    # Unique idempotency key per application run
    timestamp_key = int(datetime.utcnow().timestamp())
    idempotency_key = f"app_{application_id}_{trigger_source.lower()}_{timestamp_key}"
    job_uuid = f"job-{uuid.uuid4().hex[:12]}"

    job = VerificationJob(
        job_id=job_uuid,
        application_id=application_id,
        status="Pending",
        stage="ENQUEUED",
        progress_percent=0,
        attempt_count=0,
        max_retries=3,
        idempotency_key=idempotency_key,
        trigger_source=trigger_source
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    broadcaster.broadcast("JOB_ENQUEUED", {
        "job_id": job.job_id,
        "application_id": job.application_id,
        "status": "Pending",
        "stage": "ENQUEUED"
    })

    try:
        from app.services.audit_service import log_audit_event
        log_audit_event(
            db=db,
            actor_email="system.queue@aicte.gov.in",
            actor_role="system_worker",
            action_type="VERIFICATION_JOB_INITIATED",
            application_id=application_id,
            details={
                "job_id": job.job_id,
                "trigger_source": trigger_source,
                "idempotency_key": idempotency_key
            }
        )
    except Exception:
        pass

    # Dispatch immediate processing asynchronously in a background worker thread
    # so the HTTP request returns instantly, while MySQL persistence ensures durability
    worker_thread = threading.Thread(target=run_job_sync, args=(job_uuid,), daemon=True)
    worker_thread.start()

    return job

def recover_pending_jobs():
    """
    Recovers any pending jobs or interrupted processing jobs on startup/crash restart.
    Ensures zero jobs are dropped after a backend restart.
    """
    db: Session = SessionLocal()
    try:
        # Find interrupted jobs (stuck in Processing from a sudden crash/restart) or Pending
        jobs = db.query(VerificationJob).filter(
            or_(
                VerificationJob.status.in_(["Pending", "PENDING"]),
                VerificationJob.status.in_(["Processing", "PROCESSING"])
            )
        ).all()

        recovered_count = 0
        for job in jobs:
            if job.attempt_count < job.max_retries:
                job.status = "Pending"
                job.stage = "RECOVERED_ON_STARTUP"
                job.updated_at = datetime.utcnow()
                db.commit()
                # Spawn worker
                worker_thread = threading.Thread(target=run_job_sync, args=(job.job_id,), daemon=True)
                worker_thread.start()
                recovered_count += 1
            else:
                job.status = "Failed"
                job.error_message = "Exceeded maximum retry attempts after server recovery."
                db.commit()

        if recovered_count > 0:
            logger.info(f"Database worker recovered and resumed {recovered_count} verification job(s).")
    except Exception as e:
        logger.error(f"Error during pending job recovery: {e}")
    finally:
        db.close()
