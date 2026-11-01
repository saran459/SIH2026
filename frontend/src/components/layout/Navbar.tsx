import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { UserRole } from '../../types';
import {
  Bell,
  Search,
  HelpCircle,
  LogOut,
  UserCheck,
  ShieldAlert,
  GraduationCap,
  Sparkles,
  ExternalLink,
  Check,
  Bot
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout, loginWithRole, demoAccounts } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const navigate = useNavigate();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/applications?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'institution':
        return { label: 'Institution Applicant', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
      case 'reviewer':
        return { label: 'AICTE Reviewer', bg: 'bg-blue-100 text-blue-800 border-blue-300' };
      case 'admin':
        return { label: 'Bureau Administrator', bg: 'bg-purple-100 text-purple-800 border-purple-300' };
      default:
        return { label: 'User', bg: 'bg-gray-100 text-gray-800 border-gray-300' };
    }
  };

  const roleStyle = user ? getRoleBadge(user.role) : { label: '', bg: '' };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="flex items-center justify-between px-6 py-2.5">
        {/* Left: Branding & SIH Tag */}
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-900 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-blue-900/20 ring-2 ring-blue-600/30">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 text-lg tracking-tight group-hover:text-blue-900 transition-colors">
                  AICTE <span className="text-blue-700">SmartApproval</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-amber-50 text-amber-800 border border-amber-300 shadow-2xs">
                  SIH Prototype
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
                Approval Workflow Automation & Digital Twin System
              </p>
            </div>
          </Link>
        </div>

        {/* Middle: Global Search */}
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <form onSubmit={handleSearch} className="relative w-full">
            <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Application No, Institute name, or document..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-100 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
            />
          </form>
        </div>

        {/* Right: Actions, Role Switcher & Profile */}
        <div className="flex items-center gap-3">
          {/* Policy Assistant quick button */}
          <button
            onClick={() => navigate('/policy-assistant')}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors"
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Policy Assistant</span>
          </button>

          {/* 1-Click Role Switcher dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
              title="Quick switch demonstration role"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline">Role Switcher</span>
            </button>

            {showRoleSwitcher && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 py-3 z-50 animate-in fade-in zoom-in-95">
                <div className="px-4 pb-2 border-b border-slate-100">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Demonstration Role Switcher
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Instantly simulate portal journeys as different stakeholders:
                  </p>
                </div>
                <div className="p-2 space-y-1">
                  {demoAccounts.map((account) => {
                    const isCurrent = user?.role === account.role;
                    return (
                      <button
                        key={account.role}
                        onClick={async () => {
                          setShowRoleSwitcher(false);
                          await loginWithRole(account.role);
                        }}
                        className={`w-full text-left p-2.5 rounded-xl text-xs transition-all flex items-start gap-2.5 ${
                          isCurrent
                            ? 'bg-blue-50 border border-blue-200 text-blue-900 font-semibold'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="mt-0.5">
                          {account.role === 'institution' && <GraduationCap className="w-4 h-4 text-emerald-600" />}
                          {account.role === 'reviewer' && <UserCheck className="w-4 h-4 text-blue-600" />}
                          {account.role === 'admin' && <ShieldAlert className="w-4 h-4 text-purple-600" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold">{account.label}</span>
                            {isCurrent && <Check className="w-3.5 h-3.5 text-blue-600" />}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">{account.institution_name}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Notifications bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-rose-600 rounded-full ring-2 ring-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-88 bg-white rounded-2xl shadow-xl border border-slate-200 py-3 z-50 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between px-4 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => markAllAsRead()}
                      className="text-[11px] font-medium text-blue-700 hover:underline"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">
                      No notifications to display
                    </div>
                  ) : (
                    notifications.slice(0, 6).map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => {
                          markAsRead(notif.id);
                          if (notif.link_url) navigate(notif.link_url);
                          setShowNotifications(false);
                        }}
                        className={`p-3.5 hover:bg-slate-50 cursor-pointer transition-colors ${
                          !notif.is_read ? 'bg-blue-50/40' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h5 className="text-xs font-semibold text-slate-900">{notif.title}</h5>
                          <span className="text-[10px] text-slate-400 shrink-0">
                            {new Date(notif.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                          {notif.message}
                        </p>
                      </div>
                    ))
                  )}
                </div>
                <div className="px-4 pt-2 border-t border-slate-100 text-center">
                  <Link
                    to="/alerts-deadlines"
                    onClick={() => setShowNotifications(false)}
                    className="text-xs font-semibold text-blue-700 hover:underline"
                  >
                    View all alerts & deadlines →
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* User profile & logout */}
          {user && (
            <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
              <div className="hidden lg:flex flex-col text-right">
                <span className="text-xs font-bold text-slate-900 leading-tight">{user.full_name}</span>
                <span className={`inline-block mt-0.5 px-2 py-0.2 text-[10px] rounded-full border self-end font-semibold ${roleStyle.bg}`}>
                  {roleStyle.label}
                </span>
              </div>
              <div className="w-8 h-8 rounded-full bg-blue-900 text-white flex items-center justify-center font-bold text-xs ring-2 ring-blue-100 shadow-2xs">
                {user.full_name.charAt(0)}
              </div>
              <button
                onClick={logout}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
