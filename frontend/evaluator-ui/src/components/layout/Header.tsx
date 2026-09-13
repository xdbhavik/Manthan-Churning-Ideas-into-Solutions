import { useNavigate } from 'react-router-dom';
import { clearTokens, getPhone, getRole, getUserId } from '../../lib/auth';
import { logout } from '../../services/authService';

export default function Header() {
  const navigate = useNavigate();
  const role = getRole();
  const phone = getPhone();
  const userId = getUserId();

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // ignore
    }
    clearTokens();
    navigate('/login');
  };

  return (
    <header className="fixed top-0 left-64 right-0 h-16 bg-surface-crisp border-b border-border-hairline z-40 px-space-lg flex items-center justify-between shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      {/* Brand & Title */}
      <div className="flex items-center gap-space-md">
        <div className="flex items-center gap-space-sm">
          <div className="w-8 h-8 rounded bg-ashoka-blue text-on-primary flex items-center justify-center font-bold text-sm shadow-sm">
            IE
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-space-sm">
            <span className="font-headline-sm text-headline-sm text-ashoka-blue tracking-tight">
              National Evaluation Service
            </span>
            <span className="font-mono-code text-[11px] px-space-xs py-0.5 rounded bg-surface-muted text-text-secondary border border-border-hairline uppercase tracking-wider">
              OFFICIAL // SECURE
            </span>
          </div>
        </div>
      </div>

      {/* Cross-Service Role Navigation & User Info */}
      <div className="flex items-center gap-space-md">
        <nav className="hidden xl:flex items-center bg-surface-muted p-space-2xs rounded border border-border-hairline">
          <a
            href="http://localhost:3002"
            target="_blank"
            rel="noreferrer"
            className="px-space-sm py-1 rounded text-text-secondary hover:text-ashoka-blue font-label-md text-label-md transition-colors"
          >
            Submitter
          </a>
          <a
            href="http://localhost:3000"
            target="_blank"
            rel="noreferrer"
            className="px-space-sm py-1 rounded text-text-secondary hover:text-ashoka-blue font-label-md text-label-md transition-colors"
          >
            Reviewer
          </a>
          <span className="px-space-sm py-1 rounded bg-ashoka-blue text-on-primary font-bold text-label-md shadow-xs">
            Evaluator
          </span>
          <a
            href="http://localhost:3000"
            target="_blank"
            rel="noreferrer"
            className="px-space-sm py-1 rounded text-text-secondary hover:text-ashoka-blue font-label-md text-label-md transition-colors"
          >
            Admin
          </a>
        </nav>

        <div className="h-6 w-px bg-border-hairline hidden sm:block"></div>

        {/* User Card */}
        <div className="flex items-center gap-space-sm">
          <div className="text-right hidden sm:flex flex-col">
            <span className="font-label-md text-label-md text-text-primary font-bold">
              {phone ? `+91 ${phone}` : 'Dr. Aris Thorne'}
            </span>
            <span className="font-mono-code text-[11px] text-text-muted">
              {userId ? `EVAL-${userId.substring(0, 6)}` : 'EVAL-7729'}
            </span>
          </div>
          <span className="px-2 py-0.5 rounded-full font-label-sm text-label-sm bg-status-review-bg text-status-review-text border border-status-review-border uppercase tracking-wider font-bold">
            {role ?? 'EVALUATOR'}
          </span>
          <div className="w-8 h-8 rounded-full bg-ashoka-blue flex items-center justify-center text-on-primary shadow-sm">
            <span className="material-symbols-outlined text-[18px]">person</span>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="p-space-xs rounded text-text-muted hover:text-error hover:bg-error-container/40 transition-colors ml-space-2xs cursor-pointer"
            title="Logout"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
