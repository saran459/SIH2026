import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { AuditEventItem, VerifyChainResult } from '../types';
import { useNotifications } from '../context/NotificationContext';
import {
  History,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Hash,
  Clock,
  User,
  RefreshCw,
  Lock
} from 'lucide-react';

export const AuditTrailPage: React.FC = () => {
  const { showToast } = useNotifications();

  const [events, setEvents] = useState<AuditEventItem[]>([]);
  const [verification, setVerification] = useState<VerifyChainResult | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAuditEvents();
  }, []);

  const loadAuditEvents = async () => {
    setLoading(true);
    try {
      const data = await api.getAuditEvents(100);
      setEvents(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyChain = async () => {
    setVerifying(true);
    try {
      const result = await api.verifyAuditChain();
      setVerification(result);
      if (result.is_valid) {
        showToast('success', 'Chain Verified', result.verification_message);
      } else {
        showToast('error', 'Tamper Warning', result.verification_message);
      }
    } catch (e: any) {
      showToast('error', 'Verification Failed', e.message);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">Cryptographic Audit Trail Ledger</h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-300">
              SHA-256 Hash Chain
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Append-only tamper-evident statutory ledger tracking every workflow event, upload, and reviewer decision
          </p>
        </div>

        <button
          onClick={handleVerifyChain}
          disabled={verifying}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors disabled:opacity-50"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>{verifying ? 'Verifying Hashes...' : 'Verify Hash Chain Integrity'}</span>
        </button>
      </div>

      {/* Verification Results Banner */}
      {verification && (
        <div
          className={`p-5 rounded-2xl border text-xs flex items-start gap-3 shadow-xs ${
            verification.is_valid
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-rose-50 border-rose-300 text-rose-900'
          }`}
        >
          {verification.is_valid ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 space-y-1">
            <h4 className="font-bold text-sm">
              {verification.is_valid ? 'Cryptographic Integrity Validated' : 'Tamper Detection Warning'}
            </h4>
            <p className="leading-relaxed">{verification.verification_message}</p>
            <div className="pt-2 flex items-center gap-4 text-[11px] font-mono opacity-80 flex-wrap">
              <span>Total Blocks: {verification.total_events}</span>
              {verification.last_event_hash && (
                <span>Tip Hash: {verification.last_event_hash.substring(0, 20)}...</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Audit Events Ledger */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-150 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Sequential Audit Events ({events.length})
          </span>
          <button
            onClick={loadAuditEvents}
            className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Ledger</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-semibold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Actor & Role</th>
                <th className="px-4 py-3">Action Type</th>
                <th className="px-4 py-3">Payload Details</th>
                <th className="px-4 py-3">Cryptographic Block Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {events.map((ev, index) => (
                <tr key={ev.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap text-[11px]">
                    {new Date(ev.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <span className="font-bold text-slate-900 block font-sans">{ev.actor_email}</span>
                    <span className="text-[10px] text-blue-700 font-semibold uppercase">{ev.actor_role}</span>
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                      {ev.action_type}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-slate-700 max-w-xs truncate text-[11px]" title={ev.details}>
                    {ev.details}
                  </td>
                  <td className="px-4 py-3.5 text-slate-600 text-[10px] whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="text-blue-700 font-bold" title={ev.event_hash}>
                        Hash: {ev.event_hash.substring(0, 16)}...
                      </span>
                      <span className="text-slate-400" title={ev.previous_hash}>
                        Prev: {ev.previous_hash.substring(0, 16)}...
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
