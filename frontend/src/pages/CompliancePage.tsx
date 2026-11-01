import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ComplianceRule, ComplianceFinding, Application } from '../types';
import { SeverityBadge } from '../components/common/SeverityBadge';
import { useNotifications } from '../context/NotificationContext';
import {
  ShieldCheck,
  Play,
  Filter,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  Info,
  Layers
} from 'lucide-react';

export const CompliancePage: React.FC = () => {
  const { showToast } = useNotifications();

  const [rules, setRules] = useState<ComplianceRule[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<number | null>(null);
  const [findings, setFindings] = useState<ComplianceFinding[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rulesData, appsData] = await Promise.all([
        api.getComplianceRules(),
        api.getApplications()
      ]);
      setRules(rulesData);
      setApplications(appsData);
      if (appsData.length > 0) {
        setSelectedAppId(appsData[0].id);
        fetchFindings(appsData[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchFindings = async (appId: number) => {
    try {
      const comp = await api.getCompliance(appId);
      setFindings(comp.findings || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRunAssessment = async () => {
    if (!selectedAppId) return;
    try {
      const res = await api.runCompliance(selectedAppId);
      setFindings(res.findings || []);
      showToast('success', 'Compliance Check Complete', `Assessed. Score: ${res.readiness_score}%`);
    } catch (e: any) {
      showToast('error', 'Assessment Failed', e.message);
    }
  };

  const handleResolve = async (findingId: number) => {
    const note = prompt('Enter resolution justification notes:');
    if (!note) return;
    try {
      await api.resolveFinding(findingId, { status: 'Resolved', resolution_notes: note });
      showToast('success', 'Finding Resolved', 'Updated in database.');
      if (selectedAppId) fetchFindings(selectedAppId);
    } catch (e: any) {
      showToast('error', 'Failed to resolve', e.message);
    }
  };

  const filteredFindings = findings.filter((f) => {
    if (severityFilter !== 'all' && f.severity !== severityFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Compliance Monitoring Engine</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configurable, explainable statutory rule evaluator based on AICTE Approval Process Handbook
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedAppId || ''}
            onChange={(e) => {
              const id = Number(e.target.value);
              setSelectedAppId(id);
              fetchFindings(id);
            }}
            className="px-3 py-2 text-xs font-medium border border-slate-300 rounded-xl bg-white shadow-2xs"
          >
            {applications.map((app) => (
              <option key={app.id} value={app.id}>
                {app.application_number} - {app.institution_name?.substring(0, 20)}...
              </option>
            ))}
          </select>
          <button
            onClick={handleRunAssessment}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Run Assessment</span>
          </button>
        </div>
      </div>

      {/* Statutory Findings Section */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-150">
          <div>
            <h4 className="text-sm font-bold text-slate-900">
              Active Findings for Selected Application ({filteredFindings.length})
            </h4>
            <p className="text-xs text-slate-500">Deficiencies and statutory non-compliance items</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Severity:</span>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg bg-slate-50 font-medium"
            >
              <option value="all">All</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
            </select>
          </div>
        </div>

        {filteredFindings.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            Zero active compliance findings for this application.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredFindings.map((f) => (
              <div
                key={f.id}
                className="p-5 rounded-2xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 text-xs space-y-2 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{f.title}</span>
                      <SeverityBadge severity={f.severity} />
                    </div>
                    <span className="text-[11px] text-slate-400 block mt-0.5">{f.finding_type}</span>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      f.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {f.status}
                  </span>
                </div>

                <p className="text-slate-700 leading-relaxed">{f.description}</p>

                {f.observed_value && (
                  <div className="flex items-center gap-4 text-[11px] font-mono text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200">
                    <span><strong>Observed:</strong> {f.observed_value}</span>
                    <span>•</span>
                    <span><strong>Expected:</strong> {f.expected_value}</span>
                  </div>
                )}

                <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-200 text-blue-900 text-[11px]">
                  <strong>Statutory Recommendation: </strong> {f.recommended_action}
                </div>

                {f.status !== 'Resolved' && (
                  <div className="flex justify-end pt-1">
                    <button
                      onClick={() => handleResolve(f.id)}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs"
                    >
                      Resolve with Justification
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Statutory Rule Registry Table */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
        <div className="pb-3 border-b border-slate-150 mb-4">
          <h4 className="text-sm font-bold text-slate-900">Configurable Statutory Rule Registry</h4>
          <p className="text-xs text-slate-500">
            AICTE Approval Process Handbook (APH) 2026-27 demonstration rules
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-semibold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Rule Code</th>
                <th className="px-4 py-3">Rule Title & Clause</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Severity</th>
                <th className="px-4 py-3">Penalty</th>
                <th className="px-4 py-3">Source Citation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rules.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-mono font-bold text-blue-700">{r.rule_code}</td>
                  <td className="px-4 py-3">
                    <span className="font-bold text-slate-900 block">{r.title}</span>
                    <span className="text-[11px] text-slate-500 line-clamp-1">{r.description}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{r.category}</td>
                  <td className="px-4 py-3">
                    <SeverityBadge severity={r.severity} />
                  </td>
                  <td className="px-4 py-3 font-bold text-rose-600">-{r.score_penalty} Pts</td>
                  <td className="px-4 py-3 text-slate-500 text-[11px] italic">{r.source_reference}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
