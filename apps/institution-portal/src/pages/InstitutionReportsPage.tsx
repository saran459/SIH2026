import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ComplianceMatrixResponse, CheckOutcome } from '../types';
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  RefreshCw
} from 'lucide-react';

export const InstitutionReportsPage: React.FC = () => {
  const [matrixData, setMatrixData] = useState<ComplianceMatrixResponse | null>(null);
  const [loadingMatrix, setLoadingMatrix] = useState(false);

  useEffect(() => {
    loadMatrix();
  }, []);

  const loadMatrix = async () => {
    setLoadingMatrix(true);
    try {
      const data = await api.getComplianceMatrix();
      setMatrixData(data);
    } catch (e) {
      console.error('Failed to load compliance matrix:', e);
    } finally {
      setLoadingMatrix(false);
    }
  };

  const renderMatrixBadge = (status: CheckOutcome | string) => {
    switch (status) {
      case 'Pass':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">✓ Pass</span>;
      case 'Fail':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">✕ Fail</span>;
      case 'Warning':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">⚠ Warning</span>;
      case 'Not Applicable':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">– N/A</span>;
      case 'Not Run':
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">○ Not Run</span>;
    }
  };

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

      {/* Live Statutory Compliance Matrix for this Institution */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-600" />
              Statutory Compliance Matrix (Institutional Dossiers)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Automated rule verification outcomes standardized to: Pass, Fail, Warning, Not Applicable, and Not Run.
            </p>
          </div>

          <button
            onClick={loadMatrix}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingMatrix ? 'animate-spin' : ''}`} />
            <span>Refresh Matrix</span>
          </button>
        </div>

        {loadingMatrix ? (
          <div className="p-8 text-center text-xs text-slate-500">
            <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading compliance evaluations...
          </div>
        ) : !matrixData || matrixData.matrix.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">
            No active dossiers submitted for compliance matrix evaluation.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 min-w-[130px]">Dossier Number</th>
                  <th className="py-2.5 px-2 text-center">Academic Year</th>
                  <th className="py-2.5 px-2 text-center">Score</th>
                  <th className="py-2.5 px-2 text-center">Status</th>
                  {matrixData.rules.map((r) => (
                    <th key={r.rule_code} className="py-2.5 px-2.5 text-center min-w-[110px]" title={`${r.title} (${r.category})`}>
                      <div className="font-mono text-[10px] text-slate-800">{r.rule_code}</div>
                      <div className="text-[9px] font-normal text-slate-400 truncate max-w-[100px]">{r.title}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {matrixData.matrix.map((row) => (
                  <tr key={row.application_id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      <span className="font-mono text-emerald-700 font-bold">{row.application_number}</span>
                      <span className="block text-[10px] text-slate-400 truncate max-w-[130px]">{row.program}</span>
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono text-[11px] text-slate-600">{row.academic_year}</td>
                    <td className="py-2.5 px-2 text-center font-bold text-slate-800">{row.readiness_score}</td>
                    <td className="py-2.5 px-2 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                        {row.status}
                      </span>
                    </td>
                    {row.rule_evaluations.map((ev) => (
                      <td key={ev.rule_code} className="py-2.5 px-2 text-center" title={ev.details || ev.title}>
                        {renderMatrixBadge(ev.status)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
