import { Link, Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../app/providers/AuthProvider';

export default function AuthLayout() {
  const { authed } = useAuth();
  const location = useLocation();

  if (authed) {
    const from = location.state?.from?.pathname || '/app/dashboard';
    return <Navigate to={from} replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="max-w-[500px] w-full mx-auto px-4 py-10 flex-1 flex flex-col justify-center">
        <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm text-on-surface-variant hover:text-on-surface">
          <span className="material-symbols-outlined text-base">arrow_back</span> Back to Portal Home
        </Link>
        <Outlet />
      </div>
    </div>
  );
}
