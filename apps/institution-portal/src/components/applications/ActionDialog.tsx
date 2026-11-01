import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { AlertTriangle, CheckCircle2, XCircle, ArrowUpRight, RotateCcw } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  actionType: 'submit' | 'request_correction' | 'resubmit' | 'approve' | 'reject' | 'withdraw';
  applicationNumber: string;
  onConfirm: (payload: { reason?: string; title?: string; comment?: string }) => Promise<void>;
  loading?: boolean;
}

export const ActionDialog: React.FC<Props> = ({
  isOpen,
  onClose,
  actionType,
  applicationNumber,
  onConfirm,
  loading = false
}) => {
  const [reason, setReason] = useState('');
  const [correctionTitle, setCorrectionTitle] = useState('');
  const [correctionComment, setCorrectionComment] = useState('');

  const getActionConfig = () => {
    switch (actionType) {
      case 'submit':
        return {
          title: 'Submit Application for AICTE Review',
          subtitle: `Application No: ${applicationNumber}`,
          description:
            'By submitting, the institution declares that all uploaded certificates and infrastructure details comply with AICTE Approval Process Handbook (APH) 2026-27 norms.',
          confirmText: 'Confirm Submission',
          confirmColor: 'bg-blue-600 hover:bg-blue-700 text-white',
          requiresReason: false,
          icon: <ArrowUpRight className="w-5 h-5 text-blue-600" />
        };
      case 'request_correction':
        return {
          title: 'Issue Correction Request / Scrutiny Query',
          subtitle: `Application No: ${applicationNumber}`,
          description:
            'Specify the exact deficiencies found during scrutiny and state the clarifications required from the institution before approval.',
          confirmText: 'Issue Correction Notice',
          confirmColor: 'bg-amber-600 hover:bg-amber-700 text-white',
          requiresReason: true,
          icon: <AlertTriangle className="w-5 h-5 text-amber-600" />
        };
      case 'resubmit':
        return {
          title: 'Resubmit Application with Corrected Evidence',
          subtitle: `Application No: ${applicationNumber}`,
          description:
            'Confirm that all deficiency notices from the reviewer workbench have been answered with updated documents.',
          confirmText: 'Resubmit to Reviewer',
          confirmColor: 'bg-purple-600 hover:bg-purple-700 text-white',
          requiresReason: false,
          icon: <RotateCcw className="w-5 h-5 text-purple-600" />
        };
      case 'approve':
        return {
          title: 'Formal Approval Recommendation (EOA)',
          subtitle: `Application No: ${applicationNumber}`,
          description:
            'Authorised decision to grant AICTE Approval. A mandatory written statutory justification and order reference is required.',
          confirmText: 'Authorize Approval',
          confirmColor: 'bg-emerald-600 hover:bg-emerald-700 text-white',
          requiresReason: true,
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />
        };
      case 'reject':
        return {
          title: 'Reject Approval Application',
          subtitle: `Application No: ${applicationNumber}`,
          description:
            'This action refuses approval due to persistent statutory deficiencies. You must record a formal written statement of reasons.',
          confirmText: 'Confirm Rejection',
          confirmColor: 'bg-rose-600 hover:bg-rose-700 text-white',
          requiresReason: true,
          icon: <XCircle className="w-5 h-5 text-rose-600" />
        };
      case 'withdraw':
        return {
          title: 'Withdraw Application',
          subtitle: `Application No: ${applicationNumber}`,
          description:
            'Withdrawing will move this application to Withdrawn status. State the reason for cancellation.',
          confirmText: 'Confirm Withdrawal',
          confirmColor: 'bg-slate-700 hover:bg-slate-800 text-white',
          requiresReason: true,
          icon: <XCircle className="w-5 h-5 text-slate-600" />
        };
    }
  };

  const config = getActionConfig();

  const handleConfirm = async () => {
    if (actionType === 'request_correction') {
      if (!correctionTitle.trim() || !correctionComment.trim()) return;
      await onConfirm({ title: correctionTitle, comment: correctionComment });
    } else {
      if (config.requiresReason && !reason.trim()) return;
      await onConfirm({ reason });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={config.title}
      subtitle={config.subtitle}
      maxWidth="md"
    >
      <div className="space-y-4 text-xs">
        <div className="flex items-start gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
          {config.icon}
          <p className="text-slate-600 leading-relaxed">{config.description}</p>
        </div>

        {actionType === 'request_correction' ? (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Correction Title / Subject *
              </label>
              <input
                type="text"
                value={correctionTitle}
                onChange={(e) => setCorrectionTitle(e.target.value)}
                placeholder="e.g., Land Title Mutation Document Deficiency"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Detailed Scrutiny Remarks & Instructions *
              </label>
              <textarea
                rows={4}
                value={correctionComment}
                onChange={(e) => setCorrectionComment(e.target.value)}
                placeholder="Specify the exact statutory clauses and missing evidence required..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
              />
            </div>
          </div>
        ) : config.requiresReason ? (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mandatory Statement of Reason / Decision Justification *
            </label>
            <textarea
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter official reasoning and regulatory references..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
            />
          </div>
        ) : (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Optional Remarks / Notes
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Submitted for AY 2026-27 session"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={
              loading ||
              (actionType === 'request_correction'
                ? !correctionTitle.trim() || !correctionComment.trim()
                : config.requiresReason && !reason.trim())
            }
            className={`px-4 py-2 rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors ${config.confirmColor}`}
          >
            {loading ? 'Processing...' : config.confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
};
