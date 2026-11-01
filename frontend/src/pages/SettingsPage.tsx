import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import {
  Settings,
  Building,
  Bell,
  Database,
  Shield,
  CheckCircle2,
  Lock,
  User
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useNotifications();

  const [emailAlerts, setEmailAlerts] = useState(true);
  const [deadlineAlerts, setDeadlineAlerts] = useState(true);
  const [complianceAlerts, setComplianceAlerts] = useState(true);
  const [workflowAlerts, setWorkflowAlerts] = useState(true);

  const handleSavePreferences = () => {
    showToast('success', 'Preferences Updated', 'Your notification settings have been saved.');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Portal Settings & Organization Profile</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure notification dispatch, institutional metadata, and security settings
        </p>
      </div>

      {/* User Account & Institution Info */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-150">
          <User className="w-5 h-5 text-blue-600" />
          <h4 className="text-sm font-bold text-slate-900">Account Credentials & Organization</h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="text-slate-500 font-semibold block mb-1">Full Name</label>
            <input
              type="text"
              readOnly
              value={user?.full_name || ''}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-800"
            />
          </div>

          <div>
            <label className="text-slate-500 font-semibold block mb-1">Authenticated Email</label>
            <input
              type="email"
              readOnly
              value={user?.email || ''}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-800"
            />
          </div>

          <div>
            <label className="text-slate-500 font-semibold block mb-1">Assigned Role</label>
            <input
              type="text"
              readOnly
              value={user?.role?.toUpperCase() || ''}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-bold text-blue-700"
            />
          </div>

          <div>
            <label className="text-slate-500 font-semibold block mb-1">Institutional Entity</label>
            <input
              type="text"
              readOnly
              value={user?.institution_name || 'AICTE Approval Bureau HQ'}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-800"
            />
          </div>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-150">
          <Bell className="w-5 h-5 text-amber-600" />
          <h4 className="text-sm font-bold text-slate-900">Notification Channels & Early Warnings</h4>
        </div>

        <div className="space-y-3 text-xs">
          <label className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
            <div>
              <span className="font-bold text-slate-900 block">Milestone Deadline Reminders</span>
              <span className="text-[11px] text-slate-500">
                Trigger alerts when a scrutiny or correction deadline is within 72 hours
              </span>
            </div>
            <input
              type="checkbox"
              checked={deadlineAlerts}
              onChange={(e) => setDeadlineAlerts(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
            <div>
              <span className="font-bold text-slate-900 block">Compliance Deficiency Alerts</span>
              <span className="text-[11px] text-slate-500">
                Notify when cross-document inconsistencies or missing certificates are flagged
              </span>
            </div>
            <input
              type="checkbox"
              checked={complianceAlerts}
              onChange={(e) => setComplianceAlerts(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
            <div>
              <span className="font-bold text-slate-900 block">Workflow Transition Notifications</span>
              <span className="text-[11px] text-slate-500">
                Receive notifications when application moves to Under Review, Correction Required, or Approved
              </span>
            </div>
            <input
              type="checkbox"
              checked={workflowAlerts}
              onChange={(e) => setWorkflowAlerts(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
            />
          </label>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={handleSavePreferences}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
          >
            Save Preferences
          </button>
        </div>
      </div>

      {/* System Environment */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-3 text-xs">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-150">
          <Database className="w-5 h-5 text-indigo-600" />
          <h4 className="text-sm font-bold text-slate-900">System Architecture & Environment</h4>
        </div>

        <div className="grid grid-cols-2 gap-3 text-[11px] text-slate-600">
          <div><strong className="text-slate-900">Backend:</strong> Python FastAPI + SQLAlchemy 2.0</div>
          <div><strong className="text-slate-900">Database:</strong> MySQL 8 (Transactional Engine)</div>
          <div><strong className="text-slate-900">OCR & Document Engine:</strong> PyMuPDF 2.0 + Pillow</div>
          <div><strong className="text-slate-900">Audit Proof:</strong> SHA-256 Cryptographic Hash Chain</div>
          <div><strong className="text-slate-900">Frontend:</strong> React 19 + TypeScript + Vite + Tailwind</div>
          <div><strong className="text-slate-900">Environment:</strong> Smart India Hackathon (SIH) Prototype</div>
        </div>
      </div>
    </div>
  );
};
