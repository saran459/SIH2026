import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Application, ApplicationStatus } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import {
  GitBranch,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  FileText,
  UserCheck
} from 'lucide-react';

export const WorkflowPage: React.FC = () => {
  const navigate = useNavigate();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getApplications()
      .then(setApplications)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const stages: { status: ApplicationStatus; label: string; desc: string; icon: React.ReactNode }[] = [
    {
      status: 'Draft',
      label: 'Draft Stage',
      desc: 'Institutions preparing certificates and declaring metrics',
      icon: <Clock className="w-4 h-4 text-slate-500" />
    },
    {
      status: 'Submitted',
      label: 'Submitted for Scrutiny',
      desc: 'Official submission completed, awaiting reviewer assignment',
      icon: <ArrowRight className="w-4 h-4 text-blue-600" />
    },
    {
      status: 'Under Review',
      label: 'Under Committee Review',
      desc: 'Scrutiny officers examining evidences and cadastral maps',
      icon: <UserCheck className="w-4 h-4 text-indigo-600" />
    },
    {
      status: 'Correction Required',
      label: 'Correction Required',
      desc: 'Institution answering formal deficiency queries',
      icon: <AlertTriangle className="w-4 h-4 text-amber-600" />
    },
    {
      status: 'Resubmitted',
      label: 'Corrections Resubmitted',
      desc: 'Updated documents uploaded for reviewer verification',
      icon: <RotateCcw className="w-4 h-4 text-purple-600" />
    },
    {
      status: 'Approved',
      label: 'Approved (EOA Issued)',
      desc: 'Formal statutory approval granted for AY 2026-27',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">Approval Workflow Automation</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Deterministic statutory state machine: Draft → Submitted → Under Review → Correction Required → Resubmitted → Approved/Rejected
        </p>
      </div>

      {/* State Machine Overview Board */}
      <div className="space-y-6">
        {stages.map((st) => {
          const matchingApps = applications.filter((a) => a.status === st.status);
          return (
            <div key={st.status} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-150 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                    {st.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900">{st.label}</h4>
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                        {matchingApps.length}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">{st.desc}</p>
                  </div>
                </div>
              </div>

              {matchingApps.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2">No applications currently in this stage.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {matchingApps.map((app) => (
                    <div
                      key={app.id}
                      onClick={() => navigate(`/applications/${app.id}`)}
                      className="p-4 rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-xs bg-slate-50/50 cursor-pointer transition-all space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-blue-700">
                          {app.application_number}
                        </span>
                        <span className="text-[10px] font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {app.readiness_score}% Score
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-900 truncate">{app.institution_name}</p>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                        <span>{app.category}</span>
                        <span>{app.program}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
