import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AppShell from './components/layout/AppShell';

import LoginPage from './pages/LoginPage';
import OtpPage from './pages/OtpPage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import UsersPage from './pages/UsersPage';
import RegistrationsPage from './pages/RegistrationsPage';
import ProblemsPage from './pages/ProblemsPage';
import EvaluationPage from './pages/EvaluationPage';
import AuditPage from './pages/AuditPage';

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public auth routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/verify-otp" element={<OtpPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/* Protected Admin routes inside AppShell */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/users" element={<UsersPage />} />
            <Route path="/registrations" element={<RegistrationsPage />} />
            <Route path="/problems" element={<ProblemsPage />} />
            <Route path="/evaluation" element={<EvaluationPage />} />
            <Route path="/audit" element={<AuditPage />} />
            <Route path="/" element={<Navigate to="/users" replace />} />
          </Route>
        </Route>

        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/users" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
