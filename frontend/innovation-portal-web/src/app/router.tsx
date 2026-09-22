import { createBrowserRouter, RouterProvider, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './providers/AuthProvider';
import MarketingLayout from '../layouts/MarketingLayout';
import AuthLayout from '../layouts/AuthLayout';
import AppLayout from '../layouts/AppLayout';
import { Suspense, lazy } from 'react';

const LandingPage = lazy(() => import('../pages/public/LandingPage'));
const ProblemExplorerPage = lazy(() => import('../pages/public/ProblemExplorerPage'));
const ProblemDetailPage = lazy(() => import('../pages/public/ProblemDetailPage'));
const LoginPage = lazy(() => import('../pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('../pages/auth/RegisterPage'));
const DashboardPage = lazy(() => import('../pages/app/DashboardPage'));
const MySubmissionsPage = lazy(() => import('../pages/app/MySubmissionsPage'));
const CreateSubmissionPage = lazy(() => import('../pages/app/CreateSubmissionPage'));
const SubmissionDetailPage = lazy(() => import('../pages/app/SubmissionDetailPage'));
const ProfilePage = lazy(() => import('../pages/app/ProfilePage'));
const AppProblemExplorerPage = lazy(() => import('../pages/app/ProblemExplorerPage'));
const AppProblemDetailPage = lazy(() => import('../pages/app/ProblemDetailPage'));
const TeamsPage = lazy(() => import('../pages/app/TeamsPage'));
const HelpPage = lazy(() => import('../pages/app/HelpPage'));
const SettingsPage = lazy(() => import('../pages/app/SettingsPage'));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'));

// A simple loading fallback for lazy-loaded routes
const PageLoader = () => (
  <div className="flex-1 min-h-[50vh] flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
  </div>
);

function RequireAuth() {
  const { authed } = useAuth();
  const location = useLocation();
  if (!authed) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }
  return <Outlet />;
}

const router = createBrowserRouter([
  {
    element: <MarketingLayout />,
    children: [
      { path: '/', element: <Suspense fallback={<PageLoader />}><LandingPage /></Suspense> },
      { path: '/problems', element: <Suspense fallback={<PageLoader />}><ProblemExplorerPage /></Suspense> },
      { path: '/problems/:problemId', element: <Suspense fallback={<PageLoader />}><ProblemDetailPage /></Suspense> },
    ],
  },
  { path: '/login', element: <AuthLayout />, children: [{ index: true, element: <Suspense fallback={<PageLoader />}><LoginPage /></Suspense> }] },
  {
    element: <RequireAuth />,
    children: [
      { path: '/register', element: <Suspense fallback={<PageLoader />}><RegisterPage /></Suspense> },
      {
        path: '/app',
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to="dashboard" replace /> },
          { path: 'dashboard', element: <Suspense fallback={<PageLoader />}><DashboardPage /></Suspense> },
          { path: 'problems', element: <Suspense fallback={<PageLoader />}><AppProblemExplorerPage /></Suspense> },
          { path: 'problems/:problemId', element: <Suspense fallback={<PageLoader />}><AppProblemDetailPage /></Suspense> },
          { path: 'submissions', element: <Suspense fallback={<PageLoader />}><MySubmissionsPage /></Suspense> },
          { path: 'submissions/new', element: <Suspense fallback={<PageLoader />}><CreateSubmissionPage /></Suspense> },
          { path: 'submissions/:submissionId', element: <Suspense fallback={<PageLoader />}><SubmissionDetailPage /></Suspense> },
          { path: 'profile', element: <Suspense fallback={<PageLoader />}><ProfilePage /></Suspense> },
          { path: 'teams', element: <Suspense fallback={<PageLoader />}><TeamsPage /></Suspense> },
          { path: 'help', element: <Suspense fallback={<PageLoader />}><HelpPage /></Suspense> },
          { path: 'settings', element: <Suspense fallback={<PageLoader />}><SettingsPage /></Suspense> },
        ],
      },
    ],
  },
  { path: '*', element: <Suspense fallback={<PageLoader />}><NotFoundPage /></Suspense> },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
