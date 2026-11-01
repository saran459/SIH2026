import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { DocumentItem, Application, ExtractedField } from '../types';
import { useNotifications } from '../context/NotificationContext';
import { FileUploadZone } from '../components/documents/FileUploadZone';
import { DocumentCard } from '../components/documents/DocumentCard';
import { ExtractedFieldsTable } from '../components/documents/ExtractedFieldsTable';
import { DocumentComparisonView } from '../components/consistency/DocumentComparisonView';
import {
  FolderOpen,
  FileText,
  Search,
  Filter,
  Columns,
  RefreshCw,
  Eye,
  CheckCircle2
} from 'lucide-react';

export const DocumentCentrePage: React.FC = () => {
  const { showToast } = useNotifications();

  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<number | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [findings, setFindings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'files' | 'consistency'>('files');

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      const apps = await api.getApplications();
      setApplications(apps);
      if (apps.length > 0) {
        setSelectedAppId(apps[0].id);
        fetchAppData(apps[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAppData = async (appId: number) => {
    setLoading(true);
    try {
      const [docs, comp] = await Promise.all([
        api.getDocuments(appId),
        api.getCompliance(appId)
      ]);
      setDocuments(docs);
      setFindings(comp.findings || []);
    } catch (e) {
      console.error('Failed to fetch documents', e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (file: File, category: string) => {
    if (!selectedAppId) return;
    try {
      await api.uploadDocument(selectedAppId, file, category);
      showToast('success', 'Document Uploaded', `${file.name} saved and text extracted.`);
      fetchAppData(selectedAppId);
    } catch (e: any) {
      showToast('error', 'Upload Failed', e.message);
    }
  };

  const handleVerifyField = async (fieldId: number, val: string) => {
    const doc = documents.find((d) => d.extracted_fields?.some((ef) => ef.id === fieldId));
    if (doc) {
      await api.updateExtractedField(doc.id, fieldId, val);
      showToast('success', 'Field Confirmed', 'Verified field updated in database.');
      if (selectedAppId) fetchAppData(selectedAppId);
    }
  };

  const handleResolveFinding = async (findingId: number, status: string, notes: string) => {
    try {
      await api.resolveFinding(findingId, { status, resolution_notes: notes });
      showToast('success', 'Inconsistency Resolved', 'Finding marked resolved.');
      if (selectedAppId) fetchAppData(selectedAppId);
    } catch (e: any) {
      showToast('error', 'Failed to resolve finding', e.message);
    }
  };

  const crossDocFindings = findings.filter((f) => f.finding_type === 'Cross-Document Inconsistency');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Document Centre & Verification</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Upload statutory certificates, run PyMuPDF OCR extraction, and inspect cross-document consistency
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label className="text-xs font-semibold text-slate-600 shrink-0">Application:</label>
          <select
            value={selectedAppId || ''}
            onChange={(e) => {
              const id = Number(e.target.value);
              setSelectedAppId(id);
              fetchAppData(id);
            }}
            className="w-full sm:w-auto px-3 py-2 text-xs font-medium border border-slate-300 rounded-xl bg-white shadow-2xs focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
          >
            {applications.map((app) => (
              <option key={app.id} value={app.id}>
                {app.application_number} - {app.institution_name?.substring(0, 24)}...
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('files')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'files'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FolderOpen className="w-4 h-4" />
          <span>Uploaded Evidences ({documents.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('consistency')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'consistency'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Columns className="w-4 h-4" />
          <span>Cross-Document Consistency ({crossDocFindings.length})</span>
        </button>
      </div>

      {activeTab === 'files' && (
        <div className="space-y-6">
          <FileUploadZone onUpload={handleUpload} />

          {loading ? (
            <div className="p-16 text-center text-slate-400">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <span>Loading documents...</span>
            </div>
          ) : documents.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-xs text-slate-400">
              No documents uploaded for this application yet. Use the upload zone above.
            </div>
          ) : (
            <>
              {/* Document Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {documents.map((doc) => (
                  <DocumentCard
                    key={doc.id}
                    document={doc}
                    onPreview={() => window.open(`/api/documents/${doc.id}/preview`, '_blank')}
                    onReprocess={() => selectedAppId && api.reprocessDocument(doc.id).then(() => fetchAppData(selectedAppId))}
                  />
                ))}
              </div>

              {/* Extracted Fields Table */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
                <h4 className="text-sm font-bold text-slate-900 mb-4">
                  Extracted Fields Ledger across Uploaded Documents
                </h4>
                <ExtractedFieldsTable
                  fields={documents.flatMap((d) => d.extracted_fields || [])}
                  onVerifyField={handleVerifyField}
                />
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'consistency' && (
        <DocumentComparisonView
          findings={crossDocFindings}
          documents={documents}
          onResolveFinding={handleResolveFinding}
          onOpenDocument={(docId) => window.open(`/api/documents/${docId}/preview`, '_blank')}
        />
      )}
    </div>
  );
};
