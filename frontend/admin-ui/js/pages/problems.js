// ============================================================
// Screen 6: Problems Management & Verification (Live API Integration)
// ============================================================
import { registerPage, showToast, navigate } from '../app.js';
import {
  fetchProblems,
  fetchProblem,
  updateProblemStatus,
  fetchEvidence,
  fetchAuditByProblem,
  startEvaluation,
} from '../api.js';

let problemsList = [];
let selectedProblem = null;
let evidenceList = [];
let auditLogs = [];
let selectedProblemId = null;
let currentFilter = 'ALL';
let searchFilter = '';
let isLoading = true;
let isDetailLoading = false;
let concurrencyConflict = null;

export async function loadProblems() {
  isLoading = true;
  concurrencyConflict = null;
  renderAppContent();

  try {
    const list = await fetchProblems();
    problemsList = Array.isArray(list) ? list : [];
    
    if (problemsList.length > 0) {
      const targetId = selectedProblemId || problemsList[0].problemId;
      await selectProblem(targetId, false);
    } else {
      selectedProblem = null;
      evidenceList = [];
      auditLogs = [];
    }
  } catch (err) {
    console.error('Failed to load problems:', err);
    showToast(err.message || 'Failed to fetch problem statements', 'error');
  } finally {
    isLoading = false;
    renderAppContent();
  }
}

export async function selectProblem(id, shouldRender = true) {
  selectedProblemId = id;
  isDetailLoading = true;
  concurrencyConflict = null;
  if (shouldRender) renderAppContent();

  try {
    const [detail, ev, logs] = await Promise.all([
      fetchProblem(id).catch(() => problemsList.find(p => p.problemId === id)),
      fetchEvidence(id).catch(() => []),
      fetchAuditByProblem(id).catch(() => []),
    ]);
    selectedProblem = detail;
    evidenceList = Array.isArray(ev) ? ev : [];
    auditLogs = Array.isArray(logs) ? logs : [];
  } catch (err) {
    console.error(`Failed to load details for problem ${id}:`, err);
    selectedProblem = problemsList.find(p => p.problemId === id) || null;
  } finally {
    isDetailLoading = false;
    if (shouldRender) renderAppContent();
  }
}

function renderAppContent() {
  const container = document.getElementById('app-content');
  if (container) {
    container.innerHTML = render();
    attachEventHandlers();
  }
}

function render() {
  if (isLoading) {
    return `
      <div class="flex flex-col items-center justify-center min-h-[500px] gap-4">
        <div class="w-12 h-12 rounded-full border-4 border-ashoka-blue border-t-transparent animate-spin"></div>
        <p class="text-sm font-medium text-text-secondary">Connecting to Problem Registry &amp; Querying Statements...</p>
      </div>`;
  }

  const total = problemsList.length;
  const registeredCount = problemsList.filter(p => p.status === 'REGISTERED').length;
  const verifyingCount = problemsList.filter(p => p.status === 'SOURCE_VERIFYING' || p.status === 'SOURCE_VERIFIED').length;
  const submittedCount = problemsList.filter(p => p.status === 'SUBMITTED').length;
  const rejectedCount = problemsList.filter(p => p.status === 'REJECTED' || p.status === 'ARCHIVED').length;

  const regPct = total > 0 ? Math.round((registeredCount / total) * 100) : 0;
  const verPct = total > 0 ? Math.round((verifyingCount / total) * 100) : 0;
  const subPct = total > 0 ? Math.round((submittedCount / total) * 100) : 0;

  const filtered = problemsList.filter(p => {
    if (currentFilter !== 'ALL') {
      if (currentFilter === 'VERIFYING') {
        if (p.status !== 'SOURCE_VERIFYING' && p.status !== 'SOURCE_VERIFIED') return false;
      } else if (p.status !== currentFilter) {
        return false;
      }
    }
    if (!searchFilter) return true;
    const q = searchFilter.toLowerCase();
    const title = (p.title || '').toLowerCase();
    const id = (p.problemId || '').toLowerCase();
    const bucket = (p.sourceBucket || '').toLowerCase();
    const subEntity = (p.subEntityType || '').toLowerCase();
    return title.includes(q) || id.includes(q) || bucket.includes(q) || subEntity.includes(q);
  });

  const p = selectedProblem;

  return `
    <div class="flex flex-col gap-space-xl">
      <!-- Top Header Strip -->
      <div class="grid grid-cols-1 md:grid-cols-12 gap-space-md">
        <div class="md:col-span-8 bg-surface-crisp p-space-lg rounded-xl shadow-sm flex flex-col justify-between border border-border-hairline">
          <div class="flex flex-wrap items-center justify-between gap-space-sm mb-space-md">
            <div class="flex items-center gap-space-xs">
              <span class="px-2 py-0.5 rounded-full bg-ashoka-blue text-on-primary font-label-sm text-label-sm uppercase tracking-wider">Repository Node</span>
              <span class="text-text-muted font-mono-code text-body-sm">REGISTRY://PRB-NATIONAL-V2</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="inline-block w-2.5 h-2.5 rounded-full bg-gov-emerald animate-pulse"></span>
              <span class="font-label-sm text-label-sm text-text-secondary">Live Gateway Sync • Optimistic Lock Guard</span>
            </div>
          </div>
          <div class="flex flex-col lg:flex-row lg:items-end justify-between gap-space-md">
            <div>
              <h1 class="font-headline-lg text-headline-lg text-ashoka-blue tracking-tight">Civic Challenges &amp; Problem Statements</h1>
              <p class="font-body-md text-body-md text-text-secondary mt-1">Multi-tier verified problem statements under sovereign evaluation &amp; allocation.</p>
            </div>
            <div class="flex items-center gap-space-sm">
              <button onclick="window.problemsPage.refresh()" class="px-space-md py-2 rounded-lg bg-surface-container text-ashoka-blue font-label-md text-label-md hover:bg-surface-container-high transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer">
                <span class="material-symbols-outlined text-[18px]">refresh</span><span>Refresh Live</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Pipeline Donut / Dynamic Live Stats -->
        <div class="md:col-span-4 bg-ashoka-blue text-on-primary p-space-lg rounded-xl shadow-sm flex flex-col justify-between relative overflow-hidden border border-ashoka-blue">
          <div class="flex items-center justify-between">
            <span class="font-label-sm text-label-sm uppercase tracking-wider text-on-primary-container">Pipeline Distribution</span>
            <span class="font-mono-code text-label-sm text-tertiary-fixed font-semibold">TOTAL: ${total}</span>
          </div>
          <div class="my-space-md flex items-center gap-space-md">
            <svg class="w-16 h-16 shrink-0 -rotate-90" viewBox="0 0 36 36">
              <path class="text-on-primary-container/20" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" stroke-width="4"></path>
              <path class="text-tertiary-fixed" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" stroke-dasharray="${regPct}, 100" stroke-width="4"></path>
              <path class="text-secondary-container" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" stroke-dasharray="${verPct}, 100" stroke-dashoffset="-${regPct}" stroke-width="4"></path>
              <path class="text-saffron-accent" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" stroke-dasharray="${subPct}, 100" stroke-dashoffset="-${regPct + verPct}" stroke-width="4"></path>
            </svg>
            <div class="grid grid-cols-2 gap-x-space-md gap-y-1 text-on-primary">
              <div><span class="text-[10px] text-on-primary-container block font-mono-code">REGISTERED</span><span class="font-headline-sm text-headline-sm">${registeredCount}</span></div>
              <div><span class="text-[10px] text-on-primary-container block font-mono-code">VERIFYING</span><span class="font-headline-sm text-headline-sm">${verifyingCount}</span></div>
              <div><span class="text-[10px] text-on-primary-container block font-mono-code">SUBMITTED</span><span class="font-headline-sm text-headline-sm">${submittedCount}</span></div>
              <div><span class="text-[10px] text-on-primary-container block font-mono-code">REJ / ARCH</span><span class="font-headline-sm text-headline-sm">${rejectedCount}</span></div>
            </div>
          </div>
          <div class="text-[11px] font-mono-code text-on-primary-container flex items-center justify-between pt-space-xs border-t border-on-primary-container/20">
            <span>Selected Version: v${p?.version ?? 1}</span>
            <span class="text-tertiary-fixed">${concurrencyConflict ? 'LOCK CONFLICT' : 'Consensus In-Sync'}</span>
          </div>
        </div>
      </div>

      <!-- Problem Statements Table -->
      <div class="bg-surface-crisp rounded-xl shadow-sm overflow-hidden border border-border-hairline">
        <div class="p-space-md bg-surface-subtle flex flex-wrap items-center justify-between gap-space-md border-b border-border-hairline">
          <div class="flex items-center gap-space-sm flex-wrap">
            <span class="material-symbols-outlined text-ashoka-blue text-[20px]">view_list</span>
            <span class="font-headline-sm text-headline-sm text-ashoka-blue">Sovereign Registry Index</span>
            <span class="text-text-muted font-mono-code text-body-sm">(${filtered.length} of ${total} statements)</span>
            
            <!-- Quick Filter Tabs -->
            <div class="flex items-center gap-1 ml-2">
              <button onclick="window.problemsPage.setFilter('ALL')" class="px-2.5 py-1 rounded text-xs font-semibold ${currentFilter === 'ALL' ? 'bg-ashoka-blue text-white' : 'bg-surface-container text-text-secondary hover:bg-surface-container-high'} transition-colors">ALL (${total})</button>
              <button onclick="window.problemsPage.setFilter('SUBMITTED')" class="px-2.5 py-1 rounded text-xs font-semibold ${currentFilter === 'SUBMITTED' ? 'bg-ashoka-blue text-white' : 'bg-surface-container text-text-secondary hover:bg-surface-container-high'} transition-colors">SUBMITTED (${submittedCount})</button>
              <button onclick="window.problemsPage.setFilter('VERIFYING')" class="px-2.5 py-1 rounded text-xs font-semibold ${currentFilter === 'VERIFYING' ? 'bg-ashoka-blue text-white' : 'bg-surface-container text-text-secondary hover:bg-surface-container-high'} transition-colors">VERIFYING (${verifyingCount})</button>
              <button onclick="window.problemsPage.setFilter('REGISTERED')" class="px-2.5 py-1 rounded text-xs font-semibold ${currentFilter === 'REGISTERED' ? 'bg-ashoka-blue text-white' : 'bg-surface-container text-text-secondary hover:bg-surface-container-high'} transition-colors">REGISTERED (${registeredCount})</button>
            </div>
          </div>
          <div class="relative">
            <span class="material-symbols-outlined absolute left-2.5 top-2.5 text-text-muted text-[18px]">search</span>
            <input
              id="problem-search-input"
              value="${escapeHtml(searchFilter)}"
              class="pl-8 pr-3 py-1.5 rounded-lg bg-surface-crisp font-body-sm text-body-sm text-text-primary placeholder:text-text-muted w-64 focus:outline-none focus:ring-1 focus:ring-ashoka-blue shadow-sm border border-border-hairline"
              placeholder="Search ID, title, domain..."
              type="text"
            />
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left">
            <thead class="bg-surface-container-low text-text-secondary font-label-sm text-label-sm uppercase tracking-wider">
              <tr>
                <th class="py-3 px-space-md">ID</th>
                <th class="py-3 px-space-md">Title &amp; Scope</th>
                <th class="py-3 px-space-md">Source Bucket</th>
                <th class="py-3 px-space-md">Workflow Status</th>
                <th class="py-3 px-space-md">Version</th>
                <th class="py-3 px-space-md text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="font-body-md text-body-md divide-y divide-border-hairline">
              ${filtered.length === 0 ? `
                <tr>
                  <td colspan="6" class="py-12 text-center text-text-muted">
                    <span class="material-symbols-outlined text-[36px] block mx-auto mb-2 text-text-muted/60">search_off</span>
                    No problem statements found matching the criteria.
                  </td>
                </tr>
              ` : filtered.map(item => {
                const isActive = item.problemId === selectedProblemId;
                const statusBadge = getStatusBadge(item.status);
                const shortId = item.problemId.slice(0, 8).toUpperCase();
                return `
                  <tr class="${isActive ? 'bg-surface-container' : 'hover:bg-surface-subtle'} transition-colors cursor-pointer" onclick="window.problemsPage.select('${item.problemId}')">
                    <td class="py-3.5 px-space-md font-mono-code text-body-sm ${isActive ? 'font-semibold text-ashoka-blue flex items-center gap-1' : 'text-text-primary'}">
                      ${isActive ? '<span class="material-symbols-outlined text-gov-emerald text-[16px]">arrow_right</span>' : ''}
                      <span>${shortId}</span>
                    </td>
                    <td class="py-3.5 px-space-md max-w-md">
                      <div class="font-label-lg text-label-lg ${isActive ? 'text-ashoka-blue font-bold' : 'text-text-primary font-medium'} truncate">${escapeHtml(item.title)}</div>
                      <div class="text-text-muted text-xs truncate mt-0.5">${escapeHtml(item.description || 'No description provided')}</div>
                    </td>
                    <td class="py-3.5 px-space-md">
                      <div class="font-label-md text-label-md text-text-primary font-medium">${item.sourceBucket || 'CIVIC'}</div>
                      <div class="text-text-muted font-mono-code text-[11px]">${item.subEntityType || 'CITIZEN'}</div>
                    </td>
                    <td class="py-3.5 px-space-md">
                      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full ${statusBadge.classes} font-label-sm text-label-sm uppercase font-bold tracking-wider">
                        ${item.status}
                      </span>
                    </td>
                    <td class="py-3.5 px-space-md font-mono-code text-body-sm text-text-secondary">
                      <span class="px-2 py-0.5 rounded bg-surface-subtle font-semibold border border-border-hairline">v${item.version}</span>
                    </td>
                    <td class="py-3.5 px-space-md text-right">
                      ${isActive
                        ? '<span class="px-3 py-1 rounded bg-ashoka-blue text-on-primary font-label-sm text-label-sm uppercase tracking-wide shadow-sm font-semibold">Viewing</span>'
                        : '<button class="px-2.5 py-1 rounded text-ashoka-blue hover:bg-surface-container font-label-sm text-label-sm font-semibold">Inspect</button>'}
                    </td>
                  </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Concurrency Conflict Banner (Active when 409 conflict occurs) -->
      ${concurrencyConflict ? `
        <div class="bg-status-action-bg p-space-lg rounded-xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-space-md border border-status-action-border" id="conflict-banner">
          <div class="flex items-start gap-space-md">
            <div class="w-10 h-10 rounded-full bg-status-action-border flex items-center justify-center shrink-0">
              <span class="material-symbols-outlined text-status-action-text text-[24px]">warning</span>
            </div>
            <div class="flex flex-col">
              <span class="font-label-sm text-label-sm text-status-action-text uppercase tracking-wider font-bold">Optimistic Concurrency Fault • Mutex Conflict #409</span>
              <p class="font-headline-sm text-headline-sm text-status-action-text font-bold mt-0.5">The statement was updated concurrently by another administrative officer.</p>
              <p class="font-body-md text-body-md text-status-action-text mt-1">
                ${concurrencyConflict}
              </p>
            </div>
          </div>
          <button class="px-space-lg py-2.5 rounded-lg bg-saffron-accent text-on-primary font-label-md text-label-md hover:bg-opacity-90 transition-all flex items-center gap-2 shadow-sm font-semibold shrink-0 cursor-pointer" onclick="window.problemsPage.refresh()">
            <span class="material-symbols-outlined text-[18px]">sync</span><span>Reload Fresh State</span>
          </button>
        </div>
      ` : ''}

      ${p ? `
        <!-- Selected Problem Detail Layout -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
          <!-- Left Dossier Column (7 cols) -->
          <div class="lg:col-span-7 flex flex-col gap-space-lg">
            <!-- Statement Dossier Card -->
            <div class="bg-surface-crisp p-space-lg rounded-xl shadow-sm flex flex-col gap-space-md border border-border-hairline">
              <div class="flex flex-wrap items-center justify-between gap-space-sm pb-space-sm border-b border-border-hairline">
                <div class="flex items-center gap-space-sm flex-wrap">
                  <span class="font-mono-code text-body-lg font-bold text-ashoka-blue">${p.problemId}</span>
                  <span class="px-2 py-0.5 rounded bg-surface-container font-mono-code text-label-sm text-ashoka-blue font-bold">Buffer: v${p.version}</span>
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full ${getStatusBadge(p.status).classes} font-label-sm text-label-sm uppercase font-bold tracking-wider">
                    ${p.status}
                  </span>
                </div>
                ${p.status === 'REGISTERED' ? `
                  <button class="px-space-lg py-2 rounded-lg bg-gov-emerald text-on-primary font-label-md text-label-md hover:bg-opacity-90 transition-all shadow-md flex items-center gap-2 font-bold ring-2 ring-gov-emerald/30 cursor-pointer" onclick="window.problemsPage.startEvaluation('${p.problemId}')">
                    <span class="material-symbols-outlined text-[20px]">biotech</span><span>Initiate Evaluation</span>
                  </button>
                ` : ''}
              </div>

              <div>
                <span class="text-text-muted font-label-sm text-label-sm uppercase tracking-wider block mb-1">Challenge Statement</span>
                <h2 class="font-headline-lg text-headline-lg text-text-primary leading-snug">${escapeHtml(p.title)}</h2>
              </div>

              <!-- Metadata Grid -->
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-space-md bg-surface-subtle p-space-md rounded-lg border border-border-hairline">
                <div><span class="font-label-sm text-label-sm text-text-muted uppercase">Source Bucket</span><p class="font-label-md text-label-md text-text-primary font-semibold mt-0.5">${p.sourceBucket || 'GOVT'}</p></div>
                <div><span class="font-label-sm text-label-sm text-text-muted uppercase">Sub-Entity</span><p class="font-label-md text-label-md text-text-primary font-semibold mt-0.5">${p.subEntityType || 'PRI'}</p></div>
                <div><span class="font-label-sm text-label-sm text-text-muted uppercase">Urgency Level</span><p class="font-label-md text-label-md text-text-primary font-semibold mt-0.5">${p.urgency || 'MEDIUM'}</p></div>
                <div><span class="font-label-sm text-label-sm text-text-muted uppercase">Severity</span><p class="font-label-md text-label-md text-text-primary font-semibold mt-0.5">${p.severity || 'MODERATE'}</p></div>
                <div><span class="font-label-sm text-label-sm text-text-muted uppercase">Affected Pop.</span><p class="font-label-md text-label-md text-text-primary font-semibold mt-0.5">${p.affectedPopulation ? p.affectedPopulation.toLocaleString() : 'N/A'}</p></div>
                <div><span class="font-label-sm text-label-sm text-text-muted uppercase">Access Rule</span><p class="font-label-md text-label-md text-text-primary font-semibold mt-0.5">${p.accessRule || 'OPEN_TO_ALL'}</p></div>
              </div>

              <div class="flex flex-col gap-space-xs">
                <span class="font-label-sm text-label-sm uppercase tracking-wider text-text-muted font-bold">Problem Narrative &amp; Scope</span>
                <p class="font-body-md text-body-md text-text-secondary leading-relaxed bg-surface-subtle p-3 rounded-lg border border-border-hairline">${escapeHtml(p.description || 'No description text recorded.')}</p>
              </div>

              ${p.expectedOutcome ? `
                <div class="flex flex-col gap-space-xs">
                  <span class="font-label-sm text-label-sm uppercase tracking-wider text-text-muted font-bold">Target / Expected Outcome</span>
                  <p class="font-body-md text-body-md text-text-secondary leading-relaxed bg-surface-subtle p-3 rounded-lg border border-border-hairline">${escapeHtml(p.expectedOutcome)}</p>
                </div>
              ` : ''}

              <!-- Supplementary Evidence List -->
              <div class="flex flex-col gap-space-xs pt-space-xs border-t border-border-hairline">
                <div class="flex items-center justify-between">
                  <span class="font-label-sm text-label-sm uppercase tracking-wider text-text-muted font-bold">Uploaded Evidence Artifacts</span>
                  <span class="font-mono-code text-[11px] text-text-muted">${evidenceList.length} FILE(S)</span>
                </div>
                ${evidenceList.length === 0 ? `
                  <div class="p-3 bg-surface-subtle rounded-lg text-xs text-text-muted border border-border-hairline flex items-center gap-2">
                    <span class="material-symbols-outlined text-[16px]">info</span>
                    <span>No secondary evidence documents attached to this problem submission.</span>
                  </div>
                ` : `
                  <div class="flex flex-col gap-2">
                    ${evidenceList.map(ev => `
                      <div class="flex items-center justify-between p-2.5 bg-surface-subtle rounded-lg border border-border-hairline">
                        <div class="flex items-center gap-2">
                          <span class="material-symbols-outlined text-ashoka-blue text-[18px]">description</span>
                          <span class="font-mono-code text-xs font-semibold text-text-primary">${escapeHtml(ev.fileName || ev.evidenceId || 'Evidence Document')}</span>
                          <span class="text-[10px] px-1.5 py-0.5 rounded bg-surface-container font-mono-code">${ev.evidenceType || 'DOCUMENT'}</span>
                        </div>
                        <span class="text-xs text-gov-emerald font-semibold flex items-center gap-1">
                          <span class="material-symbols-outlined text-[14px]">task_alt</span> Verified
                        </span>
                      </div>
                    `).join('')}
                  </div>
                `}
              </div>
            </div>

            <!-- Optimistic Lock Advancement Controller -->
            <div class="bg-surface-crisp p-space-lg rounded-xl shadow-sm flex flex-col gap-space-md border border-border-hairline">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-space-xs">
                  <span class="material-symbols-outlined text-ashoka-blue text-[20px]">lock_clock</span>
                  <span class="font-headline-sm text-headline-sm text-ashoka-blue">Workflow Status Advancement (Lock Guard)</span>
                </div>
                <span class="px-2.5 py-1 rounded bg-surface-container text-ashoka-blue font-mono-code text-label-sm font-semibold">EXPECTED_VERSION: v${p.version}</span>
              </div>

              <div class="bg-surface-subtle p-space-md rounded-lg flex flex-col gap-space-xs border border-border-hairline">
                <div class="flex justify-between items-center text-text-secondary font-body-sm text-body-sm">
                  <span>Current State: <strong class="text-ashoka-blue">${p.status}</strong></span>
                  <span>Submitted At: <strong class="font-mono-code text-[11px]">${formatDate(p.submittedAt)}</strong></span>
                </div>
                <div class="flex justify-between items-center text-text-secondary font-body-sm text-body-sm">
                  <span>Concurrence Lock: <strong class="font-mono-code text-gov-emerald">Active (Lock Version = ${p.version})</strong></span>
                  <span>Last Updated: <strong class="font-mono-code text-[11px]">${formatDate(p.updatedAt)}</strong></span>
                </div>
              </div>

              <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-space-md pt-space-xs">
                <div class="flex items-center gap-2">
                  <label class="text-xs font-bold uppercase tracking-wider text-text-secondary">Target Transition:</label>
                  <select id="target-status-select" class="px-3 py-1.5 rounded-lg bg-surface-subtle text-text-primary text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-ashoka-blue border border-border-hairline">
                    <option value="SOURCE_VERIFYING" ${p.status === 'SUBMITTED' ? 'selected' : ''}>SOURCE_VERIFYING</option>
                    <option value="SOURCE_VERIFIED" ${p.status === 'SOURCE_VERIFYING' ? 'selected' : ''}>SOURCE_VERIFIED</option>
                    <option value="REGISTERED" ${p.status === 'SOURCE_VERIFIED' ? 'selected' : ''}>REGISTERED (Ready for Eval)</option>
                    <option value="REJECTED" ${p.status === 'REJECTED' ? 'selected' : ''}>REJECTED</option>
                    <option value="ARCHIVED" ${p.status === 'ARCHIVED' ? 'selected' : ''}>ARCHIVED</option>
                  </select>
                </div>
                <button onclick="window.problemsPage.commitStatusTransition()" class="px-space-lg py-2 rounded-lg bg-ashoka-blue text-on-primary font-label-md text-label-md hover:bg-institutional-navy transition-colors font-bold shadow-sm flex items-center justify-center gap-1.5 cursor-pointer">
                  <span>Commit Status Transition</span>
                  <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Right Column: Verification & Audit Trail (5 cols) -->
          <div class="lg:col-span-5 flex flex-col gap-space-lg">
            <!-- Immutable Audit Trail of Problem Mutations -->
            <div class="bg-surface-crisp p-space-lg rounded-xl shadow-sm flex flex-col gap-space-md border border-border-hairline">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-space-xs">
                  <span class="material-symbols-outlined text-ashoka-blue text-[20px]">history</span>
                  <span class="font-headline-sm text-headline-sm text-ashoka-blue">Problem Mutation Audit Trail</span>
                </div>
                <span class="text-text-muted font-mono-code text-body-sm">${auditLogs.length} LOGS</span>
              </div>

              ${auditLogs.length === 0 ? `
                <div class="p-6 text-center text-text-muted text-xs bg-surface-subtle rounded-lg border border-border-hairline">
                  <span class="material-symbols-outlined text-[28px] block mx-auto mb-1 text-text-muted/60">history_edu</span>
                  No mutation audit entries recorded for this problem yet.
                </div>
              ` : `
                <div class="flex flex-col gap-space-md relative pl-5" id="prb-events-timeline">
                  <div class="absolute left-2 top-2 bottom-2 w-0.5 bg-border-hairline"></div>
                  ${auditLogs.map(log => {
                    const actionBadge = getActionBadge(log.actionType);
                    return `
                      <div class="relative flex flex-col gap-1 bg-surface-subtle p-space-md rounded-lg shadow-sm border border-border-hairline">
                        <span class="absolute -left-5 top-3 w-3 h-3 rounded-full ${actionBadge.dot}"></span>
                        <div class="flex flex-wrap items-center justify-between gap-1">
                          <span class="font-mono-code text-[11px] font-bold text-ashoka-blue">${log.actionType}</span>
                          <span class="px-2 py-0.5 rounded-full ${actionBadge.badge} font-label-sm text-[10px] font-bold">${actionBadge.label}</span>
                        </div>
                        <div class="flex items-center justify-between mt-1 text-text-muted font-mono-code text-[11px]">
                          <span>Actor: ${(log.performedByUserId || 'SYSTEM').slice(0, 8)}</span>
                          <span>${formatDate(log.performedAt)}</span>
                        </div>
                        ${log.beforeState || log.afterState ? `
                          <div class="mt-2 pt-2 border-t border-border-hairline text-[11px] font-mono-code text-text-secondary bg-surface-crisp p-2 rounded max-h-24 overflow-y-auto">
                            ${log.beforeState ? `<div class="text-error truncate">BEFORE: ${escapeHtml(log.beforeState)}</div>` : ''}
                            ${log.afterState ? `<div class="text-gov-emerald truncate">AFTER: ${escapeHtml(log.afterState)}</div>` : ''}
                          </div>
                        ` : ''}
                      </div>`;
                  }).join('')}
                </div>
              `}
            </div>
          </div>
        </div>
      ` : `
        <div class="p-12 text-center text-text-muted bg-surface-crisp rounded-xl border border-border-hairline">
          Please select a problem statement from the table above to view details and execute transitions.
        </div>
      `}
    </div>`;
}

function getStatusBadge(status) {
  switch (status) {
    case 'REGISTERED':
    case 'SOURCE_VERIFIED':
      return { classes: 'bg-status-approved-bg text-status-approved-text border border-status-approved-border' };
    case 'SOURCE_VERIFYING':
      return { classes: 'bg-status-review-bg text-status-review-text border border-status-review-border' };
    case 'SUBMITTED':
      return { classes: 'bg-status-submitted-bg text-status-submitted-text border border-status-submitted-border' };
    case 'REJECTED':
      return { classes: 'bg-red-50 text-red-700 border border-red-200' };
    case 'ARCHIVED':
      return { classes: 'bg-surface-muted text-text-muted border border-border-hairline' };
    default:
      return { classes: 'bg-surface-container text-text-secondary border border-border-hairline' };
  }
}

function getActionBadge(action) {
  switch (action) {
    case 'CREATED':
    case 'SOURCE_VERIFIED':
      return { dot: 'bg-gov-emerald', badge: 'bg-status-approved-bg text-status-approved-text', label: 'COMMITTED' };
    case 'STATUS_CHANGED':
      return { dot: 'bg-institutional-navy', badge: 'bg-status-submitted-bg text-status-submitted-text', label: 'TRANSITION' };
    case 'REJECTED':
    case 'SOURCE_VERIFICATION_FAILED':
      return { dot: 'bg-error', badge: 'bg-red-50 text-red-700', label: 'REJECTED' };
    default:
      return { dot: 'bg-saffron-accent', badge: 'bg-status-action-bg text-status-action-text', label: 'RECORDED' };
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

function attachEventHandlers() {
  const searchInput = document.getElementById('problem-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', e => {
      searchFilter = e.target.value;
      const filtered = problemsList.filter(p => {
        if (currentFilter !== 'ALL' && p.status !== currentFilter) return false;
        if (!searchFilter) return true;
        const q = searchFilter.toLowerCase();
        return (p.title || '').toLowerCase().includes(q) || (p.problemId || '').toLowerCase().includes(q);
      });
      // Re-render table body without full redraw
      renderAppContent();
    });
  }
}

window.problemsPage = {
  refresh() {
    loadProblems();
  },

  select(id) {
    selectProblem(id);
  },

  setFilter(filter) {
    currentFilter = filter;
    renderAppContent();
  },

  async startEvaluation(problemId) {
    try {
      showToast('Initiating evaluation cycle on statutory pipeline...', 'info');
      await startEvaluation(problemId);
      showToast('Evaluation cycle successfully opened. Redirecting to Evaluation Workspace...', 'success');
      setTimeout(() => {
        navigate('evaluation');
      }, 900);
    } catch (err) {
      console.error('Failed to start evaluation:', err);
      showToast(err.message || 'Failed to start evaluation cycle', 'error');
    }
  },

  async commitStatusTransition() {
    if (!selectedProblem) return;
    const selectEl = document.getElementById('target-status-select');
    const newStatus = selectEl?.value;
    if (!newStatus) return;

    const id = selectedProblem.problemId;
    const expectedVer = selectedProblem.version;

    try {
      showToast(`Committing transition: ${selectedProblem.status} → ${newStatus}...`, 'info');
      const updated = await updateProblemStatus(id, newStatus, expectedVer);
      showToast(`Problem status successfully transitioned to ${newStatus}`, 'success');
      concurrencyConflict = null;
      // Refresh current problem and list
      await selectProblem(id, false);
      await loadProblems();
    } catch (err) {
      console.error('Status transition error:', err);
      if (err.status === 409) {
        concurrencyConflict = err.message || `Optimistic locking version mismatch on server (Expected: v${expectedVer}).`;
        showToast('Concurrency conflict: statement was modified elsewhere. Please reload fresh state.', 'error');
        renderAppContent();
      } else {
        showToast(err.message || 'Status transition rejected by server', 'error');
      }
    }
  },
};

render.afterRender = function() {
  attachEventHandlers();
  if (problemsList.length === 0 && isLoading) {
    loadProblems();
  }
};

registerPage('problems', render);
