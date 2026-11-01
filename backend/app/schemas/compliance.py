from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel

class ComplianceRuleBase(BaseModel):
    rule_code: str
    title: str
    description: str
    category: str
    severity: str = "High"
    applicable_category: str = "All"
    evaluation_method: str = "rule_engine"
    rule_version: str = "v2026.1"
    source_reference: str = "AICTE Approval Process Handbook (APH) 2026-27"
    is_enabled: bool = True
    score_penalty: int = 15

class ComplianceRuleCreate(ComplianceRuleBase):
    pass

class ComplianceRuleResponse(ComplianceRuleBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ComplianceFindingResponse(BaseModel):
    id: int
    assessment_id: Optional[int] = None
    application_id: int
    rule_id: Optional[int] = None
    rule_code: Optional[str] = None
    finding_type: str
    title: str
    description: str
    severity: str
    status: str
    expected_value: Optional[str] = None
    observed_value: Optional[str] = None
    document_id: Optional[int] = None
    document_name: Optional[str] = None
    comparison_document_id: Optional[int] = None
    comparison_document_name: Optional[str] = None
    page_number: Optional[int] = None
    evidence_excerpt: Optional[str] = None
    recommended_action: str
    resolution_notes: Optional[str] = None
    resolved_by_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class FindingResolveRequest(BaseModel):
    status: str = "Resolved"  # Resolved, Accepted with Justification
    resolution_notes: str

class ComplianceAssessmentResponse(BaseModel):
    id: int
    application_id: int
    assessed_by_user_id: Optional[int] = None
    readiness_score: float
    total_rules_evaluated: int
    passed_count: int
    failed_count: int
    needs_review_count: int
    status: str
    created_at: datetime
    findings: List[ComplianceFindingResponse] = []

    class Config:
        from_attributes = True
