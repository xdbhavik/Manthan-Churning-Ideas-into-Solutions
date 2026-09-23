// ============================================================
// Screen 4: Users Management (Admin-exclusive)
// ============================================================
import { registerPage, showToast } from '../app.js';

function render() {
  return `
    <div class="flex flex-col w-full gap-space-lg">
      <!-- Header -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
        <div>
          <div class="flex items-center gap-space-xs mb-1">
            <span class="font-mono-code text-label-sm text-saffron-accent uppercase tracking-wider">ADMIN-EXCLUSIVE MODULE</span>
            <span class="text-text-muted text-label-sm">•</span>
            <span class="font-mono-code text-label-sm text-text-muted">RBAC POLICY ENGINE</span>
          </div>
          <h2 class="font-headline-lg text-headline-lg text-ashoka-blue tracking-tight">User Authority & Role Registry</h2>
          <p class="font-body-md text-body-md text-text-secondary mt-space-2xs">Manage admin-controlled user roster, roles, and access policy configurations.</p>
        </div>
        <div class="flex items-center gap-space-sm">
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-status-action-bg text-status-action-text font-label-sm text-label-sm font-bold border border-status-action-border">
            <span class="material-symbols-outlined text-[14px]">lock</span>
            ADMIN ONLY
          </span>
        </div>
      </div>

      <!-- UUID Lookup -->
      <div class="bg-surface-crisp rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md">
        <div class="flex items-center justify-between">
          <span class="font-headline-sm text-headline-sm text-ashoka-blue flex items-center gap-2">
            <span class="material-symbols-outlined text-[20px]">person_search</span>
            User Identity Lookup
          </span>
          <span class="font-mono-code text-body-sm text-text-muted">UUID-INDEXED SEARCH</span>
        </div>
        <div class="flex items-stretch gap-space-sm">
          <div class="relative flex-1">
            <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-text-muted">search</span>
            <input
              type="text"
              id="user-lookup"
              value="USR-884219-ADMN"
              class="w-full pl-9 pr-3 py-2.5 bg-surface-subtle rounded-lg text-text-primary font-mono-code text-body-md focus:bg-surface-crisp focus:outline-none focus:ring-2 focus:ring-ashoka-blue transition-all placeholder:text-text-muted shadow-sm"
              placeholder="Enter user UUID or email..."
            />
          </div>
          <button class="px-space-lg py-2.5 rounded-lg bg-ashoka-blue text-on-primary font-label-md text-label-md hover:bg-institutional-navy transition-colors shadow-sm flex items-center gap-1.5">
            <span class="material-symbols-outlined text-[18px]">manage_search</span>
            <span>Resolve Identity</span>
          </button>
        </div>
      </div>

      <!-- User Dossier -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
        <!-- Left: User Profile Card (7 cols) -->
        <div class="lg:col-span-7 flex flex-col gap-space-lg">
          <div class="bg-surface-crisp rounded-xl shadow-sm overflow-hidden">
            <!-- User Header Banner -->
            <div class="p-space-lg bg-surface-container-high/40 flex flex-col sm:flex-row sm:items-center justify-between gap-space-md">
              <div class="flex items-center gap-space-md">
                <div class="w-14 h-14 rounded-xl bg-ashoka-blue text-on-primary flex items-center justify-center flex-shrink-0 shadow-md">
                  <span class="material-symbols-outlined text-[32px]">admin_panel_settings</span>
                </div>
                <div class="flex flex-col">
                  <div class="flex flex-wrap items-center gap-space-sm">
                    <span class="font-headline-md text-headline-md text-ashoka-blue font-bold">Shri Anand Sharma</span>
                    <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-ashoka-blue text-on-primary font-label-sm text-label-sm font-bold uppercase tracking-wider">
                      ADMIN
                    </span>
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-status-approved-bg text-status-approved-text font-label-sm text-label-sm font-bold">
                      <span class="material-symbols-outlined text-[12px]">verified</span> KYC VERIFIED
                    </span>
                  </div>
                  <span class="font-mono-code text-body-sm text-text-muted">UUID: USR-884219-ADMN • Clearance Tier 1</span>
                </div>
              </div>
              <div class="flex items-center gap-space-sm self-end sm:self-auto">
                <span class="px-2.5 py-1 rounded bg-surface-crisp font-mono-code text-label-sm text-institutional-navy font-semibold shadow-sm">Active Session</span>
              </div>
            </div>

            <!-- User Data Grid -->
            <div class="p-space-lg">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-space-md bg-surface-subtle p-space-lg rounded-lg">
                <div>
                  <span class="font-label-sm text-label-sm text-text-muted uppercase">Full Legal Name</span>
                  <p class="font-body-md text-body-md text-text-primary font-semibold mt-0.5">Shri Anand Sharma, IAS</p>
                </div>
                <div>
                  <span class="font-label-sm text-label-sm text-text-muted uppercase">Registered Email</span>
                  <p class="font-mono-code text-body-md text-text-primary mt-0.5">anand.sharma@nic.in</p>
                </div>
                <div>
                  <span class="font-label-sm text-label-sm text-text-muted uppercase">Registered Phone</span>
                  <p class="font-mono-code text-body-md text-text-primary mt-0.5">+91 98142 88219</p>
                </div>
                <div>
                  <span class="font-label-sm text-label-sm text-text-muted uppercase">Ministry / Department</span>
                  <p class="font-body-md text-body-md text-text-primary mt-0.5">MeitY — e-Governance Div.</p>
                </div>
                <div>
                  <span class="font-label-sm text-label-sm text-text-muted uppercase">Account Created</span>
                  <p class="font-mono-code text-body-md text-text-primary mt-0.5">2024-09-15 14:20:00 IST</p>
                </div>
                <div>
                  <span class="font-label-sm text-label-sm text-text-muted uppercase">Last Active Session</span>
                  <p class="font-mono-code text-body-md text-text-primary mt-0.5">Today, 08:02:14 IST</p>
                </div>
                <div>
                  <span class="font-label-sm text-label-sm text-text-muted uppercase">Authentication Source</span>
                  <p class="font-body-md text-body-md text-text-primary mt-0.5">Aadhaar OTP / NIC SSO</p>
                </div>
                <div>
                  <span class="font-label-sm text-label-sm text-text-muted uppercase">IP (Last Login)</span>
                  <p class="font-mono-code text-body-md text-text-primary mt-0.5">10.14.88.201 (VPN-NIC)</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Role Assignment Panel (5 cols) -->
        <div class="lg:col-span-5 flex flex-col gap-space-lg">
          <!-- RBAC Control Panel -->
          <div class="bg-surface-crisp rounded-xl shadow-sm p-space-lg flex flex-col gap-space-md">
            <div class="flex items-center justify-between pb-space-xs border-b border-border-hairline">
              <span class="font-headline-sm text-headline-sm text-ashoka-blue flex items-center gap-2">
                <span class="material-symbols-outlined text-[20px]">shield_person</span>
                RBAC Role Assignment
              </span>
              <span class="px-2 py-0.5 rounded-full bg-status-action-bg text-status-action-text font-label-sm text-label-sm font-bold">Destructive</span>
            </div>

            <p class="font-body-sm text-body-sm text-text-secondary">
              Change the role for this user. Role transitions are <strong class="text-text-primary">permanent</strong> until re-assigned and are recorded in the immutable audit trail.
            </p>

            <!-- Current Role Display -->
            <div class="p-space-md bg-surface-subtle rounded-lg flex items-center justify-between">
              <div>
                <span class="font-label-sm text-label-sm text-text-muted uppercase block">Current Assigned Role</span>
                <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-ashoka-blue text-on-primary font-label-md text-label-md font-bold uppercase mt-1">
                  ADMIN
                </span>
              </div>
              <span class="material-symbols-outlined text-[24px] text-text-muted">arrow_forward</span>
              <div>
                <span class="font-label-sm text-label-sm text-text-muted uppercase block">Proposed New Role</span>
                <select id="new-role-select" class="mt-1 px-3 py-1.5 rounded-lg bg-surface-crisp text-text-primary font-label-md text-label-md focus:outline-none focus:ring-2 focus:ring-ashoka-blue shadow-sm border border-border-hairline">
                  <option value="SUBMITTER">SUBMITTER</option>
                  <option value="REVIEWER">REVIEWER</option>
                  <option value="ADMIN" selected>ADMIN (Current)</option>
                </select>
              </div>
            </div>

            <!-- Confirm Button -->
            <button
              id="role-change-btn"
              class="w-full py-2.5 rounded-lg bg-saffron-accent text-on-primary font-label-md text-label-md hover:brightness-110 transition-all shadow-sm flex items-center justify-center gap-2 font-semibold"
              onclick="window.usersPage.openConfirmModal()"
            >
              <span class="material-symbols-outlined text-[18px]">swap_horiz</span>
              <span>Initiate Role Transition</span>
            </button>

            <!-- Confirm Safety Warning -->
            <div class="p-space-md bg-error-container/30 rounded-lg flex items-start gap-space-sm">
              <span class="material-symbols-outlined text-error text-[18px] mt-0.5">warning</span>
              <p class="font-body-sm text-body-sm text-text-primary">
                <strong>Caution:</strong> Changing a user's role takes effect immediately. Elevating to ADMIN grants full system access including user management, registration decisions, and audit visibility.
              </p>
            </div>
          </div>

          <!-- Audit Snapshot -->
          <div class="bg-surface-crisp rounded-xl shadow-sm p-space-lg flex flex-col gap-space-md">
            <span class="font-headline-sm text-headline-sm text-ashoka-blue flex items-center gap-2">
              <span class="material-symbols-outlined text-[20px]">history</span>
              Recent Role Activity
            </span>
            <div class="space-y-space-sm relative pl-5">
              <div class="absolute left-2 top-2 bottom-2 w-0.5 bg-border-hairline"></div>
              <div class="relative flex flex-col gap-0.5">
                <span class="w-2.5 h-2.5 rounded-full bg-gov-emerald absolute -left-[17px] top-1"></span>
                <div class="flex items-center justify-between">
                  <span class="font-label-md text-label-md text-text-primary font-semibold">Role Elevated to ADMIN</span>
                  <span class="font-mono-code text-[11px] text-text-muted">2024-10-01</span>
                </div>
                <p class="font-body-sm text-body-sm text-text-secondary">Authorized by Superuser Root.</p>
              </div>
              <div class="relative flex flex-col gap-0.5">
                <span class="w-2.5 h-2.5 rounded-full bg-status-submitted-text absolute -left-[17px] top-1"></span>
                <div class="flex items-center justify-between">
                  <span class="font-label-md text-label-md text-text-primary font-semibold">Account Created as REVIEWER</span>
                  <span class="font-mono-code text-[11px] text-text-muted">2024-09-15</span>
                </div>
                <p class="font-body-sm text-body-sm text-text-secondary">Initial registration via NIC SSO gateway.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Confirmation Modal (hidden by default) -->
      <div id="confirm-modal" class="hidden fixed inset-0 z-[100] modal-backdrop flex items-center justify-center p-gutter-mobile">
        <div class="bg-surface-crisp rounded-xl shadow-xl max-w-md w-full p-space-xl flex flex-col gap-space-lg">
          <div class="flex items-center gap-space-sm">
            <div class="w-10 h-10 rounded-lg bg-error-container flex items-center justify-center">
              <span class="material-symbols-outlined text-error text-[22px]">warning</span>
            </div>
            <div>
              <h3 class="font-headline-sm text-headline-sm text-text-primary">Confirm Role Transition</h3>
              <p class="font-body-sm text-body-sm text-text-secondary">This action is recorded in the immutable audit trail.</p>
            </div>
          </div>

          <div class="p-space-md bg-surface-subtle rounded-lg">
            <p class="font-body-md text-body-md text-text-primary">
              You are about to change the role of <strong>Shri Anand Sharma</strong> from
              <span class="font-mono-code text-ashoka-blue font-bold">ADMIN</span> to
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
              class="w-full px-space-md py-2.5 bg-surface-subtle rounded-lg text-text-primary font-mono-code text-body-md focus:outline-none focus:ring-2 focus:ring-error shadow-sm placeholder:text-text-muted"
              placeholder="Type CONFIRM here..."
              oninput="window.usersPage.checkConfirm()"
            />
          </div>

          <div class="flex items-center gap-space-sm">
            <button
              class="flex-1 py-2.5 rounded-lg bg-surface-subtle text-text-secondary font-label-md text-label-md hover:bg-surface-muted transition-colors"
              onclick="window.usersPage.closeModal()"
            >Cancel</button>
            <button
              id="modal-confirm-btn"
              disabled
              class="flex-1 py-2.5 rounded-lg bg-error text-on-error font-label-md text-label-md hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm font-semibold"
              onclick="window.usersPage.executeRoleChange()"
            >Execute Role Change</button>
          </div>
        </div>
      </div>
    </div>`;
}

window.usersPage = {
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
  },

  checkConfirm() {
    const input = document.getElementById('confirm-input');
    const btn = document.getElementById('modal-confirm-btn');
    if (btn) btn.disabled = input?.value !== 'CONFIRM';
  },

  executeRoleChange() {
    showToast('Role transition committed to audit trail. User role updated successfully.', 'success');
    this.closeModal();
  },
};

registerPage('users', render);
