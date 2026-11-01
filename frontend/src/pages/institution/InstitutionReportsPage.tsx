import React from 'react';
import { api } from '../../services/api';
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles
} from 'lucide-react';

export const InstitutionReportsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Institutional Reports & Data Exports</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Download statutory CSV datasets and compliance reporting summaries scoped to your institution
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Application Status Report */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Application Dossier & Metrics Export</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Detailed CSV spreadsheet covering application numbers, academic categories, declared faculty headcount, approved intake, built-up area, and live readiness scores.
              </p>
            </div>
            <div className="text-[11px] text-slate-400">
              Format: UTF-8 CSV • Scope: Authenticated Institution Records
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 mt-6">
            <a
              href={api.getApplicationsCsvUrl()}
              target="_blank"
              rel="noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Download Applications CSV</span>
            </a>
          </div>
        </div>

        {/* Compliance Findings Report */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-100">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Statutory Compliance Findings Log</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Complete log of statutory compliance findings, severity ratings, cross-document discrepancies, and recommended institutional remediation steps.
              </p>
            </div>
            <div className="text-[11px] text-slate-400">
              Format: UTF-8 CSV • Scope: Authenticated Institution Records
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 mt-6">
            <a
              href={api.getComplianceCsvUrl()}
              target="_blank"
              rel="noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white shadow-xs transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Download Compliance Findings CSV</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
