import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { RoleRoute } from './components/auth/RoleRoute';

// Layout
import { ReviewerLayout } from './components/layout/ReviewerLayout';

// Pages
import { LoginPage } from './pages/LoginPage';
import { AccessDeniedPage } from './pages/AccessDeniedPage';
import { ReviewerDashboardPage } from './pages/ReviewerDashboardPage';
import { ReviewerAssignedApplicationsPage } from './pages/ReviewerAssignedApplicationsPage';
import { ReviewerQueuePage } from './pages/ReviewerQueuePage';
import { ReviewerApplicationDetailPage } from './pages/ReviewerApplicationDetailPage';
import { ReviewerCompliancePage } from './pages/ReviewerCompliancePage';
import { ReviewerComparisonPage } from './pages/ReviewerComparisonPage';
import { ReviewerCorrectionRequestsPage } from './pages/ReviewerCorrectionRequestsPage';
import { ReviewerDeadlinesPage } from './pages/ReviewerDeadlinesPage';
import { ReviewerAlertsPage } from './pages/ReviewerAlertsPage';
import { ReviewerReportsPage } from './pages/ReviewerReportsPage';
import { ReviewerAuditHistoryPage } from './pages/ReviewerAuditHistoryPage';
import { ReviewerProfilePage } from './pages/ReviewerProfilePage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <Routes>
            {/* Dedicated Reviewer Login */}
            <Route path="/login" element={<LoginPage initialMode="login" />} />
            <Route path="/register" element={<LoginPage initialMode="register" />} />
            <Route path="/reviewer/register" element={<LoginPage initialMode="register" />} />
            <Route path="/reviewer/login" element={<LoginPage />} />
            <Route path="/reviewer" element={<Navigate to="/login" replace />} />
            <Route path="/access-denied" element={<AccessDeniedPage />} />

            {/* Protected Reviewer Routes */}
            <Route
              path="/*"
              element={
                <RoleRoute allowedRole="reviewer">
                  <ReviewerLayout>
                    <Routes>
                      <Route path="dashboard" element={<ReviewerDashboardPage />} />
                      <Route path="reviewer/dashboard" element={<ReviewerDashboardPage />} />
                      <Route path="assigned-applications" element={<ReviewerAssignedApplicationsPage />} />
                      <Route path="reviewer/assigned-applications" element={<ReviewerAssignedApplicationsPage />} />
                      <Route path="review-queue" element={<ReviewerQueuePage />} />
                      <Route path="reviewer/review-queue" element={<ReviewerQueuePage />} />
                      <Route path="applications/:id" element={<ReviewerApplicationDetailPage />} />
                      <Route path="reviewer/applications/:id" element={<ReviewerApplicationDetailPage />} />
                      <Route path="compliance" element={<ReviewerCompliancePage />} />
                      <Route path="reviewer/compliance" element={<ReviewerCompliancePage />} />
                      <Route path="comparison" element={<ReviewerComparisonPage />} />
                      <Route path="reviewer/comparison" element={<ReviewerComparisonPage />} />
                      <Route path="correction-requests" element={<ReviewerCorrectionRequestsPage />} />
                      <Route path="reviewer/correction-requests" element={<ReviewerCorrectionRequestsPage />} />
                      <Route path="deadlines" element={<ReviewerDeadlinesPage />} />
                      <Route path="reviewer/deadlines" element={<ReviewerDeadlinesPage />} />
                      <Route path="alerts" element={<ReviewerAlertsPage />} />
                      <Route path="reviewer/alerts" element={<ReviewerAlertsPage />} />
                      <Route path="reports" element={<ReviewerReportsPage />} />
                      <Route path="reviewer/reports" element={<ReviewerReportsPage />} />
                      <Route path="audit-history" element={<ReviewerAuditHistoryPage />} />
                      <Route path="reviewer/audit-history" element={<ReviewerAuditHistoryPage />} />
                      <Route path="profile" element={<ReviewerProfilePage />} />
                      <Route path="reviewer/profile" element={<ReviewerProfilePage />} />
                      <Route path="" element={<Navigate to="dashboard" replace />} />
                      <Route path="*" element={<Navigate to="dashboard" replace />} />
                    </Routes>
                  </ReviewerLayout>
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
