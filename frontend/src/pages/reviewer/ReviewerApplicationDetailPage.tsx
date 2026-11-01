import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { Application, DocumentItem, ComplianceFinding, ReviewerComment, WorkflowTransition } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { SeverityBadge } from '../../components/common/SeverityBadge';
import { ActionDialog } from '../../components/applications/ActionDialog';
import { useNotifications } from '../../context/NotificationContext';
import {
  FileText,
  ShieldCheck,
  Building2,
  Clock,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Send,
  Eye,
  Layers,
  History,
  FileCheck2,
  AlertCircle
} from 'lucide-react';

export const ReviewerApplicationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useNotifications();

  const [application, setApplication] = useState<Application | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [findings, setFindings] = useState<ComplianceFinding[]>([]);
  const [comments, setComments] = useState<ReviewerComment[]>([]);
  const [history, setHistory] = useState<WorkflowTransition[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'compliance' | 'comments' | 'history'>('overview');
  const [actionType, setActionType] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    if (id) loadApplicationDetails(parseInt(id));
  }, [id]);

  const loadApplicationDetails = async (appId: number) => {
    setLoading(true);
    try {
      const [appData, docsData, compData, commsData, histData] = await Promise.all([
        api.getApplication(appId),
        api.getDocuments(appId),
        api.getCompliance(appId),
        api.getReviewerComments(appId),
        api.getWorkflowHistory(appId)
      ]);
      setApplication(appData);
      setDocuments(docsData);
      setFindings(compData.findings || []);
      setComments(commsData);
      setHistory(histData);
    } catch (e: any) {
      showToast('error', 'Failed to load application', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleActionConfirm = async (payload: { reason?: string; title?: string; comment?: string }) => {
    if (!application) return;
    setActionLoading(true);
    try {
      if (actionType === 'request_correction') {
        if (!payload.comment && !payload.reason) {
          showToast('error', 'Mandatory Explanation', 'Please explain the reason for the correction request.');
          setActionLoading(false);
          return;
        }
        await api.requestCorrection(application.id, {
          title: payload.title || 'Scrutiny Query',
          comment: payload.comment || payload.reason || 'Please rectify deficiencies.'
        });
        showToast('warning', 'Correction Notice Issued', 'Application moved to Correction Required.');
      } else if (actionType === 'approve') {
        await api.approveApplication(application.id, payload.reason || 'Approved after scrutiny verification.');
        showToast('success', 'Application Approved', 'Official Approval Order generated.');
      } else if (actionType === 'reject') {
        if (!payload.reason) {
          showToast('error', 'Mandatory Reason', 'Please provide reason for rejection.');
          setActionLoading(false);
          return;
        }
        await api.rejectApplication(application.id, payload.reason);
        showToast('error', 'Application Rejected', 'Rejection order recorded in audit trail.');
      }
      setActionType(null);
      await loadApplicationDetails(application.id);
    } catch (e: any) {
      showToast('error', 'Action failed', e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!application || !newComment.trim()) return;
    try {
      await api.addReviewerComment(application.id, newComment.trim());
      setNewComment('');
      showToast('success', 'Comment Added', 'Saved to scrutiny records.');
      const comms = await api.getReviewerComments(application.id);
      setComments(comms);
    } catch (e: any) {
      showToast('error', 'Failed to add comment', e.message);
    }
  };

  const handleResolveFinding = async (findingId: number, status: string, notes: string) => {
    try {
      await api.resolveFinding(findingId, { status, resolution_notes: notes });
      showToast('success', 'Finding Updated', 'Status saved to compliance records.');
      if (application) {
        const comp = await api.getCompliance(application.id);
        setFindings(comp.findings || []);
      }
    } catch (e: any) {
      showToast('error', 'Failed to update finding', e.message);
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center bg-white rounded-2xl border border-slate-200">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs font-semibold text-slate-500">Loading application scrutiny details...</p>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300">
        <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h3 className="text-sm font-bold text-slate-800">Application Not Found</h3>
        <p className="text-xs text-slate-500 mt-1">The requested application does not exist or you lack permission to view it.</p>
        <Link to="/reviewer/assigned-applications" className="mt-4 inline-block px-4 py-2 bg-blue-700 text-white text-xs font-semibold rounded-xl">
          Back to Assigned Applications
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Navigation & Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/reviewer/assigned-applications')}
            className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors"
            title="Back to assigned list"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-150">
                {application.application_number}
              </span>
              <StatusBadge status={application.status} />
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                application.risk_level === 'High' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                application.risk_level === 'Medium' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}>
                Risk: {application.risk_level || 'Low'}
              </span>
            </div>
            <h1 className="text-xl font-black text-slate-900 mt-1">{application.institution_name}</h1>
          </div>
        </div>

        {/* Reviewer Action Buttons */}
        <div className="flex items-center gap-2">
          <Link
            to={`/reviewer/review-queue?appId=${application.id}`}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
          >
            <FileCheck2 className="w-4 h-4 text-blue-600" />
            Dual-Pane Workbench
          </Link>
          <button
            onClick={() => setActionType('request_correction')}
            className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
          >
            <AlertCircle className="w-4 h-4 text-amber-600" />
            Request Correction
          </button>
          <button
            onClick={() => setActionType('reject')}
            className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
          >
            <XCircle className="w-4 h-4 text-rose-600" />
            Reject
          </button>
          <button
            onClick={() => setActionType('approve')}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-2xs transition-colors flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            Approve
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 flex gap-6">
        {[
          { key: 'overview', label: 'Dossier Overview', count: null },
          { key: 'documents', label: 'Submitted Documents', count: documents.length },
          { key: 'compliance', label: 'Compliance Findings', count: findings.length },
          { key: 'comments', label: 'Reviewer Notes', count: comments.length },
          { key: 'history', label: 'Workflow Audit History', count: history.length }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`pb-3 text-xs font-bold transition-all relative flex items-center gap-2 ${
              activeTab === tab.key ? 'text-blue-700' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
            {tab.count !== null && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                activeTab === tab.key ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'
              }`}>
                {tab.count}
              </span>
            )}
            {activeTab === tab.key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-700 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
              <h3 className="text-sm font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">Programme & Application Parameters</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Programme</span>
                  <span className="font-bold text-slate-800">{application.programme}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Application Type</span>
                  <span className="font-bold text-slate-800">{application.application_type}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Academic Year</span>
                  <span className="font-bold text-slate-800">{application.academic_year}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Sanctioned Intake</span>
                  <span className="font-bold text-slate-800">{application.total_intake || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Land Area (Acres)</span>
                  <span className="font-bold text-slate-800">{application.land_area_acres || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Built-Up Area (sq.m)</span>
                  <span className="font-bold text-slate-800">{application.builtup_area_sqm || 'N/A'}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
              <h3 className="text-sm font-bold text-slate-900 mb-3 pb-2 border-b border-slate-100">Scrutiny Summary</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-xs text-slate-500 font-medium block">Total Documents</span>
                  <span className="text-lg font-black text-slate-800">{documents.length}</span>
                </div>
                <div className="p-3 bg-amber-50/60 rounded-xl">
                  <span className="text-xs text-amber-700 font-medium block">Deficiencies</span>
                  <span className="text-lg font-black text-amber-700">{findings.length}</span>
                </div>
                <div className="p-3 bg-blue-50/60 rounded-xl">
                  <span className="text-xs text-blue-700 font-medium block">Reviewer Notes</span>
                  <span className="text-lg font-black text-blue-700">{comments.length}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">Institution Profile</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Institution ID</span>
                  <span className="font-bold text-slate-800">#{application.institution_id}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Submission Date</span>
                  <span className="font-bold text-slate-800">
                    {application.submitted_at ? new Date(application.submitted_at).toLocaleDateString() : 'Draft'}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Last Updated</span>
                  <span className="font-bold text-slate-800">
                    {application.updated_at ? new Date(application.updated_at).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Documents Tab */}
      {activeTab === 'documents' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
            Mandatory Institutional Documents ({documents.length})
          </h3>
          <div className="divide-y divide-slate-100">
            {documents.map(doc => (
              <div key={doc.id} className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-blue-600 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{doc.document_type || doc.original_filename}</h4>
                    <p className="text-[11px] text-slate-500">{doc.original_filename} • {(doc.file_size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    doc.verification_status === 'Verified' ? 'bg-emerald-100 text-emerald-800' :
                    doc.verification_status === 'Rejected' ? 'bg-rose-100 text-rose-800' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {doc.verification_status}
                  </span>
                  <a
                    href={`http://127.0.0.1:8000/api/documents/${doc.id}/download`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
                    title="Download document"
                  >
                    <Eye className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Compliance Tab */}
      {activeTab === 'compliance' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900 mb-3 pb-2 border-b border-slate-100">
              Evaluated Compliance Findings ({findings.length})
            </h3>
            {findings.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No compliance deficiencies identified.</p>
            ) : (
              <div className="space-y-3">
                {findings.map(f => (
                  <div key={f.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <SeverityBadge severity={f.severity} />
                          <span className="text-xs font-bold text-slate-900">{f.rule_name || `Rule #${f.rule_id}`}</span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">{f.description}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        f.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800' :
                        f.status === 'Waived' ? 'bg-purple-100 text-purple-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {f.status}
                      </span>
                    </div>

                    {/* Reviewer Resolution controls */}
                    <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2 text-xs">
                      {f.status !== 'Resolved' && (
                        <button
                          onClick={() => handleResolveFinding(f.id, 'Resolved', 'Verified by reviewer')}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px]"
                        >
                          Mark Resolved
                        </button>
                      )}
                      {f.status !== 'Waived' && (
                        <button
                          onClick={() => handleResolveFinding(f.id, 'Waived', 'Waived under council discretion')}
                          className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg text-[11px]"
                        >
                          Waive Defect
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reviewer Comments Tab */}
      {activeTab === 'comments' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
            Confidential Reviewer Notes ({comments.length})
          </h3>

          <form onSubmit={handleAddComment} className="flex gap-2">
            <input
              type="text"
              placeholder="Add confidential scrutiny observation..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              Save Note
            </button>
          </form>

          <div className="space-y-3 pt-2">
            {comments.map(c => (
              <div key={c.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-bold text-slate-700">{c.reviewer_name || 'Reviewer'}</span>
                  <span>{new Date(c.created_at).toLocaleString()}</span>
                </div>
                <p className="text-slate-800">{c.comment}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Workflow Audit History Tab */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
            Workflow Transitions & Audit Record ({history.length})
          </h3>
          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
            {history.map(item => (
              <div key={item.id} className="relative">
                <span className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-blue-600 ring-4 ring-white" />
                <div className="text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{item.action_name}</span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-500">{new Date(item.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-slate-600 mt-1">
                    Transitioned from <span className="font-semibold">{item.from_state || 'Initial'}</span> to <span className="font-semibold text-blue-700">{item.to_state}</span>
                  </p>
                  {item.comments && (
                    <div className="mt-1 p-2 bg-slate-50 rounded-lg text-slate-700 border border-slate-100 text-[11px]">
                      {item.comments}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Dialog */}
      {actionType && (
        <ActionDialog
          isOpen={!!actionType}
          actionType={actionType}
          applicationNumber={application.application_number}
          onConfirm={handleActionConfirm}
          onClose={() => setActionType(null)}
          loading={actionLoading}
        />
      )}
    </div>
  );
};
