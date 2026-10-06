import { Link, useNavigate } from 'react-router-dom';
import { clearTokens, getPhone, getRole, getUserId } from '../../lib/auth';
import { logout } from '../../services/authService';
import { useEvaluatorNotifications } from '../../hooks/useEvaluatorNotifications';

export default function Header() {
  const navigate = useNavigate();
  const role = getRole();
  const phone = getPhone();
  const userId = getUserId();
  const { unreadCount } = useEvaluatorNotifications();

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
          </div>
        </div>
      </div>

      {/* User actions */}
      <div className="flex items-center gap-space-md">
        {role === 'EVALUATOR' && <Link to="/evaluator/notifications" aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`} title="Notifications" className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border-hairline text-text-secondary transition-colors hover:bg-surface-subtle hover:text-ashoka-blue">
          <span className="material-symbols-outlined text-[21px]">notifications</span>
          {unreadCount > 0 && <span className="absolute -right-1 -top-1 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white">{unreadCount > 99 ? '99+' : unreadCount}</span>}
        </Link>}
        {/* User Card */}
        <div className="flex items-center gap-space-sm">
          {(phone || userId) && <div className="text-right hidden sm:flex flex-col">
            {phone && <span className="font-label-md text-label-md text-text-primary font-bold">+91 {phone}</span>}
            {userId && <span className="font-mono-code text-[11px] text-text-muted">User {userId.substring(0, 8)}</span>}
          </div>}
          {role === 'EVALUATOR' ? (
            <Link to="/evaluator/profile" aria-label="Evaluator profile" title="Evaluator Profile" className="w-9 h-9 rounded-full bg-ashoka-blue hover:bg-institutional-navy flex items-center justify-center text-on-primary shadow-sm transition-colors">
              <span className="material-symbols-outlined text-[20px]">person</span>
            </Link>
          ) : (
            <div className="w-8 h-8 rounded-full bg-ashoka-blue flex items-center justify-center text-on-primary shadow-sm" aria-hidden="true">
              <span className="material-symbols-outlined text-[18px]">person</span>
            </div>
          )}
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
