import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useNotifications } from '../../context/NotificationContext';
import {
  FileText,
  Building2,
  Calendar,
  Layers,
  Users,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles
} from 'lucide-react';

export const InstitutionNewApplicationPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useNotifications();

  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState('Extension of Approval (EoA)');
  const [academicYear, setAcademicYear] = useState('2026-27');
  const [level, setLevel] = useState('Under Graduate');
  const [program, setProgram] = useState('Engineering & Technology');
  const [faculty, setFaculty] = useState('42');
  const [intake, setIntake] = useState('480');
  const [builtUpArea, setBuiltUpArea] = useState('8500');
  const [landArea, setLandArea] = useState('5.2');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const newApp = await api.createApplication({
        category,
        academic_year: academicYear,
        level,
        program,
        total_faculty_declared: Number(faculty) || 0,
        total_intake_declared: Number(intake) || 0,
        built_up_area_sqm: Number(builtUpArea) || 0,
        land_area_acres: Number(landArea) || 0
      });
      showToast('success', 'Draft Created', `Application ${newApp.application_number} initialized.`);
      navigate(`/institution/applications/${newApp.id}`);
    } catch (e: any) {
      showToast('error', 'Failed to create application', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div>
        <button
          onClick={() => navigate('/institution/applications')}
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
          <h2 className="text-xl font-bold text-slate-900">Initialize New Approval Dossier</h2>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Create an official draft application. After creation, you will upload supporting certificates, verify extracted fields, and run the Approval Digital Twin.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
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

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => navigate('/institution/applications')}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? 'Creating Draft Dossier...' : 'Create Draft Application'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
