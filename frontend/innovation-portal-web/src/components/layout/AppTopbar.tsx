import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../app/providers/AuthProvider';
import { useQuery } from '@tanstack/react-query';
import * as portal from '../../services/portalService';

function initials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join('') || 'U'
  );
}

export function AppTopbar({
  displayName,
  onOpenSidebar,
}: {
  displayName: string;
  onOpenSidebar: () => void;
}) {
  const { logout } = useAuth();
  const { data: invitations = [] } = useQuery({ queryKey: ['portal', 'team-invitations'], queryFn: portal.getTeamInvitations, refetchInterval: 30000 });
  const pendingInvitations = invitations.filter((item) => item.direction === 'RECEIVED' && item.status === 'PENDING').length;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  const toggleDarkMode = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark');
      setIsDark(false);
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.classList.add('dark');
      setIsDark(true);
      localStorage.setItem('theme', 'dark');
    }
  };

  useEffect(() => {
    if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
      setIsDark(true);
    } else {
      document.documentElement.classList.remove('dark');
      setIsDark(false);
    }
  }, []);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const focusSearch = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      document.getElementById('app-search')?.focus();
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', focusSearch);
    return () => window.removeEventListener('keydown', focusSearch);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-surface-card/90 backdrop-blur border-b border-border-subtle tricolor-border-bottom">
      <div className="h-16 px-4 sm:px-6 flex items-center gap-3">
        <button
          className="lg:hidden p-2 rounded-lg hover:bg-surface-container"
          onClick={onOpenSidebar}
          aria-label="Open menu"
        >
          <span className="material-symbols-outlined text-on-surface">menu</span>
        </button>

        <div className="flex-1 max-w-md">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant-weak text-[18px]">
              search
            </span>
            <input
              id="app-search"
              placeholder="Search submissions… (⌘K)"
              className="w-full pl-9 pr-8 py-2 rounded-lg bg-surface border border-border-subtle text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-on-surface"
            />
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-0.5 rounded border border-border-subtle bg-surface-card px-1.5 py-0.5 text-[10px] font-mono text-on-surface-variant-weak">
              ⌘K
            </kbd>
          </div>
        </div>

        <button
          onClick={toggleDarkMode}
          title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          className="p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors ml-auto"
        >
          <span className="material-symbols-outlined text-[22px]">
            {isDark ? 'light_mode' : 'dark_mode'}
          </span>
        </button>

        <Link
          to="/app/profile"
          title="Profile"
          className="p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
        >
          <span className="material-symbols-outlined text-[22px]">person</span>
        </Link>

        <Link
          to="/app/settings"
          title="Settings"
          className="p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
        >
          <span className="material-symbols-outlined text-[22px]">settings</span>
        </Link>

        <Link to="/app/teams" title={pendingInvitations ? `${pendingInvitations} pending team invitation(s)` : 'Team invitations'} className="relative p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container hidden sm:block">
          <span className="material-symbols-outlined text-[22px]">notifications</span>
          {pendingInvitations > 0 && <span className="absolute right-0 top-0 min-w-4 rounded-full bg-error px-1 text-center text-[10px] font-bold leading-4 text-white">{pendingInvitations}</span>}
        </Link>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="w-9 h-9 rounded-full bg-primary text-on-primary text-sm font-bold flex items-center justify-center transition-transform hover:scale-105"
            aria-label="Account menu"
          >
            {initials(displayName)}
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-48 rounded-xl bg-surface-card border border-border-subtle shadow-level-2 py-1">
              <div className="px-3 py-2 border-b border-border-subtle">
                <div className="text-sm font-semibold text-on-surface truncate">{displayName}</div>
                <div className="text-xs text-on-surface-variant-weak">Participant</div>
              </div>
              <Link
                to="/app/profile"
                onClick={() => setMenuOpen(false)}
                className="block px-3 py-2 text-sm text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
              >
                Profile
              </Link>
              <Link
                to="/app/settings"
                onClick={() => setMenuOpen(false)}
                className="block px-3 py-2 text-sm text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
              >
                Settings
              </Link>
              <button
                onClick={logout}
                className="block w-full text-left px-3 py-2 text-sm text-state-returned-text hover:bg-state-returned-bg transition-colors"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
