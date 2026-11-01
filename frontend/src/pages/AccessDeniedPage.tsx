import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, ArrowLeft, LogOut, CheckCircle2 } from 'lucide-react';

interface Props {
  attemptedPortal?: 'institution' | 'reviewer' | 'admin' | string;
  currentRole?: string;
}

export const AccessDeniedPage: React.FC<Props> = ({ attemptedPortal = 'restricted', currentRole }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const activeRole = currentRole || user?.role || 'user';

  const getDashboardPath = (role: string) => {
    switch (role) {
      case 'institution':
        return '/institution/dashboard';
      case 'reviewer':
        return '/reviewer/dashboard';
      case 'admin':
        return '/admin/dashboard';
      default:
        return '/';
    }
  };

  const getPortalTitle = (portal: string) => {
    switch (portal) {
      case 'institution':
        return 'Institution Portal';
      case 'reviewer':
        return 'Reviewer / Compliance Officer Portal';
      case 'admin':
        return 'Administrator Portal';
      default:
        return `${portal} Portal`;
    }
  };

  const handleReturn = () => {
    navigate(getDashboardPath(activeRole), { replace: true });
  };

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-rose-950/80 border border-rose-800/80 flex items-center justify-center mx-auto text-rose-400 shadow-lg">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30 uppercase tracking-wider">
            HTTP 403 • Access Denied
          </span>
          <h2 className="text-xl font-extrabold text-white">Unauthorized Portal Access</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            You do not possess statutory permissions to access the <strong className="text-slate-200">{getPortalTitle(attemptedPortal)}</strong>.
          </p>
        </div>

        <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800/80 text-left text-xs space-y-2">
          <div className="flex justify-between">
            <span className="text-slate-500">Authenticated User:</span>
            <span className="font-semibold text-slate-200 truncate">{user?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Registered Role:</span>
            <span className="font-bold text-amber-400 uppercase">{activeRole}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Target Resource:</span>
            <span className="font-mono text-slate-400">{getPortalTitle(attemptedPortal)}</span>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <button
            onClick={handleReturn}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/30 transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Your {activeRole.toUpperCase()} Dashboard</span>
          </button>

          <button
            onClick={handleLogout}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700 transition-all flex items-center justify-center gap-2"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out & Switch Account</span>
          </button>
        </div>
      </div>
    </div>
  );
};
