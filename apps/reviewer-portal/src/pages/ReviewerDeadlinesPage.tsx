import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { DeadlineItem } from '../types';
import {
  Clock,
  AlertTriangle,
  Calendar,
  Filter,
  CheckCircle2,
  ChevronRight,
  ShieldAlert,
  ArrowRight,
  Trash2
} from 'lucide-react';

export const ReviewerDeadlinesPage: React.FC = () => {
  const [deadlines, setDeadlines] = useState<DeadlineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadDeadlines();
  }, [filter]);

  const loadDeadlines = async () => {
    setLoading(true);
    try {
      const data = await api.getDeadlines(filter !== 'all' ? filter : undefined);
      setDeadlines(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Overdue':
        return 'bg-rose-100 text-rose-800 border-rose-300 font-bold';
      case 'Approaching Deadline':
        return 'bg-amber-100 text-amber-800 border-amber-300 font-bold';
      case 'Blocked by Missing Evidence':
        return 'bg-purple-100 text-purple-800 border-purple-300 font-bold';
      default:
        return 'bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold';
    }
  };

  return (
    <div className="space-y-6">
      <div className="pb-2 border-b border-slate-200">
        <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 uppercase tracking-wider mb-1">
          <Clock className="w-4 h-4" />
          Approval Delay Early-Warning Engine
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Scrutiny Deadlines & SLA Tracking</h1>
        <p className="text-sm text-slate-600 mt-1">
          Predictive statutory timelines, milestone bottlenecks, and committee review countdowns to prevent approval delays.
        </p>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <Filter className="w-4 h-4 text-slate-400" />
          <span>Milestone Status Filter:</span>
        </div>
        <div className="flex items-center gap-2">
          {deadlines.length > 0 && (
            <button
              onClick={async () => {
                await api.deleteAllDeadlines();
                loadDeadlines();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold hover:bg-rose-100 transition-colors"
              title="Clear all deadlines"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All Deadlines</span>
            </button>
          )}
          <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
        >
          <option value="all">All Milestones</option>
          <option value="Overdue">Overdue SLA</option>
          <option value="Approaching Deadline">Approaching Deadline</option>
          <option value="Blocked by Missing Evidence">Blocked by Missing Evidence</option>
          <option value="On Track">On Track</option>
        </select>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-500">Calculating statutory deadlines...</p>
        </div>
      ) : deadlines.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-800">All Deadlines On Schedule</h3>
          <p className="text-xs text-slate-500 mt-1">No applications are currently breaching statutory SLA limits.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {deadlines.map(item => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:border-blue-300 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full border ${getStatusBadge(item.status)}`}>
                    {item.status}
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-700">
                    {item.application_number}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-xs font-bold text-slate-800">{item.milestone_name || item.title}</span>
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Target: {new Date(item.due_date || item.deadline_date || Date.now()).toLocaleDateString()}
                  </span>
                  <span className={`font-bold ${item.days_remaining <= 2 ? 'text-rose-600' : 'text-slate-700'}`}>
                    {item.days_remaining < 0 ? `${Math.abs(item.days_remaining)} days overdue` : `${item.days_remaining} days remaining`}
                  </span>
                </div>
              </div>

              <div className="shrink-0">
                <Link
                  to={`/reviewer/review-queue?appId=${item.application_id}`}
                  className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-2xs transition-colors flex items-center gap-1"
                >
                  Scrutinize Dossier
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
