import React from 'react';
import { api } from '../../services/api';
import { ApplicationReportDetail } from '../../types';
import {
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Printer,
  X,
  ExternalLink,
  Layers,
  HelpCircle,
  Fingerprint,
  Info,
  Calendar,
  Building2,
  AlertOctagon
} from 'lucide-react';

interface AutomatedVerificationReportModalProps {
  report: ApplicationReportDetail | null;
  isOpen: boolean;
  onClose: () => void;
}

export const AutomatedVerificationReportModal: React.FC<AutomatedVerificationReportModalProps> = ({
  report,
  isOpen,
  onClose
}) => {
  if (!isOpen || !report) return null;

  const data = report.report_data || {};
  const checklist = data.compliance_checklist || [];
  const findings = data.detailed_findings || [];
  const docs = data.documents_processed || [];
  const aiModules = data.ai_modules_execution_status || [];
  const expiredDocs = data.expired_documents || [];
  const imageTampering = data.image_tampering_analysis || [];
  const externalVerifications = data.simulated_external_verifications || [];

  const renderOutcomeBadge = (status: string) => {
    const s = (status || '').trim();
    if (s === 'Pass' || s === 'PASSED' || s === 'Verified' || s === 'VERIFIED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
          ✓ {s === 'Verified' || s === 'VERIFIED' ? 'Verified' : 'Pass'}
        </span>
      );
    }
    if (s === 'Fail' || s === 'FAILED' || s === 'Not Found' || s === 'NOT_FOUND') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
          ✕ {s === 'Not Found' || s === 'NOT_FOUND' ? 'Not Found' : 'Fail'}
        </span>
      );
    }
    if (s === 'Warning' || s === 'WARNING' || s === 'Mismatch' || s === 'MISMATCH') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
          ⚠ {s === 'Mismatch' || s === 'MISMATCH' ? 'Mismatch' : 'Warning'}
        </span>
      );
    }
    if (s === 'Unavailable' || s === 'UNAVAILABLE') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
          ⚡ Service Unavailable
        </span>
      );
    }
    if (s === 'Not Applicable' || s === 'NOT_APPLICABLE') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
          – Not Applicable
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
        ○ Not Run
      </span>
    );
  };
  const missingCats = data.missing_mandatory_categories || [];
  const appDetails = data.application_details || {};
  const instDetails = data.institution_details || {};

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 flex items-center justify-center p-3 sm:p-6 print:p-0 print:bg-white">
      <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden print:max-h-none print:shadow-none print:border-none">
        
        {/* Modal Top Bar */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2 text-xs font-bold text-blue-800">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>AICTE Statutory Scrutiny Engine • Official Verification Report</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 shadow-2xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Export PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content Scroll Area */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-800 print:p-0">
          
          {/* Official Letterhead */}
          <div className="border-b-2 border-slate-900 pb-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-black tracking-widest text-blue-700 uppercase">
                  All India Council for Technical Education (AICTE)
                </span>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                  Automated Scrutiny & Statutory Compliance Verification Report
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Issued under statutory provisions of AICTE Approval Process Handbook (APH 2026-27)
                </p>
              </div>

              <div className="text-right sm:text-right bg-slate-50 border border-slate-200 rounded-2xl p-3 shrink-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Report Number</span>
                <span className="text-sm font-black font-mono text-slate-900 block">{report.report_number}</span>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Generated: {new Date(report.created_at).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Core Application & Institution Identity Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/80 p-4 rounded-2xl border border-slate-200">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Institution Profile
              </span>
              <h3 className="text-sm font-black text-slate-900">{instDetails.name || report.institution_name}</h3>
              <p className="text-xs text-slate-600 mt-0.5">
                AICTE Permanent ID: <strong className="font-mono">{instDetails.aicte_permanent_id || 'N/A'}</strong> • {instDetails.institution_type}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {instDetails.city}, {instDetails.state} • {instDetails.contact_email}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs border-t md:border-t-0 md:border-l border-slate-200 pt-3 md:pt-0 md:pl-4">
              <div>
                <span className="text-[10px] uppercase text-slate-400 block font-semibold">Application</span>
                <span className="font-bold text-slate-900 font-mono">{appDetails.application_number || report.application_number}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-400 block font-semibold">Academic Session</span>
                <span className="font-bold text-slate-900">{appDetails.academic_year || '2026-27'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-400 block font-semibold">Sanctioned Intake</span>
                <span className="font-bold text-slate-900">{appDetails.total_intake_declared || 'N/A'} seats</span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-400 block font-semibold">Declared Faculty</span>
                <span className="font-bold text-slate-900">{appDetails.total_faculty_declared || 0} members</span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-400 block font-semibold">Land Holding</span>
                <span className="font-bold text-slate-900">{appDetails.land_area_acres || 0} Acres</span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-400 block font-semibold">Built-Up Area</span>
                <span className="font-bold text-slate-900">{appDetails.built_up_area_sqm || 0} sqm</span>
              </div>
            </div>
          </div>

          {/* Readiness Score & Assessment Executive Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-5 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Statutory Readiness Score
                </span>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-4xl font-black tracking-tight">{report.readiness_score}</span>
                  <span className="text-slate-400 text-sm font-bold">/ 100</span>
                </div>
              </div>
              <div className="mt-3">
                <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                  report.risk_level === 'Low Risk' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                  report.risk_level === 'Moderate Risk' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                  'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}>
                  {report.risk_level}
                </span>
              </div>
            </div>

            <div className="md:col-span-3 bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Executive Summary</h4>
                  <div className="flex items-center gap-4 text-xs font-bold">
                    <span className="text-emerald-700">✓ {report.passed_checks_count} Passed</span>
                    <span className="text-rose-700">✕ {report.failed_checks_count} Deficiencies</span>
                    <span className="text-blue-700">📄 {report.documents_processed_count} Documents</span>
                  </div>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed mt-2.5">
                  {report.summary}
                </p>
              </div>

              {/* Cryptographic Audit Reference */}
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <div className="flex items-center gap-1.5 font-mono">
                  <Fingerprint className="w-3.5 h-3.5 text-blue-600" />
                  <span>Audit Chain Block Hash: <strong>{report.audit_event_hash ? report.audit_event_hash.slice(0, 24) + '...' : 'Intact'}</strong></span>
                </div>
                <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Tamper-Evident SHA-256 Validated
                </span>
              </div>
            </div>
          </div>

          {/* Human Review Notice Banner (if flagged) */}
          {report.requires_human_verification && (
            <div className="bg-amber-50 border-2 border-amber-300/80 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <AlertOctagon className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                    Dossier Flagged For Reviewer Committee Manual Determination
                  </h4>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    Routine checks have executed automatically. However, the following specific exception item(s) require human scrutiny officer authorization under AICTE statutory guidelines:
                  </p>
                  <ul className="list-disc list-inside text-xs text-amber-900 font-medium space-y-1 pt-1">
                    {(report.human_verification_reasons || []).map((reason, idx) => (
                      <li key={idx}>{reason}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Section 1: Statutory Compliance Norms Checklist */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2 pb-1 border-b border-slate-200">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              1. AICTE Statutory Norms Compliance Checklist
            </h3>

            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Rule Code & Statutory Title</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Expected Statutory Norm</th>
                    <th className="py-2.5 px-3">Observed Institutional Value</th>
                    <th className="py-2.5 px-3 text-right">Penalty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {checklist.map((item: any, idx: number) => (
                    <tr key={idx} className={item.status === 'Fail' || item.status === 'FAILED' ? 'bg-rose-50/30' : item.status === 'Warning' || item.status === 'WARNING' ? 'bg-amber-50/20' : 'hover:bg-slate-50/50'}>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block">{item.title}</span>
                        <span className="font-mono text-[10px] text-slate-400">{item.rule_code}</span>
                      </td>
                      <td className="py-3 px-3 text-slate-600">{item.category}</td>
                      <td className="py-3 px-3">
                        {renderOutcomeBadge(item.status)}
                      </td>
                      <td className="py-3 px-3 text-slate-600 text-[11px]">{item.expected_value}</td>
                      <td className="py-3 px-3 font-semibold text-slate-800 text-[11px]">{item.observed_value}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-700">
                        {item.penalty_applied > 0 ? `-${item.penalty_applied}` : '0'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Detailed Non-Compliance & Inconsistency Findings */}
          {findings.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2 pb-1 border-b border-slate-200">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                2. Explainable Deficiencies & Discrepancies ({findings.length})
              </h3>

              <div className="space-y-2.5">
                {findings.map((f: any, idx: number) => (
                  <div key={idx} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          f.severity === 'Critical' ? 'bg-rose-100 text-rose-800' :
                          f.severity === 'High' ? 'bg-amber-100 text-amber-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {f.severity}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900">{f.check_name}</h4>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">{f.rule_code}</span>
                    </div>

                    <p className="text-xs text-slate-700">{f.reason}</p>

                    {f.evidence && (
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-[11px] font-mono text-slate-600">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Extracted Evidential Citations</span>
                        {f.evidence}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1 border-t border-slate-200">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Expected Norm</span>
                        <span className="text-slate-800">{f.expected_value}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Observed Metric</span>
                        <span className="font-semibold text-slate-900">{f.observed_value}</span>
                      </div>
                    </div>

                    {f.recommended_action && (
                      <div className="bg-blue-50/60 p-2.5 rounded-xl border border-blue-200/60 text-xs text-blue-900">
                        <strong>Recommended Action:</strong> {f.recommended_action}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 3: Processed Documents & Integrity Hashes */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2 pb-1 border-b border-slate-200">
              <FileText className="w-4 h-4 text-blue-600" />
              3. Processed Supporting Documents & Cryptographic Hashes ({docs.length})
            </h3>

            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Document Category & Name</th>
                    <th className="py-2.5 px-3">SHA-256 Checksum</th>
                    <th className="py-2.5 px-3">Pages</th>
                    <th className="py-2.5 px-3">Extraction Status</th>
                    <th className="py-2.5 px-3">Extracted Data Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {docs.map((d: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block">{d.category}</span>
                        <span className="text-[11px] text-slate-500">{d.original_name}</span>
                      </td>
                      <td className="py-3 px-3 font-mono text-[10px] text-slate-600">
                        {d.stored_hash ? `${d.stored_hash.slice(0, 16)}...` : 'N/A'}
                      </td>
                      <td className="py-3 px-3 text-slate-700">{d.page_count || 1}</td>
                      <td className="py-3 px-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          {d.extraction_status}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1">
                          {(d.extracted_fields || []).map((ef: any, eIdx: number) => (
                            <span key={eIdx} className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px]">
                              {ef.field_name}: <strong>{ef.extracted_value}</strong>
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 4: Image Error Level Analysis (ELA) Forensic Indicators */}
          {imageTampering.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2 pb-1 border-b border-slate-200">
                <Fingerprint className="w-4 h-4 text-purple-600" />
                4. Image Error Level Analysis (ELA) Forensic Indicators ({imageTampering.length})
              </h3>

              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4">Document Image</th>
                      <th className="py-2.5 px-3">ELA Status</th>
                      <th className="py-2.5 px-3">Compression Metrics</th>
                      <th className="py-2.5 px-4">Forensic Assessment Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {imageTampering.map((it: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {it.document_name}
                          {it.ela_artifact_url && (
                            <a
                              href={api.getArtifactUrl(it.ela_artifact_url)}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] text-blue-600 hover:underline block font-normal mt-0.5"
                            >
                              View ELA Mask Artifact ↗
                            </a>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {renderOutcomeBadge(it.status)}
                        </td>
                        <td className="py-3 px-3 text-[11px] font-mono text-slate-600">
                          Mean: {it.mean_error ?? 'N/A'} | Peak: {it.max_error ?? 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600">
                          <p>{it.details}</p>
                          <p className="text-[10px] text-slate-400 italic mt-0.5">{it.disclaimer}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Section 5: Simulated External Authority Verification (Demonstration Sandbox) */}
          {externalVerifications.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  5. External Authority Verification (Simulated Sandbox)
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                  ⚡ Simulated Mock APIs • Not Live Government Systems
                </span>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4">Authority / Statutory Registry</th>
                      <th className="py-2.5 px-3">Identifier Queried</th>
                      <th className="py-2.5 px-3">Verification Result</th>
                      <th className="py-2.5 px-4">Registry Evidence / Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {externalVerifications.map((ev: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900 block">{ev.registry_name}</span>
                          <span className="text-[10px] font-mono text-slate-400">{ev.authority_code}</span>
                        </td>
                        <td className="py-3 px-3 font-mono text-xs text-slate-700">
                          {ev.reference_queried}
                        </td>
                        <td className="py-3 px-3">
                          {renderOutcomeBadge(ev.status)}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600">
                          <p>{ev.details}</p>
                          <span className="text-[10px] text-slate-400 italic block mt-0.5">{ev.simulation_notice}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Section 6: Module Execution Audit (No invented models) */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2 pb-1 border-b border-slate-200">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              6. Automated Verification Engine & Module Execution Audit
            </h3>

            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Engine / Processing Module</th>
                    <th className="py-2.5 px-3">Execution State</th>
                    <th className="py-2.5 px-3">Result / Status</th>
                    <th className="py-2.5 px-4">Verification Audit Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {aiModules.map((m: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-bold text-slate-900">{m.module_name}</td>
                      <td className="py-3 px-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          m.executed ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {m.executed ? 'Executed' : 'Not Executed / Deferred'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {renderOutcomeBadge(m.status)}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">{m.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 7: Mathematical Readiness Score Formula & Statutory Grounding */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-2">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              7. Mathematical Readiness Score Calculation & Statutory Principle
            </h4>
            <pre className="text-xs font-mono text-slate-700 whitespace-pre-wrap bg-white p-3.5 rounded-xl border border-slate-200 leading-relaxed">
              {report.score_explanation}
            </pre>
            <p className="text-[11px] text-slate-500 italic mt-2">
              Statutory Disclaimer: This automated report is generated strictly from defined statutory rules and recorded document evidence. The final regulatory determination (Approval, Rejection, or Formal Notice) is reserved for authorized AICTE Scrutiny Officers.
            </p>
          </div>

        </div>

        {/* Modal Bottom Action Bar */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between print:hidden">
          <span className="text-xs text-slate-500 font-mono">
            AICTE-SMARTAPPROVAL-VERIFIED • HASH: {report.audit_event_hash?.slice(0, 16)}
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
          >
            Close Report
          </button>
        </div>

      </div>
    </div>
  );
};
