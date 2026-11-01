import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { AuditEventItem, VerifyChainResult } from '../../types';
import { useNotifications } from '../../context/NotificationContext';
import {
  History,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Hash,
  Clock,
  User,
  RefreshCw,
  Lock,
  Search,
  Filter
} from 'lucide-react';

export const AdminAuditTrailPage: React.FC = () => {
  const { showToast } = useNotifications();

  const [events, setEvents] = useState<AuditEventItem[]>([]);
  const [verification, setVerification] = useState<VerifyChainResult | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  useEffect(() => {
    loadAuditEvents();
  }, []);

  const loadAuditEvents = async () => {
    setLoading(true);
    try {
      const data = await api.getAuditEvents(100);
      setEvents(data);
    } catch (e: any) {
      showToast('error', 'Failed to load audit events', e.message);
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

  const filteredEvents = events.filter(e => {
    const matchesSearch =
      (e.action || '').toLowerCase().includes(search.toLowerCase()) ||
      (e.user_email || '').toLowerCase().includes(search.toLowerCase()) ||
      (e.details || '').toLowerCase().includes(search.toLowerCase()) ||
      (e.entity_type || '').toLowerCase().includes(search.toLowerCase());
    const matchesAction = actionFilter === 'all' || e.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  const uniqueActions = Array.from(new Set(events.map(e => e.action).filter(Boolean)));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-purple-700 uppercase tracking-wider mb-1">
            <Lock className="w-4 h-4" />
            Immutable Forensic Ledger
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Tamper-Evident SHA-256 Audit Trail</h1>
          <p className="text-sm text-slate-600 mt-1">
            Cryptographically linked blockchain-style audit ledger verifying non-repudiation of all regulatory decisions and administrative actions.
          </p>
        </div>

        <button
          onClick={handleVerifyChain}
          disabled={verifying}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors shrink-0"
        >
          <ShieldCheck className="w-4 h-4" />
          {verifying ? 'Verifying Hashes...' : 'Verify Cryptographic Chain'}
        </button>
      </div>

      {/* Verification Result Banner */}
      {verification && (
        <div className={`p-4 rounded-2xl border transition-all ${
          verification.is_valid ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {verification.is_valid ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-6 h-6 text-rose-600 shrink-0" />
              )}
              <div>
                <h4 className="text-xs font-bold">
                  {verification.is_valid ? 'Cryptographic Chain Integrity Confirmed' : 'Audit Chain Discrepancy Detected'}
                </h4>
                <p className="text-[11px] opacity-90 mt-0.5">{verification.verification_message}</p>
              </div>
            </div>
            <div className="text-right text-xs font-mono font-bold">
              {verification.total_events} Records Checked
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by action, email, entity or hash..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-600 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs text-slate-500 font-semibold">Action:</span>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-purple-600"
          >
            <option value="all">All Actions</option>
            {uniqueActions.map(act => (
              <option key={act} value={act}>{act}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Ledger Table */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-slate-500">Loading audit ledger...</p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300">
          <History className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">No audit events found</h3>
          <p className="text-xs text-slate-500 mt-1">Try adjusting your search criteria.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Sequence & Timestamp</th>
                  <th className="px-5 py-3">Action & Entity</th>
                  <th className="px-5 py-3">Actor Email</th>
                  <th className="px-5 py-3">Forensic Details</th>
                  <th className="px-5 py-3 font-mono">SHA-256 Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEvents.map((evt, idx) => (
                  <tr key={evt.id || idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-800">#{evt.id}</div>
                      <div className="text-[11px] text-slate-400">
                        {new Date(evt.created_at || evt.timestamp || Date.now()).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-bold text-purple-900 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-150">
                        {evt.action || evt.action_type}
                      </span>
                      <div className="text-[11px] text-slate-500 mt-1">
                        {evt.entity_type || 'Event'} #{evt.entity_id || evt.id}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-slate-800">{evt.user_email || 'System'}</div>
                    </td>
                    <td className="px-5 py-3.5 max-w-xs text-slate-600 truncate">
                      {evt.details || 'System event recorded.'}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[11px] text-slate-500">
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700" title={evt.hash}>
                        {evt.hash?.slice(0, 10)}...{evt.hash?.slice(-6)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
