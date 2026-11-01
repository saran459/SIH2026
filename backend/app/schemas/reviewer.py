from typing import Optional
from datetime import datetime
from pydantic import BaseModel

class ReviewerCommentCreate(BaseModel):
    finding_id: Optional[int] = None
    request_type: str = "Correction"  # Correction, Clarification, General Comment
    title: str
    comment: str
    due_date: Optional[datetime] = None

class InstitutionResponseRequest(BaseModel):
    institution_response: str
    response_evidence_document_id: Optional[int] = None

class ReviewerCommentResponse(BaseModel):
    id: int
    application_id: int
    reviewer_id: int
    reviewer_name: Optional[str] = None
    finding_id: Optional[int] = None
    finding_title: Optional[str] = None
    request_type: str
    title: str
    comment: str
    due_date: Optional[datetime] = None
    status: str
    institution_response: Optional[str] = None
    response_evidence_document_id: Optional[int] = None
    responded_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class DeadlineResponse(BaseModel):
    id: int
    application_id: int
    application_number: Optional[str] = None
    institution_name: Optional[str] = None
    title: str
    deadline_type: str
    due_date: datetime
    status: str
    assigned_role: str
    completed_at: Optional[datetime] = None
    days_remaining: int = 0
    created_at: datetime

    class Config:
        from_attributes = True
