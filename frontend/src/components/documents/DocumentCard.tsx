import React from 'react';
import { DocumentItem } from '../../types';
import { FileText, Eye, RefreshCw, Hash, Calendar, Layers } from 'lucide-react';

interface Props {
  document: DocumentItem;
  onPreview: (doc: DocumentItem) => void;
  onReprocess: (id: number) => void;
}

export const DocumentCard: React.FC<Props> = ({ document, onPreview, onReprocess }) => {
  const getStatusBadge = () => {
    switch (document.extraction_status) {
      case 'Extraction Complete':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'Processing':
        return 'bg-blue-50 text-blue-800 border-blue-200 animate-pulse';
      case 'Review Required':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'Failed':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 border border-blue-100">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h5 className="text-xs font-bold text-slate-900 truncate" title={document.original_name}>
                {document.original_name}
              </h5>
              <span className="text-[11px] font-semibold text-blue-700">{document.category}</span>
            </div>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${getStatusBadge()}`}>
            {document.extraction_status}
          </span>
        </div>

        {/* Metadata Details */}
        <div className="space-y-1.5 text-[11px] text-slate-500 bg-slate-50 p-3 rounded-xl mb-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-600">
              <Layers className="w-3.5 h-3.5" /> Size & Pages
            </span>
            <span className="font-semibold text-slate-800">
              {(document.file_size / (1024 * 1024)).toFixed(2)} MB • {document.page_count} pg
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-600">
              <Hash className="w-3.5 h-3.5" /> SHA-256 Hash
            </span>
            <span className="font-mono text-[10px] text-slate-700 truncate max-w-[150px]" title={document.file_hash}>
              {document.file_hash.substring(0, 16)}...
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-600">
              <Calendar className="w-3.5 h-3.5" /> Uploaded
            </span>
            <span className="text-slate-700">{new Date(document.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Extracted Fields Count */}
        <div className="flex items-center justify-between text-xs mb-3 px-1">
          <span className="text-slate-500">Extracted Fields:</span>
          <span className="font-bold text-slate-800">
            {document.extracted_fields?.length || 0} fields parsed
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
        <button
          onClick={() => onPreview(document)}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Preview</span>
        </button>
        <button
          onClick={() => onReprocess(document.id)}
          className="p-1.5 rounded-xl text-slate-600 hover:text-blue-700 hover:bg-blue-50 border border-slate-200 transition-colors"
          title="Re-run text extraction & OCR"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
