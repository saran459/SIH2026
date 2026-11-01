import React from 'react';
import { ApplicationStatus, WorkflowEvent } from '../../types';
import { CheckCircle2, Circle, Clock, AlertTriangle, ArrowRight } from 'lucide-react';

interface Props {
  currentStatus: ApplicationStatus | string;
  events?: WorkflowEvent[];
}

const STAGES = [
  { key: 'Draft', label: 'Draft' },
  { key: 'Submitted', label: 'Submitted' },
  { key: 'Under Review', label: 'Under Review' },
  { key: 'Correction Required', label: 'Correction / Query' },
  { key: 'Resubmitted', label: 'Resubmitted' },
  { key: 'Decision', label: 'Final Decision' }
];

export const WorkflowTimeline: React.FC<Props> = ({ currentStatus, events = [] }) => {
  const getStageIndex = (status: string) => {
    switch (status) {
      case 'Draft': return 0;
      case 'Submitted': return 1;
      case 'Under Review': return 2;
      case 'Correction Required': return 3;
      case 'Resubmitted': return 4;
      case 'Approved':
      case 'Rejected':
      case 'Withdrawn': return 5;
      default: return 0;
    }
  };

  const currentIndex = getStageIndex(currentStatus);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h4 className="text-sm font-bold text-slate-900">AICTE Approval Workflow Timeline</h4>
          <p className="text-xs text-slate-500 mt-0.5">Automated statutory transition tracking & audit history</p>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
          Current Stage: {currentStatus}
        </span>
      </div>

      {/* Progress Line */}
      <div className="relative flex items-center justify-between mb-8 px-4">
        <div className="absolute top-1/2 left-8 right-8 -translate-y-1/2 h-1 bg-slate-100 z-0" />
        <div
          className="absolute top-1/2 left-8 -translate-y-1/2 h-1 bg-blue-600 transition-all duration-700 z-0"
          style={{ width: `${Math.min(100, (currentIndex / (STAGES.length - 1)) * 90)}%` }}
        />

        {STAGES.map((stage, idx) => {
          const isCompleted = idx < currentIndex || (idx === 5 && ['Approved', 'Rejected'].includes(currentStatus));
          const isCurrent = idx === currentIndex && !['Approved', 'Rejected'].includes(currentStatus);
          const isDecision = idx === 5;

          return (
            <div key={stage.key} className="relative z-10 flex flex-col items-center">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all shadow-sm ${
                  isCompleted
                    ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                    : isCurrent
                    ? 'bg-amber-500 text-white ring-4 ring-amber-100 animate-pulse'
                    : 'bg-white text-slate-400 border-2 border-slate-200'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : isCurrent ? (
                  <Clock className="w-5 h-5" />
                ) : (
                  <span>{idx + 1}</span>
                )}
              </div>
              <span
                className={`mt-2 text-xs font-medium text-center ${
                  isCurrent ? 'text-blue-900 font-bold' : isCompleted ? 'text-slate-700' : 'text-slate-400'
                }`}
              >
                {isDecision && currentStatus === 'Approved'
                  ? 'Approved'
                  : isDecision && currentStatus === 'Rejected'
                  ? 'Rejected'
                  : stage.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Detailed Workflow Event History */}
      {events.length > 0 && (
        <div className="border-t border-slate-150 pt-5 mt-4">
          <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
            Transition Event Log ({events.length})
          </h5>
          <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
            {events.map((ev) => (
              <div
                key={ev.id}
                className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/70 border border-slate-150 text-xs"
              >
                <div className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{ev.action}</span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(ev.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-slate-600 text-[11px]">
                    <span className="font-semibold text-slate-800">{ev.actor_name}</span>
                    <span>({ev.actor_role})</span>
                    <span>•</span>
                    <span className="text-slate-500">
                      {ev.from_state} → {ev.to_state}
                    </span>
                  </div>
                  {ev.comments && (
                    <p className="mt-1 text-slate-700 bg-white p-2 rounded-lg border border-slate-200/60 leading-relaxed italic">
                      "{ev.comments}"
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
