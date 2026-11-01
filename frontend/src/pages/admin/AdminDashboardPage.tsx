import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { DashboardSummary, DashboardAnalytics, AuditEventItem } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldAlert,
  Users,
  Building2,
  FileCheck2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Settings,
  UserPlus,
  BookOpen,
  History
} from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [recentAudits, setRecentAudits] = useState<AuditEventItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [sum, anal, audits] = await Promise.all([
        api.getDashboardSummary(),
        api.getDashboardAnalytics(),
        api.getAuditEvents(5)
      ]);
      setSummary(sum);
      setAnalytics(anal);
      setRecentAudits(audits);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-linear-to-r from-purple-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-200 border border-purple-400/30 text-xs font-semibold uppercase tracking-wider mb-3">
            <ShieldAlert className="w-3.5 h-3.5 text-purple-300" />
            AICTE National Administration Console
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Administrator Command Center
          </h1>
          <p className="mt-2 text-purple-100/80 text-xs sm:text-sm leading-relaxed">
            System-wide regulatory governance, role-based access management, Approval Process Handbook rules, and tamper-evident audit oversight.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to="/admin/users"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <UserPlus className="w-4 h-4" />
              Manage Users
            </Link>
            <Link
              to="/admin/reviewer-assignments"
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/20 transition-colors flex items-center gap-1.5"
            >
              <FileCheck2 className="w-4 h-4" />
              Allocate Scrutinies
            </Link>
            <Link
              to="/admin/audit-trail"
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/20 transition-colors flex items-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Verify Audit Chain
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">Institutions</span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">
              {loading ? '...' : summary?.total_institutions || 1}
            </span>
            <span className="text-[11px] text-slate-500 mt-0.5 block">Approved & Affiliated</span>
          </div>
          <div className="p-3 bg-purple-50 rounded-2xl text-purple-700">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">Total Applications</span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">
              {loading ? '...' : summary?.total_applications || 0}
            </span>
            <span className="text-[11px] text-slate-500 mt-0.5 block">Current Academic Cycle</span>
          </div>
          <div className="p-3 bg-blue-50 rounded-2xl text-blue-700">
            <FileCheck2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">Under Review</span>
            <span className="text-2xl font-black text-amber-700 mt-1 block">
              {loading ? '...' : summary?.under_review || 0}
            </span>
            <span className="text-[11px] text-amber-600 font-semibold mt-0.5 block">Active Panel Scrutiny</span>
          </div>
          <div className="p-3 bg-amber-50 rounded-2xl text-amber-700">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">Approved Orders</span>
            <span className="text-2xl font-black text-emerald-700 mt-1 block">
              {loading ? '...' : summary?.approved || 0}
            </span>
            <span className="text-[11px] text-emerald-600 font-semibold mt-0.5 block">Approval Orders Issued</span>
          </div>
          <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-700">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Two-Column Oversight Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Workflow Distribution & Quick Links */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-150 mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-700" />
                Dossier Status Distribution
              </h3>
              <Link to="/admin/applications" className="text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1">
                View All
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-150">
                <span className="text-slate-500 font-medium block">Drafting</span>
                <span className="text-lg font-black text-slate-800">{summary?.draft || 0}</span>
              </div>
              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-150">
                <span className="text-blue-700 font-medium block">Submitted (Pending)</span>
                <span className="text-lg font-black text-blue-800">{summary?.submitted || 0}</span>
              </div>
              <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-150">
                <span className="text-amber-700 font-medium block">Under Review</span>
                <span className="text-lg font-black text-amber-800">{summary?.under_review || 0}</span>
              </div>
              <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-150">
                <span className="text-rose-700 font-medium block">Correction Notice</span>
                <span className="text-lg font-black text-rose-800">{summary?.correction_required || 0}</span>
              </div>
              <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-150">
                <span className="text-emerald-700 font-medium block">Approved</span>
                <span className="text-lg font-black text-emerald-800">{summary?.approved || 0}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-150">
                <span className="text-slate-500 font-medium block">Rejected</span>
                <span className="text-lg font-black text-slate-800">{summary?.rejected || 0}</span>
              </div>
            </div>
          </div>

          {/* Core Admin Shortcuts */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link
              to="/admin/compliance-rules"
              className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-purple-400 shadow-2xs hover:shadow-md transition-all group"
            >
              <BookOpen className="w-5 h-5 text-purple-700 mb-2 group-hover:scale-110 transition-transform" />
              <h4 className="font-bold text-xs text-slate-900 group-hover:text-purple-700">APH Compliance Rules</h4>
              <p className="text-[11px] text-slate-500 mt-1">Configure regulatory norms, land area, & cadre ratios</p>
            </Link>

            <Link
              to="/admin/reviewer-assignments"
              className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-purple-400 shadow-2xs hover:shadow-md transition-all group"
            >
              <Users className="w-5 h-5 text-purple-700 mb-2 group-hover:scale-110 transition-transform" />
              <h4 className="font-bold text-xs text-slate-900 group-hover:text-purple-700">Reviewer Assignments</h4>
              <p className="text-[11px] text-slate-500 mt-1">Allocate scrutiny dossiers to committee members</p>
            </Link>

            <Link
              to="/admin/audit-trail"
              className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-purple-400 shadow-2xs hover:shadow-md transition-all group"
            >
              <History className="w-5 h-5 text-purple-700 mb-2 group-hover:scale-110 transition-transform" />
              <h4 className="font-bold text-xs text-slate-900 group-hover:text-purple-700">Tamper-Evident Audits</h4>
              <p className="text-[11px] text-slate-500 mt-1">SHA-256 blockchain-style forensic activity verification</p>
            </Link>
          </div>
        </div>

        {/* Right Column: Recent Audits Live Stream */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-150">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Live Audit Log
            </h3>
            <Link to="/admin/audit-trail" className="text-xs font-bold text-purple-700 hover:text-purple-900">
              Full Trail
            </Link>
          </div>

          <div className="space-y-3">
            {recentAudits.map((item) => (
              <div key={item.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-slate-800">{item.action || item.action_type}</span>
                  <span className="text-slate-400">
                    {new Date(item.created_at || item.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-slate-600 line-clamp-1">{item.details || `${item.entity_type || 'Event'} #${item.entity_id || item.id}`}</p>
                <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1">
                  <span>Actor: {item.user_email || item.actor_email || 'System'}</span>
                  <span className="font-mono text-purple-700 truncate max-w-[100px]">{((item.hash || item.event_hash) ?? '').slice(0, 8)}...</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
