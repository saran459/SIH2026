import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { AuditEventItem } from '../types';
import {
  History,
  ShieldCheck,
  Clock,
  User,
  Hash,
  Filter,
  Trash2
} from 'lucide-react';

export const ReviewerAuditHistoryPage: React.FC = () => {
  const [events, setEvents] = useState<AuditEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState<string>('ALL');

  useEffect(() => {
    loadAuditEvents();
  }, []);

  const loadAuditEvents = async () => {
    setLoading(true);
    try {
      const data = await api.getAuditEvents(100);
      setEvents(data);
    } catch (e) {
      console.error('Failed to load audit history', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = events.filter((e) => {
    if (filterAction === 'ALL') return true;
    return e.action_type.includes(filterAction);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Scrutiny Audit History</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Tamper-evident append-only ledger tracking all scrutiny actions, findings resolutions, and statutory decisions.
          </p>
        </div>

        {/* Filter & Clear */}
        <div className="flex items-center gap-3">
          {events.length > 0 && (
            <button
              onClick={async () => {
                await api.clearAuditEvents();
                loadAuditEvents();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold hover:bg-rose-100 transition-colors"
              title="Clear audit history ledger"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Audit Log</span>
            </button>
          )}
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          >
            <option value="ALL">All Statutory Actions</option>
            <option value="APPLICATION">Application Lifecycle</option>
            <option value="FINDING">Compliance Findings</option>
            <option value="CORRECTION">Correction Queries</option>
            <option value="DECISION">Approve / Reject</option>
          </select>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-3.5">Block / Timestamp</th>
                <th className="px-5 py-3.5">Actor & Role</th>
                <th className="px-5 py-3.5">Action Event</th>
                <th className="px-5 py-3.5">Cryptographic Hash (SHA-256)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400">
                    Loading audit trail...
                  </td>
                </tr>
              ) : filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400">
                    No audit records matching filter.
                  </td>
                </tr>
              ) : (
                filteredEvents.map((event) => (
                  <tr key={event.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-900">Block #{event.id}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(event.timestamp).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-800">{event.actor_email}</div>
                      <span className="inline-block px-2 py-0.5 mt-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                        {event.actor_role}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-mono text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded-md border border-blue-200">
                        {event.action_type}
                      </span>
                      {event.application_id && (
                        <div className="text-[11px] text-slate-500 mt-1">
                          Application #{event.application_id}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[10px] text-slate-500">
                      <div className="truncate max-w-xs" title={event.event_hash}>
                        {event.event_hash}
                      </div>
                      <div className="text-[9px] text-slate-400 mt-0.5 truncate max-w-xs" title={`Prev: ${event.previous_hash}`}>
                        Prev: {event.previous_hash ? event.previous_hash.slice(0, 16) + '...' : 'Genesis'}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
