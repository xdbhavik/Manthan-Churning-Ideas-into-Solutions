// ============================================================
// Screen 7: Evaluation Cycles & Orchestration (Live API Integration)
// ============================================================
import { registerPage, showToast } from '../app.js';
import {
  fetchEvaluationQueue,
  fetchEvaluationCycle,
  fetchEvaluationAggregation,
  fetchEvaluationHistory,
  runAiAnalysis,
  routePools,
  aggregateScores,
  prioritizeScores,
  publishCycleToPortal,
} from '../api.js';

let cyclesList = [];
let totalElements = 0;
let totalPages = 1;
let currentPage = 0;
let currentFilter = 'ALL';
let searchFilter = '';
let selectedCycleId = null;
let selectedCycle = null;
let aggregationData = null;
let historyList = [];
let isLoading = true;
let isDetailLoading = false;
let isActionRunning = false;

export async function loadEvaluationQueue(page = 0) {
  isLoading = true;
  currentPage = page;
  renderAppContent();

  try {
    const res = await fetchEvaluationQueue(currentFilter === 'ALL' ? null : currentFilter, page, 20);
    cyclesList = res?.content || [];
    totalElements = res?.totalElements || cyclesList.length;
    totalPages = res?.totalPages || 1;

    if (cyclesList.length > 0) {
      const targetId = selectedCycleId && cyclesList.some(c => c.cycleId === selectedCycleId)
        ? selectedCycleId
        : cyclesList[0].cycleId;
      await selectCycle(targetId, false);
    } else {
      selectedCycle = null;
      aggregationData = null;
      historyList = [];
    }
  } catch (err) {
    console.error('Failed to load evaluation queue:', err);
    showToast(err.message || 'Failed to fetch evaluation cycles', 'error');
  } finally {
    isLoading = false;
    renderAppContent();
  }
}

export async function selectCycle(cycleId, shouldRender = true) {
  selectedCycleId = cycleId;
  isDetailLoading = true;
  if (shouldRender) renderAppContent();

  try {
    const [cycle, agg, hist] = await Promise.all([
      fetchEvaluationCycle(cycleId).catch(() => cyclesList.find(c => c.cycleId === cycleId)),
      fetchEvaluationAggregation(cycleId).catch(() => null),
      fetchEvaluationHistory(cycleId).catch(() => []),
    ]);
    selectedCycle = cycle;
    aggregationData = agg;
    historyList = Array.isArray(hist) ? hist : [];
  } catch (err) {
    console.error(`Failed to load details for cycle ${cycleId}:`, err);
    selectedCycle = cyclesList.find(c => c.cycleId === cycleId) || null;
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
        <p class="text-sm font-medium text-text-secondary">Connecting to Evaluation Engine &amp; Aggregation Bus...</p>
      </div>`;
  }

  const activeCount = cyclesList.filter(c => ['ROUTING', 'ANALYZING', 'EVALUATION_IN_PROGRESS', 'RECEIVED'].includes(c.status)).length;
  const completedCount = cyclesList.filter(c => ['EVALUATION_COMPLETED', 'SCORES_AGGREGATED', 'PRIORITIZED', 'PHASE_3_READY'].includes(c.status)).length;
  const prioritizedCount = cyclesList.filter(c => c.status === 'PRIORITIZED' || c.status === 'PHASE_3_READY').length;

  const filtered = cyclesList.filter(c => {
    if (!searchFilter) return true;
    const q = searchFilter.toLowerCase();
    const cycle = (c.cycleId || '').toLowerCase();
    const prob = (c.problemId || '').toLowerCase();
    const band = (c.priorityBand || '').toLowerCase();
    return cycle.includes(q) || prob.includes(q) || band.includes(q);
  });

  const c = selectedCycle;

  return `
    <div class="flex flex-col w-full">
      <section class="flex flex-col gap-space-lg">
        <!-- Header & Real KPIs -->
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md pb-space-sm">
          <div class="flex flex-col gap-space-xs">
            <div class="flex items-center gap-space-xs">
              <span class="font-mono-code text-label-sm text-saffron-accent uppercase tracking-wider font-bold">SOVEREIGN EVALUATION NODE</span>
              <span class="text-text-muted text-label-sm">•</span>
              <span class="font-mono-code text-label-sm text-text-muted">MULTI-POOL ARBITRATION BUS</span>
            </div>
            <div class="flex items-baseline gap-space-md">
              <h2 class="font-headline-lg text-headline-lg text-ashoka-blue tracking-tight">Evaluation Operations &amp; Cycle Orchestration</h2>
              <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-container font-mono-code text-body-sm text-institutional-navy">
                <span class="w-2 h-2 rounded-full bg-gov-emerald animate-pulse"></span>Live Pipeline
              </span>
            </div>
          </div>
          <div class="grid grid-cols-3 gap-space-xs sm:gap-space-sm bg-surface-subtle p-space-xs rounded-xl border border-border-hairline">
            <div class="bg-surface-crisp px-space-md py-space-xs rounded-lg shadow-sm">
              <span class="block font-label-sm text-label-sm text-text-muted uppercase">Total Cycles</span>
              <span class="font-mono-code text-headline-sm text-ashoka-blue font-bold">${totalElements}</span>
            </div>
            <div class="bg-surface-crisp px-space-md py-space-xs rounded-lg shadow-sm">
              <span class="block font-label-sm text-label-sm text-text-muted uppercase">In Progress</span>
              <span class="font-mono-code text-headline-sm text-saffron-accent font-bold">${activeCount}</span>
            </div>
            <div class="bg-surface-crisp px-space-md py-space-xs rounded-lg shadow-sm">
              <span class="block font-label-sm text-label-sm text-text-muted uppercase">Completed / Ready</span>
              <span class="font-mono-code text-headline-sm text-gov-emerald font-bold">${completedCount}</span>
            </div>
          </div>
        </div>

        <!-- Filter Bar -->
        <div class="bg-surface-crisp p-space-md rounded-xl shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-space-md border border-border-hairline">
          <div class="flex items-center gap-space-xs overflow-x-auto pb-1 md:pb-0">
            <button onclick="window.evalPage.setFilter('ALL')" class="px-3 py-1.5 rounded-full font-label-sm text-label-sm ${currentFilter === 'ALL' ? 'bg-ashoka-blue text-on-primary shadow-sm font-bold' : 'bg-surface-subtle text-text-secondary hover:bg-surface-container'} transition-colors cursor-pointer">ALL (${totalElements})</button>
            <button onclick="window.evalPage.setFilter('EVALUATION_IN_PROGRESS')" class="px-3 py-1.5 rounded-full font-label-sm text-label-sm ${currentFilter === 'EVALUATION_IN_PROGRESS' ? 'bg-ashoka-blue text-on-primary shadow-sm font-bold' : 'bg-status-review-bg text-status-review-text hover:brightness-95'} transition-colors cursor-pointer">IN PROGRESS</button>
            <button onclick="window.evalPage.setFilter('EVALUATION_COMPLETED')" class="px-3 py-1.5 rounded-full font-label-sm text-label-sm ${currentFilter === 'EVALUATION_COMPLETED' ? 'bg-ashoka-blue text-on-primary shadow-sm font-bold' : 'bg-status-approved-bg text-status-approved-text hover:brightness-95'} transition-colors cursor-pointer">COMPLETED</button>
            <button onclick="window.evalPage.setFilter('SCORES_AGGREGATED')" class="px-3 py-1.5 rounded-full font-label-sm text-label-sm ${currentFilter === 'SCORES_AGGREGATED' ? 'bg-ashoka-blue text-on-primary shadow-sm font-bold' : 'bg-status-submitted-bg text-status-submitted-text hover:brightness-95'} transition-colors cursor-pointer">AGGREGATED</button>
            <button onclick="window.evalPage.setFilter('PRIORITIZED')" class="px-3 py-1.5 rounded-full font-label-sm text-label-sm ${currentFilter === 'PRIORITIZED' ? 'bg-ashoka-blue text-on-primary shadow-sm font-bold' : 'bg-surface-container text-institutional-navy hover:brightness-95'} transition-colors cursor-pointer">PRIORITIZED</button>
          </div>
          <div class="flex items-center gap-space-sm justify-end">
            <div class="relative flex items-center">
              <span class="material-symbols-outlined absolute left-3 text-text-muted text-[18px]">search</span>
              <input
                id="eval-search-input"
                value="${escapeHtml(searchFilter)}"
                class="w-64 pl-9 pr-3 py-1.5 bg-surface-subtle rounded-lg text-body-sm font-body-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:bg-surface-crisp shadow-inner border border-border-hairline"
                placeholder="Search Cycle or Problem UUID..."
                type="text"
              />
            </div>
            <button onclick="window.evalPage.refresh()" class="p-2 rounded-lg bg-surface-subtle text-text-secondary hover:bg-surface-container hover:text-text-primary transition-colors cursor-pointer" title="Refresh Live Queue">
              <span class="material-symbols-outlined text-[20px]">refresh</span>
            </button>
          </div>
        </div>

        <!-- Main Grid: Table + Inspector -->
        <div class="grid grid-cols-1 xl:grid-cols-12 gap-space-lg items-start">
          <!-- Table (7 cols) -->
          <div class="xl:col-span-7 bg-surface-crisp rounded-xl shadow-sm overflow-hidden flex flex-col border border-border-hairline">
            <div class="px-space-md py-space-sm bg-surface-subtle flex items-center justify-between border-b border-border-hairline">
              <div class="flex items-center gap-space-sm">
                <span class="font-label-md text-label-md text-ashoka-blue font-bold">Active Evaluation Queue</span>
                <span class="px-2 py-0.5 rounded font-mono-code text-[11px] bg-surface-container text-institutional-navy font-semibold">PAGE ${currentPage + 1} OF ${Math.max(1, totalPages)}</span>
              </div>
              <span class="font-mono-code text-body-sm text-text-muted">Showing ${filtered.length} of ${totalElements} cycles</span>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left">
                <thead>
                  <tr class="bg-surface-muted/60 text-text-secondary font-label-sm text-label-sm uppercase tracking-wider">
                    <th class="py-3 px-space-md">Cycle &amp; Problem Target</th>
                    <th class="py-3 px-space-sm">Final Score</th>
                    <th class="py-3 px-space-sm">Band</th>
                    <th class="py-3 px-space-sm">Status</th>
                    <th class="py-3 px-space-md text-right">Action</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-border-hairline text-body-sm">
                  ${filtered.length === 0 ? `
                    <tr>
                      <td colspan="5" class="py-12 text-center text-text-muted">
                        <span class="material-symbols-outlined text-[36px] block mx-auto mb-2 text-text-muted/60">biotech</span>
                        No evaluation cycles found in this status.
                      </td>
                    </tr>
                  ` : filtered.map(item => {
                    const isActive = item.cycleId === selectedCycleId;
                    const badge = getEvalStatusBadge(item.status);
                    const shortCycle = item.cycleId.slice(0, 8).toUpperCase();
                    const shortProb = item.problemId ? item.problemId.slice(0, 8).toUpperCase() : 'N/A';
                    return `
                      <tr class="${isActive ? 'bg-surface-container-low font-medium' : 'hover:bg-surface-subtle'} cursor-pointer transition-colors" onclick="window.evalPage.select('${item.cycleId}')">
                        <td class="py-3 px-space-md">
                          <div class="flex flex-col">
                            <span class="font-mono-code ${isActive ? 'font-bold text-ashoka-blue' : 'text-text-primary'} text-label-lg flex items-center gap-1.5">
                              ${shortCycle}
                              ${isActive ? '<span class="w-1.5 h-1.5 rounded-full bg-saffron-accent"></span>' : ''}
                            </span>
                            <span class="font-mono-code text-xs text-text-muted truncate max-w-[200px]">PRB: ${shortProb}</span>
                          </div>
                        </td>
                        <td class="py-3 px-space-sm font-mono-code font-bold text-text-primary">
                          ${item.finalScore != null ? Number(item.finalScore).toFixed(1) : '<span class="text-text-muted font-normal">—</span>'}
                        </td>
                        <td class="py-3 px-space-sm">
                          ${item.priorityBand ? `
                            <span class="px-2 py-0.5 rounded font-mono-code text-xs font-bold ${getBandBadge(item.priorityBand)}">
                              ${item.priorityBand}
                            </span>
                          ` : '<span class="text-text-muted text-xs">—</span>'}
                        </td>
                        <td class="py-3 px-space-sm">
                          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono-code font-bold ${badge.classes}">
                            ${item.status}
                          </span>
                        </td>
                        <td class="py-3 px-space-md text-right">
                          <button class="inline-flex items-center px-2.5 py-1 rounded ${isActive ? 'bg-ashoka-blue text-on-primary font-semibold' : 'bg-surface-muted text-text-secondary hover:bg-surface-container'} transition-colors font-label-sm text-xs">
                            ${isActive ? 'Viewing' : 'Inspect'}
                          </button>
                        </td>
                      </tr>`;
                  }).join('')}
                </tbody>
              </table>
            </div>

            <!-- Pagination -->
            <div class="p-space-md bg-surface-subtle flex flex-col sm:flex-row items-center justify-between gap-space-sm border-t border-border-hairline">
              <span class="text-text-muted font-body-sm text-xs">Page ${currentPage + 1} of ${Math.max(1, totalPages)} (${totalElements} total items)</span>
              <div class="flex items-center gap-space-xs">
                <button
                  class="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-surface-crisp text-text-secondary font-label-md text-xs shadow-sm hover:bg-surface-container transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  ${currentPage <= 0 ? 'disabled' : ''}
                  onclick="window.evalPage.prevPage()"
                >
                  <span class="material-symbols-outlined text-[16px]">chevron_left</span>Previous
                </button>
                <span class="px-3 py-1.5 rounded font-mono-code text-xs text-ashoka-blue font-bold bg-surface-crisp shadow-sm border border-border-hairline">
                  ${currentPage + 1} / ${Math.max(1, totalPages)}
                </span>
                <button
                  class="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-surface-crisp text-text-secondary hover:bg-surface-container font-label-md text-xs shadow-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  ${currentPage + 1 >= totalPages ? 'disabled' : ''}
                  onclick="window.evalPage.nextPage()"
                >
                  Next<span class="material-symbols-outlined text-[16px]">chevron_right</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Inspector (5 cols) -->
          <div class="xl:col-span-5 flex flex-col gap-space-md">
            ${c ? `
              <div class="bg-surface-crisp rounded-xl shadow-md p-space-lg flex flex-col gap-space-lg border border-border-hairline">
                <!-- Inspector Header -->
                <div class="flex items-start justify-between">
                  <div class="flex flex-col gap-space-2xs">
                    <span class="font-mono-code text-label-sm text-text-muted uppercase tracking-wider font-bold">CYCLE INSPECTOR DOSSIER</span>
                    <div class="flex items-center gap-space-sm flex-wrap">
                      <h3 class="font-headline-md text-headline-md text-ashoka-blue tracking-tight font-mono-code font-bold">${c.cycleId}</h3>
                      <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono-code font-bold ${getEvalStatusBadge(c.status).classes}">
                        ${c.status}
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Metadata Cards -->
                <div class="grid grid-cols-2 gap-space-sm bg-surface-subtle p-space-md rounded-lg border border-border-hairline">
                  <div>
                    <span class="font-label-sm text-label-sm text-text-muted uppercase">Target Problem ID</span>
                    <span class="font-mono-code text-xs text-ashoka-blue font-bold block mt-0.5 truncate">${c.problemId}</span>
                  </div>
                  <div>
                    <span class="font-label-sm text-label-sm text-text-muted uppercase">Priority Band</span>
                    <span class="font-mono-code text-xs font-bold block mt-0.5 ${c.priorityBand ? getBandBadge(c.priorityBand) : 'text-text-muted'}">${c.priorityBand || 'NOT ASSIGNED'}</span>
                  </div>
                  <div>
                    <span class="font-label-sm text-label-sm text-text-muted uppercase">Final Score</span>
                    <span class="font-mono-code text-sm text-gov-emerald font-bold block mt-0.5">${c.finalScore != null ? Number(c.finalScore).toFixed(2) : 'Awaiting Scorecards'}</span>
                  </div>
                  <div>
                    <span class="font-label-sm text-label-sm text-text-muted uppercase">Impact Level</span>
                    <span class="font-mono-code text-xs text-text-primary font-bold block mt-0.5">${c.impactLevel || 'UNASSESSED'}</span>
                  </div>
                  <div class="col-span-2 pt-space-xs border-t border-border-hairline">
                    <span class="font-label-sm text-label-sm text-text-muted uppercase">Cycle Started</span>
                    <span class="font-mono-code text-xs text-text-secondary block">${formatDate(c.startedAt || c.createdAt)}</span>
                  </div>
                </div>

                <!-- Orchestration Action Deck -->
                <div class="flex flex-col gap-2 bg-surface-container-low p-space-md rounded-lg border border-border-hairline">
                  <div class="flex items-center justify-between">
                    <span class="font-label-md text-label-md text-institutional-navy font-bold">Pipeline Orchestration Deck</span>
                    <span class="font-mono-code text-[11px] text-gov-emerald font-semibold">STATE: READY</span>
                  </div>
                  <div class="grid grid-cols-2 gap-2 mt-1">
                    <button onclick="window.evalPage.triggerAnalysis('${c.cycleId}')" class="py-2 px-3 rounded bg-ashoka-blue text-on-primary hover:bg-institutional-navy transition-all text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm cursor-pointer">
                      <span class="material-symbols-outlined text-[16px]">psychology</span>
                      <span>Run AI Analysis</span>
                    </button>
                    <button onclick="window.evalPage.triggerRoutePools('${c.cycleId}')" class="py-2 px-3 rounded bg-institutional-navy text-on-primary hover:brightness-110 transition-all text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm cursor-pointer">
                      <span class="material-symbols-outlined text-[16px]">alt_route</span>
                      <span>Route Pools</span>
                    </button>
                    <button onclick="window.evalPage.triggerAggregate('${c.cycleId}')" class="py-2 px-3 rounded bg-surface-crisp text-ashoka-blue hover:bg-surface-container transition-all text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm border border-border-hairline cursor-pointer">
                      <span class="material-symbols-outlined text-[16px]">calculate</span>
                      <span>Aggregate Scores</span>
                    </button>
                    <button onclick="window.evalPage.triggerPrioritize('${c.cycleId}')" class="py-2 px-3 rounded bg-surface-crisp text-ashoka-blue hover:bg-surface-container transition-all text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm border border-border-hairline cursor-pointer">
                      <span class="material-symbols-outlined text-[16px]">star</span>
                      <span>Prioritize Band</span>
                    </button>
                  </div>
                  <button onclick="window.evalPage.triggerPublish('${c.cycleId}')" class="w-full mt-1 py-2 px-3 rounded bg-gov-emerald text-on-primary hover:brightness-110 transition-all text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm cursor-pointer">
                    <span class="material-symbols-outlined text-[16px]">public</span>
                    <span>Publish Cycle to Public Portal</span>
                  </button>
                </div>

                <!-- Aggregation Summary (if available) -->
                ${aggregationData ? `
                  <div class="flex flex-col gap-2 p-3 bg-surface-subtle rounded-lg border border-border-hairline">
                    <div class="flex items-center justify-between">
                      <span class="text-xs font-bold text-ashoka-blue uppercase">Scorecard Aggregation</span>
                      <span class="text-[10px] font-mono-code px-1.5 py-0.5 rounded bg-surface-container font-semibold">${aggregationData.status || 'AGGREGATED'}</span>
                    </div>
                    <div class="flex items-center justify-between text-xs">
                      <span class="text-text-muted">Weighted Score:</span>
                      <span class="font-mono-code font-bold text-gov-emerald">${aggregationData.overallScore != null ? Number(aggregationData.overallScore).toFixed(2) : 'N/A'}</span>
                    </div>
                    ${aggregationData.disagreementFlag ? `
                      <div class="p-2 rounded bg-status-action-bg text-status-action-text text-xs border border-status-action-border">
                        <strong>Disagreement Flagged:</strong> Scorecard variance between evaluator pools exceeded statutory threshold.
                      </div>
                    ` : ''}
                  </div>
                ` : ''}

                <!-- Lifecycle Event History -->
                <div class="flex flex-col gap-space-sm">
                  <div class="flex items-center justify-between">
                    <span class="font-label-md text-label-md text-ashoka-blue font-bold uppercase tracking-wide">Lifecycle History Trail</span>
                    <span class="font-mono-code text-[11px] text-text-muted">${historyList.length} RECORDED STAGES</span>
                  </div>
                  ${historyList.length === 0 ? `
                    <div class="p-3 bg-surface-subtle rounded-lg text-xs text-text-muted text-center border border-border-hairline">
                      No status transitions recorded for this cycle yet.
                    </div>
                  ` : `
                    <div class="relative pl-6 flex flex-col gap-space-md before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-surface-container-high">
                      ${historyList.map(h => `
                        <div class="relative flex flex-col gap-space-2xs">
                          <span class="absolute -left-6 top-1 w-3 h-3 rounded-full bg-ashoka-blue ring-4 ring-surface-crisp"></span>
                          <div class="flex items-center justify-between">
                            <span class="inline-flex items-center px-1.5 py-0.5 rounded font-mono-code text-[11px] bg-status-submitted-bg text-status-submitted-text font-bold">
                              ${h.toStatus}
                            </span>
                            <span class="font-mono-code text-[11px] text-text-muted">${formatDate(h.changedAt)}</span>
                          </div>
                          <p class="font-body-sm text-body-sm text-text-secondary">${escapeHtml(h.comment || `Transitioned from ${h.fromStatus || 'INITIAL'}`)}</p>
                        </div>
                      `).join('')}
                    </div>
                  `}
                </div>
              </div>
            ` : `
              <div class="p-12 text-center text-text-muted bg-surface-crisp rounded-xl border border-border-hairline">
                Please select an evaluation cycle from the table to inspect details.
              </div>
            `}
          </div>
        </div>
      </section>
    </div>`;
}

function getEvalStatusBadge(status) {
  switch (status) {
    case 'EVALUATION_COMPLETED':
    case 'PHASE_3_READY':
      return { classes: 'bg-status-approved-bg text-status-approved-text border border-status-approved-border' };
    case 'SCORES_AGGREGATED':
    case 'PRIORITIZED':
      return { classes: 'bg-status-submitted-bg text-status-submitted-text border border-status-submitted-border' };
    case 'EVALUATION_IN_PROGRESS':
    case 'ANALYZING':
    case 'ROUTING':
      return { classes: 'bg-status-review-bg text-status-review-text border border-status-review-border' };
    default:
      return { classes: 'bg-surface-container text-text-secondary border border-border-hairline' };
  }
}

function getBandBadge(band) {
  switch (band) {
    case 'P1': return 'bg-gov-emerald text-white px-2 py-0.5 rounded';
    case 'P2': return 'bg-institutional-navy text-white px-2 py-0.5 rounded';
    case 'P3': return 'bg-saffron-accent text-white px-2 py-0.5 rounded';
    default: return 'bg-surface-container text-text-primary px-2 py-0.5 rounded';
  }
}

function formatDate(iso) {
  if (!iso) return 'N/A';
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
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
  const searchInput = document.getElementById('eval-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', e => {
      searchFilter = e.target.value;
      renderAppContent();
    });
  }
}

window.evalPage = {
  refresh() {
    loadEvaluationQueue(currentPage);
  },

  select(id) {
    selectCycle(id);
  },

  setFilter(filter) {
    currentFilter = filter;
    loadEvaluationQueue(0);
  },

  prevPage() {
    if (currentPage > 0) {
      loadEvaluationQueue(currentPage - 1);
    }
  },

  nextPage() {
    if (currentPage + 1 < totalPages) {
      loadEvaluationQueue(currentPage + 1);
    }
  },

  async triggerAnalysis(cycleId) {
    try {
      showToast('Dispatching AI analysis pipeline...', 'info');
      await runAiAnalysis(cycleId);
      showToast('AI analysis completed and cycle advanced!', 'success');
      await selectCycle(cycleId, false);
      await loadEvaluationQueue(currentPage);
    } catch (err) {
      console.error('AI analysis error:', err);
      showToast(err.message || 'Failed to run AI analysis', 'error');
    }
  },

  async triggerRoutePools(cycleId) {
    try {
      showToast('Routing assignments to evaluator pools...', 'info');
      await routePools(cycleId);
      showToast('Evaluator pools routed successfully!', 'success');
      await selectCycle(cycleId, false);
      await loadEvaluationQueue(currentPage);
    } catch (err) {
      console.error('Route pools error:', err);
      showToast(err.message || 'Failed to route pools', 'error');
    }
  },

  async triggerAggregate(cycleId) {
    try {
      showToast('Aggregating submitted scorecards...', 'info');
      await aggregateScores(cycleId);
      showToast('Scorecards aggregated successfully!', 'success');
      await selectCycle(cycleId, false);
      await loadEvaluationQueue(currentPage);
    } catch (err) {
      console.error('Aggregate error:', err);
      showToast(err.message || 'Failed to aggregate scores', 'error');
    }
  },

  async triggerPrioritize(cycleId) {
    try {
      showToast('Assigning priority band and final score...', 'info');
      await prioritizeScores(cycleId);
      showToast('Cycle prioritized successfully!', 'success');
      await selectCycle(cycleId, false);
      await loadEvaluationQueue(currentPage);
    } catch (err) {
      console.error('Prioritize error:', err);
      showToast(err.message || 'Failed to prioritize cycle', 'error');
    }
  },

  async triggerPublish(cycleId) {
    try {
      showToast('Publishing cycle outcome to public portal...', 'info');
      await publishCycleToPortal(cycleId);
      showToast('Cycle published to Bharat Citizen Portal!', 'success');
      await selectCycle(cycleId, false);
      await loadEvaluationQueue(currentPage);
    } catch (err) {
      console.error('Publish error:', err);
      showToast(err.message || 'Failed to publish to portal', 'error');
    }
  },
};

render.afterRender = function() {
  attachEventHandlers();
  if (cyclesList.length === 0 && isLoading) {
    loadEvaluationQueue(0);
  }
};

registerPage('evaluation', render);
