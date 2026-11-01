import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  FileText,
  GitBranch,
  FolderOpen,
  ShieldCheck,
  Cpu,
  AlertTriangle,
  Bot,
  UserCheck,
  BarChart3,
  History,
  Settings
} from 'lucide-react';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  roles?: ('institution' | 'reviewer' | 'admin')[];
  badge?: string;
  badgeColor?: string;
}

export const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const userRole = user?.role || 'institution';

  const navItems: NavItem[] = [
    {
      to: '/',
      label: 'Overview',
      icon: <LayoutDashboard className="w-4 h-4" />
    },
    {
      to: '/applications',
      label: 'Applications',
      icon: <FileText className="w-4 h-4" />
    },
    {
      to: '/workflow',
      label: 'Approval Workflow',
      icon: <GitBranch className="w-4 h-4" />
    },
    {
      to: '/documents',
      label: 'Document Centre',
      icon: <FolderOpen className="w-4 h-4" />
    },
    {
      to: '/compliance',
      label: 'Compliance Monitor',
      icon: <ShieldCheck className="w-4 h-4" />
    },
    {
      to: '/digital-twin',
      label: 'Approval Digital Twin',
      icon: <Cpu className="w-4 h-4 text-indigo-600" />,
      badge: 'Simulator',
      badgeColor: 'bg-indigo-100 text-indigo-700 border-indigo-200'
    },
    {
      to: '/alerts-deadlines',
      label: 'Alerts & Deadlines',
      icon: <AlertTriangle className="w-4 h-4 text-amber-600" />
    },
    {
      to: '/policy-assistant',
      label: 'Policy Assistant',
      icon: <Bot className="w-4 h-4 text-blue-600" />,
      badge: 'APH 2026',
      badgeColor: 'bg-blue-100 text-blue-700 border-blue-200'
    },
    {
      to: '/reviewer-workbench',
      label: 'Reviewer Workbench',
      icon: <UserCheck className="w-4 h-4" />,
      roles: ['reviewer', 'admin']
    },
    {
      to: '/reports',
      label: 'Reports & Analytics',
      icon: <BarChart3 className="w-4 h-4" />
    },
    {
      to: '/audit-trail',
      label: 'Audit Trail',
      icon: <History className="w-4 h-4" />,
      badge: 'SHA-256',
      badgeColor: 'bg-slate-100 text-slate-600 border-slate-200'
    },
    {
      to: '/settings',
      label: 'Settings',
      icon: <Settings className="w-4 h-4" />
    }
  ];

  const filteredItems = navItems.filter((item) => {
    if (!item.roles) return true;
    return item.roles.includes(userRole);
  });

  return (
    <aside className="w-64 shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col justify-between min-h-[calc(100vh-57px)]">
      <div className="p-4 space-y-1">
        <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          Main Navigation
        </div>

        <nav className="space-y-1">
          {filteredItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <span className="shrink-0">{item.icon}</span>
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${item.badgeColor || 'bg-slate-800 text-slate-300'}`}>
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Institutional Context footer in sidebar */}
      {user && (
        <div className="p-4 m-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Active Organization</p>
          <p className="text-xs font-bold text-white mt-0.5 truncate">
            {user.institution_name || 'AICTE Approval Bureau'}
          </p>
          <p className="text-[10px] text-slate-400 truncate mt-0.5">{user.designation || user.role}</p>
        </div>
      )}
    </aside>
  );
};
