import { Link, Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="max-w-[500px] w-full mx-auto px-4 py-10 flex-1 flex flex-col justify-center">
        <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm text-muted hover:text-body">
          <span className="material-symbols-outlined text-base">arrow_back</span> Back to Portal Home
        </Link>
        <Outlet />
      </div>
    </div>
  );
}
