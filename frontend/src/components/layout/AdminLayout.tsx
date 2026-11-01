import React, { useState } from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { ToastContainer } from '../common/Toast';
import {
  ShieldAlert,
  LayoutDashboard,
  Users,
  Building,
  FileText,
  UserCheck,
  ShieldCheck,
  Bell,
  History,
  BarChart3,
  Settings,
  LogOut,
  Shield,
  CheckCircle2
} from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

export const AdminLayout: React.FC<Props> = ({ children }) => {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const navigate = useNavigate();

  const [showNotifications, setShowNotifications] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  const navItems = [
    {
      to: '/admin/dashboard',
      label: 'Bureau Overview',
      icon: <LayoutDashboard className="w-4 h-4" />
    },
    {
      to: '/admin/users',
      label: 'User Management',
      icon: <Users className="w-4 h-4 text-purple-400" />
    },
    {
      to: '/admin/institutions',
      label: 'Institutions Directory',
      icon: <Building className="w-4 h-4" />
    },
    {
      to: '/admin/applications',
      label: 'All Applications',
      icon: <FileText className="w-4 h-4" />
    },
    {
      to: '/admin/reviewer-assignments',
      label: 'Reviewer Assignments',
      icon: <UserCheck className="w-4 h-4 text-blue-400" />
    },
    {
      to: '/admin/compliance-rules',
      label: 'Compliance Rules',
      icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
      badge: 'APH'
    },
    {
      to: '/admin/notification-settings',
      label: 'Notification Settings',
      icon: <Bell className="w-4 h-4 text-amber-400" />
    },
    {
      to: '/admin/audit-trail',
      label: 'Audit Trail Ledger',
      icon: <History className="w-4 h-4 text-purple-400" />,
      badge: 'SHA-256'
    },
    {
      to: '/admin/reports',
      label: 'Reports & CSV Exports',
      icon: <BarChart3 className="w-4 h-4" />
    },
    {
      to: '/admin/settings',
      label: 'System Settings',
      icon: <Settings className="w-4 h-4" />
    },
    {
      to: '/admin/profile',
      label: 'Administrator Profile',
      icon: <ShieldAlert className="w-4 h-4 text-purple-400" />
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 antialiased selection:bg-purple-100 selection:text-purple-900">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 w-full bg-slate-900 border-b border-slate-800 text-white shadow-xs">
        <div className="flex items-center justify-between px-6 py-2.5">
          {/* Left: Branding */}
          <div className="flex items-center gap-3">
            <Link to="/admin/dashboard" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-700 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-900/30">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-white text-base tracking-tight group-hover:text-purple-400 transition-colors">
                    AICTE <span className="text-purple-400">SmartApproval</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-purple-950 text-purple-400 border border-purple-800">
                    Administrator Portal
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">
                  AICTE Approval Bureau HQ • System Administration & Governance
                </p>
              </div>
            </Link>
          </div>

          {/* Right: Notifications, User & Logout */}
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800/80">
              <CheckCircle2 className="w-3 h-3" />
              <span>Audit Chain Validated</span>
            </span>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
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
                    <span className="text-xs font-bold text-slate-900 uppercase">System Notifications</span>
                    {unreadCount > 0 && (
                      <button onClick={markAllAsRead} className="text-[10px] text-purple-600 font-semibold hover:underline">
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
                            navigate('/admin/notification-settings');
                          }}
                          className="p-3 hover:bg-slate-50 cursor-pointer text-xs"
                        >
                          <div className="font-semibold text-slate-900">{n.title}</div>
                          <div className="text-[11px] text-slate-600 line-clamp-1 mt-0.5">{n.message}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User profile & Logout */}
            <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
              <div className="hidden md:flex flex-col text-right">
                <span className="text-xs font-bold text-white leading-tight">{user?.full_name}</span>
                <span className="text-[10px] text-purple-400 font-semibold">Bureau Administrator</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-purple-950 text-purple-400 border border-purple-800 flex items-center justify-center font-bold text-xs">
                {user?.full_name?.charAt(0) || 'A'}
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                title="Sign out of Administrator Portal"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Body with Admin Sidebar */}
      <div className="flex flex-1">
        <aside className="w-64 shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col justify-between min-h-[calc(100vh-53px)]">
          <div className="p-4 space-y-1">
            <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Administration Navigation
            </div>

            <nav className="space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-700/20 font-bold'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <span className="shrink-0">{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-800">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>

          {/* Admin Context footer */}
          {user && (
            <div className="p-4 m-3 rounded-2xl bg-slate-800/80 border border-slate-700/60">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">System Role</p>
              <p className="text-xs font-bold text-white mt-0.5 truncate">AICTE Approval Bureau HQ</p>
              <p className="text-[10px] text-purple-400 truncate mt-0.5">Bureau Administrator</p>
            </div>
          )}
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
