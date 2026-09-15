// ============================================================
// Screen 3: Unauthorized Page (403)
// ============================================================
import { registerPage, navigate, mockLogout } from '../app.js';

function render() {
  const now = new Date();
  const ts = now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
  const incidentRef = 'INC-' + Math.random().toString(36).substring(2, 8).toUpperCase();

  return `
    <!-- Header -->
    <header class="fixed top-1 left-0 right-0 z-40 bg-surface-crisp shadow-sm border-b border-border-hairline h-16">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-lg bg-surface-container-low shadow-sm border border-border-hairline/60">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" class="w-7 h-7" fill="none">
              <circle cx="24" cy="24" r="22" fill="#0A2540" stroke="#E2E8F0" stroke-width="1.5"/>
              <circle cx="24" cy="24" r="16" fill="#F8FAFC" stroke="#0A2540" stroke-width="1"/>
              <circle cx="24" cy="24" r="11" stroke="#1E3A8A" stroke-width="1.2" fill="none"/>
              <circle cx="24" cy="24" r="3" fill="#1E3A8A"/>
              <line x1="24" y1="13" x2="24" y2="35" stroke="#1E3A8A" stroke-width="1"/>
              <line x1="13" y1="24" x2="35" y2="24" stroke="#1E3A8A" stroke-width="1"/>
              <line x1="16" y1="16" x2="32" y2="32" stroke="#1E3A8A" stroke-width="1"/>
              <line x1="16" y1="32" x2="32" y2="16" stroke="#1E3A8A" stroke-width="1"/>
            </svg>
          </div>
          <div class="flex flex-col">
            <div class="flex items-center gap-2">
              <span class="font-bold text-ashoka-blue tracking-tight text-base sm:text-lg leading-tight">SIH26043 Admin Panel</span>
              <span class="text-[11px] font-bold px-2 py-0.5 rounded-full bg-status-submitted-bg text-status-submitted-text uppercase leading-none">Gov.in</span>
            </div>
            <span class="text-xs text-text-muted hidden sm:inline leading-tight">Sovereign Administrative Console | प्रशासनिक नियंत्रण पैनल</span>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-[10px] font-bold px-2.5 py-1 rounded-full bg-error-container text-error uppercase tracking-wider border border-error/20">Access Denied</span>
        </div>
      </div>
    </header>

    <main class="flex-1 pt-24 pb-12 px-4 sm:px-6 max-w-7xl mx-auto w-full flex flex-col items-center justify-center min-h-[calc(100vh-4.5rem)]">
      <div class="w-full max-w-md flex flex-col items-center gap-6">
        <!-- Error Badge -->
        <div class="flex flex-col items-center gap-space-md">
          <div class="w-20 h-20 rounded-2xl bg-error-container flex items-center justify-center shadow-lg">
            <span class="material-symbols-outlined text-error text-[44px]">gpp_bad</span>
          </div>
          <div class="text-center">
            <div class="flex items-center justify-center gap-space-sm mb-space-xs">
              <span class="font-mono-code text-label-sm text-error uppercase tracking-widest font-bold">HTTP 403</span>
              <span class="text-text-muted">•</span>
              <span class="font-mono-code text-label-sm text-text-muted uppercase tracking-wider">AUTHORIZATION FAILURE</span>
            </div>
            <h1 class="font-headline-xl text-headline-xl text-text-primary tracking-tight">Insufficient Clearance Level</h1>
            <p class="font-body-lg text-body-lg text-text-secondary mt-space-sm max-w-xl mx-auto">
              Your authenticated identity has been verified, but the decoded JWT role does not meet the minimum threshold
              (<code class="font-mono-code text-ashoka-blue bg-surface-subtle px-1 py-0.5 rounded text-body-md">ADMIN</code> or
              <code class="font-mono-code text-ashoka-blue bg-surface-subtle px-1 py-0.5 rounded text-body-md">REVIEWER</code>)
              required for administrative panel access.
            </p>
          </div>
        </div>

        <!-- Incident Audit Card -->
        <div class="w-full bg-surface-crisp rounded-xl shadow-md p-space-xl flex flex-col gap-space-lg">
          <div class="flex items-center justify-between">
            <span class="font-label-sm text-label-sm text-text-muted uppercase tracking-wider">Incident Audit Trace</span>
            <span class="px-2.5 py-0.5 rounded-full bg-error-container text-error font-label-sm text-label-sm font-bold uppercase tracking-wider">BLOCKED</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-space-md bg-surface-subtle p-space-lg rounded-lg">
            <div>
              <span class="font-label-sm text-label-sm text-text-muted uppercase block">Authenticated Identity</span>
              <span class="font-mono-code text-body-md text-text-primary font-semibold block mt-0.5">submitter_user@org.gov.in</span>
            </div>
            <div>
              <span class="font-label-sm text-label-sm text-text-muted uppercase block">Decoded JWT Role</span>
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full bg-status-action-bg text-status-action-text font-label-sm text-label-sm font-bold uppercase mt-0.5">SUBMITTER</span>
            </div>
            <div>
              <span class="font-label-sm text-label-sm text-text-muted uppercase block">Timestamp (UTC)</span>
              <span class="font-mono-code text-body-md text-text-primary block mt-0.5">${ts}</span>
            </div>
            <div>
              <span class="font-label-sm text-label-sm text-text-muted uppercase block">Incident Reference</span>
              <span class="font-mono-code text-body-md text-ashoka-blue font-bold block mt-0.5">${incidentRef}</span>
            </div>
          </div>

          <!-- Copy Reference -->
          <button
            class="self-start inline-flex items-center gap-space-xs px-space-md py-1.5 rounded-lg bg-surface-subtle text-text-secondary hover:bg-surface-muted hover:text-text-primary font-label-md text-label-md transition-colors"
            onclick="window.unauthorizedPage.copyRef('${incidentRef}')"
          >
            <span class="material-symbols-outlined text-[16px]">content_copy</span>
            <span id="copy-ref-text">Copy Reference ID</span>
          </button>

          <!-- Action Buttons -->
          <div class="flex flex-col sm:flex-row gap-space-sm pt-space-sm">
            <button
              class="flex-1 py-3 rounded-lg bg-ashoka-blue text-on-primary font-label-lg text-label-lg flex items-center justify-center gap-space-sm shadow-md hover:bg-institutional-navy transition-all"
              onclick="window.adminApp.navigate('login')"
            >
              <span class="material-symbols-outlined text-[20px]">arrow_back</span>
              <span>Return to Login Portal</span>
            </button>
            <button
              class="flex-1 py-3 rounded-lg bg-surface-subtle text-text-secondary font-label-lg text-label-lg flex items-center justify-center gap-space-sm hover:bg-surface-muted hover:text-text-primary transition-colors"
              onclick="window.adminApp.logout()"
            >
              <span class="material-symbols-outlined text-[20px]">logout</span>
              <span>Log Out & Clear Session</span>
            </button>
          </div>
        </div>

        <!-- Role Elevation Notice -->
        <div class="w-full bg-surface-crisp rounded-xl p-space-lg shadow-sm flex items-start gap-space-md">
          <div class="w-10 h-10 rounded-lg bg-status-submitted-bg flex items-center justify-center shrink-0">
            <span class="material-symbols-outlined text-institutional-navy text-[22px]">support_agent</span>
          </div>
          <div>
            <span class="font-label-md text-label-md text-text-primary block">Need Administrative Access?</span>
            <p class="font-body-sm text-body-sm text-text-secondary mt-space-2xs">
              Contact the system root administrator or raise a role-elevation request via the
              <a class="text-ashoka-blue font-semibold hover:underline cursor-pointer">institutional helpdesk portal</a>.
              All role changes are recorded in the immutable audit log.
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex flex-wrap items-center justify-center gap-space-md text-text-muted font-mono-code text-[11px]">
          <span class="flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-error"></span>
            ACCESS DENIED
          </span>
          <span>Policy: RBAC-STRICT</span>
          <span>Audit: WORM-CHAINED</span>
        </div>
      </div>
    </main>`;
}

window.unauthorizedPage = {
  copyRef(ref) {
    navigator.clipboard.writeText(ref).then(() => {
      const el = document.getElementById('copy-ref-text');
      if (el) {
        el.textContent = 'Copied!';
        setTimeout(() => el.textContent = 'Copy Reference ID', 2000);
      }
    });
  },
};

registerPage('unauthorized', render);
