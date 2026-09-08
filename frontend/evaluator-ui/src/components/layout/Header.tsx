import { useNavigate } from 'react-router-dom';
import { clearTokens, getPhone, getRole } from '../../lib/auth';
import { logout } from '../../services/authService';

export default function Header() {
  const navigate = useNavigate();
  const role = getRole();
  const phone = getPhone();

  const handleLogout = async () => {
    await logout();
    clearTokens();
    navigate('/login');
  };

  const roleBadgeClass = role === 'EVALUATOR'
    ? 'bg-[#F5F3FF] text-[#5B21B6] border-[#DDD6FE]'
    : 'bg-[#EFF6FF] text-[#1E40AF] border-[#BFDBFE]';

  return (
    <header className="fixed top-0 left-64 right-0 h-16 bg-white border-b border-[#E2E8F0] z-40 px-6 flex items-center justify-between shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[16px] text-[#0A2540] tracking-tight">SIH26043 Evaluation Service</span>
          <span className="font-mono-code text-[11px] px-2 py-0.5 rounded bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0] uppercase tracking-wider">
            v1.0 · PROD
          </span>
        </div>
      </div>

      {/* User bar */}
      <div className="flex items-center gap-3">
        {phone && (
          <span className="text-[12px] text-[#64748B] hidden sm:block font-mono-code">{phone}</span>
        )}
        {role && (
          <span className={'px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ' + roleBadgeClass}>
            {role}
          </span>
        )}
        <button
          type="button"
          onClick={handleLogout}
          className="p-1 rounded text-[#64748B] hover:text-[#be123c] hover:bg-[#ffdad6]/40 transition-colors"
          title="Logout"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
        </button>
      </div>
    </header>
  );
}
