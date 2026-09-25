// ============================================================
// Screen 5: Registrations – Dual-Tab Statutory Authority Engine
// Tab A: Entity Registration Queue (KYC Triage & Decision Console)
// Tab B: Source Identity Verification Console
// ============================================================
import { registerPage, showToast } from '../app.js';
import {
  fetchRegistrations,
  assignRegistration,
  approveRegistration,
  rejectRegistration,
  requestActionRegistration,
  fetchRegistrationDetail,
  fetchRegistrationHistory,
  fetchSources,
  verifySource,
  fetchSourceVerificationHistory,
} from '../api.js';

// ── State ──
let registrationsList = [];
let sourcesList = [];
let currentTab = 'registrations'; // 'registrations' | 'sources'
let currentFilter = 'ALL';
let categoryFilter = 'ALL';
let searchFilter = '';
let isLoading = true;
let sourcesLoading = true;

// Detail view state
let detailViewId = null;
let detailData = null;
let detailHistory = [];
let detailLoading = false;
let decisionChoice = null; // 'APPROVE' | 'REQUEST_ACTION' | 'REJECT'
let attestChecked = false;
let commentText = '';

// Source verification modal state
let verifyModalSourceId = null;
let verifyModalSource = null;
let verifyMethod = '';
let verifyResult = '';
let verifyNotes = '';
let verifyEvidenceUrl = '';
let verifyAttest = false;
let verifyHistory = [];
let verifyHistoryOpen = false;

// Pagination
let currentPage = 0;
let pageSize = 10;

// Debounce timer
let searchDebounce = null;

// ── Helpers ──
function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    + ', ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function relDate(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 1) return 'Just now';
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

function slaBadge(iso) {
  if (!iso) return '';
  const hrs = (Date.now() - new Date(iso).getTime()) / 3600000;
  if (hrs > 48) return `<span class="reg-sla-badge reg-sla-breach">SLA BREACH ${Math.floor(hrs)}h</span>`;
  if (hrs > 36) return `<span class="reg-sla-badge reg-sla-warn">SLA ${Math.floor(48 - hrs)}h left</span>`;
  return `<span class="reg-sla-badge reg-sla-ok">${Math.floor(48 - hrs)}h remaining</span>`;
}

function statusChip(status) {
  const map = {
    'SUBMITTED': 'reg-chip-submitted',
    'UNDER_REVIEW': 'reg-chip-review',
    'ACTION_REQUIRED': 'reg-chip-action',
    'APPROVED': 'reg-chip-approved',
    'REJECTED': 'reg-chip-rejected',
  };
  const cls = map[status] || 'reg-chip-submitted';
  const pulse = status === 'UNDER_REVIEW' ? '<span class="reg-pulse"></span>' : '';
  return `<span class="reg-chip ${cls}">${pulse}${status?.replace(/_/g, ' ') || 'UNKNOWN'}</span>`;
}

function entityTypeLabel(bucket, type) {
  const labels = {
    'PRI': 'Panchayati Raj Institution (PRI)',
    'ULB': 'Urban Local Body (ULB)',
    'GRAM_PANCHAYAT': 'Gram Panchayat (PRI)',
    'MUNICIPAL_COUNCIL': 'Municipal Council (ULB)',
    'MUNICIPAL_CORPORATION': 'Municipal Corporation (ULB)',
    'NGO': 'Non-Governmental Org (NGO)',
    'STARTUP': 'Startup Entity',
    'PRIVATE_COMPANY': 'Private Company',
    'PUBLIC_COMPANY': 'Public Company',
    'GOVT_DEPT': 'Government Department',
    'HEI': 'Higher Education Institution (HEI)',
  };
  return labels[type] || `${bucket || 'ENTITY'} • ${type || 'GENERAL'}`;
}

function bucketBadge(bucket) {
  const colors = {
    'GOVT': 'bg-blue-100 text-blue-800',
    'CITIZEN': 'bg-green-100 text-green-800',
    'INDUSTRY': 'bg-purple-100 text-purple-800',
    'COMMUNITY': 'bg-amber-100 text-amber-800',
    'HEI': 'bg-teal-100 text-teal-800',
  };
  return colors[bucket] || 'bg-gray-100 text-gray-700';
}

function truncUUID(id) {
  if (!id) return '—';
  return `<span class="font-mono-code text-[11px] text-ashoka-blue cursor-pointer select-all" title="${id}" onclick="navigator.clipboard.writeText('${id}');window.regPage.toast('UUID copied','success')">${id.slice(0, 8)}…${id.slice(-4)}</span>`;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Computed Stats ──
function getStats() {
  const submitted = registrationsList.filter(r => r.status === 'SUBMITTED').length;
  const underReview = registrationsList.filter(r => r.status === 'UNDER_REVIEW').length;
  const actionReq = registrationsList.filter(r => r.status === 'ACTION_REQUIRED').length;
  const decided = registrationsList.filter(r => r.status === 'APPROVED' || r.status === 'REJECTED').length;
  const total = registrationsList.length;

  // SLA compliance: % of decided cases resolved within 48h
  let slaCompliant = 0;
  let slaTotal = 0;
  registrationsList.forEach(r => {
    if (r.status === 'APPROVED' || r.status === 'REJECTED') {
      slaTotal++;
      if (r.submittedAt && r.decidedAt) {
        const hrs = (new Date(r.decidedAt) - new Date(r.submittedAt)) / 3600000;
        if (hrs <= 48) slaCompliant++;
      } else {
        slaCompliant++; // If no timestamps, assume compliant
      }
    }
  });
  const slaPct = slaTotal > 0 ? Math.round((slaCompliant / slaTotal) * 100) : 100;

  return { submitted, underReview, actionReq, decided, total, slaPct };
}

function getSourceStats() {
  const total = sourcesList.length;
  const verified = sourcesList.filter(s => s.verifiedSource === true || s.verified === true || s.verificationStatus === 'VERIFIED').length;
  const awaiting = sourcesList.filter(s => s.verifiedSource === false || s.verified === false || s.verificationStatus === 'AWAITING').length;
  const needsReview = sourcesList.filter(s => s.verificationStatus === 'NEEDS_REVIEW' || s.verificationStatus === 'FLAGGED').length;
  return { total, verified, awaiting: total - verified - needsReview, needsReview };
}

// ── Filtered & Paginated Data ──
function getFiltered() {
  return registrationsList.filter(r => {
    // Status filter
    if (currentFilter === 'SUBMITTED' && r.status !== 'SUBMITTED') return false;
    if (currentFilter === 'UNDER_REVIEW' && r.status !== 'UNDER_REVIEW') return false;
    if (currentFilter === 'ACTION_REQUIRED' && r.status !== 'ACTION_REQUIRED') return false;
    if (currentFilter === 'DECIDED' && r.status !== 'APPROVED' && r.status !== 'REJECTED') return false;
    // Category filter
    if (categoryFilter !== 'ALL' && r.sourceBucket !== categoryFilter) return false;
    // Search
    if (searchFilter) {
      const q = searchFilter.toLowerCase();
      const name = (r.source?.organizationName || r.source?.citizenName || '').toLowerCase();
      const id = (r.registrationId || '').toLowerCase();
      const type = (r.sourceType || '').toLowerCase();
      const bucket = (r.sourceBucket || '').toLowerCase();
      const pan = (r.source?.pan || '').toLowerCase();
      const cin = (r.source?.cin || '').toLowerCase();
      const lgd = (r.source?.lgdCode || '').toLowerCase();
      if (!name.includes(q) && !id.includes(q) && !type.includes(q) && !bucket.includes(q) && !pan.includes(q) && !cin.includes(q) && !lgd.includes(q)) return false;
    }
    return true;
  });
}

function getPaginated(filtered) {
  const start = currentPage * pageSize;
  return filtered.slice(start, start + pageSize);
}

// ══════════════════════════════════════════════════════════════
// MAIN RENDER
// ══════════════════════════════════════════════════════════════
function render() {
  if (detailViewId) return renderDetail();
  if (verifyModalSourceId) return renderWithVerifyModal();
  return currentTab === 'registrations' ? renderRegistrationsTab() : renderSourcesTab();
}

// ── Tab Header ──
function renderTabHeader() {
  return `
    <div class="reg-tab-bar">
      <button onclick="window.regPage.switchTab('registrations')" class="reg-tab ${currentTab === 'registrations' ? 'reg-tab-active' : ''}">
        <span class="material-symbols-outlined text-[18px]">how_to_reg</span>
        <span>Entity Registration Queue</span>
        <span class="reg-tab-badge">${registrationsList.length}</span>
      </button>
      <button onclick="window.regPage.switchTab('sources')" class="reg-tab ${currentTab === 'sources' ? 'reg-tab-active' : ''}">
        <span class="material-symbols-outlined text-[18px]">verified_user</span>
        <span>Source Identity Verification</span>
        <span class="reg-tab-badge">${sourcesList.length}</span>
      </button>
    </div>`;
}

// ══════════════════════════════════════════════════════════════
// TAB A: REGISTRATION QUEUE
// ══════════════════════════════════════════════════════════════
function renderRegistrationsTab() {
  const stats = getStats();
  const filtered = getFiltered();
  const paginated = getPaginated(filtered);
  const totalPages = Math.ceil(filtered.length / pageSize);

  return `
    <div class="flex flex-col w-full gap-space-lg">
      ${renderTabHeader()}

      <!-- Stat Counter Header -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-space-md">
        <div class="reg-stat-card">
          <div class="flex flex-col">
            <span class="reg-stat-label">Pending Intake</span>
            <span class="reg-stat-value" style="color:#0284C7">${stats.submitted}</span>
            <span class="reg-stat-sub"><span class="material-symbols-outlined text-[13px]">schedule</span>Triage Stage</span>
          </div>
          <div class="reg-stat-icon" style="background:#EFF6FF;color:#0284C7">
            <span class="material-symbols-outlined">inbox</span>
          </div>
        </div>
        <div class="reg-stat-card">
          <div class="flex flex-col">
            <span class="reg-stat-label">Under Review / Active</span>
            <span class="reg-stat-value" style="color:#1E3A8A">${stats.underReview}</span>
            <span class="reg-stat-sub"><span class="material-symbols-outlined text-[13px] animate-pulse">hourglass_top</span>Active Caseload</span>
          </div>
          <div class="reg-stat-icon" style="background:#EFF6FF;color:#1E3A8A">
            <span class="material-symbols-outlined">pending_actions</span>
          </div>
        </div>
        <div class="reg-stat-card">
          <div class="flex flex-col">
            <span class="reg-stat-label">Decided History</span>
            <span class="reg-stat-value" style="color:#0D9488">${stats.decided}</span>
            <span class="reg-stat-sub"><span class="material-symbols-outlined text-[13px]">check_circle</span>Approved + Rejected</span>
          </div>
          <div class="reg-stat-icon" style="background:#F0FDFA;color:#0D9488">
            <span class="material-symbols-outlined">grading</span>
          </div>
        </div>
        <div class="reg-stat-card">
          <div class="flex flex-col">
            <span class="reg-stat-label">Statutory SLA Compliance</span>
            <span class="reg-stat-value" style="color:${stats.slaPct >= 80 ? '#0D9488' : stats.slaPct >= 50 ? '#F59E0B' : '#EF4444'}">${stats.slaPct}%</span>
            <span class="reg-stat-sub"><span class="material-symbols-outlined text-[13px]">timer</span>Target &lt; 48 Hours</span>
          </div>
          <div class="reg-stat-icon" style="background:${stats.slaPct >= 80 ? '#F0FDFA' : '#FFFBEB'};color:${stats.slaPct >= 80 ? '#0D9488' : '#F59E0B'}">
            <span class="material-symbols-outlined">speed</span>
          </div>
        </div>
      </div>

      <!-- Filter Controls -->
      <div class="reg-toolbar">
        <div class="flex flex-wrap items-center gap-space-xs">
          ${renderFilterPill('ALL', 'Inbox (All)', stats.submitted + stats.underReview + stats.actionReq + stats.decided)}
          ${renderFilterPill('SUBMITTED', 'Inbox (SUBMITTED)', stats.submitted)}
          ${renderFilterPill('UNDER_REVIEW', 'Under Review', stats.underReview)}
          ${renderFilterPill('ACTION_REQUIRED', 'Action Required', stats.actionReq)}
          ${renderFilterPill('DECIDED', 'History / Decided', stats.decided)}
        </div>
        <div class="flex items-center gap-space-sm flex-1 md:flex-initial">
          <div class="relative flex-1 md:w-80">
            <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-text-muted">search</span>
            <input
              id="reg-search-input"
              class="reg-search-input"
              placeholder="Search by Org Name, LGD, CIN, PAN, or Token..."
              type="text"
              value="${escapeHtml(searchFilter)}"
              oninput="window.regPage.handleSearch(this.value)"
            />
          </div>
          <select class="reg-category-select" onchange="window.regPage.setCategory(this.value)">
            <option value="ALL" ${categoryFilter === 'ALL' ? 'selected' : ''}>All Buckets</option>
            <option value="GOVT" ${categoryFilter === 'GOVT' ? 'selected' : ''}>GOVT</option>
            <option value="CITIZEN" ${categoryFilter === 'CITIZEN' ? 'selected' : ''}>CITIZEN</option>
            <option value="INDUSTRY" ${categoryFilter === 'INDUSTRY' ? 'selected' : ''}>INDUSTRY</option>
            <option value="COMMUNITY" ${categoryFilter === 'COMMUNITY' ? 'selected' : ''}>COMMUNITY</option>
            <option value="HEI" ${categoryFilter === 'HEI' ? 'selected' : ''}>HEI</option>
          </select>
          <button onclick="window.regPage.loadData()" class="reg-refresh-btn" title="Refresh Live Queue">
            <span class="material-symbols-outlined text-[20px]">refresh</span>
          </button>
        </div>
      </div>

      <!-- Registration Data Table -->
      <div class="reg-table-container">
        <div class="reg-table-header">
          <div class="flex items-center gap-space-sm">
            <span class="font-headline-sm text-headline-sm text-ashoka-blue font-bold">Application Verification Pool</span>
            <span class="font-mono-code text-body-sm text-text-muted">Live Sync</span>
          </div>
          <span class="reg-table-count">${filtered.length} of ${stats.submitted + stats.underReview + stats.actionReq + stats.decided} records</span>
        </div>

        ${isLoading ? `
          <div class="reg-empty-state">
            <span class="material-symbols-outlined animate-spin text-[32px] text-ashoka-blue">progress_activity</span>
            <span>Fetching real-time queue from Source Service...</span>
          </div>
        ` : filtered.length === 0 ? `
          <div class="reg-empty-state">
            <span class="material-symbols-outlined text-[40px] text-text-muted/60">inbox</span>
            <p class="font-semibold text-text-primary text-base">No registrations in this view</p>
            <p class="text-xs text-text-secondary max-w-sm">No registration records match your current filter criteria.</p>
          </div>
        ` : `
          <div class="overflow-x-auto">
            <table class="w-full text-left">
              <thead>
                <tr class="reg-thead-row">
                  <th class="um-th">Organization & Dossier</th>
                  <th class="um-th">Entity Type</th>
                  <th class="um-th">Submitted Date</th>
                  <th class="um-th">Current Status</th>
                  <th class="um-th text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border-hairline">
                ${paginated.map(r => renderRegistrationRow(r)).join('')}
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          ${totalPages > 1 ? `
            <div class="reg-pagination">
              <div class="flex items-center gap-2">
                <span class="text-xs text-text-muted">Rows per page:</span>
                <select class="um-select-mini" onchange="window.regPage.setPageSize(Number(this.value))">
                  <option value="10" ${pageSize === 10 ? 'selected' : ''}>10</option>
                  <option value="25" ${pageSize === 25 ? 'selected' : ''}>25</option>
                  <option value="50" ${pageSize === 50 ? 'selected' : ''}>50</option>
                </select>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-xs text-text-muted">Page ${currentPage + 1} of ${totalPages}</span>
                <button class="um-pagination-btn" onclick="window.regPage.prevPage()" ${currentPage === 0 ? 'disabled' : ''}>
                  <span class="material-symbols-outlined text-[16px]">chevron_left</span>
                </button>
                <button class="um-pagination-btn" onclick="window.regPage.nextPage()" ${currentPage >= totalPages - 1 ? 'disabled' : ''}>
                  <span class="material-symbols-outlined text-[16px]">chevron_right</span>
                </button>
              </div>
            </div>
          ` : ''}
        `}
      </div>
    </div>`;
}

function renderFilterPill(key, label, count) {
  const active = currentFilter === key;
  const colorMap = {
    'ALL': active ? 'reg-pill-active' : '',
    'SUBMITTED': active ? 'reg-pill-submitted-active' : 'reg-pill-submitted',
    'UNDER_REVIEW': active ? 'reg-pill-review-active' : 'reg-pill-review',
    'ACTION_REQUIRED': active ? 'reg-pill-action-active' : 'reg-pill-action',
    'DECIDED': active ? 'reg-pill-decided-active' : 'reg-pill-decided',
  };
  return `
    <button onclick="window.regPage.setFilter('${key}')" class="reg-filter-pill ${colorMap[key] || ''} ${active ? 'reg-pill-active' : ''}">
      ${key === 'UNDER_REVIEW' ? '<span class="w-2 h-2 rounded-full bg-current animate-pulse"></span>' : ''}
      <span>${label}</span>
      <span class="reg-pill-count">${count}</span>
    </button>`;
}

function renderRegistrationRow(r) {
  const name = r.source?.organizationName || r.source?.citizenName || 'Registration Entity';
  const loc = [r.source?.district, r.source?.state].filter(Boolean).join(', ') || 'Location Pending';
  const identifier = r.source?.pan || r.source?.cin || r.source?.lgdCode || r.registrationId?.slice(0, 12);

  return `
    <tr class="um-table-row cursor-pointer" onclick="window.regPage.openDetail('${r.registrationId}')">
      <td class="um-td">
        <div class="flex flex-col gap-0.5">
          <span class="font-semibold text-text-primary text-sm">${escapeHtml(name)}</span>
          <span class="text-xs text-text-muted">${escapeHtml(loc)}</span>
          <span class="font-mono-code text-[10px] text-ashoka-blue">${escapeHtml(identifier)}</span>
        </div>
      </td>
      <td class="um-td">
        <span class="inline-flex items-center px-2 py-0.5 rounded-full ${bucketBadge(r.sourceBucket)} text-[11px] font-semibold">
          ${entityTypeLabel(r.sourceBucket, r.sourceType)}
        </span>
      </td>
      <td class="um-td">
        <div class="flex flex-col gap-0.5">
          <span class="text-xs text-text-primary">${fmtDate(r.submittedAt)}</span>
          <span class="text-[10px] text-text-muted">${relDate(r.submittedAt)}</span>
        </div>
      </td>
      <td class="um-td">
        ${statusChip(r.status)}
        ${r.assignedReviewerId ? `<div class="flex items-center gap-1 mt-1"><div class="w-4 h-4 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[8px] font-bold">R</div><span class="text-[10px] text-text-muted font-mono-code">${r.assignedReviewerId.slice(0, 8)}</span></div>` : ''}
      </td>
      <td class="um-td text-right">
        <div class="flex items-center justify-end gap-1.5">
          ${r.status === 'SUBMITTED' ? `
            <button onclick="event.stopPropagation(); window.regPage.claimAssignment('${r.registrationId}')" class="reg-action-btn-sm reg-action-claim" title="Assign / Claim">
              <span class="material-symbols-outlined text-[14px]">person_add</span>
            </button>
            <button onclick="event.stopPropagation(); window.regPage.openDetail('${r.registrationId}')" class="reg-action-btn-sm reg-action-review" title="Review & Adjudicate">
              <span class="material-symbols-outlined text-[14px]">gavel</span>
              <span>Review</span>
            </button>
          ` : r.status === 'UNDER_REVIEW' ? `
            <button onclick="event.stopPropagation(); window.regPage.openDetail('${r.registrationId}')" class="reg-action-btn-sm reg-action-review" title="Review Case">
              <span class="material-symbols-outlined text-[14px]">description</span>
              <span>Review Case</span>
            </button>
          ` : r.status === 'ACTION_REQUIRED' ? `
            <button onclick="event.stopPropagation(); window.regPage.openDetail('${r.registrationId}')" class="reg-action-btn-sm reg-action-inspect" title="Inspect Deficiency">
              <span class="material-symbols-outlined text-[14px]">visibility</span>
              <span>Inspect</span>
            </button>
          ` : `
            <button onclick="event.stopPropagation(); window.regPage.openDetail('${r.registrationId}')" class="reg-action-btn-sm" title="View Record">
              <span class="material-symbols-outlined text-[14px]">open_in_new</span>
              <span>View</span>
            </button>
          `}
        </div>
      </td>
    </tr>`;
}

// ══════════════════════════════════════════════════════════════
// REGISTRATION DETAIL & STATUTORY DECISION MODULE
// ══════════════════════════════════════════════════════════════
function renderDetail() {
  const r = detailData;
  if (detailLoading || !r) {
    return `
      <div class="flex flex-col w-full gap-space-lg">
        ${renderTabHeader()}
        <div class="reg-empty-state" style="min-height:300px">
          <span class="material-symbols-outlined animate-spin text-[32px] text-ashoka-blue">progress_activity</span>
          <span>Loading case dossier...</span>
        </div>
      </div>`;
  }

  const name = r.source?.organizationName || r.source?.citizenName || 'Registration Entity';
  const token = r.registrationId || detailViewId;
  const tokenDisplay = `REG-KYC-${new Date(r.submittedAt || Date.now()).getFullYear()}-${(token || '').slice(-5).toUpperCase()}`;
  const canDecide = r.status === 'SUBMITTED' || r.status === 'UNDER_REVIEW';
  const charCount = commentText.length;

  return `
    <div class="flex flex-col w-full gap-space-lg">
      ${renderTabHeader()}

      <!-- Breadcrumbs + Back Button -->
      <div class="flex items-center gap-2">
        <button onclick="window.regPage.closeDetail()" class="reg-back-btn">
          <span class="material-symbols-outlined text-[18px]">arrow_back</span>
          <span>Back to Queue</span>
        </button>
        <span class="text-text-muted text-xs">/</span>
        <span class="text-xs text-text-muted">Registrations</span>
        <span class="text-text-muted text-xs">/</span>
        <span class="text-xs text-text-muted">Details</span>
        <span class="text-text-muted text-xs">/</span>
        <span class="font-mono-code text-xs text-ashoka-blue font-semibold">${tokenDisplay}</span>
        <div class="ml-auto flex items-center gap-2">
          ${slaBadge(r.submittedAt)}
          ${statusChip(r.status)}
        </div>
      </div>

      <!-- Dossier Header -->
      <div class="reg-detail-header">
        <div class="flex items-start gap-space-md">
          <div class="w-12 h-12 rounded-xl bg-ashoka-blue text-on-primary flex items-center justify-center flex-shrink-0 shadow-sm">
            <span class="material-symbols-outlined text-[28px]">account_balance</span>
          </div>
          <div class="flex flex-col gap-1">
            <div class="flex flex-wrap items-center gap-space-sm">
              <span class="font-headline-md text-headline-md text-ashoka-blue font-bold">${escapeHtml(name)}</span>
              ${statusChip(r.status)}
            </div>
            <div class="flex flex-wrap items-center gap-2 text-xs text-text-secondary">
              <span class="font-mono-code bg-surface-subtle px-2 py-0.5 rounded border border-border-hairline">${tokenDisplay}</span>
              <span>•</span>
              <span class="inline-flex items-center px-2 py-0.5 rounded-full ${bucketBadge(r.sourceBucket)} font-semibold">${r.sourceBucket || 'ENTITY'} • ${r.sourceType || 'GENERAL'}</span>
              <span>•</span>
              <span>Submitted by: <span class="font-mono-code">${(r.submittedByUserId || 'N/A').slice(0, 12)}</span></span>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Grid: Details + Decision -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">

        <!-- Left: Entity Metadata + Documents + Audit (7 cols) -->
        <div class="lg:col-span-7 flex flex-col gap-space-lg">

          <!-- Entity Metadata Grid -->
          <div class="reg-section-card">
            <div class="reg-section-title">
              <span class="material-symbols-outlined text-[20px]">assured_workload</span>
              <span>Entity Metadata & Dossier</span>
              <span class="ml-auto reg-live-badge">Live Ingest</span>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
              ${renderMetaField('Institutional Category & Sub-Type', `${r.sourceBucket || 'N/A'} → ${r.sourceType || 'N/A'}`)}
              ${renderMetaField('Statutory Entity Name', name)}
              ${renderMetaField('Official LGD / CIN / PAN Identifier', r.source?.lgdCode || r.source?.cin || r.source?.pan || r.source?.dossierId || 'N/A', true)}
              ${renderMetaField('Authorized Signatory / Head', r.source?.contactPersonName || r.source?.sarpanchName || r.source?.citizenName || 'Designated Signatory')}
              ${renderMetaField('Nodal Officer Phone', r.source?.contactPhone || r.source?.contactNumber || 'N/A', true)}
              ${renderMetaField('Nodal Officer Email', r.source?.contactEmail || r.source?.email || 'N/A')}
              ${renderMetaField('District / State', `${r.source?.district || 'N/A'}, ${r.source?.state || 'N/A'}`)}
              ${renderMetaField('Bank / PFMS Mandate', r.source?.pfmsLinked ? '<span class="text-gov-emerald font-semibold">✓ PFMS Active</span>' : '<span class="text-text-muted">Pending</span>')}
            </div>
          </div>

          <!-- Submitted Registration JSON -->
          <div class="reg-section-card">
            <div class="reg-section-title cursor-pointer" onclick="document.getElementById('reg-json-accordion').classList.toggle('hidden')">
              <span class="material-symbols-outlined text-[20px]">data_object</span>
              <span>Submitted Registration Payload (Read-Only)</span>
              <span class="material-symbols-outlined ml-auto text-[16px] text-text-muted">expand_more</span>
              <button onclick="event.stopPropagation(); navigator.clipboard.writeText(JSON.stringify(${escapeHtml(JSON.stringify(r.source || r))}, null, 2)); window.regPage.toast('Payload copied', 'success')" class="reg-copy-btn ml-2">
                <span class="material-symbols-outlined text-[14px]">content_copy</span>
                Copy Payload
              </button>
            </div>
            <div id="reg-json-accordion" class="hidden">
              <pre class="reg-json-block">${escapeHtml(JSON.stringify(r.source || r, null, 2))}</pre>
            </div>
          </div>

          ${r.actionRequiredComment ? `
            <div class="reg-alert-box reg-alert-amber">
              <span class="material-symbols-outlined text-[22px] shrink-0">announcement</span>
              <div>
                <span class="reg-alert-title">Action Required — Deficiency Notice</span>
                <p class="text-xs text-text-primary mt-0.5 leading-relaxed">${escapeHtml(r.actionRequiredComment)}</p>
              </div>
            </div>
          ` : ''}

          ${r.rejectionReason ? `
            <div class="reg-alert-box reg-alert-red">
              <span class="material-symbols-outlined text-[22px] shrink-0">cancel</span>
              <div>
                <span class="reg-alert-title" style="color:#EF4444">Rejection Ground — Terminal Status</span>
                <p class="text-xs text-text-primary mt-0.5 leading-relaxed">${escapeHtml(r.rejectionReason)}</p>
              </div>
            </div>
          ` : ''}

          <!-- Chronological Audit Ledger -->
          <div class="reg-section-card">
            <div class="reg-section-title">
              <span class="material-symbols-outlined text-[20px]">history</span>
              <span>Chronological Audit Ledger</span>
            </div>
            ${detailHistory.length > 0 ? `
              <div class="reg-timeline">
                ${detailHistory.map((h, i) => `
                  <div class="reg-timeline-item">
                    <div class="reg-timeline-dot ${i === 0 ? 'reg-timeline-dot-active' : ''}"></div>
                    <div class="reg-timeline-content">
                      <div class="flex items-center gap-2 flex-wrap">
                        <span class="text-xs font-bold text-text-primary">${escapeHtml(h.fromStatus || '—')} → ${escapeHtml(h.toStatus || '—')}</span>
                        <span class="font-mono-code text-[10px] text-text-muted">${fmtDate(h.changedAt)}</span>
                      </div>
                      ${h.changedBy ? `<span class="text-[10px] text-text-muted">by <span class="font-mono-code">${escapeHtml(h.changedBy)}</span></span>` : ''}
                      ${h.comment ? `<p class="text-xs text-text-secondary mt-0.5 italic">"${escapeHtml(h.comment)}"</p>` : ''}
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : `
              <div class="text-center py-6 text-text-muted text-xs">
                <span class="material-symbols-outlined text-[24px] block mb-1">timeline</span>
                No audit history available for this registration.
              </div>
            `}
          </div>
        </div>

        <!-- Right: Statutory Decision Module (5 cols) -->
        <div class="lg:col-span-5 flex flex-col gap-space-lg">
          ${canDecide ? renderDecisionConsole(r) : renderDecidedSummary(r)}
        </div>
      </div>
    </div>`;
}

function renderMetaField(label, value, isMono = false) {
  return `
    <div>
      <span class="reg-meta-label">${label}</span>
      <p class="${isMono ? 'font-mono-code' : ''} text-sm text-text-primary font-medium mt-0.5">${value}</p>
    </div>`;
}

function renderDecisionConsole(r) {
  const charCount = commentText.length;
  return `
    <div class="reg-decision-panel sticky top-24">
      <div class="reg-section-title">
        <span class="material-symbols-outlined text-[20px]">gavel</span>
        <span>Quasi-Judicial Statutory Decision</span>
      </div>
      <p class="text-xs text-text-secondary leading-relaxed mb-3">
        Execute statutory workflow decisions. Approved registrations establish active, verified <strong>SourceAccounts</strong> in the database.
      </p>

      <!-- 3 Decision Cards -->
      <div class="flex flex-col gap-2 mb-4">
        <button onclick="window.regPage.setDecision('APPROVE')" class="reg-decision-card ${decisionChoice === 'APPROVE' ? 'reg-decision-card-active-approve' : ''}">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-[20px]">verified</span>
            <span class="font-semibold">APPROVE (Provision)</span>
          </div>
          <p class="text-[10px] text-text-secondary mt-1 leading-relaxed">Submitter KYC is set to VERIFIED. Primary ProblemSource and SourceAccount will be provisioned with active submission rights.</p>
        </button>

        <button onclick="window.regPage.setDecision('REQUEST_ACTION')" class="reg-decision-card ${decisionChoice === 'REQUEST_ACTION' ? 'reg-decision-card-active-action' : ''}">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-[20px]">published_with_changes</span>
            <span class="font-semibold">REQUEST ACTION (Deficiency)</span>
          </div>
          <p class="text-[10px] text-text-secondary mt-1 leading-relaxed">Registration transitions to ACTION_REQUIRED. Edit access unlocked for submitter to address deficient documents or missing data.</p>
        </button>

        <button onclick="window.regPage.setDecision('REJECT')" class="reg-decision-card ${decisionChoice === 'REJECT' ? 'reg-decision-card-active-reject' : ''}">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-[20px]">cancel</span>
            <span class="font-semibold">REJECT (Decline)</span>
          </div>
          <p class="text-[10px] text-text-secondary mt-1 leading-relaxed">Application is recorded in PostgreSQL as REJECTED. Terminal immutable status.</p>
        </button>
      </div>

      <!-- Comment Box -->
      <div class="flex flex-col gap-1.5 mb-3">
        <label class="reg-meta-label flex items-center justify-between" for="reg-decision-comment">
          <span>Official Order / Reviewer Comment ${decisionChoice === 'REQUEST_ACTION' || decisionChoice === 'REJECT' ? '<span style="color:#EF4444">*</span>' : ''}</span>
          <span class="text-text-muted font-normal">${charCount} / 1000</span>
        </label>
        <textarea
          id="reg-decision-comment"
          class="reg-comment-textarea"
          placeholder="Enter mandatory legal findings, document deficiency notes, or statutory gazette citations. A formal notice will be dispatched to the Nodal Officer."
          rows="4"
          maxlength="1000"
          oninput="window.regPage.updateComment(this.value)"
        >${escapeHtml(commentText)}</textarea>
        <p class="text-[10px] text-text-muted">A formal notice will be dispatched directly to the Nodal Officer.</p>
      </div>

      ${decisionChoice === 'REJECT' ? `
        <div class="reg-alert-box reg-alert-red mb-3">
          <span class="material-symbols-outlined text-[16px] shrink-0">warning</span>
          <div>
            <span class="text-[11px] font-bold text-red-700">PERMANENT STATUTORY REJECTION</span>
            <p class="text-[10px] text-text-secondary">Rejection permanently closes this application. A clear, documented justification is mandatory.</p>
          </div>
        </div>
      ` : ''}

      <!-- Attestation Checkbox -->
      <label class="reg-attest-label mb-3">
        <input type="checkbox" ${attestChecked ? 'checked' : ''} onchange="window.regPage.toggleAttest(this.checked)" class="reg-attest-checkbox" />
        <span class="text-[11px] text-text-secondary leading-relaxed">I, ADMINISTRATOR, hereby attest that this administrative review is rendered in accordance with statutory guidelines and verified against official registries.</span>
      </label>

      <!-- Dynamic Submit Button -->
      ${decisionChoice === 'APPROVE' ? `
        <button onclick="window.regPage.executeDecision('${r.registrationId}')" ${!attestChecked ? 'disabled' : ''} class="reg-submit-btn reg-submit-approve">
          <span class="material-symbols-outlined text-[18px]">vpn_key</span>
          Execute Approval & Provision Account
        </button>
      ` : decisionChoice === 'REQUEST_ACTION' ? `
        <button onclick="window.regPage.executeDecision('${r.registrationId}')" ${!attestChecked ? 'disabled' : ''} class="reg-submit-btn reg-submit-action">
          <span class="material-symbols-outlined text-[18px]">send</span>
          Confirm Deficiency & Dispatch Notice
        </button>
      ` : decisionChoice === 'REJECT' ? `
        <button onclick="window.regPage.executeDecision('${r.registrationId}')" ${!attestChecked ? 'disabled' : ''} class="reg-submit-btn reg-submit-reject">
          <span class="material-symbols-outlined text-[18px]">block</span>
          Confirm Permanent Rejection
        </button>
      ` : `
        <div class="text-center py-3 text-xs text-text-muted">
          <span class="material-symbols-outlined text-[20px] block mb-1">touch_app</span>
          Select a decision above to proceed.
        </div>
      `}
    </div>`;
}

function renderDecidedSummary(r) {
  return `
    <div class="reg-decision-panel">
      <div class="reg-section-title">
        <span class="material-symbols-outlined text-[20px]">task_alt</span>
        <span>Case Disposition</span>
      </div>
      <div class="text-center py-6">
        ${r.status === 'APPROVED' ? `
          <div class="w-16 h-16 mx-auto rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
            <span class="material-symbols-outlined text-[36px]">verified</span>
          </div>
          <p class="font-semibold text-emerald-700 text-lg">Application Approved</p>
          <p class="text-xs text-text-muted mt-1">SourceAccount provisioned with active submission rights.</p>
        ` : r.status === 'REJECTED' ? `
          <div class="w-16 h-16 mx-auto rounded-full bg-red-50 text-red-600 flex items-center justify-center mb-3">
            <span class="material-symbols-outlined text-[36px]">cancel</span>
          </div>
          <p class="font-semibold text-red-700 text-lg">Application Rejected</p>
          <p class="text-xs text-text-muted mt-1">Terminal immutable status. No further action possible.</p>
        ` : r.status === 'ACTION_REQUIRED' ? `
          <div class="w-16 h-16 mx-auto rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
            <span class="material-symbols-outlined text-[36px]">published_with_changes</span>
          </div>
          <p class="font-semibold text-amber-700 text-lg">Awaiting Submitter Action</p>
          <p class="text-xs text-text-muted mt-1">Deficiency notice dispatched. Submitter must resubmit documentation.</p>
        ` : `
          <p class="text-xs text-text-muted">Status: ${r.status}</p>
        `}
      </div>
    </div>`;
}

// ══════════════════════════════════════════════════════════════
// TAB B: SOURCE IDENTITY VERIFICATION
// ══════════════════════════════════════════════════════════════
function renderSourcesTab() {
  const stats = getSourceStats();

  return `
    <div class="flex flex-col w-full gap-space-lg">
      ${renderTabHeader()}

      <!-- Source Metric Counter Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-space-md">
        <div class="reg-stat-card">
          <div class="flex flex-col">
            <span class="reg-stat-label">Total Approved Sources</span>
            <span class="reg-stat-value" style="color:#1E3A8A">${stats.total}</span>
            <span class="reg-stat-sub"><span class="material-symbols-outlined text-[13px]">domain</span>Materialized ProblemSources</span>
          </div>
          <div class="reg-stat-icon" style="background:#EFF6FF;color:#1E3A8A">
            <span class="material-symbols-outlined">corporate_fare</span>
          </div>
        </div>
        <div class="reg-stat-card">
          <div class="flex flex-col">
            <span class="reg-stat-label">Awaiting Verification</span>
            <span class="reg-stat-value" style="color:#F59E0B">${stats.awaiting}</span>
            <span class="reg-stat-sub"><span class="material-symbols-outlined text-[13px]">pending</span>Priority Check</span>
          </div>
          <div class="reg-stat-icon" style="background:#FFFBEB;color:#F59E0B">
            <span class="material-symbols-outlined">hourglass_empty</span>
          </div>
        </div>
        <div class="reg-stat-card">
          <div class="flex flex-col">
            <span class="reg-stat-label">Verified Sources</span>
            <span class="reg-stat-value" style="color:#0D9488">${stats.verified}</span>
            <span class="reg-stat-sub"><span class="material-symbols-outlined text-[13px]">verified</span>PASS Certified</span>
          </div>
          <div class="reg-stat-icon" style="background:#F0FDFA;color:#0D9488">
            <span class="material-symbols-outlined">shield</span>
          </div>
        </div>
        <div class="reg-stat-card">
          <div class="flex flex-col">
            <span class="reg-stat-label">Needs Review / Flagged</span>
            <span class="reg-stat-value" style="color:#0284C7">${stats.needsReview}</span>
            <span class="reg-stat-sub"><span class="material-symbols-outlined text-[13px]">flag</span>District Inspection Required</span>
          </div>
          <div class="reg-stat-icon" style="background:#E0F2FE;color:#0284C7">
            <span class="material-symbols-outlined">search</span>
          </div>
        </div>
      </div>

      <!-- Source Registry Table -->
      <div class="reg-table-container">
        <div class="reg-table-header">
          <div class="flex items-center gap-space-sm">
            <span class="font-headline-sm text-headline-sm text-ashoka-blue font-bold">Source Organization Registry</span>
            <span class="font-mono-code text-body-sm text-text-muted">POST /sources/{id}/verify</span>
          </div>
          <button onclick="window.regPage.loadSources()" class="reg-refresh-btn" title="Refresh Sources">
            <span class="material-symbols-outlined text-[20px]">refresh</span>
          </button>
        </div>

        ${sourcesLoading ? `
          <div class="reg-empty-state">
            <span class="material-symbols-outlined animate-spin text-[32px] text-ashoka-blue">progress_activity</span>
            <span>Fetching approved ProblemSource records...</span>
          </div>
        ` : sourcesList.length === 0 ? `
          <div class="reg-empty-state">
            <span class="material-symbols-outlined text-[40px] text-text-muted/60">domain_disabled</span>
            <p class="font-semibold text-text-primary text-base">No approved sources found</p>
            <p class="text-xs text-text-secondary max-w-sm">Approve registrations in the Entity Registration Queue first. Approved registrations will appear here as ProblemSource organizations.</p>
          </div>
        ` : `
          <div class="overflow-x-auto">
            <table class="w-full text-left">
              <thead>
                <tr class="reg-thead-row">
                  <th class="um-th">Organization & Dossier</th>
                  <th class="um-th">Source Bucket & Category</th>
                  <th class="um-th">Registration ID</th>
                  <th class="um-th">Primary Nodal Contact</th>
                  <th class="um-th">Verification Status</th>
                  <th class="um-th text-right">Statutory Action</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border-hairline">
                ${sourcesList.map(s => renderSourceRow(s)).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    </div>`;
}

function renderSourceRow(s) {
  const name = s.organizationName || s.name || 'Source Entity';
  const loc = [s.district, s.state].filter(Boolean).join(', ') || '—';
  const isVerified = s.verifiedSource === true || s.verified === true || s.verificationStatus === 'VERIFIED';
  const needsReview = s.verificationStatus === 'NEEDS_REVIEW' || s.verificationStatus === 'FLAGGED';
  const sourceId = s.sourceId || s.id;

  return `
    <tr class="um-table-row">
      <td class="um-td">
        <div class="flex flex-col gap-0.5">
          <span class="font-semibold text-text-primary text-sm">${escapeHtml(name)}</span>
          <span class="text-xs text-text-muted">${escapeHtml(loc)}</span>
          <span class="font-mono-code text-[10px] text-ashoka-blue">${(sourceId || '').slice(0, 12)}</span>
        </div>
      </td>
      <td class="um-td">
        <span class="inline-flex items-center px-2 py-0.5 rounded-full ${bucketBadge(s.sourceBucket || s.bucket)} text-[11px] font-semibold">
          ${s.sourceBucket || s.bucket || 'ENTITY'} (${s.sourceType || s.type || 'GENERAL'})
        </span>
      </td>
      <td class="um-td">
        <span class="font-mono-code text-xs text-text-primary">${escapeHtml(s.priCode || s.cin || s.darpanId || s.registrationIdentifier || '—')}</span>
      </td>
      <td class="um-td">
        <div class="flex flex-col gap-0.5 text-xs">
          <span class="text-text-primary">${escapeHtml(s.nodalOfficerName || s.contactPerson || '—')}</span>
          <span class="text-text-muted">${escapeHtml(s.nodalOfficerEmail || s.contactEmail || '—')}</span>
          <span class="font-mono-code text-text-muted">${escapeHtml(s.nodalOfficerPhone || s.contactPhone || '—')}</span>
        </div>
      </td>
      <td class="um-td">
        ${isVerified ? `
          <span class="reg-chip reg-chip-approved"><span class="material-symbols-outlined text-[12px]">verified</span>VERIFIED SOURCE</span>
        ` : needsReview ? `
          <span class="reg-chip reg-chip-review">NEEDS REVIEW</span>
        ` : `
          <span class="reg-chip reg-chip-action">AWAITING CHECK</span>
        `}
      </td>
      <td class="um-td text-right">
        <button onclick="window.regPage.openVerifyModal('${sourceId}')" class="reg-action-btn-sm reg-action-verify">
          <span class="material-symbols-outlined text-[14px]">verified_user</span>
          <span>Verify Identity</span>
        </button>
      </td>
    </tr>`;
}

// ── Source Verification Modal ──
function renderWithVerifyModal() {
  const baseHtml = currentTab === 'registrations' ? renderRegistrationsTab() : renderSourcesTab();
  const s = verifyModalSource;
  if (!s) return baseHtml;

  const name = s.organizationName || s.name || 'Source Entity';
  const sourceId = s.sourceId || s.id;

  return `${baseHtml}
    <div class="um-modal-backdrop" onclick="window.regPage.closeVerifyModal()">
      <div class="um-modal-panel" style="max-width:640px" onclick="event.stopPropagation()">
        <!-- Title -->
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <div class="w-10 h-10 rounded-lg bg-ashoka-blue text-white flex items-center justify-center">
              <span class="material-symbols-outlined text-[22px]">verified_user</span>
            </div>
            <div>
              <h3 class="font-headline-sm text-headline-sm text-ashoka-blue font-bold">${escapeHtml(name)}</h3>
              <span class="text-[10px] text-text-muted font-mono-code uppercase tracking-wider">STATUTORY VERIFICATION</span>
            </div>
          </div>
          <button onclick="window.regPage.closeVerifyModal()" class="um-action-btn">
            <span class="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <!-- Information Banner -->
        <div class="reg-alert-box reg-alert-green mb-4">
          <span class="material-symbols-outlined text-[18px] shrink-0">info</span>
          <p class="text-[11px] text-text-secondary leading-relaxed"><strong>PASS Result:</strong> The organization will receive an official Verified Source badge in the national registry. Authorized submission privileges remain permanently confirmed.</p>
        </div>

        <!-- Form -->
        <div class="flex flex-col gap-4">
          <!-- Method -->
          <div>
            <label class="reg-meta-label mb-1">Verification Method <span style="color:#EF4444">*</span></label>
            <select class="um-form-input" onchange="window.regPage.setVerifyField('method', this.value)">
              <option value="" ${verifyMethod === '' ? 'selected' : ''}>Select verification method...</option>
              <option value="OFFICIAL_EMAIL" ${verifyMethod === 'OFFICIAL_EMAIL' ? 'selected' : ''}>OFFICIAL_EMAIL — Official Domain Email Verification (@gov.in / @nic.in)</option>
              <option value="AUTHORIZATION_DOC" ${verifyMethod === 'AUTHORIZATION_DOC' ? 'selected' : ''}>AUTHORIZATION_DOC — Gram Sabha / Official Board Resolution</option>
              <option value="OTP" ${verifyMethod === 'OTP' ? 'selected' : ''}>OTP — Nodal Officer Direct Phone OTP Handshake</option>
              <option value="REGISTRATION_API" ${verifyMethod === 'REGISTRATION_API' ? 'selected' : ''}>REGISTRATION_API — Automated MCA / Darpan / Udyam Registry Check</option>
              <option value="INSTITUTIONAL_EMAIL" ${verifyMethod === 'INSTITUTIONAL_EMAIL' ? 'selected' : ''}>INSTITUTIONAL_EMAIL — Academic Institutional Domain Verification</option>
              <option value="MANUAL_REVIEW" ${verifyMethod === 'MANUAL_REVIEW' ? 'selected' : ''}>MANUAL_REVIEW — On-Ground District Administrative Physical Audit</option>
            </select>
          </div>

          <!-- Result -->
          <div>
            <label class="reg-meta-label mb-1">Verification Result <span style="color:#EF4444">*</span></label>
            <select class="um-form-input" onchange="window.regPage.setVerifyField('result', this.value)">
              <option value="" ${verifyResult === '' ? 'selected' : ''}>Select result...</option>
              <option value="PASS" ${verifyResult === 'PASS' ? 'selected' : ''}>PASS — Identity & Credentials Verified</option>
              <option value="FAIL" ${verifyResult === 'FAIL' ? 'selected' : ''}>FAIL — Flagged Irregularity / Rejection</option>
              <option value="NEEDS_REVIEW" ${verifyResult === 'NEEDS_REVIEW' ? 'selected' : ''}>NEEDS_REVIEW — Conditional / Requires Further Inspection</option>
            </select>
          </div>

          <!-- Notes -->
          <div>
            <label class="reg-meta-label mb-1 flex items-center justify-between">
              <span>Verification Observations & Registry Notes</span>
              <span class="text-text-muted font-normal">${verifyNotes.length} / 500</span>
            </label>
            <textarea class="um-form-input" rows="3" maxlength="500" placeholder="Record certificate numbers, verification links, or inspection observations..." oninput="window.regPage.setVerifyField('notes', this.value)">${escapeHtml(verifyNotes)}</textarea>
          </div>

          <!-- Evidence URL -->
          <div>
            <label class="reg-meta-label mb-1">Evidence Document URL / Verification Artifact Link (Optional)</label>
            <input type="url" class="um-form-input" placeholder="https://drive.google.com/..." value="${escapeHtml(verifyEvidenceUrl)}" oninput="window.regPage.setVerifyField('evidenceUrl', this.value)" />
          </div>

          <!-- Past Audit Trail -->
          <div>
            <button onclick="window.regPage.toggleVerifyHistory()" class="text-xs text-ashoka-blue font-semibold flex items-center gap-1 hover:underline cursor-pointer">
              <span class="material-symbols-outlined text-[14px]">${verifyHistoryOpen ? 'expand_less' : 'expand_more'}</span>
              Past Audit Trail (${verifyHistory.length} entries)
            </button>
            ${verifyHistoryOpen && verifyHistory.length > 0 ? `
              <div class="mt-2 reg-timeline">
                ${verifyHistory.map(h => `
                  <div class="reg-timeline-item">
                    <div class="reg-timeline-dot"></div>
                    <div class="reg-timeline-content">
                      <span class="text-[11px] font-bold">${escapeHtml(h.method || '—')} → ${escapeHtml(h.result || '—')}</span>
                      <span class="font-mono-code text-[10px] text-text-muted">${fmtDate(h.verifiedAt || h.createdAt)}</span>
                      ${h.notes ? `<p class="text-[10px] text-text-secondary italic">"${escapeHtml(h.notes)}"</p>` : ''}
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>

          <!-- Attestation -->
          <label class="reg-attest-label">
            <input type="checkbox" ${verifyAttest ? 'checked' : ''} onchange="window.regPage.setVerifyField('attest', this.checked)" class="reg-attest-checkbox" />
            <span class="text-[11px] text-text-secondary leading-relaxed">I, ADMINISTRATOR, certify under statutory authority that the identity credentials for this organization have been evaluated against verified official records and documented evidence.</span>
          </label>

          <!-- Submit -->
          <button onclick="window.regPage.submitVerification('${sourceId}')" ${!verifyAttest || !verifyMethod || !verifyResult ? 'disabled' : ''} class="reg-submit-btn reg-submit-approve w-full">
            <span class="material-symbols-outlined text-[18px]">shield</span>
            Certify Verified Source
          </button>
        </div>
      </div>
    </div>`;
}

// ══════════════════════════════════════════════════════════════
// RENDER LIFECYCLE
// ══════════════════════════════════════════════════════════════
render.afterRender = function() {
  if (registrationsList.length === 0 && isLoading) {
    window.regPage.loadData();
  }
};

// ══════════════════════════════════════════════════════════════
// CONTROLLER (window.regPage)
// ══════════════════════════════════════════════════════════════
window.regPage = {
  toast(msg, type) { showToast(msg, type); },

  // ── Data Loading ──
  async loadData() {
    isLoading = true;
    const root = document.getElementById('app-content');
    if (root) root.innerHTML = render();

    try {
      registrationsList = await fetchRegistrations(currentFilter === 'ALL' || currentFilter === 'DECIDED' ? null : currentFilter) || [];
      // Normalize: ensure it's an array
      if (!Array.isArray(registrationsList)) {
        registrationsList = registrationsList.content || registrationsList.data || [];
      }
    } catch (err) {
      console.error('Failed to fetch registrations:', err);
      showToast(err.message || 'Failed to fetch registrations queue', 'error');
      registrationsList = [];
    } finally {
      isLoading = false;
      currentPage = 0;
      if (root) root.innerHTML = render();
    }
  },

  async loadSources() {
    sourcesLoading = true;
    this.rerender();
    try {
      const data = await fetchSources();
      sourcesList = Array.isArray(data) ? data : (data?.content || data?.data || []);
    } catch (err) {
      console.error('Failed to fetch sources:', err);
      showToast(err.message || 'Failed to fetch source organizations', 'error');
      sourcesList = [];
    } finally {
      sourcesLoading = false;
      this.rerender();
    }
  },

  rerender() {
    const root = document.getElementById('app-content');
    if (root) root.innerHTML = render();
  },

  // ── Tab Switching ──
  switchTab(tab) {
    currentTab = tab;
    if (tab === 'sources' && sourcesList.length === 0 && sourcesLoading) {
      this.loadSources();
    } else {
      this.rerender();
    }
  },

  // ── Filters ──
  setFilter(status) {
    currentFilter = status;
    currentPage = 0;
    this.loadData();
  },

  setCategory(cat) {
    categoryFilter = cat;
    currentPage = 0;
    this.rerender();
  },

  handleSearch(val) {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      searchFilter = val || '';
      currentPage = 0;
      this.rerender();
    }, 250);
  },

  // ── Pagination ──
  setPageSize(size) {
    pageSize = size;
    currentPage = 0;
    this.rerender();
  },
  prevPage() {
    if (currentPage > 0) { currentPage--; this.rerender(); }
  },
  nextPage() {
    const totalPages = Math.ceil(getFiltered().length / pageSize);
    if (currentPage < totalPages - 1) { currentPage++; this.rerender(); }
  },

  // ── Assignment ──
  async claimAssignment(id) {
    try {
      showToast('Claiming registration assignment...');
      await assignRegistration(id);
      showToast('Registration successfully assigned to your session', 'success');
      await this.loadData();
    } catch (err) {
      console.error('Assign error:', err);
      // Handle 409 conflict
      if (err.status === 409) {
        showToast('This registration\'s status has changed and this action is no longer valid — refreshing its latest status.', 'error');
        await this.loadData();
        return;
      }
      showToast(err.message || 'Failed to claim registration', 'error');
    }
  },

  // ── Detail View ──
  async openDetail(id) {
    detailViewId = id;
    detailLoading = true;
    detailData = null;
    detailHistory = [];
    decisionChoice = null;
    attestChecked = false;
    commentText = '';
    this.rerender();

    try {
      // Try fetching detail from the list first (already loaded)
      const fromList = registrationsList.find(r => r.registrationId === id);
      if (fromList) {
        detailData = fromList;
      }

      // Fetch full detail from API
      const detail = await fetchRegistrationDetail(id);
      if (detail) detailData = detail;

      // Fetch history
      const history = await fetchRegistrationHistory(id);
      detailHistory = Array.isArray(history) ? history : [];
    } catch (err) {
      console.error('Failed to load registration detail:', err);
      showToast(err.message || 'Failed to load registration details', 'error');
      // Use list data as fallback
      if (!detailData) {
        detailData = registrationsList.find(r => r.registrationId === id) || null;
      }
    } finally {
      detailLoading = false;
      this.rerender();
    }
  },

  closeDetail() {
    detailViewId = null;
    detailData = null;
    detailHistory = [];
    decisionChoice = null;
    attestChecked = false;
    commentText = '';
    this.rerender();
  },

  // ── Decision Console ──
  setDecision(choice) {
    decisionChoice = decisionChoice === choice ? null : choice;
    this.rerender();
  },

  toggleAttest(checked) {
    attestChecked = checked;
    this.rerender();
  },

  updateComment(val) {
    commentText = val;
    // Don't re-render for perf – just update char counter
    const label = document.querySelector('[for="reg-decision-comment"] span:last-child');
    if (label) label.textContent = `${val.length} / 1000`;
  },

  async executeDecision(id) {
    if (!attestChecked) {
      showToast('You must sign the legal attestation checkbox before proceeding.', 'error');
      return;
    }

    const comment = commentText.trim();

    // Client-side validation: blank comment for REQUEST_ACTION or REJECT
    if ((decisionChoice === 'REQUEST_ACTION' || decisionChoice === 'REJECT') && !comment) {
      showToast('A documented comment is mandatory for this action.', 'error');
      document.getElementById('reg-decision-comment')?.focus();
      return;
    }

    try {
      if (decisionChoice === 'APPROVE') {
        showToast('Approving registration & provisioning SourceAccount...');
        await approveRegistration(id, comment || 'Statutory review verified and approved by Administrator.');
        showToast('Registration approved! Verified SourceAccount established in ledger.', 'success');
      } else if (decisionChoice === 'REQUEST_ACTION') {
        showToast('Dispatching deficiency notice...');
        await requestActionRegistration(id, comment);
        showToast('Registration status updated to ACTION_REQUIRED. Notice dispatched.', 'warning');
      } else if (decisionChoice === 'REJECT') {
        showToast('Processing statutory rejection...');
        await rejectRegistration(id, comment);
        showToast('Registration marked permanently REJECTED.', 'error');
      }

      // Optimistic update on list
      const idx = registrationsList.findIndex(r => r.registrationId === id);
      if (idx !== -1) {
        if (decisionChoice === 'APPROVE') registrationsList[idx].status = 'APPROVED';
        if (decisionChoice === 'REQUEST_ACTION') {
          registrationsList[idx].status = 'ACTION_REQUIRED';
          registrationsList[idx].actionRequiredComment = comment;
        }
        if (decisionChoice === 'REJECT') {
          registrationsList[idx].status = 'REJECTED';
          registrationsList[idx].rejectionReason = comment;
        }
      }

      // Navigate back to queue
      this.closeDetail();
      await this.loadData();
    } catch (err) {
      console.error('Decision error:', err);

      // Handle 422: Missing schema fields
      if (err.status === 422) {
        const rawDetail = err.rawBody?.detail || err.rawBody?.message || '';
        const missingMsg = rawDetail || 'required field(s)';
        showToast(`Cannot approve registration: source payload is missing ${missingMsg}. Send it back as ACTION_REQUIRED so the applicant can provide them.`, 'error');
        // Auto-highlight Request Action
        decisionChoice = 'REQUEST_ACTION';
        this.rerender();
        return;
      }

      // Handle 409: Status conflict
      if (err.status === 409) {
        showToast('This registration\'s status has changed and this action is no longer valid — refreshing its latest status.', 'error');
        await this.openDetail(id);
        return;
      }

      showToast(err.message || 'Failed to execute decision', 'error');
    }
  },

  // ── Source Verification Modal ──
  async openVerifyModal(sourceId) {
    verifyModalSourceId = sourceId;
    verifyModalSource = sourcesList.find(s => (s.sourceId || s.id) === sourceId) || null;
    verifyMethod = '';
    verifyResult = '';
    verifyNotes = '';
    verifyEvidenceUrl = '';
    verifyAttest = false;
    verifyHistory = [];
    verifyHistoryOpen = false;
    this.rerender();

    // Fetch verification history in background
    try {
      const hist = await fetchSourceVerificationHistory(sourceId);
      verifyHistory = Array.isArray(hist) ? hist : [];
      this.rerender();
    } catch {
      verifyHistory = [];
    }
  },

  closeVerifyModal() {
    verifyModalSourceId = null;
    verifyModalSource = null;
    this.rerender();
  },

  setVerifyField(field, value) {
    if (field === 'method') verifyMethod = value;
    if (field === 'result') verifyResult = value;
    if (field === 'notes') verifyNotes = value;
    if (field === 'evidenceUrl') verifyEvidenceUrl = value;
    if (field === 'attest') verifyAttest = value;
    this.rerender();
  },

  toggleVerifyHistory() {
    verifyHistoryOpen = !verifyHistoryOpen;
    this.rerender();
  },

  async submitVerification(sourceId) {
    if (!verifyMethod || !verifyResult) {
      showToast('Verification method and result are required.', 'error');
      return;
    }
    if (!verifyAttest) {
      showToast('You must sign the attestation checkbox.', 'error');
      return;
    }

    try {
      showToast('Processing source identity verification...');
      await verifySource(sourceId, verifyMethod, verifyResult, verifyNotes, verifyEvidenceUrl);
      showToast(`Source verification recorded: ${verifyResult}`, 'success');

      // Optimistic update
      const idx = sourcesList.findIndex(s => (s.sourceId || s.id) === sourceId);
      if (idx !== -1) {
        if (verifyResult === 'PASS') {
          sourcesList[idx].verifiedSource = true;
          sourcesList[idx].verificationStatus = 'VERIFIED';
        } else if (verifyResult === 'NEEDS_REVIEW') {
          sourcesList[idx].verificationStatus = 'NEEDS_REVIEW';
        }
      }

      this.closeVerifyModal();
    } catch (err) {
      console.error('Verification error:', err);
      if (err.status === 409) {
        showToast('This source\'s verification status has changed — refreshing.', 'error');
        await this.loadSources();
        this.closeVerifyModal();
        return;
      }
      showToast(err.message || 'Failed to verify source identity', 'error');
    }
  },
};

// ── ESC key to close modals and detail ──
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (verifyModalSourceId) {
      window.regPage.closeVerifyModal();
    } else if (detailViewId) {
      window.regPage.closeDetail();
    }
  }
});

registerPage('registrations', render);
