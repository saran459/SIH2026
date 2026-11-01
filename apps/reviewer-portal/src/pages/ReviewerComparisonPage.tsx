import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Application, ComplianceFinding, DocumentItem } from '../types';
import { DocumentComparisonView } from '../components/consistency/DocumentComparisonView';
import { useNotifications } from '../context/NotificationContext';
import { Scale, FileText, AlertTriangle, Layers } from 'lucide-react';

export const ReviewerComparisonPage: React.FC = () => {
  const { showToast } = useNotifications();
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<number>(0);
  const [findings, setFindings] = useState<ComplianceFinding[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadApplications();
  }, []);

  useEffect(() => {
    if (selectedAppId > 0) {
      loadDossierData(selectedAppId);
    } else {
      setFindings([]);
      setDocuments([]);
      setLoading(false);
    }
  }, [selectedAppId]);

  const loadApplications = async () => {
    setLoading(true);
    try {
      const apps = await api.getApplications();
      setApplications(apps);
      if (apps.length > 0) {
        setSelectedAppId(apps[0].id);
      } else {
        setSelectedAppId(0);
        setLoading(false);
      }
    } catch (e) {
      console.error('Failed to load applications for comparison', e);
      setLoading(false);
    }
  };

  const loadDossierData = async (appId: number) => {
    setLoading(true);
    try {
      const [comp, docs] = await Promise.all([
        api.getCompliance(appId),
        api.getDocuments(appId)
      ]);
      setFindings(comp.findings || []);
      setDocuments(docs || []);
    } catch (e) {
      console.error('Failed to load dossier data', e);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveFinding = async (findingId: number, status: string, notes: string) => {
    try {
      await api.resolveFinding(findingId, { status, resolution_notes: notes });
      showToast('success', 'Finding Updated', 'Status recorded in compliance database.');
      if (selectedAppId > 0) {
        await loadDossierData(selectedAppId);
      }
    } catch (e: any) {
      showToast('error', 'Update Failed', e.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Cross-Document Consistency Intelligence</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Automated correlation engine comparing figures across independent institutional filings (e.g. Faculty List vs Balance Sheet).
          </p>
        </div>

        {/* Application Selector */}
        {applications.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600">Select Dossier:</label>
            <select
              value={selectedAppId}
              onChange={(e) => setSelectedAppId(Number(e.target.value))}
              className="text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            >
              {applications.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.application_number} — {a.institution_name || 'Institution ' + a.institution_id}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Comparison View Component or Empty State */}
      {applications.length === 0 && !loading ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center shadow-xs">
          <div className="w-14 h-14 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-400">
            <Scale className="w-7 h-7" />
          </div>
          <h3 className="text-sm font-semibold text-slate-700">No applications yet</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Submitted applications with multi-document filings will appear here for cross-document consistency checks.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
          {loading ? (
            <div className="p-16 text-center">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs text-slate-500">Cross-referencing submitted documents and extracted fields...</p>
            </div>
          ) : (
            <DocumentComparisonView
              findings={findings}
              documents={documents}
              onResolveFinding={handleResolveFinding}
            />
          )}
        </div>
      )}
    </div>
  );
};
