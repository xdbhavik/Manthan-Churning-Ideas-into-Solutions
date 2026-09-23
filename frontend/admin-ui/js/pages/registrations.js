// ============================================================
// Screen 5: Registrations Queue & Detail
// ============================================================
import { registerPage, showToast } from '../app.js';

function render() {
  return `
    <div class="flex flex-col w-full gap-space-lg">
      <!-- Top Metric Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-space-md">
        <div class="bg-surface-crisp p-space-md rounded-xl shadow-sm flex items-center justify-between">
          <div class="flex flex-col">
            <span class="font-label-sm text-label-sm text-text-muted uppercase tracking-wider">Queue Total</span>
            <span class="font-headline-lg text-headline-lg text-ashoka-blue mt-space-2xs">142</span>
            <span class="font-body-sm text-body-sm text-gov-emerald flex items-center gap-1 mt-1">
              <span class="material-symbols-outlined text-[14px]">trending_up</span> +12 from yesterday
            </span>
          </div>
          <div class="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-institutional-navy">
            <span class="material-symbols-outlined">inbox</span>
          </div>
        </div>
        <div class="bg-surface-crisp p-space-md rounded-xl shadow-sm flex items-center justify-between">
          <div class="flex flex-col">
            <span class="font-label-sm text-label-sm text-text-muted uppercase tracking-wider">Pending Review</span>
            <span class="font-headline-lg text-headline-lg text-text-primary mt-space-2xs">37</span>
            <span class="font-body-sm text-body-sm text-text-muted mt-1">Avg SLA: 4.2h remaining</span>
          </div>
          <div class="w-10 h-10 rounded-lg bg-status-review-bg flex items-center justify-center text-status-review-text">
            <span class="material-symbols-outlined">hourglass_top</span>
          </div>
        </div>
        <div class="bg-surface-crisp p-space-md rounded-xl shadow-sm flex items-center justify-between">
          <div class="flex flex-col">
            <span class="font-label-sm text-label-sm text-text-muted uppercase tracking-wider">Action Deficiencies</span>
            <span class="font-headline-lg text-headline-lg text-saffron-accent mt-space-2xs">19</span>
            <span class="font-body-sm text-body-sm text-status-action-text mt-1">Awaiting submitter upload</span>
          </div>
          <div class="w-10 h-10 rounded-lg bg-status-action-bg flex items-center justify-center text-saffron-accent">
            <span class="material-symbols-outlined">warning</span>
          </div>
        </div>
        <div class="bg-surface-crisp p-space-md rounded-xl shadow-sm flex items-center justify-between">
          <div class="flex flex-col">
            <span class="font-label-sm text-label-sm text-text-muted uppercase tracking-wider">Approved (MTD)</span>
            <span class="font-headline-lg text-headline-lg text-gov-emerald mt-space-2xs">604</span>
            <span class="font-body-sm text-body-sm text-text-muted mt-1">98.4% First-pass verified</span>
          </div>
          <div class="w-10 h-10 rounded-lg bg-status-approved-bg flex items-center justify-center text-gov-emerald">
            <span class="material-symbols-outlined">verified</span>
          </div>
        </div>
      </div>

      <!-- Filter Toolbar -->
      <div class="bg-surface-crisp rounded-xl p-space-md shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-space-md">
        <div class="flex flex-wrap items-center gap-space-xs">
          <button class="reg-filter-btn px-space-md py-1.5 rounded-full font-label-md text-label-md bg-ashoka-blue text-on-primary transition-colors flex items-center gap-1.5 shadow-sm" data-status="ALL">
            <span>ALL</span><span class="bg-white/20 text-on-primary px-1.5 rounded-full text-[10px]">142</span>
          </button>
          <button class="reg-filter-btn px-space-md py-1.5 rounded-full font-label-md text-label-md bg-status-submitted-bg text-status-submitted-text hover:bg-surface-container-high transition-colors flex items-center gap-1.5" data-status="SUBMITTED">
            <span>SUBMITTED</span><span class="bg-status-submitted-border/40 text-status-submitted-text px-1.5 rounded-full text-[10px]">48</span>
          </button>
          <button class="reg-filter-btn px-space-md py-1.5 rounded-full font-label-md text-label-md bg-status-review-bg text-status-review-text shadow-sm flex items-center gap-1.5 font-semibold" data-status="UNDER_REVIEW">
            <span class="w-2 h-2 rounded-full bg-status-review-text animate-pulse"></span>
            <span>UNDER_REVIEW</span><span class="bg-status-review-border/60 text-status-review-text px-1.5 rounded-full text-[10px]">37</span>
          </button>
          <button class="reg-filter-btn px-space-md py-1.5 rounded-full font-label-md text-label-md bg-status-action-bg text-status-action-text hover:bg-status-action-border/40 transition-colors flex items-center gap-1.5" data-status="ACTION_REQUIRED">
            <span>ACTION_REQUIRED</span><span class="bg-status-action-border/80 text-status-action-text px-1.5 rounded-full text-[10px]">19</span>
          </button>
          <div class="h-5 w-px bg-border-hairline mx-1 hidden sm:block"></div>
          <button class="reg-filter-btn px-space-md py-1.5 rounded-full font-label-md text-label-md bg-surface-muted text-text-muted hover:text-text-primary transition-colors flex items-center gap-2 group" data-status="DRAFT">
            <span class="material-symbols-outlined text-[15px] text-text-muted group-hover:text-text-primary">lock</span>
            <span>DRAFT</span>
            <span class="bg-saffron-accent/15 text-saffron-accent text-[10px] uppercase font-label-sm px-1.5 py-0.5 rounded-full">Admin Only</span>
          </button>
        </div>
        <div class="flex items-center gap-space-sm w-full md:w-auto">
          <div class="relative flex-1 md:w-64">
            <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-text-muted">search</span>
            <input class="w-full pl-9 pr-3 py-1.5 bg-surface-subtle rounded-lg text-text-primary font-body-md text-body-md focus:bg-surface-crisp focus:outline-none transition-all placeholder:text-text-muted shadow-sm" placeholder="Filter by UUID or Entity..." type="text" />
          </div>
          <button class="p-2 rounded-lg bg-surface-subtle text-text-secondary hover:bg-surface-muted hover:text-text-primary transition-colors" title="Filter attributes">
            <span class="material-symbols-outlined text-[20px]">tune</span>
          </button>
          <button class="p-2 rounded-lg bg-surface-subtle text-text-secondary hover:bg-surface-muted hover:text-text-primary transition-colors" title="Export CSV">
            <span class="material-symbols-outlined text-[20px]">download</span>
          </button>
        </div>
      </div>

      <!-- Queue Table -->
      <div class="bg-surface-crisp rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div class="px-space-lg py-space-md bg-surface-subtle flex items-center justify-between">
          <div class="flex items-center gap-space-sm">
            <span class="font-headline-sm text-headline-sm text-ashoka-blue">Application Verification Pool</span>
            <span class="font-mono-code text-body-sm text-text-muted">Sync: 12:41:09 IST</span>
          </div>
          <span class="font-label-sm text-label-sm text-text-secondary uppercase tracking-wider">Displaying 1 - 5 of 142 records</span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left font-body-md text-body-md">
            <thead class="bg-surface-muted text-text-muted font-label-md text-label-md uppercase tracking-wider select-none">
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
            <tbody class="divide-y-0">
              <!-- Row 1: Active -->
              <tr class="bg-surface-container-low/70 transition-colors cursor-pointer">
                <td class="py-3.5 px-space-lg font-mono-code text-ashoka-blue font-semibold flex items-center gap-2">
                  <span class="w-1.5 h-6 rounded-full bg-ashoka-blue -ml-2"></span>PRI-KYC-2024-88912
                </td>
                <td class="py-3.5 px-space-md font-semibold text-text-primary">
                  Khadur Sahib Gram Panchayat
                  <span class="block font-body-sm text-body-sm text-text-muted font-normal">Tarn Taran, Punjab (PIN: 143117)</span>
                </td>
                <td class="py-3.5 px-space-md"><span class="inline-flex items-center px-2 py-0.5 rounded-full bg-surface-muted text-institutional-navy font-label-sm text-label-sm">PRI / Local Body</span></td>
                <td class="py-3.5 px-space-md font-mono-code text-body-sm text-text-secondary">2024-10-24 09:14</td>
                <td class="py-3.5 px-space-md">
                  <div class="flex items-center gap-2">
                    <div class="w-6 h-6 rounded-full bg-status-review-bg text-status-review-text flex items-center justify-center font-bold text-[10px]">SR</div>
                    <span class="font-label-md text-label-md text-text-primary">Superuser Root</span>
                  </div>
                </td>
                <td class="py-3.5 px-space-md">
                  <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-status-review-bg text-status-review-text font-label-sm text-label-sm font-bold uppercase tracking-wider shadow-sm">
                    <span class="w-1.5 h-1.5 rounded-full bg-status-review-text"></span>UNDER_REVIEW
                  </span>
                </td>
                <td class="py-3.5 px-space-lg text-right">
                  <button class="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-ashoka-blue text-on-primary font-label-md text-label-md shadow-sm hover:bg-institutional-navy transition-colors">
                    <span>Inspect</span><span class="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                </td>
              </tr>
              <!-- Row 2 -->
              <tr class="hover:bg-surface-subtle transition-colors">
                <td class="py-3.5 px-space-lg font-mono-code text-text-secondary">CORP-KYC-2024-90211</td>
                <td class="py-3.5 px-space-md font-semibold text-text-primary">Adani Green Energy Ltd.<span class="block font-body-sm text-body-sm text-text-muted font-normal">Ahmedabad, Gujarat (CIN: L40300GJ2015PLC082007)</span></td>
                <td class="py-3.5 px-space-md"><span class="inline-flex items-center px-2 py-0.5 rounded-full bg-surface-muted text-text-secondary font-label-sm text-label-sm">Corporate / Industry</span></td>
                <td class="py-3.5 px-space-md font-mono-code text-body-sm text-text-secondary">2024-10-24 10:02</td>
                <td class="py-3.5 px-space-md text-text-muted italic text-body-sm"><span class="px-2 py-0.5 rounded bg-surface-muted text-text-muted text-[11px] font-mono-code">Unassigned</span></td>
                <td class="py-3.5 px-space-md">
                  <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-status-submitted-bg text-status-submitted-text font-label-sm text-label-sm font-bold uppercase tracking-wider">
                    <span class="w-1.5 h-1.5 rounded-full bg-status-submitted-text"></span>SUBMITTED
                  </span>
                </td>
                <td class="py-3.5 px-space-lg text-right"><button class="p-1.5 rounded-lg text-text-secondary hover:bg-surface-muted transition-colors" title="Review"><span class="material-symbols-outlined text-[18px]">visibility</span></button></td>
              </tr>
              <!-- Row 3 -->
              <tr class="hover:bg-surface-subtle transition-colors">
                <td class="py-3.5 px-space-lg font-mono-code text-text-secondary">HEI-KYC-2024-11804</td>
                <td class="py-3.5 px-space-md font-semibold text-text-primary">IIT Roorkee - Hydrology Dept.<span class="block font-body-sm text-body-sm text-text-muted font-normal">Roorkee, Uttarakhand (AISHE: U-0500)</span></td>
                <td class="py-3.5 px-space-md"><span class="inline-flex items-center px-2 py-0.5 rounded-full bg-surface-muted text-text-secondary font-label-sm text-label-sm">Higher Education Inst.</span></td>
                <td class="py-3.5 px-space-md font-mono-code text-body-sm text-text-secondary">2024-10-23 16:45</td>
                <td class="py-3.5 px-space-md">
                  <div class="flex items-center gap-2">
                    <div class="w-6 h-6 rounded-full bg-surface-container text-institutional-navy flex items-center justify-center font-bold text-[10px]">NM</div>
                    <span class="font-label-md text-label-md text-text-primary">Nodal Officer M.</span>
                  </div>
                </td>
                <td class="py-3.5 px-space-md">
                  <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-status-action-bg text-status-action-text font-label-sm text-label-sm font-bold uppercase tracking-wider">
                    <span class="w-1.5 h-1.5 rounded-full bg-status-action-text"></span>ACTION_REQUIRED
                  </span>
                </td>
                <td class="py-3.5 px-space-lg text-right"><button class="p-1.5 rounded-lg text-text-secondary hover:bg-surface-muted transition-colors" title="Review"><span class="material-symbols-outlined text-[18px]">visibility</span></button></td>
              </tr>
              <!-- Row 4 -->
              <tr class="hover:bg-surface-subtle transition-colors">
                <td class="py-3.5 px-space-lg font-mono-code text-text-muted">NGO-KYC-2024-00431</td>
                <td class="py-3.5 px-space-md font-semibold text-text-primary">Seva Mandir Foundation<span class="block font-body-sm text-body-sm text-text-muted font-normal">Udaipur, Rajasthan (Darpan: RJ/2018/01923)</span></td>
                <td class="py-3.5 px-space-md"><span class="inline-flex items-center px-2 py-0.5 rounded-full bg-surface-muted text-text-secondary font-label-sm text-label-sm">Community Organization</span></td>
                <td class="py-3.5 px-space-md font-mono-code text-body-sm text-text-muted">2024-10-22 11:20</td>
                <td class="py-3.5 px-space-md text-text-muted italic text-body-sm"><span class="px-2 py-0.5 rounded bg-surface-muted text-text-muted text-[11px] font-mono-code">Admin Lock</span></td>
                <td class="py-3.5 px-space-md">
                  <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-muted text-text-muted font-label-sm text-label-sm font-bold uppercase tracking-wider">
                    <span class="material-symbols-outlined text-[12px]">edit_note</span>DRAFT
                  </span>
                </td>
                <td class="py-3.5 px-space-lg text-right"><button class="p-1.5 rounded-lg text-text-secondary hover:bg-surface-muted transition-colors" title="Review"><span class="material-symbols-outlined text-[18px]">visibility</span></button></td>
              </tr>
            </tbody>
          </table>
        </div>
        <!-- Pagination -->
        <div class="px-space-lg py-space-sm bg-surface-subtle flex items-center justify-between text-body-sm text-text-secondary">
          <div class="flex items-center gap-space-md">
            <span>Rows per page:</span>
            <select class="bg-surface-crisp px-2 py-1 rounded text-body-sm text-text-primary focus:outline-none shadow-sm">
              <option>10</option><option>25</option><option>50</option>
            </select>
          </div>
          <div class="flex items-center gap-space-sm">
            <span>Page 1 of 15</span>
            <div class="flex items-center gap-1">
              <button class="p-1 rounded bg-surface-crisp text-text-muted cursor-not-allowed shadow-sm"><span class="material-symbols-outlined text-[18px]">chevron_left</span></button>
              <button class="p-1 rounded bg-surface-crisp text-text-primary hover:bg-surface-muted transition-colors shadow-sm"><span class="material-symbols-outlined text-[18px]">chevron_right</span></button>
            </div>
          </div>
        </div>
      </div>

      <!-- Detail Inspector Panel -->
      <div class="bg-surface-crisp rounded-xl shadow-md overflow-hidden flex flex-col">
        <div class="p-space-lg bg-surface-container-high/40 flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
          <div class="flex items-start gap-space-md">
            <div class="w-12 h-12 rounded-xl bg-ashoka-blue text-on-primary flex items-center justify-center flex-shrink-0 shadow-sm">
              <span class="material-symbols-outlined text-[28px]">account_balance</span>
            </div>
            <div class="flex flex-col">
              <div class="flex flex-wrap items-center gap-space-sm">
                <span class="font-headline-md text-headline-md text-ashoka-blue font-bold">Khadur Sahib Gram Panchayat</span>
                <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-status-review-bg text-status-review-text font-label-sm text-label-sm font-bold uppercase tracking-wider shadow-sm">
                  <span class="w-1.5 h-1.5 rounded-full bg-status-review-text"></span>UNDER_REVIEW
                </span>
                <span class="font-mono-code text-body-sm text-text-muted bg-surface-muted px-2 py-0.5 rounded">UUID: PRI-KYC-2024-88912</span>
              </div>
              <p class="font-body-md text-body-md text-text-secondary mt-1">
                Statutory PRI Entity • LGD Code: <strong>239401</strong> • Assigned Reviewer: <strong>Superuser Root (sysadmin@sih26043.gov.in)</strong>
              </p>
            </div>
          </div>
          <div class="flex items-center gap-space-md self-end lg:self-auto bg-surface-crisp p-2.5 rounded-lg shadow-sm">
            <div class="flex flex-col text-right">
              <span class="font-label-sm text-label-sm text-text-muted uppercase tracking-wider">KYC SLA Countdown</span>
              <span class="font-mono-code text-label-lg font-bold text-ashoka-blue" id="sla-timer">05h : 22m : 18s</span>
            </div>
            <div class="w-8 h-8 rounded-full bg-gov-emerald/10 text-gov-emerald flex items-center justify-center">
              <span class="material-symbols-outlined text-[20px]">timer</span>
            </div>
          </div>
        </div>

        <!-- Inspector Content Grid -->
        <div class="p-space-lg grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
          <!-- Left: Details (7 cols) -->
          <div class="lg:col-span-7 flex flex-col gap-space-lg">
            <!-- Entity Data -->
            <div class="bg-surface-subtle p-space-lg rounded-xl shadow-sm flex flex-col gap-space-md">
              <div class="flex items-center justify-between">
                <span class="font-headline-sm text-headline-sm text-ashoka-blue flex items-center gap-2">
                  <span class="material-symbols-outlined text-[20px]">assured_workload</span>Entity &amp; Constitutional Data
                </span>
                <span class="px-2 py-0.5 rounded bg-gov-emerald/10 text-gov-emerald font-label-sm text-label-sm font-semibold">PFMS Synced</span>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                <div><span class="font-label-sm text-label-sm text-text-muted uppercase">Official Legal Name</span><p class="font-body-md text-text-primary font-semibold mt-0.5">Office of Gram Panchayat Khadur Sahib</p></div>
                <div><span class="font-label-sm text-label-sm text-text-muted uppercase">Local Government Directory (LGD)</span><p class="font-mono-code text-body-md text-text-primary font-semibold mt-0.5">239401 / Tarn Taran District</p></div>
                <div><span class="font-label-sm text-label-sm text-text-muted uppercase">Block Development Office</span><p class="font-body-md text-text-primary mt-0.5">Khadur Sahib Development Block</p></div>
                <div><span class="font-label-sm text-label-sm text-text-muted uppercase">Entity State/Territory</span><p class="font-body-md text-text-primary mt-0.5">Punjab (State Code: 03)</p></div>
                <div><span class="font-label-sm text-label-sm text-text-muted uppercase">Entity TAN / TIN Registration</span><p class="font-mono-code text-body-md text-text-primary mt-0.5">PTLK00918A</p></div>
                <div><span class="font-label-sm text-label-sm text-text-muted uppercase">Registered Office Address</span><p class="font-body-md text-text-primary mt-0.5">VPO Khadur Sahib, Tehsil Khadur Sahib, Tarn Taran, 143117</p></div>
              </div>
            </div>
            <!-- Signatories -->
            <div class="bg-surface-subtle p-space-lg rounded-xl shadow-sm flex flex-col gap-space-md">
              <span class="font-headline-sm text-headline-sm text-ashoka-blue flex items-center gap-2">
                <span class="material-symbols-outlined text-[20px]">badge</span>Authorized Head / Sarpanch &amp; Secretary Signatories
              </span>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                <div class="p-space-md bg-surface-crisp rounded-lg shadow-sm">
                  <div class="flex items-center justify-between mb-2">
                    <span class="font-label-sm text-label-sm text-institutional-navy uppercase font-bold">Primary Nodal Officer</span>
                    <span class="material-symbols-outlined text-gov-emerald text-[18px]">verified_user</span>
                  </div>
                  <p class="font-label-lg text-label-lg text-text-primary">Sardarni Gurpreet Kaur</p>
                  <p class="font-body-sm text-body-sm text-text-secondary">Sarpanch (Elected Official)</p>
                  <div class="mt-space-sm pt-space-xs space-y-1">
                    <div class="flex items-center gap-2 font-mono-code text-body-sm text-text-secondary"><span class="material-symbols-outlined text-[16px] text-text-muted">call</span><span>+91 98142 88219</span></div>
                    <div class="flex items-center gap-2 font-mono-code text-body-sm text-text-secondary"><span class="material-symbols-outlined text-[16px] text-text-muted">mail</span><span>sarpanch@khadursahib.gov.in</span></div>
                  </div>
                </div>
                <div class="p-space-md bg-surface-crisp rounded-lg shadow-sm">
                  <div class="flex items-center justify-between mb-2">
                    <span class="font-label-sm text-label-sm text-text-secondary uppercase font-bold">Panchayat Secretary</span>
                    <span class="material-symbols-outlined text-gov-emerald text-[18px]">verified_user</span>
                  </div>
                  <p class="font-label-lg text-label-lg text-text-primary">Harjinder Singh Dhillon</p>
                  <p class="font-body-sm text-body-sm text-text-secondary">Gram Sachiv (State Cadre PBR-827)</p>
                  <div class="mt-space-sm pt-space-xs space-y-1">
                    <div class="flex items-center gap-2 font-mono-code text-body-sm text-text-secondary"><span class="material-symbols-outlined text-[16px] text-text-muted">call</span><span>+91 94170 34102</span></div>
                    <div class="flex items-center gap-2 font-mono-code text-body-sm text-text-secondary"><span class="material-symbols-outlined text-[16px] text-text-muted">mail</span><span>sachiv.khadur@punjab.gov.in</span></div>
                  </div>
                </div>
              </div>
            </div>
            <!-- Documents -->
            <div class="bg-surface-subtle p-space-lg rounded-xl shadow-sm flex flex-col gap-space-md">
              <div class="flex items-center justify-between">
                <span class="font-headline-sm text-headline-sm text-ashoka-blue flex items-center gap-2"><span class="material-symbols-outlined text-[20px]">folder_special</span>Statutory Uploaded Documents</span>
                <span class="font-mono-code text-body-sm text-text-muted">4 Files Verified Hash</span>
              </div>
              <div class="space-y-space-sm">
                ${renderDocRow('picture_as_pdf', 'Gazette Notification & Sarpanch Certificate', 'SHA256: e82f...a91d • 2.4 MB • 2024-10-24', 'OCR Match 99%', 'gov-emerald')}
                ${renderDocRow('picture_as_pdf', 'Gram Sabha Resolution for SIH Co-op (Form 4-B)', 'SHA256: d18b...73c2 • 1.8 MB • 2024-10-24', 'Digitally Signed', 'gov-emerald')}
                ${renderDocRow('receipt_long', 'Cancelled Bank Cheque / Mandate (Gram Nidhi)', 'SHA256: 991a...fe04 • 840 KB • 2024-10-24', 'Review Flag: Seal Bleed', 'saffron-accent', true)}
              </div>
            </div>
          </div>

          <!-- Right: Decision Console (5 cols) -->
          <div class="lg:col-span-5 flex flex-col gap-space-lg">
            <div class="bg-surface-subtle p-space-lg rounded-xl shadow-sm flex flex-col gap-space-md sticky top-24">
              <div class="flex items-center justify-between">
                <span class="font-headline-sm text-headline-sm text-ashoka-blue flex items-center gap-2"><span class="material-symbols-outlined text-[20px]">gavel</span>Status-Gated Decision Console</span>
                <span class="font-label-sm text-label-sm bg-status-review-bg text-status-review-text px-2 py-0.5 rounded-full uppercase font-bold">Active Session</span>
              </div>
              <p class="font-body-sm text-body-sm text-text-secondary">Execute statutory workflow actions based on validation rules. Actions are committed directly to the cryptographic audit trail.</p>
              <!-- Self-Assignment Guard (disabled) -->
              <div class="p-space-md bg-surface-muted/60 rounded-lg flex flex-col gap-1.5 opacity-80">
                <div class="flex items-center justify-between">
                  <span class="font-label-md text-label-md text-text-muted font-semibold">Self-Assignment Guard</span>
                  <span class="material-symbols-outlined text-text-muted text-[16px]">lock</span>
                </div>
                <button class="w-full py-2 px-space-md rounded bg-surface-muted text-text-muted font-label-md text-label-md cursor-not-allowed flex items-center justify-center gap-2" disabled>
                  <span class="material-symbols-outlined text-[18px]">person_check</span><span>Assign to Self</span>
                </button>
                <span class="font-body-sm text-[11px] text-text-muted italic">* Enabled only when status is SUBMITTED. Current status: UNDER_REVIEW (Assigned to you).</span>
              </div>
              <!-- Remarks -->
              <div class="flex flex-col gap-1">
                <label class="font-label-md text-label-md text-text-primary flex items-center justify-between" for="reviewerRemarks">
                  <span>Reviewer Statutory Remarks <span class="text-saffron-accent">*</span></span>
                  <span class="text-text-muted font-normal text-[11px]">Audit Recorded</span>
                </label>
                <textarea class="w-full p-2.5 bg-surface-crisp rounded-lg font-body-md text-body-md text-text-primary focus:outline-none placeholder:text-text-muted shadow-sm" id="reviewerRemarks" placeholder="Add explicit feedback, deficiency details, or statutory clearance justifications..." rows="3">All legal resolutions cross-checked with State PRI gazette. Bank seal on Mandate has minor blur but IFSC (SBIN0001290) and Account Name are completely verified against PFMS.</textarea>
              </div>
              <!-- Reject Warning (hidden) -->
              <div class="p-space-md bg-error-container/40 rounded-lg hidden flex-col gap-2" id="rejectWarningBox">
                <div class="flex items-center gap-2 text-error font-semibold text-label-md">
                  <span class="material-symbols-outlined text-[18px]">error</span><span>Permanent Statutory Rejection</span>
                </div>
                <p class="font-body-sm text-body-sm text-text-primary">Rejections are permanent. Provide a clear reason for the submitter.</p>
              </div>
              <!-- Action Buttons -->
              <div class="flex flex-col gap-space-sm pt-space-xs">
                <button class="w-full py-2.5 px-space-md rounded bg-ashoka-blue text-on-primary hover:bg-institutional-navy transition-all font-label-md text-label-md flex items-center justify-center gap-2 shadow-sm font-semibold" onclick="window.regPage.approveKYC()">
                  <span class="material-symbols-outlined text-[18px]">check_circle</span><span>Approve KYC (Creates SourceAccount)</span>
                </button>
                <div class="grid grid-cols-2 gap-space-sm">
                  <button class="py-2.5 px-space-md rounded bg-status-action-bg text-status-action-text hover:bg-status-action-border/40 transition-all font-label-md text-label-md flex items-center justify-center gap-1.5 font-semibold" onclick="window.regPage.requestAction()">
                    <span class="material-symbols-outlined text-[18px]">published_with_changes</span><span>Request Action</span>
                  </button>
                  <button class="py-2.5 px-space-md rounded bg-surface-crisp text-error hover:bg-error-container/30 transition-all font-label-md text-label-md flex items-center justify-center gap-1.5 font-semibold shadow-sm" id="btnReject" onclick="window.regPage.toggleReject()">
                    <span class="material-symbols-outlined text-[18px]">cancel</span><span id="rejectBtnText">Reject KYC</span>
                  </button>
                </div>
              </div>
              <!-- Lifecycle Timeline -->
              <div class="pt-space-md space-y-space-sm">
                <span class="font-label-sm text-label-sm text-text-muted uppercase tracking-wider block">Lifecycle Progression</span>
                <div class="space-y-space-md relative pl-4 before:absolute before:left-1 before:top-2 before:bottom-2 before:w-0.5 before:bg-border-hairline">
                  <div class="relative flex flex-col gap-0.5">
                    <span class="w-2.5 h-2.5 rounded-full bg-status-review-text absolute -left-[17px] top-1"></span>
                    <div class="flex items-center justify-between"><span class="font-label-md text-label-md text-text-primary font-semibold">Claimed &amp; Review Started</span><span class="font-mono-code text-[11px] text-text-muted">Today, 09:30</span></div>
                    <p class="font-body-sm text-body-sm text-text-secondary">Assigned to Superuser Root from unassigned queue pool.</p>
                  </div>
                  <div class="relative flex flex-col gap-0.5">
                    <span class="w-2.5 h-2.5 rounded-full bg-status-submitted-text absolute -left-[17px] top-1"></span>
                    <div class="flex items-center justify-between"><span class="font-label-md text-label-md text-text-primary font-semibold">Submission Ingested</span><span class="font-mono-code text-[11px] text-text-muted">Today, 09:14</span></div>
                    <p class="font-body-sm text-body-sm text-text-secondary">Submitter uploaded 4 documents via Digilocker Gateway.</p>
                  </div>
                  <div class="relative flex flex-col gap-0.5">
                    <span class="w-2.5 h-2.5 rounded-full bg-text-muted absolute -left-[17px] top-1"></span>
                    <div class="flex items-center justify-between"><span class="font-label-md text-label-md text-text-muted font-semibold">Draft Initialized</span><span class="font-mono-code text-[11px] text-text-muted">2024-10-23 18:22</span></div>
                    <p class="font-body-sm text-body-sm text-text-muted">Created by sarpanch@khadursahib.gov.in via OTP auth.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>`;
}

function renderDocRow(icon, title, meta, badge, badgeColor, isWarning) {
  const iconBg = isWarning ? 'bg-status-action-bg text-saffron-accent' : 'bg-status-submitted-bg text-institutional-navy';
  const badgeBg = isWarning ? `bg-status-action-bg text-saffron-accent` : `bg-gov-emerald/10 text-gov-emerald`;
  return `
    <div class="p-space-md bg-surface-crisp rounded-lg shadow-sm flex items-center justify-between">
      <div class="flex items-center gap-space-md">
        <div class="w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center font-bold"><span class="material-symbols-outlined text-[22px]">${icon}</span></div>
        <div>
          <p class="font-label-md text-label-md text-text-primary">${title}</p>
          <p class="font-mono-code text-body-sm text-text-muted">${meta}</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <span class="px-2 py-0.5 rounded ${badgeBg} font-label-sm text-label-sm">${badge}</span>
        <button class="p-1.5 rounded hover:bg-surface-muted text-text-secondary transition-colors" title="Preview Document"><span class="material-symbols-outlined text-[20px]">open_in_new</span></button>
      </div>
    </div>`;
}

let rejectArmed = false;

window.regPage = {
  approveKYC() {
    showToast('Verification success: Application Approved! Ledger SourceAccount established.', 'success');
  },
  toggleReject() {
    const box = document.getElementById('rejectWarningBox');
    const btnText = document.getElementById('rejectBtnText');
    const btn = document.getElementById('btnReject');
    const remarks = document.getElementById('reviewerRemarks');

    if (!rejectArmed) {
      rejectArmed = true;
      if (box) { box.classList.remove('hidden'); box.classList.add('flex'); }
      if (btn) { btn.classList.add('bg-error', 'text-on-error'); btn.classList.remove('bg-surface-crisp', 'text-error'); }
      if (btnText) btnText.textContent = 'Confirm Rejection';
      if (remarks) remarks.focus();
    } else {
      if (!remarks?.value?.trim()) {
        showToast('A clear rejection reason is strictly mandatory in Reviewer Remarks.', 'error');
        remarks?.focus();
        return;
      }
      showToast('Application PRI-KYC-2024-88912 marked REJECTED permanently. Submitter notified.', 'error');
      rejectArmed = false;
      if (box) { box.classList.add('hidden'); box.classList.remove('flex'); }
      if (btn) { btn.classList.remove('bg-error', 'text-on-error'); btn.classList.add('bg-surface-crisp', 'text-error'); }
      if (btnText) btnText.textContent = 'Reject KYC';
    }
  },
  requestAction() {
    const remarks = document.getElementById('reviewerRemarks');
    if (!remarks?.value?.trim()) {
      showToast('Remarks are mandatory when sending application to ACTION_REQUIRED status.', 'warning');
      remarks?.focus();
      return;
    }
    showToast('Status updated to ACTION_REQUIRED. Submitter notified with reviewer checklist remarks.', 'warning');
  },
};

registerPage('registrations', render);
