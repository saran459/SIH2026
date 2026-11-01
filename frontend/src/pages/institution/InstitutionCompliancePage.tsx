import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { ComplianceRule, ComplianceFinding, Application } from '../../types';
import { SeverityBadge } from '../../components/common/SeverityBadge';
import { useNotifications } from '../../context/NotificationContext';
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

export const InstitutionCompliancePage: React.FC = () => {
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

  const handleAppChange = (appId: number) => {
    setSelectedAppId(appId);
    fetchFindings(appId);
  };

  const handleRunAssessment = async () => {
    if (!selectedAppId) return;
    try {
      const res = await api.runCompliance(selectedAppId);
      setFindings(res.findings || []);
      showToast('success', 'Compliance Check Evaluated', `Readiness Score calculated: ${res.readiness_score}%`);
    } catch (e: any) {
      showToast('error', 'Assessment Failed', e.message);
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
          <h2 className="text-xl font-bold text-slate-900">Institutional Compliance Monitor</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Automated statutory compliance evaluation against AICTE Approval Process Handbook (APH 2026-27)
          </p>
        </div>

        <div className="flex items-center gap-3">
          {applications.length > 0 && (
            <select
              value={selectedAppId || ''}
              onChange={(e) => handleAppChange(Number(e.target.value))}
              className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl font-mono text-emerald-800 font-bold focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            >
              {applications.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.application_number}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={handleRunAssessment}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Evaluate Compliance</span>
          </button>
        </div>
      </div>

      {/* Findings List */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-slate-900">Active Compliance Findings</h4>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
              {filteredFindings.length}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Severity:</span>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden"
            >
              <option value="all">All Severities</option>
              <option value="Critical">Critical</option>
              <option value="Major">Major</option>
              <option value="Minor">Minor</option>
            </select>
          </div>
        </div>

        <div className="space-y-3">
          {filteredFindings.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              No compliance deficiencies found for this application.
            </div>
          ) : (
            filteredFindings.map((f) => (
              <div key={f.id} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-bold text-emerald-800">{f.rule_code}</span>
                    <SeverityBadge severity={f.severity} />
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-200 text-slate-700">
                      {f.finding_type}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-slate-500">{f.status}</span>
                </div>

                <div>
                  <h5 className="text-xs font-bold text-slate-900">{f.title}</h5>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{f.description}</p>
                </div>

                {f.evidence_excerpt && (
                  <div className="p-3 rounded-xl bg-white border border-slate-200 text-[11px] font-mono text-slate-700">
                    <strong>Evidence Excerpt:</strong> {f.evidence_excerpt}
                  </div>
                )}

                {f.recommended_action && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-950">
                    <strong>Recommended Remediation:</strong> {f.recommended_action}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
