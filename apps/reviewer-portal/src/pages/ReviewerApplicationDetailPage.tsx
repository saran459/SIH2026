import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Application, DocumentItem, ComplianceFinding, ReviewerComment, WorkflowTransition, ApplicationReportDetail, ExtractedField } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { SeverityBadge } from '../components/common/SeverityBadge';
import { ActionDialog } from '../components/applications/ActionDialog';
import { AutomatedVerificationReportModal } from '../components/reports/AutomatedVerificationReportModal';
import { Modal } from '../components/common/Modal';
import { useNotifications } from '../context/NotificationContext';
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
  AlertCircle,
  AlertOctagon,
  Printer,
  Fingerprint,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Info,
  Trash2
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
  const [reportData, setReportData] = useState<ApplicationReportDetail | null>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'overview' | 'report' | 'documents' | 'compliance' | 'comments' | 'history'>('overview');
  const [actionType, setActionType] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [expandedDocId, setExpandedDocId] = useState<number | null>(null);

  useEffect(() => {
    if (!id) return;
    const appId = parseInt(id);
    loadApplicationDetails(appId, true);

    // Auto-polling every 6 seconds to automatically update verification report and findings when background processing finishes
    const interval = setInterval(() => {
      loadApplicationDetails(appId, false);
    }, 6000);

    return () => clearInterval(interval);
  }, [id]);

  const loadApplicationDetails = async (appId: number, showLoadingSpinner: boolean = true) => {
    if (showLoadingSpinner) setLoading(true);
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

      // Attempt loading automated verification report
      try {
        const rpt = await api.getApplicationVerificationReport(appId);
        setReportData(rpt);
      } catch {
        setReportData(null);
      }
    } catch (e: any) {
      if (showLoadingSpinner) {
        showToast('error', 'Failed to load application', e.message);
      }
    } finally {
      if (showLoadingSpinner) setLoading(false);
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
        const cleanReason = payload.reason?.trim() || 'Statutory document deficiencies not rectified per AICTE norms.';
        await api.rejectApplication(application.id, cleanReason);
        showToast('error', 'Application Rejected', 'Rejection order recorded in audit trail.');
      }
      setActionType(null);
      await loadApplicationDetails(application.id, true);
    } catch (e: any) {
      showToast('error', 'Action failed', e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!application) return;
    try {
      setDeleteLoading(true);
      await api.deleteApplication(application.id);
      showToast('success', 'Application Deleted', `Application ${application.application_number} permanently deleted.`);
      navigate('/reviewer/review-queue', { replace: true });
    } catch (e: any) {
      showToast('error', 'Delete failed', e.message);
    } finally {
      setDeleteLoading(false);
      setDeleteModalOpen(false);
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

  const handleResolveFinding = async (findingId: number, status: string) => {
    const defaultNotes = status === 'Resolved' ? 'Verified original physical document and confirmed compliance.' : 'Waived under Council executive committee discretion.';
    const notes = window.prompt(`Enter mandatory resolution notes for this finding:`, defaultNotes);
    if (!notes || notes.trim().length < 5) {
      showToast('error', 'Resolution Notes Required', 'Substantive justification (minimum 5 characters) is required to resolve a finding.');
      return;
    }
    try {
      await api.resolveFinding(findingId, { status, resolution_notes: notes.trim() });
      showToast('success', 'Finding Updated', `Finding marked as ${status}.`);
      if (application) {
        const comp = await api.getCompliance(application.id);
        setFindings(comp.findings || []);
        try {
          const rpt = await api.getApplicationVerificationReport(application.id);
          setReportData(rpt);
        } catch {}
      }
    } catch (e: any) {
      showToast('error', 'Failed to update finding', e.message);
    }
  };

  const renderOutcomeBadge = (status: string) => {
    const s = (status || '').trim();
    if (s === 'Pass' || s === 'PASSED' || s === 'Verified' || s === 'VERIFIED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
          ✓ {s === 'Verified' || s === 'VERIFIED' ? 'Verified' : 'Pass'}
        </span>
      );
    }
    if (s === 'Fail' || s === 'FAILED' || s === 'Not Found' || s === 'NOT_FOUND') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
          ✕ {s === 'Not Found' || s === 'NOT_FOUND' ? 'Not Found' : 'Fail'}
        </span>
      );
    }
    if (s === 'Warning' || s === 'WARNING' || s === 'Mismatch' || s === 'MISMATCH') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
          ⚠ {s === 'Mismatch' || s === 'MISMATCH' ? 'Mismatch' : 'Warning'}
        </span>
      );
    }
    if (s === 'Unavailable' || s === 'UNAVAILABLE') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
          ⚡ Service Unavailable
        </span>
      );
    }
    if (s === 'Not Applicable' || s === 'NOT_APPLICABLE') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
          – Not Applicable
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
        ○ Not Run
      </span>
    );
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
        <Link to="/assigned-applications" className="mt-4 inline-block px-4 py-2 bg-blue-700 text-white text-xs font-semibold rounded-xl">
          Back to Assigned Applications
        </Link>
      </div>
    );
  }

  const reportDetailsObj = reportData?.report_data || {};
  const checklist = reportDetailsObj.compliance_checklist || [];
  const imageTampering = reportDetailsObj.image_tampering_analysis || [];
  const externalVerifications = reportDetailsObj.simulated_external_verifications || [];

  return (
    <div className="space-y-6">
      {/* Top Navigation & Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/assigned-applications')}
            className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors"
            title="Back to assigned list"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-150">
                {application.application_number}
              </span>
              <StatusBadge status={application.status} />
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                application.risk_level === 'High Risk' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                application.risk_level === 'Moderate Risk' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}>
                Risk: {application.risk_level || 'Low Risk'}
              </span>
              {application.assigned_reviewer_name && (
                <span className="text-[11px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                  Assigned: <strong>{application.assigned_reviewer_name}</strong>
                </span>
              )}
            </div>
            <h1 className="text-xl font-black text-slate-900 mt-1">{application.institution_name}</h1>
          </div>
        </div>

        {/* Reviewer Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to={`/review-queue?appId=${application.id}`}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
          >
            <FileCheck2 className="w-4 h-4 text-blue-600" />
            Dual-Pane Workbench
          </Link>
          {reportData && (
            <button
              onClick={() => setReportModalOpen(true)}
              className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              Verification Report
            </button>
          )}
          {application.status !== 'Approved' && application.status !== 'Rejected' && (
            <>
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
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                Approve
              </button>
            </>
          )}
          <button
            onClick={() => setDeleteModalOpen(true)}
            className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Permanently Delete Application"
          >
            <Trash2 className="w-4 h-4 text-rose-600" />
            <span>Delete Application</span>
          </button>
        </div>
      </div>

      {/* Automated Verification Intelligence Banner */}
      {reportData && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
          reportData.requires_human_verification
            ? 'bg-amber-50/80 border-amber-300 text-amber-900'
            : 'bg-emerald-50/80 border-emerald-300 text-emerald-900'
        }`}>
          <div className="flex items-start sm:items-center gap-3">
            {reportData.requires_human_verification ? (
              <AlertOctagon className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5 sm:mt-0" />
            )}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider">
                {reportData.requires_human_verification
                  ? `Automated Verification: Flagged for Reviewer Judgment (${reportData.failed_checks_count} Deficiencies, ${reportData.risk_level})`
                  : `Automated Verification: Completed & Passed (Readiness Score: ${reportData.readiness_score}/100, ${reportData.risk_level})`}
              </h4>
              <p className="text-[11px] opacity-90 mt-0.5">
                AI extraction and multi-modal checks have executed automatically. Final regulatory determination remains with the authorized Reviewer Committee.
              </p>
            </div>
          </div>
          <button
            onClick={() => setReportModalOpen(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white shadow-2xs border border-slate-200 hover:bg-slate-50 transition-colors shrink-0 text-slate-800"
          >
            Inspect Report
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200 flex gap-6 overflow-x-auto">
        {[
          { key: 'overview', label: 'Dossier Overview', count: null },
          { key: 'report', label: 'Verification Assessment', count: reportData ? `${reportData.readiness_score}/100` : null },
          { key: 'documents', label: 'Submitted Documents & OCR', count: documents.length },
          { key: 'compliance', label: 'Compliance & Cross-Doc Findings', count: findings.length },
          { key: 'comments', label: 'Reviewer Notes', count: comments.length },
          { key: 'history', label: 'Workflow Audit History', count: history.length }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`pb-3 text-xs font-bold transition-all relative flex items-center gap-2 shrink-0 ${
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
      {/* 1. OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
              <h3 className="text-sm font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">Programme & Application Parameters</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Programme</span>
                  <span className="font-bold text-slate-800">{application.programme || application.program}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Category / Level</span>
                  <span className="font-bold text-slate-800">{application.category} ({application.level})</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Academic Year</span>
                  <span className="font-bold text-slate-800">{application.academic_year}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Sanctioned Intake</span>
                  <span className="font-bold text-slate-800">{application.total_intake_declared || application.total_intake || 'N/A'} seats</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Declared Faculty</span>
                  <span className="font-bold text-slate-800">{application.total_faculty_declared} members</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Land Area</span>
                  <span className="font-bold text-slate-800">{application.land_area_acres} Acres</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Built-Up Area</span>
                  <span className="font-bold text-slate-800">{application.built_up_area_sqm || application.builtup_area_sqm} sqm</span>
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
                  <span className="text-xs text-amber-700 font-medium block">Deficiencies / Findings</span>
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
                  <span className="text-slate-500">Institution Title</span>
                  <span className="font-bold text-slate-800 text-right">{application.institution_name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Submission Date</span>
                  <span className="font-bold text-slate-800">
                    {application.submission_date || application.submitted_at ? new Date(application.submission_date || application.submitted_at!).toLocaleDateString() : 'Draft'}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Decision Status</span>
                  <span className="font-bold text-slate-800">
                    {application.decision_date ? `${application.status} (${new Date(application.decision_date).toLocaleDateString()})` : 'Pending Decision'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. VERIFICATION ASSESSMENT REPORT TAB */}
      {activeTab === 'report' && (
        <div className="space-y-6">
          {!reportData ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
              <FileCheck2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h4 className="text-xs font-bold text-slate-700">Verification Report Pending</h4>
              <p className="text-[11px] text-slate-500 mt-1">
                The automated review job is currently processing or queued for this application. Results will appear automatically upon completion.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Executive Summary Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Report No. {reportData.report_number}</span>
                    <h3 className="text-base font-bold text-slate-900 mt-0.5">Automated Multi-Modal Verification Assessment</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Completed: {new Date(reportData.created_at).toLocaleString()} • Audit SHA-256: <span className="font-mono">{reportData.audit_event_hash?.slice(0, 16)}...</span>
                    </p>
                  </div>
                  <button
                    onClick={() => setReportModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-2xs transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Open Printable Report View</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Readiness Score</span>
                    <span className="text-2xl font-black text-slate-900 mt-1 block">{reportData.readiness_score}/100</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-1 ${
                      reportData.risk_level === 'Low Risk' ? 'bg-emerald-100 text-emerald-800' :
                      reportData.risk_level === 'Moderate Risk' ? 'bg-amber-100 text-amber-800' :
                      'bg-rose-100 text-rose-800'
                    }`}>
                      {reportData.risk_level}
                    </span>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Statutory Norms</span>
                    <span className="text-2xl font-black text-emerald-700 mt-1 block">
                      {reportData.passed_checks_count} Passed
                    </span>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      {reportData.failed_checks_count} Deficiencies detected
                    </span>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Documents Processed</span>
                    <span className="text-2xl font-black text-blue-700 mt-1 block">
                      {reportData.documents_processed_count}
                    </span>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Integrity hashes verified
                    </span>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Human Review Required</span>
                    <span className={`text-xs font-bold mt-1 block ${
                      reportData.requires_human_verification ? 'text-amber-800' : 'text-emerald-800'
                    }`}>
                      {reportData.requires_human_verification ? 'Action Items Pending' : 'Ready for Decision'}
                    </span>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      {reportData.requires_human_verification ? 'Discrepancies flagged' : 'Zero contradictions'}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Executive Summary</span>
                  {reportData.summary}
                </div>
              </div>

              {/* Statutory Compliance Norms (7 Rules) Section */}
              {checklist.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Statutory AICTE Compliance Norms Evaluation ({checklist.length})
                  </h3>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-4">Rule Code & Title</th>
                          <th className="py-2.5 px-3">Statutory Criteria</th>
                          <th className="py-2.5 px-3">Observed Value</th>
                          <th className="py-2.5 px-3">Outcome Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {checklist.map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-4">
                              <span className="font-bold text-slate-900 block">{item.title}</span>
                              <span className="text-[10px] font-mono text-slate-400">{item.rule_code}</span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">{item.expected_value}</td>
                            <td className="py-2.5 px-3 text-slate-800 font-mono text-[11px]">{item.observed_value}</td>
                            <td className="py-2.5 px-3">{renderOutcomeBadge(item.status)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Image Error Level Analysis (ELA) Forensic Indicators */}
              {imageTampering.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
                    <Fingerprint className="w-4 h-4 text-purple-600" />
                    Image Error Level Analysis (ELA) Forensic Indicators ({imageTampering.length})
                  </h3>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-4">Document Image</th>
                          <th className="py-2.5 px-3">ELA Status</th>
                          <th className="py-2.5 px-3">Compression Metrics</th>
                          <th className="py-2.5 px-4">Assessment Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {imageTampering.map((it: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-4">
                              <span className="font-bold text-slate-900 block">{it.document_name}</span>
                              {it.ela_artifact_url && (
                                <a
                                  href={`http://127.0.0.1:8000${it.ela_artifact_url}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[10px] text-blue-600 hover:underline inline-flex items-center gap-0.5 mt-0.5"
                                >
                                  View ELA Mask <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </td>
                            <td className="py-2.5 px-3">{renderOutcomeBadge(it.status)}</td>
                            <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                              Mean: {it.mean_error ?? 'N/A'} | Peak: {it.max_error ?? 'N/A'}
                            </td>
                            <td className="py-2.5 px-4 text-xs text-slate-600">
                              <p>{it.details}</p>
                              <p className="text-[10px] text-slate-400 italic mt-0.5">{it.disclaimer}</p>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Simulated External Authority Verification */}
              {externalVerifications.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-indigo-600" />
                      External Authority Verification (Simulated Sandbox)
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                      ⚡ Simulated Sandbox • Not Live Government APIs
                    </span>
                  </div>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-4">Authority Registry</th>
                          <th className="py-2.5 px-3">Identifier Queried</th>
                          <th className="py-2.5 px-3">Verification Result</th>
                          <th className="py-2.5 px-4">Registry Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {externalVerifications.map((ev: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-4">
                              <span className="font-bold text-slate-900 block">{ev.registry_name}</span>
                              <span className="text-[10px] font-mono text-slate-400">{ev.authority_code}</span>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-xs text-slate-700">{ev.reference_queried}</td>
                            <td className="py-2.5 px-3">{renderOutcomeBadge(ev.status)}</td>
                            <td className="py-2.5 px-4 text-xs text-slate-600">
                              <p>{ev.details}</p>
                              <span className="text-[10px] text-slate-400 italic block mt-0.5">{ev.simulation_notice}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 3. SUBMITTED DOCUMENTS & OCR INFORMATION TAB */}
      {activeTab === 'documents' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">
              Submitted Documents & OCR Extractions ({documents.length})
            </h3>
            <span className="text-[11px] text-slate-500">
              Click any document to inspect OCR-extracted statutory fields
            </span>
          </div>

          <div className="space-y-3">
            {documents.map(doc => {
              const isExpanded = expandedDocId === doc.id;
              const efList = doc.extracted_fields || [];
              return (
                <div key={doc.id} className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <div
                    onClick={() => setExpandedDocId(isExpanded ? null : doc.id)}
                    className="p-3.5 bg-slate-50/70 hover:bg-slate-100/70 cursor-pointer flex items-center justify-between gap-4 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-blue-600 shrink-0" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900">{doc.category}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            {efList.length} fields extracted
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {doc.original_filename || doc.original_name} • {(doc.file_size / 1024).toFixed(1)} KB • SHA-256: <span className="font-mono">{doc.file_hash?.slice(0, 12)}...</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        doc.extraction_status === 'Extraction Complete' ? 'bg-emerald-100 text-emerald-800' :
                        doc.extraction_status === 'Processing' ? 'bg-blue-100 text-blue-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {doc.extraction_status}
                      </span>
                      <a
                        href={`http://127.0.0.1:8000/api/documents/${doc.id}/download`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 hover:bg-white rounded-lg text-slate-600 border border-slate-200 transition-colors shadow-2xs"
                        title="Download raw document"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </a>
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                    </div>
                  </div>

                  {/* Expanded Extracted Fields Table */}
                  {isExpanded && (
                    <div className="p-4 bg-white border-t border-slate-100 space-y-3">
                      <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                        OCR-Extracted Statutory Field Values
                      </span>
                      {efList.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No fields extracted from this file yet.</p>
                      ) : (
                        <div className="border border-slate-200 rounded-lg overflow-hidden">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                              <tr>
                                <th className="py-2 px-3">Field Name</th>
                                <th className="py-2 px-3">Extracted Value</th>
                                <th className="py-2 px-3">Confidence</th>
                                <th className="py-2 px-3">Page</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                              {efList.map((ef: ExtractedField, eIdx: number) => (
                                <tr key={eIdx} className="hover:bg-slate-50/50">
                                  <td className="py-2 px-3 font-sans font-bold text-slate-800">{ef.field_name}</td>
                                  <td className="py-2 px-3 text-slate-900 font-bold">{ef.extracted_value}</td>
                                  <td className="py-2 px-3">
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                      (ef.confidence || 0) >= 0.9 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                    }`}>
                                      {Math.round((ef.confidence || 0) * 100)}%
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 text-slate-500 font-sans">p.{ef.page_number || 1}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {doc.raw_text && (
                        <div className="pt-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                            Extracted Plain Text Preview
                          </span>
                          <div className="p-3 bg-slate-950 text-slate-300 font-mono text-[10px] rounded-lg max-h-36 overflow-y-auto leading-relaxed whitespace-pre-wrap">
                            {doc.raw_text}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. COMPLIANCE & CROSS-DOCUMENT FINDINGS TAB */}
      {activeTab === 'compliance' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                Statutory Compliance & Cross-Document Consistency Findings ({findings.length})
              </h3>
              <span className="text-[11px] text-slate-500">
                Findings are explainable evidence for scrutiny judgment; human reviewer makes final decision
              </span>
            </div>

            {findings.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl">
                ✓ No non-compliance deficiencies or cross-document contradictions detected.
              </div>
            ) : (
              <div className="space-y-4">
                {findings.map(f => (
                  <div key={f.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 space-y-3">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <SeverityBadge severity={f.severity} />
                          <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200">
                            {f.finding_type}
                          </span>
                          {f.rule_code && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                              {f.rule_code}
                            </span>
                          )}
                          <span className="text-xs font-bold text-slate-900">{f.title}</span>
                        </div>
                        <p className="text-xs text-slate-700 mt-1.5 leading-relaxed">{f.description}</p>
                      </div>

                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 ${
                        f.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                        f.status === 'Waived' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                        'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        Status: {f.status}
                      </span>
                    </div>

                    {/* Source Document & Page Reference */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] bg-white p-3 rounded-xl border border-slate-200">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Source Evidence File</span>
                        <span className="font-bold text-slate-800">
                          {f.document_name || (f.document_id ? `Document #${f.document_id}` : 'Declared Application Metrics')}
                        </span>
                        {f.page_number && <span className="text-slate-500 ml-1.5 font-normal">(Page {f.page_number})</span>}
                        {f.comparison_document_name && (
                          <div className="mt-1 text-slate-600">
                            <strong>Compared Against: </strong> {f.comparison_document_name}
                          </div>
                        )}
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Observed vs Criteria</span>
                        <div className="space-y-0.5 font-mono text-[10px]">
                          {f.expected_value && <div><span className="text-slate-500">Criteria:</span> <strong>{f.expected_value}</strong></div>}
                          {f.observed_value && <div><span className="text-slate-500">Observed:</span> <strong className="text-rose-700">{f.observed_value}</strong></div>}
                        </div>
                      </div>
                    </div>

                    {/* Evidence Excerpt */}
                    {f.evidence_excerpt && (
                      <div className="text-[11px] font-mono text-slate-700 bg-slate-100/80 p-2.5 rounded-lg border border-slate-200 whitespace-pre-wrap">
                        <span className="font-sans font-bold text-slate-500 text-[10px] block uppercase mb-0.5">Extracted Evidence Snippet:</span>
                        {f.evidence_excerpt}
                      </div>
                    )}

                    {/* Corrective Action Recommendation */}
                    {f.recommended_action && (
                      <div className="text-xs text-blue-900 bg-blue-50/70 p-2.5 rounded-xl border border-blue-200 flex items-start gap-2">
                        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                          <strong>Suggested Action: </strong> {f.recommended_action}
                        </div>
                      </div>
                    )}

                    {/* Resolution Metadata if already resolved */}
                    {f.status === 'Resolved' && f.resolution_notes && (
                      <div className="text-[11px] text-emerald-900 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                        <strong>Resolution Notes: </strong> {f.resolution_notes}
                        {f.resolved_by_name && <span className="block text-[10px] text-emerald-700 mt-0.5">Resolved by: {f.resolved_by_name}</span>}
                      </div>
                    )}

                    {/* Reviewer Resolution Controls */}
                    <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2 text-xs">
                      {f.status !== 'Resolved' && (
                        <button
                          onClick={() => handleResolveFinding(f.id, 'Resolved')}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow-2xs transition-colors"
                        >
                          Resolve Finding
                        </button>
                      )}
                      {f.status !== 'Waived' && (
                        <button
                          onClick={() => handleResolveFinding(f.id, 'Waived')}
                          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg text-xs shadow-2xs transition-colors"
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

      {/* 5. REVIEWER NOTES & QUERIES TAB */}
      {activeTab === 'comments' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
            Confidential Reviewer Notes & Queries ({comments.length})
          </h3>

          <form onSubmit={handleAddComment} className="flex gap-2">
            <input
              type="text"
              placeholder="Add confidential scrutiny observation or internal query..."
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
              <div key={c.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-bold text-slate-700">{c.reviewer_name || 'Scrutiny Officer'}</span>
                  <span>{new Date(c.created_at).toLocaleString()}</span>
                </div>
                {c.title && <div className="font-bold text-slate-800">{c.title}</div>}
                <p className="text-slate-800">{c.comment}</p>
                {c.institution_response && (
                  <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-[11px] text-emerald-900">
                    <strong>Institution Response: </strong> {c.institution_response}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. WORKFLOW AUDIT HISTORY TAB */}
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
                    {item.actor_name && (
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                        {item.actor_name} ({item.actor_role})
                      </span>
                    )}
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

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && application && (
        <Modal
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          title="Delete Application Record"
          subtitle={`Application No: ${application.application_number}`}
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
              <Trash2 className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-rose-900 leading-relaxed">
                Are you sure you want to permanently delete application <span className="font-bold">{application.application_number}</span> ({application.institution_name})? This will permanently remove all associated documents, findings, and verification records.
              </div>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
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
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
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

      {/* Action Dialog (Approve, Reject, Request Correction) */}
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

      {/* Automated Verification Report Modal */}
      <AutomatedVerificationReportModal
        report={reportData}
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
      />
    </div>
  );
};
