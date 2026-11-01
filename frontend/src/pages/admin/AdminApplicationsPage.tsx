import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { Application, User } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useNotifications } from '../../context/NotificationContext';
import {
  FileCheck2,
  Search,
  Filter,
  Building2,
  Calendar,
  Users,
  Eye,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';

export const AdminApplicationsPage: React.FC = () => {
  const { showToast } = useNotifications();
  const [applications, setApplications] = useState<Application[]>([]);
  const [reviewers, setReviewers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [apps, revs] = await Promise.all([
        api.getApplications(),
        api.getReviewers()
      ]);
      setApplications(apps);
      setReviewers(revs);
    } catch (e: any) {
      showToast('error', 'Failed to load applications', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAssign = async (appId: number, reviewerId: number) => {
    try {
      await api.assignReviewer(appId, reviewerId);
      showToast('success', 'Reviewer Assigned', 'Application transitioned to scrutiny.');
      loadData();
    } catch (e: any) {
      showToast('error', 'Assignment failed', e.message);
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-purple-700 uppercase tracking-wider mb-1">
            <FileCheck2 className="w-4 h-4" />
            Central Regulatory Oversight
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">All Institutional Applications</h1>
          <p className="text-sm text-slate-600 mt-1">
            Master repository of all approval submissions across all institutes, programmes, and scrutiny states.
          </p>
        </div>

        <Link
          to="/admin/reviewer-assignments"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors shrink-0"
        >
          <Users className="w-4 h-4" />
          Reviewer Allocation Console
        </Link>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by app #, institution, programme..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-600 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs text-slate-500 font-semibold">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-purple-600"
          >
            <option value="all">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Submitted">Submitted (Pending Allocation)</option>
            <option value="Under Review">Under Review</option>
            <option value="Correction Required">Correction Required</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-slate-500">Loading applications...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300">
          <FileCheck2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">No applications found</h3>
          <p className="text-xs text-slate-500 mt-1">Try adjusting your filters.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Application Number</th>
                  <th className="px-5 py-3">Institution & Programme</th>
                  <th className="px-5 py-3">Current Status</th>
                  <th className="px-5 py-3">Assigned Reviewer</th>
                  <th className="px-5 py-3">Risk Level</th>
                  <th className="px-5 py-3 text-right">Scrutiny Allocation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(app => (
                  <tr key={app.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="font-mono text-xs font-bold text-purple-800 bg-purple-50 px-2.5 py-0.5 rounded-md border border-purple-150">
                        {app.application_number}
                      </span>
                      <div className="text-[10px] text-slate-400 mt-0.5">AY {app.academic_year}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-900">{app.institution_name}</div>
                      <div className="text-[11px] text-slate-500">{app.programme} • {app.application_type}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={app.status} size="sm" />
                    </td>
                    <td className="px-5 py-3.5">
                      {app.assigned_reviewer_id ? (
                        <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-blue-600" />
                          Reviewer #{app.assigned_reviewer_id}
                        </span>
                      ) : (
                        <span className="text-amber-600 font-bold text-[11px] bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        app.risk_level === 'High' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                        app.risk_level === 'Medium' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {app.risk_level || 'Low'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {reviewers.length > 0 && (
                        <select
                          value={app.assigned_reviewer_id || ''}
                          onChange={(e) => handleQuickAssign(app.id, parseInt(e.target.value))}
                          className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 focus:ring-2 focus:ring-purple-600 focus:outline-hidden"
                        >
                          <option value="">Assign Reviewer...</option>
                          {reviewers.map(r => (
                            <option key={r.id} value={r.id}>
                              {r.full_name}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
