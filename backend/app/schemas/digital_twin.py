from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel
from app.schemas.compliance import ComplianceFindingResponse

class CategoryScoreBreakdown(BaseModel):
    category: str
    total_checks: int
    passed_checks: int
    score_percentage: float

class FindingImpact(BaseModel):
    finding_id: int
    title: str
    severity: str
    penalty_points: int
    category: str
    resolvable: bool

class DigitalTwinResponse(BaseModel):
    application_id: int
    application_number: str
    institution_id: int
    institution_name: str
    workflow_status: str
    current_score: float
    status_label: str  # Ready for Submission, Needs Attention, High Risk
    last_assessment_date: Optional[datetime] = None
    category_breakdown: List[CategoryScoreBreakdown]
    unresolved_findings: List[ComplianceFindingResponse]
    finding_impacts: List[FindingImpact]
    overdue_actions_count: int
    upcoming_deadlines_count: int
    priority_actions: List[str]
    disclaimer: str = "Prototype application-readiness simulation model. Demonstration purposes only."

class WhatIfScenarioRequest(BaseModel):
    resolved_finding_ids: List[int] = []
    simulated_faculty_count: Optional[int] = None
    simulated_built_up_area: Optional[float] = None
    simulated_land_area: Optional[float] = None
    simulated_upload_missing_docs: bool = False
    simulated_respond_to_corrections: bool = False

class WhatIfScenarioResponse(BaseModel):
    application_id: int
    baseline_score: float
    simulated_score: float
    score_delta: float
    baseline_status: str
    simulated_status: str
    resolved_findings_count: int
    remaining_issues_count: int
    affected_findings: List[ComplianceFindingResponse]
    simulated_category_breakdown: List[CategoryScoreBreakdown]
    suggested_next_steps: List[str]
    is_simulation: bool = True
