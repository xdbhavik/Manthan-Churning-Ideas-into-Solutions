// ============================================================
// App Router & Shared Utilities
// ============================================================

// Ashoka emblem SVG (shared across header + login screens)
const ASHOKA_EMBLEM = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" class="w-7 h-7" fill="none">
  <circle cx="24" cy="24" r="22" fill="#0A2540" stroke="#E2E8F0" stroke-width="1.5"/>
  <circle cx="24" cy="24" r="16" fill="#F8FAFC" stroke="#0A2540" stroke-width="1"/>
  <circle cx="24" cy="24" r="11" stroke="#1E3A8A" stroke-width="1.2" fill="none"/>
  <circle cx="24" cy="24" r="3" fill="#1E3A8A"/>
  <line x1="24" y1="13" x2="24" y2="35" stroke="#1E3A8A" stroke-width="1"/>
  <line x1="13" y1="24" x2="35" y2="24" stroke="#1E3A8A" stroke-width="1"/>
  <line x1="16" y1="16" x2="32" y2="32" stroke="#1E3A8A" stroke-width="1"/>
  <line x1="16" y1="32" x2="32" y2="16" stroke="#1E3A8A" stroke-width="1"/>
</svg>`;

import {
  getAccessToken,
  getStoredUser,
  isAuthenticated,
  logout as apiLogout,
  decodeJwtPayload,
} from './api.js';

// ----- State -----
const state = {
  authenticated: false,
  user: null,
  currentPage: 'login',
};

// ----- Page Registry -----
const pages = {};

export function registerPage(name, renderFn) {
  pages[name] = renderFn;
}

// ----- Navigation -----
export function navigate(page) {
  window.location.hash = `#/${page}`;
}

export function getState() {
  return state;
}

export function setState(updates) {
  Object.assign(state, updates);
  renderApp();
}

export function restoreSession() {
  if (isAuthenticated()) {
    const token = getAccessToken();
    const payload = decodeJwtPayload(token);
    const stored = getStoredUser();
    const role = (stored?.role || payload?.role || 'ADMIN').toUpperCase();
    state.authenticated = true;
    state.user = {
      name: stored?.name || (stored?.email ? stored.email.split('@')[0].toUpperCase() : (role === 'ADMIN' ? 'Sovereign Administrator' : 'KYC Agent')),
      email: stored?.email || payload?.sub || 'admin@sih26043.gov.in',
      role: role,
      phone: stored?.phone || payload?.phone || '',
    };
  } else {
    state.authenticated = false;
    state.user = null;
  }
}

export async function logout() {
  await apiLogout();
  state.authenticated = false;
  state.user = null;
  navigate('login');
}

export function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none max-w-sm w-full px-4';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `pointer-events-auto p-3.5 rounded-xl shadow-lg border text-xs flex items-start gap-2.5 transition-all transform duration-200 ${
    type === 'success'
      ? 'bg-status-approved-bg border-status-approved-border text-status-approved-text'
      : type === 'error'
      ? 'bg-red-50 border-red-200 text-red-700'
      : 'bg-surface-crisp border-border-hairline text-text-primary'
  }`;
  const icon = type === 'success' ? 'check_circle' : type === 'error' ? 'error' : 'info';
  toast.innerHTML = `
    <span class="material-symbols-outlined text-[18px] shrink-0 mt-0.5">${icon}</span>
    <div class="flex-1 font-medium leading-relaxed">${message}</div>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ----- Shared Layout Components -----
function renderHeader() {
  if (!state.user) return '';
  const nameStr = state.user?.name || (state.user?.role === 'ADMIN' ? 'Sovereign Administrator' : 'Admin');
  const initials = nameStr.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'AD';
  return `
    <header class="fixed top-1 left-0 right-0 z-40 bg-surface-crisp shadow-sm border-b border-border-hairline h-16">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
        <div class="flex items-center gap-3 cursor-pointer" onclick="window.adminApp.navigate('registrations')">
          <!-- Ashoka Emblem -->
          <div class="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-lg bg-surface-container-low shadow-sm border border-border-hairline/60">
            ${ASHOKA_EMBLEM}
          </div>
          <div class="flex flex-col">
            <div class="flex items-center gap-2">
              <span class="font-bold text-ashoka-blue tracking-tight text-base sm:text-lg leading-tight">SIH26043 Admin Panel</span>
              <span class="text-[11px] font-bold px-2 py-0.5 rounded-full bg-status-submitted-bg text-status-submitted-text uppercase leading-none">Gov.in</span>
            </div>
            <span class="text-xs text-text-muted hidden sm:inline leading-tight">Sovereign Administrative Console | प्रशासनिक नियंत्रण पैनल</span>
          </div>
        </div>

        <!-- User Profile / Session Status -->
        <div class="flex items-center gap-3">
          <div class="relative" id="profile-btn-container">
            <button type="button" onclick="window.adminApp.toggleProfileDropdown()"
                    class="flex items-center gap-2 bg-surface-muted hover:bg-surface-container-low px-3 py-1.5 rounded-lg border border-border-hairline transition-colors cursor-pointer">
              <div class="w-7 h-7 rounded-full bg-ashoka-blue text-surface-crisp flex items-center justify-center text-xs font-bold" id="header-avatar-initials">
                ${initials}
              </div>
              <div class="flex flex-col text-left hidden sm:flex">
                <span class="text-xs font-bold text-ashoka-blue leading-tight">${state.user.role === 'REVIEWER' ? 'KYC AGENT' : state.user.role}</span>
                <span class="text-[10px] text-text-muted leading-none font-mono-code">${state.user.phone}</span>
              </div>
              <span class="material-symbols-outlined text-text-muted text-[18px] transition-transform" id="header-dropdown-arrow">expand_more</span>
            </button>

            <!-- Profile Dropdown -->
            <div id="profile-dropdown" class="hidden absolute right-0 top-[calc(100%+8px)] w-72 bg-surface-crisp rounded-xl shadow-xl border border-border-hairline z-[100] overflow-hidden">
              <div class="px-4 py-3 border-b border-border-hairline bg-surface-subtle">
                <p class="text-xs font-bold text-ashoka-blue truncate">${state.user.name}</p>
                <p class="text-[11px] text-text-muted font-mono-code truncate">${state.user.email}</p>
              </div>
              <div class="py-1">
                <button type="button" onclick="window.adminApp.navigate('registrations'); window.adminApp.closeProfileDropdown();"
                        class="w-full flex items-center gap-3 px-4 py-2 text-sm text-text-primary hover:bg-surface-muted transition-colors text-left cursor-pointer">
                  <span class="material-symbols-outlined text-[18px] text-ashoka-blue">assignment</span>
                  <span>Registration Queue</span>
                </button>
                <button type="button" onclick="window.adminApp.navigate('users'); window.adminApp.closeProfileDropdown();"
                        class="w-full flex items-center gap-3 px-4 py-2 text-sm text-text-primary hover:bg-surface-muted transition-colors text-left cursor-pointer">
                  <span class="material-symbols-outlined text-[18px] text-gov-emerald">group</span>
                  <span>User Management</span>
                </button>
                <button type="button" onclick="window.adminApp.navigate('audit'); window.adminApp.closeProfileDropdown();"
                        class="w-full flex items-center gap-3 px-4 py-2 text-sm text-text-primary hover:bg-surface-muted transition-colors text-left cursor-pointer">
                  <span class="material-symbols-outlined text-[18px] text-text-muted">history_edu</span>
                  <span>Audit Log</span>
                </button>
              </div>
              <div class="border-t border-border-hairline py-1 px-2">
                <button type="button" onclick="window.adminApp.logout(); window.adminApp.closeProfileDropdown();"
                        class="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-error hover:bg-error/10 rounded-lg transition-colors cursor-pointer">
                  <span class="material-symbols-outlined text-[16px]">logout</span>
                  <span>Logout & Terminate Session</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>`;
}

function renderSidebar() {
  if (!state.user) return '';
  const navItems = [
    { path: 'users', icon: 'group', label: 'Users', badge: 'Admin Only' },
    { path: 'registrations', icon: 'folder_supervised', label: 'Registrations' },
    { path: 'problems', icon: 'extension', label: 'Problems' },
    { path: 'evaluation', icon: 'biotech', label: 'Evaluation' },
    { path: 'audit', icon: 'history_edu', label: 'Audit' },
  ];

  const navHtml = navItems.map(item => {
    const isActive = state.currentPage === item.path;
    const activeClasses = isActive
      ? 'bg-surface-crisp text-ashoka-blue font-semibold shadow-sm border-l-[3px] border-saffron-accent'
      : 'text-text-secondary hover:bg-surface-crisp hover:text-ashoka-blue border-l-[3px] border-transparent';
    const iconColor = isActive ? 'text-ashoka-blue' : 'text-text-muted';
    const badge = item.badge
      ? `<span class="text-[10px] px-1.5 py-0.5 rounded-full bg-saffron-accent/10 text-saffron-accent font-bold uppercase">${item.badge}</span>`
      : '';
    return `
      <a class="flex items-center ${item.badge ? 'justify-between' : 'gap-2.5'} px-3 py-2.5 rounded-r-lg transition-all text-sm font-medium ${activeClasses} cursor-pointer"
         ${isActive ? 'aria-current="page"' : ''}
         onclick="window.adminApp.navigate('${item.path}')">
        <span class="flex items-center gap-2.5">
          <span class="material-symbols-outlined text-[20px] ${iconColor}">${item.icon}</span>
          <span>${item.label}</span>
        </span>
        ${badge}
      </a>`;
  }).join('');

  return `
    <aside class="fixed left-0 top-[calc(4rem+4px)] bottom-0 w-60 bg-surface-subtle border-r border-border-hairline z-30 flex flex-col justify-between">
      <div class="flex flex-col pt-4">
        <div class="px-4 pb-3 mb-1">
          <span class="text-[10px] font-bold uppercase tracking-wider text-text-muted">Navigation</span>
        </div>
        <nav class="flex flex-col gap-0.5 px-1.5">
          ${navHtml}
        </nav>
      </div>
      <div class="px-4 py-3 border-t border-border-hairline">
        <div class="flex items-center justify-between text-text-muted text-xs">
          <span class="flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-gov-emerald"></span>Core v2.4
          </span>
          <span class="font-mono-code text-[10px]">SECURE-LEVEL-1</span>
        </div>
      </div>
    </aside>`;
}

// ----- Main Render -----
function renderApp() {
  const root = document.getElementById('app-root');
  if (!root) return;

  const isFullPage = ['login', 'otp', 'unauthorized'].includes(state.currentPage);
  const renderFn = pages[state.currentPage];

  if (isFullPage) {
    root.innerHTML = `<div id="app-content">${renderFn ? renderFn() : '<p>Page not found</p>'}</div>`;
  } else {
    root.innerHTML = `
      ${renderHeader()}
      ${renderSidebar()}
      <div class="pl-60">
        <main class="relative pt-[calc(4rem+4px)] bg-surface-subtle min-h-screen">
          <div class="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6">
            <div id="app-content">${renderFn ? renderFn() : '<p>Page not found</p>'}</div>
          </div>
        </main>
      </div>`;
  }

  // Run post-render hooks
  if (renderFn && renderFn.afterRender) {
    setTimeout(() => renderFn.afterRender(), 0);
  }
}

// ----- Hash Router -----
export function handleRoute() {
  restoreSession();
  const rawHash = window.location.hash || '';
  const hash = rawHash.replace(/^#\/?/, '').trim() || 'login';
  state.currentPage = hash;

  const publicPages = ['login', 'otp', 'unauthorized'];

  if (state.authenticated) {
    const role = state.user?.role;
    if (role !== 'ADMIN' && role !== 'REVIEWER') {
      if (hash !== 'unauthorized') {
        state.currentPage = 'unauthorized';
        if (window.location.hash !== '#/unauthorized') {
          window.location.hash = '#/unauthorized';
        }
        renderApp();
        return;
      }
    } else if (hash === 'login' || hash === 'otp') {
      state.currentPage = 'registrations';
      if (window.location.hash !== '#/registrations') {
        window.location.hash = '#/registrations';
      }
      renderApp();
      return;
    }
  } else {
    if (!publicPages.includes(hash)) {
      state.currentPage = 'login';
      if (window.location.hash !== '#/login') {
        window.location.hash = '#/login';
      }
      renderApp();
      return;
    }
  }

  renderApp();
}

// ----- Init -----
window.addEventListener('hashchange', handleRoute);
window.addEventListener('DOMContentLoaded', () => {
  handleRoute();
});

// Expose to global for onclick handlers
window.adminApp = {
  navigate,
  logout,
  getState: () => state,
  setState,
  showToast,
  renderApp,
  toggleProfileDropdown() {
    const dd = document.getElementById('profile-dropdown');
    if (dd) dd.classList.toggle('hidden');
  },
  closeProfileDropdown() {
    const dd = document.getElementById('profile-dropdown');
    if (dd) dd.classList.add('hidden');
  },
};
