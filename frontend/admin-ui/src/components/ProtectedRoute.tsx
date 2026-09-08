import { Navigate, Outlet } from 'react-router-dom';
import { getAccessToken, isAdmin } from '../lib/auth';

export default function ProtectedRoute() {
  const token = getAccessToken();
  if (!token) return <Navigate to="/login" replace />;
  if (!isAdmin()) return <Navigate to="/unauthorized" replace />;
  return <Outlet />;
}
