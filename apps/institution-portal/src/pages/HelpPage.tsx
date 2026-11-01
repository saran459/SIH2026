import React from 'react';
import {
  BookOpen,
  HelpCircle,
  FileCheck2,
  ShieldAlert,
  Cpu,
  Download,
  ExternalLink,
  Info
} from 'lucide-react';
import { PolicyChatbot } from '../components/policy/PolicyChatbot';

export const HelpPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">Institutional Help & Approval Process Handbook (APH) Guide</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Comprehensive statutory compliance reference and AI-powered policy copilot for educational institutions.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Handbook Highlights & FAQs */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">AICTE Approval Process Handbook (APH 2026-27) Summary</h3>
                <p className="text-xs text-slate-500">Statutory norms for Extension of Approval (EoA) and New Technical Programs</p>
              </div>
            </div>

            <div className="space-y-3 pt-2 text-xs text-slate-600 leading-relaxed">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <h4 className="font-bold text-slate-900 mb-1 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px] font-bold">1</span>
                  Mandatory Statutory Land & Built-up Area
                </h4>
                <p>
                  Technical institutions must maintain contiguous land holding with unrestricted ownership or statutory long-term lease. Built-up area requirements mandate designated administrative, instructional (classrooms, laboratories, workshop), and amenities spaces per sanctioned intake.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <h4 className="font-bold text-slate-900 mb-1 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px] font-bold">2</span>
                  Cadre Ratio & Faculty-to-Student Ratio (FSR)
                </h4>
                <p>
                  Engineering institutions require minimum FSR of 1:20 (UG) and 1:15 (PG), with cadre ratio 1 Professor : 2 Associate Professors : 6 Assistant Professors. All faculty salaries must be disbursed strictly via bank transfer per 7th Central Pay Commission norms.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <h4 className="font-bold text-slate-900 mb-1 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px] font-bold">3</span>
                  Life Safety & Occupancy Compliance
                </h4>
                <p>
                  Valid Fire Safety NOC from State Fire Department and Building Stability Certificate from Government-approved Structural Engineer are mandatory. Applications missing life safety clearance cannot be recommended for approval.
                </p>
              </div>
            </div>
          </div>

          {/* Digital Twin & Simulator Explanation */}
          <div className="bg-gradient-to-br from-emerald-900 to-teal-950 text-white rounded-3xl p-6 shadow-md space-y-3">
            <div className="flex items-center gap-2.5">
              <Cpu className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Using the Approval Digital Twin & What-If Simulator</h3>
            </div>
            <p className="text-xs text-emerald-100/90 leading-relaxed">
              The Digital Twin creates a mathematical readiness score (0–100) reflecting statutory readiness. Before official resubmission, use the <strong>What-If Simulator</strong> to model corrective actions (e.g. uploading missing NOCs or reallocating faculty) and inspect instant score projections without modifying persistent application records.
            </p>
          </div>
        </div>

        {/* Right Column: AI Policy Assistant (Copilot) */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs sticky top-20">
            <PolicyChatbot />
          </div>
        </div>
      </div>
    </div>
  );
};
