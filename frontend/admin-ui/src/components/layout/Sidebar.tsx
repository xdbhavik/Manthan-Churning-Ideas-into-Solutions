import { NavLink, useNavigate } from 'react-router-dom';
import { clearTokens, getRefreshToken } from '../../lib/auth';
import { logout as logoutApi } from '../../services/authService';

const navItems = [
  { to: '/users', icon: 'group', label: 'Users', adminOnly: true },
  { to: '/registrations', icon: 'assignment', label: 'Registrations' },
  { to: '/problems', icon: 'bug_report', label: 'Problems' },
  { to: '/evaluation', icon: 'science', label: 'Evaluation' },
  { to: '/audit', icon: 'history', label: 'Audit Log' },
];

export default function Sidebar() {
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      const rt = getRefreshToken();
      if (rt) await logoutApi(rt);
    } catch {
      // ignore — we clear tokens regardless
    } finally {
      clearTokens();
      navigate('/login');
    }
  }

  return (
    <aside className="portal-sidebar flex flex-col w-60 min-h-screen bg-[#f1f3f5] border-r border-slate-200 flex-shrink-0 relative page-enter">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#dfe8ef]" aria-hidden="true" />

      <div className="sidebar-brand flex items-center gap-space-md px-space-lg pt-space-xl pb-space-lg border-b border-slate-200">
        <div className="flex items-center justify-center w-8 h-8 rounded bg-[#e7f3eb] border border-emerald-200 flex-shrink-0" aria-hidden="true">
          <span className="material-symbols-outlined text-emerald-700 text-[18px] filled">assured_workload</span>
        </div>
        <div className="sidebar-copy flex flex-col min-w-0">
          <span className="font-label-lg text-label-lg text-[#1f2d3a] leading-tight tracking-tight">SIH26043</span>
          <span className="font-label-sm text-label-sm text-slate-500 uppercase tracking-label text-[10px]">
            Admin Panel
          </span>
        </div>
      </div>

      <div className="px-space-lg pt-space-lg pb-space-xs">
        <span className="sidebar-label font-label-sm text-label-sm text-slate-500 uppercase tracking-label text-[10px]">
          Navigation
        </span>
      </div>

      <nav className="flex flex-col gap-space-2xs px-space-md pb-space-lg flex-1" aria-label="Admin navigation">
        {navItems.map(({ to, icon, label, adminOnly }) => (
          <NavLink
            key={to}
            to={to}
            id={`nav-${label.toLowerCase().replace(/\s+/g, '-')}`}
            className={({ isActive }) =>
              `sidebar-nav-link flex items-center gap-space-md px-space-md h-10 rounded font-label-lg text-label-lg transition-standard pressable focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-300 ${
                isActive
                  ? 'bg-white text-[#1f2d3a] border border-slate-200 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-[#1f2d3a]'
              }`
            }
            aria-current={undefined}
            aria-label={label}
          >
            <span className="material-symbols-outlined text-[18px] flex-shrink-0" aria-hidden="true">{icon}</span>
            <span className="truncate">{label}</span>
            {adminOnly && (
              <span
                className="sidebar-admin ml-auto font-label-sm text-[10px] text-emerald-700 tracking-label uppercase"
                aria-label="Admin only"
              >
                ADMIN
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mx-space-md border-t border-slate-200 mb-space-md" aria-hidden="true" />

      <div className="px-space-md pb-space-xl">
        <button
          id="sidebar-logout-btn"
          type="button"
          onClick={handleLogout}
          className="sidebar-logout flex items-center gap-space-md w-full px-space-md h-10 rounded font-label-lg text-label-lg text-slate-600 hover:bg-slate-100 hover:text-[#1f2d3a] transition-standard pressable cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-300"
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">logout</span>
          <span className="sidebar-logout-label">Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
