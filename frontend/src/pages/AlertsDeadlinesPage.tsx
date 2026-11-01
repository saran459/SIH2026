import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { DeadlineItem, NotificationItem } from '../types';
import {
  AlertTriangle,
  Clock,
  ShieldAlert,
  CheckCircle2,
  Calendar,
  ExternalLink,
  Bell,
  Filter
} from 'lucide-react';

export const AlertsDeadlinesPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [deadlines, setDeadlines] = useState<DeadlineItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [dlData, notifData] = await Promise.all([
        api.getDeadlines(statusFilter !== 'all' ? statusFilter : undefined),
        api.getNotifications()
      ]);
      setDeadlines(dlData);
      setNotifications(notifData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'Overdue':
        return 'bg-rose-100 text-rose-800 border-rose-300 font-bold';
      case 'Blocked by Missing Evidence':
        return 'bg-purple-100 text-purple-800 border-purple-300 font-bold';
      case 'Approaching Deadline':
        return 'bg-amber-100 text-amber-800 border-amber-300 font-bold';
      default:
        return 'bg-emerald-100 text-emerald-800 border-emerald-300 font-medium';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Approval Delay Early-Warning Engine</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Predictive and explainable milestone deadlines, scrutiny overdue warnings, and alerts
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white shadow-2xs font-medium"
          >
            <option value="all">All Warning States</option>
            <option value="Overdue">Overdue</option>
            <option value="Blocked by Missing Evidence">Blocked by Missing Evidence</option>
            <option value="Approaching Deadline">Approaching Deadline</option>
            <option value="On Track">On Track</option>
          </select>
        </div>
      </div>

      {/* Deadlines Early Warning Grid */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-16 text-center text-slate-400">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span>Evaluating statutory milestones...</span>
          </div>
        ) : deadlines.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-xs text-slate-400">
            No milestones matching selected filter criteria.
          </div>
        ) : (
          deadlines.map((dl) => (
            <div
              key={dl.id}
              onClick={() => navigate(`/applications/${dl.application_id}`)}
              className="bg-white rounded-3xl border border-slate-200 hover:border-slate-300 p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer transition-all group"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2.5">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs border ${getStatusBadge(dl.status)}`}>
                    {dl.status}
                  </span>
                  <span className="font-mono text-xs font-bold text-blue-700">
                    {dl.application_number}
                  </span>
                  <span className="text-xs text-slate-400">• {dl.institution_name}</span>
                </div>

                <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                  {dl.title}
                </h4>

                <p className="text-xs text-slate-600">
                  Assigned Stakeholder Role: <strong className="text-slate-800 capitalize">{dl.assigned_role}</strong>
                </p>
              </div>

              <div className="flex items-center gap-6 shrink-0 text-right">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase block">Due Date</span>
                  <span className="text-xs font-bold text-slate-900">
                    {new Date(dl.due_date).toLocaleDateString()}
                  </span>
                  <span className="block text-[10px] text-slate-500 mt-0.5">
                    {dl.days_remaining < 0
                      ? `${Math.abs(dl.days_remaining)} days overdue`
                      : `${dl.days_remaining} days remaining`}
                  </span>
                </div>
                <button className="p-2 rounded-xl bg-slate-100 group-hover:bg-blue-600 group-hover:text-white text-slate-600 transition-colors">
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Notifications History Feed */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-150 mb-4">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-blue-600" />
            <h4 className="text-sm font-bold text-slate-900">Historical Notification Ledger</h4>
          </div>
          <span className="text-xs text-slate-500">Persistent in database</span>
        </div>

        <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
          {notifications.map((n) => (
            <div key={n.id} className="py-3 flex items-start justify-between gap-3 text-xs">
              <div>
                <span className="font-bold text-slate-900">{n.title}</span>
                <p className="text-slate-600 mt-0.5 text-[11px] leading-relaxed">{n.message}</p>
              </div>
              <span className="text-[10px] text-slate-400 shrink-0">
                {new Date(n.created_at).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
