import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { DocumentItem, Application } from '../../types';
import { DocumentCard } from '../../components/documents/DocumentCard';
import { FileUploadZone } from '../../components/documents/FileUploadZone';
import { ExtractedFieldsTable } from '../../components/documents/ExtractedFieldsTable';
import { useNotifications } from '../../context/NotificationContext';
import {
  FolderOpen,
  FileText,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Sparkles
} from 'lucide-react';

export const InstitutionDocumentsPage: React.FC = () => {
  const { showToast } = useNotifications();

  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<number | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);

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
        fetchDocuments(apps[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async (appId: number) => {
    try {
      const docs = await api.getDocuments(appId);
      setDocuments(docs);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAppChange = (appId: number) => {
    setSelectedAppId(appId);
    fetchDocuments(appId);
  };

  const handleUpload = async (file: File, category: string) => {
    if (!selectedAppId) return;
    try {
      await api.uploadDocument(selectedAppId, file, category);
      showToast('success', 'Document Processed', `${file.name} saved, hashed (SHA-256), and text extracted.`);
      fetchDocuments(selectedAppId);
    } catch (e: any) {
      showToast('error', 'Upload Failed', e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Institutional Document Centre</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Upload statutory certificates, verify automated text extraction, and compute SHA-256 cryptographic hashes
          </p>
        </div>

        {/* Application Selector */}
        {applications.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Active Dossier:</span>
            <select
              value={selectedAppId || ''}
              onChange={(e) => handleAppChange(Number(e.target.value))}
              className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl font-mono text-emerald-800 font-bold focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            >
              {applications.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.application_number} ({a.category})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Upload Zone */}
      <FileUploadZone onUpload={handleUpload} />

      {/* Documents Grid */}
      <div className="space-y-4">
        <h4 className="text-sm font-bold text-slate-900">
          Uploaded Statutory Certificates ({documents.length})
        </h4>

        {documents.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-xs text-slate-400">
            No documents uploaded yet for this application. Use the upload zone above.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {documents.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                onPreview={(d) => window.open(api.getDocumentDownloadUrl(d.id), '_blank')}
                onReprocess={async () => {
                  if (selectedAppId) {
                    await api.reprocessDocument(doc.id);
                    fetchDocuments(selectedAppId);
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Extracted Fields Table */}
      {documents.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h4 className="text-sm font-bold text-slate-900">
            OCR Extracted Statutory Fields & Verification Status
          </h4>
          <ExtractedFieldsTable
            fields={documents.flatMap((d) => d.extracted_fields || [])}
            onVerifyField={async (fieldId, val) => {
              await api.verifyField(fieldId, val);
              if (selectedAppId) fetchDocuments(selectedAppId);
            }}
          />
        </div>
      )}
    </div>
  );
};
