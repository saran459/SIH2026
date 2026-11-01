import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import {
  User,
  Shield,
  Bell,
  CheckCircle2,
  Lock,
  Building2,
  FileCheck2,
  Mail,
  Phone
} from 'lucide-react';

export const ReviewerProfilePage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useNotifications();

  const [emailAlerts, setEmailAlerts] = useState(true);
  const [resubmitAlerts, setResubmitAlerts] = useState(true);
  const [deadlineReminders, setDeadlineReminders] = useState(true);

  const handleSave = () => {
    showToast('success', 'Preferences Saved', 'Reviewer notification preferences updated.');
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="pb-2 border-b border-slate-200">
        <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 uppercase tracking-wider mb-1">
          <User className="w-4 h-4" />
          Reviewer Credentials
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Reviewer / Compliance Officer Profile</h1>
        <p className="text-sm text-slate-600 mt-1">
          Authorized regulatory scrutiny panel credentials and automated dispatch preferences.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
          <Shield className="w-4 h-4 text-blue-600" />
          Authorized Scrutiny Committee Credentials
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold mb-1">Reviewer Name</span>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800">
              {user?.full_name || 'Dr. Reviewer Officer'}
            </div>
          </div>

          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold mb-1">Official Gov Email</span>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800">
              {user?.email || 'reviewer@aicte.gov.in'}
            </div>
          </div>

          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold mb-1">Authorized Role</span>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-blue-700 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Senior Compliance Reviewer (AICTE Head Office)
            </div>
          </div>

          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold mb-1">Account ID</span>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-700">
              USER-REV-00{user?.id || 2}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
          <Bell className="w-4 h-4 text-blue-600" />
          Scrutiny Alert Dispatch Preferences
        </h3>

        <div className="space-y-3 text-xs">
          <label className="flex items-center justify-between p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100/70 transition-colors">
            <div>
              <span className="font-bold text-slate-800 block">Instant Email Alert on New Application Assignment</span>
              <span className="text-slate-500 text-[11px]">Notify when administrator assigns a new institutional dossier to your queue</span>
            </div>
            <input
              type="checkbox"
              checked={emailAlerts}
              onChange={(e) => setEmailAlerts(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded-sm focus:ring-blue-500"
            />
          </label>

          <label className="flex items-center justify-between p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100/70 transition-colors">
            <div>
              <span className="font-bold text-slate-800 block">Clarification & Re-Submission Notification</span>
              <span className="text-slate-500 text-[11px]">Notify immediately when an institution uploads corrected documents for a query</span>
            </div>
            <input
              type="checkbox"
              checked={resubmitAlerts}
              onChange={(e) => setResubmitAlerts(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded-sm focus:ring-blue-500"
            />
          </label>

          <label className="flex items-center justify-between p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100/70 transition-colors">
            <div>
              <span className="font-bold text-slate-800 block">Statutory SLA Expiry Warnings (48h Notice)</span>
              <span className="text-slate-500 text-[11px]">Trigger urgent reminders before statutory scrutiny deadlines expire</span>
            </div>
            <input
              type="checkbox"
              checked={deadlineReminders}
              onChange={(e) => setDeadlineReminders(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded-sm focus:ring-blue-500"
            />
          </label>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={handleSave}
            className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-2xs transition-colors"
          >
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
};
