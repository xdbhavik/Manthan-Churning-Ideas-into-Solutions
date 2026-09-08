import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { getRole, getUserId } from '../../lib/auth';

interface NavItem {
  to: string;
  label: string;
  icon: string;
}

const EVALUATOR_NAV: NavItem[] = [
  { to: '/evaluator/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { to: '/evaluator/assignments', label: 'Work Queue', icon: 'assignment' },
  { to: '/evaluator/project-reviews', label: 'Project Reviews', icon: 'rate_review' },
  { to: '/evaluator/profile', label: 'My Profile', icon: 'account_circle' },
];

const ADMIN_NAV: NavItem[] = [
  { to: '/evaluation/queue', label: 'Evaluation Queue', icon: 'list_alt' },
  { to: '/evaluation/start', label: 'Start Evaluation', icon: 'play_circle' },
  { to: '/evaluation/evaluator-onboarding', label: 'Evaluator Onboarding', icon: 'person_add' },
];

export default function Sidebar() {
  const role = getRole();
  const userId = getUserId();
  const isEval = role === 'EVALUATOR';
  const navItems = isEval ? EVALUATOR_NAV : ADMIN_NAV;
  const roleLabel = role ?? 'UNKNOWN';
  const roleBadgeClass = isEval
    ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46]'
    : 'bg-[#EFF6FF] border-[#BFDBFE] text-[#1E40AF]';

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-white z-50 flex flex-col justify-between border-r border-[#E2E8F0]">
      <div className="flex flex-col">
        {/* Header */}
        <div className="h-16 px-4 flex items-center gap-2 border-b border-[#E2E8F0] bg-[#F8FAFC]">
          <span className="material-symbols-outlined text-[#0A2540] text-[20px]">verified_user</span>
          <div className="flex flex-col">
            <span className="font-semibold text-[12px] text-[#0A2540] uppercase tracking-wider">Evaluation Portal</span>
            <span className="font-mono-code text-[11px] text-[#64748B]">SIH26043</span>
          </div>
        </div>

        {/* Role scope */}
        <div className="p-4">
          <div className="text-[11px] font-bold text-[#64748B] uppercase mb-1 tracking-wider">Role Scope</div>
          <div className={'flex items-center justify-between p-1.5 px-2.5 rounded border ' + roleBadgeClass}>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-current opacity-70" />
              <span className="text-[12px] font-semibold">{roleLabel}</span>
            </div>
            <span className="material-symbols-outlined text-[16px]">lock</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-0.5 px-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                'flex items-center gap-2.5 px-3 py-2 text-left rounded text-[14px] transition-colors ' +
                (isActive
                  ? 'bg-[#F1F5F9] text-[#0A2540] font-semibold border-l-2 border-[#0A2540]'
                  : 'text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0b1c30]')
              }
            >
              <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex flex-col gap-1">
        <div className="flex items-center justify-between text-[#64748B] text-[11px] font-bold">
          <span className="font-mono-code truncate max-w-[120px]" title={userId ?? ''}>{userId ? userId.substring(0, 8) + '…' : '—'}</span>
          <span className="text-[#059669] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
            SECURE
          </span>
        </div>
        <div className="text-[12px] text-[#64748B]">SIH26043 Evaluation Service</div>
      </div>
    </aside>
  );
}
