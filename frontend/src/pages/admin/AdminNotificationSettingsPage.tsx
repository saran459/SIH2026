import React, { useState } from 'react';
import { useNotifications } from '../../context/NotificationContext';
import {
  Bell,
  CheckCircle2,
  Sliders,
  ShieldAlert,
  Clock,
  Mail,
  Smartphone,
  Save
} from 'lucide-react';

export const AdminNotificationSettingsPage: React.FC = () => {
  const { showToast } = useNotifications();

  const [settings, setSettings] = useState({
    emailEnabled: true,
    smsEnabled: false,
    slaWarningDays: 3,
    escalationThresholdDays: 15,
    autoCorrectionNotices: true,
    auditLogAlerts: true
  });

  const handleSave = () => {
    showToast('success', 'Notification Policy Saved', 'System-wide alert configurations have been updated.');
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="pb-2 border-b border-slate-200">
        <div className="flex items-center gap-2 text-xs font-semibold text-purple-700 uppercase tracking-wider mb-1">
          <Bell className="w-4 h-4" />
          Alert Orchestration & Dispatch
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Notification & Escalation Settings</h1>
        <p className="text-sm text-slate-600 mt-1">
          Configure automated SLA triggers, deficiency alerts, and ministerial escalation rules.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-6">
        <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
          <Clock className="w-4 h-4 text-purple-700" />
          Approval Delay Early-Warning SLA Thresholds
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="text-slate-600 font-semibold block mb-1">
              Milestone Early Warning Window (Days before deadline)
            </label>
            <input
              type="number"
              min={1}
              max={14}
              value={settings.slaWarningDays}
              onChange={(e) => setSettings({ ...settings, slaWarningDays: parseInt(e.target.value) || 1 })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-600 focus:outline-hidden"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Alerts reviewer and institution when milestone deadline approaches within this threshold.
            </p>
          </div>

          <div>
            <label className="text-slate-600 font-semibold block mb-1">
              Ministerial Escalation Delay Threshold (Days)
            </label>
            <input
              type="number"
              min={5}
              max={45}
              value={settings.escalationThresholdDays}
              onChange={(e) => setSettings({ ...settings, escalationThresholdDays: parseInt(e.target.value) || 5 })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-600 focus:outline-hidden"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Automatically flag dossier to Regional Director if scrutiny remains pending past this window.
            </p>
          </div>
        </div>

        <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2 pt-4">
          <Mail className="w-4 h-4 text-purple-700" />
          Automated Dispatch Channels
        </h3>

        <div className="space-y-3 text-xs">
          <label className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100/70 transition-colors">
            <div>
              <span className="font-bold text-slate-800 block">NIC National Email Gateway</span>
              <span className="text-slate-500 text-[11px]">Dispatch automated email notices to institution heads & reviewers</span>
            </div>
            <input
              type="checkbox"
              checked={settings.emailEnabled}
              onChange={(e) => setSettings({ ...settings, emailEnabled: e.target.checked })}
              className="w-4 h-4 text-purple-600 rounded-sm focus:ring-purple-500"
            />
          </label>

          <label className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100/70 transition-colors">
            <div>
              <span className="font-bold text-slate-800 block">DigiLocker / Gov SMS Gateway</span>
              <span className="text-slate-500 text-[11px]">Dispatch high-priority SMS alerts for critical deficiencies</span>
            </div>
            <input
              type="checkbox"
              checked={settings.smsEnabled}
              onChange={(e) => setSettings({ ...settings, smsEnabled: e.target.checked })}
              className="w-4 h-4 text-purple-600 rounded-sm focus:ring-purple-500"
            />
          </label>

          <label className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100/70 transition-colors">
            <div>
              <span className="font-bold text-slate-800 block">Automatic Scrutiny Deficiency Memo Dispatch</span>
              <span className="text-slate-500 text-[11px]">Generate formal digital deficiency letter upon reviewer query submission</span>
            </div>
            <input
              type="checkbox"
              checked={settings.autoCorrectionNotices}
              onChange={(e) => setSettings({ ...settings, autoCorrectionNotices: e.target.checked })}
              className="w-4 h-4 text-purple-600 rounded-sm focus:ring-purple-500"
            />
          </label>
        </div>

        <div className="pt-4 flex justify-end">
          <button
            onClick={handleSave}
            className="px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            Save Notification Policy
          </button>
        </div>
      </div>
    </div>
  );
};
