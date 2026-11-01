import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { DashboardAnalytics, DeadlineItem, Application } from '../types';
import { useAuth } from '../context/AuthContext';
import { ApplicationWizard } from '../components/applications/ApplicationWizard';
import {
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Cpu,
  PlusCircle,
  FolderOpen,
  ShieldCheck,
  Calendar,
  ArrowRight,
  ShieldAlert,
  ChevronRight
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

const STATUS_COLORS: Record<string, string> = {
  Draft: '#94a3b8',
  Submitted: '#3b82f6',
  'Under Review': '#6366f1',
  'Correction Required': '#f59e0b',
  Resubmitted: '#a855f7',
  Approved: '#10b981',
  Rejected: '#ef4444'
};

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [deadlines, setDeadlines] = useState<DeadlineItem[]>([]);
  const [recentApps, setRecentApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [anData, dlData, appData] = await Promise.all([
        api.getDashboardAnalytics(),
        api.getDeadlines(),
        api.getApplications()
      ]);
      setAnalytics(anData);
      setDeadlines(dlData);
      setRecentApps(appData.slice(0, 5));
    } catch (e) {
      console.error('Failed to load dashboard data', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !analytics) {
    return (
      <div className="flex items-center justify-center p-16">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const { summary } = analytics;

  const kpis = [
    {
      title: 'Total Applications',
      count: summary.total_applications,
      icon: <FileText className="w-5 h-5 text-blue-600" />,
      color: 'bg-blue-50 text-blue-900 border-blue-200',
      filter: undefined
    },
    {
      title: 'Draft Stage',
      count: summary.draft_applications,
      icon: <Clock className="w-5 h-5 text-slate-600" />,
      color: 'bg-slate-50 text-slate-800 border-slate-200',
      filter: 'Draft'
    },
    {
      title: 'Under Review',
      count: summary.under_review_applications,
      icon: <Clock className="w-5 h-5 text-indigo-600" />,
      color: 'bg-indigo-50 text-indigo-900 border-indigo-200',
      filter: 'Under Review'
    },
    {
      title: 'Awaiting Corrections',
      count: summary.awaiting_corrections_applications,
      icon: <AlertTriangle className="w-5 h-5 text-amber-600" />,
      color: 'bg-amber-50 text-amber-900 border-amber-200',
      filter: 'Correction Required'
    },
    {
      title: 'Approved (EOA)',
      count: summary.approved_applications,
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
      color: 'bg-emerald-50 text-emerald-900 border-emerald-200',
      filter: 'Approved'
    },
    {
      title: 'Rejected',
      count: summary.rejected_applications,
      icon: <XCircle className="w-5 h-5 text-rose-600" />,
      color: 'bg-rose-50 text-rose-900 border-rose-200',
      filter: 'Rejected'
    },
    {
      title: 'Overdue Actions',
      count: summary.overdue_actions,
      icon: <ShieldAlert className="w-5 h-5 text-red-600" />,
      color: 'bg-red-50 text-red-900 border-red-200',
      link: '/alerts-deadlines?status=Overdue'
    },
    {
      title: 'Compliance Findings',
      count: summary.compliance_issues_requiring_attention,
      icon: <ShieldCheck className="w-5 h-5 text-purple-600" />,
      color: 'bg-purple-50 text-purple-900 border-purple-200',
      link: '/compliance'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Welcome & Quick Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Welcome back, {user?.full_name}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            AICTE SmartApproval Operational Dashboard • Academic Session 2026-27
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate('/digital-twin')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors shadow-2xs"
          >
            <Cpu className="w-4 h-4 text-indigo-600" />
            <span>Open Digital Twin</span>
          </button>
          <button
            onClick={() => setIsWizardOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Application</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => (
          <div
            key={idx}
            onClick={() => {
              if (kpi.link) navigate(kpi.link);
              else if (kpi.filter) navigate(`/applications?status=${kpi.filter}`);
              else navigate('/applications');
            }}
            className={`p-4 rounded-2xl border cursor-pointer hover:shadow-md transition-all ${kpi.color}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold opacity-90">{kpi.title}</span>
              {kpi.icon}
            </div>
            <div className="text-2xl font-extrabold tracking-tight">{kpi.count}</div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Monthly Trend Bar Chart (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-150 mb-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900">Application Submissions & Decisions</h4>
              <p className="text-xs text-slate-500">6-Month historical approval throughput</p>
            </div>
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg">
              AY 2026-27
            </span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.monthly_trends}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '11px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="submissions" name="Submissions" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="approvals" name="Approvals" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="rejections" name="Rejections" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Status Distribution Pie Chart (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-150 mb-2">
              <h4 className="text-sm font-bold text-slate-900">Workflow Distribution</h4>
              <span className="text-xs text-slate-500">Active applications</span>
            </div>

            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.status_distribution}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={75}
                    innerRadius={45}
                    paddingAngle={4}
                  >
                    {analytics.status_distribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] || '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '11px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
            <span>Average Application Readiness:</span>
            <span className="font-bold text-blue-700 text-sm">{summary.average_readiness_score}%</span>
          </div>
        </div>
      </div>

      {/* Bottom Section: Upcoming Deadlines & Recent Applications */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Upcoming Deadlines (6 cols) */}
        <div className="lg:col-span-6 bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-150 mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <h4 className="text-sm font-bold text-slate-900">Upcoming Action Deadlines</h4>
            </div>
            <button
              onClick={() => navigate('/alerts-deadlines')}
              className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {deadlines.slice(0, 4).map((d) => (
              <div
                key={d.id}
                onClick={() => navigate(`/applications/${d.application_id}`)}
                className="p-3.5 rounded-2xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 cursor-pointer transition-all flex items-center justify-between"
              >
                <div>
                  <h5 className="text-xs font-bold text-slate-900">{d.title}</h5>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {d.institution_name} • App: {d.application_number}
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      d.status === 'Overdue'
                        ? 'bg-rose-100 text-rose-800'
                        : d.status === 'Approaching Deadline'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {d.status}
                  </span>
                  <span className="block text-[10px] text-slate-400 mt-1">
                    Due: {new Date(d.due_date).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Recent Applications (6 cols) */}
        <div className="lg:col-span-6 bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-150 mb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <h4 className="text-sm font-bold text-slate-900">Recent Applications</h4>
            </div>
            <button
              onClick={() => navigate('/applications')}
              className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
            >
              <span>View Table</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {recentApps.map((app) => (
              <div
                key={app.id}
                onClick={() => navigate(`/applications/${app.id}`)}
                className="p-3.5 rounded-2xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 cursor-pointer transition-all flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-blue-700">
                      {app.application_number}
                    </span>
                    <span className="text-[10px] text-slate-400">• {app.category}</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-800 mt-1 truncate max-w-xs">
                    {app.institution_name}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-800 block">
                    {app.readiness_score}% Score
                  </span>
                  <span className="text-[10px] text-slate-500">{app.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <ApplicationWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onSuccess={() => fetchDashboardData()}
      />
    </div>
  );
};
