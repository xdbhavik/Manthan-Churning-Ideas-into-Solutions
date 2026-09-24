// ============================================================
// Screen 4: Enterprise User Management System (Live API)
// ============================================================
import { registerPage, showToast, getState } from '../app.js';
import {
  lookupUser,
  changeUserRole,
  onboardEvaluator,
  registerNewUser,
  fetchAllUsers,
  resetUserPassword,
  revokeUserSessions,
  createEvaluatorProfile,
  requestOtp,
  decodeJwtPayload,
  getAccessToken,
} from '../api.js';

// ============================================================
// State
// ============================================================
let userDirectory = [];
let filteredUsers = [];
let isTableLoading = false;
let activeRoleFilter = 'ALL';
let activeKycFilter = 'ALL';
let searchQuery = '';
let currentPage = 0;
let pageSize = 10;
let selectedUser = null;
let drawerOpen = false;
let drawerTab = 0;

// Modal states
let provisionModalOpen = false;
let roleModalOpen = false;
let roleModalUser = null;
let securityModalOpen = false;
let securityModalUser = null;
let securityTab = 0;

// ============================================================
// Seed Accounts (fallback when /users endpoint is unavailable)
// ============================================================
function getSeedAccounts() {
  const token = getAccessToken();
  const jwt = token ? decodeJwtPayload(token) : null;
  const storedUser = getState()?.user;
  const seeds = [];

  // Add self (active session user)
  if (jwt) {
    seeds.push({
      userId: jwt.sub || jwt.userId || '00000000-0000-0000-0000-000000000000',
      phone: storedUser?.phone || jwt.phone || '',
      email: storedUser?.email || jwt.email || '',
      name: storedUser?.name || '',
      role: (storedUser?.role || jwt.role || 'ADMIN').toUpperCase(),
      kycStatus: 'VERIFIED',
      createdAt: new Date().toISOString(),
      linkedSourceId: null,
      _source: 'session',
    });
  }
  return seeds;
}

// ============================================================
// Data Loading
// ============================================================
async function loadUserDirectory() {
  isTableLoading = true;
  renderAppContent();

  try {
    const result = await fetchAllUsers();
    if (result === null) {
      // Endpoint not available, use seed accounts
      userDirectory = getSeedAccounts();
      showToast('User list endpoint unavailable. Showing session and known accounts.', 'info');
    } else if (Array.isArray(result)) {
      userDirectory = result.map(normalizeUser);
    } else if (result && result.content && Array.isArray(result.content)) {
      userDirectory = result.content.map(normalizeUser);
    } else {
      userDirectory = getSeedAccounts();
    }
  } catch (err) {
    console.error('Failed to load user directory:', err);
    userDirectory = getSeedAccounts();
    if (err.status !== 404 && err.status !== 405) {
      showToast(err.message || 'Failed to load user directory.', 'error');
    }
  } finally {
    isTableLoading = false;
    applyFilters();
    renderAppContent();
  }
}

function normalizeUser(u) {
  return {
    userId: u.userId || u.id || u.uuid || '',
    phone: u.phone || u.mobile || '',
    email: u.email || '',
    name: u.name || u.displayName || u.fullName || '',
    role: (u.role || 'SUBMITTER').toUpperCase(),
    kycStatus: (u.kycStatus || u.verificationStatus || 'UNVERIFIED').toUpperCase(),
    createdAt: u.createdAt || u.registeredAt || '',
    linkedSourceId: u.sourceAccountId || u.linkedSourceId || null,
    organizationName: u.organizationName || u.sourceName || null,
    _source: u._source || 'api',
  };
}

function applyFilters() {
  let result = [...userDirectory];

  // Role filter
  if (activeRoleFilter !== 'ALL') {
    result = result.filter(u => u.role === activeRoleFilter);
  }

  // KYC filter
  if (activeKycFilter !== 'ALL') {
    if (activeKycFilter === 'VERIFIED') {
      result = result.filter(u => u.kycStatus === 'VERIFIED');
    } else {
      result = result.filter(u => u.kycStatus !== 'VERIFIED');
    }
  }

  // Search query
  if (searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    result = result.filter(u =>
      (u.phone && u.phone.includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.userId && u.userId.toLowerCase().includes(q))
    );
  }

  filteredUsers = result;
  // Reset to first page on filter change
  if (currentPage * pageSize >= filteredUsers.length && currentPage > 0) {
    currentPage = 0;
  }
}

// ============================================================
// Stat Computations
// ============================================================
function getStats() {
  const all = userDirectory;
  return {
    total: all.length,
    evaluators: all.filter(u => u.role === 'EVALUATOR').length,
    staff: all.filter(u => u.role === 'REVIEWER' || u.role === 'ADMIN').length,
    unverified: all.filter(u => u.role === 'SUBMITTER' && u.kycStatus !== 'VERIFIED').length,
  };
}

// ============================================================
// Rendering
// ============================================================
function renderAppContent() {
  const container = document.getElementById('app-content');
  if (container) {
    container.innerHTML = render();
    bindEventListeners();
  }
}

function render() {
  const stats = getStats();
  const totalPages = Math.ceil(filteredUsers.length / pageSize);
  const pageUsers = filteredUsers.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  return `
    <div class="flex flex-col w-full gap-space-lg">
      <!-- Header -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
        <div>
          <div class="flex items-center gap-space-xs mb-1">
            <span class="font-mono-code text-label-sm text-saffron-accent uppercase tracking-wider font-bold">ADMIN-EXCLUSIVE MODULE</span>
            <span class="text-text-muted text-label-sm">•</span>
            <span class="font-mono-code text-label-sm text-text-muted">ENTERPRISE USER MANAGEMENT</span>
          </div>
          <h2 class="font-headline-lg text-headline-lg text-ashoka-blue tracking-tight">User Authority & Role Registry</h2>
          <p class="font-body-md text-body-md text-text-secondary mt-space-2xs">Comprehensive user directory, RBAC governance, credential management, and evaluator provisioning.</p>
        </div>
        <div class="flex items-center gap-space-sm flex-wrap">
          <button onclick="window.usersPage.openProvisionModal()" class="um-btn um-btn-primary" id="btn-provision-user">
            <span class="material-symbols-outlined text-[18px]">person_add</span>
            <span>+ Provision New User</span>
          </button>
          <button onclick="window.usersPage.refreshTable()" class="um-btn um-btn-outline" id="btn-refresh-table">
            <span class="material-symbols-outlined text-[18px]">refresh</span>
            <span>Refresh</span>
          </button>
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-status-action-bg text-status-action-text font-label-sm text-label-sm font-bold border border-status-action-border">
            <span class="material-symbols-outlined text-[14px]">lock</span>
            ADMIN ONLY
          </span>
        </div>
      </div>

      <!-- Stat Counter Bar -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-space-md">
        ${renderStatCard('group', 'Total Accounts', stats.total, 'bg-institutional-navy')}
        ${renderStatCard('biotech', 'Evaluators Active', stats.evaluators, 'bg-gov-emerald')}
        ${renderStatCard('shield_person', 'Reviewers / Staff', stats.staff, 'bg-saffron-accent')}
        ${renderStatCard('pending', 'Unverified KYC', stats.unverified, 'bg-surface-variant')}
      </div>

      <!-- Master Directory Table -->
      <div class="bg-surface-crisp rounded-xl shadow-sm border border-border-hairline overflow-hidden">
        <!-- Search & Filter Bar -->
        <div class="p-space-lg border-b border-border-hairline">
          <div class="flex flex-col lg:flex-row lg:items-center gap-space-md">
            <!-- Search Input -->
            <div class="relative flex-1 min-w-0">
              <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-text-muted">search</span>
              <input
                type="text"
                id="um-search-input"
                value="${escapeHtml(searchQuery)}"
                class="w-full pl-9 pr-3 py-2.5 bg-surface-subtle rounded-lg text-text-primary font-body-md focus:bg-surface-crisp focus:outline-none focus:ring-2 focus:ring-ashoka-blue transition-all placeholder:text-text-muted shadow-sm border border-border-hairline"
                placeholder="Search by name, phone, email, or UUID..."
              />
            </div>

            <!-- KYC Filter -->
            <div class="flex items-center gap-2">
              <span class="text-xs text-text-muted font-semibold whitespace-nowrap">KYC:</span>
              ${['ALL', 'VERIFIED', 'UNVERIFIED'].map(k => `
                <button onclick="window.usersPage.setKycFilter('${k}')" class="um-filter-chip ${activeKycFilter === k ? 'um-filter-chip-active' : ''}">${k === 'ALL' ? 'All' : k === 'VERIFIED' ? '✓ Verified' : '○ Unverified'}</button>
              `).join('')}
            </div>
          </div>

          <!-- Role Tabs -->
          <div class="flex items-center gap-1.5 mt-space-md flex-wrap">
            ${[
              { key: 'ALL', label: 'All Users', count: userDirectory.length },
              { key: 'ADMIN', label: 'Admins', count: userDirectory.filter(u => u.role === 'ADMIN').length },
              { key: 'EVALUATOR', label: 'Evaluators', count: userDirectory.filter(u => u.role === 'EVALUATOR').length },
              { key: 'REVIEWER', label: 'Reviewers', count: userDirectory.filter(u => u.role === 'REVIEWER').length },
              { key: 'SUBMITTER', label: 'Submitters', count: userDirectory.filter(u => u.role === 'SUBMITTER').length },
            ].map(tab => `
              <button onclick="window.usersPage.setRoleFilter('${tab.key}')" class="um-role-tab ${activeRoleFilter === tab.key ? 'um-role-tab-active' : ''}">
                ${tab.label}
                <span class="um-role-tab-count">${tab.count}</span>
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Table -->
        ${isTableLoading ? `
          <div class="p-12 text-center text-text-muted flex flex-col items-center justify-center gap-3">
            <div class="w-8 h-8 rounded-full border-2 border-ashoka-blue border-t-transparent animate-spin"></div>
            <span>Loading user directory from Sovereign Registry...</span>
          </div>
        ` : filteredUsers.length === 0 ? `
          <div class="p-12 text-center text-text-muted flex flex-col items-center justify-center gap-3">
            <span class="material-symbols-outlined text-[48px] text-border-strong">person_off</span>
            <span class="text-body-md">No users match your current filters.</span>
            <button onclick="window.usersPage.clearFilters()" class="um-btn um-btn-outline text-xs mt-2">Clear All Filters</button>
          </div>
        ` : `
          <div class="overflow-x-auto">
            <table class="w-full text-left">
              <thead>
                <tr class="bg-surface-subtle border-b border-border-hairline">
                  <th class="um-th">Identity / Name</th>
                  <th class="um-th">Contact</th>
                  <th class="um-th">Assigned Role</th>
                  <th class="um-th">KYC Status</th>
                  <th class="um-th">Linked Entity</th>
                  <th class="um-th">Created</th>
                  <th class="um-th text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${pageUsers.map((u, i) => renderUserRow(u, i)).join('')}
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          <div class="flex items-center justify-between px-space-lg py-space-md border-t border-border-hairline bg-surface-subtle/50">
            <div class="flex items-center gap-space-sm">
              <span class="text-xs text-text-muted">Rows per page:</span>
              <select id="um-page-size" class="um-select-mini">
                ${[10, 25, 50].map(s => `<option value="${s}" ${pageSize === s ? 'selected' : ''}>${s}</option>`).join('')}
              </select>
              <span class="text-xs text-text-muted ml-2">
                Showing ${currentPage * pageSize + 1}–${Math.min((currentPage + 1) * pageSize, filteredUsers.length)} of ${filteredUsers.length}
              </span>
            </div>
            <div class="flex items-center gap-1">
              <button onclick="window.usersPage.prevPage()" ${currentPage === 0 ? 'disabled' : ''} class="um-pagination-btn">
                <span class="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>
              <span class="text-xs text-text-secondary font-semibold px-2">${currentPage + 1} / ${totalPages || 1}</span>
              <button onclick="window.usersPage.nextPage()" ${currentPage >= totalPages - 1 ? 'disabled' : ''} class="um-pagination-btn">
                <span class="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>
          </div>
        `}
      </div>
    </div>

    <!-- Modals & Drawers -->
    ${renderProvisionModal()}
    ${renderRoleMutationModal()}
    ${renderSecurityModal()}
    ${renderInspectionDrawer()}
  `;
}

// ============================================================
// Stat Card
// ============================================================
function renderStatCard(icon, label, value, bgClass) {
  return `
    <div class="bg-surface-crisp rounded-xl p-space-lg shadow-sm border border-border-hairline flex items-center gap-space-md hover:shadow-md transition-shadow">
      <div class="w-11 h-11 rounded-lg ${bgClass} text-on-primary flex items-center justify-center flex-shrink-0 shadow-sm">
        <span class="material-symbols-outlined text-[24px]">${icon}</span>
      </div>
      <div class="flex flex-col min-w-0">
        <span class="font-headline-md text-headline-md text-ashoka-blue font-bold">${value}</span>
        <span class="font-label-sm text-label-sm text-text-muted uppercase tracking-wider truncate">${label}</span>
      </div>
    </div>
  `;
}

// ============================================================
// User Table Row
// ============================================================
function renderUserRow(u, idx) {
  const initials = getInitials(u.name || u.email || u.phone || 'U');
  const roleStyle = getRoleBadgeStyle(u.role);
  const kycStyle = u.kycStatus === 'VERIFIED'
    ? 'bg-status-approved-bg text-status-approved-text border-status-approved-border'
    : 'bg-status-review-bg text-status-review-text border-status-review-border';
  const kycIcon = u.kycStatus === 'VERIFIED' ? 'verified' : 'pending';
  const uuidSnippet = u.userId ? u.userId.substring(0, 8) + '…' : 'N/A';

  return `
    <tr class="um-table-row border-b border-border-hairline last:border-0">
      <!-- Identity -->
      <td class="um-td">
        <div class="flex items-center gap-space-sm">
          <div class="w-9 h-9 rounded-lg ${roleStyle.iconBg} text-on-primary flex items-center justify-center flex-shrink-0 text-xs font-bold shadow-sm">
            ${initials}
          </div>
          <div class="flex flex-col min-w-0">
            <span class="text-sm font-semibold text-text-primary truncate">${escapeHtml(u.name || u.email?.split('@')[0]?.toUpperCase() || 'Unnamed Account')}</span>
            <button onclick="window.usersPage.copyUuid('${escapeHtml(u.userId)}')" class="font-mono-code text-[10px] text-text-muted hover:text-ashoka-blue transition-colors text-left truncate cursor-pointer" title="Click to copy full UUID">
              ${uuidSnippet}
            </button>
          </div>
        </div>
      </td>
      <!-- Contact -->
      <td class="um-td">
        <div class="flex flex-col gap-0.5">
          <span class="font-mono-code text-xs text-text-primary">${u.phone ? formatPhone(u.phone) : '—'}</span>
          <span class="text-[11px] ${u.email ? 'text-text-secondary' : 'text-text-muted italic'} truncate max-w-[160px]">${u.email || 'None Assigned'}</span>
        </div>
      </td>
      <!-- Role -->
      <td class="um-td">
        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${roleStyle.badge} font-label-sm text-label-sm font-bold uppercase tracking-wider">
          ${u.role}
        </span>
      </td>
      <!-- KYC -->
      <td class="um-td">
        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${kycStyle} font-label-sm text-label-sm font-bold border">
          <span class="material-symbols-outlined text-[12px]">${kycIcon}</span>
          ${u.kycStatus || 'UNVERIFIED'}
        </span>
      </td>
      <!-- Linked Entity -->
      <td class="um-td">
        <span class="text-xs ${u.organizationName ? 'text-text-primary font-medium' : 'text-text-muted italic'}">${escapeHtml(u.organizationName || 'Direct Account')}</span>
      </td>
      <!-- Created -->
      <td class="um-td">
        <span class="text-xs text-text-secondary">${formatDateShort(u.createdAt)}</span>
      </td>
      <!-- Actions -->
      <td class="um-td text-right">
        <div class="flex items-center justify-end gap-1">
          <button onclick="window.usersPage.inspectUser('${escapeHtml(u.userId)}')" class="um-action-btn" title="Inspect / View Profile">
            <span class="material-symbols-outlined text-[18px]">visibility</span>
          </button>
          <button onclick="window.usersPage.openRoleMutationModal('${escapeHtml(u.userId)}')" class="um-action-btn" title="Mutate Role">
            <span class="material-symbols-outlined text-[18px]">swap_horiz</span>
          </button>
          <button onclick="window.usersPage.openSecurityModal('${escapeHtml(u.userId)}')" class="um-action-btn" title="Security / Credentials">
            <span class="material-symbols-outlined text-[18px]">security</span>
          </button>
        </div>
      </td>
    </tr>
  `;
}

// ============================================================
// Modal 1: Provision New User
// ============================================================
function renderProvisionModal() {
  if (!provisionModalOpen) return '';
  return `
    <div id="provision-modal" class="um-modal-backdrop" onclick="window.usersPage.closeProvisionModal(event)">
      <div class="um-modal-panel max-w-lg" onclick="event.stopPropagation()">
        <!-- Header -->
        <div class="flex items-center gap-space-sm mb-space-lg">
          <div class="w-10 h-10 rounded-lg bg-institutional-navy flex items-center justify-center">
            <span class="material-symbols-outlined text-on-primary text-[22px]">person_add</span>
          </div>
          <div>
            <h3 class="font-headline-sm text-headline-sm text-text-primary font-bold">Provision New User</h3>
            <p class="font-body-sm text-body-sm text-text-secondary">Unified user creation across all system roles.</p>
          </div>
          <button onclick="window.usersPage.closeProvisionModal()" class="ml-auto um-action-btn">
            <span class="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form id="provision-form" onsubmit="event.preventDefault(); window.usersPage.submitProvision();" class="flex flex-col gap-space-md">
          <!-- Target Role (Radio Tiles) -->
          <div>
            <label class="um-form-label">Target Role *</label>
            <div class="grid grid-cols-2 gap-2 mt-1.5">
              ${['EVALUATOR', 'REVIEWER', 'SUBMITTER', 'ADMIN'].map(role => `
                <label class="um-radio-tile cursor-pointer" id="role-tile-${role.toLowerCase()}">
                  <input type="radio" name="provision-role" value="${role}" class="hidden" onchange="window.usersPage.onProvisionRoleChange()" ${role === 'EVALUATOR' ? 'checked' : ''} />
                  <div class="flex items-center gap-2">
                    <span class="w-7 h-7 rounded-md ${getRoleBadgeStyle(role).iconBg} text-on-primary flex items-center justify-center text-xs">
                      <span class="material-symbols-outlined text-[16px]">${getRoleIcon(role)}</span>
                    </span>
                    <div class="flex flex-col">
                      <span class="text-xs font-bold text-text-primary">${role}</span>
                      <span class="text-[10px] text-text-muted">${getRoleTierLabel(role)}</span>
                    </div>
                  </div>
                </label>
              `).join('')}
            </div>
          </div>

          <!-- Phone -->
          <div>
            <label class="um-form-label" for="prov-phone">Official Mobile Number *</label>
            <div class="flex items-center rounded-lg border border-border-hairline bg-surface-subtle overflow-hidden mt-1">
              <span class="px-3 py-2 bg-surface-muted text-text-primary font-mono-code text-sm font-semibold border-r border-border-hairline">+91</span>
              <input type="tel" id="prov-phone" maxlength="10" class="w-full px-3 py-2 bg-transparent font-mono-code text-sm text-text-primary focus:outline-none" placeholder="98XXXXXXXX" required />
            </div>
          </div>

          <!-- Name (conditional) -->
          <div id="prov-name-group">
            <label class="um-form-label" for="prov-name">Full Name / Nodal Officer Name *</label>
            <input type="text" id="prov-name" class="um-form-input mt-1" placeholder="Enter full name..." />
          </div>

          <!-- Email -->
          <div id="prov-email-group">
            <label class="um-form-label" for="prov-email">Official Email Address</label>
            <input type="email" id="prov-email" class="um-form-input mt-1" placeholder="officer@ministry.gov.in" />
          </div>

          <!-- Password Section (conditional, hidden for EVALUATOR) -->
          <div id="prov-password-section" class="hidden">
            <label class="um-form-label">Initial Access Method</label>
            <div class="flex items-center gap-space-md mt-1.5">
              <label class="flex items-center gap-1.5 text-xs cursor-pointer">
                <input type="radio" name="prov-access-method" value="otp" checked onchange="window.usersPage.togglePasswordField()" class="accent-ashoka-blue" />
                OTP-Based (Default)
              </label>
              <label class="flex items-center gap-1.5 text-xs cursor-pointer">
                <input type="radio" name="prov-access-method" value="password" onchange="window.usersPage.togglePasswordField()" class="accent-ashoka-blue" />
                Static Password
              </label>
            </div>
            <div id="prov-password-fields" class="hidden mt-2">
              <div class="flex items-stretch gap-2">
                <input type="text" id="prov-password" class="um-form-input flex-1 font-mono-code" placeholder="Enter or generate password..." />
                <button type="button" onclick="window.usersPage.generatePassword()" class="um-btn um-btn-outline text-xs whitespace-nowrap">
                  <span class="material-symbols-outlined text-[14px]">casino</span> Generate
                </button>
              </div>
            </div>
          </div>

          <!-- Evaluator Pool (conditional, shown for EVALUATOR) -->
          <div id="prov-eval-pool-section">
            <label class="um-form-label" for="prov-eval-pool">Evaluator Pool (Optional)</label>
            <select id="prov-eval-pool" class="um-form-input mt-1">
              <option value="">— Skip profile setup —</option>
              <option value="GOVERNMENT">Government</option>
              <option value="INDUSTRY">Industry</option>
              <option value="HEI">Higher Education Institution (HEI)</option>
              <option value="CITIZEN">Citizen Expert</option>
              <option value="COMMUNITY">Community</option>
            </select>
          </div>

          <!-- Info Box -->
          <div class="p-space-md bg-status-submitted-bg rounded-lg flex items-start gap-space-sm border border-status-submitted-border">
            <span class="material-symbols-outlined text-institutional-navy text-[18px] mt-0.5">info</span>
            <p class="font-body-sm text-body-sm text-status-submitted-text" id="prov-info-text">
              An EVALUATOR profile will be created via <code class="font-mono-code text-[11px]">POST /users/evaluators</code> and an initial OTP challenge minted.
            </p>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-space-sm pt-space-xs">
            <button type="button" onclick="window.usersPage.closeProvisionModal()" class="um-btn um-btn-outline flex-1">Cancel</button>
            <button type="submit" id="prov-submit-btn" class="um-btn um-btn-primary flex-1">
              <span class="material-symbols-outlined text-[18px]">add_circle</span>
              Provision Account
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
}

// ============================================================
// Modal 2: RBAC Role Mutation
// ============================================================
function renderRoleMutationModal() {
  if (!roleModalOpen || !roleModalUser) return '';
  const u = roleModalUser;
  return `
    <div id="role-modal" class="um-modal-backdrop" onclick="window.usersPage.closeRoleMutationModal(event)">
      <div class="um-modal-panel max-w-md" onclick="event.stopPropagation()">
        <div class="flex items-center gap-space-sm mb-space-lg">
          <div class="w-10 h-10 rounded-lg bg-saffron-accent flex items-center justify-center">
            <span class="material-symbols-outlined text-on-primary text-[22px]">swap_horiz</span>
          </div>
          <div>
            <h3 class="font-headline-sm text-headline-sm text-text-primary font-bold">RBAC Role Mutation</h3>
            <p class="font-body-sm text-body-sm text-text-secondary">Authoritative role transition for <span class="font-mono-code text-xs">${escapeHtml(u.userId?.substring(0, 8))}…</span></p>
          </div>
          <button onclick="window.usersPage.closeRoleMutationModal()" class="ml-auto um-action-btn">
            <span class="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <!-- Current -> Proposed -->
        <div class="p-space-md bg-surface-subtle rounded-lg flex items-center justify-between gap-3 border border-border-hairline mb-space-md">
          <div>
            <span class="font-label-sm text-label-sm text-text-muted uppercase block">Current Role</span>
            <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full ${getRoleBadgeStyle(u.role).badge} font-label-md text-label-md font-bold uppercase mt-1">${u.role}</span>
          </div>
          <span class="material-symbols-outlined text-[24px] text-text-muted">arrow_forward</span>
          <div>
            <span class="font-label-sm text-label-sm text-text-muted uppercase block">Proposed New Role</span>
            <select id="rm-new-role" class="mt-1 px-3 py-1.5 rounded-lg bg-surface-crisp text-text-primary font-label-md text-label-md focus:outline-none focus:ring-2 focus:ring-ashoka-blue shadow-sm border border-border-hairline" onchange="window.usersPage.updateRoleWarning()">
              ${['SUBMITTER', 'REVIEWER', 'EVALUATOR', 'ADMIN'].map(r => `<option value="${r}" ${u.role === r ? 'selected' : ''}>${r}</option>`).join('')}
            </select>
          </div>
        </div>

        <!-- Safety Warning -->
        <div id="rm-warning" class="p-space-md bg-error-container/30 rounded-lg flex items-start gap-space-sm border border-error/20 mb-space-md">
          <span class="material-symbols-outlined text-error text-[18px] mt-0.5">warning</span>
          <p class="font-body-sm text-body-sm text-text-primary" id="rm-warning-text">
            <strong>Caution:</strong> Elevating to <code class="font-mono-code font-bold">ADMIN</code> grants unrestricted system access including KYC sign-offs, role modifications, and evaluation publication.
          </p>
        </div>

        <!-- Confirmation Guard -->
        <div class="flex flex-col gap-space-xs mb-space-md">
          <label class="font-label-md text-label-md text-text-primary">
            Type <code class="font-mono-code text-error bg-error-container/30 px-1 py-0.5 rounded">CONFIRM</code> to proceed
          </label>
          <input type="text" id="rm-confirm-input" class="um-form-input font-mono-code" placeholder="Type CONFIRM here..." oninput="window.usersPage.checkRoleConfirm()" />
        </div>

        <div class="flex items-center gap-space-sm">
          <button class="um-btn um-btn-outline flex-1" onclick="window.usersPage.closeRoleMutationModal()">Cancel</button>
          <button id="rm-execute-btn" disabled class="um-btn flex-1 py-2.5 rounded-lg bg-error text-on-error font-label-md text-label-md hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm font-semibold cursor-pointer" onclick="window.usersPage.executeRoleMutation()">Execute Transition</button>
        </div>
      </div>
    </div>
  `;
}

// ============================================================
// Modal 3: Security & Credential Operations
// ============================================================
function renderSecurityModal() {
  if (!securityModalOpen || !securityModalUser) return '';
  const u = securityModalUser;
  const tabs = ['Reset Password', 'Dispatch OTP', 'Terminate Sessions'];

  return `
    <div id="security-modal" class="um-modal-backdrop" onclick="window.usersPage.closeSecurityModal(event)">
      <div class="um-modal-panel max-w-lg" onclick="event.stopPropagation()">
        <div class="flex items-center gap-space-sm mb-space-lg">
          <div class="w-10 h-10 rounded-lg bg-error flex items-center justify-center">
            <span class="material-symbols-outlined text-on-primary text-[22px]">security</span>
          </div>
          <div>
            <h3 class="font-headline-sm text-headline-sm text-text-primary font-bold">Security & Credentials</h3>
            <p class="font-body-sm text-body-sm text-text-secondary">${escapeHtml(u.name || 'User')} • <span class="font-mono-code text-xs">${escapeHtml(u.userId?.substring(0, 8))}…</span></p>
          </div>
          <button onclick="window.usersPage.closeSecurityModal()" class="ml-auto um-action-btn">
            <span class="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <!-- Tab Headers -->
        <div class="flex items-center border-b border-border-hairline mb-space-lg">
          ${tabs.map((t, i) => `
            <button onclick="window.usersPage.setSecurityTab(${i})" class="px-space-md py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${securityTab === i ? 'border-ashoka-blue text-ashoka-blue' : 'border-transparent text-text-muted hover:text-text-secondary'}">${t}</button>
          `).join('')}
        </div>

        <!-- Tab Content -->
        ${securityTab === 0 ? `
          <!-- Tab 1: Reset Password -->
          <form onsubmit="event.preventDefault(); window.usersPage.submitPasswordReset();" class="flex flex-col gap-space-md">
            <div>
              <label class="um-form-label" for="sec-new-pw">New Password</label>
              <input type="password" id="sec-new-pw" class="um-form-input mt-1 font-mono-code" placeholder="Enter new password..." required minlength="8" />
              <div id="sec-pw-strength" class="mt-1.5 h-1.5 rounded-full bg-surface-muted overflow-hidden">
                <div class="h-full rounded-full transition-all duration-300" style="width:0%; background:#94A3B8;"></div>
              </div>
            </div>
            <div>
              <label class="um-form-label" for="sec-confirm-pw">Confirm New Password</label>
              <input type="password" id="sec-confirm-pw" class="um-form-input mt-1 font-mono-code" placeholder="Confirm password..." required />
            </div>
            <button type="submit" id="sec-pw-submit" class="um-btn um-btn-primary w-full">
              <span class="material-symbols-outlined text-[18px]">lock_reset</span>
              Reset Password
            </button>
          </form>
        ` : securityTab === 1 ? `
          <!-- Tab 2: Dispatch OTP -->
          <div class="flex flex-col items-center gap-space-lg py-space-lg">
            <div class="w-16 h-16 rounded-2xl bg-status-submitted-bg flex items-center justify-center">
              <span class="material-symbols-outlined text-institutional-navy text-[36px]">sms</span>
            </div>
            <div class="text-center">
              <p class="text-body-md text-text-primary font-semibold">Dispatch Emergency OTP</p>
              <p class="text-body-sm text-text-secondary mt-1">A new 6-digit OTP challenge will be generated and dispatched to:</p>
              <p class="font-mono-code text-lg text-ashoka-blue font-bold mt-2">${u.phone ? '+91 ' + formatPhone(u.phone) : 'No phone registered'}</p>
            </div>
            <button onclick="window.usersPage.dispatchOtp()" class="um-btn um-btn-primary" id="sec-otp-btn" ${!u.phone ? 'disabled' : ''}>
              <span class="material-symbols-outlined text-[18px]">send</span>
              Dispatch OTP Now
            </button>
          </div>
        ` : `
          <!-- Tab 3: Terminate Sessions -->
          <div class="flex flex-col items-center gap-space-lg py-space-lg">
            <div class="w-16 h-16 rounded-2xl bg-error-container flex items-center justify-center">
              <span class="material-symbols-outlined text-error text-[36px]">block</span>
            </div>
            <div class="text-center">
              <p class="text-body-md text-text-primary font-semibold">Terminate All Active Sessions</p>
              <p class="text-body-sm text-text-secondary mt-1">This will invalidate all refresh tokens for this user, forcing immediate re-authentication across all devices.</p>
            </div>
            <div class="p-space-md bg-error-container/30 rounded-lg flex items-start gap-space-sm border border-error/20 w-full">
              <span class="material-symbols-outlined text-error text-[18px] mt-0.5">warning</span>
              <p class="font-body-sm text-body-sm text-text-primary"><strong>Warning:</strong> This action cannot be undone. The user will be logged out immediately.</p>
            </div>
            <button onclick="window.usersPage.terminateSessions()" class="um-btn py-2.5 rounded-lg bg-error text-on-error font-label-md text-label-md hover:brightness-110 transition-all shadow-sm font-semibold cursor-pointer" id="sec-revoke-btn">
              <span class="material-symbols-outlined text-[18px]">gpp_bad</span>
              Invalidate All Refresh Tokens
            </button>
          </div>
        `}
      </div>
    </div>
  `;
}

// ============================================================
// Side Drawer: User Deep Inspection
// ============================================================
function renderInspectionDrawer() {
  if (!drawerOpen || !selectedUser) return '';
  const u = selectedUser;
  const tabs = ['Account Metadata', 'Quick Lookup'];

  return `
    <div id="inspect-drawer-backdrop" class="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm transition-opacity" onclick="window.usersPage.closeDrawer()"></div>
    <div id="inspect-drawer" class="fixed top-0 right-0 bottom-0 z-[95] w-full max-w-lg bg-surface-crisp shadow-2xl border-l border-border-hairline overflow-y-auto um-drawer-slide">
      <!-- Drawer Header -->
      <div class="sticky top-0 z-10 bg-surface-crisp border-b border-border-hairline p-space-lg">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-space-md">
            <div class="w-12 h-12 rounded-xl ${getRoleBadgeStyle(u.role).iconBg} text-on-primary flex items-center justify-center text-lg font-bold shadow-md">
              ${getInitials(u.name || u.email || u.phone || 'U')}
            </div>
            <div>
              <h3 class="font-headline-sm text-headline-sm text-ashoka-blue font-bold">${escapeHtml(u.name || 'Unnamed Account')}</h3>
              <div class="flex items-center gap-2 mt-0.5">
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${getRoleBadgeStyle(u.role).badge} font-label-sm text-label-sm font-bold uppercase">${u.role}</span>
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${u.kycStatus === 'VERIFIED' ? 'bg-status-approved-bg text-status-approved-text' : 'bg-status-review-bg text-status-review-text'} font-label-sm text-label-sm font-bold">
                  <span class="material-symbols-outlined text-[12px]">${u.kycStatus === 'VERIFIED' ? 'verified' : 'pending'}</span>
                  KYC ${u.kycStatus || 'UNVERIFIED'}
                </span>
              </div>
            </div>
          </div>
          <button onclick="window.usersPage.closeDrawer()" class="um-action-btn">
            <span class="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>

        <!-- Drawer Tabs -->
        <div class="flex items-center gap-0 mt-space-md border-b border-border-hairline -mx-space-lg px-space-lg">
          ${tabs.map((t, i) => `
            <button onclick="window.usersPage.setDrawerTab(${i})" class="px-space-md py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${drawerTab === i ? 'border-ashoka-blue text-ashoka-blue' : 'border-transparent text-text-muted hover:text-text-secondary'}">${t}</button>
          `).join('')}
        </div>
      </div>

      <!-- Drawer Content -->
      <div class="p-space-lg">
        ${drawerTab === 0 ? `
          <!-- Tab 1: Account Metadata -->
          <div class="grid grid-cols-1 gap-space-md">
            ${renderMetaField('badge', 'User UUID', u.userId, true)}
            ${renderMetaField('phone_iphone', 'Official Mobile', u.phone ? '+91 ' + formatPhone(u.phone) : 'Not registered')}
            ${renderMetaField('email', 'Official Email', u.email || 'None assigned')}
            ${renderMetaField('shield_person', 'Assigned Role', u.role)}
            ${renderMetaField('verified_user', 'KYC Status', u.kycStatus || 'UNVERIFIED')}
            ${renderMetaField('calendar_today', 'Account Created', formatDate(u.createdAt))}
            ${renderMetaField('link', 'Linked Source ID', u.linkedSourceId || 'None (Direct Account)', !!u.linkedSourceId)}
            ${renderMetaField('apartment', 'Organization', u.organizationName || 'Direct Account')}
            ${renderMetaField('military_tech', 'Clearance Tier', getClearanceTier(u.role))}
          </div>

          <!-- Quick Actions in Drawer -->
          <div class="mt-space-xl pt-space-lg border-t border-border-hairline">
            <span class="um-form-label mb-space-sm block">Quick Actions</span>
            <div class="flex flex-col gap-2">
              <button onclick="window.usersPage.openRoleMutationModal('${escapeHtml(u.userId)}')" class="um-btn um-btn-outline w-full justify-start">
                <span class="material-symbols-outlined text-[18px]">swap_horiz</span>
                Mutate Role
              </button>
              <button onclick="window.usersPage.openSecurityModal('${escapeHtml(u.userId)}')" class="um-btn um-btn-outline w-full justify-start">
                <span class="material-symbols-outlined text-[18px]">security</span>
                Security & Credentials
              </button>
            </div>
          </div>
        ` : `
          <!-- Tab 2: Quick Identity Resolver -->
          <div class="flex flex-col gap-space-md">
            <p class="text-body-sm text-text-secondary">Quickly resolve and inspect known system identities for debugging and cross-referencing.</p>
            <div class="flex flex-wrap gap-2">
              ${[
                { label: 'Admin (Self)', id: getAdminSelfId(), role: 'ADMIN' },
                { label: 'Reviewer Officer', id: '22222222-2222-4222-8222-222222222222', role: 'REVIEWER' },
                { label: 'Submitter Nodal', id: '33333333-3333-4333-8333-333333333333', role: 'SUBMITTER' },
                { label: 'Evaluator Lead', id: '44444444-4444-4444-8444-444444444444', role: 'EVALUATOR' },
              ].map(p => `
                <button onclick="window.usersPage.quickLookup('${p.id}')" class="um-btn um-btn-outline text-xs">
                  <span class="material-symbols-outlined text-[14px]">${getRoleIcon(p.role)}</span>
                  ${p.label}
                </button>
              `).join('')}
            </div>

            <!-- Lookup Input in Drawer -->
            <div class="flex items-stretch gap-2 mt-space-sm">
              <input type="text" id="drawer-lookup-input" class="um-form-input flex-1 font-mono-code text-xs" placeholder="Enter UUID to resolve..." />
              <button onclick="window.usersPage.drawerLookup()" class="um-btn um-btn-primary text-xs">Resolve</button>
            </div>

            <!-- Lookup Result Area -->
            <div id="drawer-lookup-result" class="mt-2"></div>
          </div>
        `}
      </div>
    </div>
  `;
}

function renderMetaField(icon, label, value, isMono = false) {
  return `
    <div class="flex items-start gap-space-sm p-space-md bg-surface-subtle rounded-lg border border-border-hairline">
      <span class="material-symbols-outlined text-[18px] text-text-muted mt-0.5">${icon}</span>
      <div class="flex flex-col min-w-0 flex-1">
        <span class="font-label-sm text-label-sm text-text-muted uppercase">${label}</span>
        <span class="${isMono ? 'font-mono-code text-xs' : 'text-body-md'} text-text-primary font-medium mt-0.5 break-all">${escapeHtml(String(value))}</span>
      </div>
    </div>
  `;
}

// ============================================================
// Helpers
// ============================================================
function getRoleIcon(role) {
  switch (role) {
    case 'ADMIN': return 'admin_panel_settings';
    case 'REVIEWER': return 'rate_review';
    case 'EVALUATOR': return 'biotech';
    default: return 'person';
  }
}

function getRoleBadgeStyle(role) {
  switch (role) {
    case 'ADMIN': return { iconBg: 'bg-error', badge: 'bg-red-50 text-red-700 border-red-200' };
    case 'EVALUATOR': return { iconBg: 'bg-gov-emerald', badge: 'bg-status-approved-bg text-status-approved-text border-status-approved-border' };
    case 'REVIEWER': return { iconBg: 'bg-saffron-accent', badge: 'bg-status-action-bg text-status-action-text border-status-action-border' };
    default: return { iconBg: 'bg-institutional-navy', badge: 'bg-status-submitted-bg text-status-submitted-text border-status-submitted-border' };
  }
}

function getRoleTierLabel(role) {
  switch (role) {
    case 'ADMIN': return 'Sovereign Root';
    case 'REVIEWER': return 'Review Officer';
    case 'EVALUATOR': return 'Technical Panel';
    default: return 'Submitter Node';
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

function getInitials(str) {
  if (!str) return 'U';
  return str.split(/[\s@.]+/).filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'U';
}

function formatPhone(phone) {
  if (!phone) return '';
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 10) return `${clean.slice(0, 5)} ${clean.slice(5)}`;
  return clean;
}

function formatDate(iso) {
  if (!iso) return 'N/A';
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return String(iso);
  }
}

function formatDateShort(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
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

function getAdminSelfId() {
  const token = getAccessToken();
  const jwt = token ? decodeJwtPayload(token) : null;
  return jwt?.sub || jwt?.userId || '11111111-1111-4111-8111-111111111111';
}

function generateSecurePassword() {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const special = '!@#$%^&*';
  const all = upper + lower + digits + special;
  let pw = '';
  pw += upper[Math.floor(Math.random() * upper.length)];
  pw += lower[Math.floor(Math.random() * lower.length)];
  pw += digits[Math.floor(Math.random() * digits.length)];
  pw += special[Math.floor(Math.random() * special.length)];
  for (let i = 0; i < 12; i++) pw += all[Math.floor(Math.random() * all.length)];
  return pw.split('').sort(() => Math.random() - 0.5).join('');
}

function findUserById(userId) {
  return userDirectory.find(u => u.userId === userId) || null;
}

// ============================================================
// Event Binding (post-render)
// ============================================================
function bindEventListeners() {
  // Search input debounce
  const searchInput = document.getElementById('um-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', debounce(() => {
      searchQuery = searchInput.value;
      currentPage = 0;
      applyFilters();
      renderAppContent();
    }, 250));
  }

  // Page size selector
  const pageSizeSelect = document.getElementById('um-page-size');
  if (pageSizeSelect) {
    pageSizeSelect.addEventListener('change', () => {
      pageSize = parseInt(pageSizeSelect.value, 10);
      currentPage = 0;
      renderAppContent();
    });
  }

  // Password strength meter
  const pwInput = document.getElementById('sec-new-pw');
  if (pwInput) {
    pwInput.addEventListener('input', () => {
      const strength = calculatePasswordStrength(pwInput.value);
      const bar = document.querySelector('#sec-pw-strength > div');
      if (bar) {
        bar.style.width = strength.percent + '%';
        bar.style.background = strength.color;
      }
    });
  }

  // Provision role tile highlighting
  highlightProvisionRoleTile();

  // ESC to close modals
  document.addEventListener('keydown', handleEscKey);
}

function handleEscKey(e) {
  if (e.key === 'Escape') {
    if (provisionModalOpen) { provisionModalOpen = false; renderAppContent(); }
    else if (roleModalOpen) { roleModalOpen = false; roleModalUser = null; renderAppContent(); }
    else if (securityModalOpen) { securityModalOpen = false; securityModalUser = null; renderAppContent(); }
    else if (drawerOpen) { drawerOpen = false; selectedUser = null; renderAppContent(); }
  }
}

function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

function calculatePasswordStrength(pw) {
  let score = 0;
  if (pw.length >= 8) score += 25;
  if (pw.length >= 12) score += 15;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score += 20;
  if (/\d/.test(pw)) score += 20;
  if (/[^a-zA-Z0-9]/.test(pw)) score += 20;
  const colors = { 0: '#94A3B8', 25: '#EF4444', 45: '#F59E0B', 65: '#0D9488', 80: '#059669' };
  let color = '#94A3B8';
  for (const [threshold, c] of Object.entries(colors)) {
    if (score >= parseInt(threshold)) color = c;
  }
  return { percent: Math.min(score, 100), color };
}

function highlightProvisionRoleTile() {
  const selected = document.querySelector('input[name="provision-role"]:checked');
  document.querySelectorAll('.um-radio-tile').forEach(tile => {
    tile.classList.remove('um-radio-tile-active');
  });
  if (selected) {
    const tile = selected.closest('.um-radio-tile');
    if (tile) tile.classList.add('um-radio-tile-active');
  }
}

// ============================================================
// Global Handlers (window.usersPage)
// ============================================================
window.usersPage = {
  // ---- Filters ----
  setRoleFilter(role) {
    activeRoleFilter = role;
    currentPage = 0;
    applyFilters();
    renderAppContent();
  },

  setKycFilter(status) {
    activeKycFilter = status;
    currentPage = 0;
    applyFilters();
    renderAppContent();
  },

  clearFilters() {
    activeRoleFilter = 'ALL';
    activeKycFilter = 'ALL';
    searchQuery = '';
    currentPage = 0;
    applyFilters();
    renderAppContent();
  },

  // ---- Pagination ----
  prevPage() {
    if (currentPage > 0) { currentPage--; renderAppContent(); }
  },

  nextPage() {
    const totalPages = Math.ceil(filteredUsers.length / pageSize);
    if (currentPage < totalPages - 1) { currentPage++; renderAppContent(); }
  },

  // ---- Refresh ----
  refreshTable() {
    loadUserDirectory();
  },

  // ---- Copy UUID ----
  copyUuid(uuid) {
    navigator.clipboard.writeText(uuid).then(() => {
      showToast('UUID copied to clipboard.', 'success');
    }).catch(() => {
      showToast('Failed to copy UUID.', 'error');
    });
  },

  // ---- Inspect Drawer ----
  inspectUser(userId) {
    const u = findUserById(userId);
    if (u) {
      selectedUser = u;
      drawerOpen = true;
      drawerTab = 0;
      renderAppContent();
    } else {
      // Try API lookup
      lookupUser(userId).then(res => {
        selectedUser = normalizeUser(res);
        drawerOpen = true;
        drawerTab = 0;
        renderAppContent();
      }).catch(err => {
        showToast(err.message || 'User not found.', 'error');
      });
    }
  },

  closeDrawer() {
    drawerOpen = false;
    selectedUser = null;
    renderAppContent();
  },

  setDrawerTab(idx) {
    drawerTab = idx;
    renderAppContent();
  },

  // ---- Quick Lookup in Drawer ----
  async quickLookup(userId) {
    const resultArea = document.getElementById('drawer-lookup-result');
    if (resultArea) resultArea.innerHTML = '<div class="text-xs text-text-muted text-center py-4"><div class="w-5 h-5 rounded-full border-2 border-ashoka-blue border-t-transparent animate-spin mx-auto mb-2"></div>Resolving...</div>';
    try {
      const res = await lookupUser(userId);
      const u = normalizeUser(res);
      // Update drawer to show this user
      selectedUser = u;
      drawerTab = 0;
      renderAppContent();
    } catch (err) {
      if (resultArea) resultArea.innerHTML = `<div class="text-xs text-error text-center py-4">${escapeHtml(err.message)}</div>`;
    }
  },

  async drawerLookup() {
    const input = document.getElementById('drawer-lookup-input');
    const val = input?.value?.trim();
    if (!val) { showToast('Enter a UUID to resolve.', 'error'); return; }
    await this.quickLookup(val);
  },

  // ---- Provision Modal ----
  openProvisionModal() {
    provisionModalOpen = true;
    renderAppContent();
  },

  closeProvisionModal(event) {
    if (event && event.target !== event.currentTarget && !event.target.closest('.um-action-btn[onclick*="closeProvisionModal"]')) return;
    provisionModalOpen = false;
    renderAppContent();
  },

  onProvisionRoleChange() {
    highlightProvisionRoleTile();
    const role = document.querySelector('input[name="provision-role"]:checked')?.value;
    const nameGroup = document.getElementById('prov-name-group');
    const emailGroup = document.getElementById('prov-email-group');
    const pwSection = document.getElementById('prov-password-section');
    const poolSection = document.getElementById('prov-eval-pool-section');
    const infoText = document.getElementById('prov-info-text');

    if (role === 'EVALUATOR') {
      if (pwSection) pwSection.classList.add('hidden');
      if (poolSection) poolSection.classList.remove('hidden');
      if (infoText) infoText.innerHTML = 'An EVALUATOR profile will be created via <code class="font-mono-code text-[11px]">POST /users/evaluators</code> and an initial OTP challenge minted.';
    } else {
      if (pwSection) pwSection.classList.remove('hidden');
      if (poolSection) poolSection.classList.add('hidden');
      if (role === 'ADMIN') {
        if (infoText) infoText.innerHTML = '<strong>Warning:</strong> Creating an ADMIN account grants unrestricted system access. The user will be registered and immediately elevated to ADMIN role.';
      } else if (role === 'REVIEWER') {
        if (infoText) infoText.innerHTML = 'User will be registered as SUBMITTER first, then immediately elevated to REVIEWER via role mutation.';
      } else {
        if (infoText) infoText.innerHTML = 'User will be registered as a SUBMITTER with standard access permissions.';
      }
    }
  },

  togglePasswordField() {
    const method = document.querySelector('input[name="prov-access-method"]:checked')?.value;
    const fields = document.getElementById('prov-password-fields');
    if (fields) {
      fields.classList.toggle('hidden', method !== 'password');
    }
  },

  generatePassword() {
    const pw = generateSecurePassword();
    const input = document.getElementById('prov-password');
    if (input) { input.value = pw; input.type = 'text'; }
    showToast('Secure random password generated.', 'success');
  },

  async submitProvision() {
    const role = document.querySelector('input[name="provision-role"]:checked')?.value;
    const phone = (document.getElementById('prov-phone')?.value || '').replace(/\D/g, '');
    const name = document.getElementById('prov-name')?.value?.trim() || '';
    const email = document.getElementById('prov-email')?.value?.trim() || '';

    if (phone.length !== 10) {
      showToast('Please enter a valid 10-digit mobile number.', 'error');
      return;
    }

    const btn = document.getElementById('prov-submit-btn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<div class="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div> Provisioning...'; }

    try {
      if (role === 'EVALUATOR') {
        // Step 1: Create evaluator
        const res = await onboardEvaluator(phone);
        showToast(`Evaluator provisioned! User ID: ${res.userId || 'Created'}`, 'success');

        // Step 2 (optional): Create evaluator profile
        const pool = document.getElementById('prov-eval-pool')?.value;
        if (pool) {
          try {
            await createEvaluatorProfile(pool);
            showToast(`Evaluator profile created for pool: ${pool}`, 'success');
          } catch (profileErr) {
            showToast(`Evaluator created, but profile setup failed: ${profileErr.message}`, 'error');
          }
        }

        // Add to local table
        const newUser = normalizeUser({
          userId: res.userId || res.id,
          phone: phone,
          name: name,
          email: email,
          role: 'EVALUATOR',
          kycStatus: 'UNVERIFIED',
          createdAt: new Date().toISOString(),
        });
        userDirectory.unshift(newUser);

      } else {
        // SUBMITTER, REVIEWER, or ADMIN path
        const accessMethod = document.querySelector('input[name="prov-access-method"]:checked')?.value;
        const password = accessMethod === 'password' ? document.getElementById('prov-password')?.value : undefined;

        const res = await registerNewUser(phone, name, email, password);
        const newUserId = res.userId || res.id || res.user?.userId;
        showToast(`User registered! User ID: ${newUserId || 'Created'}`, 'success');

        // If REVIEWER or ADMIN, chain role elevation
        if ((role === 'REVIEWER' || role === 'ADMIN') && newUserId) {
          try {
            await changeUserRole(newUserId, role);
            showToast(`Role elevated to ${role}.`, 'success');
          } catch (roleErr) {
            showToast(`User created but role elevation failed: ${roleErr.message}`, 'error');
          }
        }

        // Add to local table
        const newUser = normalizeUser({
          userId: newUserId,
          phone: phone,
          name: name,
          email: email,
          role: role,
          kycStatus: 'UNVERIFIED',
          createdAt: new Date().toISOString(),
        });
        userDirectory.unshift(newUser);
      }

      provisionModalOpen = false;
      applyFilters();
      renderAppContent();
    } catch (err) {
      console.error('Provision error:', err);
      showToast(err.message || 'Failed to provision user account.', 'error');
      if (btn) { btn.disabled = false; btn.innerHTML = '<span class="material-symbols-outlined text-[18px]">add_circle</span> Provision Account'; }
    }
  },

  // ---- Role Mutation Modal ----
  openRoleMutationModal(userId) {
    const u = findUserById(userId);
    if (!u) {
      lookupUser(userId).then(res => {
        roleModalUser = normalizeUser(res);
        roleModalOpen = true;
        renderAppContent();
      }).catch(err => showToast(err.message, 'error'));
      return;
    }
    roleModalUser = u;
    roleModalOpen = true;
    renderAppContent();
  },

  closeRoleMutationModal(event) {
    if (event && event.target !== event.currentTarget && !event.target.closest('.um-action-btn[onclick*="closeRoleMutationModal"]')) return;
    roleModalOpen = false;
    roleModalUser = null;
    renderAppContent();
  },

  updateRoleWarning() {
    const newRole = document.getElementById('rm-new-role')?.value;
    const warningText = document.getElementById('rm-warning-text');
    if (!warningText) return;
    if (newRole === 'ADMIN') {
      warningText.innerHTML = '<strong>Caution:</strong> Elevating to <code class="font-mono-code font-bold">ADMIN</code> grants unrestricted system access including KYC sign-offs, role modifications, and evaluation publication.';
    } else if (roleModalUser && (roleModalUser.role === 'ADMIN' || roleModalUser.role === 'EVALUATOR') && (newRole === 'SUBMITTER' || newRole === 'REVIEWER')) {
      warningText.innerHTML = `<strong>Demotion:</strong> Changing from <code class="font-mono-code font-bold">${roleModalUser.role}</code> to <code class="font-mono-code font-bold">${newRole}</code> will immediately reduce access privileges. Current session tokens will be invalidated on next refresh.`;
    } else {
      warningText.innerHTML = `Role will be changed to <code class="font-mono-code font-bold">${newRole}</code>. This transition takes effect immediately on next token issuance and is recorded in the audit ledger.`;
    }
  },

  checkRoleConfirm() {
    const input = document.getElementById('rm-confirm-input');
    const btn = document.getElementById('rm-execute-btn');
    if (btn) btn.disabled = input?.value?.trim() !== 'CONFIRM';
  },

  async executeRoleMutation() {
    if (!roleModalUser) return;
    const newRole = document.getElementById('rm-new-role')?.value;
    if (!newRole) return;

    const btn = document.getElementById('rm-execute-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Updating Role...'; }

    try {
      const updated = await changeUserRole(roleModalUser.userId, newRole);
      // Update local directory
      const idx = userDirectory.findIndex(u => u.userId === roleModalUser.userId);
      if (idx >= 0) {
        userDirectory[idx] = normalizeUser({ ...userDirectory[idx], ...(updated || {}), role: newRole });
      }
      showToast(`Role updated to ${newRole} for ${roleModalUser.userId.substring(0, 8)}…`, 'success');
      roleModalOpen = false;
      roleModalUser = null;
      applyFilters();
      renderAppContent();
    } catch (err) {
      console.error('Role mutation error:', err);
      showToast(err.message || 'Failed to update user role.', 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'Execute Transition'; }
    }
  },

  // ---- Security Modal ----
  openSecurityModal(userId) {
    const u = findUserById(userId);
    if (!u) {
      lookupUser(userId).then(res => {
        securityModalUser = normalizeUser(res);
        securityModalOpen = true;
        securityTab = 0;
        renderAppContent();
      }).catch(err => showToast(err.message, 'error'));
      return;
    }
    securityModalUser = u;
    securityModalOpen = true;
    securityTab = 0;
    renderAppContent();
  },

  closeSecurityModal(event) {
    if (event && event.target !== event.currentTarget && !event.target.closest('.um-action-btn[onclick*="closeSecurityModal"]')) return;
    securityModalOpen = false;
    securityModalUser = null;
    renderAppContent();
  },

  setSecurityTab(idx) {
    securityTab = idx;
    renderAppContent();
  },

  async submitPasswordReset() {
    if (!securityModalUser) return;
    const newPw = document.getElementById('sec-new-pw')?.value;
    const confirmPw = document.getElementById('sec-confirm-pw')?.value;
    if (!newPw || newPw.length < 8) { showToast('Password must be at least 8 characters.', 'error'); return; }
    if (newPw !== confirmPw) { showToast('Passwords do not match.', 'error'); return; }

    const btn = document.getElementById('sec-pw-submit');
    if (btn) { btn.disabled = true; btn.innerHTML = '<div class="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div> Resetting...'; }

    try {
      await resetUserPassword(securityModalUser.userId, newPw);
      showToast('Password reset successfully.', 'success');
      securityModalOpen = false;
      securityModalUser = null;
      renderAppContent();
    } catch (err) {
      showToast(err.message || 'Password reset failed. The endpoint may not be available.', 'error');
      if (btn) { btn.disabled = false; btn.innerHTML = '<span class="material-symbols-outlined text-[18px]">lock_reset</span> Reset Password'; }
    }
  },

  async dispatchOtp() {
    if (!securityModalUser || !securityModalUser.phone) return;
    const btn = document.getElementById('sec-otp-btn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<div class="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div> Dispatching...'; }

    try {
      await requestOtp(securityModalUser.phone);
      const maskedPhone = securityModalUser.phone.replace(/(\d{5})(\d{5})/, '$1 $2');
      showToast(`New 6-digit OTP challenge generated and dispatched to +91 ${maskedPhone}.`, 'success');
      if (btn) { btn.disabled = false; btn.innerHTML = '<span class="material-symbols-outlined text-[18px]">send</span> Dispatch OTP Now'; }
    } catch (err) {
      showToast(err.message || 'Failed to dispatch OTP.', 'error');
      if (btn) { btn.disabled = false; btn.innerHTML = '<span class="material-symbols-outlined text-[18px]">send</span> Dispatch OTP Now'; }
    }
  },

  async terminateSessions() {
    if (!securityModalUser) return;
    const btn = document.getElementById('sec-revoke-btn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<div class="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div> Revoking...'; }

    try {
      await revokeUserSessions(securityModalUser.userId);
      showToast(`All active sessions terminated for ${securityModalUser.userId.substring(0, 8)}…`, 'success');
      if (btn) { btn.disabled = false; btn.innerHTML = '<span class="material-symbols-outlined text-[18px]">gpp_bad</span> Invalidate All Refresh Tokens'; }
    } catch (err) {
      showToast(err.message || 'Failed to revoke sessions. The endpoint may not be available.', 'error');
      if (btn) { btn.disabled = false; btn.innerHTML = '<span class="material-symbols-outlined text-[18px]">gpp_bad</span> Invalidate All Refresh Tokens'; }
    }
  },
};

// ============================================================
// Page Registration & Lifecycle
// ============================================================
function renderPage() {
  return render();
}

renderPage.afterRender = function () {
  if (userDirectory.length === 0 && !isTableLoading) {
    loadUserDirectory();
  } else {
    bindEventListeners();
  }
};

registerPage('users', renderPage);
