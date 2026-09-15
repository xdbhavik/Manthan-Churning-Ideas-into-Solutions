// ============================================================
// Screen 7: Evaluation Cycles & AI Analysis
// ============================================================
import { registerPage } from '../app.js';

function render() {
  return `
    <div class="flex flex-col w-full">
      <section class="flex flex-col gap-space-lg">
        <!-- Header & KPIs -->
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md pb-space-sm">
          <div class="flex flex-col gap-space-xs">
            <div class="flex items-center gap-space-xs">
              <span class="font-mono-code text-label-sm text-saffron-accent uppercase tracking-wider">PHASE 2 WORKSPACE</span>
              <span class="text-text-muted text-label-sm">•</span>
              <span class="font-mono-code text-label-sm text-text-muted">STATUTORY ARBITRATION ID: N-EVAL-26043</span>
            </div>
            <div class="flex items-baseline gap-space-md">
              <h2 class="font-headline-lg text-headline-lg text-primary tracking-tight">Evaluation Operations &amp; Cycle Orchestration</h2>
              <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-container font-mono-code text-body-sm text-institutional-navy">
                <span class="w-2 h-2 rounded-full bg-gov-emerald animate-pulse"></span>Queue Online • AI Agent v4.8
              </span>
            </div>
          </div>
          <div class="grid grid-cols-3 gap-space-xs sm:gap-space-sm bg-surface-subtle p-space-xs rounded-xl">
            <div class="bg-surface-crisp px-space-md py-space-xs rounded-lg shadow-sm">
              <span class="block font-label-sm text-label-sm text-text-muted uppercase">Active Cycles</span>
              <span class="font-mono-code text-headline-sm text-ashoka-blue font-bold">54</span>
            </div>
            <div class="bg-surface-crisp px-space-md py-space-xs rounded-lg shadow-sm">
              <span class="block font-label-sm text-label-sm text-text-muted uppercase">Degraded / Stalled</span>
              <span class="font-mono-code text-headline-sm text-saffron-accent font-bold">03</span>
            </div>
            <div class="bg-surface-crisp px-space-md py-space-xs rounded-lg shadow-sm">
              <span class="block font-label-sm text-label-sm text-text-muted uppercase">Phase 3 Ready</span>
              <span class="font-mono-code text-headline-sm text-gov-emerald font-bold">19</span>
            </div>
          </div>
        </div>

        <!-- Filter Bar -->
        <div class="bg-surface-crisp p-space-md rounded-xl shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-space-md">
          <div class="flex items-center gap-space-xs overflow-x-auto pb-1 md:pb-0">
            <button class="eval-filter px-3 py-1.5 rounded-full font-label-sm text-label-sm bg-primary text-on-primary shadow-sm" data-filter="ALL">ALL (54)</button>
            <button class="eval-filter px-3 py-1.5 rounded-full font-label-sm text-label-sm bg-surface-subtle text-text-secondary hover:bg-surface-container transition-colors" data-filter="RECEIVED">RECEIVED (4)</button>
            <button class="eval-filter px-3 py-1.5 rounded-full font-label-sm text-label-sm bg-status-action-bg text-status-action-text hover:brightness-95 transition-colors" data-filter="ANALYSIS_FAILED">ANALYSIS FAILED (3)</button>
            <button class="eval-filter px-3 py-1.5 rounded-full font-label-sm text-label-sm bg-status-review-bg text-status-review-text hover:brightness-95 transition-colors" data-filter="IN_PROGRESS">IN PROGRESS (12)</button>
            <button class="eval-filter px-3 py-1.5 rounded-full font-label-sm text-label-sm bg-status-approved-bg text-status-approved-text hover:brightness-95 transition-colors" data-filter="PHASE_3_READY">PHASE 3 READY (19)</button>
          </div>
          <div class="flex items-center gap-space-sm justify-end">
            <div class="relative flex items-center">
              <span class="material-symbols-outlined absolute left-3 text-text-muted text-[18px]">search</span>
              <input class="w-64 pl-9 pr-3 py-1.5 bg-surface-subtle rounded-lg text-body-sm font-body-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:bg-surface-crisp shadow-inner" placeholder="Search Cycle or Problem ID..." type="text"/>
            </div>
            <button class="p-2 rounded-lg bg-surface-subtle text-text-secondary hover:bg-surface-container hover:text-text-primary transition-colors"><span class="material-symbols-outlined text-[20px]">filter_list</span></button>
            <button class="p-2 rounded-lg bg-surface-subtle text-text-secondary hover:bg-surface-container hover:text-text-primary transition-colors"><span class="material-symbols-outlined text-[20px]">file_download</span></button>
          </div>
        </div>

        <!-- Main Grid: Table + Inspector -->
        <div class="grid grid-cols-1 xl:grid-cols-12 gap-space-lg items-start">
          <!-- Table (7 cols) -->
          <div class="xl:col-span-7 bg-surface-crisp rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div class="px-space-md py-space-sm bg-surface-subtle flex items-center justify-between">
              <div class="flex items-center gap-space-sm">
                <span class="font-label-md text-label-md text-primary">Active Batches &amp; Execution Pipeline</span>
                <span class="px-2 py-0.5 rounded font-mono-code text-[11px] bg-surface-container text-institutional-navy font-semibold">PAGE 1 OF 6</span>
              </div>
              <span class="font-mono-code text-body-sm text-text-muted">Showing 1–10 of 54 cycles</span>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-left">
                <thead>
                  <tr class="bg-surface-muted/60 text-text-secondary font-label-sm text-label-sm uppercase tracking-wider">
                    <th class="py-3 px-space-md">Cycle ID &amp; Target</th>
                    <th class="py-3 px-space-sm">Panel / Node</th>
                    <th class="py-3 px-space-sm text-right">Items</th>
                    <th class="py-3 px-space-sm">Status Demarcation</th>
                    <th class="py-3 px-space-md text-right">Action</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-border-hairline text-body-sm">
                  ${evalRow('CYC-2024-EVAL-08', 'PRB-IND-AGRI-109', 'Panel Beta-3', 'Worker #4 [STALL]', '128', 'ANALYSIS_FAILED', 'bg-status-action-bg text-status-action-text', true)}
                  ${evalRow('CYC-2024-EVAL-09', 'PRB-GOV-URB-042', 'Panel Alpha-1', 'Cluster Grid West', '256', 'EVAL_IN_PROGRESS', 'bg-status-review-bg text-status-review-text')}
                  ${evalRow('CYC-2024-EVAL-07', 'PRB-HEA-CARE-018', 'Panel Gamma-Core', 'Validated Sovereign', '64', 'PHASE_3_READY', 'bg-status-approved-bg text-status-approved-text')}
                  ${evalRow('CYC-2024-EVAL-06', 'PRB-ED-TECH-882', 'Panel Epsilon', 'Node Delhi-02', '180', 'SCORES_AGGREGATED', 'bg-status-submitted-bg text-status-submitted-text')}
                  ${evalRow('CYC-2024-EVAL-05', 'PRB-ENRG-WND-003', 'Panel Theta', 'Node Bengaluru-01', '92', 'PRIORITIZED', 'bg-surface-container text-institutional-navy')}
                  ${evalRow('CYC-2024-EVAL-04', 'PRB-WAT-DIST-141', 'Panel Alpha-2', 'Node Hyderabad', '64', 'EVAL_COMPLETED', 'bg-status-approved-bg text-status-approved-text')}
                  ${evalRow('CYC-2024-EVAL-03', 'PRB-CYB-DEF-900', 'Automated Dispatch', 'Ingress Pipeline', '310', 'ROUTING', 'bg-surface-container text-on-surface')}
                  ${evalRow('CYC-2024-EVAL-02', 'PRB-FIN-INC-654', 'Synthesizer Worker', 'LLM-Cluster-C', '144', 'ANALYZING', 'bg-status-review-bg text-status-review-text')}
                  ${evalRow('CYC-2024-EVAL-01', 'PRB-LOG-RUR-223', 'Staging Area', 'Gateway Ingest', '50', 'RECEIVED', 'bg-status-submitted-bg text-status-submitted-text')}
                  ${evalRow('CYC-2024-EVAL-00', 'PRB-MIN-GEO-771', 'Panel Sigma', 'Node Pune-01', '110', 'PRIORITIZED', 'bg-surface-container text-institutional-navy')}
                </tbody>
              </table>
            </div>
            <!-- Pagination -->
            <div class="p-space-md bg-surface-subtle flex flex-col sm:flex-row items-center justify-between gap-space-sm">
              <span class="text-text-muted font-body-sm text-body-sm">Displaying items 1 to 10 of 54 cycles</span>
              <div class="flex items-center gap-space-xs">
                <button class="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-surface-crisp text-text-secondary font-label-md text-label-md shadow-sm cursor-not-allowed opacity-50" disabled>
                  <span class="material-symbols-outlined text-[18px]">chevron_left</span>Previous
                </button>
                <span class="px-3 py-1.5 rounded font-mono-code text-label-md text-primary font-bold bg-surface-crisp shadow-sm">Page 1 of 6</span>
                <button class="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-surface-crisp text-text-secondary hover:bg-surface-container font-label-md text-label-md shadow-sm transition-colors">
                  Next<span class="material-symbols-outlined text-[18px]">chevron_right</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Inspector (5 cols) -->
          <div class="xl:col-span-5 flex flex-col gap-space-md">
            <div class="bg-surface-crisp rounded-xl shadow-md p-space-lg flex flex-col gap-space-lg">
              <!-- Header -->
              <div class="flex items-start justify-between">
                <div class="flex flex-col gap-space-2xs">
                  <span class="font-mono-code text-label-sm text-text-muted uppercase tracking-wider">SELECTED CYCLE AUDIT LOG</span>
                  <div class="flex items-center gap-space-sm">
                    <h3 class="font-headline-md text-headline-md text-ashoka-blue tracking-tight">CYC-2024-EVAL-08</h3>
                    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-label-sm font-label-sm bg-status-action-bg text-status-action-text font-bold">ANALYSIS_FAILED</span>
                  </div>
                </div>
                <div class="p-2 rounded-lg bg-surface-subtle text-text-muted"><span class="material-symbols-outlined text-[24px]">terminal</span></div>
              </div>
              <!-- Metadata -->
              <div class="grid grid-cols-2 gap-space-sm bg-surface-subtle p-space-md rounded-lg">
                <div><span class="font-label-sm text-label-sm text-text-muted uppercase">Associated Problem</span><span class="font-mono-code text-label-md text-ashoka-blue font-semibold block">PRB-IND-AGRI-109</span></div>
                <div><span class="font-label-sm text-label-sm text-text-muted uppercase">Evaluator Panel</span><span class="font-body-md text-body-md text-text-primary font-semibold block">Panel Beta-3 (Agritech)</span></div>
                <div><span class="font-label-sm text-label-sm text-text-muted uppercase">Batch Allocation</span><span class="font-mono-code text-label-md text-text-primary block">128 Dossiers</span></div>
                <div><span class="font-label-sm text-label-sm text-text-muted uppercase">Pipeline Ingest</span><span class="font-mono-code text-label-md text-text-primary block">Today, 09:14:22 IST</span></div>
                <div class="col-span-2 pt-space-xs"><span class="font-label-sm text-label-sm text-text-muted uppercase">Last Attempt Execution</span><span class="font-mono-code text-body-sm text-saffron-accent font-semibold block">Today, 10:48:19 IST (Cluster Exit Code: 137)</span></div>
              </div>
              <!-- Action Button -->
              <div class="flex flex-col gap-space-xs bg-surface-container-low p-space-md rounded-lg">
                <div class="flex items-center justify-between">
                  <span class="font-label-md text-label-md text-institutional-navy">Orchestration Action</span>
                  <span class="font-mono-code text-[11px] text-gov-emerald font-semibold">STATE: IDEMPOTENT-READY</span>
                </div>
                <button class="w-full mt-space-xs py-2.5 px-space-md rounded bg-saffron-accent text-on-primary hover:brightness-110 active:brightness-90 transition-all font-label-lg text-label-lg flex items-center justify-center gap-space-sm shadow-sm" id="rerun-btn" onclick="window.evalPage.rerunAnalysis()">
                  <span class="material-symbols-outlined text-[20px]" id="rerun-icon">restart_alt</span>
                  <span id="rerun-text">(Re-)Run AI Analysis</span>
                </button>
                <p class="font-body-sm text-body-sm text-text-secondary leading-relaxed pt-space-2xs">
                  Safe idempotent execution. Re-runs model analysis or clears stuck processes for cycles in <span class="font-mono-code text-saffron-accent font-bold">ANALYSIS_FAILED</span> without duplicate ledger charges.
                </p>
              </div>
              <!-- Event Stream -->
              <div class="flex flex-col gap-space-sm">
                <div class="flex items-center justify-between">
                  <span class="font-label-md text-label-md text-primary uppercase tracking-wide">Cycle Event Stream (Append-Only)</span>
                  <span class="font-mono-code text-[11px] text-text-muted">4 RECORDED NODES</span>
                </div>
                <div class="relative pl-6 flex flex-col gap-space-md before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-surface-container-high">
                  ${cycleEvent('RECEIVED', 'bg-status-submitted-text', 'bg-status-submitted-bg text-status-submitted-text', '09:14:22.108 IST', 'Batch manifest registered from Central Sovereign Ingest. 128 items cryptographically signed.')}
                  ${cycleEvent('ROUTING', 'bg-institutional-navy', 'bg-surface-container text-institutional-navy', '09:15:05.412 IST', 'Assigned affinity matrix to Panel Beta-3 (Agritech & Rural Electrification Review Core).')}
                  ${cycleEvent('ANALYZING', 'bg-status-review-text', 'bg-status-review-bg text-status-review-text', '09:18:40.003 IST', 'Dispatched container workloads to compute nodes <span class="font-mono-code text-[12px] text-text-primary">worker-04</span> and <span class="font-mono-code text-[12px] text-text-primary">worker-05</span>.')}
                  <div class="relative flex flex-col gap-space-2xs">
                    <span class="absolute -left-6 top-1 w-3 h-3 rounded-full bg-error ring-4 ring-surface-crisp"></span>
                    <div class="flex items-center justify-between">
                      <span class="inline-flex items-center px-1.5 py-0.5 rounded font-mono-code text-[11px] bg-status-action-bg text-status-action-text font-bold">ANALYSIS_FAILED</span>
                      <span class="font-mono-code text-[11px] text-error font-bold">10:48:19.890 IST</span>
                    </div>
                    <div class="p-2.5 rounded bg-error-container/40 text-on-error-container font-mono-code text-[12px] leading-relaxed">
                      TIMEOUT: OOM on cluster worker #4 during semantic vector normalization. Task terminated by node daemon.
                    </div>
                  </div>
                </div>
              </div>
              <!-- Checksum Footer -->
              <div class="pt-space-sm bg-surface-subtle p-space-sm rounded-lg flex items-center justify-between">
                <span class="font-label-sm text-label-sm text-text-muted">Cryptographic Ledger Checksum</span>
                <span class="font-mono-code text-[11px] text-text-primary tracking-wider">sha256:7e8d...a302ff</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>`;
}

function evalRow(cycleId, probId, panel, node, items, status, statusClasses, isActive) {
  const rowClass = isActive ? 'cycle-row bg-surface-container-low hover:bg-surface-container cursor-pointer transition-colors' : 'cycle-row hover:bg-surface-subtle cursor-pointer transition-colors';
  const idClass = isActive ? 'font-bold text-ashoka-blue' : 'font-semibold text-text-primary';
  const btnClass = isActive ? 'bg-ashoka-blue text-on-primary hover:bg-institutional-navy' : 'bg-surface-muted text-text-secondary hover:bg-surface-container';
  return `
    <tr class="${rowClass}" data-cycle-id="${cycleId}">
      <td class="py-3 px-space-md"><div class="flex flex-col">
        <span class="font-mono-code ${idClass} text-label-lg flex items-center gap-1.5">${cycleId}${isActive ? '<span class="w-1.5 h-1.5 rounded-full bg-saffron-accent"></span>' : ''}</span>
        <span class="font-mono-code text-body-sm text-text-muted">${probId}</span>
      </div></td>
      <td class="py-3 px-space-sm"><div class="flex flex-col">
        <span class="font-label-md text-label-md text-text-primary">${panel}</span>
        <span class="font-mono-code text-[11px] text-text-muted">${node}</span>
      </div></td>
      <td class="py-3 px-space-sm text-right font-mono-code font-semibold text-text-primary">${items}</td>
      <td class="py-3 px-space-sm">
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-label-sm font-label-sm ${statusClasses} font-bold">${status}</span>
      </td>
      <td class="py-3 px-space-md text-right">
        <button class="inline-flex items-center px-2 py-1 rounded ${btnClass} transition-colors font-label-sm text-label-sm">Inspect</button>
      </td>
    </tr>`;
}

function cycleEvent(status, dotClass, badgeClass, time, description) {
  return `
    <div class="relative flex flex-col gap-space-2xs">
      <span class="absolute -left-6 top-1 w-3 h-3 rounded-full ${dotClass} ring-4 ring-surface-crisp"></span>
      <div class="flex items-center justify-between">
        <span class="inline-flex items-center px-1.5 py-0.5 rounded font-mono-code text-[11px] ${badgeClass} font-bold">${status}</span>
        <span class="font-mono-code text-[11px] text-text-muted">${time}</span>
      </div>
      <p class="font-body-sm text-body-sm text-text-secondary">${description}</p>
    </div>`;
}

window.evalPage = {
  rerunAnalysis() {
    const icon = document.getElementById('rerun-icon');
    const text = document.getElementById('rerun-text');
    const btn = document.getElementById('rerun-btn');
    if (icon) icon.classList.add('animate-spin');
    if (btn) { btn.disabled = true; btn.classList.add('opacity-75'); }
    if (text) text.textContent = 'Dispatching Worker Pipeline...';
    setTimeout(() => {
      if (icon) icon.classList.remove('animate-spin');
      if (btn) { btn.disabled = false; btn.classList.remove('opacity-75'); }
      if (text) text.textContent = 'Pipeline Queued (Job #8821)';
      setTimeout(() => { if (text) text.textContent = '(Re-)Run AI Analysis'; }, 3000);
    }, 1400);
  },
};

render.afterRender = function() {
  // Filter pill toggle
  document.querySelectorAll('.eval-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.eval-filter').forEach(b => {
        b.classList.remove('bg-primary', 'text-on-primary', 'shadow-sm');
        b.classList.add('bg-surface-subtle', 'text-text-secondary');
      });
      btn.classList.remove('bg-surface-subtle', 'text-text-secondary');
      btn.classList.add('bg-primary', 'text-on-primary', 'shadow-sm');
    });
  });
  // Row selection
  document.querySelectorAll('.cycle-row').forEach(row => {
    row.addEventListener('click', () => {
      document.querySelectorAll('.cycle-row').forEach(r => r.classList.remove('bg-surface-container-low'));
      row.classList.add('bg-surface-container-low');
    });
  });
};

registerPage('evaluation', render);
