import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  Users,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Layers,
  TrendingUp,
  FileText
} from 'lucide-react';

export const AdminReportsPage: React.FC = () => {
  const [workload, setWorkload] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      const [wlData, anData] = await Promise.all([
        api.getReviewerWorkload(),
        api.getDashboardAnalytics()
      ]);
      setWorkload(wlData);
      setAnalytics(anData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="pb-2 border-b border-slate-200">
        <div className="flex items-center gap-2 text-xs font-semibold text-purple-700 uppercase tracking-wider mb-1">
          <BarChart3 className="w-4 h-4" />
          Statutory Analytics & Reporting
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">National AICTE Approval Intelligence</h1>
        <p className="text-sm text-slate-600 mt-1">
          Generate statutory compliance datasets, review panel productivity indices, and official regulatory records.
        </p>
      </div>

      {/* CSV Export Downloads */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-150">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">National Institutional Applications Master CSV</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Full export of all applications with academic year, programme, carpet area, intake capacity, risk index, and approval order determinations.
              </p>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 mt-4">
            <a
              href={api.getApplicationsCsvUrl()}
              target="_blank"
              rel="noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-purple-700 hover:bg-purple-800 text-white shadow-xs transition-colors"
            >
              <Download className="w-4 h-4" />
              Download Applications Master CSV
            </a>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-150">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Scrutiny Panel Productivity Matrix</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Committee-level performance breakdown of dossiers assigned, average scrutiny days, deficiency notices issued, and approval vs rejection counts.
              </p>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 mt-4">
            <button
              onClick={() => window.print()}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors"
            >
              <FileText className="w-4 h-4" />
              Print / Save Statutory Summary
            </button>
          </div>
        </div>
      </div>

      {/* Reviewer Workload Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-150 flex items-center gap-2">
          <Users className="w-4 h-4 text-purple-700" />
          Reviewer Committee Scrutiny Productivity
        </h3>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading workload metrics...</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {workload.map((w, idx) => (
              <div key={idx} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <h4 className="font-bold text-slate-900">{w.reviewer_name || `Reviewer #${w.reviewer_id}`}</h4>
                  <p className="text-[11px] font-mono text-slate-500">{w.reviewer_email}</p>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Assigned</span>
                    <span className="font-bold text-slate-800">{w.assigned_count}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Under Review</span>
                    <span className="font-bold text-amber-700">{w.under_review_count}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Approved</span>
                    <span className="font-bold text-emerald-700">{w.approved_count}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
