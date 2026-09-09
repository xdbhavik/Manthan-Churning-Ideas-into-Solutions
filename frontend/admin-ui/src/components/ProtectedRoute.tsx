import { Navigate, Outlet } from 'react-router-dom';
import { clearTokens, isAdmin, isAuthenticated } from '../lib/auth';

export default function ProtectedRoute() {
  if (!isAuthenticated()) {
    clearTokens();
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin()) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
