from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel

class ExtractedFieldResponse(BaseModel):
    id: int
    document_id: int
    field_name: str
    extracted_value: str
    verified_value: Optional[str] = None
    confidence: float
    page_number: int
    is_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True

class ExtractedFieldUpdate(BaseModel):
    verified_value: str
    is_verified: bool = True

class DocumentResponse(BaseModel):
    id: int
    application_id: int
    category: str
    file_name: str
    original_name: str
    file_size: int
    mime_type: str
    file_hash: str
    version: int
    extraction_status: str
    raw_text: Optional[str] = None
    page_count: int
    uploaded_by_user_id: int
    uploaded_by_name: Optional[str] = None
    extracted_fields: List[ExtractedFieldResponse] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class DocumentVerificationResult(BaseModel):
    document_id: int
    status: str
    extracted_fields_count: int
    findings_generated: int
    message: str
