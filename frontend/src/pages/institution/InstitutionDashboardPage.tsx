import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { DashboardAnalytics, DeadlineItem, Application } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ScoreGauge } from '../../components/common/ScoreGauge';
import {
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  PlusCircle,
  FolderOpen,
  ShieldCheck,
  ChevronRight,
  ArrowRight
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

export const InstitutionDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [deadlines, setDeadlines] = useState<DeadlineItem[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
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
      setApplications(appData);
    } catch (e) {
      console.error('Failed to load institution dashboard data', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !analytics) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const { summary } = analytics;

  return (
    <div className="space-y-6">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Institutional Approval Dashboard</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {user?.institution_name || 'Greenfield Institute of Technology'} • AICTE APH 2026-27 Compliance
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/institution/digital-twin')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors"
          >
            <Cpu className="w-4 h-4 text-emerald-700" />
            <span>Digital Twin Simulator</span>
          </button>
          <button
            onClick={() => navigate('/institution/applications/new')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Application</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">My Applications</span>
            <FileText className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{summary.total_applications}</div>
          <span className="text-[11px] text-slate-400">Total dossiers registered</span>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">In Draft</span>
            <Clock className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{summary.draft_applications}</div>
          <span className="text-[11px] text-slate-400">Pending submission</span>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Under Review</span>
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-blue-600 mt-2">{summary.under_review_applications}</div>
          <span className="text-[11px] text-slate-400">In scrutiny committee</span>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Corrections Required</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-600 mt-2">{summary.awaiting_corrections_applications}</div>
          <span className="text-[11px] text-amber-600 font-medium">Requires institutional reply</span>
        </div>
      </div>

      {/* Readiness Model & What-If Simulator Feature Card */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 rounded-3xl p-6 lg:p-8 text-white border border-emerald-800/60 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-3 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <Cpu className="w-3.5 h-3.5" />
            <span>AICTE Approval Digital Twin</span>
          </div>
          <h3 className="text-xl font-extrabold tracking-tight">Interactive What-If Scenario Simulator</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Test hypothetical corrective actions without altering your live database records. Simulate missing NOC uploads, faculty headcount adjustments, and infrastructure remediations to see instant score projection deltas.
          </p>
          <div className="pt-2">
            <button
              onClick={() => navigate('/institution/digital-twin')}
              className="py-2.5 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition-all flex items-center gap-2"
            >
              <span>Launch What-If Simulator</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="bg-slate-900/90 rounded-2xl p-5 border border-emerald-700/40 flex flex-col items-center text-center shrink-0 w-52">
          <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2">Readiness Index</span>
          <ScoreGauge score={summary.average_readiness_score} size="md" />
          <span className="text-[10px] text-emerald-400 mt-2 font-semibold">Institutional Average</span>
        </div>
      </div>

      {/* Applications List & Deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Applications List */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-slate-900">Registered Applications</h4>
            <button
              onClick={() => navigate('/institution/applications')}
              className="text-xs font-semibold text-emerald-700 hover:underline"
            >
              View all ({applications.length}) →
            </button>
          </div>

          <div className="space-y-3">
            {applications.length === 0 ? (
              <div className="text-center p-8 text-xs text-slate-400">No applications registered.</div>
            ) : (
              applications.slice(0, 4).map((app) => (
                <div
                  key={app.id}
                  onClick={() => navigate(`/institution/applications/${app.id}`)}
                  className="p-4 rounded-2xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all cursor-pointer flex items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-emerald-700">{app.application_number}</span>
                      <StatusBadge status={app.status} />
                    </div>
                    <div className="text-xs text-slate-600 font-medium">
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

        {/* Action Deadlines */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-slate-900">Upcoming Deadlines</h4>
              <button
                onClick={() => navigate('/institution/alerts')}
                className="text-xs font-semibold text-emerald-700 hover:underline"
              >
                View all →
              </button>
            </div>

            <div className="space-y-3">
              {deadlines.length === 0 ? (
                <div className="text-center p-8 text-xs text-slate-400">No active deadlines.</div>
              ) : (
                deadlines.slice(0, 4).map((dl) => (
                  <div key={dl.id} className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{dl.title}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">
                        {dl.days_remaining}d left
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Due: {new Date(dl.due_date).toLocaleDateString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4">
            <button
              onClick={() => navigate('/institution/documents')}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs transition-colors flex items-center justify-center gap-2"
            >
              <FolderOpen className="w-4 h-4 text-slate-600" />
              <span>Open Document Centre</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
