import ErrorBoundary from './components/ErrorBoundary';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import LoginPage from './pages/LoginPage';
import UnauthorizedPage from './pages/UnauthorizedPage';

// Evaluator
import DashboardPage from './pages/evaluator/DashboardPage';
import ProfilePage from './pages/evaluator/ProfilePage';
import CriteriaPage from './pages/evaluator/CriteriaPage';
import AssignmentsPage from './pages/evaluator/AssignmentsPage';
import ScoringPage from './pages/evaluator/ScoringPage';
import ProjectReviewsPage from './pages/evaluator/ProjectReviewsPage';
import ProjectReviewDetailPage from './pages/evaluator/ProjectReviewDetailPage';

// Admin
import EvaluationQueuePage from './pages/admin/EvaluationQueuePage';
import StartEvaluationPage from './pages/admin/StartEvaluationPage';
import EvaluatorOnboardingPage from './pages/admin/EvaluatorOnboardingPage';
import CycleDetailPage from './pages/admin/CycleDetailPage';
import CycleHistoryPage from './pages/admin/CycleHistoryPage';

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />
          
          {/* Evaluator Routes */}
          <Route element={<ProtectedRoute requiredRole="evaluator" />}>
            <Route element={<AppShell />}>
              <Route path="/evaluator/dashboard" element={<DashboardPage />} />
              <Route path="/evaluator/profile" element={<ProfilePage />} />
              <Route path="/evaluator/criteria" element={<CriteriaPage />} />
              <Route path="/evaluator/assignments" element={<AssignmentsPage />} />
              <Route path="/evaluator/project-reviews" element={<ProjectReviewsPage />} />
              <Route path="/evaluator/project-reviews/:reviewId" element={<ProjectReviewDetailPage />} />
            </Route>
            {/* Scoring page has top navigation and full width */}
            <Route path="/evaluator/assignments/:assignmentId" element={<ScoringPage />} />
          </Route>

          {/* Admin Routes */}
          <Route element={<ProtectedRoute requiredRole="admin" />}>
            <Route element={<AppShell />}>
              <Route path="/evaluation/queue" element={<EvaluationQueuePage />} />
              <Route path="/evaluation/cycles/:cycleId" element={<CycleDetailPage />} />
              <Route path="/evaluation/cycles/:cycleId/history" element={<CycleHistoryPage />} />
              <Route path="/evaluation/start" element={<StartEvaluationPage />} />
              <Route path="/evaluation/evaluator-onboarding" element={<EvaluatorOnboardingPage />} />
            </Route>
          </Route>

          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
