from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class VerificationJobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    job_id: str
    application_id: int
    application_number: Optional[str] = None
    institution_name: Optional[str] = None
    status: str
    stage: str
    progress_percent: int
    attempt_count: int
    max_retries: int
    error_message: Optional[str] = None
    requires_human_verification: bool = False
    human_verification_reasons: Optional[List[str]] = None
    trigger_source: str = "SUBMISSION"
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

class ApplicationReportListItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    report_number: str
    application_id: int
    application_number: Optional[str] = None
    institution_id: int
    institution_name: Optional[str] = None
    status: str
    readiness_score: float
    risk_level: str
    summary: str
    documents_processed_count: int
    passed_checks_count: int
    failed_checks_count: int
    warning_checks_count: int
    requires_human_verification: bool
    human_verification_reasons: Optional[List[str]] = None
    audit_event_hash: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class ApplicationReportDetailResponse(ApplicationReportListItemResponse):
    score_explanation: str
    report_data: Dict[str, Any]

class ReviewerLiveStatusResponse(BaseModel):
    pending: int = 0
    processing: int
    completed: int
    needs_manual_review: int = 0
    failed: int = 0
    # Backward-compatible fields
    flagged_for_manual_review: int = 0
    processing_failed: int = 0
    ready_for_reviewer_decision: int
    total_active_queue: int
    recent_jobs: List[VerificationJobResponse] = []
