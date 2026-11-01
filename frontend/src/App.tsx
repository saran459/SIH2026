import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { RoleRoute } from './components/auth/RoleRoute';

// Layouts
import { InstitutionLayout } from './components/layout/InstitutionLayout';
import { ReviewerLayout } from './components/layout/ReviewerLayout';
import { AdminLayout } from './components/layout/AdminLayout';

// Public & Auth Pages
import { LandingPage } from './pages/LandingPage';
import { InstitutionLoginPage } from './pages/auth/InstitutionLoginPage';
import { ReviewerLoginPage } from './pages/auth/ReviewerLoginPage';
import { AdminLoginPage } from './pages/auth/AdminLoginPage';
import { AccessDeniedPage } from './pages/AccessDeniedPage';

// Institution Portal Pages
import { InstitutionDashboardPage } from './pages/institution/InstitutionDashboardPage';
import { InstitutionApplicationsPage } from './pages/institution/InstitutionApplicationsPage';
import { InstitutionNewApplicationPage } from './pages/institution/InstitutionNewApplicationPage';
import { InstitutionApplicationDetailPage } from './pages/institution/InstitutionApplicationDetailPage';
import { InstitutionDocumentsPage } from './pages/institution/InstitutionDocumentsPage';
import { InstitutionCompliancePage } from './pages/institution/InstitutionCompliancePage';
import { InstitutionDigitalTwinPage } from './pages/institution/InstitutionDigitalTwinPage';
import { InstitutionAlertsPage } from './pages/institution/InstitutionAlertsPage';
import { InstitutionReportsPage } from './pages/institution/InstitutionReportsPage';
import { InstitutionProfilePage } from './pages/institution/InstitutionProfilePage';

// Reviewer Portal Pages
import { ReviewerDashboardPage } from './pages/reviewer/ReviewerDashboardPage';
import { ReviewerAssignedApplicationsPage } from './pages/reviewer/ReviewerAssignedApplicationsPage';
import { ReviewerQueuePage } from './pages/reviewer/ReviewerQueuePage';
import { ReviewerApplicationDetailPage } from './pages/reviewer/ReviewerApplicationDetailPage';
import { ReviewerCompliancePage } from './pages/reviewer/ReviewerCompliancePage';
import { ReviewerCorrectionRequestsPage } from './pages/reviewer/ReviewerCorrectionRequestsPage';
import { ReviewerDeadlinesPage } from './pages/reviewer/ReviewerDeadlinesPage';
import { ReviewerAlertsPage } from './pages/reviewer/ReviewerAlertsPage';
import { ReviewerReportsPage } from './pages/reviewer/ReviewerReportsPage';
import { ReviewerProfilePage } from './pages/reviewer/ReviewerProfilePage';

// Admin Portal Pages
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminInstitutionsPage } from './pages/admin/AdminInstitutionsPage';
import { AdminApplicationsPage } from './pages/admin/AdminApplicationsPage';
import { AdminReviewerAssignmentsPage } from './pages/admin/AdminReviewerAssignmentsPage';
import { AdminComplianceRulesPage } from './pages/admin/AdminComplianceRulesPage';
import { AdminNotificationSettingsPage } from './pages/admin/AdminNotificationSettingsPage';
import { AdminAuditTrailPage } from './pages/admin/AdminAuditTrailPage';
import { AdminReportsPage } from './pages/admin/AdminReportsPage';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage';
import { AdminProfilePage } from './pages/admin/AdminProfilePage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <Routes>
            {/* 1. Public Landing Page */}
            <Route path="/" element={<LandingPage />} />

            {/* 2. Dedicated Portal Login Pages */}
            <Route path="/institution/login" element={<InstitutionLoginPage />} />
            <Route path="/reviewer/login" element={<ReviewerLoginPage />} />
            <Route path="/admin/login" element={<AdminLoginPage />} />

            {/* Fallback Access Denied Route */}
            <Route path="/access-denied" element={<AccessDeniedPage />} />

            {/* 3. Institution Portal Routes */}
            <Route
              path="/institution/*"
              element={
                <RoleRoute allowedRole="institution">
                  <InstitutionLayout>
                    <Routes>
                      <Route path="dashboard" element={<InstitutionDashboardPage />} />
                      <Route path="applications" element={<InstitutionApplicationsPage />} />
                      <Route path="applications/new" element={<InstitutionNewApplicationPage />} />
                      <Route path="applications/:id" element={<InstitutionApplicationDetailPage />} />
                      <Route path="documents" element={<InstitutionDocumentsPage />} />
                      <Route path="compliance" element={<InstitutionCompliancePage />} />
                      <Route path="digital-twin" element={<InstitutionDigitalTwinPage />} />
                      <Route path="alerts" element={<InstitutionAlertsPage />} />
                      <Route path="reports" element={<InstitutionReportsPage />} />
                      <Route path="profile" element={<InstitutionProfilePage />} />
                      <Route path="" element={<Navigate to="dashboard" replace />} />
                      <Route path="*" element={<Navigate to="dashboard" replace />} />
                    </Routes>
                  </InstitutionLayout>
                </RoleRoute>
              }
            />

            {/* 4. Reviewer Portal Routes */}
            <Route
              path="/reviewer/*"
              element={
                <RoleRoute allowedRole="reviewer">
                  <ReviewerLayout>
                    <Routes>
                      <Route path="dashboard" element={<ReviewerDashboardPage />} />
                      <Route path="assigned-applications" element={<ReviewerAssignedApplicationsPage />} />
                      <Route path="review-queue" element={<ReviewerQueuePage />} />
                      <Route path="applications/:id" element={<ReviewerApplicationDetailPage />} />
                      <Route path="compliance" element={<ReviewerCompliancePage />} />
                      <Route path="correction-requests" element={<ReviewerCorrectionRequestsPage />} />
                      <Route path="deadlines" element={<ReviewerDeadlinesPage />} />
                      <Route path="alerts" element={<ReviewerAlertsPage />} />
                      <Route path="reports" element={<ReviewerReportsPage />} />
                      <Route path="profile" element={<ReviewerProfilePage />} />
                      <Route path="" element={<Navigate to="dashboard" replace />} />
                      <Route path="*" element={<Navigate to="dashboard" replace />} />
                    </Routes>
                  </ReviewerLayout>
                </RoleRoute>
              }
            />

            {/* 5. Administrator Portal Routes */}
            <Route
              path="/admin/*"
              element={
                <RoleRoute allowedRole="admin">
                  <AdminLayout>
                    <Routes>
                      <Route path="dashboard" element={<AdminDashboardPage />} />
                      <Route path="users" element={<AdminUsersPage />} />
                      <Route path="institutions" element={<AdminInstitutionsPage />} />
                      <Route path="applications" element={<AdminApplicationsPage />} />
                      <Route path="reviewer-assignments" element={<AdminReviewerAssignmentsPage />} />
                      <Route path="compliance-rules" element={<AdminComplianceRulesPage />} />
                      <Route path="notification-settings" element={<AdminNotificationSettingsPage />} />
                      <Route path="audit-trail" element={<AdminAuditTrailPage />} />
                      <Route path="reports" element={<AdminReportsPage />} />
                      <Route path="settings" element={<AdminSettingsPage />} />
                      <Route path="profile" element={<AdminProfilePage />} />
                      <Route path="" element={<Navigate to="dashboard" replace />} />
                      <Route path="*" element={<Navigate to="dashboard" replace />} />
                    </Routes>
                  </AdminLayout>
                </RoleRoute>
              }
            />

            {/* Global Unknown Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
