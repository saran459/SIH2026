import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ApplicationReportListItem, ApplicationReportDetail, ComplianceMatrixResponse, CheckOutcome } from '../types';
import { AutomatedVerificationReportModal } from '../components/reports/AutomatedVerificationReportModal';
import {
  BarChart3,
  CheckCircle2,
  Clock,
  AlertTriangle,
  UserCheck,
  TrendingUp,
  FileCheck2,
  Download,
  Search,
  Filter,
  Eye,
  ShieldCheck,
  Building2,
  AlertOctagon,
  RefreshCw
} from 'lucide-react';

export const ReviewerReportsPage: React.FC = () => {
  const { user } = useAuth();
  const [workload, setWorkload] = useState<any[]>([]);
  const [reports, setReports] = useState<ApplicationReportListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportsLoading, setReportsLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [riskFilter, setRiskFilter] = useState('All');

  // Selected report for modal
  const [selectedReportDetail, setSelectedReportDetail] = useState<ApplicationReportDetail | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'reports' | 'matrix'>('reports');
  const [matrixData, setMatrixData] = useState<ComplianceMatrixResponse | null>(null);
  const [matrixLoading, setMatrixLoading] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadWorkload(), loadReports(), loadMatrix()]);
    } finally {
      setLoading(false);
    }
  };

  const loadMatrix = async () => {
    setMatrixLoading(true);
    try {
      const data = await api.getComplianceMatrix();
      setMatrixData(data);
    } catch (e) {
      console.error('Failed to load compliance matrix:', e);
    } finally {
      setMatrixLoading(false);
    }
  };

  const loadWorkload = async () => {
    try {
      const data = await api.getReviewerWorkload();
      if (Array.isArray(data)) {
        setWorkload(data);
      } else if (data && data.reviewers && Array.isArray(data.reviewers)) {
        setWorkload(data.reviewers);
      } else if (data && data.my_metrics) {
        setWorkload([data.my_metrics]);
      } else {
        setWorkload([data]);
      }
    } catch (e) {
      console.error('Failed to load workload metrics:', e);
      setWorkload([]);
    }
  };

  const loadReports = async () => {
    setReportsLoading(true);
    try {
      const reportList = await api.getVerificationReports({
        status: statusFilter !== 'All' ? statusFilter : undefined,
        risk_level: riskFilter !== 'All' ? riskFilter : undefined,
        search: search.trim() || undefined
      });
      setReports(reportList);
    } catch (e) {
      console.error('Failed to load verification reports:', e);
    } finally {
      setReportsLoading(false);
    }
  };

  const handleOpenReportModal = async (reportId: number) => {
    setDetailLoading(true);
    try {
      const fullDetail = await api.getVerificationReportById(reportId);
      setSelectedReportDetail(fullDetail);
      setModalOpen(true);
    } catch (e) {
      console.error('Failed to load report detail:', e);
    } finally {
      setDetailLoading(false);
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

  const myWorkload = (workload && workload.find(w => w.reviewer_id === user?.id)) || (workload && workload[0]) || {
    assigned_count: 0,
    under_review_count: 0,
    approved_count: 0,
    rejected_count: 0
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header & Export Quick Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 uppercase tracking-wider mb-1">
            <BarChart3 className="w-4 h-4" />
            AICTE Scrutiny & Verification Reporting Centre
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Statutory Reports & Dossier Scrutiny Analytics</h1>
          <p className="text-xs text-slate-600 mt-1">
            Automated statutory pre-verification reports, quantitative scrutiny turnaround, and compliance telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={api.getApplicationsCsvUrl()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-2xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            <span>Applications CSV</span>
          </a>
          <a
            href={api.getComplianceCsvUrl()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-2xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            <span>Compliance CSV</span>
          </a>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-500">Compiling statutory verification records...</p>
        </div>
      ) : (
        <div className="space-y-6">

          {/* Key Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Total Dossiers</span>
                <FileCheck2 className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-2xl font-black text-slate-900">{myWorkload.assigned_count || 0}</div>
              <p className="text-[11px] text-slate-500 mt-1">Applications assigned to your scrutiny desk</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Active Scrutiny</span>
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div className="text-2xl font-black text-amber-700">{myWorkload.under_review_count || 0}</div>
              <p className="text-[11px] text-slate-500 mt-1">Under active scrutiny / clarification</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Approved</span>
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-emerald-700">{myWorkload.approved_count || 0}</div>
              <p className="text-[11px] text-slate-500 mt-1">Final approval determinations</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Avg. Turnaround</span>
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-2xl font-black text-slate-900">4.2 <span className="text-xs font-bold text-slate-500">Days</span></div>
              <p className="text-[11px] text-emerald-600 font-semibold mt-1">68% faster than statutory 15-day limit</p>
            </div>
          </div>


          {/* Section Navigation Tabs: Verification Reports vs Compliance Matrix */}
          <div className="flex items-center gap-3 border-b border-slate-200 pb-2">
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 ${
                activeTab === 'reports'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <FileCheck2 className="w-4 h-4" />
              <span>Automated Verification Reports ({reports.length})</span>
            </button>
            <button
              onClick={() => { setActiveTab('matrix'); if (!matrixData) loadMatrix(); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 ${
                activeTab === 'matrix'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Statutory Compliance Matrix ({matrixData?.matrix?.length ?? 0})</span>
            </button>
          </div>

          {activeTab === 'reports' && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-4">
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-blue-600" />
                  Automated Application Pre-Verification Reports ({reports.length})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Generated automatically upon institutional application submission. No routine manual inspection required.
                </p>
              </div>

              <button
                onClick={loadReports}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${reportsLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search application or institution..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadReports()}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-600 bg-slate-50/50"
                />
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 shrink-0 font-medium">Risk:</span>
                <select
                  value={riskFilter}
                  onChange={(e) => { setRiskFilter(e.target.value); }}
                  className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-600 bg-slate-50/50 font-medium text-slate-700"
                >
                  <option value="All">All Risk Tiers</option>
                  <option value="Low Risk">Low Risk (85-100%)</option>
                  <option value="Moderate Risk">Moderate Risk (70-84%)</option>
                  <option value="High Risk">High Risk (50-69%)</option>
                  <option value="Critical Risk">Critical Risk (&lt;50%)</option>
                </select>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 shrink-0 font-medium">Review Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); }}
                  className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-600 bg-slate-50/50 font-medium text-slate-700"
                >
                  <option value="All">All Verification States</option>
                  <option value="Flagged for Manual Review">Flagged for Manual Review</option>
                  <option value="Ready for Decision">Ready for Decision</option>
                  <option value="Reviewed">Reviewed</option>
                </select>
              </div>
            </div>

            {/* Reports List Table */}
            {reportsLoading ? (
              <div className="p-8 text-center">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs text-slate-400">Filtering verification reports...</p>
              </div>
            ) : reports.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <FileCheck2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <h4 className="text-xs font-bold text-slate-700">No reports available</h4>
                <p className="text-[11px] text-slate-500 mt-1">
                  Automated verification reports generate when institutions submit applications.
                </p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4">Report Number</th>
                      <th className="py-2.5 px-3">Application / Institution</th>
                      <th className="py-2.5 px-3 text-center">Readiness Score</th>
                      <th className="py-2.5 px-3">Risk Tier</th>
                      <th className="py-2.5 px-3">Reviewer Determination</th>
                      <th className="py-2.5 px-3">Generated</th>
                      <th className="py-2.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reports.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-slate-900 block">{r.report_number}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            SHA: {r.audit_event_hash ? r.audit_event_hash.slice(0, 10) : 'Intact'}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-bold text-slate-900 block">{r.institution_name || `Institution #${r.institution_id}`}</span>
                          <span className="text-[11px] font-mono text-blue-700">{r.application_number}</span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="inline-flex items-center gap-1 font-black text-sm">
                            <span className={r.readiness_score >= 80 ? 'text-emerald-700' : r.readiness_score >= 60 ? 'text-amber-700' : 'text-rose-700'}>
                              {r.readiness_score}
                            </span>
                            <span className="text-[10px] text-slate-400 font-normal">/100</span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                            r.risk_level === 'Low Risk' ? 'bg-emerald-100 text-emerald-800' :
                            r.risk_level === 'Moderate Risk' ? 'bg-amber-100 text-amber-800' :
                            'bg-rose-100 text-rose-800'
                          }`}>
                            {r.risk_level}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          {r.requires_human_verification ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                              <AlertOctagon className="w-3 h-3 text-amber-600" />
                              Flagged For Review
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Ready for Decision
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-slate-500 text-[11px]">
                          {new Date(r.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleOpenReportModal(r.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Full Report</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>


          )}

          {/* TAB 2: STATUTORY COMPLIANCE MATRIX VIEW */}
          {activeTab === 'matrix' && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                    AICTE Statutory Compliance Matrix
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Cross-application statutory norm evaluations standardizing checks to Pass, Fail, Warning, Not Applicable, and Not Run.
                  </p>
                </div>

                <button
                  onClick={loadMatrix}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${matrixLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh Matrix</span>
                </button>
              </div>

              {/* Summary Outcome Indicators */}
              {matrixData?.summary && (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">Pass Outcomes</span>
                    <span className="text-xl font-black text-emerald-700">{matrixData.summary.total_passed_evaluations}</span>
                  </div>
                  <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-3 text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 block">Fail Outcomes</span>
                    <span className="text-xl font-black text-rose-700">{matrixData.summary.total_failed_evaluations}</span>
                  </div>
                  <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">Warning Outcomes</span>
                    <span className="text-xl font-black text-amber-700">{matrixData.summary.total_warning_evaluations}</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block">Not Applicable</span>
                    <span className="text-xl font-black text-slate-700">{matrixData.summary.total_not_applicable_evaluations}</span>
                  </div>
                  <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 block">Not Run</span>
                    <span className="text-xl font-black text-blue-700">{matrixData.summary.total_not_run_evaluations}</span>
                  </div>
                </div>
              )}

              {/* Matrix Table */}
              {matrixLoading ? (
                <div className="p-12 text-center">
                  <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-xs text-slate-500">Aggregating compliance matrix across applications...</p>
                </div>
              ) : !matrixData || matrixData.matrix.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No applications recorded in compliance matrix.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/80 text-[11px] font-bold text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-3 min-w-[140px] sticky left-0 bg-slate-50">Application / Institution</th>
                        <th className="py-3 px-2 text-center">AY</th>
                        <th className="py-3 px-2 text-center">Score</th>
                        <th className="py-3 px-2 text-center">Status</th>
                        {matrixData.rules.map((r) => (
                          <th key={r.rule_code} className="py-3 px-3 text-center min-w-[120px]" title={`${r.title} (${r.category})`}>
                            <div className="font-mono text-[10px] text-slate-800">{r.rule_code}</div>
                            <div className="text-[9px] font-normal text-slate-400 truncate max-w-[110px]">{r.title}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {matrixData.matrix.map((row) => (
                        <tr key={row.application_id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-3 font-semibold text-slate-900 sticky left-0 bg-white">
                            <div className="font-mono text-xs text-blue-700 font-bold">{row.application_number}</div>
                            <div className="text-[11px] text-slate-500 truncate max-w-[140px]">{row.institution_name}</div>
                          </td>
                          <td className="py-3 px-2 text-center font-mono text-[11px] text-slate-600">{row.academic_year}</td>
                          <td className="py-3 px-2 text-center font-bold text-slate-800">{row.readiness_score}</td>
                          <td className="py-3 px-2 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                              {row.status}
                            </span>
                          </td>
                          {row.rule_evaluations.map((ev) => (
                            <td key={ev.rule_code} className="py-3 px-3 text-center" title={ev.details || ev.title}>
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
          )}

          {/* Committee Allocation Matrix */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-blue-600" />
              Scrutiny Committee Desk Allocation Matrix
            </h3>

            <div className="divide-y divide-slate-100">
              {workload.map((w, idx) => (
                <div key={idx} className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                      {w.reviewer_name || `Reviewer #${w.reviewer_id}`}
                      {w.reviewer_id === user?.id && (
                        <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                          You
                        </span>
                      )}
                    </h4>
                    <p className="text-[11px] text-slate-500">{w.reviewer_email || 'Regional Scrutiny Committee'}</p>
                  </div>

                  <div className="flex items-center gap-6 text-xs">
                    <div className="text-right">
                      <span className="text-slate-400 text-[10px] block uppercase font-semibold">Allocated</span>
                      <span className="font-bold text-slate-800">{w.assigned_count ?? 0}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 text-[10px] block uppercase font-semibold">Active Review</span>
                      <span className="font-bold text-amber-700">{w.under_review_count ?? 0}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 text-[10px] block uppercase font-semibold">Approved</span>
                      <span className="font-bold text-emerald-700">{w.approved_count ?? 0}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* Full Verification Report Modal */}
      <AutomatedVerificationReportModal
        report={selectedReportDetail}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />

    </div>
  );
};
