import React, { useState } from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { ToastContainer } from '../common/Toast';
import {
  UserCheck,
  LayoutDashboard,
  FileText,
  FolderOpen,
  ShieldCheck,
  MessageSquare,
  Clock,
  AlertTriangle,
  BarChart3,
  User,
  LogOut,
  Bell,
  Scale,
  History
} from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

export const ReviewerLayout: React.FC<Props> = ({ children }) => {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const navigate = useNavigate();

  const [showNotifications, setShowNotifications] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const navItems = [
    {
      to: '/dashboard',
      label: 'Scrutiny Overview',
      icon: <LayoutDashboard className="w-4 h-4" />
    },
    {
      to: '/assigned-applications',
      label: 'Assigned Applications',
      icon: <FileText className="w-4 h-4" />
    },
    {
      to: '/review-queue',
      label: 'Review Queue & Dual-Pane',
      icon: <UserCheck className="w-4 h-4 text-blue-400" />,
      badge: 'Workbench'
    },
    {
      to: '/compliance',
      label: 'Compliance Findings',
      icon: <ShieldCheck className="w-4 h-4" />
    },
    {
      to: '/comparison',
      label: 'Cross-Doc Comparison',
      icon: <Scale className="w-4 h-4 text-cyan-400" />,
      badge: 'Intelligence'
    },
    {
      to: '/correction-requests',
      label: 'Correction Queries',
      icon: <MessageSquare className="w-4 h-4 text-amber-400" />
    },
    {
      to: '/deadlines',
      label: 'Scrutiny SLA Deadlines',
      icon: <Clock className="w-4 h-4" />
    },
    {
      to: '/alerts',
      label: 'Scrutiny Alerts',
      icon: <AlertTriangle className="w-4 h-4 text-amber-400" />
    },
    {
      to: '/reports',
      label: 'Workload & Analytics',
      icon: <BarChart3 className="w-4 h-4" />
    },
    {
      to: '/audit-history',
      label: 'Audit History',
      icon: <History className="w-4 h-4 text-purple-400" />
    },
    {
      to: '/profile',
      label: 'Reviewer Profile',
      icon: <User className="w-4 h-4" />
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 antialiased selection:bg-blue-100 selection:text-blue-900">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 w-full bg-slate-900 border-b border-slate-800 text-white shadow-xs">
        <div className="flex items-center justify-between px-6 py-2.5">
          {/* Left: Branding */}
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-900/30">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-white text-base tracking-tight group-hover:text-blue-400 transition-colors">
                    AICTE <span className="text-blue-400">SmartApproval</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-blue-950 text-blue-300 border border-blue-800">
                    Reviewer Workbench
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">Statutory Scrutiny & Regulatory Verification</p>
              </div>
            </Link>
          </div>

          {/* Right: Notifications, User & Logout */}
          <div className="flex items-center gap-3">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-rose-600 rounded-full">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white text-slate-900 rounded-2xl shadow-xl border border-slate-200 py-3 z-50 animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between px-4 pb-2 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-900 uppercase">Scrutiny Alerts</span>
                    {unreadCount > 0 && (
                      <button onClick={markAllAsRead} className="text-[10px] text-blue-600 font-semibold hover:underline">
                        Mark read
                      </button>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400">No new alerts</div>
                    ) : (
                      notifications.slice(0, 5).map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            markAsRead(n.id);
                            setShowNotifications(false);
                            navigate('/alerts');
                          }}
                          className="p-3 hover:bg-slate-50 cursor-pointer text-xs"
                        >
                          <div className="font-semibold text-slate-900">{n.title}</div>
                          <div className="text-[11px] text-slate-600 line-clamp-1 mt-0.5">{n.message}</div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="px-4 pt-2 border-t border-slate-100 text-center">
                    <Link
                      to="/alerts"
                      onClick={() => setShowNotifications(false)}
                      className="text-xs font-semibold text-blue-700 hover:underline"
                    >
                      View all scrutiny alerts →
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* User profile & Logout */}
            <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
              <div className="hidden md:flex flex-col text-right">
                <span className="text-xs font-bold text-white leading-tight">{user?.full_name}</span>
                <span className="text-[10px] text-blue-400 font-semibold">AICTE Scrutiny Officer</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-blue-950 text-blue-400 border border-blue-800 flex items-center justify-center font-bold text-xs">
                {user?.full_name?.charAt(0) || 'R'}
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
                title="Sign out of Reviewer Workbench"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Body with Reviewer Sidebar */}
      <div className="flex flex-1">
        <aside className="w-64 shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col justify-between min-h-[calc(100vh-53px)]">
          <div className="p-4 space-y-1">
            <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Scrutiny Workbench
            </div>

            <nav className="space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-700/20 font-bold'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <span className="shrink-0">{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-800">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>

          {/* Bureau Info footer */}
          <div className="p-4 m-3 rounded-2xl bg-slate-800/80 border border-slate-700/60">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">AICTE Scrutiny Bureau</p>
            <p className="text-xs font-bold text-white mt-0.5 truncate">
              Approval Bureau (HQ New Delhi)
            </p>
            <p className="text-[10px] text-blue-400 truncate mt-0.5">Approval Process Handbook (APH 2026-27)</p>
          </div>
        </aside>

        {/* Page Content */}
        <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-x-hidden">
          {children}
        </main>
      </div>

      <ToastContainer />
    </div>
  );
};
