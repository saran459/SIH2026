import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { AccessDeniedPage } from '../../pages/AccessDeniedPage';

interface RoleRouteProps {
  children: React.ReactNode;
  allowedRole: 'institution' | 'reviewer' | 'admin';
}

export const RoleRoute: React.FC<RoleRouteProps> = ({ children, allowedRole }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-300">Validating Statutory Permissions...</p>
        </div>
      </div>
    );
  }

  // Not logged in -> redirect to login for this specific portal
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Logged in with wrong role -> display dedicated Access Denied page
  if (user.role !== allowedRole) {
    return <AccessDeniedPage attemptedPortal={allowedRole} currentRole={user.role} />;
  }

  // Authorized
  return <>{children}</>;
};
