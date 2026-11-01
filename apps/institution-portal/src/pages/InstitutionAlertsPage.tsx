import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { DeadlineItem, NotificationItem } from '../types';
import { useNotifications } from '../context/NotificationContext';
import {
  AlertTriangle,
  Clock,
  Bell,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  ExternalLink,
  Trash2
} from 'lucide-react';

export const InstitutionAlertsPage: React.FC = () => {
  const { markAsRead, markAllAsRead } = useNotifications();

  const [deadlines, setDeadlines] = useState<DeadlineItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [dl, notifs] = await Promise.all([
        api.getDeadlines(),
        api.getNotifications()
      ]);
      setDeadlines(dl);
      setNotifications(notifs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Institutional Alerts & Deadlines</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Approval Delay Early-Warning Engine monitoring statutory milestones, deficiency queries, and review clocks
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deadlines Section */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-600" />
              <h4 className="text-sm font-bold text-slate-900">Active Statutory Deadlines</h4>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">{deadlines.length} items</span>
              {deadlines.length > 0 && (
                <button
                  onClick={async () => {
                    await api.deleteAllDeadlines();
                    loadData();
                  }}
                  className="p-1 rounded text-rose-600 hover:bg-rose-50"
                  title="Clear all deadlines"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {deadlines.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">No pending deadlines.</div>
            ) : (
              deadlines.map((dl) => (
                <div key={dl.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-emerald-800">{dl.application_number}</span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        dl.days_remaining <= 3
                          ? 'bg-rose-100 text-rose-800'
                          : dl.days_remaining <= 7
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {dl.days_remaining} Days Remaining
                    </span>
                  </div>
                  <h5 className="text-xs font-bold text-slate-900">{dl.title}</h5>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span>Due Date: {new Date(dl.due_date).toLocaleDateString()}</span>
                    <span className="font-semibold text-slate-700">{dl.status}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Notifications Section */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-600" />
              <h4 className="text-sm font-bold text-slate-900">Notifications & Alerts</h4>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  markAllAsRead();
                  loadData();
                }}
                className="text-xs font-semibold text-emerald-700 hover:underline"
              >
                Mark all read
              </button>
              {notifications.length > 0 && (
                <button
                  onClick={async () => {
                    await api.deleteAllNotifications();
                    loadData();
                  }}
                  className="inline-flex items-center gap-1 text-xs text-rose-600 hover:underline"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear All</span>
                </button>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">No notifications to display.</div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => {
                    markAsRead(n.id);
                    loadData();
                  }}
                  className={`p-4 rounded-2xl border transition-colors cursor-pointer space-y-1.5 ${
                    !n.is_read ? 'bg-emerald-50/40 border-emerald-200' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">{n.title}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400">{new Date(n.created_at).toLocaleDateString()}</span>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          await api.deleteNotification(n.id);
                          loadData();
                        }}
                        className="text-slate-400 hover:text-rose-600 p-0.5"
                        title="Delete notification"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{n.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
