import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import {
  Application,
  DocumentItem,
  WorkflowEvent,
  ReviewerComment,
  ComplianceAssessment
} from '../../types';
import { useNotifications } from '../../context/NotificationContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { SeverityBadge } from '../../components/common/SeverityBadge';
import { ScoreGauge } from '../../components/common/ScoreGauge';
import { WorkflowTimeline } from '../../components/applications/WorkflowTimeline';
import { ActionDialog } from '../../components/applications/ActionDialog';
import { FileUploadZone } from '../../components/documents/FileUploadZone';
import { DocumentCard } from '../../components/documents/DocumentCard';
import { ExtractedFieldsTable } from '../../components/documents/ExtractedFieldsTable';
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
  ChevronLeft,
  RotateCcw,
  Sparkles
} from 'lucide-react';

export const InstitutionApplicationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
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

  // Comment reply state
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
      showToast('error', 'Access Denied or Not Found', e.message);
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

  const handleActionConfirm = async (payload: { reason?: string }) => {
    setActionLoading(true);
    try {
      if (actionDialogType === 'submit') {
        await api.submitApplication(appId);
        showToast('success', 'Application Submitted', 'Your dossier is now in the official AICTE review queue.');
      } else if (actionDialogType === 'resubmit') {
        await api.resubmitApplication(appId, payload.reason);
        showToast('success', 'Application Resubmitted', 'Corrections recorded and returned to reviewer.');
      } else if (actionDialogType === 'withdraw') {
        await api.withdrawApplication(appId, payload.reason || 'Withdrawn by applicant');
        showToast('info', 'Application Withdrawn', 'Dossier moved to Withdrawn status.');
      }
      setActionDialogType(null);
      loadApplicationData();
    } catch (e: any) {
      showToast('error', 'Action Failed', e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendCommentReply = async (commentId: number) => {
    if (!replyText.trim()) return;
    try {
      await api.respondToComment(commentId, { institution_response: replyText });
      showToast('success', 'Response Recorded', 'Your reply has been submitted to the scrutiny committee.');
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
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isDraft = application.status === 'Draft';
  const isCorrectionRequired = application.status === 'Correction Required';

  return (
    <div className="space-y-6">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/institution/applications')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Applications</span>
        </button>

        <button
          onClick={() => navigate('/institution/digital-twin')}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors"
        >
          <Cpu className="w-4 h-4 text-emerald-700" />
          <span>Launch Digital Twin Simulator</span>
        </button>
      </div>

      {/* Main Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 lg:p-8 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="font-mono text-xs font-extrabold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">
              {application.application_number}
            </span>
            <StatusBadge status={application.status} />
            <span className="text-xs text-slate-500">
              {application.category} • {application.academic_year}
            </span>
          </div>

          <h3 className="text-xl font-bold text-slate-900">
            {application.institution_name}
          </h3>

          <div className="flex items-center gap-4 text-xs text-slate-500 pt-1 flex-wrap">
            <span>Program: <strong className="text-slate-800">{application.program}</strong></span>
            <span>•</span>
            <span>Level: <strong className="text-slate-800">{application.level}</strong></span>
            <span>•</span>
            <span>Faculty Declared: <strong className="text-slate-800">{application.total_faculty_declared}</strong></span>
            <span>•</span>
            <span>Intake: <strong className="text-slate-800">{application.total_intake_declared}</strong></span>
          </div>
        </div>

        {/* Readiness Gauge & Institution Action Buttons */}
        <div className="flex items-center gap-6 self-stretch md:self-auto justify-between md:justify-end border-t md:border-t-0 pt-4 md:pt-0 border-slate-150">
          <div className="text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Readiness Score
            </span>
            <ScoreGauge score={application.readiness_score} size="sm" />
          </div>

          <div className="flex flex-col gap-2">
            {isDraft && (
              <button
                onClick={() => setActionDialogType('submit')}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>Submit for AICTE Scrutiny</span>
              </button>
            )}

            {isCorrectionRequired && (
              <button
                onClick={() => setActionDialogType('resubmit')}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Resubmit with Corrections</span>
              </button>
            )}

            {isDraft && (
              <button
                onClick={() => setActionDialogType('withdraw')}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-xs transition-colors"
              >
                Withdraw Draft
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 transition-colors ${
            activeTab === 'overview'
              ? 'text-emerald-700 border-b-2 border-emerald-600'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Overview & Extraction
        </button>
        <button
          onClick={() => setActiveTab('documents')}
          className={`pb-3 transition-colors flex items-center gap-1.5 ${
            activeTab === 'documents'
              ? 'text-emerald-700 border-b-2 border-emerald-600'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <span>Uploaded Documents</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-600">
            {documents.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('compliance')}
          className={`pb-3 transition-colors flex items-center gap-1.5 ${
            activeTab === 'compliance'
              ? 'text-emerald-700 border-b-2 border-emerald-600'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <span>Compliance Findings</span>
          {compliance?.failed_count ? (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-100 text-rose-700 font-bold">
              {compliance.failed_count}
            </span>
          ) : null}
        </button>
        <button
          onClick={() => setActiveTab('comments')}
          className={`pb-3 transition-colors flex items-center gap-1.5 ${
            activeTab === 'comments'
              ? 'text-emerald-700 border-b-2 border-emerald-600'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <span>Reviewer Queries</span>
          {comments.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800 font-bold">
              {comments.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('workflow')}
          className={`pb-3 transition-colors ${
            activeTab === 'workflow'
              ? 'text-emerald-700 border-b-2 border-emerald-600'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Workflow Audit Trail
        </button>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Infrastructure Declared</h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Built-up Area:</span>
                  <strong className="text-slate-900">{application.built_up_area_sqm} sqm</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Land Area:</span>
                  <strong className="text-slate-900">{application.land_area_acres} acres</strong>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Faculty & Intake</h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Faculty Headcount:</span>
                  <strong className="text-slate-900">{application.total_faculty_declared}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Approved Intake:</span>
                  <strong className="text-slate-900">{application.total_intake_declared}</strong>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Compliance Status</h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Active Findings:</span>
                  <strong className="text-amber-600">{application.open_findings_count} open</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Uploaded Documents:</span>
                  <strong className="text-slate-900">{application.documents_count} files</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Document Extracted Fields Summary */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900">AI-Extracted Statutory Fields Across Filings</h4>
              <button
                onClick={handleRunCompliance}
                className="text-xs font-semibold text-emerald-700 hover:underline"
              >
                Re-run statutory check →
              </button>
            </div>
            <ExtractedFieldsTable
              fields={documents.flatMap((d) => d.extracted_fields || [])}
              onVerifyField={async (fieldId, val) => {
                await api.verifyField(fieldId, val);
                loadApplicationData();
              }}
            />
          </div>
        </div>
      )}

      {/* Tab 2: Documents */}
      {activeTab === 'documents' && (
        <div className="space-y-6">
          {/* Upload Dropzone */}
          <FileUploadZone onUpload={handleUploadDocument} />

          {/* Uploaded Documents Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {documents.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                onPreview={(d) => window.open(api.getDocumentDownloadUrl(d.id), '_blank')}
                onReprocess={async () => {
                  await api.reprocessDocument(doc.id);
                  loadApplicationData();
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Compliance */}
      {activeTab === 'compliance' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
            <div>
              <h4 className="text-sm font-bold text-slate-900">Statutory Compliance Findings</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                AICTE Approval Process Handbook (APH 2026-27) Evaluation Rules
              </p>
            </div>
            <button
              onClick={handleRunCompliance}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-colors"
            >
              Run Compliance Assessment
            </button>
          </div>

          <div className="space-y-3">
            {compliance?.findings?.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-xs text-slate-400">
                All statutory rules passed! No open compliance deficiencies.
              </div>
            ) : (
              compliance?.findings?.map((f) => (
                <div key={f.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-bold text-slate-500">{f.rule_code}</span>
                      <SeverityBadge severity={f.severity} />
                    </div>
                    <span className="text-xs font-semibold text-slate-500">{f.status}</span>
                  </div>
                  <h5 className="text-xs font-bold text-slate-900">{f.title}</h5>
                  <p className="text-xs text-slate-600 leading-relaxed">{f.description}</p>
                  {f.recommended_action && (
                    <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200/50 text-[11px] text-emerald-900">
                      <strong>Recommended Institutional Action:</strong> {f.recommended_action}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Reviewer Queries */}
      {activeTab === 'comments' && (
        <div className="space-y-4">
          {comments.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-xs text-slate-400">
              No formal deficiency queries issued by the scrutiny committee.
            </div>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                      {c.request_type}
                    </span>
                    <h5 className="text-sm font-bold text-slate-900 mt-1">{c.title}</h5>
                  </div>
                  <span className="text-xs font-semibold text-slate-500">{c.status}</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 leading-relaxed">
                  <strong className="block text-slate-900 mb-1">Scrutiny Officer Query:</strong>
                  {c.comment}
                </div>

                {/* Institution response if already submitted */}
                {c.institution_response ? (
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 space-y-1">
                    <div className="flex items-center justify-between font-bold">
                      <span>Institutional Explanation Submitted:</span>
                      <span className="text-[10px] text-emerald-700">
                        {c.responded_at ? new Date(c.responded_at).toLocaleDateString() : ''}
                      </span>
                    </div>
                    <p className="leading-relaxed">{c.institution_response}</p>
                  </div>
                ) : (
                  <div className="space-y-3 pt-2">
                    <textarea
                      rows={3}
                      value={respondingCommentId === c.id ? replyText : ''}
                      onChange={(e) => {
                        setRespondingCommentId(c.id);
                        setReplyText(e.target.value);
                      }}
                      placeholder="Type institutional explanation and reference updated evidence documents..."
                      className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                    <div className="flex justify-end">
                      <button
                        onClick={() => handleSendCommentReply(c.id)}
                        disabled={!replyText.trim() || respondingCommentId !== c.id}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-colors disabled:opacity-50"
                      >
                        Submit Query Reply
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 5: Workflow Timeline */}
      {activeTab === 'workflow' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
          <WorkflowTimeline currentStatus={application.status} events={workflowHistory} />
        </div>
      )}

      {/* Action Dialog for Submit, Resubmit, Withdraw */}
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
