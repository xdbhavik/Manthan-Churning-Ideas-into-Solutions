// ============================================================
// Screen 8: Audit Log (Immutable Timeline)
// ============================================================
import { registerPage } from '../app.js';

function render() {
  return `
    <div class="flex flex-col w-full">
      <!-- WORM Compliance Banner -->
      <div class="relative overflow-hidden rounded-xl bg-ashoka-blue text-on-primary p-space-lg shadow-md mb-space-xl">
        <div class="absolute -right-8 -bottom-10 w-48 h-48 bg-primary/40 rounded-full blur-2xl pointer-events-none"></div>
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-space-md relative z-10">
          <div class="flex items-start gap-space-md">
            <div class="w-10 h-10 rounded-lg bg-surface-crisp/10 flex items-center justify-center flex-shrink-0 text-tertiary-fixed">
              <span class="material-symbols-outlined text-[24px]">verified_user</span>
            </div>
            <div class="flex flex-col">
              <div class="flex items-center gap-space-xs flex-wrap">
                <span class="font-headline-sm text-headline-sm tracking-tight text-surface-crisp">Statutory Audit Protocol (SIH-AUD-WORM)</span>
                <span class="px-2 py-0.5 rounded bg-gov-emerald/20 text-tertiary-fixed font-mono-code text-label-sm border-0">SHA-256 CHAINED</span>
              </div>
              <p class="font-body-sm text-body-sm text-surface-variant mt-space-2xs max-w-3xl">
                🔒 <strong class="text-surface-crisp">WORM-Compliant Immutable Ledger:</strong> Deletion, alteration, and retroactive revision operations are cryptographically and physically prohibited under MeitY e-Governance Standards Sec 4.1.
              </p>
            </div>
          </div>
          <div class="flex items-center gap-space-sm flex-shrink-0 self-start md:self-center">
            <div class="px-3 py-1.5 rounded-lg bg-surface-crisp/10 flex items-center gap-space-xs font-mono-code text-label-sm text-surface-crisp">
              <span class="w-2 h-2 rounded-full bg-gov-emerald animate-pulse"></span>
              <span>SYNCED: BLOCK #894,204</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Metric Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-space-md mb-space-xl">
        ${metricCard('Total Events Logged', '14,291', 'trending_up', '100% Intact', 'gov-emerald', 'database', 'surface-container', 'institutional-navy')}
        ${metricCard('Terminal Events', '384', '', 'Requires dual-sign', 'text-muted', 'gavel', 'error-container/40', 'error', true)}
        ${metricCard('Active Disagreements', '12', '', 'Pending appellate panel', 'status-action-text', 'warning', 'status-action-bg', 'saffron-accent')}
        ${metricCard('Verification Engine', '99.98%', '', 'Deterministic hash match', 'gov-emerald', 'lock_clock', 'surface-container-low', 'secondary')}
      </div>

      <!-- Filter Ribbon -->
      <div class="bg-surface-crisp rounded-xl p-space-md shadow-sm mb-space-lg">
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
          <div class="flex items-center gap-space-xs flex-wrap">
            <span class="font-label-sm text-label-sm uppercase tracking-wider text-text-muted mr-space-xs">Categories:</span>
            <button class="audit-filter active px-3 py-1 rounded-full text-label-sm font-label-sm tracking-wider uppercase transition-colors bg-ashoka-blue text-on-primary shadow-sm" data-category="ALL">All (14.2k)</button>
            <button class="audit-filter px-3 py-1 rounded-full text-label-sm font-label-sm tracking-wider uppercase transition-colors bg-surface-muted text-text-secondary hover:bg-surface-container" data-category="GENERAL">
              <span class="inline-block w-2 h-2 rounded-full bg-text-muted mr-1.5"></span>General
            </button>
            <button class="audit-filter px-3 py-1 rounded-full text-label-sm font-label-sm tracking-wider uppercase transition-colors bg-status-submitted-bg text-status-submitted-text hover:bg-surface-container" data-category="SOURCE_VERIFICATION">
              <span class="inline-block w-2 h-2 rounded-full bg-institutional-navy mr-1.5"></span>Source Verification
            </button>
            <button class="audit-filter px-3 py-1 rounded-full text-label-sm font-label-sm tracking-wider uppercase transition-colors bg-status-review-bg text-status-review-text hover:bg-surface-container" data-category="EVALUATION">
              <span class="inline-block w-2 h-2 rounded-full bg-status-review-text mr-1.5"></span>Evaluation
            </button>
            <button class="audit-filter px-3 py-1 rounded-full text-label-sm font-label-sm tracking-wider uppercase transition-colors bg-status-action-bg text-status-action-text hover:bg-surface-container" data-category="DISAGREEMENT">
              <span class="inline-block w-2 h-2 rounded-full bg-saffron-accent mr-1.5"></span>Disagreement
            </button>
            <button class="audit-filter px-3 py-1 rounded-full text-label-sm font-label-sm tracking-wider uppercase transition-colors bg-error-container text-error hover:bg-surface-container" data-category="TERMINAL_EVENTS">
              <span class="inline-block w-2 h-2 rounded-full bg-error mr-1.5"></span>Terminal Events
            </button>
          </div>
          <div class="flex items-center gap-space-sm flex-wrap self-end lg:self-auto">
            <div class="relative">
              <span class="material-symbols-outlined absolute left-2.5 top-2 text-[18px] text-text-muted">search</span>
              <input class="pl-8 pr-3 py-1.5 bg-surface-subtle text-text-primary rounded-lg font-body-sm text-body-sm focus:outline-none focus:bg-surface-crisp transition-all w-52" id="ledger-search" placeholder="Search hash, user, IP..." type="text"/>
            </div>
            <button class="flex items-center gap-space-xs px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md transition-colors shadow-sm" id="sort-toggle-btn" onclick="window.auditPage.toggleSort()">
              <span class="material-symbols-outlined text-[18px] text-ashoka-blue" id="sort-icon">south</span>
              <span id="sort-label">Oldest at Top (Chronological)</span>
            </button>
            <button class="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-muted transition-colors" title="Export Immutable Audit Proof (JWS/EAL4)">
              <span class="material-symbols-outlined text-[20px]">file_download</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Timeline -->
      <div class="relative w-full">
        <div class="absolute left-6 md:left-8 top-6 bottom-8 w-0.5 bg-border-hairline z-0"></div>
        <div class="flex flex-col gap-space-lg relative z-10" id="timeline-feed">
          ${timelineEntry('GENERAL', 'info', 'surface-crisp', 'text-muted', 'USER_SESSION_INITIALIZED', 'text-primary', 'General', 'bg-surface-muted text-text-secondary', 'EVT-98104', '24 Oct 2024, 08:02:14 UTC', 'Shri A. Sharma', 'usr-adm-884219', '10.14.88.201', 'Internal VPN Mesh (NIC-Delhi)', 'BLOCK SIGNED', '0x88f2...b41a', 'User authenticated via Aadhaar OTP single sign-on mechanism. Issued temporary administrative challenge token for statutory nodal verification queue access.', '')}
          ${timelineEntry('SOURCE_VERIFICATION', 'verified', 'status-submitted-bg', 'institutional-navy', 'SOURCE_VERIFICATION_PASS', 'institutional-navy', 'Source Verification', 'bg-status-submitted-bg text-status-submitted-text', 'EVT-98105', '24 Oct 2024, 09:14:52 UTC', 'AutoBot Oracle Engine', 'svc-kyc-validator-01', '10.14.92.115', 'API Gateway VPC Gateway', '', '', 'Corporate identification number (CIN) <span class="font-mono-code text-text-primary font-semibold">U72200DL2021PTC384102</span> successfully validated against Ministry of Corporate Affairs canonical registry with positive active standing.', diffBlock('State Transition Diff [Entity: reg-77192]', 'REGISTRATION_STATE_V2', '{ "cin_verified": false, "status": "PENDING_VERIFICATION", "mca_status": null }', '{ "cin_verified": true, "status": "VERIFIED_AUTHENTIC", "mca_status": "ACTIVE" }'))}
          ${timelineEntry('GENERAL', 'manage_accounts', 'surface-crisp', 'text-muted', 'USER_ROLE_PROMOTED', 'text-primary', 'General', 'bg-surface-muted text-text-secondary', 'EVT-98106', '24 Oct 2024, 11:30:19 UTC', 'Superuser Root (sysadmin)', 'usr-root-000001', '10.14.88.100', 'Air-Gapped Ops Console', '', '', 'Elevated administrative privileges granted pursuant to Ministry notification Order Ref No. SIH-ADM/2024/77. Multi-signature mandate cleared by Secretariat.', diffBlock('Before / After Snapshot Diff (Role Authorization)', 'PERMS_MATRIX_DIFF', '{ "role": "REVIEWER", "clearance_tier": 2, "can_override_ai": false }', '{ "role": "ADMIN", "clearance_tier": 1, "can_override_ai": true }'))}
          ${timelineEntry('EVALUATION', 'psychology', 'status-review-bg', 'status-review-text', 'AI_ANALYSIS_RETRY', 'status-review-text', 'Evaluation', 'bg-status-review-bg text-status-review-text', 'EVT-98107', '24 Oct 2024, 13:45:01 UTC', 'Dr. Kavita Verma', 'usr-rev-419082', '10.14.88.245', 'Regional Center (Chandigarh)', '', '', 'Manual re-trigger requested on submission <span class="font-mono-code text-text-primary">PRB-2024-0091</span> due to contextual truncation in the novelty scoring matrix. Evaluation node dispatched to GPU cluster unit 04.', '')}
          ${timelineEntry('DISAGREEMENT', 'difference', 'status-action-bg', 'saffron-accent', 'EVALUATION_DISAGREEMENT_FLAGGED', 'status-action-text', 'Disagreement', 'bg-status-action-bg text-status-action-text', 'EVT-98108', '24 Oct 2024, 14:10:44 UTC', 'Prof. R. Sengupta', 'usr-eval-551029', '10.14.90.18', 'IIT Kharagpur Nodal Hub', '', '', 'Human evaluator scored submission at 82/100, whereas automated NLP baseline marked 43/100. Discrepancy logged for mandatory tertiary assessment committee deliberation.', diffBlock('Evaluation Score Matrix Snapshot', 'DISPUTE_LOG_REF_09', '{ "consensus_achieved": true, "variance_flag": false, "review_status": "LOCKED" }', '{ "consensus_achieved": false, "variance_flag": true, "review_status": "ESCALATED_TIER_3" }', true))}
          ${timelineEntry('TERMINAL_EVENTS', 'verified', 'error-container', 'error', 'REGISTRATION_APPROVED', 'error', 'Terminal Events', 'bg-error-container text-error', 'EVT-98109', '24 Oct 2024, 14:22:08 UTC', 'Shri A. Sharma', 'usr-adm-884219', '10.14.88.201', 'Dual Sign Verified Token', 'FINAL CERT ISSUED', 'IRREVERSIBLE COMMIT', 'Final statutory operational clearance issued for Entity <span class="font-mono-code text-text-primary font-medium">SIH-ORG-44910</span> (National Institute of Technology Agartala). Registration marked permanently terminal in accordance with General Financial Rules (GFR).', diffBlock('Terminal State Diff [reg-44910]', 'COMMIT_HASH: 0x9f48201ac', '{ "registration_status": "UNDER_REVIEW", "certificate_generated": false }', '{ "registration_status": "APPROVED", "certificate_generated": true, "issued_at": "2024-10-24T14:22:08Z" }'))}
        </div>
      </div>

      <!-- Footer -->
      <div class="mt-space-xl p-space-md bg-surface-crisp rounded-xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-space-md text-text-muted font-body-sm text-body-sm">
        <div class="flex items-center gap-space-sm">
          <span class="material-symbols-outlined text-[20px] text-gov-emerald">shield</span>
          <span>Ledger Root: <span class="font-mono-code text-text-primary">SHA256:0b0a887fe94ca218e8d8900aefca9001b94</span></span>
        </div>
        <div class="flex items-center gap-space-md font-mono-code text-[12px]">
          <span>SYNC_DELTA: 12ms</span>
          <span>RETENTION: STATUTORY_PERMANENT</span>
        </div>
      </div>
    </div>`;
}

function metricCard(title, value, trendIcon, subtitle, subtitleColor, icon, iconBg, iconColor, isError) {
  const valueColor = isError ? 'text-error' : (subtitleColor === 'gov-emerald' && trendIcon ? 'text-text-primary' : (isError ? 'text-error' : 'text-text-primary'));
  const trend = trendIcon ? `<span class="font-body-sm text-body-sm text-${subtitleColor} flex items-center gap-1 mt-1"><span class="material-symbols-outlined text-[16px]">${trendIcon}</span> ${subtitle}</span>` :
    `<span class="font-body-sm text-body-sm text-${subtitleColor} mt-1">${subtitle}</span>`;
  return `
    <div class="bg-surface-crisp p-space-md rounded-xl shadow-sm flex items-center justify-between">
      <div>
        <span class="font-label-sm text-label-sm uppercase tracking-wider text-text-muted">${title}</span>
        <div class="font-headline-lg text-headline-lg ${isError ? 'text-error' : `text-${iconColor === 'secondary' ? 'secondary' : (iconColor === 'institutional-navy' ? 'text-primary' : iconColor)}`} mt-space-2xs">${value}</div>
        ${trend}
      </div>
      <div class="w-12 h-12 rounded-xl bg-${iconBg} flex items-center justify-center text-${iconColor}">
        <span class="material-symbols-outlined text-[26px]">${icon}</span>
      </div>
    </div>`;
}

function diffBlock(title, schema, removed, added, isWarning) {
  const addedClass = isWarning ? 'bg-status-action-bg text-status-action-text' : 'bg-status-approved-bg text-status-approved-text';
  return `
    <div class="rounded-lg bg-surface-subtle overflow-hidden mt-space-md">
      <div class="bg-surface-muted px-space-md py-1.5 flex items-center justify-between">
        <span class="font-label-sm text-label-sm text-text-muted uppercase tracking-wider">${title}</span>
        <span class="font-mono-code text-[11px] text-text-muted">${schema}</span>
      </div>
      <div class="p-space-sm font-mono-code text-body-sm space-y-1">
        <div class="flex items-center gap-space-sm px-2 py-1 rounded bg-error-container/40 text-error">
          <span class="w-4 select-none font-bold">-</span><span class="line-through">${removed}</span>
        </div>
        <div class="flex items-center gap-space-sm px-2 py-1 rounded ${addedClass}">
          <span class="w-4 select-none font-bold">+</span><span>${added}</span>
        </div>
      </div>
    </div>`;
}

function timelineEntry(category, icon, iconBg, iconColor, eventName, eventColor, catLabel, catBadgeClass, eventId, timestamp, actor, actorId, ip, ipLabel, integrityLabel, integrityHash, description, extraContent) {
  const col3 = integrityLabel
    ? `<div><span class="font-label-sm text-label-sm uppercase tracking-wider text-text-muted block">${integrityLabel ? 'Integrity State' : 'Terminal Status Seal'}</span>
        <span class="font-mono-code text-body-sm text-gov-emerald flex items-center gap-1"><span class="material-symbols-outlined text-[16px]">task_alt</span> ${integrityLabel}</span>
        ${integrityHash ? `<span class="font-mono-code text-[11px] text-text-muted truncate block">${integrityHash}</span>` : ''}
       </div>`
    : `<div><span class="font-label-sm text-label-sm uppercase tracking-wider text-text-muted block">Upstream Authority</span>
        <span class="font-body-md text-body-md text-text-primary">${ipLabel}</span>
        ${integrityHash ? `<span class="font-mono-code text-[11px] text-gov-emerald block">${integrityHash}</span>` : ''}
       </div>`;

  return `
    <div class="timeline-entry flex items-start gap-space-md group" data-category="${category}">
      <div class="w-12 md:w-16 flex-shrink-0 flex justify-center pt-1.5">
        <div class="w-7 h-7 rounded-full bg-${iconBg} shadow-sm flex items-center justify-center text-${iconColor} group-hover:scale-110 transition-transform">
          <span class="material-symbols-outlined text-[16px]">${icon}</span>
        </div>
      </div>
      <div class="flex-1 bg-surface-crisp rounded-xl p-space-lg shadow-sm hover:shadow-md transition-shadow">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs mb-space-sm">
          <div class="flex items-center gap-space-sm flex-wrap">
            <span class="font-mono-code text-body-md font-semibold text-${eventColor}">${eventName}</span>
            <span class="px-2 py-0.5 rounded-full ${catBadgeClass} font-label-sm text-label-sm uppercase tracking-wider">${catLabel}</span>
            <span class="font-mono-code text-[11px] text-text-muted px-1.5 py-0.5 bg-surface-subtle rounded">ID: ${eventId}</span>
          </div>
          <div class="flex items-center gap-space-xs text-text-muted font-mono-code text-body-sm">
            <span class="material-symbols-outlined text-[16px]">schedule</span><span>${timestamp}</span>
          </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-space-md py-space-sm mb-space-sm bg-surface-subtle rounded-lg px-space-md">
          <div>
            <span class="font-label-sm text-label-sm uppercase tracking-wider text-text-muted block">Performed By Actor</span>
            <span class="font-body-md text-body-md text-text-primary font-medium">${actor}</span>
            <span class="font-mono-code text-body-sm text-text-muted block">${actorId}</span>
          </div>
          <div>
            <span class="font-label-sm text-label-sm uppercase tracking-wider text-text-muted block">Source IPv4 Address</span>
            <span class="font-mono-code text-body-md text-institutional-navy block">${ip}</span>
            <span class="font-body-sm text-body-sm text-text-muted">${integrityLabel ? ipLabel : ''}</span>
          </div>
          ${col3}
        </div>
        <p class="font-body-md text-body-md text-text-secondary ${extraContent ? 'mb-space-md' : ''}">${description}</p>
        ${extraContent}
      </div>
    </div>`;
}

let isOldestFirst = true;

render.afterRender = function() {
  // Category filter
  document.querySelectorAll('.audit-filter').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.audit-filter').forEach(b => {
        b.classList.remove('active', 'bg-ashoka-blue', 'text-on-primary', 'shadow-sm');
        if (b.dataset.category === 'ALL') b.classList.add('bg-surface-muted', 'text-text-secondary');
      });
      this.classList.add('active', 'bg-ashoka-blue', 'text-on-primary', 'shadow-sm');
      const cat = this.dataset.category;
      const search = document.getElementById('ledger-search')?.value?.toLowerCase()?.trim() || '';
      document.querySelectorAll('#timeline-feed .timeline-entry').forEach(entry => {
        const matchCat = cat === 'ALL' || entry.dataset.category === cat;
        const matchSearch = !search || entry.textContent.toLowerCase().includes(search);
        entry.style.display = (matchCat && matchSearch) ? 'flex' : 'none';
      });
    });
  });

  // Search
  const searchInput = document.getElementById('ledger-search');
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      const query = this.value.toLowerCase().trim();
      const activeBtn = document.querySelector('.audit-filter.active');
      const activeCat = activeBtn ? activeBtn.dataset.category : 'ALL';
      document.querySelectorAll('#timeline-feed .timeline-entry').forEach(entry => {
        const matchCat = activeCat === 'ALL' || entry.dataset.category === activeCat;
        const matchSearch = !query || entry.textContent.toLowerCase().includes(query);
        entry.style.display = (matchCat && matchSearch) ? 'flex' : 'none';
      });
    });
  }
};

window.auditPage = {
  toggleSort() {
    isOldestFirst = !isOldestFirst;
    const feed = document.getElementById('timeline-feed');
    const entries = Array.from(feed.querySelectorAll('.timeline-entry'));
    entries.reverse().forEach(e => feed.appendChild(e));
    const icon = document.getElementById('sort-icon');
    const label = document.getElementById('sort-label');
    if (isOldestFirst) { icon.textContent = 'south'; label.textContent = 'Oldest at Top (Chronological)'; }
    else { icon.textContent = 'north'; label.textContent = 'Newest at Top (Reverse)'; }
  },
};

registerPage('audit', render);
