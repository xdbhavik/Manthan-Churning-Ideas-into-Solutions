import { NavLink } from 'react-router-dom';
import { getRole, getUserId, getPhone } from '../../lib/auth';

interface NavItem {
  to: string;
  label: string;
  icon: string;
  badge?: string;
}

const EVALUATOR_NAV: NavItem[] = [
  { to: '/evaluator/dashboard', label: 'Evaluation Desk', icon: 'dashboard' },
  { to: '/evaluator/profile', label: 'Evaluator Profile', icon: 'badge' },
  { to: '/evaluator/criteria', label: 'Criteria Matrix', icon: 'fact_check' },
  { to: '/evaluator/assignments', label: 'Assigned Dossiers', icon: 'assignment', badge: 'Active' },
  { to: '/evaluator/project-reviews', label: 'Project Reviews', icon: 'rate_review' },
];

const ADMIN_NAV: NavItem[] = [
  { to: '/evaluation/queue', label: 'Evaluation Queue', icon: 'list_alt' },
  { to: '/evaluation/start', label: 'Start Evaluation', icon: 'play_circle' },
  { to: '/evaluation/evaluator-onboarding', label: 'Evaluator Onboarding', icon: 'person_add' },
];

export default function Sidebar() {
  const role = getRole();
  const userId = getUserId();
  const phone = getPhone();
  const isEval = role === 'EVALUATOR';
  const navItems = isEval ? EVALUATOR_NAV : ADMIN_NAV;
  const roleLabel = role ?? 'EVALUATOR';

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-surface-crisp z-50 flex flex-col justify-between border-r border-border-hairline">
      <div className="flex flex-col">
        {/* Desk Header */}
        <div className="h-16 px-space-base flex items-center gap-space-sm border-b border-border-hairline bg-surface-subtle">
          <span className="material-symbols-outlined text-ashoka-blue text-[22px]">verified_user</span>
          <div className="flex flex-col">
            <span className="font-label-md text-label-md text-ashoka-blue uppercase tracking-wider font-bold">
              Evaluation Desk
            </span>
            <span className="font-mono-code text-[11px] text-text-muted">
              {userId ? `ID: EVAL-${userId.substring(0, 6)}` : 'ID: EVAL-7729'}
            </span>
          </div>
        </div>

        {/* Role Scope */}
        <div className="p-space-base">
          <div className="font-label-sm text-label-sm text-text-muted uppercase mb-space-xs tracking-wider font-bold">
            Role Scope
          </div>
          <div className="flex items-center justify-between p-space-xs px-space-sm bg-status-approved-bg rounded border border-status-approved-border">
            <div className="flex items-center gap-space-xs">
              <span className="w-2 h-2 rounded-full bg-gov-emerald"></span>
              <span className="font-label-md text-label-md text-status-approved-text font-bold">
                {roleLabel}
              </span>
            </div>
            <span className="material-symbols-outlined text-status-approved-text text-[16px]">lock</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-space-2xs px-space-sm">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                'flex items-center justify-between px-space-sm py-2 rounded text-label-lg transition-colors ' +
                (isActive
                  ? 'bg-surface-muted text-ashoka-blue font-bold border-l-4 border-ashoka-blue pl-2.5'
                  : 'text-text-secondary hover:bg-surface-subtle hover:text-ashoka-blue')
              }
            >
              <div className="flex items-center gap-space-sm">
                <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="px-1.5 py-0.5 rounded-full bg-surface-container font-mono-code text-[10px] text-ashoka-blue font-bold">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Footer */}
      <div className="p-space-base border-t border-border-hairline bg-surface-subtle flex flex-col gap-space-xs">
        <div className="flex items-center justify-between text-text-muted font-label-sm text-label-sm">
          <span className="font-mono-code text-[11px] truncate max-w-[130px]" title={phone || userId || 'NODE-IN-BLR-01'}>
            {phone ? `+91 ${phone}` : 'NODE-IN-BLR-01'}
          </span>
          <span className="text-gov-emerald flex items-center gap-1 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-gov-emerald"></span>
            SECURE
          </span>
        </div>
        <div className="font-body-sm text-body-sm text-text-muted text-[11px]">
          National Statutory Evaluation Engine
        </div>
      </div>
    </aside>
  );
}
