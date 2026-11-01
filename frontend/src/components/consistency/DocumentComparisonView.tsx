import React, { useState } from 'react';
import { ComplianceFinding, DocumentItem } from '../../types';
import { SeverityBadge } from '../common/SeverityBadge';
import { Columns, AlertTriangle, CheckCircle2, FileText, ArrowRight, ShieldAlert } from 'lucide-react';

interface Props {
  findings: ComplianceFinding[];
  documents: DocumentItem[];
  onResolveFinding: (findingId: number, status: string, notes: string) => Promise<void>;
  onOpenDocument?: (docId: number) => void;
}

export const DocumentComparisonView: React.FC<Props> = ({
  findings,
  documents,
  onResolveFinding,
  onOpenDocument
}) => {
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedFinding, setSelectedFinding] = useState<ComplianceFinding | null>(
    findings.length > 0 ? findings[0] : null
  );
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const filtered = findings.filter((f) => {
    if (filterSeverity !== 'all' && f.severity !== filterSeverity) return false;
    if (filterStatus === 'unresolved' && f.status === 'Resolved') return false;
    if (filterStatus === 'resolved' && f.status !== 'Resolved') return false;
    return true;
  });

  const getDocById = (id?: number) => documents.find((d) => d.id === id);

  const handleResolve = async () => {
    if (!selectedFinding || !resolutionNotes.trim()) return;
    setSubmitting(true);
    try {
      await onResolveFinding(selectedFinding.id, 'Resolved', resolutionNotes);
      setResolutionNotes('');
    } finally {
      setSubmitting(false);
    }
  };

  if (findings.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-xs">
        <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-bold text-slate-900">Zero Cross-Document Inconsistencies Detected</h4>
        <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
          The consistency intelligence engine matched institutional title, faculty headcount, and built-up area across all verified document bundles with 100% statutory uniformity.
        </p>
      </div>
    );
  }

  const currentFinding = selectedFinding || filtered[0] || findings[0];
  const doc1 = getDocById(currentFinding?.document_id);
  const doc2 = getDocById(currentFinding?.comparison_document_id);

  return (
    <div className="space-y-4">
      {/* Controls & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2">
          <Columns className="w-5 h-5 text-indigo-600" />
          <div>
            <h4 className="text-sm font-bold text-slate-900">Cross-Document Consistency Intelligence</h4>
            <p className="text-[11px] text-slate-500">
              Correlating declared metrics against notarized deeds, rosters, and fire clearances
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-300 rounded-xl bg-slate-50 text-xs"
          >
            <option value="all">All Severities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-300 rounded-xl bg-slate-50 text-xs"
          >
            <option value="all">All Statuses</option>
            <option value="unresolved">Unresolved</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left List of Mismatches */}
        <div className="lg:col-span-1 space-y-2">
          <div className="px-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Flagged Discrepancies ({filtered.length})
          </div>
          <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1">
            {filtered.map((f) => {
              const isSelected = currentFinding?.id === f.id;
              return (
                <div
                  key={f.id}
                  onClick={() => setSelectedFinding(f)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-blue-50/70 border-blue-400 shadow-xs ring-1 ring-blue-300'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className="text-xs font-bold text-slate-900 leading-tight">{f.title}</span>
                    <SeverityBadge severity={f.severity} />
                  </div>
                  <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                    {f.description}
                  </p>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-400">
                    <span>Observed: {f.observed_value}</span>
                    <span className={f.status === 'Resolved' ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
                      {f.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Dual Document Comparison Panels */}
        {currentFinding && (
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-150">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                      Discrepancy Investigation
                    </span>
                    <SeverityBadge severity={currentFinding.severity} />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-1">{currentFinding.title}</h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{currentFinding.description}</p>
                </div>
              </div>

              {/* Dual Panels */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-5">
                {/* Panel 1 */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800 mb-2">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span className="truncate">{doc1 ? doc1.original_name : currentFinding.document_name || 'Primary Document'}</span>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs text-slate-700 font-mono mb-2">
                      Observed: <span className="font-bold text-blue-700">{currentFinding.observed_value?.split('|')[0] || 'Value 1'}</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Category: {doc1?.category || 'Evidence Document'} • Page: {currentFinding.page_number || 1}
                    </p>
                  </div>
                  {doc1 && onOpenDocument && (
                    <button
                      onClick={() => onOpenDocument(doc1.id)}
                      className="mt-3 text-xs font-semibold text-blue-600 hover:underline text-left"
                    >
                      View Source Document →
                    </button>
                  )}
                </div>

                {/* Panel 2 */}
                <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800 mb-2">
                      <FileText className="w-4 h-4 text-amber-600" />
                      <span className="truncate">{doc2 ? doc2.original_name : currentFinding.comparison_document_name || 'Comparison Document'}</span>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-amber-300 text-xs text-slate-700 font-mono mb-2">
                      Observed: <span className="font-bold text-amber-700">{currentFinding.observed_value?.split('|')[1] || 'Value 2'}</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Category: {doc2?.category || 'Comparison Reference'}
                    </p>
                  </div>
                  {doc2 && onOpenDocument && (
                    <button
                      onClick={() => onOpenDocument(doc2.id)}
                      className="mt-3 text-xs font-semibold text-amber-700 hover:underline text-left"
                    >
                      View Source Document →
                    </button>
                  )}
                </div>
              </div>

              {/* Evidence Excerpt */}
              {currentFinding.evidence_excerpt && (
                <div className="p-3.5 bg-slate-100/70 rounded-xl border border-slate-200 text-xs mb-4">
                  <span className="font-semibold text-slate-800 block mb-1">Extracted Evidence Snippet:</span>
                  <pre className="text-[11px] text-slate-700 font-mono whitespace-pre-wrap leading-relaxed">
                    {currentFinding.evidence_excerpt}
                  </pre>
                </div>
              )}

              {/* Recommended Action */}
              <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200 text-xs text-blue-900 mb-5 leading-relaxed">
                <span className="font-bold">AICTE Statutory Recommendation: </span>
                {currentFinding.recommended_action}
              </div>

              {/* Resolution Form */}
              {currentFinding.status !== 'Resolved' ? (
                <div className="border-t border-slate-150 pt-4">
                  <h5 className="text-xs font-bold text-slate-800 mb-2">
                    Mark Inconsistency as Resolved / Accepted with Justification
                  </h5>
                  <textarea
                    rows={3}
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    placeholder="Enter factual explanation (e.g., appointment orders confirmed, corrected muster roll uploaded, or legal name variance reconciled)..."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                  />
                  <div className="flex justify-end gap-2 mt-2.5">
                    <button
                      onClick={handleResolve}
                      disabled={submitting || !resolutionNotes.trim()}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs disabled:opacity-50 transition-colors"
                    >
                      {submitting ? 'Recording...' : 'Resolve Finding'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800">
                  <span className="font-bold">Resolved: </span>
                  {currentFinding.resolution_notes || 'Accepted with verified justification.'}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
