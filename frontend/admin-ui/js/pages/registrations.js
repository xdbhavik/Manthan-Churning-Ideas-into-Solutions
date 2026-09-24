// ============================================================
// Screen 5: Registrations Queue & Detail (Live API Integration)
// ============================================================
import { registerPage, showToast } from '../app.js';
import {
  fetchRegistrations,
  assignRegistration,
  approveRegistration,
  rejectRegistration,
  requestActionRegistration,
} from '../api.js';

let registrationsList = [];
let selectedRegId = null;
let currentFilter = 'ALL';
let searchFilter = '';
let isLoading = true;
let rejectArmed = false;

function render() {
  const filtered = registrationsList.filter(r => {
    const matchesStatus = currentFilter === 'ALL' || r.status === currentFilter;
    if (!matchesStatus) return false;
    if (!searchFilter) return true;
    const q = searchFilter.toLowerCase();
    const name = (r.source?.organizationName || r.source?.citizenName || '').toLowerCase();
    const id = (r.registrationId || '').toLowerCase();
    const type = (r.sourceType || '').toLowerCase();
    return name.includes(q) || id.includes(q) || type.includes(q);
  });

  const totalCount = registrationsList.length;
  const underReviewCount = registrationsList.filter(r => r.status === 'UNDER_REVIEW').length;
  const submittedCount = registrationsList.filter(r => r.status === 'SUBMITTED').length;
  const actionRequiredCount = registrationsList.filter(r => r.status === 'ACTION_REQUIRED').length;
  const approvedCount = registrationsList.filter(r => r.status === 'APPROVED').length;

  const selected = registrationsList.find(r => r.registrationId === selectedRegId) || filtered[0] || null;
  if (selected && !selectedRegId) {
    selectedRegId = selected.registrationId;
  }

  const selectedName = selected?.source?.organizationName || selected?.source?.citizenName || 'Source Registration Entity';
  const selectedDossier = selected?.source?.dossierId || (selected?.registrationId ? selected.registrationId.slice(0, 8).toUpperCase() : '');
  const isAssigned = !!selected?.assignedReviewerId;

  return `
    <div class="flex flex-col w-full gap-space-lg">
      <!-- Top Metric Cards (Live calculated from backend) -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-space-md">
        <div class="bg-surface-crisp p-space-md rounded-xl shadow-sm flex items-center justify-between border border-border-hairline">
          <div class="flex flex-col">
            <span class="font-label-sm text-label-sm text-text-muted uppercase tracking-wider">Queue Total</span>
            <span class="font-headline-lg text-headline-lg text-ashoka-blue mt-space-2xs">${totalCount}</span>
            <span class="font-body-sm text-body-sm text-gov-emerald flex items-center gap-1 mt-1">
              <span class="material-symbols-outlined text-[14px]">cloud_done</span> Live Database
            </span>
          </div>
          <div class="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-institutional-navy">
            <span class="material-symbols-outlined">inbox</span>
          </div>
        </div>
        <div class="bg-surface-crisp p-space-md rounded-xl shadow-sm flex items-center justify-between border border-border-hairline">
          <div class="flex flex-col">
            <span class="font-label-sm text-label-sm text-text-muted uppercase tracking-wider">Under Review</span>
            <span class="font-headline-lg text-headline-lg text-text-primary mt-space-2xs">${underReviewCount}</span>
            <span class="font-body-sm text-body-sm text-status-review-text mt-1">Active Review Queue</span>
          </div>
          <div class="w-10 h-10 rounded-lg bg-status-review-bg flex items-center justify-center text-status-review-text">
            <span class="material-symbols-outlined">hourglass_top</span>
          </div>
        </div>
        <div class="bg-surface-crisp p-space-md rounded-xl shadow-sm flex items-center justify-between border border-border-hairline">
          <div class="flex flex-col">
            <span class="font-label-sm text-label-sm text-text-muted uppercase tracking-wider">Action Required</span>
            <span class="font-headline-lg text-headline-lg text-saffron-accent mt-space-2xs">${actionRequiredCount}</span>
            <span class="font-body-sm text-body-sm text-status-action-text mt-1">Awaiting Submitter Fix</span>
          </div>
          <div class="w-10 h-10 rounded-lg bg-status-action-bg flex items-center justify-center text-saffron-accent">
            <span class="material-symbols-outlined">warning</span>
          </div>
        </div>
        <div class="bg-surface-crisp p-space-md rounded-xl shadow-sm flex items-center justify-between border border-border-hairline">
          <div class="flex flex-col">
            <span class="font-label-sm text-label-sm text-text-muted uppercase tracking-wider">Approved Active</span>
            <span class="font-headline-lg text-headline-lg text-gov-emerald mt-space-2xs">${approvedCount}</span>
            <span class="font-body-sm text-body-sm text-text-muted mt-1">Verified ProblemSources</span>
          </div>
          <div class="w-10 h-10 rounded-lg bg-status-approved-bg flex items-center justify-center text-gov-emerald">
            <span class="material-symbols-outlined">verified</span>
          </div>
        </div>
      </div>

      <!-- Filter Toolbar -->
      <div class="bg-surface-crisp rounded-xl p-space-md shadow-sm border border-border-hairline flex flex-col md:flex-row md:items-center justify-between gap-space-md">
        <div class="flex flex-wrap items-center gap-space-xs">
          <button onclick="window.regPage.setFilter('ALL')" class="reg-filter-btn px-space-md py-1.5 rounded-full font-label-md text-label-md ${currentFilter === 'ALL' ? 'bg-ashoka-blue text-on-primary shadow-sm' : 'bg-surface-muted text-text-secondary hover:bg-surface-container'} transition-colors flex items-center gap-1.5 cursor-pointer">
            <span>ALL</span><span class="px-1.5 rounded-full text-[10px] ${currentFilter === 'ALL' ? 'bg-white/20 text-on-primary' : 'bg-surface-container text-text-primary'}">${totalCount}</span>
          </button>
          <button onclick="window.regPage.setFilter('SUBMITTED')" class="reg-filter-btn px-space-md py-1.5 rounded-full font-label-md text-label-md ${currentFilter === 'SUBMITTED' ? 'bg-status-submitted-text text-white shadow-sm' : 'bg-status-submitted-bg text-status-submitted-text hover:bg-surface-container-high'} transition-colors flex items-center gap-1.5 cursor-pointer">
            <span>SUBMITTED</span><span class="px-1.5 rounded-full text-[10px] bg-status-submitted-border/40">${submittedCount}</span>
          </button>
          <button onclick="window.regPage.setFilter('UNDER_REVIEW')" class="reg-filter-btn px-space-md py-1.5 rounded-full font-label-md text-label-md ${currentFilter === 'UNDER_REVIEW' ? 'bg-status-review-text text-white shadow-sm' : 'bg-status-review-bg text-status-review-text hover:bg-surface-container-high'} transition-colors flex items-center gap-1.5 cursor-pointer font-semibold">
            <span class="w-2 h-2 rounded-full ${currentFilter === 'UNDER_REVIEW' ? 'bg-white' : 'bg-status-review-text'} animate-pulse"></span>
            <span>UNDER_REVIEW</span><span class="px-1.5 rounded-full text-[10px] bg-status-review-border/60">${underReviewCount}</span>
          </button>
          <button onclick="window.regPage.setFilter('ACTION_REQUIRED')" class="reg-filter-btn px-space-md py-1.5 rounded-full font-label-md text-label-md ${currentFilter === 'ACTION_REQUIRED' ? 'bg-saffron-accent text-white shadow-sm' : 'bg-status-action-bg text-status-action-text hover:bg-status-action-border/40'} transition-colors flex items-center gap-1.5 cursor-pointer">
            <span>ACTION_REQUIRED</span><span class="px-1.5 rounded-full text-[10px] bg-status-action-border/80">${actionRequiredCount}</span>
          </button>
        </div>
        <div class="flex items-center gap-space-sm w-full md:w-auto">
          <div class="relative flex-1 md:w-72">
            <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-text-muted">search</span>
            <input
              id="reg-search-input"
              class="w-full pl-9 pr-3 py-1.5 bg-surface-subtle rounded-lg text-text-primary font-body-md text-body-md focus:bg-surface-crisp focus:outline-none transition-all placeholder:text-text-muted shadow-sm border border-border-hairline"
              placeholder="Filter by UUID or Entity..."
              type="text"
              value="${searchFilter}"
              oninput="window.regPage.handleSearch(this.value)"
            />
          </div>
          <button onclick="window.regPage.loadData()" class="p-2 rounded-lg bg-surface-subtle text-text-secondary hover:bg-surface-muted hover:text-text-primary transition-colors cursor-pointer border border-border-hairline" title="Refresh Live Queue">
            <span class="material-symbols-outlined text-[20px]">refresh</span>
          </button>
        </div>
      </div>

      <!-- Queue Table -->
      <div class="bg-surface-crisp rounded-xl shadow-sm border border-border-hairline overflow-hidden flex flex-col">
        <div class="px-space-lg py-space-md bg-surface-subtle flex items-center justify-between border-b border-border-hairline">
          <div class="flex items-center gap-space-sm">
            <span class="font-headline-sm text-headline-sm text-ashoka-blue font-bold">Application Verification Pool</span>
            <span class="font-mono-code text-body-sm text-text-muted">Live Sync Active</span>
          </div>
          <span class="font-label-sm text-label-sm text-text-secondary uppercase tracking-wider">Displaying ${filtered.length} of ${totalCount} records</span>
        </div>

        ${isLoading ? `
          <div class="p-12 flex flex-col items-center justify-center gap-3 text-text-muted">
            <span class="material-symbols-outlined animate-spin text-[32px] text-ashoka-blue">progress_activity</span>
            <span class="text-sm font-medium">Fetching real-time queue from Source Service...</span>
          </div>
        ` : filtered.length === 0 ? `
          <div class="p-12 flex flex-col items-center justify-center gap-2 text-text-muted text-center">
            <span class="material-symbols-outlined text-[40px] text-text-muted/60">inbox</span>
            <p class="font-semibold text-text-primary text-base">No registrations in this view</p>
            <p class="text-xs text-text-secondary max-w-sm">There are currently no registration records matching your filter criteria.</p>
          </div>
        ` : `
          <div class="overflow-x-auto">
            <table class="w-full text-left font-body-md text-body-md">
              <thead class="bg-surface-muted text-text-muted font-label-md text-label-md uppercase tracking-wider select-none border-b border-border-hairline">
                <tr>
                  <th class="py-3 px-space-lg">Application UUID</th>
                  <th class="py-3 px-space-md">Submitter Entity Name</th>
                  <th class="py-3 px-space-md">Category</th>
                  <th class="py-3 px-space-md">Submitted Date</th>
                  <th class="py-3 px-space-md">Reviewer Assigned</th>
                  <th class="py-3 px-space-md">Status</th>
                  <th class="py-3 px-space-lg text-right">Quick Action</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border-hairline">
                ${filtered.map(r => {
                  const isSelected = r.registrationId === selectedRegId;
                  const name = r.source?.organizationName || r.source?.citizenName || 'Registration Request';
                  const loc = [r.source?.district, r.source?.state].filter(Boolean).join(', ') || 'Location Pending';
                  const dateStr = r.submittedAt ? new Date(r.submittedAt).toLocaleString() : 'Draft';
                  const statusClass =
                    r.status === 'APPROVED' ? 'bg-status-approved-bg text-status-approved-text' :
                    r.status === 'UNDER_REVIEW' ? 'bg-status-review-bg text-status-review-text' :
                    r.status === 'ACTION_REQUIRED' ? 'bg-status-action-bg text-status-action-text' :
                    'bg-status-submitted-bg text-status-submitted-text';

                  return `
                    <tr onclick="window.regPage.selectReg('${r.registrationId}')" class="transition-colors cursor-pointer ${isSelected ? 'bg-surface-container-low/90 font-medium' : 'hover:bg-surface-subtle'}">
                      <td class="py-3.5 px-space-lg font-mono-code text-ashoka-blue font-semibold flex items-center gap-2">
                        ${isSelected ? '<span class="w-1.5 h-6 rounded-full bg-ashoka-blue -ml-2"></span>' : ''}
                        <span class="truncate max-w-[140px] text-xs">${r.registrationId}</span>
                      </td>
                      <td class="py-3.5 px-space-md">
                        <span class="font-semibold text-text-primary block">${name}</span>
                        <span class="font-body-sm text-body-sm text-text-muted font-normal block">${loc}</span>
                      </td>
                      <td class="py-3.5 px-space-md">
                        <span class="inline-flex items-center px-2 py-0.5 rounded-full bg-surface-muted text-institutional-navy font-label-sm text-label-sm font-semibold">${r.sourceBucket || 'ENTITY'} • ${r.sourceType || 'GENERAL'}</span>
                      </td>
                      <td class="py-3.5 px-space-md font-mono-code text-body-sm text-text-secondary">${dateStr}</td>
                      <td class="py-3.5 px-space-md">
                        ${r.assignedReviewerId ? `
                          <div class="flex items-center gap-2">
                            <div class="w-6 h-6 rounded-full bg-status-review-bg text-status-review-text flex items-center justify-center font-bold text-[10px]">RO</div>
                            <span class="font-label-md text-label-md text-text-primary truncate max-w-[100px] font-mono-code text-xs">${r.assignedReviewerId.slice(0, 8)}...</span>
                          </div>
                        ` : `
                          <span class="px-2 py-0.5 rounded bg-surface-muted text-text-muted text-[11px] font-mono-code italic">Unassigned</span>
                        `}
                      </td>
                      <td class="py-3.5 px-space-md">
                        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${statusClass} font-label-sm text-label-sm font-bold uppercase tracking-wider">
                          <span class="w-1.5 h-1.5 rounded-full ${r.status === 'UNDER_REVIEW' ? 'bg-status-review-text animate-pulse' : 'bg-current'}"></span>
                          ${r.status}
                        </span>
                      </td>
                      <td class="py-3.5 px-space-lg text-right">
                        <button class="inline-flex items-center gap-1 px-3 py-1 rounded-lg ${isSelected ? 'bg-ashoka-blue text-on-primary' : 'bg-surface-muted hover:bg-surface-container text-text-primary'} font-label-md text-label-md shadow-sm transition-colors cursor-pointer">
                          <span>Inspect</span><span class="material-symbols-outlined text-[16px]">arrow_forward</span>
                        </button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>

      <!-- Detail Inspector Panel (Selected Registration) -->
      ${selected ? `
        <div class="bg-surface-crisp rounded-xl shadow-md border border-border-hairline overflow-hidden flex flex-col">
          <div class="p-space-lg bg-surface-container-high/40 flex flex-col lg:flex-row lg:items-center justify-between gap-space-md border-b border-border-hairline">
            <div class="flex items-start gap-space-md">
              <div class="w-12 h-12 rounded-xl bg-ashoka-blue text-on-primary flex items-center justify-center flex-shrink-0 shadow-sm">
                <span class="material-symbols-outlined text-[28px]">account_balance</span>
              </div>
              <div class="flex flex-col">
                <div class="flex flex-wrap items-center gap-space-sm">
                  <span class="font-headline-md text-headline-md text-ashoka-blue font-bold">${selectedName}</span>
                  <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-status-review-bg text-status-review-text font-label-sm text-label-sm font-bold uppercase tracking-wider shadow-sm">
                    ${selected.status}
                  </span>
                  <span class="font-mono-code text-body-sm text-text-muted bg-surface-crisp px-2 py-0.5 rounded border border-border-hairline">UUID: ${selected.registrationId}</span>
                </div>
                <p class="font-body-md text-body-md text-text-secondary mt-1">
                  Category: <strong>${selected.sourceBucket || 'GOVT'} • ${selected.sourceType || 'PRI'}</strong> • Submitter User ID: <span class="font-mono-code">${selected.submittedByUserId || 'N/A'}</span>
                </p>
              </div>
            </div>
            <div class="flex items-center gap-space-md self-end lg:self-auto bg-surface-crisp p-2.5 rounded-lg shadow-sm border border-border-hairline">
              <div class="flex flex-col text-right">
                <span class="font-label-sm text-label-sm text-text-muted uppercase tracking-wider">Submitted Timestamp</span>
                <span class="font-mono-code text-xs font-bold text-ashoka-blue">${selected.submittedAt ? new Date(selected.submittedAt).toUTCString() : 'Draft Mode'}</span>
              </div>
              <div class="w-8 h-8 rounded-full bg-gov-emerald/10 text-gov-emerald flex items-center justify-center">
                <span class="material-symbols-outlined text-[20px]">calendar_today</span>
              </div>
            </div>
          </div>

          <!-- Inspector Content Grid -->
          <div class="p-space-lg grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
            <!-- Left: Details (7 cols) -->
            <div class="lg:col-span-7 flex flex-col gap-space-lg">
              <!-- Entity Data -->
              <div class="bg-surface-subtle p-space-lg rounded-xl shadow-sm border border-border-hairline flex flex-col gap-space-md">
                <div class="flex items-center justify-between">
                  <span class="font-headline-sm text-headline-sm text-ashoka-blue font-bold flex items-center gap-2">
                    <span class="material-symbols-outlined text-[20px]">assured_workload</span>Verified Entity Attributes
                  </span>
                  <span class="px-2 py-0.5 rounded bg-gov-emerald/10 text-gov-emerald font-label-sm text-label-sm font-semibold">Live Ingest</span>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                  <div>
                    <span class="font-label-sm text-label-sm text-text-muted uppercase">Official Organization Name</span>
                    <p class="font-body-md text-text-primary font-semibold mt-0.5">${selectedName}</p>
                  </div>
                  <div>
                    <span class="font-label-sm text-label-sm text-text-muted uppercase">Entity Category / Type</span>
                    <p class="font-mono-code text-body-md text-text-primary font-semibold mt-0.5">${selected.sourceBucket} / ${selected.sourceType}</p>
                  </div>
                  <div>
                    <span class="font-label-sm text-label-sm text-text-muted uppercase">District / State</span>
                    <p class="font-body-md text-text-primary mt-0.5">${selected.source?.district || 'N/A'}, ${selected.source?.state || 'N/A'}</p>
                  </div>
                  <div>
                    <span class="font-label-sm text-label-sm text-text-muted uppercase">Primary Contact Person</span>
                    <p class="font-body-md text-text-primary mt-0.5">${selected.source?.contactPersonName || selected.source?.citizenName || 'Designated Signatory'}</p>
                  </div>
                  <div>
                    <span class="font-label-sm text-label-sm text-text-muted uppercase">Contact Telephone</span>
                    <p class="font-mono-code text-body-md text-text-primary mt-0.5">${selected.source?.contactPhone || selected.source?.contactNumber || 'N/A'}</p>
                  </div>
                  <div>
                    <span class="font-label-sm text-label-sm text-text-muted uppercase">PAN / Identification</span>
                    <p class="font-mono-code text-body-md text-text-primary mt-0.5">${selected.source?.pan || selected.source?.dossierId || 'Verified'}</p>
                  </div>
                </div>
              </div>

              ${selected.actionRequiredComment ? `
                <div class="bg-status-action-bg border border-status-action-border p-4 rounded-xl flex items-start gap-3">
                  <span class="material-symbols-outlined text-saffron-accent text-[22px] shrink-0">announcement</span>
                  <div>
                    <span class="text-xs font-bold text-status-action-text uppercase tracking-wide block">Action Required Checklist</span>
                    <p class="text-xs text-text-primary mt-0.5 leading-relaxed">${selected.actionRequiredComment}</p>
                  </div>
                </div>
              ` : ''}

              ${selected.rejectionReason ? `
                <div class="bg-error-container/40 border border-error/30 p-4 rounded-xl flex items-start gap-3">
                  <span class="material-symbols-outlined text-error text-[22px] shrink-0">cancel</span>
                  <div>
                    <span class="text-xs font-bold text-error uppercase tracking-wide block">Rejection Ground</span>
                    <p class="text-xs text-text-primary mt-0.5 leading-relaxed">${selected.rejectionReason}</p>
                  </div>
                </div>
              ` : ''}
            </div>

            <!-- Right: Decision Console (5 cols) -->
            <div class="lg:col-span-5 flex flex-col gap-space-lg">
              <div class="bg-surface-subtle p-space-lg rounded-xl shadow-sm border border-border-hairline flex flex-col gap-space-md sticky top-24">
                <div class="flex items-center justify-between">
                  <span class="font-headline-sm text-headline-sm text-ashoka-blue font-bold flex items-center gap-2">
                    <span class="material-symbols-outlined text-[20px]">gavel</span>Reviewer Decision Console
                  </span>
                  <span class="font-label-sm text-label-sm bg-status-review-bg text-status-review-text px-2 py-0.5 rounded-full uppercase font-bold">Session Active</span>
                </div>
                <p class="font-body-sm text-body-sm text-text-secondary leading-relaxed">
                  Execute statutory workflow decisions. Approved registrations establish active, verified <strong>SourceAccounts</strong> in the database.
                </p>

                <!-- Reviewer Assignment -->
                <div class="p-3 bg-surface-crisp rounded-lg border border-border-hairline flex flex-col gap-2">
                  <div class="flex items-center justify-between text-xs">
                    <span class="font-bold text-text-secondary">Assigned Reviewer</span>
                    <span class="font-mono-code text-[11px] text-text-muted">${selected.assignedReviewerId || 'None'}</span>
                  </div>
                  ${!selected.assignedReviewerId ? `
                    <button onclick="window.regPage.claimAssignment('${selected.registrationId}')" class="w-full py-2 px-3 rounded-lg bg-institutional-navy text-on-primary font-semibold text-xs hover:bg-ashoka-blue transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm">
                      <span class="material-symbols-outlined text-[16px]">person_add</span><span>Claim &amp; Assign to Self</span>
                    </button>
                  ` : `
                    <div class="flex items-center gap-2 text-gov-emerald text-xs font-semibold">
                      <span class="material-symbols-outlined text-[16px]">check_circle</span>
                      <span>Assigned to Active Officer</span>
                    </div>
                  `}
                </div>

                <!-- Reviewer Remarks Input -->
                <div class="flex flex-col gap-1.5">
                  <label class="font-label-md text-label-md text-text-primary font-semibold flex items-center justify-between" for="reviewerRemarks">
                    <span>Reviewer Remarks / Audit Justification <span class="text-saffron-accent">*</span></span>
                    <span class="text-text-muted font-normal text-[11px]">Audit Recorded</span>
                  </label>
                  <textarea
                    id="reviewerRemarks"
                    class="w-full p-2.5 bg-surface-crisp rounded-lg font-body-md text-body-md text-text-primary focus:outline-none focus:ring-1 focus:ring-ashoka-blue placeholder:text-text-muted shadow-sm border border-border-hairline"
                    placeholder="Enter compliance justification, deficiency details, or verification notes..."
                    rows="3"
                  ></textarea>
                </div>

                <!-- Rejection Warning Box -->
                <div class="p-3 bg-error-container/40 border border-error/30 rounded-lg hidden flex-col gap-1.5" id="rejectWarningBox">
                  <div class="flex items-center gap-2 text-error font-semibold text-xs">
                    <span class="material-symbols-outlined text-[16px]">warning</span><span>Permanent Statutory Rejection</span>
                  </div>
                  <p class="text-[11px] text-text-secondary">Rejection permanently closes this application. A clear justification is mandatory.</p>
                </div>

                <!-- Live Action Buttons -->
                <div class="flex flex-col gap-2 pt-1">
                  <button
                    onclick="window.regPage.approveKYC('${selected.registrationId}')"
                    class="w-full py-2.5 px-4 rounded-lg bg-gov-emerald hover:bg-emerald-700 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                  >
                    <span class="material-symbols-outlined text-[18px]">verified</span>
                    <span>Approve KYC (Establish SourceAccount)</span>
                  </button>
                  <div class="grid grid-cols-2 gap-2">
                    <button
                      onclick="window.regPage.requestAction('${selected.registrationId}')"
                      class="py-2 px-3 rounded-lg bg-status-action-bg hover:bg-status-action-border text-status-action-text font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-status-action-border"
                    >
                      <span class="material-symbols-outlined text-[16px]">published_with_changes</span>
                      <span>Request Action</span>
                    </button>
                    <button
                      id="btnReject"
                      onclick="window.regPage.toggleReject('${selected.registrationId}')"
                      class="py-2 px-3 rounded-lg bg-surface-crisp hover:bg-red-50 text-error font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-red-200"
                    >
                      <span class="material-symbols-outlined text-[16px]">cancel</span>
                      <span id="rejectBtnText">Reject KYC</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ` : ''}
    </div>`;
}

render.afterRender = function() {
  if (registrationsList.length === 0 && isLoading) {
    window.regPage.loadData();
  }
};

window.regPage = {
  async loadData() {
    isLoading = true;
    rejectArmed = false;
    const root = document.getElementById('app-content');
    if (root) root.innerHTML = render();

    try {
      registrationsList = await fetchRegistrations(currentFilter);
      if (registrationsList && registrationsList.length > 0 && !selectedRegId) {
        selectedRegId = registrationsList[0].registrationId;
      }
    } catch (err) {
      console.error('Failed to fetch registrations:', err);
      showToast(err.message || 'Failed to fetch registrations queue', 'error');
    } finally {
      isLoading = false;
      if (root) root.innerHTML = render();
    }
  },

  setFilter(status) {
    currentFilter = status;
    this.loadData();
  },

  handleSearch(val) {
    searchFilter = val || '';
    const root = document.getElementById('app-content');
    if (root) root.innerHTML = render();
  },

  selectReg(id) {
    selectedRegId = id;
    rejectArmed = false;
    const root = document.getElementById('app-content');
    if (root) root.innerHTML = render();
  },

  async claimAssignment(id) {
    try {
      showToast('Claiming registration assignment...');
      await assignRegistration(id);
      showToast('Registration successfully assigned to your session', 'success');
      await this.loadData();
    } catch (err) {
      console.error('Assign error:', err);
      showToast(err.message || 'Failed to claim registration', 'error');
    }
  },

  async approveKYC(id) {
    const remarks = document.getElementById('reviewerRemarks')?.value?.trim();
    try {
      showToast('Approving registration & establishing SourceAccount...');
      await approveRegistration(id, remarks);
      showToast('Registration approved successfully! Verified SourceAccount established in ledger.', 'success');
      await this.loadData();
    } catch (err) {
      console.error('Approve error:', err);
      showToast(err.message || 'Failed to approve registration', 'error');
    }
  },

  async requestAction(id) {
    const remarks = document.getElementById('reviewerRemarks')?.value?.trim();
    if (!remarks) {
      showToast('Reviewer checklist comments are mandatory when requesting applicant action.', 'error');
      document.getElementById('reviewerRemarks')?.focus();
      return;
    }
    try {
      showToast('Returning registration for submitter action...');
      await requestActionRegistration(id, remarks);
      showToast('Registration status updated to ACTION_REQUIRED', 'warning');
      await this.loadData();
    } catch (err) {
      console.error('Request action error:', err);
      showToast(err.message || 'Failed to update registration status', 'error');
    }
  },

  async toggleReject(id) {
    const box = document.getElementById('rejectWarningBox');
    const btnText = document.getElementById('rejectBtnText');
    const btn = document.getElementById('btnReject');
    const remarks = document.getElementById('reviewerRemarks');

    if (!rejectArmed) {
      rejectArmed = true;
      if (box) box.classList.remove('hidden');
      if (btn) {
        btn.classList.add('bg-error', 'text-white');
        btn.classList.remove('bg-surface-crisp', 'text-error');
      }
      if (btnText) btnText.textContent = 'Confirm Rejection';
      if (remarks) remarks.focus();
    } else {
      const reason = remarks?.value?.trim();
      if (!reason) {
        showToast('A clear, documented rejection reason is mandatory.', 'error');
        remarks?.focus();
        return;
      }
      try {
        showToast('Processing statutory rejection...');
        await rejectRegistration(id, reason);
        showToast('Registration marked permanently REJECTED.', 'error');
        rejectArmed = false;
        await this.loadData();
      } catch (err) {
        console.error('Reject error:', err);
        showToast(err.message || 'Failed to reject registration', 'error');
      }
    }
  },
};

registerPage('registrations', render);
