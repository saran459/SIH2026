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
  RefreshCw
} from 'lucide-react';

export const DigitalTwinPage: React.FC = () => {
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
      }
    } catch (e) {
      console.error(e);
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
      {/* Header & Application Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">AICTE Approval Digital Twin</h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
              Innovative Model
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Simulated digital twin estimating institutional approval readiness and deficiency impacts
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label className="text-xs font-semibold text-slate-600 shrink-0">Select Application:</label>
          <select
            value={selectedAppId || ''}
            onChange={(e) => handleAppChange(Number(e.target.value))}
            className="w-full sm:w-auto px-3 py-2 text-xs font-medium border border-slate-300 rounded-xl bg-white shadow-2xs focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
          >
            {applications.map((app) => (
              <option key={app.id} value={app.id}>
                {app.application_number} - {app.institution_name} ({app.status})
              </option>
            ))}
          </select>
          <button
            onClick={() => selectedAppId && fetchTwinData(selectedAppId)}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
            title="Refresh Digital Twin Assessment"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading || !twinData ? (
        <div className="flex items-center justify-center p-20">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Top Twin Summary Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 lg:p-8 shadow-xs grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            <div className="md:col-span-8 space-y-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
                  {twinData.application_number}
                </span>
                <span className="text-xs font-semibold text-slate-500">• {twinData.workflow_status}</span>
              </div>

              <h3 className="text-lg font-bold text-slate-900">{twinData.institution_name}</h3>

              <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                The AICTE Approval Digital Twin computes an aggregate application readiness index by evaluating uploaded statutory documents against Chapter II norms, resolving cross-evidence inconsistencies, and penalizing unresolved deficiencies.
              </p>

              <div className="flex items-center gap-4 text-xs pt-1 flex-wrap">
                <div className="flex items-center gap-1.5 text-amber-700 font-semibold">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{twinData.unresolved_findings.length} Unresolved Statutory Findings</span>
                </div>
                <div className="flex items-center gap-1.5 text-rose-700 font-semibold">
                  <ShieldAlert className="w-4 h-4" />
                  <span>{twinData.overdue_actions_count} Overdue Milestone Deadlines</span>
                </div>
              </div>
            </div>

            <div className="md:col-span-4 flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <ScoreGauge score={twinData.current_score} size="lg" />
              <p className="text-[11px] text-slate-400 mt-2 text-center">
                Last Assessed:{' '}
                {twinData.last_assessment_date
                  ? new Date(twinData.last_assessment_date).toLocaleDateString()
                  : 'Today'}
              </p>
            </div>
          </div>

          {/* Category-Level Compliance Breakdown */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
            <h4 className="text-sm font-bold text-slate-900 mb-4">
              Category Compliance Index (Statutory Breakdown)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {twinData.category_breakdown.map((cat, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200 text-xs space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800">{cat.category}</span>
                    <span className="font-extrabold text-blue-700">{cat.score_percentage}%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        cat.score_percentage >= 80
                          ? 'bg-emerald-500'
                          : cat.score_percentage >= 60
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${cat.score_percentage}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    {cat.passed_checks} of {cat.total_checks} checks satisfied
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive What-If Simulator Component */}
          <WhatIfSimulator data={twinData} onRefreshData={() => fetchTwinData(twinData.application_id)} />

          {/* Statutory Findings Score Penalties Table */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
            <h4 className="text-sm font-bold text-slate-900 mb-3">
              Readiness Score Deductions & Penalty Audit
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-semibold text-slate-600 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Statutory Finding</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Severity</th>
                    <th className="px-4 py-3 text-right">Penalty Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {twinData.finding_impacts.map((f, i) => (
                    <tr key={i} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-semibold text-slate-900">{f.title}</td>
                      <td className="px-4 py-3 text-slate-500">{f.category}</td>
                      <td className="px-4 py-3">
                        <SeverityBadge severity={f.severity} />
                      </td>
                      <td className="px-4 py-3 text-right font-extrabold text-rose-600">
                        -{f.penalty_points} Pts
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
