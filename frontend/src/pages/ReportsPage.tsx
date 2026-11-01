import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  Users,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Layers
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const [workloadReport, setWorkloadReport] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getReviewerWorkload()
      .then(setWorkloadReport)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">Reports and Analytics</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Generate, preview, and download statutory reporting datasets and review productivity metrics
        </p>
      </div>

      {/* CSV Export Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Application Status Report */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Application Status & Readiness Export</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Complete spreadsheet detailing application numbers, categories, declared faculty, intake capacity, carpet area, readiness scores, and milestone dates.
              </p>
            </div>
            <div className="text-[11px] text-slate-400">
              Format: Standard UTF-8 CSV • Scope: Authenticated Role Permissions
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 mt-6">
            <a
              href={api.getApplicationsCsvUrl()}
              target="_blank"
              rel="noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Download Applications CSV</span>
            </a>
          </div>
        </div>

        {/* Compliance Findings Report */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Statutory Compliance Findings Export</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Detailed finding audit records including severity, observed vs statutory expected values, recommended next actions, and resolution notes.
              </p>
            </div>
            <div className="text-[11px] text-slate-400">
              Format: Standard UTF-8 CSV • Includes Cross-Document Mismatches
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 mt-6">
            <a
              href={api.getComplianceCsvUrl()}
              target="_blank"
              rel="noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Download Compliance Findings CSV</span>
            </a>
          </div>
        </div>
      </div>

      {/* Reviewer Workload Ledger */}
      {workloadReport && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-150 mb-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900">AICTE Reviewer Workload & Capacity</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Active vs completed reviews across scrutiny committee officers • Generated: {workloadReport.generated_at}
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-800">
              {workloadReport.total_reviewers} Officers Active
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-semibold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Reviewer Name</th>
                  <th className="px-4 py-3">Official Email</th>
                  <th className="px-4 py-3 text-center">Total Assigned</th>
                  <th className="px-4 py-3 text-center">Active Scrutinies</th>
                  <th className="px-4 py-3 text-center">Awaiting Corrections</th>
                  <th className="px-4 py-3 text-center">Completed Decisions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {workloadReport.reviewers?.map((r: any) => (
                  <tr key={r.reviewer_id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-bold text-slate-900">{r.reviewer_name}</td>
                    <td className="px-4 py-3 text-slate-600">{r.email}</td>
                    <td className="px-4 py-3 text-center font-bold text-slate-800">{r.total_assigned}</td>
                    <td className="px-4 py-3 text-center font-bold text-blue-700">{r.active_reviews}</td>
                    <td className="px-4 py-3 text-center font-bold text-amber-700">{r.pending_correction_reviews}</td>
                    <td className="px-4 py-3 text-center font-bold text-emerald-700">{r.completed_reviews}</td>
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
