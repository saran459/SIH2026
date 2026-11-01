import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { api } from '../../services/api';
import { Institution, Application } from '../../types';
import { CollegeSearchSelect, CollegeItem } from '../common/CollegeSearchSelect';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Building2, FileText, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (app: Application) => void;
}

export const ApplicationWizard: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const { user } = useAuth();
  const { showToast } = useNotifications();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [institutions, setInstitutions] = useState<Institution[]>([]);

  // Form State
  const [selectedInstId, setSelectedInstId] = useState<number>(user?.institution_id || 1);
  const [selectedCollege, setSelectedCollege] = useState<CollegeItem | null>(null);
  const [category, setCategory] = useState('Extension of Approval (EOA)');
  const [academicYear, setAcademicYear] = useState('2026-27');
  const [level, setLevel] = useState('Undergraduate (UG)');
  const [program, setProgram] = useState('Engineering & Technology');
  const [facultyDeclared, setFacultyDeclared] = useState(40);
  const [intakeDeclared, setIntakeDeclared] = useState(600);
  const [builtUpArea, setBuiltUpArea] = useState(12500);
  const [landArea, setLandArea] = useState(7.5);

  useEffect(() => {
    if (user?.role === 'admin') {
      // Searchable college dropdown loaded on demand via searchInstitutions API
    }
  }, [user]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const created = await api.createApplication({
        institution_id: selectedInstId,
        category,
        academic_year: academicYear,
        level,
        program,
        total_faculty_declared: Number(facultyDeclared),
        total_intake_declared: Number(intakeDeclared),
        built_up_area_sqm: Number(builtUpArea),
        land_area_acres: Number(landArea)
      });
      showToast('success', 'Application Initialized', `Draft Application ${created.application_number} created successfully.`);
      onSuccess(created);
      onClose();
    } catch (e: any) {
      showToast('error', 'Creation Failed', e.message);
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { num: 1, title: 'Institution' },
    { num: 2, title: 'Program & Level' },
    { num: 3, title: 'Declared Norms' },
    { num: 4, title: 'Review & Confirm' }
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New AICTE Approval Application"
      subtitle="Follow the 4-step wizard to initialize your statutory application bundle"
      maxWidth="xl"
    >
      <div className="space-y-6">
        {/* Step Indicator */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          {steps.map((s, idx) => (
            <div key={s.num} className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  step === s.num
                    ? 'bg-blue-600 text-white shadow-xs'
                    : step > s.num
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {step > s.num ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : s.num}
              </div>
              <span className={`text-xs font-medium hidden sm:inline ${step === s.num ? 'text-blue-900 font-bold' : 'text-slate-500'}`}>
                {s.title}
              </span>
              {idx < steps.length - 1 && <span className="text-slate-300 ml-2">/</span>}
            </div>
          ))}
        </div>

        {/* Step 1: Institution Details */}
        {step === 1 && (
          <div className="space-y-4 text-xs">
            {user?.role === 'admin' ? (
              <div>
                <CollegeSearchSelect
                  label="Select Target Institution"
                  required
                  theme="light"
                  placeholder="Type 2+ letters to search AICTE institutions..."
                  value={selectedInstId}
                  selectedCollege={selectedCollege}
                  onSelect={(col) => {
                    setSelectedCollege(col);
                    setSelectedInstId(col.id);
                  }}
                  allowManualEntry={true}
                />
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200">
                <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
                  <Building2 className="w-4 h-4" />
                  <span>{user?.institution_name || 'Greenfield Institute of Technology'}</span>
                </div>
                <p className="text-xs text-blue-800 mt-1">
                  AICTE Permanent ID: 1-445892101 • Private-Self Financed • Bengaluru, Karnataka
                </p>
                <p className="text-[11px] text-slate-500 mt-2">
                  Authenticated applicant representative: {user?.full_name} ({user?.designation})
                </p>
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Academic Year *</label>
              <select
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              >
                <option value="2026-27">2026-27 (Upcoming Cycle)</option>
                <option value="2025-26">2025-26 (Retrospective)</option>
              </select>
            </div>
          </div>
        )}

        {/* Step 2: Program and Category */}
        {step === 2 && (
          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Application Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              >
                <option value="Extension of Approval (EOA)">Extension of Approval (EOA)</option>
                <option value="Increase in Intake">Increase in Intake</option>
                <option value="Introduction of New Courses">Introduction of New Courses</option>
                <option value="New Technical Institution">New Technical Institution</option>
                <option value="Closure of Course">Closure of Course</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Level *</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              >
                <option value="Undergraduate (UG)">Undergraduate (UG)</option>
                <option value="Postgraduate (PG)">Postgraduate (PG)</option>
                <option value="Diploma">Diploma</option>
                <option value="Integrated Course">Integrated Course</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Discipline / Program *</label>
              <select
                value={program}
                onChange={(e) => setProgram(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              >
                <option value="Engineering & Technology">Engineering & Technology</option>
                <option value="Management">Management</option>
                <option value="Computer Applications">Computer Applications (MCA)</option>
                <option value="Pharmacy">Pharmacy</option>
                <option value="Architecture & Planning">Architecture & Planning</option>
                <option value="Applied Arts & Crafts">Applied Arts & Crafts</option>
              </select>
            </div>
          </div>
        )}

        {/* Step 3: Declared Metrics */}
        {step === 3 && (
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Declared Teaching Faculty Strength *</label>
              <input
                type="number"
                value={facultyDeclared}
                onChange={(e) => setFacultyDeclared(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
              <p className="text-[10px] text-slate-500 mt-1">AICTE norm: 1:20 FSR (Min {Math.ceil(intakeDeclared / 20)} required)</p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Total Sanctioned / Applied Intake *</label>
              <input
                type="number"
                value={intakeDeclared}
                onChange={(e) => setIntakeDeclared(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
              <p className="text-[10px] text-slate-500 mt-1">Cumulative student enrollment seats</p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Built-up Covered Area (sqm) *</label>
              <input
                type="number"
                value={builtUpArea}
                onChange={(e) => setBuiltUpArea(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
              <p className="text-[10px] text-slate-500 mt-1">Instructional + administrative carpet area (Min 4,000 sqm)</p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Total Contiguous Land Holding (Acres) *</label>
              <input
                type="number"
                step="0.1"
                value={landArea}
                onChange={(e) => setLandArea(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
              <p className="text-[10px] text-slate-500 mt-1">Min 2.5 acres (Urban) or 7.5 acres (Rural)</p>
            </div>
          </div>
        )}

        {/* Step 4: Summary & Confirm */}
        {step === 4 && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <h5 className="font-bold text-slate-900 border-b border-slate-200 pb-1.5">
                Draft Application Summary
              </h5>
              <div className="grid grid-cols-2 gap-2 text-slate-700">
                <div><span className="font-semibold text-slate-900">Category:</span> {category}</div>
                <div><span className="font-semibold text-slate-900">Academic Year:</span> {academicYear}</div>
                <div><span className="font-semibold text-slate-900">Level:</span> {level}</div>
                <div><span className="font-semibold text-slate-900">Program:</span> {program}</div>
                <div><span className="font-semibold text-slate-900">Faculty Declared:</span> {facultyDeclared} members</div>
                <div><span className="font-semibold text-slate-900">Intake Capacity:</span> {intakeDeclared} seats</div>
                <div><span className="font-semibold text-slate-900">Built-up Area:</span> {builtUpArea} sqm</div>
                <div><span className="font-semibold text-slate-900">Land Holding:</span> {landArea} acres</div>
              </div>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 leading-relaxed text-[11px]">
              Note: This creates an active draft application. You can subsequently upload the supporting certificates in the Document Centre and run statutory compliance checks before formal submission.
            </div>
          </div>
        )}

        {/* Wizard Controls */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-150">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
            >
              <span>Next Step</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Initialize Draft Application'}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};
