import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { DashboardAnalytics, DeadlineItem, Application } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../../components/common/StatusBadge';
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
  Layers
} from 'lucide-react';

export const ReviewerDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [deadlines, setDeadlines] = useState<DeadlineItem[]>([]);
  const [assignedApps, setAssignedApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [anData, dlData, appData] = await Promise.all([
        api.getDashboardAnalytics(),
        api.getDeadlines(),
        api.getApplications()
      ]);
      setAnalytics(anData);
      setDeadlines(dlData);
      setAssignedApps(appData);
    } catch (e) {
      console.error('Failed to load reviewer dashboard data', e);
    } finally {
      setLoading(false);
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
  const activeReviews = assignedApps.filter((a) => a.status === 'Under Review' || a.status === 'Correction Required');

  return (
    <div className="space-y-6">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">AICTE Scrutiny & Compliance Dashboard</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {user?.full_name} • {user?.designation || 'Senior Scrutiny Officer'} • Official Committee Workbench
          </p>
        </div>

        <button
          onClick={() => navigate('/reviewer/review-queue')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
        >
          <UserCheck className="w-4 h-4" />
          <span>Open Scrutiny Workbench (Dual-Pane)</span>
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Scrutiny Dossiers</span>
            <FileText className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{assignedApps.length}</div>
          <span className="text-[11px] text-slate-400">In assigned queue</span>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Active Under Review</span>
            <Clock className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-indigo-600 mt-2">{summary.under_review_applications}</div>
          <span className="text-[11px] text-slate-400">Scrutiny underway</span>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Deficiency Notices</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-600 mt-2">{summary.awaiting_corrections_applications}</div>
          <span className="text-[11px] text-amber-600 font-medium">Awaiting institution reply</span>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Approved Decisions</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 mt-2">{summary.approved_applications}</div>
          <span className="text-[11px] text-slate-400">Orders issued</span>
        </div>
      </div>

      {/* Reviewer Scrutiny Queue Highlights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scrutiny Queue */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900">Priority Scrutiny Queue</h4>
              <p className="text-xs text-slate-500">Applications requiring scrutiny examination or deficiency follow-up</p>
            </div>
            <button
              onClick={() => navigate('/reviewer/assigned-applications')}
              className="text-xs font-semibold text-blue-700 hover:underline"
            >
              View all ({assignedApps.length}) →
            </button>
          </div>

          <div className="space-y-3">
            {assignedApps.length === 0 ? (
              <div className="text-center p-8 text-xs text-slate-400">No applications in your review queue.</div>
            ) : (
              assignedApps.slice(0, 5).map((app) => (
                <div
                  key={app.id}
                  onClick={() => navigate(`/reviewer/applications/${app.id}`)}
                  className="p-4 rounded-2xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/20 transition-all cursor-pointer flex items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-blue-700">{app.application_number}</span>
                      <StatusBadge status={app.status} />
                    </div>
                    <p className="text-xs font-semibold text-slate-900">{app.institution_name}</p>
                    <div className="text-[11px] text-slate-400">
                      {app.category} • {app.academic_year}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-900">{app.readiness_score}%</span>
                      <span className="block text-[10px] text-slate-400">Readiness</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* SLA Milestones & Deadlines */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-slate-900">Scrutiny SLA Windows</h4>
              <button
                onClick={() => navigate('/reviewer/deadlines')}
                className="text-xs font-semibold text-blue-700 hover:underline"
              >
                View all →
              </button>
            </div>

            <div className="space-y-3">
              {deadlines.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">No active SLA windows.</div>
              ) : (
                deadlines.slice(0, 4).map((dl) => (
                  <div key={dl.id} className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 truncate max-w-[170px]">{dl.title}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800 shrink-0">
                        {dl.days_remaining}d left
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span className="font-mono">{dl.application_number}</span>
                      <span>Due: {new Date(dl.due_date).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4">
            <button
              onClick={() => navigate('/reviewer/compliance')}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs transition-colors flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4 text-slate-600" />
              <span>Inspect Cross-Evidence Inconsistencies</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
