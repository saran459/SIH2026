import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../services/api';
import { Application, DocumentItem, ComplianceFinding, ReviewerComment } from '../../types';
import { ReviewerDualPane } from '../../components/reviewer/ReviewerDualPane';
import { ActionDialog } from '../../components/applications/ActionDialog';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useNotifications } from '../../context/NotificationContext';
import {
  UserCheck,
  AlertTriangle,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Layers,
  ChevronRight,
  ShieldCheck,
  Building2,
  AlertCircle
} from 'lucide-react';

export const ReviewerQueuePage: React.FC = () => {
  const { showToast } = useNotifications();
  const [searchParams] = useSearchParams();
  const requestedAppId = searchParams.get('appId');

  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [findings, setFindings] = useState<ComplianceFinding[]>([]);
  const [comments, setComments] = useState<ReviewerComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Action Dialog
  const [actionDialogType, setActionDialogType] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchQueue();
  }, []);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const apps = await api.getApplications();
      setApplications(apps);

      // If URL has appId, pick it; otherwise select first under review or submitted
      let targetApp: Application | undefined;
      if (requestedAppId) {
        targetApp = apps.find(a => a.id === parseInt(requestedAppId));
      }
      if (!targetApp) {
        targetApp = apps.find((a) => a.status === 'Under Review' || a.status === 'Correction Required' || a.status === 'Submitted') || apps[0];
      }

      if (targetApp) {
        handleSelectApp(targetApp);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectApp = async (app: Application) => {
    setSelectedApp(app);
    setDetailsLoading(true);
    try {
      const [docs, comp, comms] = await Promise.all([
        api.getDocuments(app.id),
        api.getCompliance(app.id),
        api.getReviewerComments(app.id)
      ]);
      setDocuments(docs);
      setFindings(comp.findings || []);
      setComments(comms);
    } catch (e) {
      console.error(e);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleActionConfirm = async (payload: { reason?: string; title?: string; comment?: string }) => {
    if (!selectedApp) return;
    setActionLoading(true);
    try {
      if (actionDialogType === 'request_correction') {
        if (!payload.comment && !payload.reason) {
          showToast('error', 'Explanation Required', 'A mandatory explanation must be provided for correction requests.');
          setActionLoading(false);
          return;
        }
        await api.requestCorrection(selectedApp.id, {
          title: payload.title || 'Scrutiny Deficiency Query',
          comment: payload.comment || payload.reason || 'Please rectify deficiencies.'
        });
        showToast('warning', 'Correction Notice Issued', 'Application moved to Correction Required.');
      } else if (actionDialogType === 'approve') {
        await api.approveApplication(selectedApp.id, payload.reason || 'Approved after scrutiny verification.');
        showToast('success', 'Application Approved', 'Official Approval Order recorded in audit trail.');
      } else if (actionDialogType === 'reject') {
        if (!payload.reason) {
          showToast('error', 'Reason Required', 'Mandatory reason is required to reject an application.');
          setActionLoading(false);
          return;
        }
        await api.rejectApplication(selectedApp.id, payload.reason);
        showToast('error', 'Application Rejected', 'Formal rejection order recorded in audit trail.');
      }
      setActionDialogType(null);
      await fetchQueue();
    } catch (e: any) {
      showToast('error', 'Action failed', e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolveFinding = async (findingId: number, status: string, notes: string) => {
    try {
      await api.resolveFinding(findingId, { status, resolution_notes: notes });
      showToast('success', 'Finding Status Updated', 'Recorded in compliance log.');
      if (selectedApp) handleSelectApp(selectedApp);
    } catch (e: any) {
      showToast('error', 'Failed to update finding', e.message);
    }
  };

  const handleAddComment = async (comment: string) => {
    if (!selectedApp) return;
    try {
      await api.addReviewerComment(selectedApp.id, comment);
      showToast('success', 'Comment Added', 'Saved to scrutiny notes.');
      const comms = await api.getReviewerComments(selectedApp.id);
      setComments(comms);
    } catch (e: any) {
      showToast('error', 'Failed to add comment', e.message);
    }
  };

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 uppercase tracking-wider mb-0.5">
            <UserCheck className="w-4 h-4" />
            AICTE Scrutiny Workbench
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Review Queue & Workbench</h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Dual-pane scrutiny environment for cross-verifying institutional evidence, AI extractions, and compliance findings.
          </p>
        </div>

        {selectedApp && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setActionDialogType('request_correction')}
              className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold rounded-xl shadow-2xs transition-colors flex items-center gap-1.5"
            >
              <AlertCircle className="w-4 h-4 text-amber-600" />
              Request Correction
            </button>
            <button
              onClick={() => setActionDialogType('reject')}
              className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 text-xs font-bold rounded-xl shadow-2xs transition-colors flex items-center gap-1.5"
            >
              <XCircle className="w-4 h-4 text-rose-600" />
              Reject Application
            </button>
            <button
              onClick={() => setActionDialogType('approve')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-2xs transition-colors flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              Approve Application
            </button>
          </div>
        )}
      </div>

      {/* Main Two-Column Layout: Left Quick Queue Selector, Right Dual Pane */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Side: Queue List */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-3 shadow-2xs flex flex-col h-[780px]">
          <div className="pb-3 border-b border-slate-150 mb-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                Queue Items ({applications.length})
              </span>
            </div>
          </div>

          <div className="overflow-y-auto flex-1 space-y-2 pr-1 custom-scrollbar">
            {loading ? (
              <div className="p-6 text-center">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <span className="text-xs text-slate-400">Loading queue...</span>
              </div>
            ) : applications.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">No applications in queue</div>
            ) : (
              applications.map((app) => {
                const isSelected = selectedApp?.id === app.id;
                return (
                  <button
                    key={app.id}
                    onClick={() => handleSelectApp(app)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-blue-50/80 border-blue-400 shadow-2xs ring-1 ring-blue-300'
                        : 'bg-slate-50/50 hover:bg-slate-100/70 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-[11px] font-bold text-blue-800">
                        {app.application_number}
                      </span>
                      <StatusBadge status={app.status} size="sm" />
                    </div>
                    <div className="font-semibold text-xs text-slate-800 line-clamp-1">
                      {app.institution_name || `Institution #${app.institution_id}`}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                      <span>{app.programme || 'General'}</span>
                      {app.deficiency_count && app.deficiency_count > 0 ? (
                        <span className="text-amber-600 font-bold flex items-center gap-0.5">
                          <AlertTriangle className="w-3 h-3" />
                          {app.deficiency_count}
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3" />
                          Clear
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Dual Pane Scrutiny Viewer */}
        <div className="lg:col-span-9">
          {detailsLoading ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs font-semibold text-slate-600">Loading application files, OCR and compliance findings...</p>
            </div>
          ) : selectedApp ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden h-[780px]">
              <ReviewerDualPane
                application={selectedApp}
                documents={documents}
                findings={findings}
                comments={comments}
                onRequestCorrection={() => setActionDialogType('request_correction')}
                onApprove={() => setActionDialogType('approve')}
                onReject={() => setActionDialogType('reject')}
                onResolveFinding={handleResolveFinding}
              />
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-16 text-center">
              <UserCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-800">Select an Application</h3>
              <p className="text-xs text-slate-500 mt-1">Select an item from the scrutiny queue on the left to begin examination.</p>
            </div>
          )}
        </div>
      </div>

      {/* Action Dialog for Approve / Reject / Correction Notice */}
      {actionDialogType && selectedApp && (
        <ActionDialog
          isOpen={!!actionDialogType}
          actionType={actionDialogType}
          applicationNumber={selectedApp.application_number}
          onConfirm={handleActionConfirm}
          onClose={() => setActionDialogType(null)}
          loading={actionLoading}
        />
      )}
    </div>
  );
};
