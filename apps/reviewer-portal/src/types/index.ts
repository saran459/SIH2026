export type UserRole = 'institution' | 'reviewer' | 'admin';

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  institution_id?: number;
  institution_name?: string;
  designation?: string;
  phone?: string;
  is_active: boolean;
}

export interface DemoAccount {
  role: UserRole;
  label: string;
  institution_name: string;
  email: string;
  password: string;
  description: string;
}

export interface Institution {
  id: number;
  name: string;
  aicte_permanent_id: string;
  aicte_code?: string;
  institution_type: string;
  category?: string;
  region?: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  website: string;
  contact_email: string;
  email?: string;
  contact_phone: string;
  head_of_institution_name: string;
  established_year: number;
  created_at: string;
  updated_at: string;
}

export type ApplicationStatus =
  | 'Draft'
  | 'Submitted'
  | 'Under Review'
  | 'Correction Required'
  | 'Resubmitted'
  | 'Approved'
  | 'Rejected'
  | 'Withdrawn';

export interface Application {
  id: number;
  application_number: string;
  institution_id: number;
  institution_name?: string;
  category: string;
  academic_year: string;
  level: string;
  program: string;
  programme?: string;
  application_type?: string;
  status: ApplicationStatus;
  created_by_user_id: number;
  created_by_name?: string;
  assigned_reviewer_id?: number;
  assigned_reviewer_name?: string;
  submission_date?: string;
  submitted_at?: string;
  review_start_date?: string;
  decision_date?: string;
  decision_reason?: string;
  total_faculty_declared: number;
  total_intake_declared: number;
  total_intake?: number;
  built_up_area_sqm: number;
  builtup_area_sqm?: number;
  land_area_acres: number;
  readiness_score: number;
  documents_count: number;
  open_findings_count: number;
  deficiency_count?: number;
  risk_level?: string;
  pending_corrections_count: number;
  next_deadline?: string;
  requires_human_verification?: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkflowEvent {
  id: number;
  application_id: number;
  actor_id: number;
  actor_name: string;
  actor_role: string;
  action: string;
  action_name?: string;
  from_state: string;
  to_state: string;
  comments?: string;
  created_at: string;
}

export type WorkflowTransition = WorkflowEvent;

export interface ExtractedField {
  id: number;
  document_id: number;
  field_name: string;
  extracted_value: string;
  verified_value?: string;
  confidence: number;
  page_number: number;
  is_verified: boolean;
  created_at: string;
}

export interface DocumentItem {
  id: number;
  application_id: number;
  category: string;
  document_type?: string;
  file_name: string;
  original_name: string;
  original_filename?: string;
  file_size: number;
  mime_type: string;
  file_hash: string;
  version: number;
  extraction_status: 'Uploaded' | 'Processing' | 'Extraction Complete' | 'Review Required' | 'Failed';
  verification_status?: string;
  raw_text?: string;
  page_count: number;
  uploaded_by_user_id: number;
  uploaded_by_name?: string;
  extracted_fields: ExtractedField[];
  created_at: string;
  updated_at: string;
}

export type FindingSeverity = 'Critical' | 'High' | 'Medium' | 'Low' | 'critical' | 'high' | 'medium' | 'low';
export type FindingStatus = 'Open' | 'Correction Requested' | 'Resolved' | 'Accepted with Justification' | 'Waived';

export interface ComplianceFinding {
  id: number;
  assessment_id?: number;
  application_id: number;
  rule_id?: number;
  rule_code?: string;
  rule_name?: string;
  finding_type: string;
  title: string;
  description: string;
  severity: FindingSeverity;
  status: FindingStatus;
  is_cross_document?: boolean;
  evidence_details?: string;
  expected_value?: string;
  observed_value?: string;
  document_id?: number;
  document_name?: string;
  comparison_document_id?: number;
  comparison_document_name?: string;
  page_number?: number;
  evidence_excerpt?: string;
  recommended_action: string;
  resolution_notes?: string;
  resolved_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface ComplianceRule {
  id: number;
  rule_code: string;
  name?: string;
  title: string;
  description: string;
  category: string;
  severity: FindingSeverity;
  applicable_category: string;
  evaluation_method: string;
  threshold_value?: string;
  rule_version: string;
  source_reference: string;
  is_enabled: boolean;
  is_active?: boolean;
  score_penalty: number;
  created_at: string;
  updated_at: string;
}

export interface ComplianceAssessment {
  id: number;
  application_id: number;
  assessed_by_user_id?: number;
  readiness_score: number;
  total_rules_evaluated: number;
  passed_count: number;
  failed_count: number;
  needs_review_count: number;
  status: string;
  created_at: string;
  findings: ComplianceFinding[];
}

export interface CategoryScoreBreakdown {
  category: string;
  total_checks: number;
  passed_checks: number;
  score_percentage: number;
}

export interface FindingImpact {
  finding_id: number;
  title: string;
  severity: FindingSeverity;
  penalty_points: number;
  category: string;
  resolvable: boolean;
}

export interface DigitalTwinData {
  application_id: number;
  application_number: string;
  institution_id: number;
  institution_name: string;
  workflow_status: string;
  current_score: number;
  readiness_score?: number;
  status_label: string;
  category?: string;
  total_rules_evaluated?: number;
  passed_count?: number;
  failed_count?: number;
  needs_review_count?: number;
  last_assessment_date?: string;
  category_breakdown: CategoryScoreBreakdown[];
  unresolved_findings: ComplianceFinding[];
  active_findings?: ComplianceFinding[];
  finding_impacts: FindingImpact[];
  overdue_actions_count: number;
  upcoming_deadlines_count: number;
  priority_actions: string[];
  disclaimer: string;
}

export interface WhatIfScenarioResult {
  application_id: number;
  baseline_score: number;
  simulated_score: number;
  score_delta: number;
  baseline_status: string;
  simulated_status: string;
  resolved_findings_count: number;
  remaining_issues_count: number;
  affected_findings: ComplianceFinding[];
  simulated_category_breakdown: CategoryScoreBreakdown[];
  suggested_next_steps: string[];
  is_simulation: boolean;
}

export interface ReviewerComment {
  id: number;
  application_id: number;
  reviewer_id: number;
  reviewer_name?: string;
  finding_id?: number;
  finding_title?: string;
  request_type: string;
  title: string;
  comment: string;
  due_date?: string;
  status: 'Pending Response' | 'Response Submitted' | 'Verified & Closed';
  institution_response?: string;
  response_evidence_document_id?: number;
  responded_at?: string;
  created_at: string;
  updated_at: string;
}

export interface DeadlineItem {
  id: number;
  application_id: number;
  application_number?: string;
  institution_name?: string;
  title: string;
  milestone_name?: string;
  deadline_type: string;
  due_date: string;
  deadline_date?: string;
  status: 'On Track' | 'Approaching Deadline' | 'Overdue' | 'Completed' | 'Blocked by Missing Evidence';
  assigned_role: string;
  completed_at?: string;
  days_remaining: number;
  created_at: string;
}

export interface NotificationItem {
  id: number;
  user_id?: number;
  role_target?: string;
  application_id?: number;
  title: string;
  message: string;
  category: 'Application' | 'Compliance' | 'Deadline' | 'Workflow' | 'System';
  severity: 'Info' | 'Warning' | 'Error' | 'Success';
  notification_type?: string;
  link_url?: string;
  is_read: boolean;
  created_at: string;
}

export interface DashboardSummary {
  total_applications: number;
  total_institutions?: number;
  draft_applications: number;
  draft?: number;
  submitted?: number;
  under_review_applications: number;
  under_review?: number;
  awaiting_corrections_applications: number;
  correction_required?: number;
  approved_applications: number;
  approved?: number;
  rejected_applications: number;
  rejected?: number;
  overdue_actions: number;
  compliance_issues_requiring_attention: number;
  average_readiness_score: number;
}

export interface DashboardAnalytics {
  summary: DashboardSummary;
  status_distribution: { status: string; count: number }[];
  monthly_trends: { month: string; submissions: number; approvals: number; rejections: number }[];
  findings_by_category: { category: string; count: number }[];
}

export interface AuditEventItem {
  id: number;
  event_id: string;
  actor_id?: number;
  actor_email: string;
  actor_role: string;
  action_type: string;
  action?: string;
  application_id?: number;
  details: string;
  ip_address: string;
  timestamp: string;
  created_at?: string;
  entity_type?: string;
  entity_id?: number | string;
  user_email?: string;
  previous_hash: string;
  event_hash: string;
  hash?: string;
}

export interface VerifyChainResult {
  total_events: number;
  is_valid: boolean;
  broken_link_index?: number;
  verification_message: string;
  first_event_hash?: string;
  last_event_hash?: string;
}

export interface PolicyAssistantResponse {
  query: string;
  direct_answer: string;
  cited_rules: string[];
  source_reference: string;
  recommended_action: string;
  is_simulated: boolean;
  warning?: string;
}

export type CheckOutcome = 'Pass' | 'Fail' | 'Warning' | 'Not Applicable' | 'Not Run';
export type JobState = 'Pending' | 'Processing' | 'Completed' | 'Needs Manual Review' | 'Failed';

export interface VerificationJob {
  id: number;
  job_id: string;
  application_id: number;
  application_number?: string;
  institution_name?: string;
  status: JobState | string;
  stage: string;
  progress_percent: number;
  attempt_count: number;
  max_retries: number;
  error_message?: string;
  requires_human_verification: boolean;
  human_verification_reasons?: string[];
  trigger_source: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ApplicationReportListItem {
  id: number;
  report_number: string;
  application_id: number;
  application_number?: string;
  institution_id: number;
  institution_name?: string;
  status: string;
  readiness_score: number;
  risk_level: string;
  summary: string;
  documents_processed_count: number;
  passed_checks_count: number;
  failed_checks_count: number;
  warning_checks_count: number;
  requires_human_verification: boolean;
  human_verification_reasons?: string[];
  audit_event_hash?: string;
  created_at: string;
  updated_at: string;
}

export interface ApplicationReportDetail extends ApplicationReportListItem {
  score_explanation: string;
  report_data: {
    report_metadata?: any;
    application_details?: any;
    institution_details?: any;
    documents_processed?: any[];
    missing_mandatory_categories?: string[];
    expired_documents?: any[];
    document_integrity_and_tampering_checks?: any[];
    image_tampering_analysis?: any[];
    simulated_external_verifications?: any[];
    ai_modules_execution_status?: any[];
    compliance_checklist?: any[];
    detailed_findings?: any[];
    score_explanation?: string;
    human_verification_reasons?: string[];
    regulatory_disclaimer?: string;
  };
}

export interface ReviewerLiveStatus {
  pending?: number;
  processing: number;
  completed: number;
  needs_manual_review?: number;
  flagged_for_manual_review: number;
  failed?: number;
  processing_failed: number;
  ready_for_reviewer_decision: number;
  total_active_queue: number;
  recent_jobs: VerificationJob[];
}

export interface RuleEvaluationMatrixItem {
  rule_code: string;
  title: string;
  category: string;
  severity: string;
  status: CheckOutcome;
  details?: string;
  penalty_applied: number;
}

export interface ApplicationComplianceMatrixRow {
  application_id: number;
  application_number: string;
  institution_id: number;
  institution_name: string;
  academic_year: string;
  category: string;
  program: string;
  status: string;
  readiness_score: number;
  open_findings_count: number;
  passed_checks_count: number;
  failed_checks_count: number;
  warning_checks_count: number;
  not_applicable_checks_count: number;
  not_run_checks_count: number;
  rule_evaluations: RuleEvaluationMatrixItem[];
}

export interface ComplianceMatrixRuleHeader {
  rule_code: string;
  title: string;
  category: string;
  severity: string;
  source_reference: string;
  is_enabled: boolean;
}

export interface ComplianceMatrixSummary {
  total_applications: number;
  total_rules: number;
  total_passed_evaluations: number;
  total_failed_evaluations: number;
  total_warning_evaluations: number;
  total_not_applicable_evaluations: number;
  total_not_run_evaluations: number;
}

export interface ComplianceMatrixResponse {
  matrix: ApplicationComplianceMatrixRow[];
  rules: ComplianceMatrixRuleHeader[];
  summary: ComplianceMatrixSummary;
  generated_at: string;
}
