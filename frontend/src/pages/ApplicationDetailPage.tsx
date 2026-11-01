import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import {
  Application,
  DocumentItem,
  ComplianceFinding,
  WorkflowEvent,
  ReviewerComment,
  ComplianceAssessment
} from '../types';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { SeverityBadge } from '../components/common/SeverityBadge';
import { ScoreGauge } from '../components/common/ScoreGauge';
import { WorkflowTimeline } from '../components/applications/WorkflowTimeline';
import { ActionDialog } from '../components/applications/ActionDialog';
import { FileUploadZone } from '../components/documents/FileUploadZone';
import { DocumentCard } from '../components/documents/DocumentCard';
import { ExtractedFieldsTable } from '../components/documents/ExtractedFieldsTable';
import {
  FileText,
  Building2,
  Calendar,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  Cpu,
  ShieldCheck,
  MessageSquare,
  History,
  Send,
  ExternalLink,
  ChevronLeft
} from 'lucide-react';

export const ApplicationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useNotifications();

  const appId = Number(id);

  const [application, setApplication] = useState<Application | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [compliance, setCompliance] = useState<ComplianceAssessment | null>(null);
  const [workflowHistory, setWorkflowHistory] = useState<WorkflowEvent[]>([]);
  const [comments, setComments] = useState<ReviewerComment[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'compliance' | 'workflow' | 'comments'>('overview');

  // Dialog controls
  const [actionDialogType, setActionDialogType] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Comment response input
  const [respondingCommentId, setRespondingCommentId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    if (appId) {
      loadApplicationData();
    }
  }, [appId]);

  const loadApplicationData = async () => {
    setLoading(true);
    try {
      const [appData, docsData, compData, wfData, commData] = await Promise.all([
        api.getApplication(appId),
        api.getDocuments(appId),
        api.getCompliance(appId),
        api.getWorkflowHistory(appId),
        api.getReviewerComments(appId)
      ]);
      setApplication(appData);
      setDocuments(docsData);
      setCompliance(compData);
      setWorkflowHistory(wfData);
      setComments(commData);
    } catch (e: any) {
      showToast('error', 'Failed to load application', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadDocument = async (file: File, category: string) => {
    try {
      await api.uploadDocument(appId, file, category);
      showToast('success', 'Document Uploaded', `${file.name} saved and text extracted.`);
      loadApplicationData();
    } catch (e: any) {
      showToast('error', 'Upload Failed', e.message);
    }
  };

  const handleRunCompliance = async () => {
    try {
      const res = await api.runCompliance(appId);
      setCompliance(res);
      showToast('success', 'Compliance Check Completed', `Readiness Score: ${res.readiness_score}%`);
      loadApplicationData();
    } catch (e: any) {
      showToast('error', 'Compliance Run Failed', e.message);
    }
  };

  const handleActionConfirm = async (payload: { reason?: string; title?: string; comment?: string }) => {
    setActionLoading(true);
    try {
      if (actionDialogType === 'submit') {
        await api.submitApplication(appId);
        showToast('success', 'Application Submitted', 'Your dossier is now in the official AICTE review queue.');
      } else if (actionDialogType === 'request_correction') {
        await api.requestCorrection(appId, {
          title: payload.title || 'Correction Notice',
          comment: payload.comment || 'Please update statutory documents.'
        });
        showToast('warning', 'Correction Notice Issued', 'Institution representative notified.');
      } else if (actionDialogType === 'resubmit') {
        await api.resubmitApplication(appId, payload.reason);
        showToast('success', 'Application Resubmitted', 'Corrections recorded and returned to reviewer.');
      } else if (actionDialogType === 'approve') {
        await api.approveApplication(appId, payload.reason || 'Approved by committee');
        showToast('success', 'Application Approved', 'Official Approval Order recorded.');
      } else if (actionDialogType === 'reject') {
        await api.rejectApplication(appId, payload.reason || 'Rejected due to deficiencies');
        showToast('error', 'Application Rejected', 'Rejection order recorded.');
      } else if (actionDialogType === 'withdraw') {
        await api.withdrawApplication(appId, payload.reason || 'Withdrawn by applicant');
        showToast('info', 'Application Withdrawn', 'Dossier moved to Withdrawn status.');
      }
      setActionDialogType(null);
      loadApplicationData();
    } catch (e: any) {
      showToast('error', 'Workflow Action Failed', e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendCommentReply = async (commentId: number) => {
    if (!replyText.trim()) return;
    try {
      await api.respondToComment(commentId, { institution_response: replyText });
      showToast('success', 'Reply Recorded', 'Your explanation has been submitted to the reviewer.');
      setRespondingCommentId(null);
      setReplyText('');
      loadApplicationData();
    } catch (e: any) {
      showToast('error', 'Failed to submit response', e.message);
    }
  };

  if (loading || !application) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isInstitution = user?.role === 'institution';
  const isReviewerOrAdmin = user?.role === 'reviewer' || user?.role === 'admin';

  return (
    <div className="space-y-6">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/applications')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Applications</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/digital-twin')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors"
          >
            <Cpu className="w-4 h-4" />
            <span>Digital Twin Simulator</span>
          </button>
        </div>
      </div>

      {/* Main Dossier Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 lg:p-8 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="font-mono text-xs font-extrabold text-blue-700 bg-blue-50 px-3 py-1 rounded-xl border border-blue-200">
              {application.application_number}
            </span>
            <StatusBadge status={application.status} size="md" />
            <span className="text-xs text-slate-400">• AY {application.academic_year}</span>
          </div>

          <h2 className="text-xl font-extrabold text-slate-900">
            {application.institution_name}
          </h2>

          <div className="flex items-center gap-4 text-xs text-slate-600 flex-wrap">
            <span className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-slate-400" />
              {application.program} ({application.level})
            </span>
            <span>•</span>
            <span>{application.category}</span>
            <span>•</span>
            <span>
              Reviewer:{' '}
              <strong className="text-slate-800">
                {application.assigned_reviewer_name || 'Unassigned'}
              </strong>
            </span>
          </div>
        </div>

        {/* Action Controls based on Role & Status */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-center gap-3">
            <ScoreGauge score={application.readiness_score} size="md" />
          </div>

          <div className="flex flex-col gap-2">
            {/* Institution Actions */}
            {isInstitution && application.status === 'Draft' && (
              <button
                onClick={() => setActionDialogType('submit')}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
              >
                Submit Application
              </button>
            )}

            {isInstitution && application.status === 'Correction Required' && (
              <button
                onClick={() => setActionDialogType('resubmit')}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white shadow-xs transition-colors"
              >
                Resubmit Corrections
              </button>
            )}

            {/* Reviewer Actions */}
            {isReviewerOrAdmin && application.status === 'Under Review' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActionDialogType('request_correction')}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 transition-colors"
                >
                  Request Correction
                </button>
                <button
                  onClick={() => setActionDialogType('reject')}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-300 hover:bg-rose-100 transition-colors"
                >
                  Reject
                </button>
                <button
                  onClick={() => setActionDialogType('approve')}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
                >
                  Approve EOA
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        {[
          { key: 'overview', label: 'Overview & Metrics', icon: <Building2 className="w-4 h-4" /> },
          { key: 'documents', label: `Documents (${documents.length})`, icon: <FileText className="w-4 h-4" /> },
          { key: 'compliance', label: `Compliance (${compliance?.findings?.length || 0})`, icon: <ShieldCheck className="w-4 h-4" /> },
          { key: 'workflow', label: 'Workflow Progress', icon: <History className="w-4 h-4" /> },
          { key: 'comments', label: `Scrutiny Queries (${comments.length})`, icon: <MessageSquare className="w-4 h-4" /> }
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === t.key
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
                Teaching Faculty
              </span>
              <span className="text-xl font-extrabold text-slate-900">
                {application.total_faculty_declared} Members
              </span>
              <span className="block text-[11px] text-emerald-700 font-semibold mt-1">
                1:15 Norm Target Satisfied
              </span>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
                Sanctioned Intake
              </span>
              <span className="text-xl font-extrabold text-slate-900">
                {application.total_intake_declared} Seats
              </span>
              <span className="block text-[11px] text-slate-500 mt-1">AY 2026-27 Enrollment</span>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
                Covered Built-up Area
              </span>
              <span className="text-xl font-extrabold text-slate-900">
                {application.built_up_area_sqm.toLocaleString()} sqm
              </span>
              <span className="block text-[11px] text-slate-500 mt-1">Instructional + Admin</span>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
                Contiguous Land Holding
              </span>
              <span className="text-xl font-extrabold text-slate-900">
                {application.land_area_acres} Acres
              </span>
              <span className="block text-[11px] text-emerald-700 font-semibold mt-1">
                Clear Freehold Mutation
              </span>
            </div>
          </div>

          {/* Workflow Timeline overview */}
          <WorkflowTimeline currentStatus={application.status} events={workflowHistory} />
        </div>
      )}

      {/* Tab 2: Supporting Documents */}
      {activeTab === 'documents' && (
        <div className="space-y-6">
          <FileUploadZone onUpload={handleUploadDocument} />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {documents.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                onPreview={() => window.open(`/api/documents/${doc.id}/preview`, '_blank')}
                onReprocess={() => api.reprocessDocument(doc.id).then(loadApplicationData)}
              />
            ))}
          </div>

          {/* Extracted Fields Table for all documents */}
          {documents.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
              <h4 className="text-sm font-bold text-slate-900 mb-4">
                Structured Field Extraction Ledger (AI-Assisted Parsing)
              </h4>
              <ExtractedFieldsTable
                fields={documents.flatMap((d) => d.extracted_fields || [])}
                onVerifyField={async (fieldId, val) => {
                  const doc = documents.find((d) => d.extracted_fields?.some((ef) => ef.id === fieldId));
                  if (doc) {
                    await api.updateExtractedField(doc.id, fieldId, val);
                    showToast('success', 'Field Verified', 'Statutory field value confirmed.');
                    loadApplicationData();
                  }
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Statutory Compliance */}
      {activeTab === 'compliance' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-slate-900">Statutory Compliance Assessment</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Evaluated against AICTE Approval Process Handbook (APH) 2026-27 statutory rules
              </p>
            </div>
            <button
              onClick={handleRunCompliance}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Re-run Compliance Engine</span>
            </button>
          </div>

          <div className="space-y-3">
            {compliance?.findings?.map((f) => (
              <div
                key={f.id}
                className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs text-xs space-y-2.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{f.title}</span>
                      <SeverityBadge severity={f.severity} />
                    </div>
                    <span className="text-[11px] text-slate-400 mt-0.5 block">{f.finding_type}</span>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      f.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {f.status}
                  </span>
                </div>

                <p className="text-slate-700 leading-relaxed">{f.description}</p>

                {f.evidence_excerpt && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-600 font-mono text-[11px]">
                    <strong>Evidence:</strong> {f.evidence_excerpt}
                  </div>
                )}

                <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 text-blue-900 text-[11px]">
                  <strong>Recommended Next Step:</strong> {f.recommended_action}
                </div>

                {f.status !== 'Resolved' && (
                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={async () => {
                        const note = prompt('Enter resolution notes / explanation:');
                        if (note) {
                          await api.resolveFinding(f.id, { status: 'Resolved', resolution_notes: note });
                          showToast('success', 'Finding Resolved', 'Compliance state updated.');
                          loadApplicationData();
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs"
                    >
                      Mark Resolved
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Workflow Progress */}
      {activeTab === 'workflow' && (
        <WorkflowTimeline currentStatus={application.status} events={workflowHistory} />
      )}

      {/* Tab 5: Reviewer Scrutiny Queries */}
      {activeTab === 'comments' && (
        <div className="space-y-4">
          {comments.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-xs text-slate-400">
              Zero scrutiny queries issued by AICTE Reviewer for this application.
            </div>
          ) : (
            comments.map((comm) => (
              <div
                key={comm.id}
                className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs text-xs space-y-3"
              >
                <div className="flex items-center justify-between border-b border-slate-150 pb-3">
                  <div>
                    <span className="font-bold text-slate-900 text-sm">{comm.title}</span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      Issued by {comm.reviewer_name} • Due:{' '}
                      {comm.due_date ? new Date(comm.due_date).toLocaleDateString() : 'Immediate'}
                    </span>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      comm.status === 'Response Submitted'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {comm.status}
                  </span>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 italic leading-relaxed">
                  "{comm.comment}"
                </div>

                {comm.institution_response ? (
                  <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 space-y-1">
                    <span className="font-bold text-xs">Institution Official Clarification:</span>
                    <p className="text-xs leading-relaxed">{comm.institution_response}</p>
                    <span className="text-[10px] text-emerald-700 block">
                      Submitted on: {new Date(comm.responded_at || comm.updated_at).toLocaleString()}
                    </span>
                  </div>
                ) : isInstitution ? (
                  respondingCommentId === comm.id ? (
                    <div className="space-y-2 pt-2">
                      <textarea
                        rows={3}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Provide official clarification and reference uploaded certificates..."
                        className="w-full p-3 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setRespondingCommentId(null)}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSendCommentReply(comm.id)}
                          className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                        >
                          Submit Explanation
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setRespondingCommentId(comm.id)}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
                    >
                      Respond to Query
                    </button>
                  )
                ) : null}
              </div>
            ))
          )}
        </div>
      )}

      {/* Action Dialog Modal */}
      {actionDialogType && (
        <ActionDialog
          isOpen={true}
          onClose={() => setActionDialogType(null)}
          actionType={actionDialogType}
          applicationNumber={application.application_number}
          onConfirm={handleActionConfirm}
          loading={actionLoading}
        />
      )}
    </div>
  );
};
