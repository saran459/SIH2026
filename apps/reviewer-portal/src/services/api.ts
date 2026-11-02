import {
  User,
  DemoAccount,
  Institution,
  Application,
  WorkflowEvent,
  DocumentItem,
  ExtractedField,
  ComplianceFinding,
  ComplianceRule,
  ComplianceAssessment,
  DigitalTwinData,
  WhatIfScenarioResult,
  ReviewerComment,
  DeadlineItem,
  NotificationItem,
  DashboardSummary,
  DashboardAnalytics,
  AuditEventItem,
  VerifyChainResult,
  PolicyAssistantResponse,
  VerificationJob,
  ApplicationReportListItem,
  ApplicationReportDetail,
  ReviewerLiveStatus,
  ComplianceMatrixResponse
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://aicte-backend-9fbb.onrender.com/api';

function getHeaders(isFormData: boolean = false): HeadersInit {
  const token = localStorage.getItem('aicte_token');
  const headers: Record<string, string> = {};
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorMsg = `Request failed (${res.status})`;
    try {
      const errData = await res.json();
      if (errData.detail) {
        errorMsg = typeof errData.detail === 'string' ? errData.detail : JSON.stringify(errData.detail);
      }
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }
  return res.json();
}

export const api = {
  // Auth
  async login(email: string, password: string, portal?: string): Promise<{ access_token: string; role: string; email: string; full_name: string; institution_id?: number; institution_name?: string }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, portal })
    });
    return handleResponse(res);
  },


  async register(data: any): Promise<{ status: string; message: string; user_id: number; email: string; full_name: string; role: string; institution_id?: number; institution_name?: string }> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async getPublicInstitutions(): Promise<Array<{ id: number; name: string; aicte_permanent_id: string; city: string; state: string }>> {
    const res = await fetch(`${API_BASE}/auth/institutions`);
    return handleResponse(res);
  },
  async getMe(): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async logout(): Promise<void> {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: getHeaders()
      });
    } finally {
      localStorage.removeItem('aicte_token');
      localStorage.removeItem('aicte_user');
    }
  },

  async getDemoAccounts(): Promise<DemoAccount[]> {
    const res = await fetch(`${API_BASE}/auth/demo-accounts`);
    return handleResponse(res);
  },

  // Dashboard
  async getDashboardSummary(): Promise<DashboardSummary> {
    const res = await fetch(`${API_BASE}/dashboard/summary`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async getDashboardAnalytics(): Promise<DashboardAnalytics> {
    const res = await fetch(`${API_BASE}/dashboard/analytics`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Institutions

  async searchInstitutions(params: {
    q: string;
    page?: number;
    limit?: number;
    district?: string;
    state?: string;
    institution_type?: string;
  }): Promise<{
    items: Array<{
      id: number;
      name: string;
      aicte_permanent_id: string;
      institution_type: string;
      address: string;
      district: string;
      city: string;
      state: string;
      women_institution?: string;
      minority_institution?: string;
    }>;
    total: number;
    page: number;
    limit: number;
    has_more: boolean;
  }> {
    const qp = new URLSearchParams();
    if (params.q) qp.append('q', params.q);
    if (params.page) qp.append('page', String(params.page));
    if (params.limit) qp.append('limit', String(params.limit));
    if (params.district) qp.append('district', params.district);
    if (params.state) qp.append('state', params.state);
    if (params.institution_type) qp.append('institution_type', params.institution_type);
    const res = await fetch(`${API_BASE}/institutions/search?${qp.toString()}`);
    return handleResponse(res);
  },

  async createManualInstitution(data: {
    name: string;
    aicte_permanent_id?: string;
    institution_type?: string;
    district?: string;
    city?: string;
    state?: string;
    address?: string;
    pincode?: string;
  }): Promise<Institution> {
    const res = await fetch(`${API_BASE}/institutions/manual`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async getInstitutions(search?: string): Promise<Institution[]> {
    const url = search ? `${API_BASE}/institutions?search=${encodeURIComponent(search)}` : `${API_BASE}/institutions`;
    const res = await fetch(url, { headers: getHeaders() });
    return handleResponse(res);
  },

  async getInstitution(id: number): Promise<Institution> {
    const res = await fetch(`${API_BASE}/institutions/${id}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  // Applications
  async getApplications(params?: { status?: string; search?: string; academic_year?: string; category?: string }): Promise<Application[]> {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.search) query.append('search', params.search);
    if (params?.academic_year) query.append('academic_year', params.academic_year);
    if (params?.category) query.append('category', params.category);

    const res = await fetch(`${API_BASE}/applications?${query.toString()}`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async getApplication(id: number): Promise<Application> {
    const res = await fetch(`${API_BASE}/applications/${id}`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async createApplication(data: Partial<Application>): Promise<Application> {
    const res = await fetch(`${API_BASE}/applications`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async updateApplication(id: number, data: Partial<Application>): Promise<Application> {
    const res = await fetch(`${API_BASE}/applications/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async submitApplication(id: number): Promise<Application> {
    const res = await fetch(`${API_BASE}/applications/${id}/submit`, {
      method: 'POST',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async assignReviewer(id: number, reviewerId: number): Promise<Application> {
    const res = await fetch(`${API_BASE}/applications/${id}/assign-reviewer?reviewer_id=${reviewerId}`, {
      method: 'POST',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async requestCorrection(id: number, data: { title: string; comment: string; finding_id?: number; due_date?: string }): Promise<Application> {
    const res = await fetch(`${API_BASE}/applications/${id}/request-correction`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async resubmitApplication(id: number, comments?: string): Promise<Application> {
    const url = comments ? `${API_BASE}/applications/${id}/resubmit?comments=${encodeURIComponent(comments)}` : `${API_BASE}/applications/${id}/resubmit`;
    const res = await fetch(url, {
      method: 'POST',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async approveApplication(id: number, decision_reason: string): Promise<Application> {
    const cleanReason = decision_reason?.trim() || 'Approved after scrutiny verification.';
    const res = await fetch(`${API_BASE}/applications/${id}/approve?decision_reason=${encodeURIComponent(cleanReason)}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ decision_reason: cleanReason, reason: cleanReason })
    });
    return handleResponse(res);
  },

  async rejectApplication(id: number, decision_reason: string): Promise<Application> {
    const cleanReason = decision_reason?.trim() || 'Statutory document deficiencies not rectified per AICTE norms.';
    const res = await fetch(`${API_BASE}/applications/${id}/reject?decision_reason=${encodeURIComponent(cleanReason)}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ decision_reason: cleanReason, reason: cleanReason })
    });
    return handleResponse(res);
  },

  async deleteApplication(id: number): Promise<{ status: string; message: string }> {
    const res = await fetch(`${API_BASE}/applications/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async withdrawApplication(id: number, reason: string): Promise<Application> {
    const res = await fetch(`${API_BASE}/applications/${id}/withdraw?reason=${encodeURIComponent(reason)}`, {
      method: 'POST',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async getWorkflowHistory(id: number): Promise<WorkflowEvent[]> {
    const res = await fetch(`${API_BASE}/applications/${id}/workflow-history`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async getReviewerComments(id: number): Promise<ReviewerComment[]> {
    const res = await fetch(`${API_BASE}/applications/${id}/comments`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async respondToComment(commentId: number, data: { institution_response: string; response_evidence_document_id?: number }): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/applications/comments/${commentId}/respond`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  // Documents
  async getDocuments(applicationId: number): Promise<DocumentItem[]> {
    const res = await fetch(`${API_BASE}/applications/${applicationId}/documents`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async uploadDocument(applicationId: number, file: File, category: string): Promise<DocumentItem> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);

    const res = await fetch(`${API_BASE}/applications/${applicationId}/documents`, {
      method: 'POST',
      headers: getHeaders(true),
      body: formData
    });
    return handleResponse(res);
  },

  async getDocument(id: number): Promise<DocumentItem> {
    const res = await fetch(`${API_BASE}/documents/${id}`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async reprocessDocument(id: number): Promise<DocumentItem> {
    const res = await fetch(`${API_BASE}/documents/${id}/process`, {
      method: 'POST',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async updateExtractedField(documentId: number, fieldId: number, verified_value: string): Promise<ExtractedField> {
    const res = await fetch(`${API_BASE}/documents/${documentId}/fields/${fieldId}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ verified_value, is_verified: true })
    });
    return handleResponse(res);
  },

  getArtifactUrl(urlOrPath: string): string {
    if (!urlOrPath) return '';
    if (urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://')) return urlOrPath;
    const baseOrigin = API_BASE.replace(/\/api\/?$/, '');
    const cleanPath = urlOrPath.startsWith('/') ? urlOrPath : `/${urlOrPath}`;
    return `${baseOrigin}${cleanPath}`;
  },

  getDocumentDownloadUrl(id: number): string {
    return `${API_BASE}/documents/${id}/download`;
  },

  async verifyField(fieldId: number, verified_value: string, documentId?: number): Promise<any> {
    const docId = documentId || 1;
    const res = await fetch(`${API_BASE}/documents/${docId}/fields/${fieldId}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ verified_value, is_verified: true })
    });
    return handleResponse(res);
  },

  // Compliance
  async getComplianceRules(category?: string): Promise<ComplianceRule[]> {
    const url = category ? `${API_BASE}/compliance/rules?category=${encodeURIComponent(category)}` : `${API_BASE}/compliance/rules`;
    const res = await fetch(url, { headers: getHeaders() });
    return handleResponse(res);
  },

  async runCompliance(applicationId: number): Promise<ComplianceAssessment> {
    const res = await fetch(`${API_BASE}/applications/${applicationId}/compliance/run`, {
      method: 'POST',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async getCompliance(applicationId: number): Promise<ComplianceAssessment> {
    const res = await fetch(`${API_BASE}/applications/${applicationId}/compliance`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async resolveFinding(findingId: number, data: { status: string; resolution_notes: string }): Promise<ComplianceFinding> {
    const res = await fetch(`${API_BASE}/findings/${findingId}/resolve`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  // Digital Twin
  async getDigitalTwin(applicationId: number): Promise<DigitalTwinData> {
    const res = await fetch(`${API_BASE}/applications/${applicationId}/digital-twin`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async assessDigitalTwin(applicationId: number): Promise<DigitalTwinData> {
    const res = await fetch(`${API_BASE}/applications/${applicationId}/digital-twin/assess`, {
      method: 'POST',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async simulateWhatIf(
    applicationId: number,
    scenario: {
      resolved_finding_ids?: number[];
      simulated_faculty_count?: number;
      simulated_built_up_area?: number;
      simulated_land_area?: number;
      simulated_upload_missing_docs?: boolean;
      simulated_respond_to_corrections?: boolean;
    }
  ): Promise<WhatIfScenarioResult> {
    const res = await fetch(`${API_BASE}/applications/${applicationId}/digital-twin/simulate`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(scenario)
    });
    return handleResponse(res);
  },

  // Deadlines & Notifications
  async getDeadlines(statusFilter?: string): Promise<DeadlineItem[]> {
    const url = statusFilter ? `${API_BASE}/deadlines?status=${encodeURIComponent(statusFilter)}` : `${API_BASE}/deadlines`;
    const res = await fetch(url, { headers: getHeaders() });
    return handleResponse(res);
  },

  async getNotifications(unreadOnly: boolean = false): Promise<NotificationItem[]> {
    const url = unreadOnly ? `${API_BASE}/notifications?unread_only=true` : `${API_BASE}/notifications`;
    const res = await fetch(url, { headers: getHeaders() });
    return handleResponse(res);
  },

  async markNotificationRead(id: number): Promise<NotificationItem> {
    const res = await fetch(`${API_BASE}/notifications/${id}/read`, {
      method: 'PATCH',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async markAllNotificationsRead(): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/notifications/read-all`, {
      method: 'POST',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Reports
  async getReviewerWorkload(): Promise<any> {
    const res = await fetch(`${API_BASE}/reports/reviewer-workload`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async getVerificationReports(params?: { status?: string; risk_level?: string; search?: string; application_id?: number }): Promise<ApplicationReportListItem[]> {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.risk_level) query.append('risk_level', params.risk_level);
    if (params?.search) query.append('search', params.search);
    if (params?.application_id) query.append('application_id', String(params.application_id));
    const url = `${API_BASE}/reports/verification?${query.toString()}`;
    const res = await fetch(url, { headers: getHeaders() });
    return handleResponse(res);
  },

  async getVerificationReportById(id: number): Promise<ApplicationReportDetail> {
    const res = await fetch(`${API_BASE}/reports/verification/${id}`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async getApplicationVerificationReport(applicationId: number): Promise<ApplicationReportDetail> {
    const res = await fetch(`${API_BASE}/reports/application/${applicationId}`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },


  async getComplianceMatrix(params?: { application_id?: number; academic_year?: string; status?: string }): Promise<ComplianceMatrixResponse> {
    const query = new URLSearchParams();
    if (params?.application_id) query.append('application_id', params.application_id.toString());
    if (params?.academic_year) query.append('academic_year', params.academic_year);
    if (params?.status) query.append('status', params.status);
    const qs = query.toString();
    const url = qs ? `${API_BASE}/reports/compliance-matrix?${qs}` : `${API_BASE}/reports/compliance-matrix`;
    const res = await fetch(url, { headers: getHeaders() });
    return handleResponse(res);
  },

  // Automated Verification Jobs & Live Dashboard
  async getReviewerLiveStatus(): Promise<ReviewerLiveStatus> {
    const res = await fetch(`${API_BASE}/dashboard/reviewer-live-status`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async getVerificationJobs(statusFilter?: string): Promise<VerificationJob[]> {
    const url = statusFilter ? `${API_BASE}/verification-jobs?status=${encodeURIComponent(statusFilter)}` : `${API_BASE}/verification-jobs`;
    const res = await fetch(url, { headers: getHeaders() });
    return handleResponse(res);
  },

  async retryVerificationJob(jobId: string): Promise<VerificationJob> {
    const res = await fetch(`${API_BASE}/verification-jobs/${jobId}/retry`, {
      method: 'POST',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async triggerVerification(applicationId: number): Promise<Application> {
    const res = await fetch(`${API_BASE}/applications/${applicationId}/trigger-verification`, {
      method: 'POST',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  getReviewerStreamUrl(): string {
    const token = localStorage.getItem('aicte_token');
    return token ? `${API_BASE}/events/reviewer-stream?token=${encodeURIComponent(token)}` : `${API_BASE}/events/reviewer-stream`;
  },

  getApplicationsCsvUrl(): string {
    return `${API_BASE}/reports/applications/csv`;
  },

  getComplianceCsvUrl(): string {
    return `${API_BASE}/reports/compliance/csv`;
  },

  // Audit
  async getAuditEvents(limit: number = 50): Promise<AuditEventItem[]> {
    const res = await fetch(`${API_BASE}/audit-events?limit=${limit}`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async verifyAuditChain(): Promise<VerifyChainResult> {
    const res = await fetch(`${API_BASE}/audit-events/verify-chain`, {
      method: 'POST',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Policy Assistant
  async askPolicyAssistant(query: string, applicationId?: number): Promise<PolicyAssistantResponse> {
    const res = await fetch(`${API_BASE}/policy-assistant/ask`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ query, application_id: applicationId })
    });
    return handleResponse(res);
  },

  // Users & Admin Management
  async getUsers(params?: { role?: string; search?: string; is_active?: boolean }): Promise<User[]> {
    const query = new URLSearchParams();
    if (params?.role) query.append('role', params.role);
    if (params?.search) query.append('search', params.search);
    if (params?.is_active !== undefined) query.append('is_active', String(params.is_active));
    const res = await fetch(`${API_BASE}/users?${query.toString()}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  async getReviewers(): Promise<User[]> {
    const res = await fetch(`${API_BASE}/users/reviewers`, { headers: getHeaders() });
    return handleResponse(res);
  },

  async createUser(data: { email: string; password: string; full_name: string; role: string; institution_id?: number; designation?: string; phone?: string }): Promise<User> {
    const res = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async updateUser(id: number, data: Partial<User & { password?: string }>): Promise<User> {
    const res = await fetch(`${API_BASE}/users/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async createInstitution(data: Partial<Institution>): Promise<Institution> {
    const res = await fetch(`${API_BASE}/institutions`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async updateInstitution(id: number, data: Partial<Institution>): Promise<Institution> {
    const res = await fetch(`${API_BASE}/institutions/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async createComplianceRule(data: Partial<ComplianceRule>): Promise<ComplianceRule> {
    const res = await fetch(`${API_BASE}/compliance/rules`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async addReviewerComment(applicationId: number, comment: string, title?: string): Promise<ReviewerComment> {
    const res = await fetch(`${API_BASE}/applications/${applicationId}/comments`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ comment, title: title || 'Scrutiny Note', request_type: 'Clarification' })
    });
    return handleResponse(res);
  },


  async deleteAllApplications(): Promise<{ status: string; message: string }> {
    const res = await fetch(`${API_BASE}/applications`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async deleteDocument(id: number): Promise<{ status: string; message: string }> {
    const res = await fetch(`${API_BASE}/documents/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async deleteAllDocuments(applicationId?: number): Promise<{ status: string; message: string }> {
    const url = applicationId ? `${API_BASE}/documents?application_id=${applicationId}` : `${API_BASE}/documents`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async deleteNotification(id: number): Promise<{ status: string; message: string }> {
    const res = await fetch(`${API_BASE}/notifications/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async deleteAllNotifications(): Promise<{ status: string; message: string }> {
    const res = await fetch(`${API_BASE}/notifications`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async deleteDeadline(id: number): Promise<{ status: string; message: string }> {
    const res = await fetch(`${API_BASE}/deadlines/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async deleteAllDeadlines(): Promise<{ status: string; message: string }> {
    const res = await fetch(`${API_BASE}/deadlines`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async deleteReport(id: number): Promise<{ status: string; message: string }> {
    const res = await fetch(`${API_BASE}/reports/verification/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async deleteAllReports(): Promise<{ status: string; message: string }> {
    const res = await fetch(`${API_BASE}/reports/verification`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async deleteFinding(id: number): Promise<{ status: string; message: string }> {
    const res = await fetch(`${API_BASE}/compliance/findings/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async deleteAllFindings(applicationId?: number): Promise<{ status: string; message: string }> {
    const url = applicationId ? `${API_BASE}/compliance/findings?application_id=${applicationId}` : `${API_BASE}/compliance/findings`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async clearAuditEvents(): Promise<{ status: string; message: string }> {
    const res = await fetch(`${API_BASE}/audit-events`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async clearScrutinyData(): Promise<{ status: string; message: string }> {
    const res = await fetch(`${API_BASE}/dashboard/clear-scrutiny-data`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  }

};
