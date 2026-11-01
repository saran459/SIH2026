import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Application } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import {
  AlertCircle,
  Clock,
  Building2,
  ChevronRight,
  Search,
  CheckCircle2,
  ExternalLink,
  MessageSquare
} from 'lucide-react';

export const ReviewerCorrectionRequestsPage: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadCorrectionApplications();
  }, []);

  const loadCorrectionApplications = async () => {
    setLoading(true);
    try {
      const data = await api.getApplications();
      // Filter for applications in 'Correction Required'
      const correctionApps = data.filter(a => a.status === 'Correction Required');
      setApplications(correctionApps);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = applications.filter(app =>
    (app.application_number || '').toLowerCase().includes(search.toLowerCase()) ||
    (app.institution_name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="pb-2 border-b border-slate-200">
        <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 uppercase tracking-wider mb-1">
          <AlertCircle className="w-4 h-4" />
          Scrutiny Correction Notices
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Correction Requests & Queries</h1>
        <p className="text-sm text-slate-600 mt-1">
          Monitor deficiency notices issued to institutions, track clarification evidence submitted, and re-evaluate compliance.
        </p>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
        <div className="relative w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search pending correction items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-hidden"
          />
        </div>
        <span className="text-xs font-bold text-slate-500">
          {filtered.length} Applications Awaiting Institutional Rectification
        </span>
      </div>

      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <div className="w-8 h-8 border-3 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-500">Loading correction requests...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-800">No Pending Correction Requests</h3>
          <p className="text-xs text-slate-500 mt-1">There are currently no active applications in Correction Required state.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(app => (
            <div
              key={app.id}
              className="bg-white rounded-2xl border border-amber-200 p-5 shadow-2xs hover:shadow-md transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-amber-900 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                    {app.application_number}
                  </span>
                  <StatusBadge status={app.status} />
                  <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
                    {app.deficiency_count || 1} Deficiency Flagged
                  </span>
                </div>
                <h3 className="font-bold text-sm text-slate-900">{app.institution_name}</h3>
                <p className="text-xs text-slate-500 flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  {app.programme} • Academic Year {app.academic_year}
                </p>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                <Link
                  to={`/reviewer/applications/${app.id}`}
                  className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-colors"
                >
                  View Notes & Audit
                </Link>
                <Link
                  to={`/reviewer/review-queue?appId=${app.id}`}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-2xs transition-colors flex items-center gap-1.5"
                >
                  Re-evaluate Dossier
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
