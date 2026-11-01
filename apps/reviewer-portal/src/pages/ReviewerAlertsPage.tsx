import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { NotificationItem } from '../types';
import { useNotifications } from '../context/NotificationContext';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  ShieldAlert,
  Info,
  Trash2
} from 'lucide-react';

export const ReviewerAlertsPage: React.FC = () => {
  const { showToast } = useNotifications();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const data = await api.getNotifications();
      setNotifications(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: number) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (e) {
      console.error(e);
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'warning':
      case 'deficiency':
        return <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />;
      case 'error':
      case 'overdue':
        return <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />;
      case 'success':
      case 'resubmission':
        return <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />;
      default:
        return <Info className="w-5 h-5 text-blue-600 shrink-0" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="pb-2 border-b border-slate-200">
        <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 uppercase tracking-wider mb-1">
          <Bell className="w-4 h-4" />
          Scrutiny Dispatch Center
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Reviewer Alerts & Notifications</h1>
          {notifications.length > 0 && (
            <button
              onClick={async () => {
                await api.deleteAllNotifications();
                loadAlerts();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold hover:bg-rose-100 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All Alerts</span>
            </button>
          )}
        </div>
        <p className="text-sm text-slate-600 mt-1">
          Real-time alerts for application re-submissions, correction evidence uploads, and upcoming scrutiny statutory deadlines.
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-500">Loading alerts...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-800">No New Notifications</h3>
          <p className="text-xs text-slate-500 mt-1">You are all caught up on all scrutiny alerts and assignments.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map(item => (
            <div
              key={item.id}
              className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-4 ${
                item.is_read
                  ? 'bg-white border-slate-200 opacity-75'
                  : 'bg-blue-50/40 border-blue-200 shadow-2xs'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">{getAlertIcon(item.notification_type || item.severity.toLowerCase())}</div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-slate-900">{item.title}</h3>
                    {!item.is_read && (
                      <span className="w-2 h-2 rounded-full bg-blue-600 ring-2 ring-blue-200" />
                    )}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{item.message}</p>
                  <span className="text-[10px] text-slate-400 block pt-1">
                    {new Date(item.created_at).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {!item.is_read && (
                  <button
                    onClick={() => handleMarkAsRead(item.id)}
                    className="text-[11px] font-bold text-slate-500 hover:text-slate-800 px-2.5 py-1 rounded-lg hover:bg-slate-100"
                  >
                    Mark Read
                  </button>
                )}
                {item.application_id && (
                  <Link
                    to={`/reviewer/review-queue?appId=${item.application_id}`}
                    className="p-1.5 hover:bg-blue-100 rounded-lg text-blue-700 transition-colors"
                    title="Open in workbench"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
