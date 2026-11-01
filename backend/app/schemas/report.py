from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel

class DashboardSummaryResponse(BaseModel):
    total_applications: int
    draft_applications: int
    under_review_applications: int
    awaiting_corrections_applications: int
    approved_applications: int
    rejected_applications: int
    overdue_actions: int
    compliance_issues_requiring_attention: int
    average_readiness_score: float

class StatusDistributionPoint(BaseModel):
    status: str
    count: int

class TrendDataPoint(BaseModel):
    month: str
    submissions: int
    approvals: int
    rejections: int

class FindingsByCategoryPoint(BaseModel):
    category: str
    count: int

class DashboardAnalyticsResponse(BaseModel):
    summary: DashboardSummaryResponse
    status_distribution: List[StatusDistributionPoint]
    status_breakdown: Optional[List[StatusDistributionPoint]] = None
    monthly_trends: List[TrendDataPoint]
    findings_by_category: List[FindingsByCategoryPoint]

class PolicyAssistantQuery(BaseModel):
    query: str
    application_id: Optional[int] = None

class PolicyAssistantResponse(BaseModel):
    query: str
    direct_answer: str
    cited_rules: List[str]
    source_reference: str
    recommended_action: str
    is_simulated: bool = False
    warning: Optional[str] = None

class RuleEvaluationMatrixItem(BaseModel):
    rule_code: str
    title: str
    category: str
    severity: str
    status: str  # Standardized: Pass, Fail, Warning, Not Applicable, Not Run
    details: Optional[str] = None
    penalty_applied: int = 0

class ApplicationComplianceMatrixRow(BaseModel):
    application_id: int
    application_number: str
    institution_id: int
    institution_name: str
    academic_year: str
    category: str
    program: str
    status: str
    readiness_score: float
    open_findings_count: int
    passed_checks_count: int
    failed_checks_count: int
    warning_checks_count: int
    not_applicable_checks_count: int
    not_run_checks_count: int
    rule_evaluations: List[RuleEvaluationMatrixItem]

class ComplianceMatrixRuleHeader(BaseModel):
    rule_code: str
    title: str
    category: str
    severity: str
    source_reference: str
    is_enabled: bool

class ComplianceMatrixSummary(BaseModel):
    total_applications: int
    total_rules: int
    total_passed_evaluations: int
    total_failed_evaluations: int
    total_warning_evaluations: int
    total_not_applicable_evaluations: int
    total_not_run_evaluations: int

class ComplianceMatrixResponse(BaseModel):
    matrix: List[ApplicationComplianceMatrixRow]
    rules: List[ComplianceMatrixRuleHeader]
    summary: ComplianceMatrixSummary
    generated_at: str

