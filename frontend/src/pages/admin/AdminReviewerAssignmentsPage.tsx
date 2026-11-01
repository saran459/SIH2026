import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Application, User } from '../../types';
import { useNotifications } from '../../context/NotificationContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import {
  Users,
  UserCheck,
  FileCheck2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Clock,
  Sparkles,
  Building2,
  Search
} from 'lucide-react';

export const AdminReviewerAssignmentsPage: React.FC = () => {
  const { showToast } = useNotifications();
  const [applications, setApplications] = useState<Application[]>([]);
  const [reviewers, setReviewers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppId, setSelectedAppId] = useState<number | null>(null);
  const [selectedReviewerId, setSelectedReviewerId] = useState<number | null>(null);
  const [assigning, setAssigning] = useState(false);

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
      if (revs.length > 0) setSelectedReviewerId(revs[0].id);
    } catch (e: any) {
      showToast('error', 'Failed to load assignment data', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (appId: number, reviewerId: number) => {
    setAssigning(true);
    try {
      await api.assignReviewer(appId, reviewerId);
      const rev = reviewers.find(r => r.id === reviewerId);
      showToast('success', 'Reviewer Assigned', `Dossier assigned to ${rev?.full_name || 'Reviewer'}.`);
      await loadData();
    } catch (e: any) {
      showToast('error', 'Assignment Failed', e.message);
    } finally {
      setAssigning(false);
    }
  };

  const handleAutoBalance = async () => {
    if (reviewers.length === 0) return;
    const unassigned = applications.filter(a => !a.assigned_reviewer_id && (a.status === 'Submitted' || a.status === 'Draft'));
    if (unassigned.length === 0) {
      showToast('info', 'No Unassigned Dossiers', 'All submitted applications are already allocated.');
      return;
    }

    setAssigning(true);
    try {
      let rIdx = 0;
      for (const app of unassigned) {
        const rev = reviewers[rIdx % reviewers.length];
        await api.assignReviewer(app.id, rev.id);
        rIdx++;
      }
      showToast('success', 'Auto-Balance Complete', `Equitably allocated ${unassigned.length} dossiers across committee.`);
      await loadData();
    } catch (e: any) {
      showToast('error', 'Auto-balance encountered an error', e.message);
    } finally {
      setAssigning(false);
    }
  };

  const unassignedApps = applications.filter(a => !a.assigned_reviewer_id);
  const assignedApps = applications.filter(a => !!a.assigned_reviewer_id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-purple-700 uppercase tracking-wider mb-1">
            <Users className="w-4 h-4" />
            Workload Allocation Engine
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Reviewer Scrutiny Assignments</h1>
          <p className="text-sm text-slate-600 mt-1">
            Distribute application dossiers to authorized compliance officers and balance committee scrutiny workloads.
          </p>
        </div>

        <button
          onClick={handleAutoBalance}
          disabled={assigning || unassignedApps.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors shrink-0"
        >
          <Sparkles className="w-4 h-4" />
          Auto-Balance Workload ({unassignedApps.length} Unassigned)
        </button>
      </div>

      {/* Reviewer Committee Panels Load Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {reviewers.map(r => {
          const loadCount = applications.filter(a => a.assigned_reviewer_id === r.id).length;
          return (
            <div key={r.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-800 font-bold flex items-center justify-center text-xs">
                  {r.full_name?.split(' ').map(n => n[0]).join('') || 'RO'}
                </div>
                <div>
                  <h3 className="font-bold text-xs text-slate-900">{r.full_name}</h3>
                  <p className="text-[11px] font-mono text-slate-500">{r.email}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">Current Workload:</span>
                <span className={`font-bold px-2 py-0.5 rounded-md ${loadCount > 5 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                  {loadCount} Dossiers Assigned
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Unassigned Queue Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-150">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600" />
            Unassigned Institutional Dossiers ({unassignedApps.length})
          </h3>
        </div>

        {unassignedApps.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            All current dossiers have been assigned to compliance reviewers.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {unassignedApps.map(app => (
              <div key={app.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-purple-800 bg-purple-50 px-2.5 py-0.5 rounded-md border border-purple-150">
                      {app.application_number}
                    </span>
                    <StatusBadge status={app.status} size="sm" />
                  </div>
                  <h4 className="font-bold text-xs text-slate-900 mt-1">{app.institution_name}</h4>
                  <p className="text-[11px] text-slate-500">{app.programme} • AY {app.academic_year}</p>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    id={`reviewer-select-${app.id}`}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-purple-600"
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAssign(app.id, parseInt(e.target.value));
                      }
                    }}
                  >
                    <option value="" disabled>Select Reviewer...</option>
                    {reviewers.map(r => (
                      <option key={r.id} value={r.id}>{r.full_name} ({r.email})</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assigned Applications Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-150 flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-blue-600" />
          Active Scrutiny Assignments ({assignedApps.length})
        </h3>

        <div className="divide-y divide-slate-100 text-xs">
          {assignedApps.map(app => {
            const assignedRev = reviewers.find(r => r.id === app.assigned_reviewer_id);
            return (
              <div key={app.id} className="py-3 flex items-center justify-between gap-4">
                <div>
                  <span className="font-mono text-xs font-bold text-slate-800">{app.application_number}</span>
                  <span className="text-slate-400 mx-2">•</span>
                  <span className="font-semibold text-slate-700">{app.institution_name}</span>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-slate-500">
                    Assigned to: <strong className="text-purple-900">{assignedRev?.full_name || `Reviewer #${app.assigned_reviewer_id}`}</strong>
                  </span>
                  <select
                    className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700"
                    value={app.assigned_reviewer_id || ''}
                    onChange={(e) => handleAssign(app.id, parseInt(e.target.value))}
                  >
                    {reviewers.map(r => (
                      <option key={r.id} value={r.id}>Reassign: {r.full_name}</option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
