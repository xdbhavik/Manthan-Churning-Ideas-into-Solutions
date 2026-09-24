// ============================================================
// Screen 4: Users Management & RBAC Authority (Live API Integration)
// ============================================================
import { registerPage, showToast, getState } from '../app.js';
import {
  lookupUser,
  changeUserRole,
  onboardEvaluator,
  decodeJwtPayload,
  getAccessToken,
} from '../api.js';

let currentUserRecord = null;
let searchedUserId = '';
let isLoading = false;
let isExecuting = false;
let showOnboardModal = false;

// Quick-select preset identities from the active system
const KNOWN_PRESETS = [
  { label: 'Admin (Self)', id: '11111111-1111-4111-8111-111111111111', role: 'ADMIN' },
  { label: 'Reviewer Officer', id: '22222222-2222-4222-8222-222222222222', role: 'REVIEWER' },
  { label: 'Submitter Nodal', id: '33333333-3333-4333-8333-333333333333', role: 'SUBMITTER' },
  { label: 'Evaluator Lead', id: '44444444-4444-4444-8444-444444444444', role: 'EVALUATOR' },
];

export async function resolveUser(userId) {
  if (!userId) return;
  isLoading = true;
  searchedUserId = userId;
  renderAppContent();

  try {
    const res = await lookupUser(userId.trim());
    currentUserRecord = res;
  } catch (err) {
    console.error('User lookup error:', err);
    showToast(err.message || `User not found: ${userId}`, 'error');
    currentUserRecord = null;
  } finally {
    isLoading = false;
    renderAppContent();
  }
}

function renderAppContent() {
  const container = document.getElementById('app-content');
  if (container) {
    container.innerHTML = render();
  }
}

function getInitialUserId() {
  const token = getAccessToken();
  const jwt = token ? decodeJwtPayload(token) : null;
  return jwt?.sub || jwt?.userId || '11111111-1111-4111-8111-111111111111';
}

function render() {
  const u = currentUserRecord;
  const initialId = searchedUserId || getInitialUserId();

  return `
    <div class="flex flex-col w-full gap-space-lg">
      <!-- Header -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
        <div>
          <div class="flex items-center gap-space-xs mb-1">
            <span class="font-mono-code text-label-sm text-saffron-accent uppercase tracking-wider font-bold">ADMIN-EXCLUSIVE MODULE</span>
            <span class="text-text-muted text-label-sm">•</span>
            <span class="font-mono-code text-label-sm text-text-muted">RBAC POLICY ENGINE</span>
          </div>
          <h2 class="font-headline-lg text-headline-lg text-ashoka-blue tracking-tight">User Authority &amp; Role Registry</h2>
          <p class="font-body-md text-body-md text-text-secondary mt-space-2xs">Live management of administrative roster, RBAC roles, and evaluator onboarding.</p>
        </div>
        <div class="flex items-center gap-space-sm">
          <button onclick="window.usersPage.openOnboardModal()" class="px-space-md py-2 rounded-lg bg-gov-emerald text-on-primary font-label-md text-label-md hover:bg-opacity-90 transition-all flex items-center gap-1.5 shadow-sm font-semibold cursor-pointer">
            <span class="material-symbols-outlined text-[18px]">person_add</span>
            <span>Onboard Evaluator</span>
          </button>
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-status-action-bg text-status-action-text font-label-sm text-label-sm font-bold border border-status-action-border">
            <span class="material-symbols-outlined text-[14px]">lock</span>
            ADMIN ONLY
          </span>
        </div>
      </div>

      <!-- UUID Lookup Bar -->
      <div class="bg-surface-crisp rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md border border-border-hairline">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <span class="font-headline-sm text-headline-sm text-ashoka-blue flex items-center gap-2">
            <span class="material-symbols-outlined text-[20px]">person_search</span>
            User Identity Lookup
          </span>
          <!-- Preset quick buttons -->
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="text-xs text-text-muted mr-1">Quick Select:</span>
            ${KNOWN_PRESETS.map(p => `
              <button onclick="window.usersPage.quickSelect('${p.id}')" class="px-2 py-0.5 rounded text-[11px] font-mono-code ${searchedUserId === p.id ? 'bg-ashoka-blue text-white' : 'bg-surface-subtle text-text-secondary hover:bg-surface-container border border-border-hairline'} transition-colors cursor-pointer">
                ${p.label}
              </button>
            `).join('')}
          </div>
        </div>

        <form onsubmit="event.preventDefault(); window.usersPage.handleSearch();" class="flex items-stretch gap-space-sm">
          <div class="relative flex-1">
            <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-text-muted">search</span>
            <input
              type="text"
              id="user-lookup-input"
              value="${escapeHtml(initialId)}"
              class="w-full pl-9 pr-3 py-2.5 bg-surface-subtle rounded-lg text-text-primary font-mono-code text-body-md focus:bg-surface-crisp focus:outline-none focus:ring-2 focus:ring-ashoka-blue transition-all placeholder:text-text-muted shadow-sm border border-border-hairline"
              placeholder="Enter User UUID (e.g. 11111111-1111-4111-8111-111111111111)..."
            />
          </div>
          <button type="submit" class="px-space-lg py-2.5 rounded-lg bg-ashoka-blue text-on-primary font-label-md text-label-md hover:bg-institutional-navy transition-colors shadow-sm flex items-center gap-1.5 font-semibold cursor-pointer">
            <span class="material-symbols-outlined text-[18px]">manage_search</span>
            <span>Resolve Identity</span>
          </button>
        </form>
      </div>

      ${isLoading ? `
        <div class="p-12 text-center text-text-muted bg-surface-crisp rounded-xl border border-border-hairline flex flex-col items-center justify-center gap-3">
          <div class="w-8 h-8 rounded-full border-2 border-ashoka-blue border-t-transparent animate-spin"></div>
          <span>Resolving user record from Sovereign Registry...</span>
        </div>
      ` : u ? `
        <!-- User Dossier Layout -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
          <!-- Left: User Profile Card (7 cols) -->
          <div class="lg:col-span-7 flex flex-col gap-space-lg">
            <div class="bg-surface-crisp rounded-xl shadow-sm overflow-hidden border border-border-hairline">
              <!-- User Header Banner -->
              <div class="p-space-lg bg-surface-container-high/40 flex flex-col sm:flex-row sm:items-center justify-between gap-space-md border-b border-border-hairline">
                <div class="flex items-center gap-space-md">
                  <div class="w-14 h-14 rounded-xl ${getRoleColor(u.role).iconBg} text-on-primary flex items-center justify-center flex-shrink-0 shadow-md">
                    <span class="material-symbols-outlined text-[32px]">${getRoleIcon(u.role)}</span>
                  </div>
                  <div class="flex flex-col">
                    <div class="flex flex-wrap items-center gap-space-sm">
                      <span class="font-headline-md text-headline-md text-ashoka-blue font-bold">${u.email ? u.email.split('@')[0].toUpperCase() : 'REGISTERED OFFICER'}</span>
                      <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full ${getRoleColor(u.role).badge} font-label-sm text-label-sm font-bold uppercase tracking-wider">
                        ${u.role}
                      </span>
                      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${u.kycStatus === 'VERIFIED' ? 'bg-status-approved-bg text-status-approved-text' : 'bg-status-review-bg text-status-review-text'} font-label-sm text-label-sm font-bold">
                        <span class="material-symbols-outlined text-[12px]">${u.kycStatus === 'VERIFIED' ? 'verified' : 'pending'}</span>
                        KYC ${u.kycStatus || 'UNVERIFIED'}
                      </span>
                    </div>
                    <span class="font-mono-code text-xs text-text-muted mt-0.5">UUID: ${u.userId}</span>
                  </div>
                </div>
                <div class="flex items-center gap-space-sm self-end sm:self-auto">
                  <span class="px-2.5 py-1 rounded bg-surface-crisp font-mono-code text-label-sm text-gov-emerald font-semibold shadow-sm border border-border-hairline flex items-center gap-1">
                    <span class="w-2 h-2 rounded-full bg-gov-emerald animate-pulse"></span>
                    ${getClearanceTier(u.role)}
                  </span>
                </div>
              </div>

              <!-- User Data Grid -->
              <div class="p-space-lg">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-space-md bg-surface-subtle p-space-lg rounded-lg border border-border-hairline">
                  <div>
                    <span class="font-label-sm text-label-sm text-text-muted uppercase">Official Mobile</span>
                    <p class="font-mono-code text-body-md text-text-primary font-semibold mt-0.5">${u.phone ? `+91 ${u.phone}` : 'Not registered'}</p>
                  </div>
                  <div>
                    <span class="font-label-sm text-label-sm text-text-muted uppercase">Official Email</span>
                    <p class="font-mono-code text-body-md text-text-primary mt-0.5">${u.email || 'None assigned'}</p>
                  </div>
                  <div>
                    <span class="font-label-sm text-label-sm text-text-muted uppercase">Assigned Authority Role</span>
                    <p class="font-mono-code text-body-md text-ashoka-blue font-bold mt-0.5">${u.role}</p>
                  </div>
                  <div>
                    <span class="font-label-sm text-label-sm text-text-muted uppercase">KYC Verification State</span>
                    <p class="font-body-md text-body-md text-text-primary mt-0.5">${u.kycStatus || 'UNVERIFIED'}</p>
                  </div>
                  <div>
                    <span class="font-label-sm text-label-sm text-text-muted uppercase">Account Created</span>
                    <p class="font-mono-code text-body-md text-text-primary mt-0.5">${formatDate(u.createdAt)}</p>
                  </div>
                  <div>
                    <span class="font-label-sm text-label-sm text-text-muted uppercase">Linked Source ID</span>
                    <p class="font-mono-code text-xs text-text-primary mt-0.5 truncate">${u.linkedSourceId || 'None (Direct Account)'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Right: Role Assignment Panel (5 cols) -->
          <div class="lg:col-span-5 flex flex-col gap-space-lg">
            <!-- RBAC Control Panel -->
            <div class="bg-surface-crisp rounded-xl shadow-sm p-space-lg flex flex-col gap-space-md border border-border-hairline">
              <div class="flex items-center justify-between pb-space-xs border-b border-border-hairline">
                <span class="font-headline-sm text-headline-sm text-ashoka-blue flex items-center gap-2">
                  <span class="material-symbols-outlined text-[20px]">shield_person</span>
                  RBAC Role Mutation
                </span>
                <span class="px-2 py-0.5 rounded-full bg-status-action-bg text-status-action-text font-label-sm text-label-sm font-bold border border-status-action-border">Authoritative</span>
              </div>

              <p class="font-body-sm text-body-sm text-text-secondary">
                Change the operational role for this user account. Role transitions take effect immediately on next token issuance and are recorded into the append-only ledger.
              </p>

              <!-- Current Role Display & Selector -->
              <div class="p-space-md bg-surface-subtle rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border border-border-hairline">
                <div>
                  <span class="font-label-sm text-label-sm text-text-muted uppercase block">Current Role</span>
                  <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full ${getRoleColor(u.role).badge} font-label-md text-label-md font-bold uppercase mt-1">
                    ${u.role}
                  </span>
                </div>
                <span class="material-symbols-outlined text-[24px] text-text-muted hidden sm:inline">arrow_forward</span>
                <div>
                  <span class="font-label-sm text-label-sm text-text-muted uppercase block">Proposed New Role</span>
                  <select id="new-role-select" class="mt-1 px-3 py-1.5 rounded-lg bg-surface-crisp text-text-primary font-label-md text-label-md focus:outline-none focus:ring-2 focus:ring-ashoka-blue shadow-sm border border-border-hairline">
                    <option value="SUBMITTER" ${u.role === 'SUBMITTER' ? 'selected' : ''}>SUBMITTER</option>
                    <option value="REVIEWER" ${u.role === 'REVIEWER' ? 'selected' : ''}>REVIEWER</option>
                    <option value="EVALUATOR" ${u.role === 'EVALUATOR' ? 'selected' : ''}>EVALUATOR</option>
                    <option value="ADMIN" ${u.role === 'ADMIN' ? 'selected' : ''}>ADMIN</option>
                  </select>
                </div>
              </div>

              <!-- Confirm Safety Warning -->
              <div class="p-space-md bg-error-container/30 rounded-lg flex items-start gap-space-sm border border-error/20">
                <span class="material-symbols-outlined text-error text-[18px] mt-0.5">warning</span>
                <p class="font-body-sm text-body-sm text-text-primary">
                  <strong>Caution:</strong> Elevating to <code class="font-mono-code font-bold">ADMIN</code> grants unrestricted system access including KYC sign-offs, role modifications, and evaluation publication.
                </p>
              </div>

              <!-- Action Button -->
              <button
                id="role-change-btn"
                class="w-full py-2.5 rounded-lg bg-saffron-accent text-on-primary font-label-md text-label-md hover:brightness-110 transition-all shadow-sm flex items-center justify-center gap-2 font-semibold cursor-pointer"
                onclick="window.usersPage.openConfirmModal()"
              >
                <span class="material-symbols-outlined text-[18px]">swap_horiz</span>
                <span>Initiate Role Transition</span>
              </button>
            </div>
          </div>
        </div>
      ` : `
        <div class="p-12 text-center text-text-muted bg-surface-crisp rounded-xl border border-border-hairline">
          Enter a valid User UUID in the lookup field above to view authority records and execute role mutations.
        </div>
      `}

      <!-- Confirmation Modal -->
      <div id="confirm-modal" class="hidden fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-gutter-mobile">
        <div class="bg-surface-crisp rounded-xl shadow-2xl max-w-md w-full p-space-xl flex flex-col gap-space-lg border border-border-hairline">
          <div class="flex items-center gap-space-sm">
            <div class="w-10 h-10 rounded-lg bg-error-container flex items-center justify-center">
              <span class="material-symbols-outlined text-error text-[22px]">warning</span>
            </div>
            <div>
              <h3 class="font-headline-sm text-headline-sm text-text-primary font-bold">Confirm Role Transition</h3>
              <p class="font-body-sm text-body-sm text-text-secondary">Statutory audit entry will be recorded.</p>
            </div>
          </div>

          <div class="p-space-md bg-surface-subtle rounded-lg border border-border-hairline">
            <p class="font-body-md text-body-md text-text-primary leading-relaxed">
              You are about to change the role of user <strong class="font-mono-code text-xs">${u?.userId || ''}</strong> from
              <span class="font-mono-code text-ashoka-blue font-bold">${u?.role || ''}</span> to
              <span id="modal-new-role" class="font-mono-code text-saffron-accent font-bold">REVIEWER</span>.
            </p>
          </div>

          <div class="flex flex-col gap-space-xs">
            <label class="font-label-md text-label-md text-text-primary">
              Type <code class="font-mono-code text-error bg-error-container/30 px-1 py-0.5 rounded">CONFIRM</code> to proceed
            </label>
            <input
              type="text"
              id="confirm-input"
              class="w-full px-space-md py-2.5 bg-surface-subtle rounded-lg text-text-primary font-mono-code text-body-md focus:outline-none focus:ring-2 focus:ring-error shadow-sm placeholder:text-text-muted border border-border-hairline"
              placeholder="Type CONFIRM here..."
              oninput="window.usersPage.checkConfirm()"
            />
          </div>

          <div class="flex items-center gap-space-sm">
            <button
              class="flex-1 py-2.5 rounded-lg bg-surface-subtle text-text-secondary font-label-md text-label-md hover:bg-surface-muted transition-colors border border-border-hairline cursor-pointer"
              onclick="window.usersPage.closeModal()"
            >Cancel</button>
            <button
              id="modal-confirm-btn"
              disabled
              class="flex-1 py-2.5 rounded-lg bg-error text-on-error font-label-md text-label-md hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm font-semibold cursor-pointer"
              onclick="window.usersPage.executeRoleChange()"
            >Execute Transition</button>
          </div>
        </div>
      </div>

      <!-- Onboard Evaluator Modal -->
      <div id="onboard-modal" class="hidden fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-gutter-mobile">
        <div class="bg-surface-crisp rounded-xl shadow-2xl max-w-md w-full p-space-xl flex flex-col gap-space-lg border border-border-hairline">
          <div class="flex items-center gap-space-sm">
            <div class="w-10 h-10 rounded-lg bg-status-approved-bg flex items-center justify-center">
              <span class="material-symbols-outlined text-gov-emerald text-[22px]">person_add</span>
            </div>
            <div>
              <h3 class="font-headline-sm text-headline-sm text-text-primary font-bold">Onboard New Evaluator</h3>
              <p class="font-body-sm text-body-sm text-text-secondary">Direct evaluator provisioning by Administrator.</p>
            </div>
          </div>

          <form onsubmit="event.preventDefault(); window.usersPage.submitOnboard();" class="flex flex-col gap-4">
            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-bold uppercase tracking-wider text-text-primary" for="eval-phone-input">
                Evaluator Mobile Number <span class="text-saffron-accent">*</span>
              </label>
              <div class="flex items-center rounded-lg border border-border-hairline bg-surface-subtle overflow-hidden">
                <span class="px-3 py-2 bg-surface-muted text-text-primary font-mono-code text-sm font-semibold border-r border-border-hairline">+91</span>
                <input
                  type="tel"
                  id="eval-phone-input"
                  maxlength="10"
                  class="w-full px-3 py-2 bg-transparent font-mono-code text-sm text-text-primary focus:outline-none"
                  placeholder="98XXXXXXXX"
                  required
                />
              </div>
              <span class="text-[11px] text-text-muted">An EVALUATOR profile will be created and an initial OTP challenge minted.</span>
            </div>

            <div class="flex items-center gap-space-sm pt-2">
              <button
                type="button"
                class="flex-1 py-2.5 rounded-lg bg-surface-subtle text-text-secondary font-label-md text-label-md hover:bg-surface-muted transition-colors border border-border-hairline cursor-pointer"
                onclick="window.usersPage.closeOnboardModal()"
              >Cancel</button>
              <button
                type="submit"
                id="eval-submit-btn"
                class="flex-1 py-2.5 rounded-lg bg-gov-emerald text-on-primary font-label-md text-label-md hover:brightness-110 transition-all shadow-sm font-semibold cursor-pointer"
              >Provision Account</button>
            </div>
          </form>
        </div>
      </div>
    </div>`;
}

function getRoleIcon(role) {
  switch (role) {
    case 'ADMIN': return 'admin_panel_settings';
    case 'REVIEWER': return 'rate_review';
    case 'EVALUATOR': return 'biotech';
    default: return 'person';
  }
}

function getRoleColor(role) {
  switch (role) {
    case 'ADMIN': return { iconBg: 'bg-ashoka-blue', badge: 'bg-ashoka-blue text-on-primary' };
    case 'REVIEWER': return { iconBg: 'bg-institutional-navy', badge: 'bg-status-submitted-bg text-status-submitted-text' };
    case 'EVALUATOR': return { iconBg: 'bg-gov-emerald', badge: 'bg-status-approved-bg text-status-approved-text' };
    default: return { iconBg: 'bg-surface-variant', badge: 'bg-surface-container text-text-secondary' };
  }
}

function getClearanceTier(role) {
  switch (role) {
    case 'ADMIN': return 'Tier 1 • Sovereign Root';
    case 'REVIEWER': return 'Tier 2 • Review Officer';
    case 'EVALUATOR': return 'Tier 3 • Technical Panel';
    default: return 'Tier 4 • Submitter Node';
  }
}

function formatDate(iso) {
  if (!iso) return 'N/A';
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(iso);
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

window.usersPage = {
  handleSearch() {
    const input = document.getElementById('user-lookup-input');
    const val = input?.value?.trim();
    if (!val) {
      showToast('Please enter a User UUID to resolve', 'error');
      return;
    }
    resolveUser(val);
  },

  quickSelect(id) {
    const input = document.getElementById('user-lookup-input');
    if (input) input.value = id;
    resolveUser(id);
  },

  openConfirmModal() {
    const modal = document.getElementById('confirm-modal');
    const newRole = document.getElementById('new-role-select')?.value;
    const modalRole = document.getElementById('modal-new-role');
    if (modalRole) modalRole.textContent = newRole;
    if (modal) modal.classList.remove('hidden');
  },

  closeModal() {
    const modal = document.getElementById('confirm-modal');
    if (modal) modal.classList.add('hidden');
    const input = document.getElementById('confirm-input');
    if (input) input.value = '';
    const btn = document.getElementById('modal-confirm-btn');
    if (btn) btn.disabled = true;
  },

  checkConfirm() {
    const input = document.getElementById('confirm-input');
    const btn = document.getElementById('modal-confirm-btn');
    if (btn) btn.disabled = input?.value?.trim() !== 'CONFIRM';
  },

  async executeRoleChange() {
    if (!currentUserRecord) return;
    const newRole = document.getElementById('new-role-select')?.value;
    if (!newRole) return;

    const btn = document.getElementById('modal-confirm-btn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Updating Role...';
    }

    try {
      showToast(`Committing role mutation to ${newRole}...`, 'info');
      const updated = await changeUserRole(currentUserRecord.userId, newRole);
      currentUserRecord = updated;
      showToast(`User role successfully changed to ${newRole}`, 'success');
      this.closeModal();
      renderAppContent();
    } catch (err) {
      console.error('Role update error:', err);
      showToast(err.message || 'Failed to update user role', 'error');
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Execute Transition';
      }
    }
  },

  openOnboardModal() {
    const modal = document.getElementById('onboard-modal');
    if (modal) modal.classList.remove('hidden');
  },

  closeOnboardModal() {
    const modal = document.getElementById('onboard-modal');
    if (modal) modal.classList.add('hidden');
  },

  async submitOnboard() {
    const input = document.getElementById('eval-phone-input');
    const phone = (input?.value || '').replace(/\D/g, '');
    if (phone.length !== 10) {
      showToast('Please enter a valid 10-digit mobile number', 'error');
      return;
    }

    const btn = document.getElementById('eval-submit-btn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Provisioning...';
    }

    try {
      showToast(`Provisioning Evaluator for +91 ${phone}...`, 'info');
      const res = await onboardEvaluator(phone);
      showToast(`Evaluator provisioned! UUID: ${res.userId || 'Created'}`, 'success');
      this.closeOnboardModal();
      if (res.userId) {
        resolveUser(res.userId);
      }
    } catch (err) {
      console.error('Onboard evaluator error:', err);
      showToast(err.message || 'Failed to provision evaluator account', 'error');
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Provision Account';
      }
    }
  },
};

render.afterRender = function() {
  if (!currentUserRecord && !isLoading) {
    resolveUser(getInitialUserId());
  }
};

registerPage('users', render);
