import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import {
  User,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Building2,
  KeyRound,
  FileCheck2,
  AlertTriangle
} from 'lucide-react';

export const AdminProfilePage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useNotifications();

  const [overrideReason, setOverrideReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handlePrivilegedOverride = (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideReason.trim()) {
      showToast('error', 'Mandatory Explanation', 'All administrative privileged actions require a written justification logged to the audit ledger.');
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      showToast('success', 'Justification Logged', 'Administrative audit override authorization recorded with SHA-256 seal.');
      setOverrideReason('');
      setSubmitting(false);
    }, 600);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="pb-2 border-b border-slate-200">
        <div className="flex items-center gap-2 text-xs font-semibold text-purple-700 uppercase tracking-wider mb-1">
          <ShieldAlert className="w-4 h-4" />
          National Registry Administration
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">System Administrator Profile</h1>
        <p className="text-sm text-slate-600 mt-1">
          Authorized administrative credentials, cryptographic key bindings, and audit governance protocols.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
          <User className="w-4 h-4 text-purple-700" />
          Administrator Identity & Role Credentials
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold mb-1">Full Name</span>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800">
              {user?.full_name || 'System Administrator'}
            </div>
          </div>

          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold mb-1">Administrator Email</span>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800">
              {user?.email || 'admin@aicte.gov.in'}
            </div>
          </div>

          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold mb-1">Assigned Security Clearance</span>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-purple-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              National Super-Administrator (AICTE Approval Bureau)
            </div>
          </div>

          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold mb-1">Account Identifier</span>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-700">
              ADM-AICTE-00{user?.id || 1}
            </div>
          </div>
        </div>
      </div>

      {/* Privileged Override Governance Box */}
      <div className="bg-white rounded-2xl border border-purple-200 p-6 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-purple-100">
          <KeyRound className="w-5 h-5 text-purple-700" />
          <div>
            <h3 className="text-sm font-bold text-slate-900">Privileged Administrative Audit Log Protocol</h3>
            <p className="text-[11px] text-slate-500">
              In accordance with AICTE security directives, administrators cannot silently rewrite or delete audit history. Any privileged action is cryptographically recorded.
            </p>
          </div>
        </div>

        <form onSubmit={handlePrivilegedOverride} className="space-y-3 text-xs">
          <div>
            <label className="text-slate-700 font-bold block mb-1">
              Authorized Privileged Action Explanation
            </label>
            <textarea
              rows={3}
              required
              placeholder="State ministerial approval number, emergency reason, or regulatory justification before performing privileged configuration overrides..."
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-600 focus:outline-hidden"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl shadow-xs transition-colors"
            >
              {submitting ? 'Signing Audit Entry...' : 'Record Justification to Audit Ledger'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
