import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { RoleRoute } from './components/auth/RoleRoute';

// Layout
import { InstitutionLayout } from './components/layout/InstitutionLayout';

// Pages
import { LoginPage } from './pages/LoginPage';
import { AccessDeniedPage } from './pages/AccessDeniedPage';
import { InstitutionDashboardPage } from './pages/InstitutionDashboardPage';
import { InstitutionApplicationsPage } from './pages/InstitutionApplicationsPage';
import { InstitutionNewApplicationPage } from './pages/InstitutionNewApplicationPage';
import { InstitutionApplicationDetailPage } from './pages/InstitutionApplicationDetailPage';
import { InstitutionDocumentsPage } from './pages/InstitutionDocumentsPage';
import { InstitutionCompliancePage } from './pages/InstitutionCompliancePage';
import { InstitutionDigitalTwinPage } from './pages/InstitutionDigitalTwinPage';
import { InstitutionAlertsPage } from './pages/InstitutionAlertsPage';
import { InstitutionReportsPage } from './pages/InstitutionReportsPage';
import { InstitutionProfilePage } from './pages/InstitutionProfilePage';
import { HelpPage } from './pages/HelpPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <Routes>
            {/* Dedicated Institution Login */}
            <Route path="/login" element={<LoginPage initialMode="login" />} />
            <Route path="/register" element={<LoginPage initialMode="register" />} />
            <Route path="/institution/register" element={<LoginPage initialMode="register" />} />
            <Route path="/institution/login" element={<LoginPage />} />
            <Route path="/institution" element={<Navigate to="/login" replace />} />
            <Route path="/access-denied" element={<AccessDeniedPage />} />

            {/* Protected Institutional Routes */}
            <Route
              path="/*"
              element={
                <RoleRoute allowedRole="institution">
                  <InstitutionLayout>
                    <Routes>
                      <Route path="dashboard" element={<InstitutionDashboardPage />} />
                      <Route path="institution/dashboard" element={<InstitutionDashboardPage />} />
                      <Route path="applications" element={<InstitutionApplicationsPage />} />
                      <Route path="institution/applications" element={<InstitutionApplicationsPage />} />
                      <Route path="applications/new" element={<InstitutionNewApplicationPage />} />
                      <Route path="institution/applications/new" element={<InstitutionNewApplicationPage />} />
                      <Route path="applications/:id" element={<InstitutionApplicationDetailPage />} />
                      <Route path="institution/applications/:id" element={<InstitutionApplicationDetailPage />} />
                      <Route path="documents" element={<InstitutionDocumentsPage />} />
                      <Route path="institution/documents" element={<InstitutionDocumentsPage />} />
                      <Route path="compliance" element={<InstitutionCompliancePage />} />
                      <Route path="institution/compliance" element={<InstitutionCompliancePage />} />
                      <Route path="digital-twin" element={<InstitutionDigitalTwinPage />} />
                      <Route path="institution/digital-twin" element={<InstitutionDigitalTwinPage />} />
                      <Route path="alerts" element={<InstitutionAlertsPage />} />
                      <Route path="institution/alerts" element={<InstitutionAlertsPage />} />
                      <Route path="reports" element={<InstitutionReportsPage />} />
                      <Route path="institution/reports" element={<InstitutionReportsPage />} />
                      <Route path="profile" element={<InstitutionProfilePage />} />
                      <Route path="institution/profile" element={<InstitutionProfilePage />} />
                      <Route path="help" element={<HelpPage />} />
                      <Route path="institution/help" element={<HelpPage />} />
                      <Route path="" element={<Navigate to="dashboard" replace />} />
                      <Route path="*" element={<Navigate to="dashboard" replace />} />
                    </Routes>
                  </InstitutionLayout>
                </RoleRoute>
              }
            />
          </Routes>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
