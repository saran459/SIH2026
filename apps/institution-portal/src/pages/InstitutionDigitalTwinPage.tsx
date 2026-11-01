import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { DigitalTwinData, Application } from '../types';
import { WhatIfSimulator } from '../components/digitaltwin/WhatIfSimulator';
import { ScoreGauge } from '../components/common/ScoreGauge';
import { SeverityBadge } from '../components/common/SeverityBadge';
import {
  Cpu,
  Layers,
  Sparkles,
  ShieldAlert,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  RefreshCw,
  Info
} from 'lucide-react';

export const InstitutionDigitalTwinPage: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<number | null>(null);
  const [twinData, setTwinData] = useState<DigitalTwinData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      const apps = await api.getApplications();
      setApplications(apps);
      if (apps.length > 0) {
        setSelectedAppId(apps[0].id);
        fetchTwinData(apps[0].id);
      } else {
        setLoading(false);
      }
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const fetchTwinData = async (appId: number) => {
    setLoading(true);
    try {
      const data = await api.getDigitalTwin(appId);
      setTwinData(data);
    } catch (e) {
      console.error('Failed to fetch Digital Twin data', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAppChange = (newId: number) => {
    setSelectedAppId(newId);
    fetchTwinData(newId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">AICTE Approval Digital Twin</h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Isolated Simulation Model
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time statutory readiness mathematical model (0–100 scale) with What-If corrective projections
          </p>
        </div>

        {/* Application Selector */}
        {applications.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Application:</span>
            <select
              value={selectedAppId || ''}
              onChange={(e) => handleAppChange(Number(e.target.value))}
              className="px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl font-mono text-emerald-800 font-bold focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            >
              {applications.map((app) => (
                <option key={app.id} value={app.id}>
                  {app.application_number} ({app.category})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {applications.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-16 text-center space-y-3">
          <Cpu className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No applications yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            The Digital Twin simulator requires an active application to run hypothetical parameter changes and predictive score simulations.
          </p>
        </div>
      ) : loading || !twinData ? (
        <div className="flex items-center justify-center p-20">
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Top Model Snapshot Card */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center bg-white rounded-3xl border border-slate-200 p-6 lg:p-8 shadow-xs">
            <div className="lg:col-span-3 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-slate-150 pb-6 lg:pb-0 lg:pr-6">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Live Readiness Score
              </span>
              <ScoreGauge score={twinData.current_score ?? twinData.readiness_score ?? 0} size="lg" />
              <div className="mt-3 text-center">
                <span className="text-xs font-semibold text-slate-700 block">
                  {(twinData.current_score ?? twinData.readiness_score ?? 0) >= 80 ? 'Statutory Ready' : (twinData.current_score ?? twinData.readiness_score ?? 0) >= 60 ? 'Deficiencies Identified' : 'Action Required'}
                </span>
                <span className="text-[11px] text-slate-400">Scale: 0.0 - 100.0</span>
              </div>
            </div>

            <div className="lg:col-span-9 space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {twinData.institution_name} • {twinData.category || 'Technical Campus'}
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  The Approval Digital Twin calculates an explainable mathematical projection based on core documents present, text extraction confidence, and configured AICTE Approval Process Handbook (APH 2026-27) parameters.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-150">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Rules Checked</span>
                  <span className="text-sm font-bold text-slate-900 mt-0.5 block">
                    {twinData.total_rules_evaluated ?? twinData.category_breakdown?.reduce((acc, c) => acc + c.total_checks, 0) ?? 0}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-200/60">
                  <span className="text-emerald-700 text-[10px] uppercase font-bold block">Passed Rules</span>
                  <span className="text-sm font-bold text-emerald-800 mt-0.5 block">
                    {twinData.passed_count ?? twinData.category_breakdown?.reduce((acc, c) => acc + c.passed_checks, 0) ?? 0}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-rose-50/60 border border-rose-200/60">
                  <span className="text-rose-700 text-[10px] uppercase font-bold block">Deficiencies</span>
                  <span className="text-sm font-bold text-rose-800 mt-0.5 block">
                    {twinData.failed_count ?? twinData.unresolved_findings?.length ?? 0}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200/60">
                  <span className="text-amber-700 text-[10px] uppercase font-bold block">Needs Review</span>
                  <span className="text-sm font-bold text-amber-800 mt-0.5 block">
                    {twinData.needs_review_count ?? 0}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive What-If Simulator (Isolated Sandbox) */}
          {twinData && (
            <WhatIfSimulator
              data={twinData}
              onRefreshData={() => selectedAppId && fetchTwinData(selectedAppId)}
            />
          )}
        </>
      )}
    </div>
  );
};
