import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useNotifications } from '../context/NotificationContext';
import { Application } from '../types';
import {
  FileText,
  Building2,
  Calendar,
  Layers,
  Users,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Upload,
  ShieldCheck,
  Send,
  Save,
  Info,
  X,
  Plus,
  Trash2
} from 'lucide-react';

export const InstitutionNewApplicationPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useNotifications();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loadingAction, setLoadingAction] = useState<'submit' | 'draft' | null>(null);
  const [category, setCategory] = useState('Extension of Approval (EoA)');
  const [academicYear, setAcademicYear] = useState('2026-27');
  const [level, setLevel] = useState('Under Graduate');
  const [program, setProgram] = useState('Engineering & Technology');
  const [faculty, setFaculty] = useState('42');
  const [intake, setIntake] = useState('480');
  const [builtUpArea, setBuiltUpArea] = useState('8500');
  const [landArea, setLandArea] = useState('5.2');

  // Supporting Documents Upload Queue (Multi-document support)
  interface StagedDoc {
    id: string;
    file: File;
    category: string;
  }
  const [stagedDocuments, setStagedDocuments] = useState<StagedDoc[]>([]);
  const [docCategory, setDocCategory] = useState('Land Registration / Title Document');
  const [explicitAffidavit, setExplicitAffidavit] = useState(false);
  const [uploadProgressMessage, setUploadProgressMessage] = useState('');

  // Post-submission success modal state
  const [submittedApp, setSubmittedApp] = useState<Application | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      const newItems: StagedDoc[] = selectedFiles.map((file, idx) => ({
        id: `${file.name}-${Date.now()}-${idx}`,
        file,
        category: docCategory
      }));
      setStagedDocuments((prev) => [...prev, ...newItems]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeStagedDoc = (id: string) => {
    setStagedDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  const updateDocCategory = (id: string, newCat: string) => {
    setStagedDocuments((prev) =>
      prev.map((d) => (d.id === id ? { ...d, category: newCat } : d))
    );
  };

  const handleAction = async (submitImmediately: boolean) => {
    setLoadingAction(submitImmediately ? 'submit' : 'draft');
    setUploadProgressMessage('Creating application draft in database...');
    try {
      // 1. Create the application in MySQL as draft first (submit_immediately: false)
      // This ensures all supporting documents are fully uploaded and extracted before submission starts
      const payload = {
        category,
        academic_year: academicYear,
        level,
        program,
        total_faculty_declared: Number(faculty) || 0,
        total_intake_declared: Number(intake) || 0,
        built_up_area_sqm: Number(builtUpArea) || 0,
        land_area_acres: Number(landArea) || 0,
        submit_immediately: false,
        generate_statutory_affidavit: explicitAffidavit
      };

      const newApp = await api.createApplication(payload);

      // 2. Upload ALL supporting documents sequentially and ensure all finish uploading
      if (stagedDocuments.length > 0) {
        for (let i = 0; i < stagedDocuments.length; i++) {
          const doc = stagedDocuments[i];
          setUploadProgressMessage(`Uploading document ${i + 1} of ${stagedDocuments.length}: ${doc.file.name}...`);
          await api.uploadDocument(newApp.id, doc.file, doc.category);
        }
      }

      // 3. Now submit if requested, so automatic verification triggers with all uploaded documents in place
      if (submitImmediately) {
        setUploadProgressMessage('Starting automated compliance verification...');
        const submittedAppRes = await api.submitApplication(newApp.id);
        showToast(
          'success',
          'Application Submitted Successfully',
          `AICTE Dossier ${submittedAppRes.application_number} with ${stagedDocuments.length} document(s) has been recorded and submitted to the Reviewer Portal.`
        );
        setSubmittedApp(submittedAppRes);
      } else {
        showToast(
          'success',
          'Draft Dossier Saved',
          `Application ${newApp.application_number} created with ${stagedDocuments.length} document(s).`
        );
        navigate(`/institution/applications/${newApp.id}`);
      }
    } catch (e: any) {
      showToast('error', submitImmediately ? 'Submission Failed' : 'Save Failed', e.message || 'Operation failed');
    } finally {
      setLoadingAction(null);
      setUploadProgressMessage('');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div>
        <button
          onClick={() => navigate('/applications')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Applications</span>
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xs space-y-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 mb-2">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>AICTE Approval Process Handbook (APH 2026-27)</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">Submit New Approval Dossier</h2>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Fill in your institutional metrics and submit directly for official AICTE scrutiny, or save as a draft to upload additional certificates later.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAction(true);
          }}
          className="space-y-6 pt-2"
        >
          {/* Statutory Category & Year */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Approval Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Extension of Approval (EoA)">Extension of Approval (EoA)</option>
                <option value="New Technical Institution">New Technical Institution</option>
                <option value="Increase in Intake / Additional Course">Increase in Intake / Additional Course</option>
                <option value="Introduction of Supernumerary Seats">Introduction of Supernumerary Seats</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Academic Year
              </label>
              <select
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              >
                <option value="2026-27">2026-27 (Current Cycle)</option>
                <option value="2027-28">2027-28</option>
              </select>
            </div>
          </div>

          {/* Program & Level */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Academic Level
              </label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Under Graduate">Under Graduate (UG)</option>
                <option value="Post Graduate">Post Graduate (PG)</option>
                <option value="Diploma">Diploma</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Statutory Discipline / Program
              </label>
              <select
                value={program}
                onChange={(e) => setProgram(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Engineering & Technology">Engineering & Technology</option>
                <option value="Management (MBA)">Management (MBA)</option>
                <option value="Computer Applications (MCA)">Computer Applications (MCA)</option>
                <option value="Pharmacy">Pharmacy</option>
                <option value="Architecture & Planning">Architecture & Planning</option>
              </select>
            </div>
          </div>

          {/* Declared Capacity Metrics */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Declared Metrics for Compliance Validation
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Total Faculty Declared
                </label>
                <input
                  type="number"
                  required
                  value={faculty}
                  onChange={(e) => setFaculty(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Total Approved Intake
                </label>
                <input
                  type="number"
                  required
                  value={intake}
                  onChange={(e) => setIntake(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Built-up Area (sqm)
                </label>
                <input
                  type="number"
                  required
                  value={builtUpArea}
                  onChange={(e) => setBuiltUpArea(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Land Area (acres)
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={landArea}
                  onChange={(e) => setLandArea(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Supporting Documents Section (Multi-Document Upload) */}
          <div className="p-5 rounded-2xl bg-emerald-50/40 border border-emerald-100 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-700" />
                <h4 className="text-xs font-bold text-slate-900">
                  Supporting Documents ({stagedDocuments.length} Attached)
                </h4>
              </div>
              <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-100/80 px-2 py-0.5 rounded-full">
                Multi-Document Support
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Upload all official institutional documents required by the AICTE Approval Process Handbook (e.g., Land Title Deed, Approved Building Plan, Faculty Roster, Fire Safety NOC). All uploaded files are saved and extracted before automated verification commences.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Document Category for New File
                </label>
                <select
                  value={docCategory}
                  onChange={(e) => setDocCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Land Registration / Title Document">Land Registration / Title Document</option>
                  <option value="Approved Building Plan / Occupancy">Approved Building Plan / Occupancy</option>
                  <option value="Faculty Roster & Cadre Distribution">Faculty Roster & Cadre Distribution</option>
                  <option value="Fire Safety & NOC Certificate">Fire Safety & NOC Certificate</option>
                  <option value="Institution Registration">Institution Registration</option>
                  <option value="Statutory Declaration & Undertaking">Statutory Declaration & Undertaking</option>
                  <option value="Affidavit / Declaration">Affidavit / Declaration</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Select Supporting File (PDF, DOCX)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx"
                    multiple
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-1.5 font-medium transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Choose File(s) to Attach</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Staged Documents List */}
            {stagedDocuments.length > 0 && (
              <div className="space-y-2 pt-2">
                <label className="block text-[11px] font-bold text-slate-700">
                  Documents Queued for Upload ({stagedDocuments.length}):
                </label>
                <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                  {stagedDocuments.map((doc, idx) => (
                    <div key={doc.id} className="p-2.5 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-800 truncate text-[11px]">{doc.file.name}</p>
                          <p className="text-[10px] text-slate-400">{(doc.file.size / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <select
                          value={doc.category}
                          onChange={(e) => updateDocCategory(doc.id, e.target.value)}
                          className="px-2 py-1 text-[11px] bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
                        >
                          <option value="Land Registration / Title Document">Land Registration</option>
                          <option value="Approved Building Plan / Occupancy">Building Plan</option>
                          <option value="Faculty Roster & Cadre Distribution">Faculty Roster</option>
                          <option value="Fire Safety & NOC Certificate">Fire Safety NOC</option>
                          <option value="Institution Registration">Institution Reg</option>
                          <option value="Statutory Declaration & Undertaking">Declaration</option>
                          <option value="Affidavit / Declaration">Affidavit</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => removeStagedDoc(doc.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                          title="Remove document"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Optional Explicit Statutory Affidavit Checkbox */}
            <div className="pt-2 border-t border-emerald-100 flex items-start gap-2.5">
              <input
                type="checkbox"
                id="explicitAffidavit"
                checked={explicitAffidavit}
                onChange={(e) => setExplicitAffidavit(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500"
              />
              <label htmlFor="explicitAffidavit" className="text-[11px] text-slate-700 leading-snug cursor-pointer">
                <strong>Generate statutory affidavit declaration (Optional)</strong>: Check only if you explicitly request an automated system-generated statutory declaration to accompany your uploaded supporting documents.
              </label>
            </div>

            {/* Upload Progress Status Banner */}
            {uploadProgressMessage && (
              <div className="p-3 bg-emerald-100/70 border border-emerald-200 text-emerald-900 text-xs rounded-xl flex items-center gap-2 animate-pulse">
                <div className="w-3.5 h-3.5 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin" />
                <span className="font-semibold">{uploadProgressMessage}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => navigate('/applications')}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>

            <div className="flex items-center gap-3">
              {/* Save Draft Button */}
              <button
                type="button"
                disabled={loadingAction !== null}
                onClick={() => handleAction(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <Save className="w-4 h-4 text-slate-500" />
                <span>{loadingAction === 'draft' ? 'Saving Draft...' : 'Save as Draft'}</span>
              </button>

              {/* Submit for AICTE Scrutiny Button */}
              <button
                type="submit"
                disabled={loadingAction !== null}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {loadingAction === 'submit' ? (
                  <span className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Submitting Application...
                  </span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit Application for AICTE Scrutiny</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Post-Submission Success Confirmation Modal */}
      {submittedApp && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900">Application Submitted to AICTE</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Your application has been successfully saved to the official database and transmitted to the AICTE Reviewer Portal.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Official Application Number:</span>
                <span className="font-mono font-bold text-emerald-700">{submittedApp.application_number}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Database Record ID:</span>
                <span className="font-mono font-semibold text-slate-700">#{submittedApp.id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Current Status:</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                  {submittedApp.status}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Program / Discipline:</span>
                <span className="font-semibold text-slate-800">{submittedApp.program}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-[11px]">
              <ShieldCheck className="w-4 h-4 shrink-0 text-blue-600" />
              <span>
                Automated compliance checking and reviewer queue allocation have commenced immediately.
              </span>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate(`/institution/applications/${submittedApp.id}`)}
                className="w-full px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-2"
              >
                <span>View Dossier & Track Review Status</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
