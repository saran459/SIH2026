import React, { useState } from 'react';
import { ExtractedField } from '../../types';
import { Check, Edit2, ShieldCheck, AlertCircle } from 'lucide-react';

interface Props {
  fields: ExtractedField[];
  onVerifyField: (fieldId: number, value: string) => Promise<void>;
}

export const ExtractedFieldsTable: React.FC<Props> = ({ fields, onVerifyField }) => {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const handleStartEdit = (field: ExtractedField) => {
    setEditingId(field.id);
    setEditValue(field.verified_value || field.extracted_value);
  };

  const handleSave = async (fieldId: number) => {
    await onVerifyField(fieldId, editValue);
    setEditingId(null);
  };

  if (!fields || fields.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
        No structured fields extracted from this document yet. Click 'Re-process' to execute field parsing.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
          <tr>
            <th className="px-4 py-3">Statutory Field</th>
            <th className="px-4 py-3">Observed / Extracted Value</th>
            <th className="px-4 py-3">Verified Value</th>
            <th className="px-4 py-3">Confidence</th>
            <th className="px-4 py-3">Page</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {fields.map((f) => (
            <tr key={f.id} className="hover:bg-slate-50/80 transition-colors">
              <td className="px-4 py-3 font-semibold text-slate-900">
                {f.field_name.replace(/_/g, ' ').toUpperCase()}
              </td>
              <td className="px-4 py-3 font-mono text-slate-700 max-w-[200px] truncate" title={f.extracted_value}>
                {f.extracted_value}
              </td>
              <td className="px-4 py-3">
                {editingId === f.id ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="px-2 py-1 text-xs border border-blue-400 rounded-md focus:ring-1 focus:ring-blue-600 focus:outline-hidden"
                    />
                    <button
                      onClick={() => handleSave(f.id)}
                      className="p-1 rounded bg-blue-600 text-white hover:bg-blue-700"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : f.is_verified ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5" /> {f.verified_value || f.extracted_value}
                  </span>
                ) : (
                  <span className="text-slate-400 italic">Unconfirmed</span>
                )}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    f.confidence >= 0.9
                      ? 'bg-emerald-50 text-emerald-800'
                      : f.confidence >= 0.75
                      ? 'bg-amber-50 text-amber-800'
                      : 'bg-rose-50 text-rose-800'
                  }`}
                >
                  {Math.round(f.confidence * 100)}%
                </span>
              </td>
              <td className="px-4 py-3 text-slate-500">p.{f.page_number}</td>
              <td className="px-4 py-3 text-right">
                {editingId !== f.id && (
                  <button
                    onClick={() => handleStartEdit(f)}
                    className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-100 transition-colors"
                    title="Edit or manually confirm value"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
