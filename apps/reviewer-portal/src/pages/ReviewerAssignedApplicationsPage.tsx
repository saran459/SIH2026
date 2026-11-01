import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Application } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
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
  ChevronRight,
  Trash2
} from 'lucide-react';

export const ReviewerAssignedApplicationsPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useNotifications();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [rosterTab, setRosterTab] = useState<'all' | 'assigned' | 'unassigned'>('all');

  // Delete Modal State
  const [deleteModalApp, setDeleteModalApp] = useState<Application | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    loadAssignedApplications();

    // Safe periodic polling every 8 seconds to automatically pick up newly submitted applications
    const interval = setInterval(() => {
      loadAssignedApplications(false);
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  const loadAssignedApplications = async (showLoadingSpinner: boolean = true) => {
    if (showLoadingSpinner) setLoading(true);
    try {
      const data = await api.getApplications();
      setApplications(data);
    } catch (e: any) {
      console.error(e);
      showToast('error', 'Failed to load applications', e.message);
    } finally {
      if (showLoadingSpinner) setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteModalApp) return;
    try {
      setDeleteLoading(true);
      await api.deleteApplication(deleteModalApp.id);
      showToast('success', 'Application Deleted', `Application ${deleteModalApp.application_number} permanently deleted.`);
      setDeleteModalApp(null);
      await loadAssignedApplications(false);
    } catch (e: any) {
      showToast('error', 'Delete failed', e.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const filtered = applications.filter(app => {
    // Roster tab filter
    if (rosterTab === 'assigned' && app.assigned_reviewer_id !== user?.id) {
      return false;
    }
    if (rosterTab === 'unassigned' && app.assigned_reviewer_id) {
      return false;
    }

    // Status filter
    if (statusFilter !== 'all' && app.status !== statusFilter) {
      return false;
    }

    // Search query
    if (search) {
      const query = search.toLowerCase();
      const numMatch = (app.application_number || '').toLowerCase().includes(query);
      const nameMatch = (app.institution_name || '').toLowerCase().includes(query);
      const catMatch = (app.category || '').toLowerCase().includes(query);
      return numMatch || nameMatch || catMatch;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 uppercase tracking-wider mb-1">
            <FileCheck2 className="w-4 h-4" />
            Statutory Approval Dossiers
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Institutional Applications Directory
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            View, scrutinize, or manage institutional approval submissions for Academic Year 2026-27.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/reviewer/review-queue"
            className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-2xs transition-colors flex items-center gap-1.5"
          >
            <span>Open Review Queue</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Roster Tabs */}
        <div className="flex items-center p-1 bg-slate-100 rounded-xl w-full md:w-auto">
          <button
            onClick={() => setRosterTab('all')}
            className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              rosterTab === 'all'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Applications ({applications.length})
          </button>
          <button
            onClick={() => setRosterTab('assigned')}
            className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              rosterTab === 'assigned'
                ? 'bg-white text-blue-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Assigned to Me ({applications.filter(a => a.assigned_reviewer_id === user?.id).length})
          </button>
          <button
            onClick={() => setRosterTab('unassigned')}
            className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              rosterTab === 'unassigned'
                ? 'bg-white text-amber-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Available in Queue ({applications.filter(a => !a.assigned_reviewer_id).length})
          </button>
        </div>

        {/* Search & Status Filters */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by app # or college..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
          >
            <option value="all">All Statuses</option>
            <option value="Submitted">Submitted</option>
            <option value="Under Review">Under Review</option>
            <option value="Correction Required">Correction Required</option>
            <option value="Resubmitted">Resubmitted</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Applications Cards Grid */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-slate-500">Loading assigned applications...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300">
          <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">
            {search || statusFilter !== 'all' ? 'No applications found' : 'No applications yet'}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {search || statusFilter !== 'all'
              ? 'No assigned applications match your filter criteria.'
              : 'You do not have any applications assigned currently. Check the Review Queue for unassigned submitted files.'}
          </p>
          {(search || statusFilter !== 'all') && (
            <button
              onClick={() => { setSearch(''); setStatusFilter('all'); }}
              className="mt-4 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer"
            >
              Clear Filters
            </button>
          )}
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
                  {app.program || app.programme || 'Technical & Engineering'} • {app.academic_year || '2026-27'}
                </p>

                {!app.assigned_reviewer_id && (
                  <div className="mt-2">
                    <span className="text-[10px] font-extrabold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 inline-block">
                      ★ Awaiting Reviewer Assignment
                    </span>
                  </div>
                )}

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

              {/* Action Buttons: View Details, Scrutinize, and Delete */}
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
                <button
                  type="button"
                  onClick={() => setDeleteModalApp(app)}
                  className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl border border-rose-200 transition-colors cursor-pointer"
                  title="Permanently Delete Application"
                >
                  <Trash2 className="w-4 h-4 text-rose-600" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

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
    </div>
  );
};
