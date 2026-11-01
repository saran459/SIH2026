import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  GraduationCap,
  UserCheck,
  ShieldAlert,
  ArrowRight,
  Shield,
  FileCheck2,
  Cpu,
  Lock,
  ExternalLink,
  Sparkles,
  ChevronRight
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { user, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  // If already authenticated, redirect to the permitted dashboard for their role
  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      if (user.role === 'institution') {
        navigate('/institution/dashboard', { replace: true });
      } else if (user.role === 'reviewer') {
        navigate('/reviewer/dashboard', { replace: true });
      } else if (user.role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      }
    }
  }, [isAuthenticated, user, loading, navigate]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between text-slate-100 selection:bg-blue-600 selection:text-white">
      {/* Top Banner */}
      <header className="px-6 lg:px-12 py-4 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-900/30">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-extrabold text-base tracking-tight text-white">
              AICTE <span className="text-blue-400">SmartApproval</span>
            </h1>
            <p className="text-[11px] text-slate-400">Integrated Workflow Automation, Compliance Monitoring & Alert Management System</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            SIH Demonstration Environment
          </span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 lg:px-12 py-12 max-w-7xl mx-auto w-full">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-blue-900/40 text-blue-300 border border-blue-700/50">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>AICTE Approval Process Handbook (APH 2026-27) Statutory Engine</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Role-Based Statutory Portals
          </h2>
          <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Select your designated stakeholder portal below to access authorized features, applications, and compliance evaluation tools.
          </p>
        </div>

        {/* Three Portal Cards (Strictly No Login Forms on Landing Page) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl">
          {/* 1. Institution Portal Card */}
          <div className="bg-slate-900/90 border border-slate-800 hover:border-emerald-500/60 rounded-3xl p-7 flex flex-col justify-between shadow-xl hover:shadow-emerald-950/20 transition-all group">
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-950/80 border border-emerald-800/80 text-emerald-400 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                <GraduationCap className="w-7 h-7" />
              </div>
              <div>
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Applicant
                </span>
                <h3 className="text-xl font-bold text-white mt-2 group-hover:text-emerald-400 transition-colors">
                  Institution Portal
                </h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Manage applications, documents and compliance readiness.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-800/80 space-y-2 text-[11px] text-slate-300">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Create and submit draft applications</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Upload statutory certificates & NOCs</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>AICTE Approval Digital Twin & Simulator</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Respond to deficiency queries</span>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-800/80">
              <button
                onClick={() => navigate('/institution/login')}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-700/20 transition-all flex items-center justify-center gap-2 group-hover:translate-y-[-1px]"
              >
                <span>Institution Login</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* 2. Reviewer Portal Card */}
          <div className="bg-slate-900/90 border border-slate-800 hover:border-blue-500/60 rounded-3xl p-7 flex flex-col justify-between shadow-xl hover:shadow-blue-950/20 transition-all group">
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-950/80 border border-blue-800/80 text-blue-400 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                <UserCheck className="w-7 h-7" />
              </div>
              <div>
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  Scrutiny Committee
                </span>
                <h3 className="text-xl font-bold text-white mt-2 group-hover:text-blue-400 transition-colors">
                  Reviewer Portal
                </h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Review applications, evaluate compliance and manage correction requests.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-800/80 space-y-2 text-[11px] text-slate-300">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  <span>Side-by-side dual pane scrutiny workbench</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  <span>Cross-document discrepancy detection</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  <span>Issue correction requests with mandatory reason</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  <span>Authorized statutory approval / rejection</span>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-800/80">
              <button
                onClick={() => navigate('/reviewer/login')}
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-700/20 transition-all flex items-center justify-center gap-2 group-hover:translate-y-[-1px]"
              >
                <span>Reviewer Login</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* 3. Administrator Portal Card */}
          <div className="bg-slate-900/90 border border-slate-800 hover:border-purple-500/60 rounded-3xl p-7 flex flex-col justify-between shadow-xl hover:shadow-purple-950/20 transition-all group">
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-purple-950/80 border border-purple-800/80 text-purple-400 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <div>
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  AICTE HQ / Bureau
                </span>
                <h3 className="text-xl font-bold text-white mt-2 group-hover:text-purple-400 transition-colors">
                  Administrator Portal
                </h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Manage users, institutions, reviewers and configurable compliance rules.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-800/80 space-y-2 text-[11px] text-slate-300">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  <span>User account creation & RBAC enforcement</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  <span>Assign reviewers & balance scrutiny queue</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  <span>Configure statutory rules & penalty weights</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  <span>Tamper-evident SHA-256 hash chain audit ledger</span>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-800/80">
              <button
                onClick={() => navigate('/admin/login')}
                className="w-full py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md shadow-purple-700/20 transition-all flex items-center justify-center gap-2 group-hover:translate-y-[-1px]"
              >
                <span>Administrator Login</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 border-t border-slate-800/80 text-center text-xs text-slate-500">
        AICTE SmartApproval • Integrated Statutory Workflow Automation System • All simulated data is for evaluation testing.
      </footer>
    </div>
  );
};
