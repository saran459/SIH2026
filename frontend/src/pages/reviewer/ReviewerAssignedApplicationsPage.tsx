import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { Application } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import {
  FileCheck2,
  Search,
  Filter,
  ArrowRight,
  Clock,
  AlertTriangle,
  Building2,
  ShieldCheck,
  Calendar,
  Layers,
  ChevronRight
} from 'lucide-react';

export const ReviewerAssignedApplicationsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadAssignedApplications();
  }, []);

  const loadAssignedApplications = async () => {
    setLoading(true);
    try {
      const data = await api.getApplications();
      // Filter to applications specifically assigned to this reviewer
      const assigned = data.filter(a => a.assigned_reviewer_id === user?.id);
      setApplications(assigned.length > 0 ? assigned : data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = applications.filter(app => {
    const matchesSearch =
      (app.application_number || '').toLowerCase().includes(search.toLowerCase()) ||
      (app.institution_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (app.programme || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 uppercase tracking-wider mb-1">
            <FileCheck2 className="w-4 h-4" />
            AICTE Scrutiny Roster
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Assigned Applications</h1>
          <p className="text-sm text-slate-600 mt-1">
            Applications allocated to your scrutiny roster for regulatory evaluation and compliance verification.
          </p>
        </div>

        <Link
          to="/reviewer/review-queue"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors shrink-0"
        >
          Open Dual-Pane Workbench
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by app #, institution, programme..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold">Filter:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
          >
            <option value="all">All Statuses</option>
            <option value="Under Review">Under Review</option>
            <option value="Correction Required">Correction Required</option>
            <option value="Submitted">Submitted (Pending)</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Applications Grid / Table */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-slate-500">Loading assigned applications...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300">
          <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">No applications found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {search || statusFilter !== 'all'
              ? 'No assigned applications match your filter criteria.'
              : 'You do not have any applications assigned currently. Check the Review Queue for unassigned submitted files.'}
          </p>
          <button
            onClick={() => { setSearch(''); setStatusFilter('all'); }}
            className="mt-4 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((app) => (
            <div
              key={app.id}
              className="bg-white rounded-2xl border border-slate-200 hover:border-blue-400 p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-150">
                    {app.application_number}
                  </span>
                  <StatusBadge status={app.status} />
                </div>

                <h3 className="font-bold text-slate-900 text-sm group-hover:text-blue-700 transition-colors line-clamp-1">
                  {app.institution_name || `Institution #${app.institution_id}`}
                </h3>

                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  {app.programme || 'Technical & Engineering'} • {app.academic_year || '2025-26'}
                </p>

                <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-50 p-2 rounded-xl">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Deficiencies</span>
                    <span className={`font-bold ${app.deficiency_count && app.deficiency_count > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {app.deficiency_count || 0} Open
                    </span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-xl">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Risk Level</span>
                    <span className={`font-bold ${app.risk_level === 'High' ? 'text-rose-600' : app.risk_level === 'Medium' ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {app.risk_level || 'Low'}
                    </span>
                  </div>
                </div>

                {app.submitted_at && (
                  <div className="mt-3 text-[11px] text-slate-400 flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" />
                    Submitted: {new Date(app.submitted_at).toLocaleDateString()}
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                <Link
                  to={`/reviewer/applications/${app.id}`}
                  className="flex-1 py-2 px-3 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 hover:border-blue-200 transition-all text-center"
                >
                  View Details
                </Link>
                <Link
                  to={`/reviewer/review-queue?appId=${app.id}`}
                  className="py-2 px-3 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-2xs transition-colors flex items-center gap-1"
                  title="Open Dual-Pane Scrutiny"
                >
                  Scrutinize
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
