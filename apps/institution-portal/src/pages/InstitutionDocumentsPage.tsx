import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { DocumentItem, Application } from '../types';
import { DocumentCard } from '../components/documents/DocumentCard';
import { FileUploadZone } from '../components/documents/FileUploadZone';
import { ExtractedFieldsTable } from '../components/documents/ExtractedFieldsTable';
import { Modal } from '../components/common/Modal';
import { useNotifications } from '../context/NotificationContext';
import {
  FolderOpen,
  FileText,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Sparkles,
  PlusCircle,
  Trash2
} from 'lucide-react';

export const InstitutionDocumentsPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useNotifications();

  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<number | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDocId, setDeleteDocId] = useState<number | null>(null);
  const [deleteAllDocsModal, setDeleteAllDocsModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

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

  const handleDeleteSingleDoc = async () => {
    if (!deleteDocId) return;
    setActionLoading(true);
    try {
      await api.deleteDocument(deleteDocId);
      showToast('success', 'Document Deleted', 'Document record and extracted metadata removed.');
      setDeleteDocId(null);
      if (selectedAppId) fetchDocuments(selectedAppId);
    } catch (e: any) {
      showToast('error', 'Delete Failed', e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteAllDocs = async () => {
    setActionLoading(true);
    try {
      await api.deleteAllDocuments(selectedAppId || undefined);
      showToast('success', 'Documents Deleted', 'All documents for this dossier have been deleted.');
      setDeleteAllDocsModal(false);
      if (selectedAppId) fetchDocuments(selectedAppId);
    } catch (e: any) {
      showToast('error', 'Failed to delete documents', e.message);
    } finally {
      setActionLoading(false);
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

      {applications.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-16 text-center space-y-3">
          <FolderOpen className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No applications yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Please register an application before uploading statutory certificates and documentation.
          </p>
          <div className="pt-2">
            <button
              onClick={() => navigate('/applications/new')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create New Application</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Upload Zone */}
          <FileUploadZone onUpload={handleUpload} />

          {/* Documents Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900">
                Uploaded Statutory Certificates ({documents.length})
              </h4>
              {documents.length > 0 && (
                <button
                  onClick={() => setDeleteAllDocsModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Delete All Documents</span>
                </button>
              )}
            </div>

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
                    onDelete={() => setDeleteDocId(doc.id)}
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
        </>
      )}

      {/* Delete Single Doc Modal */}
      {deleteDocId && (
        <Modal
          isOpen={deleteDocId !== null}
          onClose={() => !actionLoading && setDeleteDocId(null)}
          title="Delete Statutory Document"
          size="md"
        >
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs leading-relaxed">
              <p className="font-bold mb-1">Confirm Document Deletion</p>
              <p>Are you sure you want to permanently delete this document and its associated OCR extraction data?</p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteDocId(null)}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteSingleDoc}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{actionLoading ? 'Deleting...' : 'Delete Document'}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete All Docs Modal */}
      {deleteAllDocsModal && (
        <Modal
          isOpen={deleteAllDocsModal}
          onClose={() => !actionLoading && setDeleteAllDocsModal(false)}
          title="Delete All Documents"
          size="md"
        >
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs leading-relaxed">
              <p className="font-bold mb-1">Delete All Attached Documents</p>
              <p>Are you sure you want to delete ALL documents uploaded for this application dossier?</p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteAllDocsModal(false)}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAllDocs}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{actionLoading ? 'Deleting All...' : 'Delete All Documents'}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
