import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { isAuthenticated, isEvaluator, isAdmin } from '../lib/auth';

interface ProtectedRouteProps {
  requiredRole?: 'evaluator' | 'admin';
}

export default function ProtectedRoute({ requiredRole }: ProtectedRouteProps) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  if (requiredRole === 'evaluator' && !isEvaluator()) {
    return <Navigate to="/unauthorized" replace />;
  }
  if (requiredRole === 'admin' && !isAdmin()) {
    return <Navigate to="/unauthorized" replace />;
  }
  return <Outlet />;
}
