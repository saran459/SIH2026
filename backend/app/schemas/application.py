from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel

class WorkflowEventResponse(BaseModel):
    id: int
    application_id: int
    actor_id: int
    actor_name: str
    actor_role: str
    action: str
    from_state: str
    to_state: str
    comments: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ApplicationBase(BaseModel):
    category: str = "Extension of Approval (EOA)"
    academic_year: str = "2026-27"
    level: str = "Undergraduate (UG)"
    program: str = "Engineering & Technology"
    total_faculty_declared: int = 40
    total_intake_declared: int = 600
    built_up_area_sqm: float = 12000.0
    land_area_acres: float = 7.5

class ApplicationCreate(ApplicationBase):
    institution_id: Optional[int] = None  # Inferred for institution user
    submit_immediately: Optional[bool] = False
    generate_statutory_affidavit: Optional[bool] = False

class ApplicationUpdate(BaseModel):
    category: Optional[str] = None
    academic_year: Optional[str] = None
    level: Optional[str] = None
    program: Optional[str] = None
    total_faculty_declared: Optional[int] = None
    total_intake_declared: Optional[int] = None
    built_up_area_sqm: Optional[float] = None
    land_area_acres: Optional[float] = None

class ApplicationResponse(ApplicationBase):
    id: int
    application_number: str
    institution_id: int
    institution_name: Optional[str] = None
    status: str
    created_by_user_id: int
    created_by_name: Optional[str] = None
    assigned_reviewer_id: Optional[int] = None
    assigned_reviewer_name: Optional[str] = None
    submission_date: Optional[datetime] = None
    review_start_date: Optional[datetime] = None
    decision_date: Optional[datetime] = None
    decision_reason: Optional[str] = None
    readiness_score: float = 100.0
    documents_count: int = 0
    open_findings_count: int = 0
    pending_corrections_count: int = 0
    next_deadline: Optional[datetime] = None
    verification_job_status: Optional[str] = None
    verification_stage: Optional[str] = None
    verification_progress: Optional[int] = None
    requires_human_verification: Optional[bool] = None
    has_verification_report: Optional[bool] = None
    report_id: Optional[int] = None
    report_number: Optional[str] = None
    risk_level: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class WorkflowTransitionRequest(BaseModel):
    to_status: Optional[str] = None
    to_state: Optional[str] = None
    action: Optional[str] = None  # submit, assign_reviewer, request_correction, resubmit, approve, reject, withdraw
    reviewer_id: Optional[int] = None
    comments: Optional[str] = None
    decision_reason: Optional[str] = None
