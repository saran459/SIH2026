import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { Application, DocumentItem, ComplianceFinding, ReviewerComment, ApplicationReportDetail } from '../types';
import { ReviewerDualPane } from '../components/reviewer/ReviewerDualPane';
import { ActionDialog } from '../components/applications/ActionDialog';
import { AutomatedVerificationReportModal } from '../components/reports/AutomatedVerificationReportModal';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';
import { useNotifications } from '../context/NotificationContext';
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
  AlertCircle,
  Trash2
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
  const [reportDetail, setReportDetail] = useState<ApplicationReportDetail | null>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Action Dialog (Approve, Reject, Request Correction)
  const [actionDialogType, setActionDialogType] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Delete Modal
  const [deleteModalApp, setDeleteModalApp] = useState<Application | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(() => {
      api.getApplications().then(setApplications).catch(console.error);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const apps = await api.getApplications();
      setApplications(apps);

      // If URL has appId, pick it; otherwise select first available
      let targetApp: Application | undefined;
      if (requestedAppId) {
        targetApp = apps.find(a => a.id === parseInt(requestedAppId, 10));
      }
      if (!targetApp && apps.length > 0) {
        targetApp = apps.find(a => ['Submitted', 'Under Review', 'Resubmitted'].includes(a.status)) || apps[0];
      }

      if (targetApp) {
        handleSelectApp(targetApp);
      } else {
        setSelectedApp(null);
        setDocuments([]);
        setFindings([]);
        setComments([]);
      }
    } catch (e: any) {
      showToast('error', 'Failed to load scrutiny queue', e.message);
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

      // Fetch automated verification report if available
      try {
        const rep = await api.getApplicationVerificationReport(app.id);
        setReportDetail(rep);
      } catch {
        setReportDetail(null);
      }
    } catch (e: any) {
      showToast('error', 'Failed to load details', e.message);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleActionConfirm = async (payload: { reason?: string; title?: string; comment?: string }) => {
    if (!selectedApp || !actionDialogType) return;
    setActionLoading(true);
    try {
      if (actionDialogType === 'request_correction') {
        await api.requestCorrection(selectedApp.id, {
          title: payload.title || 'Scrutiny Deficiency Query',
          comment: payload.comment || payload.reason || 'Please rectify deficiencies.'
        });
        showToast('warning', 'Correction Notice Issued', 'Application moved to Correction Required.');
      } else if (actionDialogType === 'approve') {
        const cleanReason = payload.reason?.trim() || 'Approved after scrutiny verification.';
        await api.approveApplication(selectedApp.id, cleanReason);
        showToast('success', 'Application Approved', 'Official Approval Order recorded in audit trail.');
      } else if (actionDialogType === 'reject') {
        const cleanReason = payload.reason?.trim() || 'Statutory document deficiencies not rectified per AICTE norms.';
        await api.rejectApplication(selectedApp.id, cleanReason);
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

  const handleConfirmDelete = async () => {
    if (!deleteModalApp) return;
    try {
      setDeleteLoading(true);
      await api.deleteApplication(deleteModalApp.id);
      showToast('success', 'Application Deleted', `Application ${deleteModalApp.application_number} permanently deleted.`);
      if (selectedApp?.id === deleteModalApp.id) {
        setSelectedApp(null);
      }
      setDeleteModalApp(null);
      await fetchQueue();
    } catch (e: any) {
      showToast('error', 'Delete failed', e.message);
    } finally {
      setDeleteLoading(false);
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
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 uppercase tracking-wider mb-1">
            <UserCheck className="w-4 h-4" />
            Statutory Scrutiny Queue
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Scrutiny Review Queue & Dual-Pane Evaluation
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Cross-document validation, statutory findings resolution, discrepancy checks, and formal decisions.
          </p>
        </div>

        {reportDetail && (
          <button
            onClick={() => setReportModalOpen(true)}
            className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs self-start sm:self-auto cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>Automated Verification Report</span>
          </button>
        )}
      </div>

      {/* Main Grid: Left Queue List, Right Dual Pane */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Side: Scrutiny Queue List (3 cols) */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-700">Applications ({applications.length})</span>
            <span className="text-[10px] text-slate-400 font-mono">Live Sync</span>
          </div>

          <div className="space-y-2 max-h-[720px] overflow-y-auto pr-1">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading queue...</div>
            ) : applications.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">No applications in queue</div>
            ) : (
              applications.map((app) => {
                const isSelected = selectedApp?.id === app.id;
                return (
                  <div
                    key={app.id}
                    onClick={() => handleSelectApp(app)}
                    className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/80 border-blue-400 shadow-2xs ring-1 ring-blue-300'
                        : 'bg-slate-50/50 hover:bg-slate-100/70 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-[11px] font-bold text-blue-800">
                        {app.application_number}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <StatusBadge status={app.status} size="sm" />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteModalApp(app);
                          }}
                          className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete Application"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="font-semibold text-xs text-slate-800 line-clamp-1">
                      {app.institution_name || `Institution #${app.institution_id}`}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                      <span>{app.program || app.programme || 'General'}</span>
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
                  </div>
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
                onDelete={() => setDeleteModalApp(selectedApp)}
                onResolveFinding={handleResolveFinding}
              />
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-16 text-center">
              <UserCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-800">
                {applications.length === 0 ? 'No applications in queue' : 'Select an Application'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {applications.length === 0
                  ? 'Submitted institutional applications will appear here for scrutiny.'
                  : 'Select an item from the scrutiny queue on the left to begin examination.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModalApp && (
        <Modal
          isOpen={!!deleteModalApp}
          onClose={() => setDeleteModalApp(null)}
          title="Delete Application Record"
          subtitle={`Application No: ${deleteModalApp.application_number}`}
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
              <Trash2 className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-rose-900 leading-relaxed">
                Are you sure you want to permanently delete application <span className="font-bold">{deleteModalApp.application_number}</span> ({deleteModalApp.institution_name})? This will permanently remove all associated documents, findings, and verification records.
              </div>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteModalApp(null)}
                disabled={deleteLoading}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteLoading}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                {deleteLoading ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  'Delete Permanently'
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}

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

      {/* Verification Report Modal */}
      <AutomatedVerificationReportModal
        report={reportDetail}
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
      />
    </div>
  );
};
