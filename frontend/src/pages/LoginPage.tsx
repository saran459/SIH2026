import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import {
  GraduationCap,
  UserCheck,
  ShieldAlert,
  ArrowRight,
  Lock,
  Mail,
  Sparkles,
  CheckCircle2,
  Building
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, loginWithRole, demoAccounts } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError('');
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (role: UserRole) => {
    setLoading(true);
    setError('');
    try {
      await loginWithRole(role);
    } catch (err: any) {
      setError(err.message || 'Demo login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between text-slate-100 selection:bg-blue-600 selection:text-white">
      {/* Top Banner */}
      <header className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white shadow-md">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-extrabold text-base tracking-tight text-white">
              AICTE <span className="text-blue-400">SmartApproval</span>
            </h1>
            <p className="text-[11px] text-slate-400">Integrated Workflow Automation & Digital Twin System</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            SIH Prototype / Demonstration Environment
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Hero & Explanations */}
          <div className="lg:col-span-6 space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-blue-900/40 text-blue-300 border border-blue-700/50">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Smart India Hackathon 2026</span>
            </div>
            <h2 className="text-3xl font-extrabold text-white tracking-tight leading-tight">
              Next-Generation Statutory Approval & Compliance Intelligence
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Empowering higher education institutions, scrutiny committees, and AICTE officers with automated document extraction, cross-evidence discrepancy detection, and the innovative Approval Digital Twin.
            </p>

            {/* Feature highlights */}
            <div className="space-y-3 pt-2 text-xs text-slate-300">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>End-to-End Approval Workflow State Machine with Audit Trail</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Approval Digital Twin with Interactive What-If Simulator</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Cross-Document Consistency Engine (42 vs 38 Faculty Headcount Mismatch Detection)</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Tamper-Evident SHA-256 Cryptographic Hash Chain Audit Trail</span>
              </div>
            </div>
          </div>

          {/* Right: Login Box & 1-Click Role Selector */}
          <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-3xl p-6 lg:p-8 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Demonstration Environment Login</h3>
            <p className="text-xs text-slate-400 mt-1">
              Select a pre-seeded persona for 1-click access during evaluation:
            </p>

            {/* 1-Click Role Buttons */}
            <div className="space-y-2.5 mt-5">
              <button
                type="button"
                onClick={() => handleQuickLogin('institution')}
                disabled={loading}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-emerald-500/50 text-left transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-950 text-emerald-400 flex items-center justify-center border border-emerald-800/60">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block group-hover:text-emerald-400 transition-colors">
                      Institution User (Greenfield Institute)
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Submit drafts, upload certificates, run Digital Twin simulation
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('reviewer')}
                disabled={loading}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-blue-500/50 text-left transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-950 text-blue-400 flex items-center justify-center border border-blue-800/60">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block group-hover:text-blue-400 transition-colors">
                      AICTE Reviewer (Dr. Sudhir Bhattacharya)
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Review queue, issue deficiency notices, approve/reject
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('admin')}
                disabled={loading}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-purple-500/50 text-left transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-950 text-purple-400 flex items-center justify-center border border-purple-800/60">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block group-hover:text-purple-400 transition-colors">
                      Bureau Administrator (AICTE HQ)
                    </span>
                    <span className="text-[11px] text-slate-400">
                      System settings, rule registry, audit hash chain verification
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
              </button>
            </div>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-slate-900 px-3 text-slate-500 font-semibold">Or Sign in with Email</span>
              </div>
            </div>

            {error && (
              <div className="p-3 mb-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
                {error}
              </div>
            )}

            {/* Email / Password Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. institution@greenfield.edu"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-800/90 border border-slate-700 rounded-xl text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password (default: password123)"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-800/90 border border-slate-700 rounded-xl text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/30 transition-colors disabled:opacity-50 mt-2"
              >
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-3 border-t border-slate-800/80 text-center text-[11px] text-slate-500">
        AICTE SmartApproval • SIH Demonstration Prototype • All simulated scores, rules, and records are for presentation testing purposes.
      </footer>
    </div>
  );
};
