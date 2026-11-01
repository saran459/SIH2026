import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { ComplianceFinding, Application } from '../../types';
import { SeverityBadge } from '../../components/common/SeverityBadge';
import { useNotifications } from '../../context/NotificationContext';
import {
  ShieldCheck,
  Filter,
  CheckCircle2,
  AlertTriangle,
  FileCheck2,
  Layers,
  Search,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const ReviewerCompliancePage: React.FC = () => {
  const { showToast } = useNotifications();
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<number | null>(null);
  const [findings, setFindings] = useState<ComplianceFinding[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState('all');
  const [resolutionNotes, setResolutionNotes] = useState<{ [id: number]: string }>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const apps = await api.getApplications();
      setApplications(apps);
      if (apps.length > 0) {
        setSelectedAppId(apps[0].id);
        fetchFindings(apps[0].id);
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

  const handleSelectApp = (appId: number) => {
    setSelectedAppId(appId);
    fetchFindings(appId);
  };

  const handleResolve = async (findingId: number, status: 'Resolved' | 'Waived') => {
    const notes = resolutionNotes[findingId] || `Marked ${status} by reviewer during compliance evaluation.`;
    try {
      await api.resolveFinding(findingId, { status, resolution_notes: notes });
      showToast('success', `Finding ${status}`, 'Compliance assessment updated.');
      if (selectedAppId) fetchFindings(selectedAppId);
    } catch (e: any) {
      showToast('error', 'Update failed', e.message);
    }
  };

  const filteredFindings = findings.filter(f => {
    if (severityFilter === 'all') return true;
    return f.severity?.toLowerCase() === severityFilter.toLowerCase();
  });

  const selectedApp = applications.find(a => a.id === selectedAppId);

  return (
    <div className="space-y-6">
      <div className="pb-2 border-b border-slate-200">
        <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 uppercase tracking-wider mb-1">
          <ShieldCheck className="w-4 h-4" />
          Regulatory Scrutiny
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Compliance & Cross-Document Evaluation</h1>
        <p className="text-sm text-slate-600 mt-1">
          Inspect automated AICTE Approval Process Handbook (APH) rule assessments, cross-document discrepancies, and record scrutiny determinations.
        </p>
      </div>

      {/* Select Application Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <span className="text-xs font-bold text-slate-700 shrink-0">Scrutiny Dossier:</span>
          <select
            value={selectedAppId || ''}
            onChange={(e) => handleSelectApp(parseInt(e.target.value))}
            className="w-full md:w-80 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
          >
            {applications.map(app => (
              <option key={app.id} value={app.id}>
                {app.application_number} — {app.institution_name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs text-slate-500 font-semibold">Severity:</span>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Compliance Findings List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-500">Evaluating compliance findings...</p>
          </div>
        ) : filteredFindings.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-800">No Deficiencies Found</h3>
            <p className="text-xs text-slate-500 mt-1">This application satisfies the evaluated compliance criteria.</p>
          </div>
        ) : (
          filteredFindings.map((finding) => (
            <div
              key={finding.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3 hover:border-blue-300 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <SeverityBadge severity={finding.severity} />
                  <span className="text-xs font-bold text-slate-900">{finding.rule_name || `Rule #${finding.rule_id}`}</span>
                  {finding.is_cross_document && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-md">
                      <Sparkles className="w-3 h-3" />
                      Cross-Document Discrepancy
                    </span>
                  )}
                </div>

                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                  finding.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800' :
                  finding.status === 'Waived' ? 'bg-purple-100 text-purple-800' :
                  'bg-amber-100 text-amber-800'
                }`}>
                  Status: {finding.status}
                </span>
              </div>

              <div className="text-xs text-slate-700">
                <p className="font-medium text-slate-800">{finding.description}</p>
                {finding.evidence_details && (
                  <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-100 font-mono text-[11px] text-slate-600">
                    <span className="font-sans font-bold text-slate-700 block mb-0.5">Automated Evidence Finding:</span>
                    {finding.evidence_details}
                  </div>
                )}
              </div>

              {/* Resolution Action Area */}
              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-3">
                <input
                  type="text"
                  placeholder="Reviewer scrutiny note / justification..."
                  value={resolutionNotes[finding.id] || ''}
                  onChange={(e) => setResolutionNotes({ ...resolutionNotes, [finding.id]: e.target.value })}
                  className="flex-1 w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                />
                <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                  {finding.status !== 'Resolved' && (
                    <button
                      onClick={() => handleResolve(finding.id, 'Resolved')}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors"
                    >
                      Resolve Finding
                    </button>
                  )}
                  {finding.status !== 'Waived' && (
                    <button
                      onClick={() => handleResolve(finding.id, 'Waived')}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-colors"
                    >
                      Waive Finding
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
