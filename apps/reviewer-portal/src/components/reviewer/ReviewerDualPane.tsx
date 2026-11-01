import React, { useState } from 'react';
import { Application, DocumentItem, ComplianceFinding, ReviewerComment } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { SeverityBadge } from '../common/SeverityBadge';
import { ScoreGauge } from '../common/ScoreGauge';
import {
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MessageSquare,
  Eye,
  ExternalLink,
  Send,
  Building2,
  Calendar,
  Layers,
  Trash2
} from 'lucide-react';

interface Props {
  application: Application;
  documents: DocumentItem[];
  findings: ComplianceFinding[];
  comments: ReviewerComment[];
  onRequestCorrection: () => void;
  onApprove: () => void;
  onReject: () => void;
  onDelete?: () => void;
  onResolveFinding: (findingId: number, status: string, notes: string) => Promise<void>;
}

export const ReviewerDualPane: React.FC<Props> = ({
  application,
  documents,
  findings,
  comments,
  onRequestCorrection,
  onApprove,
  onReject,
  onDelete,
  onResolveFinding
}) => {
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(
    documents.length > 0 ? documents[0] : null
  );
  const [activeRightTab, setActiveRightTab] = useState<'findings' | 'comments' | 'metrics'>('findings');

  return (
    <div className="space-y-4">
      {/* Top Banner with Review Controls */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
              {application.application_number}
            </span>
            <StatusBadge status={application.status} />
          </div>
          <h3 className="text-base font-bold text-slate-900 mt-1">
            {application.institution_name}
          </h3>
          <p className="text-xs text-slate-500">
            {application.category} • {application.program} • {application.academic_year}
          </p>
        </div>

        {/* Reviewer Decision Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={onRequestCorrection}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 transition-colors shadow-2xs"
          >
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Request Correction</span>
          </button>
          <button
            onClick={onReject}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-300 hover:bg-rose-100 transition-colors shadow-2xs"
          >
            <XCircle className="w-4 h-4 text-rose-600" />
            <span>Reject</span>
          </button>
          <button
            onClick={onApprove}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Formal Approval</span>
          </button>
          {onDelete && (
            <button
              onClick={onDelete}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-300 hover:bg-rose-100 transition-colors shadow-2xs cursor-pointer"
              title="Permanently Delete Application"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>Delete</span>
            </button>
          )}
        </div>
      </div>

      {/* Dual Split Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Pane: Document Viewer & Files (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-150 mb-3">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                Submitted Evidences ({documents.length})
              </span>
              <span className="text-[11px] text-slate-500">Select certificate to inspect</span>
            </div>

            {/* Document Selector Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4">
              {documents.map((doc) => {
                const isSelected = selectedDoc?.id === doc.id;
                return (
                  <button
                    key={doc.id}
                    onClick={() => setSelectedDoc(doc)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all border shrink-0 ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {doc.category}
                  </button>
                );
              })}
            </div>

            {/* Document Details & Text Preview */}
            {selectedDoc ? (
              <div className="space-y-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 block">{selectedDoc.original_name}</span>
                    <span className="text-[11px] text-slate-500">
                      SHA-256: {selectedDoc.file_hash.substring(0, 16)}... • {selectedDoc.page_count} pages
                    </span>
                  </div>
                  <a
                    href={`/api/documents/${selectedDoc.id}/preview`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open Raw File</span>
                  </a>
                </div>

                {/* Extracted Text Pane */}
                <div className="p-4 bg-slate-950 text-slate-200 rounded-2xl border border-slate-800 font-mono text-[11px] h-88 overflow-y-auto leading-relaxed whitespace-pre-wrap">
                  {selectedDoc.raw_text || '[Text parsing in progress...]'}
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-xs text-slate-400">
                No documents uploaded for this application.
              </div>
            )}
          </div>
        </div>

        {/* Right Pane: Scrutiny Findings, Comments & Score (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs">
            {/* Tabs */}
            <div className="flex items-center gap-2 pb-3 border-b border-slate-150 mb-4">
              <button
                onClick={() => setActiveRightTab('findings')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  activeRightTab === 'findings'
                    ? 'bg-blue-50 text-blue-800 border border-blue-200'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Findings ({findings.length})
              </button>
              <button
                onClick={() => setActiveRightTab('comments')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  activeRightTab === 'comments'
                    ? 'bg-blue-50 text-blue-800 border border-blue-200'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Queries & Remarks ({comments.length})
              </button>
              <button
                onClick={() => setActiveRightTab('metrics')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  activeRightTab === 'metrics'
                    ? 'bg-blue-50 text-blue-800 border border-blue-200'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Readiness Score
              </button>
            </div>

            {/* Content for Findings */}
            {activeRightTab === 'findings' && (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {findings.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    No active compliance findings. All statutory checks satisfied.
                  </div>
                ) : (
                  findings.map((f) => (
                    <div
                      key={f.id}
                      className="p-3.5 rounded-2xl border border-slate-200 hover:border-slate-300 text-xs space-y-2 bg-slate-50/40"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <SeverityBadge severity={f.severity} />
                            {f.rule_code && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                {f.rule_code}
                              </span>
                            )}
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">
                              {f.finding_type}
                            </span>
                          </div>
                          <span className="font-bold text-slate-900 leading-tight block mt-1">{f.title}</span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          f.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {f.status}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-600 leading-relaxed">{f.description}</p>

                      {/* Source Document Reference */}
                      {(f.document_name || f.page_number) && (
                        <div className="text-[10px] text-slate-500 bg-white p-2 rounded-lg border border-slate-200">
                          <span>Evidence Source: <strong>{f.document_name || `Doc #${f.document_id}`}</strong></span>
                          {f.page_number && <span className="ml-1">(Page {f.page_number})</span>}
                          {f.comparison_document_name && (
                            <span className="block mt-0.5 text-slate-600">Compared with: <strong>{f.comparison_document_name}</strong></span>
                          )}
                        </div>
                      )}

                      {/* Expected vs Observed */}
                      {(f.expected_value || f.observed_value) && (
                        <div className="text-[10px] font-mono p-2 rounded-lg bg-slate-100 space-y-0.5">
                          {f.expected_value && <div>Criteria: <span className="text-slate-700">{f.expected_value}</span></div>}
                          {f.observed_value && <div>Observed: <span className="text-rose-700 font-bold">{f.observed_value}</span></div>}
                        </div>
                      )}

                      {f.recommended_action && (
                        <div className="text-[11px] text-blue-800 bg-blue-50 p-2 rounded-lg border border-blue-100">
                          <strong>Rec:</strong> {f.recommended_action}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1 text-[10px] text-slate-500">
                        <span>Status: <strong className={f.status === 'Resolved' ? 'text-emerald-700' : 'text-amber-700'}>{f.status}</strong></span>
                        {f.status !== 'Resolved' && (
                          <button
                            onClick={() => {
                              const notes = window.prompt('Enter mandatory resolution notes (minimum 5 characters):', 'Verified original document during scrutiny.');
                              if (notes && notes.trim().length >= 5) {
                                onResolveFinding(f.id, 'Resolved', notes.trim());
                              }
                            }}
                            className="text-xs font-semibold text-emerald-700 hover:underline"
                          >
                            Mark Resolved
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Content for Reviewer Comments */}
            {activeRightTab === 'comments' && (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {comments.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    No scrutiny queries recorded yet. Click 'Request Correction' above to post a query.
                  </div>
                ) : (
                  comments.map((c) => (
                    <div
                      key={c.id}
                      className="p-3.5 rounded-2xl border border-slate-200 text-xs space-y-2 bg-slate-50/50"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{c.title}</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(c.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-700 italic bg-white p-2.5 rounded-lg border border-slate-200/80">
                        "{c.comment}"
                      </p>
                      {c.institution_response ? (
                        <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-900">
                          <strong>Institution Reply: </strong> {c.institution_response}
                        </div>
                      ) : (
                        <span className="text-[10px] text-amber-700 font-semibold">
                          Awaiting institutional response
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Content for Readiness Score */}
            {activeRightTab === 'metrics' && (
              <div className="p-6 flex flex-col items-center justify-center space-y-4">
                <ScoreGauge score={application.readiness_score} size="lg" />
                <div className="w-full space-y-2 text-xs pt-4 border-t border-slate-150">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Declared Faculty:</span>
                    <span className="font-bold text-slate-800">{application.total_faculty_declared} members</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Approved Intake:</span>
                    <span className="font-bold text-slate-800">{application.total_intake_declared} seats</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Built-up Carpet Area:</span>
                    <span className="font-bold text-slate-800">{application.built_up_area_sqm} sqm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Contiguous Land:</span>
                    <span className="font-bold text-slate-800">{application.land_area_acres} acres</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
