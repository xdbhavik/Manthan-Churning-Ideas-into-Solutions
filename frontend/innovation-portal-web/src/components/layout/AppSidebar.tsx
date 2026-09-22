import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';

export interface AppNavItem {
  to: string;
  label: string;
  icon: string;
  disabled?: boolean;
}

export const APP_NAV_ITEMS: AppNavItem[] = [
  { to: '/app/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { to: '/app/problems', label: 'Explore Problems', icon: 'explore' },
  { to: '/app/submissions', label: 'My Submissions', icon: 'folder_open' },
  { to: '/app/teams', label: 'Teams', icon: 'groups' },
  { to: '/app/help', label: 'Help', icon: 'help' },
];

interface AppSidebarProps {
  onNavigate?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function AppSidebar({ onNavigate, isCollapsed, onToggleCollapse }: AppSidebarProps) {
  return (
    <nav className="flex flex-col h-full bg-surface-card border-r border-border-subtle relative">
      <div className="px-3 py-2 space-y-1 flex-1 overflow-y-auto">
        {APP_NAV_ITEMS.map((item) =>
          item.disabled ? (
            <div
              key={item.label}
              title="Not available in this release"
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold text-on-surface-variant-weak cursor-not-allowed select-none ${isCollapsed ? 'justify-center' : ''}`}
            >
              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              {!isCollapsed && <span>{item.label}</span>}
            </div>
          ) : (
            <NavLink
              key={item.label}
              to={item.to}
              onClick={onNavigate}
              title={isCollapsed ? item.label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold text-body-md transition-all duration-200 overflow-hidden ${
                  isCollapsed ? 'justify-center' : ''
                } ${
                  isActive
                    ? 'text-primary bg-primary-container'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
                }`
              }
            >
              <span className="material-symbols-outlined text-[20px] shrink-0">{item.icon}</span>
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          )
        )}
      </div>

      {onToggleCollapse && (
        <div className="p-3 border-t border-border-subtle">
          <button
            onClick={onToggleCollapse}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-all duration-200 justify-center`}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <span className="material-symbols-outlined text-[20px]">
              {isCollapsed ? 'keyboard_double_arrow_right' : 'keyboard_double_arrow_left'}
            </span>
          </button>
        </div>
      )}
    </nav>
  );
}