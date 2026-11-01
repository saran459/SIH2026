import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import {
  DashboardAnalytics,
  DeadlineItem,
  Application,
  ReviewerLiveStatus,
  VerificationJob,
  ApplicationReportDetail
} from '../types';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { AutomatedVerificationReportModal } from '../components/reports/AutomatedVerificationReportModal';
import { useNotifications } from '../context/NotificationContext';
import {
  UserCheck,
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  RotateCw,
  AlertOctagon,
  Eye,
  Activity,
  Layers,
  Sparkles,
  Trash2
} from 'lucide-react';

export const ReviewerDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useNotifications();

  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [deadlines, setDeadlines] = useState<DeadlineItem[]>([]);
  const [assignedApps, setAssignedApps] = useState<Application[]>([]);
  const [liveStatus, setLiveStatus] = useState<ReviewerLiveStatus>({
    processing: 0,
    completed: 0,
    flagged_for_manual_review: 0,
    processing_failed: 0,
    ready_for_reviewer_decision: 0,
    total_active_queue: 0,
    recent_jobs: []
  });
  const [loading, setLoading] = useState(true);
  const [retryingJobId, setRetryingJobId] = useState<string | null>(null);

  // Selected report for modal
  const [selectedReport, setSelectedReport] = useState<ApplicationReportDetail | null>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);

  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    fetchInitialData();
    setupSSE();

    // Safe periodic fallback polling every 6 seconds
    const interval = setInterval(() => {
      refreshLiveStatus();
    }, 6000);

    return () => {
      clearInterval(interval);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const setupSSE = () => {
    try {
      const token = localStorage.getItem('aicte_token');
      // Connect to real-time events stream
      const es = new EventSource(api.getReviewerStreamUrl());
      eventSourceRef.current = es;

      es.addEventListener('update', (e) => {
        try {
          const payload = JSON.parse(e.data);
          // Auto refresh live counters on backend job state change
          refreshLiveStatus();
          if (payload.event === 'APPLICATION_SUBMITTED') {
            showToast('info', 'New Dossier Submitted', `Application ${payload.data.application_number} submitted by ${payload.data.institution_name}.`);
          } else if (payload.event === 'JOB_COMPLETED') {
            showToast('info', 'Verification Completed', `Application #${payload.data.application_id} verification finished (${payload.data.status}).`);
          } else if (payload.event === 'JOB_FAILED') {
            showToast('error', 'Job Failed', `Processing failed for Application #${payload.data.application_id}.`);
          }
        } catch {
          // ignore
        }
      });

      es.onerror = () => {
        // SSE disconnected, fallback polling handles updates
        es.close();
      };
    } catch {
      // SSE unsupported or network error, fallback polling handles it
    }
  };

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [anData, dlData, appData, statusData] = await Promise.all([
        api.getDashboardAnalytics(),
        api.getDeadlines(),
        api.getApplications(),
        api.getReviewerLiveStatus()
      ]);
      setAnalytics(anData);
      setDeadlines(dlData);
      setAssignedApps(appData);
      setLiveStatus(statusData);
    } catch (e) {
      console.error('Failed to load reviewer dashboard data', e);
    } finally {
      setLoading(false);
    }
  };

  const refreshLiveStatus = async () => {
    try {
      const [statusData, appData] = await Promise.all([
        api.getReviewerLiveStatus(),
        api.getApplications()
      ]);
      setLiveStatus(statusData);
      setAssignedApps(appData);
    } catch {
      // ignore
    }
  };

  const handleRetryJob = async (jobId: string) => {
    setRetryingJobId(jobId);
    try {
      await api.retryVerificationJob(jobId);
      showToast('success', 'Retry Scheduled', 'Job returned to pending verification queue.');
      await refreshLiveStatus();
    } catch (e: any) {
      showToast('error', 'Retry Failed', e.message);
    } finally {
      setRetryingJobId(null);
    }
  };

  const handleViewReport = async (applicationId: number) => {
    try {
      const report = await api.getApplicationVerificationReport(applicationId);
      setSelectedReport(report);
      setReportModalOpen(true);
    } catch (e: any) {
      showToast('info', 'Report Pending', 'Automated verification is still running or pending.');
    }
  };

  if (loading || !analytics) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const { summary } = analytics;

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Primary Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            AICTE Scrutiny & Regulatory Verification Dashboard
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Scrutiny Committee Desk</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {user?.full_name} • {user?.designation || 'Senior Scrutiny Officer'} • Fully Automated Pre-Verification System Active
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refreshLiveStatus()}
            className="p-2 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors shadow-2xs"
            title="Refresh Live Status"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate('/review-queue')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
          >
            <UserCheck className="w-4 h-4" />
            <span>Open Dual-Pane Workbench</span>
          </button>
        </div>
      </div>

      {/* 5 DISTINCT REAL-TIME AUTOMATED VERIFICATION METRIC CARDS */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-blue-600" />
            Automated Application Verification Engine • Live Telemetry
          </h3>
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live SSE Connected
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          
          {/* 1. Processing */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Processing</span>
              <RotateCw className={`w-4 h-4 text-blue-600 ${liveStatus.processing > 0 ? 'animate-spin' : ''}`} />
            </div>
            <div className="mt-2">
              <span className="text-3xl font-black text-blue-600">{liveStatus.processing}</span>
              <p className="text-[10px] text-slate-400 mt-0.5">Undergoing auto-analysis</p>
            </div>
          </div>

          {/* 2. Completed */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Completed</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2">
              <span className="text-3xl font-black text-emerald-700">{liveStatus.completed}</span>
              <p className="text-[10px] text-slate-400 mt-0.5">Clean statutory reports</p>
            </div>
          </div>

          {/* 3. Needs Manual Review */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Needs Manual Review</span>
              <AlertOctagon className="w-4 h-4 text-amber-600" />
            </div>
            <div className="mt-2">
              <span className="text-3xl font-black text-amber-700">{liveStatus.needs_manual_review ?? liveStatus.flagged_for_manual_review}</span>
              <p className="text-[10px] text-slate-400 mt-0.5">Exceptions require judgment</p>
            </div>
          </div>

          {/* 4. Failed */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Failed</span>
              <XCircle className="w-4 h-4 text-rose-600" />
            </div>
            <div className="mt-2">
              <span className="text-3xl font-black text-rose-700">{liveStatus.failed ?? liveStatus.processing_failed}</span>
              <p className="text-[10px] text-slate-400 mt-0.5">Safe retry available</p>
            </div>
          </div>

          {/* 5. Ready for Reviewer Decision */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Ready for Decision</span>
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="mt-2">
              <span className="text-3xl font-black text-indigo-700">{liveStatus.ready_for_reviewer_decision}</span>
              <p className="text-[10px] text-slate-400 mt-0.5">Awaiting committee order</p>
            </div>
          </div>

        </div>
      </div>

      {/* RECENT AUTOMATED VERIFICATION JOBS & LIVE PROGRESS */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              Automated Background Verification Queue & Audit Stream
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Each submission enqueues an idempotent verification job. Pending jobs recover automatically upon server restart.
            </p>
          </div>
          <button
            onClick={() => navigate('/reports')}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <span>View All Reports</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {liveStatus.recent_jobs.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <h4 className="text-xs font-bold text-slate-700">No Verification Jobs Queued</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Submit an application from the Institution Portal to observe automatic triggering.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {liveStatus.recent_jobs.map((job) => (
              <div key={job.id} className="py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-bold text-slate-900">
                      {job.application_number || `Application #${job.application_id}`}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      job.status === 'Processing' || job.status === 'PROCESSING' ? 'bg-blue-100 text-blue-800 animate-pulse' :
                      job.status === 'Completed' || job.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                      job.status === 'Needs Manual Review' || job.status === 'FLAGGED_FOR_MANUAL_REVIEW' ? 'bg-amber-100 text-amber-800' :
                      job.status === 'Failed' || job.status === 'FAILED' ? 'bg-rose-100 text-rose-800' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {job.status === 'Processing' || job.status === 'PROCESSING' ? `Analyzing (${job.progress_percent}%)` : job.status}
                    </span>
                    {job.trigger_source && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        via {job.trigger_source}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {job.institution_name || 'Institutional Applicant'} • Stage: <strong>{job.stage.replace(/_/g, ' ')}</strong>
                  </p>

                  {(job.status === 'Processing' || job.status === 'PROCESSING') && (
                    <div className="w-48 bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
                      <div
                        className="bg-blue-600 h-full rounded-full transition-all duration-300"
                        style={{ width: `${job.progress_percent}%` }}
                      />
                    </div>
                  )}

                  {job.error_message && (
                    <p className="text-[11px] font-medium text-rose-600 mt-1">
                      Error: {job.error_message}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {(job.status === 'Failed' || job.status === 'FAILED') && (
                    <button
                      onClick={() => handleRetryJob(job.job_id)}
                      disabled={retryingJobId === job.job_id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 transition-colors"
                    >
                      <RotateCw className={`w-3.5 h-3.5 ${retryingJobId === job.job_id ? 'animate-spin' : ''}`} />
                      <span>Retry Job</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleViewReport(job.application_id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5 text-blue-600" />
                    <span>View Report</span>
                  </button>

                  <button
                    onClick={() => navigate(`/applications/${job.application_id}`)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Open Dossier"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main Review Queue Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Assigned Scrutiny Applications */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Scrutiny Dossier Queue</h3>
              <p className="text-xs text-slate-500 mt-0.5">Assigned dossiers & incoming unassigned submissions</p>
            </div>
            <button
              onClick={() => navigate('/assigned-applications')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>View All ({assignedApps.length})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {assignedApps.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <ShieldCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <h4 className="text-xs font-bold text-slate-700">No applications in queue</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Submitted applications will appear here automatically when submitted by institutions.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {[...assignedApps].sort((a, b) => b.id - a.id).slice(0, 10).map((app) => (
                <div
                  key={app.id}
                  onClick={() => navigate(`/applications/${app.id}`)}
                  className="py-3.5 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/60 p-2 rounded-xl transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900">{app.application_number}</span>
                      <StatusBadge status={app.status} />
                      {!app.assigned_reviewer_id && (
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                          Unassigned Pool
                        </span>
                      )}
                      {app.requires_human_verification && (
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          Needs Officer Determination
                        </span>
                      )}
                    </div>
                    <h4 className="text-xs font-medium text-slate-700 mt-1">{app.institution_name || 'Institutional Applicant'}</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {app.program || app.programme} • Intake: {app.total_intake_declared || app.total_intake}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold text-slate-900">Score: {app.readiness_score}%</div>
                    <span className="text-[10px] text-slate-400">
                      {app.documents_count} docs • {app.open_findings_count} deficiencies
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Approaching & Overdue Deadlines */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Statutory SLA Milestones</h3>
              <p className="text-xs text-slate-500 mt-0.5">AICTE Approval Process deadlines</p>
            </div>
            <button
              onClick={() => navigate('/deadlines')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>Deadlines</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {deadlines.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <h4 className="text-xs font-bold text-slate-700">No active deadlines</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">All statutory milestones are on schedule.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {deadlines.slice(0, 4).map((d) => (
                <div key={d.id} className="p-3 bg-slate-50/70 border border-slate-200/70 rounded-2xl space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-900">{d.title}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      d.status === 'Overdue' ? 'bg-rose-100 text-rose-800' :
                      d.status === 'Approaching Deadline' ? 'bg-amber-100 text-amber-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {d.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center justify-between">
                    <span>Due: {new Date(d.due_date).toLocaleDateString()}</span>
                    <span className="font-mono text-slate-600">{d.application_number}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Verification Report Modal */}
      <AutomatedVerificationReportModal
        report={selectedReport}
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
      />

    </div>
  );
};
