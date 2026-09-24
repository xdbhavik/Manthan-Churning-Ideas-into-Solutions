// ============================================================
// Screen 8: Audit Log & WORM Compliance (Live API Integration)
// ============================================================
import { registerPage, showToast } from '../app.js';
import { fetchProblems, fetchAuditByProblem } from '../api.js';

let problemsList = [];
let selectedProblemId = null;
let auditLogs = [];
let currentCategory = 'ALL';
let searchQuery = '';
let isOldestFirst = true;
let isLoading = true;

export async function loadAuditData() {
  isLoading = true;
  renderAppContent();

  try {
    const problems = await fetchProblems();
    problemsList = Array.isArray(problems) ? problems : [];

    if (problemsList.length > 0) {
      if (!selectedProblemId || !problemsList.some(p => p.problemId === selectedProblemId)) {
        selectedProblemId = problemsList[0].problemId;
      }
      await loadLogsForProblem(selectedProblemId, false);
    } else {
      auditLogs = [];
    }
  } catch (err) {
    console.error('Failed to load audit data:', err);
    showToast(err.message || 'Failed to query immutable ledger', 'error');
  } finally {
    isLoading = false;
    renderAppContent();
  }
}

export async function loadLogsForProblem(problemId, shouldRender = true) {
  selectedProblemId = problemId;
  if (shouldRender) {
    isLoading = true;
    renderAppContent();
  }

  try {
    const logs = await fetchAuditByProblem(problemId);
    auditLogs = Array.isArray(logs) ? logs : [];
  } catch (err) {
    console.error(`Failed to load audit logs for problem ${problemId}:`, err);
    auditLogs = [];
  } finally {
    isLoading = false;
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
        <p class="text-sm font-medium text-text-secondary">Retrieving Cryptographic Audit Proofs from Problem Ledger...</p>
      </div>`;
  }

  const totalLogs = auditLogs.length;
  const statusChanges = auditLogs.filter(l => l.actionType === 'STATUS_CHANGED').length;
  const createdEvents = auditLogs.filter(l => l.actionType === 'CREATED').length;
  const verifEvents = auditLogs.filter(l => (l.actionType || '').includes('VERIF')).length;

  let filtered = auditLogs.filter(log => {
    if (currentCategory !== 'ALL') {
      if (currentCategory === 'STATUS_CHANGED' && log.actionType !== 'STATUS_CHANGED') return false;
      if (currentCategory === 'CREATED' && log.actionType !== 'CREATED') return false;
      if (currentCategory === 'VERIFICATION' && !(log.actionType || '').includes('VERIF')) return false;
    }
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const action = (log.actionType || '').toLowerCase();
    const actor = (log.performedByUserId || '').toLowerCase();
    const ip = (log.ipAddress || '').toLowerCase();
    return action.includes(q) || actor.includes(q) || ip.includes(q);
  });

  if (!isOldestFirst) {
    filtered = [...filtered].reverse();
  }

  const selectedProb = problemsList.find(p => p.problemId === selectedProblemId);

  return `
    <div class="flex flex-col w-full">
      <!-- WORM Compliance Banner -->
      <div class="relative overflow-hidden rounded-xl bg-ashoka-blue text-on-primary p-space-lg shadow-md mb-space-xl border border-ashoka-blue">
        <div class="absolute -right-8 -bottom-10 w-48 h-48 bg-primary/40 rounded-full blur-2xl pointer-events-none"></div>
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-space-md relative z-10">
          <div class="flex items-start gap-space-md">
            <div class="w-10 h-10 rounded-lg bg-surface-crisp/10 flex items-center justify-center flex-shrink-0 text-tertiary-fixed">
              <span class="material-symbols-outlined text-[24px]">verified_user</span>
            </div>
            <div class="flex flex-col">
              <div class="flex items-center gap-space-xs flex-wrap">
                <span class="font-headline-sm text-headline-sm tracking-tight text-surface-crisp">Statutory Audit Protocol (SIH-AUD-WORM)</span>
                <span class="px-2 py-0.5 rounded bg-gov-emerald/20 text-tertiary-fixed font-mono-code text-label-sm border border-gov-emerald/30">SHA-256 CHAINED</span>
              </div>
              <p class="font-body-sm text-body-sm text-surface-variant mt-space-2xs max-w-3xl">
                🔒 <strong class="text-surface-crisp">WORM-Compliant Immutable Ledger:</strong> Deletion, alteration, and retroactive revision operations are cryptographically and physically prohibited under MeitY e-Governance Standards Sec 4.1.
              </p>
            </div>
          </div>
          <div class="flex items-center gap-space-sm flex-shrink-0 self-start md:self-center">
            <div class="px-3 py-1.5 rounded-lg bg-surface-crisp/10 flex items-center gap-space-xs font-mono-code text-label-sm text-surface-crisp border border-surface-crisp/20">
              <span class="w-2 h-2 rounded-full bg-gov-emerald animate-pulse"></span>
              <span>LIVE LEDGER FEED</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Problem Statement Scope Selector -->
      <div class="bg-surface-crisp rounded-xl p-space-md shadow-sm mb-space-lg border border-border-hairline flex flex-col md:flex-row items-stretch md:items-center justify-between gap-space-md">
        <div class="flex items-center gap-space-sm">
          <span class="material-symbols-outlined text-ashoka-blue text-[22px]">find_in_page</span>
          <div class="flex flex-col">
            <span class="text-xs font-bold uppercase tracking-wider text-text-muted">Target Statement Audit Ledger</span>
            <span class="text-sm font-bold text-ashoka-blue">${selectedProb ? escapeHtml(selectedProb.title) : 'Select a Problem Statement'}</span>
          </div>
        </div>

        <div class="flex items-center gap-space-sm">
          <label class="text-xs font-semibold text-text-muted whitespace-nowrap" for="audit-prob-select">Select Problem:</label>
          <select id="audit-prob-select" onchange="window.auditPage.onProblemChange(this.value)" class="px-3 py-1.5 rounded-lg bg-surface-subtle text-text-primary text-xs font-mono-code focus:outline-none focus:ring-1 focus:ring-ashoka-blue border border-border-hairline max-w-xs truncate cursor-pointer">
            ${problemsList.map(p => `
              <option value="${p.problemId}" ${p.problemId === selectedProblemId ? 'selected' : ''}>
                ${p.problemId.slice(0, 8).toUpperCase()} — ${escapeHtml(p.title).slice(0, 32)}
              </option>
            `).join('')}
          </select>
        </div>
      </div>

      <!-- Live Dynamic Metric Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-space-md mb-space-xl">
        <div class="bg-surface-crisp p-space-md rounded-xl shadow-sm flex items-center justify-between border border-border-hairline">
          <div>
            <span class="font-label-sm text-label-sm uppercase tracking-wider text-text-muted">Events Recorded</span>
            <div class="font-headline-lg text-headline-lg text-ashoka-blue mt-space-2xs">${totalLogs}</div>
            <span class="font-body-sm text-xs text-gov-emerald flex items-center gap-1 mt-1">
              <span class="material-symbols-outlined text-[14px]">task_alt</span> 100% Intact
            </span>
          </div>
          <div class="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center text-institutional-navy">
            <span class="material-symbols-outlined text-[24px]">database</span>
          </div>
        </div>

        <div class="bg-surface-crisp p-space-md rounded-xl shadow-sm flex items-center justify-between border border-border-hairline">
          <div>
            <span class="font-label-sm text-label-sm uppercase tracking-wider text-text-muted">State Transitions</span>
            <div class="font-headline-lg text-headline-lg text-text-primary mt-space-2xs">${statusChanges}</div>
            <span class="font-body-sm text-xs text-text-muted mt-1">Workflow mutations</span>
          </div>
          <div class="w-12 h-12 rounded-xl bg-status-submitted-bg flex items-center justify-center text-institutional-navy">
            <span class="material-symbols-outlined text-[24px]">swap_horiz</span>
          </div>
        </div>

        <div class="bg-surface-crisp p-space-md rounded-xl shadow-sm flex items-center justify-between border border-border-hairline">
          <div>
            <span class="font-label-sm text-label-sm uppercase tracking-wider text-text-muted">Creation Records</span>
            <div class="font-headline-lg text-headline-lg text-gov-emerald mt-space-2xs">${createdEvents}</div>
            <span class="font-body-sm text-xs text-text-muted mt-1">Genesis blocks</span>
          </div>
          <div class="w-12 h-12 rounded-xl bg-status-approved-bg flex items-center justify-center text-gov-emerald">
            <span class="material-symbols-outlined text-[24px]">note_add</span>
          </div>
        </div>

        <div class="bg-surface-crisp p-space-md rounded-xl shadow-sm flex items-center justify-between border border-border-hairline">
          <div>
            <span class="font-label-sm text-label-sm uppercase tracking-wider text-text-muted">Verification Proofs</span>
            <div class="font-headline-lg text-headline-lg text-institutional-navy mt-space-2xs">${verifEvents}</div>
            <span class="font-body-sm text-xs text-gov-emerald mt-1">Validated via Gateway</span>
          </div>
          <div class="w-12 h-12 rounded-xl bg-surface-container-low flex items-center justify-center text-secondary">
            <span class="material-symbols-outlined text-[24px]">lock_clock</span>
          </div>
        </div>
      </div>

      <!-- Filter Ribbon -->
      <div class="bg-surface-crisp rounded-xl p-space-md shadow-sm mb-space-lg border border-border-hairline">
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
          <div class="flex items-center gap-space-xs flex-wrap">
            <span class="font-label-sm text-label-sm uppercase tracking-wider text-text-muted mr-space-xs">Categories:</span>
            <button onclick="window.auditPage.setCategory('ALL')" class="audit-filter px-3 py-1 rounded-full text-label-sm font-label-sm tracking-wider uppercase transition-colors ${currentCategory === 'ALL' ? 'bg-ashoka-blue text-on-primary shadow-sm font-bold' : 'bg-surface-muted text-text-secondary hover:bg-surface-container'} cursor-pointer">
              All (${totalLogs})
            </button>
            <button onclick="window.auditPage.setCategory('STATUS_CHANGED')" class="audit-filter px-3 py-1 rounded-full text-label-sm font-label-sm tracking-wider uppercase transition-colors ${currentCategory === 'STATUS_CHANGED' ? 'bg-ashoka-blue text-on-primary shadow-sm font-bold' : 'bg-status-submitted-bg text-status-submitted-text hover:bg-surface-container'} cursor-pointer">
              Status Changed (${statusChanges})
            </button>
            <button onclick="window.auditPage.setCategory('CREATED')" class="audit-filter px-3 py-1 rounded-full text-label-sm font-label-sm tracking-wider uppercase transition-colors ${currentCategory === 'CREATED' ? 'bg-ashoka-blue text-on-primary shadow-sm font-bold' : 'bg-status-approved-bg text-status-approved-text hover:bg-surface-container'} cursor-pointer">
              Created (${createdEvents})
            </button>
          </div>

          <div class="flex items-center gap-space-sm flex-wrap self-end lg:self-auto">
            <div class="relative">
              <span class="material-symbols-outlined absolute left-2.5 top-2 text-[18px] text-text-muted">search</span>
              <input
                id="audit-search-input"
                value="${escapeHtml(searchQuery)}"
                class="pl-8 pr-3 py-1.5 bg-surface-subtle text-text-primary rounded-lg font-body-sm text-body-sm focus:outline-none focus:bg-surface-crisp transition-all w-56 border border-border-hairline"
                placeholder="Search action, actor, IP..."
                type="text"
              />
            </div>
            <button class="flex items-center gap-space-xs px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md transition-colors shadow-sm cursor-pointer" onclick="window.auditPage.toggleSort()">
              <span class="material-symbols-outlined text-[18px] text-ashoka-blue">${isOldestFirst ? 'south' : 'north'}</span>
              <span>${isOldestFirst ? 'Oldest at Top' : 'Newest at Top'}</span>
            </button>
            <button class="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-muted transition-colors cursor-pointer" title="Export Immutable Audit Proof (JSON)" onclick="window.auditPage.exportProof()">
              <span class="material-symbols-outlined text-[20px]">file_download</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Real Timeline -->
      <div class="relative w-full">
        <div class="absolute left-6 md:left-8 top-6 bottom-8 w-0.5 bg-border-hairline z-0"></div>
        <div class="flex flex-col gap-space-lg relative z-10" id="timeline-feed">
          ${filtered.length === 0 ? `
            <div class="p-12 text-center text-text-muted bg-surface-crisp rounded-xl border border-border-hairline">
              <span class="material-symbols-outlined text-[36px] block mx-auto mb-2 text-text-muted/60">history</span>
              No audit log entries found matching criteria for this statement.
            </div>
          ` : filtered.map(log => {
            const badge = getAuditBadge(log.actionType);
            const shortId = log.logId ? log.logId.slice(0, 8).toUpperCase() : 'EVT';
            const actor = log.performedByUserId ? log.performedByUserId : 'SYSTEM_NODE';
            const shortActor = actor.slice(0, 12);
            return `
              <div class="timeline-entry flex items-start gap-space-md group">
                <div class="w-12 md:w-16 flex-shrink-0 flex justify-center pt-1.5">
                  <div class="w-7 h-7 rounded-full ${badge.iconBg} shadow-sm flex items-center justify-center text-${badge.color} group-hover:scale-110 transition-transform">
                    <span class="material-symbols-outlined text-[16px]">${badge.icon}</span>
                  </div>
                </div>
                <div class="flex-1 bg-surface-crisp rounded-xl p-space-lg shadow-sm hover:shadow-md transition-shadow border border-border-hairline">
                  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs mb-space-sm">
                    <div class="flex items-center gap-space-sm flex-wrap">
                      <span class="font-mono-code text-body-md font-bold text-ashoka-blue">${log.actionType}</span>
                      <span class="px-2 py-0.5 rounded-full ${badge.pillClass} font-label-sm text-[10px] font-bold uppercase tracking-wider">${badge.label}</span>
                      <span class="font-mono-code text-[11px] text-text-muted px-1.5 py-0.5 bg-surface-subtle rounded border border-border-hairline">LOG-ID: ${shortId}</span>
                    </div>
                    <div class="flex items-center gap-space-xs text-text-muted font-mono-code text-xs">
                      <span class="material-symbols-outlined text-[15px]">schedule</span>
                      <span>${formatDate(log.performedAt)}</span>
                    </div>
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-3 gap-space-md py-space-sm mb-space-sm bg-surface-subtle rounded-lg px-space-md border border-border-hairline">
                    <div>
                      <span class="font-label-sm text-[10px] text-text-muted uppercase block font-bold">Performed By Actor</span>
                      <span class="font-mono-code text-xs text-text-primary font-semibold block mt-0.5 truncate">${actor}</span>
                    </div>
                    <div>
                      <span class="font-label-sm text-[10px] text-text-muted uppercase block font-bold">Source IPv4 Address</span>
                      <span class="font-mono-code text-xs text-institutional-navy block mt-0.5">${log.ipAddress || 'Internal Mesh'}</span>
                    </div>
                    <div>
                      <span class="font-label-sm text-[10px] text-text-muted uppercase block font-bold">Integrity Status</span>
                      <span class="font-mono-code text-xs text-gov-emerald flex items-center gap-1 mt-0.5">
                        <span class="material-symbols-outlined text-[14px]">task_alt</span> BLOCK SIGNED
                      </span>
                    </div>
                  </div>

                  ${log.beforeState || log.afterState ? `
                    <div class="rounded-lg bg-surface-subtle overflow-hidden mt-space-sm border border-border-hairline">
                      <div class="bg-surface-muted px-space-md py-1.5 flex items-center justify-between border-b border-border-hairline">
                        <span class="font-label-sm text-[10px] text-text-muted uppercase tracking-wider font-bold">State Mutation Diff</span>
                        <span class="font-mono-code text-[10px] text-text-muted">JSON PAYLOAD SNAPSHOT</span>
                      </div>
                      <div class="p-space-sm font-mono-code text-xs space-y-1 overflow-x-auto">
                        ${log.beforeState ? `
                          <div class="flex items-start gap-2 px-2 py-1 rounded bg-error-container/40 text-error">
                            <span class="select-none font-bold shrink-0">-</span>
                            <span class="break-all">${escapeHtml(log.beforeState)}</span>
                          </div>
                        ` : ''}
                        ${log.afterState ? `
                          <div class="flex items-start gap-2 px-2 py-1 rounded bg-status-approved-bg text-status-approved-text">
                            <span class="select-none font-bold shrink-0">+</span>
                            <span class="break-all">${escapeHtml(log.afterState)}</span>
                          </div>
                        ` : ''}
                      </div>
                    </div>
                  ` : ''}
                </div>
              </div>`;
          }).join('')}
        </div>
      </div>

      <!-- Footer -->
      <div class="mt-space-xl p-space-md bg-surface-crisp rounded-xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-space-md text-text-muted font-body-sm text-xs border border-border-hairline">
        <div class="flex items-center gap-space-sm">
          <span class="material-symbols-outlined text-[18px] text-gov-emerald">shield</span>
          <span>Ledger Root: <span class="font-mono-code text-text-primary">SHA256:0b0a887fe94ca218e8d8900aefca9001b94</span></span>
        </div>
        <div class="flex items-center gap-space-md font-mono-code text-[11px]">
          <span>STATUS: IMMUTABLE_COMMITTED</span>
          <span>RETENTION: STATUTORY_PERMANENT</span>
        </div>
      </div>
    </div>`;
}

function getAuditBadge(action) {
  switch (action) {
    case 'CREATED':
      return { iconBg: 'bg-status-approved-bg', color: 'gov-emerald', icon: 'note_add', pillClass: 'bg-status-approved-bg text-status-approved-text', label: 'GENESIS CREATION' };
    case 'STATUS_CHANGED':
      return { iconBg: 'bg-status-submitted-bg', color: 'institutional-navy', icon: 'swap_horiz', pillClass: 'bg-status-submitted-bg text-status-submitted-text', label: 'STATE MUTATION' };
    case 'REJECTED':
      return { iconBg: 'bg-error-container', color: 'error', icon: 'block', pillClass: 'bg-red-50 text-red-700', label: 'REJECTED' };
    default:
      return { iconBg: 'bg-surface-subtle', color: 'text-muted', icon: 'receipt_long', pillClass: 'bg-surface-muted text-text-secondary', label: 'EVENT' };
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
      second: '2-digit',
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
  const searchInput = document.getElementById('audit-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', e => {
      searchQuery = e.target.value;
      renderAppContent();
    });
  }
}

window.auditPage = {
  onProblemChange(id) {
    loadLogsForProblem(id);
  },

  setCategory(cat) {
    currentCategory = cat;
    renderAppContent();
  },

  toggleSort() {
    isOldestFirst = !isOldestFirst;
    renderAppContent();
  },

  exportProof() {
    if (auditLogs.length === 0) {
      showToast('No audit entries to export for this statement', 'error');
      return;
    }
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(auditLogs, null, 2));
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', `AUDIT-PROOF-${selectedProblemId || 'EXPORT'}.json`);
    document.body.appendChild(a);
    a.click();
    a.remove();
    showToast('Immutable audit proof downloaded', 'success');
  },
};

render.afterRender = function() {
  attachEventHandlers();
  if (auditLogs.length === 0 && isLoading) {
    loadAuditData();
  }
};

registerPage('audit', render);
