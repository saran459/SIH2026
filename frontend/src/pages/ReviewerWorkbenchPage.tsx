import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Application, DocumentItem, ComplianceFinding, ReviewerComment } from '../types';
import { ReviewerDualPane } from '../components/reviewer/ReviewerDualPane';
import { ActionDialog } from '../components/applications/ActionDialog';
import { StatusBadge } from '../components/common/StatusBadge';
import { useNotifications } from '../context/NotificationContext';
import {
  UserCheck,
  AlertTriangle,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  Filter
} from 'lucide-react';

export const ReviewerWorkbenchPage: React.FC = () => {
  const { showToast } = useNotifications();

  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [findings, setFindings] = useState<ComplianceFinding[]>([]);
  const [comments, setComments] = useState<ReviewerComment[]>([]);
  const [loading, setLoading] = useState(true);

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
      // Automatically select first under review application
      const firstActive = apps.find((a) => a.status === 'Under Review' || a.status === 'Correction Required') || apps[0];
      if (firstActive) {
        handleSelectApp(firstActive);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectApp = async (app: Application) => {
    setSelectedApp(app);
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
    }
  };

  const handleActionConfirm = async (payload: { reason?: string; title?: string; comment?: string }) => {
    if (!selectedApp) return;
    setActionLoading(true);
    try {
      if (actionDialogType === 'request_correction') {
        await api.requestCorrection(selectedApp.id, {
          title: payload.title || 'Scrutiny Query',
          comment: payload.comment || 'Please rectify deficiencies.'
        });
        showToast('warning', 'Correction Notice Issued', 'Application moved to Correction Required.');
      } else if (actionDialogType === 'approve') {
        await api.approveApplication(selectedApp.id, payload.reason || 'Approved by committee.');
        showToast('success', 'Application Approved', 'Official Approval Order recorded.');
      } else if (actionDialogType === 'reject') {
        await api.rejectApplication(selectedApp.id, payload.reason || 'Deficiencies persisted.');
        showToast('error', 'Application Rejected', 'Rejection order recorded.');
      }
      setActionDialogType(null);
      fetchQueue();
    } catch (e: any) {
      showToast('error', 'Action failed', e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolveFinding = async (findingId: number, status: string, notes: string) => {
    try {
      await api.resolveFinding(findingId, { status, resolution_notes: notes });
      showToast('success', 'Finding Resolved', 'Verified by reviewer.');
      if (selectedApp) handleSelectApp(selectedApp);
    } catch (e: any) {
      showToast('error', 'Failed to resolve', e.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">AICTE Reviewer Scrutiny Workbench</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Inspect applications side-by-side with submitted evidences, issue queries, and record formal decisions
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
            Active Scrutiny Session
          </span>
        </div>
      </div>

      {/* Review Queue Selector Bar */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2 px-1">
          Scrutiny Queue ({applications.length})
        </span>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {applications.map((app) => {
            const isSelected = selectedApp?.id === app.id;
            return (
              <button
                key={app.id}
                onClick={() => handleSelectApp(app)}
                className={`p-3 rounded-2xl border text-left shrink-0 min-w-[220px] transition-all ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`font-mono text-xs font-bold ${isSelected ? 'text-white' : 'text-blue-700'}`}>
                    {app.application_number}
                  </span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                      isSelected ? 'bg-blue-700 text-blue-100' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {app.status}
                  </span>
                </div>
                <p className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                  {app.institution_name}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Split-Screen Workbench */}
      {selectedApp ? (
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
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center text-xs text-slate-400">
          No application selected from the queue.
        </div>
      )}

      {actionDialogType && selectedApp && (
        <ActionDialog
          isOpen={true}
          onClose={() => setActionDialogType(null)}
          actionType={actionDialogType}
          applicationNumber={selectedApp.application_number}
          onConfirm={handleActionConfirm}
          loading={actionLoading}
        />
      )}
    </div>
  );
};
