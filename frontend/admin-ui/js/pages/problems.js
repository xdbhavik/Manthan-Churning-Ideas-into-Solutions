// ============================================================
// Screen 6: Problems Management & Verification
// ============================================================
import { registerPage, showToast } from '../app.js';

function render() {
  return `
    <div class="flex flex-col gap-space-xl">
      <!-- Top Header Strip -->
      <div class="grid grid-cols-1 md:grid-cols-12 gap-space-md">
        <div class="md:col-span-8 bg-surface-crisp p-space-lg rounded-xl shadow-sm flex flex-col justify-between">
          <div class="flex flex-wrap items-center justify-between gap-space-sm mb-space-md">
            <div class="flex items-center gap-space-xs">
              <span class="px-2 py-0.5 rounded-full bg-ashoka-blue text-on-primary font-label-sm text-label-sm uppercase tracking-wider">Repository Node</span>
              <span class="text-text-muted font-mono-code text-body-sm">REGISTRY://PRB-NATIONAL-V2</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="inline-block w-2.5 h-2.5 rounded-full bg-gov-emerald animate-pulse"></span>
              <span class="font-label-sm text-label-sm text-text-secondary">Sync Active • Lock Consensus v4</span>
            </div>
          </div>
          <div class="flex flex-col lg:flex-row lg:items-end justify-between gap-space-md">
            <div>
              <h1 class="font-headline-lg text-headline-lg text-ashoka-blue tracking-tight">Civic Challenges &amp; Problem Statements</h1>
              <p class="font-body-md text-body-md text-text-secondary mt-1">Multi-tier verified problem statements under sovereign evaluation &amp; allocation.</p>
            </div>
            <div class="flex items-center gap-space-sm">
              <button class="px-space-md py-2 rounded-lg bg-surface-container text-ashoka-blue font-label-md text-label-md hover:bg-surface-container-high transition-colors flex items-center gap-1.5 shadow-sm">
                <span class="material-symbols-outlined text-[18px]">filter_list</span><span>Filter Matrix</span>
              </button>
            </div>
          </div>
        </div>
        <!-- Pipeline Donut -->
        <div class="md:col-span-4 bg-ashoka-blue text-on-primary p-space-lg rounded-xl shadow-sm flex flex-col justify-between relative overflow-hidden border border-ashoka-blue">
          <div class="flex items-center justify-between">
            <span class="font-label-sm text-label-sm uppercase tracking-wider text-on-primary-container">Pipeline Distribution</span>
            <span class="font-mono-code text-label-sm text-tertiary-fixed font-semibold">TOTAL: 142</span>
          </div>
          <div class="my-space-md flex items-center gap-space-md">
            <svg class="w-16 h-16 shrink-0 -rotate-90" viewBox="0 0 36 36">
              <path class="text-on-primary-container/20" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" stroke-width="4"></path>
              <path class="text-tertiary-fixed" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" stroke-dasharray="45, 100" stroke-width="4"></path>
              <path class="text-secondary-container" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" stroke-dasharray="25, 100" stroke-dashoffset="-45" stroke-width="4"></path>
              <path class="text-saffron-accent" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" stroke-dasharray="15, 100" stroke-dashoffset="-70" stroke-width="4"></path>
            </svg>
            <div class="grid grid-cols-2 gap-x-space-md gap-y-1 text-on-primary">
              <div><span class="text-[10px] text-on-primary-container block font-mono-code">REGISTERED</span><span class="font-headline-sm text-headline-sm">64</span></div>
              <div><span class="text-[10px] text-on-primary-container block font-mono-code">VERIFYING</span><span class="font-headline-sm text-headline-sm">36</span></div>
              <div><span class="text-[10px] text-on-primary-container block font-mono-code">SUBMITTED</span><span class="font-headline-sm text-headline-sm">21</span></div>
              <div><span class="text-[10px] text-on-primary-container block font-mono-code">ACTION/REJ</span><span class="font-headline-sm text-headline-sm">21</span></div>
            </div>
          </div>
          <div class="text-[11px] font-mono-code text-on-primary-container flex items-center justify-between pt-space-xs border-t border-on-primary-container/20">
            <span>Active Lock Index: 0x9041</span><span class="text-tertiary-fixed">Consensus OK</span>
          </div>
        </div>
      </div>

      <!-- Problem Statements Table -->
      <div class="bg-surface-crisp rounded-xl shadow-sm overflow-hidden">
        <div class="p-space-md bg-surface-subtle flex flex-wrap items-center justify-between gap-space-md">
          <div class="flex items-center gap-space-sm">
            <span class="material-symbols-outlined text-ashoka-blue text-[20px]">view_list</span>
            <span class="font-headline-sm text-headline-sm text-ashoka-blue">Sovereign Registry Index</span>
            <span class="text-text-muted font-mono-code text-body-sm ml-2">(6 statements in viewport)</span>
          </div>
          <div class="relative">
            <span class="material-symbols-outlined absolute left-2.5 top-2.5 text-text-muted text-[18px]">search</span>
            <input class="pl-8 pr-3 py-1.5 rounded-lg bg-surface-crisp font-body-sm text-body-sm text-text-primary placeholder:text-text-muted w-64 focus:outline-none focus:ring-1 focus:ring-ashoka-blue shadow-sm" placeholder="Search ID, title, domain..." type="text"/>
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left">
            <thead class="bg-surface-container-low text-text-secondary font-label-sm text-label-sm uppercase tracking-wider">
              <tr>
                <th class="py-3 px-space-md">ID</th>
                <th class="py-3 px-space-md">Title &amp; Sector</th>
                <th class="py-3 px-space-md">Source Entity</th>
                <th class="py-3 px-space-md">Workflow Status</th>
                <th class="py-3 px-space-md">Lock Version</th>
                <th class="py-3 px-space-md text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="font-body-md text-body-md divide-y-0">
              ${problemRow('PRB-2024-9041', 'Groundwater Contamination & Fluoride Filtration in Rural Aquifers', 'Water Sanitation • Jal Jeevan Mission', 'Ministry of Jal Shakti', 'GOV-CENTRAL-099', 'REGISTERED', 'bg-status-approved-bg text-status-approved-text', 'v4', true)}
              ${problemRow('PRB-2024-8832', 'Autonomous Distributed Micro-Grid Load Balancer for Hilly Terrains', 'Renewable Energy • Ladakh Region', 'NIT Srinagar Renewable Research', 'HEI-ACAD-311', 'SOURCE_VERIFYING', 'bg-status-review-bg text-status-review-text', 'v2')}
              ${problemRow('PRB-2024-8711', 'Cold Storage Supply Chain Telemetry for Inland Perishable Produce', 'AgriTech • National Logistics Cell', 'AgriProcure Cooperative Federations', 'COMM-AGRI-104', 'SOURCE_VERIFIED', 'bg-surface-container-high text-institutional-navy', 'v3')}
              ${problemRow('PRB-2024-9102', 'Urban Stormwater Drain Siltation Acoustic Sensing Mesh', 'Urban Infrastructure • Smart Cities', 'Municipal Corp of Greater Mumbai', 'GOV-URBAN-402', 'SUBMITTED', 'bg-status-submitted-bg text-status-submitted-text', 'v1')}
              ${problemRow('PRB-2024-7490', 'Generic LLM Chatbot for Citizen Grievance Portal', 'GovTech • Non-Specific Scope', 'InnoTech Solutions LLP', 'IND-CORP-981', 'REJECTED', 'bg-error-container text-error', 'v2')}
              ${problemRow('PRB-2023-5019', 'Telemetry Sensors for Paddy Stubble Burning Detection (Cycle 2023)', 'Environment • Completed Lifecycle', 'Central Pollution Control Board', 'GOV-CENTRAL-012', 'ARCHIVED', 'bg-surface-muted text-text-muted', 'v6')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Conflict Banner (Hidden by default, triggered on 409 concurrency conflict) -->
      <div class="hidden bg-status-action-bg p-space-lg rounded-xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-space-md" id="conflict-banner">
        <div class="flex items-start gap-space-md">
          <div class="w-10 h-10 rounded-full bg-status-action-border flex items-center justify-center shrink-0">
            <span class="material-symbols-outlined text-status-action-text text-[24px]">warning</span>
          </div>
          <div class="flex flex-col">
            <span class="font-label-sm text-label-sm text-status-action-text uppercase tracking-wider font-bold">Optimistic Concurrency Fault • Mutex Error #409</span>
            <p class="font-headline-sm text-headline-sm text-status-action-text font-bold mt-0.5">The problem was modified by another user while you were viewing it.</p>
            <p class="font-body-md text-body-md text-status-action-text mt-1">
              (Version mismatch: server is at <span class="font-mono-code font-bold">v5 [Committed by Reviewer #4102 at 14:38:10 IST]</span> while your buffer holds <span class="font-mono-code font-bold">v4</span>).
            </p>
          </div>
        </div>
        <button class="px-space-lg py-2.5 rounded-lg bg-saffron-accent text-on-primary font-label-md text-label-md hover:bg-opacity-90 transition-all flex items-center gap-2 shadow-sm font-semibold shrink-0" onclick="window.problemsPage.reloadFresh()">
          <span class="material-symbols-outlined text-[18px]">sync</span><span>Reload Fresh Data</span>
        </button>
      </div>

      <!-- Selected Problem Detail -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
        <!-- Left (7 cols) -->
        <div class="lg:col-span-7 flex flex-col gap-space-lg">
          <!-- Statement Dossier -->
          <div class="bg-surface-crisp p-space-lg rounded-xl shadow-sm flex flex-col gap-space-md">
            <div class="flex flex-wrap items-center justify-between gap-space-sm pb-space-sm border-b border-border-hairline">
              <div class="flex items-center gap-space-sm">
                <span class="font-mono-code text-body-lg font-bold text-ashoka-blue">PRB-2024-9041</span>
                <span class="px-2 py-0.5 rounded bg-surface-container font-mono-code text-label-sm text-ashoka-blue font-bold">Active Buffer: v4</span>
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full bg-status-approved-bg text-status-approved-text font-label-sm text-label-sm uppercase font-bold tracking-wider">REGISTERED</span>
              </div>
              <button class="px-space-lg py-2.5 rounded-lg bg-gov-emerald text-on-primary font-label-md text-label-md hover:bg-opacity-90 transition-all shadow-md flex items-center gap-2 font-bold ring-2 ring-gov-emerald/30" onclick="window.problemsPage.startEvaluation('PRB-2024-9041')">
                <span class="material-symbols-outlined text-[20px]">biotech</span><span>Start Evaluation</span>
              </button>
            </div>
            <div>
              <span class="text-text-muted font-label-sm text-label-sm uppercase tracking-wider block mb-1">Title of Challenge</span>
              <h2 class="font-headline-lg text-headline-lg text-text-primary leading-snug">Groundwater Contamination &amp; Fluoride Filtration in Rural Aquifers</h2>
            </div>
            <!-- Visual Asset + Contaminant Data -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-space-md my-space-xs">
              <div class="relative rounded-lg overflow-hidden h-44 shadow-sm bg-surface-container flex items-center justify-center">
                <div class="text-center p-space-md">
                  <span class="material-symbols-outlined text-ashoka-blue text-[48px]">water_drop</span>
                  <p class="font-label-sm text-label-sm text-text-muted mt-2">Shekhawati Aquifer Basin, Sikar</p>
                  <p class="font-mono-code text-[11px] text-text-muted">LAT 27.6090° N, LONG 75.1398° E</p>
                </div>
              </div>
              <div class="bg-surface-subtle p-space-md rounded-lg flex flex-col justify-between">
                <div>
                  <span class="font-label-sm text-label-sm uppercase tracking-wider text-text-muted">Target Contaminant Profile</span>
                  <div class="mt-space-xs flex items-baseline gap-2">
                    <span class="font-headline-lg text-headline-lg text-saffron-accent">6.8 mg/L</span>
                    <span class="font-label-sm text-label-sm text-error uppercase font-bold">(Critical Limit: 1.5 mg/L)</span>
                  </div>
                  <p class="font-body-sm text-body-sm text-text-secondary mt-1">High prevalence of skeletal fluorosis reported across 42 Gram Panchayats.</p>
                </div>
                <div class="pt-space-xs border-t border-border-hairline flex items-center justify-between text-text-muted font-mono-code text-[11px]">
                  <span>Sensor ID: RJ-WQ-902</span><span class="text-gov-emerald font-semibold">• Online Telemetry</span>
                </div>
              </div>
            </div>
            <!-- Metadata Grid -->
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-space-md bg-surface-subtle p-space-md rounded-lg">
              <div><span class="font-label-sm text-label-sm text-text-muted uppercase">Sponsoring Body</span><p class="font-label-md text-label-md text-text-primary mt-0.5">Ministry of Jal Shakti</p></div>
              <div><span class="font-label-sm text-label-sm text-text-muted uppercase">Nodal Officer</span><p class="font-label-md text-label-md text-text-primary mt-0.5">Er. Rajeshwar Rao, SE</p></div>
              <div><span class="font-label-sm text-label-sm text-text-muted uppercase">Sub-Category</span><p class="font-label-md text-label-md text-text-primary mt-0.5">Aquifer Reclamation</p></div>
              <div><span class="font-label-sm text-label-sm text-text-muted uppercase">Beneficiary Radius</span><p class="font-label-md text-label-md text-text-primary mt-0.5">180,000 Inhabitants</p></div>
              <div><span class="font-label-sm text-label-sm text-text-muted uppercase">Target Delivery</span><p class="font-label-md text-label-md text-text-primary mt-0.5">Q3 2025 Operational</p></div>
              <div><span class="font-label-sm text-label-sm text-text-muted uppercase">TRL Requirement</span><p class="font-label-md text-label-md text-text-primary mt-0.5">Level 6+ (Pilot Field Test)</p></div>
            </div>
            <div class="flex flex-col gap-space-xs">
              <span class="font-label-sm text-label-sm uppercase tracking-wider text-text-muted">Problem Scope &amp; Deliverable Constraints</span>
              <p class="font-body-md text-body-md text-text-secondary leading-relaxed">Design and scale an indigenous, zero-electricity or low-power decentralized water purification unit capable of scrubbing excess fluoride, total dissolved solids (TDS), and heavy metal traces from hyper-saline groundwater wells without generating hazardous brine runoffs in semi-arid zones.</p>
            </div>
          </div>
          <!-- Optimistic Lock Controller -->
          <div class="bg-surface-crisp p-space-lg rounded-xl shadow-sm flex flex-col gap-space-md">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-space-xs">
                <span class="material-symbols-outlined text-ashoka-blue text-[20px]">lock_clock</span>
                <span class="font-headline-sm text-headline-sm text-ashoka-blue">Status Advancement &amp; Optimistic Lock Guard</span>
              </div>
              <span class="px-2.5 py-1 rounded bg-surface-container text-ashoka-blue font-mono-code text-label-sm font-semibold">E-TAG: "a09f8c2_v4"</span>
            </div>
            <div class="bg-surface-subtle p-space-md rounded-lg flex flex-col gap-space-xs">
              <div class="flex justify-between items-center text-text-secondary font-body-sm text-body-sm">
                <span>Current Status: <strong class="text-gov-emerald">REGISTERED</strong></span>
                <span>Payload State Hash: <strong class="font-mono-code text-[12px]">0x3C81...7E4B</strong></span>
              </div>
              <div class="flex justify-between items-center text-text-secondary font-body-sm text-body-sm">
                <span>Next Legal State: <strong>EVALUATION_IN_PROGRESS</strong></span>
                <span>Optimistic Version Guard: <strong class="font-mono-code text-ashoka-blue font-bold">version === 4</strong></span>
              </div>
            </div>
            <div class="flex flex-wrap items-center justify-between gap-space-md pt-space-xs">
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-text-muted text-[18px]">verified_user</span>
                <span class="text-text-muted font-body-sm text-body-sm">Advancing requires administrative consensus signature</span>
              </div>
              <div class="flex items-center gap-space-sm">
                <button class="px-space-lg py-2 rounded-lg bg-ashoka-blue text-on-primary font-label-md text-label-md hover:bg-institutional-navy transition-colors font-bold shadow-sm flex items-center gap-1.5" onclick="window.problemsPage.transitionEvaluation('PRB-2024-9041')">
                  <span>Transition to EVALUATION</span><span class="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Right (5 cols) -->
        <div class="lg:col-span-5 flex flex-col gap-space-lg">
          <!-- Verification Checklist -->
          <div class="bg-surface-crisp p-space-lg rounded-xl shadow-sm flex flex-col gap-space-md">
            <div class="flex items-center justify-between pb-space-xs border-b border-border-hairline">
              <div class="flex items-center gap-space-xs">
                <span class="material-symbols-outlined text-ashoka-blue text-[20px]">fact_check</span>
                <span class="font-headline-sm text-headline-sm text-ashoka-blue">Source Verification Checklist</span>
              </div>
              <span class="px-2 py-0.5 rounded-full bg-status-action-bg text-status-action-text font-label-sm text-label-sm font-bold">Mandatory</span>
            </div>
            <form class="flex flex-col gap-space-md" onsubmit="window.problemsPage.recordEvent(event)">
              <div class="flex flex-col gap-space-xs">
                <label class="font-label-md text-label-md text-text-primary flex items-center justify-between">
                  <span>Verification Method <span class="text-saffron-accent">*</span></span>
                  <span class="text-text-muted font-mono-code text-[11px]">ISO-27001-SEC</span>
                </label>
                <select id="verification-method" class="w-full px-3 py-2 rounded-lg bg-surface-subtle text-text-primary font-body-md text-body-md focus:bg-surface-crisp focus:outline-none focus:ring-1 focus:ring-ashoka-blue shadow-sm">
                  <option value="AUTHORIZATION_DOC" selected>AUTHORIZATION_DOC • Official Mandate Letter</option>
                  <option value="OFFICIAL_EMAIL">OFFICIAL_EMAIL • Direct Verified Gov Domain</option>
                  <option value="OTP">OTP • Dual-Factor Sign-off (+91-NIC)</option>
                  <option value="REGISTRATION_API">REGISTRATION_API • Bharat Portal Automated Sync</option>
                  <option value="INSTITUTIONAL_EMAIL">INSTITUTIONAL_EMAIL • Dean / Secretary Level</option>
                  <option value="MANUAL_REVIEW">MANUAL_REVIEW • In-Person Statutory Committee</option>
                </select>
              </div>
              <div class="flex flex-col gap-space-xs">
                <label class="font-label-md text-label-md text-text-primary">Verification Result <span class="text-saffron-accent">*</span></label>
                <div class="grid grid-cols-3 gap-space-sm">
                  <label class="flex items-center justify-center gap-1.5 p-2 rounded-lg bg-surface-subtle cursor-pointer hover:bg-surface-container font-label-md text-label-md">
                    <input checked class="accent-ashoka-blue" name="result" type="radio" value="PASS"/><span class="text-gov-emerald font-bold">PASS</span>
                  </label>
                  <label class="flex items-center justify-center gap-1.5 p-2 rounded-lg bg-surface-subtle cursor-pointer hover:bg-surface-container font-label-md text-label-md">
                    <input class="accent-ashoka-blue" name="result" type="radio" value="NEEDS_REVIEW"/><span class="text-status-review-text font-semibold">NEEDS_REV</span>
                  </label>
                  <label class="flex items-center justify-center gap-1.5 p-2 rounded-lg bg-surface-subtle cursor-pointer hover:bg-surface-container font-label-md text-label-md">
                    <input class="accent-ashoka-blue" name="result" type="radio" value="FAIL"/><span class="text-error font-semibold">FAIL</span>
                  </label>
                </div>
              </div>
              <div class="flex flex-col gap-space-xs">
                <label class="font-label-md text-label-md text-text-primary">Verification Notes &amp; Statutory References <span class="text-saffron-accent">*</span></label>
                <textarea id="verification-notes" class="w-full p-2.5 rounded-lg bg-surface-subtle text-text-primary font-body-md text-body-md focus:bg-surface-crisp focus:outline-none focus:ring-1 focus:ring-ashoka-blue shadow-sm resize-none" rows="3">Verified against Ministry of Jal Shakti nodal gazette registry (Ref: JJM-WQ-2024-811-N). Cross-checked with District Water Quality Assessment cell.</textarea>
              </div>
              <button class="w-full py-2.5 rounded-lg bg-ashoka-blue text-on-primary font-label-md text-label-md hover:bg-institutional-navy transition-all shadow-sm flex items-center justify-center gap-2 font-bold" type="submit">
                <span class="material-symbols-outlined text-[18px]">playlist_add_check</span><span>Record Verification Event</span>
              </button>
            </form>
          </div>
          <!-- Audit Trail -->
          <div class="bg-surface-crisp p-space-lg rounded-xl shadow-sm flex flex-col gap-space-md">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-space-xs">
                <span class="material-symbols-outlined text-ashoka-blue text-[20px]">history</span>
                <span class="font-headline-sm text-headline-sm text-ashoka-blue">Immutable Audit Trail</span>
              </div>
              <span class="text-text-muted font-mono-code text-body-sm">Append-Only Log</span>
            </div>
            <div class="flex flex-col gap-space-md relative pl-5" id="prb-events-timeline">
              <div class="absolute left-2 top-2 bottom-2 w-0.5 bg-border-hairline"></div>
              ${auditEvent('AUTHORIZATION_DOC', 'PASS', 'Verified against Ministry of Jal Shakti nodal gazette registry.', 'ADM-9942 (Sysadmin Root)', '2024-10-24 14:12:08 IST', 'gov-emerald', 'status-approved')}
              ${auditEvent('OFFICIAL_EMAIL', 'PASS', 'Confirmed domain MX records for @jalshakti.gov.in via NIC Mail Gateway.', 'ADM-3108 (Nodal Sec)', '2024-10-23 18:45:22 IST', 'gov-emerald', 'status-approved')}
              ${auditEvent('OTP', 'NEEDS_REVIEW', 'Initial OTP token sent to alternate contact timed out. Re-routed to primary phone.', 'SYSTEM_AUTOGATE', '2024-10-23 11:20:14 IST', 'saffron-accent', 'status-action')}
            </div>
          </div>
        </div>
      </div>
    </div>`;
}

function problemRow(id, title, sector, entity, code, status, statusClasses, version, isActive) {
  const rowClass = isActive ? 'bg-surface-container transition-colors cursor-pointer' : 'hover:bg-surface-container-low transition-colors';
  const idClass = isActive ? 'font-semibold text-ashoka-blue flex items-center gap-1.5' : 'text-text-primary';
  const actionContent = isActive
    ? `<span class="px-3 py-1 rounded bg-ashoka-blue text-on-primary font-label-sm text-label-sm uppercase tracking-wide shadow-sm">Viewing</span>`
    : `<button class="px-2.5 py-1 rounded text-ashoka-blue hover:bg-surface-container font-label-sm text-label-sm font-semibold">Inspect</button>`;
  return `
    <tr class="${rowClass}">
      <td class="py-3.5 px-space-md font-mono-code text-body-sm ${idClass}">
        ${isActive ? '<span class="material-symbols-outlined text-gov-emerald text-[16px]">arrow_right</span>' : ''}${id}
      </td>
      <td class="py-3.5 px-space-md">
        <div class="font-label-lg text-label-lg ${isActive ? 'text-ashoka-blue font-semibold' : 'text-text-primary'}">${title}</div>
        <div class="text-text-muted text-body-sm">${sector}</div>
      </td>
      <td class="py-3.5 px-space-md">
        <div class="font-label-md text-label-md text-text-primary">${entity}</div>
        <div class="text-text-muted font-mono-code text-[11px]">${code}</div>
      </td>
      <td class="py-3.5 px-space-md">
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full ${statusClasses} font-label-sm text-label-sm uppercase font-bold tracking-wider">${status}</span>
      </td>
      <td class="py-3.5 px-space-md font-mono-code text-body-sm text-text-${isActive ? 'secondary' : 'muted'}">
        ${isActive ? `<span class="px-2 py-0.5 rounded bg-surface-crisp font-semibold shadow-sm">${version}</span>` : version}
      </td>
      <td class="py-3.5 px-space-md text-right">${actionContent}</td>
    </tr>`;
}

function auditEvent(method, result, notes, actor, time, dotColor, badgeType) {
  const badgeClass = result === 'PASS' ? `bg-${badgeType}-bg text-${badgeType}-text` :
                     result === 'NEEDS_REVIEW' ? `bg-status-action-bg text-status-action-text` :
                     'bg-error-container text-error';
  return `
    <div class="relative flex flex-col gap-1 bg-surface-subtle p-space-md rounded-lg shadow-sm">
      <span class="absolute -left-5 top-3 w-3 h-3 rounded-full bg-${dotColor}"></span>
      <div class="flex flex-wrap items-center justify-between gap-1">
        <span class="font-mono-code text-[11px] font-bold text-ashoka-blue">${method}</span>
        <span class="px-2 py-0.5 rounded-full ${badgeClass} font-label-sm text-label-sm font-bold">${result}</span>
      </div>
      <p class="font-body-sm text-body-sm text-text-primary mt-1">${notes}</p>
      <div class="flex items-center justify-between mt-1 text-text-muted font-mono-code text-[11px]">
        <span>By: ${actor}</span><span>${time}</span>
      </div>
    </div>`;
}

window.problemsPage = {
  startEvaluation(code) {
    showToast(`Evaluation cycle initiated for challenge ${code}`, 'success');
  },
  transitionEvaluation(code) {
    showToast(`State transition registered for ${code}: EVALUATION_IN_PROGRESS`, 'success');
  },
  reloadFresh() {
    const banner = document.getElementById('conflict-banner');
    if (banner) {
      banner.innerHTML = `
        <div class="flex items-center gap-space-md py-1">
          <div class="w-8 h-8 rounded-full bg-gov-emerald flex items-center justify-center shrink-0"><span class="material-symbols-outlined text-on-primary text-[20px]">check</span></div>
          <div><span class="font-label-md text-label-md text-gov-emerald font-bold">Fresh State Synchronized Successfully</span>
          <p class="font-body-sm text-body-sm text-text-secondary">Workspace updated to version <strong>v5</strong>. Concurrency lock re-established.</p></div>
        </div>`;
      banner.className = 'bg-status-approved-bg p-space-lg rounded-xl shadow-md';
      setTimeout(() => banner.style.display = 'none', 4000);
    }
  },
  recordEvent(e) {
    e.preventDefault();
    const method = document.getElementById('verification-method')?.value;
    const notes = document.getElementById('verification-notes')?.value;
    const selectedRadio = document.querySelector('input[name="result"]:checked');
    const result = selectedRadio ? selectedRadio.value : 'PASS';
    const dotColors = { PASS: 'gov-emerald', NEEDS_REVIEW: 'saffron-accent', FAIL: 'error' };
    const badgeColors = { PASS: 'bg-status-approved-bg text-status-approved-text', NEEDS_REVIEW: 'bg-status-action-bg text-status-action-text', FAIL: 'bg-error-container text-error' };
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' IST';
    const timeline = document.getElementById('prb-events-timeline');
    if (timeline) {
      const newEl = document.createElement('div');
      newEl.className = 'relative flex flex-col gap-1 bg-surface-subtle p-space-md rounded-lg shadow-sm animate-pulse';
      newEl.innerHTML = `
        <span class="absolute -left-5 top-3 w-3 h-3 rounded-full bg-${dotColors[result]}"></span>
        <div class="flex flex-wrap items-center justify-between gap-1">
          <span class="font-mono-code text-[11px] font-bold text-ashoka-blue">${method}</span>
          <span class="px-2 py-0.5 rounded-full ${badgeColors[result]} font-label-sm text-label-sm font-bold">${result}</span>
        </div>
        <p class="font-body-sm text-body-sm text-text-primary mt-1">${notes}</p>
        <div class="flex items-center justify-between mt-1 text-text-muted font-mono-code text-[11px]">
          <span>By: ADM-CURRENT (Root)</span><span>${now}</span>
        </div>`;
      timeline.insertBefore(newEl, timeline.children[1]);
      setTimeout(() => newEl.classList.remove('animate-pulse'), 1500);
    }
  },
};

registerPage('problems', render);
