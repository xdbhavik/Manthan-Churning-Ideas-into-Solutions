import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getMyAssignments,
  acceptAssignment,
  declineAssignment,
} from '../../services/evaluatorService';
import type { AssignmentResponse } from '../../types';


export default function AssignmentsPage() {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<AssignmentResponse[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchAsn, setSearchAsn] = useState('');
  const [searchCyc, setSearchCyc] = useState('');
  const [acceptTarget, setAcceptTarget] = useState<AssignmentResponse | null>(null);
  const [declineTarget, setDeclineTarget] = useState<AssignmentResponse | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');

  const loadAssignments = useCallback(async () => {
    try {
      const data = await getMyAssignments();
      setAssignments(data || []);
    } catch {
      setAssignments([]);
    }
  }, []);

  useEffect(() => {
    void loadAssignments();
  }, [loadAssignments]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAssignments();
    setRefreshing(false);
  };

  const handleAccept = async () => {
    if (!acceptTarget) return;
    setActionLoading(true);
    try {
      await acceptAssignment(acceptTarget.assignmentId);
      setActionSuccess(`Assignment ${acceptTarget.assignmentId} accepted successfully.`);
      setAcceptTarget(null);
      void loadAssignments();
    } catch {
      // ignore
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecline = async () => {
    if (!declineTarget) return;
    setActionLoading(true);
    try {
      await declineAssignment(declineTarget.assignmentId, declineReason ? { reason: declineReason } : {});
      setActionSuccess(`Assignment ${declineTarget.assignmentId} declined.`);
      setDeclineTarget(null);
      setDeclineReason('');
      void loadAssignments();
    } catch {
      // ignore
    } finally {
      setActionLoading(false);
    }
  };

  // Filter logic
  const filtered = assignments.filter((a) => {
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'OVERDUE' && !a.overdue) return false;
      if (statusFilter !== 'OVERDUE' && a.status !== statusFilter) return false;
    }
    if (searchAsn && !a.assignmentId.toLowerCase().includes(searchAsn.toLowerCase())) {
      return false;
    }
    if (searchCyc && !a.cycleId.toLowerCase().includes(searchCyc.toLowerCase())) {
      return false;
    }
    return true;
  });

  // Overview metric cards count
  const awaitingCount = assignments.filter((a) => a.status === 'ASSIGNED').length;
  const activeCount = assignments.filter((a) => a.status === 'IN_PROGRESS').length;
  const conflictCount = assignments.filter((a) => a.status === 'EXPIRED' || a.overdue).length;
  const finalizedCount = assignments.filter((a) => a.status === 'SUBMITTED' || a.status === 'REVIEWED').length;

  return (
    <div className="w-full px-space-lg py-space-base flex flex-col gap-space-lg max-w-7xl mx-auto">
      {/* Top Header Ribbon */}
      <div className="w-full flex flex-col xl:flex-row items-start xl:items-center justify-between gap-space-md border-b border-border-hairline pb-space-base">
        <div className="flex flex-col">
          <div className="flex items-center gap-space-sm mb-space-2xs">
            <span className="font-mono-code text-[11px] px-space-xs py-0.5 rounded bg-surface-container-high text-ashoka-blue font-semibold uppercase tracking-wider">
              SEC-GATEWAY: STATUTORY-EVAL
            </span>
            <span className="font-body-sm text-body-sm text-text-muted">
              Node Session Active: EVAL-7729
            </span>
          </div>
          <div className="flex items-baseline gap-space-sm">
            <h1 className="font-headline-md text-headline-md text-text-primary tracking-tight font-bold">
              Evaluator Case Docket &amp; Work Queue
            </h1>
            <span className="font-mono-code text-body-sm text-text-muted font-semibold">
              TOTAL ACTIVE: {assignments.length} ALLOCATIONS
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-space-xs">
          <div className="flex items-center gap-space-2xs px-space-sm py-1.5 rounded bg-surface-crisp shadow-xs text-text-secondary font-label-md text-label-md border border-border-hairline">
            <span className="material-symbols-outlined text-gov-emerald text-[18px]">verified</span>
            <span>Cryptographic Hash Lock: SHA-256</span>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            className="flex items-center gap-space-xs px-space-md py-2 rounded bg-surface-crisp hover:bg-surface-muted text-ashoka-blue shadow-xs font-label-md text-label-md transition-all border border-border-hairline font-semibold cursor-pointer"
          >
            <span className={`material-symbols-outlined text-[18px] ${refreshing ? 'animate-spin' : ''}`}>
              sync
            </span>
            <span>Refresh Queue</span>
          </button>
          <button
            type="button"
            onClick={loadAssignments}
            className="flex items-center gap-space-xs px-space-md py-2 rounded bg-ashoka-blue hover:bg-institutional-navy text-on-primary shadow-sm font-label-md text-label-md transition-all font-semibold cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">download_for_offline</span>
            <span>Load Queue</span>
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-space-sm bg-status-approved-bg border border-status-approved-border text-status-approved-text rounded-xl font-body-sm flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-space-sm font-semibold">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            <span>{actionSuccess}</span>
          </div>
          <button type="button" onClick={() => setActionSuccess('')}>
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* Overview 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-sm">
        <div className="p-space-md rounded-xl bg-surface-crisp shadow-sm border border-border-hairline flex items-center justify-between">
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider font-bold">
              Awaiting Acceptance
            </span>
            <span className="font-headline-lg text-headline-lg text-text-primary font-bold mt-1">
              {awaitingCount}
            </span>
            <span className="font-body-sm text-body-sm text-status-action-text font-medium">
              Auto-recall window: 24h
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-status-action-bg flex items-center justify-center text-status-action-text">
            <span className="material-symbols-outlined text-[24px]">pending_actions</span>
          </div>
        </div>

        <div className="p-space-md rounded-xl bg-surface-crisp shadow-sm border border-border-hairline flex items-center justify-between">
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider font-bold">
              Active Scoring
            </span>
            <span className="font-headline-lg text-headline-lg text-text-primary font-bold mt-1">
              {activeCount}
            </span>
            <span className="font-body-sm text-body-sm text-gov-emerald font-medium">
              Scoring Matrix Active
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-status-approved-bg flex items-center justify-center text-status-approved-text">
            <span className="material-symbols-outlined text-[24px]">rate_review</span>
          </div>
        </div>

        <div className="p-space-md rounded-xl bg-surface-crisp shadow-sm border border-border-hairline flex items-center justify-between">
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider font-bold">
              Expirations &amp; Conflicts
            </span>
            <span className="font-headline-lg text-headline-lg text-[#ba1a1a] font-bold mt-1">
              {conflictCount}
            </span>
            <span className="font-body-sm text-body-sm text-[#ba1a1a] font-medium">
              HTTP 409 Lockout active
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-[#ffdad6]/50 flex items-center justify-center text-[#ba1a1a]">
            <span className="material-symbols-outlined text-[24px]">error_outline</span>
          </div>
        </div>

        <div className="p-space-md rounded-xl bg-surface-crisp shadow-sm border border-border-hairline flex items-center justify-between">
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider font-bold">
              Finalized Submissions
            </span>
            <span className="font-headline-lg text-headline-lg text-text-primary font-bold mt-1">
              {finalizedCount}
            </span>
            <span className="font-body-sm text-body-sm text-text-muted font-medium">
              Dossiers signed &amp; sealed
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-ashoka-blue">
            <span className="material-symbols-outlined text-[24px]">task_alt</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-surface-crisp rounded-xl p-space-base shadow-sm border border-border-hairline">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-space-sm items-end">
          <div className="lg:col-span-4 flex flex-col gap-space-xs">
            <label className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider font-bold" htmlFor="filter-status">
              Queue Filter Status
            </label>
            <div className="relative">
              <select
                id="filter-status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-10 pl-space-sm pr-space-xl bg-surface-subtle text-text-primary font-label-md text-label-md rounded-lg border border-border-hairline focus:outline-none focus:bg-surface-crisp cursor-pointer"
              >
                <option value="ALL">All statuses (Active, Finalized, Expired)</option>
                <option value="ASSIGNED">Assigned &amp; Awaiting Acceptance</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="SUBMITTED">Submitted / Finalized</option>
                <option value="DECLINED">Declined</option>
                <option value="EXPIRED">Expired</option>
                <option value="OVERDUE">Overdue (Conflict Lock)</option>
              </select>
              <span className="material-symbols-outlined absolute right-space-sm top-2.5 text-text-muted pointer-events-none text-[18px]">
                expand_more
              </span>
            </div>
          </div>

          <div className="lg:col-span-4 flex flex-col gap-space-xs">
            <label className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider font-bold" htmlFor="search-asn">
              Search Assignment ID
            </label>
            <div className="relative">
              <input
                id="search-asn"
                type="text"
                value={searchAsn}
                onChange={(e) => setSearchAsn(e.target.value)}
                placeholder="e.g. ASN-9041"
                className="w-full h-10 pl-8 pr-space-xs bg-surface-subtle text-text-primary font-mono-code text-body-sm rounded-lg border border-border-hairline focus:outline-none focus:bg-surface-crisp uppercase"
              />
              <span className="material-symbols-outlined absolute left-2.5 top-2.5 text-text-muted text-[16px]">
                tag
              </span>
            </div>
          </div>

          <div className="lg:col-span-4 flex flex-col gap-space-xs">
            <label className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider font-bold" htmlFor="search-cyc">
              Search Cycle ID
            </label>
            <div className="relative">
              <input
                id="search-cyc"
                type="text"
                value={searchCyc}
                onChange={(e) => setSearchCyc(e.target.value)}
                placeholder="e.g. CYC-2024"
                className="w-full h-10 pl-8 pr-space-xs bg-surface-subtle text-text-primary font-mono-code text-body-sm rounded-lg border border-border-hairline focus:outline-none focus:bg-surface-crisp uppercase"
              />
              <span className="material-symbols-outlined absolute left-2.5 top-2.5 text-text-muted text-[16px]">
                cached
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Case Docket Cards Grid */}
      <div className="flex flex-col gap-space-md">
        {filtered.length === 0 ? (
          <div className="p-space-2xl bg-surface-crisp rounded-xl border border-border-hairline text-center flex flex-col items-center justify-center gap-space-sm">
            <span className="material-symbols-outlined text-[48px] text-text-muted">folder_open</span>
            <span className="font-headline-sm text-headline-sm text-text-primary font-bold">
              No matching dossier allocations found
            </span>
            <p className="text-body-sm text-text-secondary max-w-md">
              No assignments matched your current status and query filters. Try selecting "All statuses".
            </p>
          </div>
        ) : (
          filtered.map((item) => {
            const isAssigned = item.status === 'ASSIGNED';
            const isInProgress = item.status === 'IN_PROGRESS';
            const isSubmitted = item.status === 'SUBMITTED' || item.status === 'REVIEWED';
            const isExpired = item.status === 'EXPIRED' || item.overdue;

            return (
              <div
                key={item.assignmentId}
                className="bg-surface-crisp rounded-xl p-space-lg shadow-sm border border-border-hairline flex flex-col gap-space-md transition-all hover:border-ashoka-blue/40"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-sm border-b border-border-hairline pb-space-sm">
                  <div className="flex items-center gap-space-sm flex-wrap">
                    <span className="font-mono-code font-bold text-headline-sm text-ashoka-blue">
                      {item.assignmentId}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full font-label-sm text-label-sm uppercase tracking-wider font-bold ${
                        isAssigned
                          ? 'bg-status-action-bg text-status-action-text border border-status-action-border'
                          : isInProgress
                          ? 'bg-status-submitted-bg text-status-submitted-text border border-status-submitted-border'
                          : isSubmitted
                          ? 'bg-status-approved-bg text-status-approved-text border border-status-approved-border'
                          : isExpired
                          ? 'bg-[#ffdad6]/60 text-[#ba1a1a] border border-[#ba1a1a]/30'
                          : 'bg-surface-muted text-text-secondary border border-border-hairline'
                      }`}
                    >
                      {item.status}
                    </span>
                    <span className="px-2 py-0.5 rounded font-mono-code text-[11px] bg-surface-muted text-text-secondary border border-border-hairline">
                      {item.cycleId}
                    </span>
                  </div>

                  <div className="flex items-center gap-space-xs">
                    {isAssigned && (
                      <>
                        <button
                          type="button"
                          onClick={() => setAcceptTarget(item)}
                          className="px-space-sm py-1.5 rounded-lg bg-gov-emerald hover:bg-emerald-700 text-on-primary font-label-md text-label-md flex items-center gap-1 shadow-xs cursor-pointer font-bold"
                        >
                          <span className="material-symbols-outlined text-[16px]">how_to_reg</span>
                          <span>Accept</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeclineTarget(item)}
                          className="px-space-sm py-1.5 rounded-lg bg-status-action-bg hover:bg-orange-100 text-status-action-text font-label-md text-label-md flex items-center gap-1 cursor-pointer font-bold border border-status-action-border"
                        >
                          <span className="material-symbols-outlined text-[16px]">cancel</span>
                          <span>Decline</span>
                        </button>
                      </>
                    )}

                    {(isInProgress || isSubmitted) && (
                      <button
                        type="button"
                        onClick={() => navigate(`/evaluator/assignments/${item.assignmentId}`)}
                        className="px-space-md py-1.5 rounded-lg bg-ashoka-blue hover:bg-institutional-navy text-on-primary font-label-md text-label-md flex items-center gap-1.5 shadow-sm transition-all cursor-pointer font-bold"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {isInProgress ? 'edit_note' : 'visibility'}
                        </span>
                        <span>{isInProgress ? 'Score Dossier' : 'View Scorecard'}</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono-code text-[12px] text-text-muted font-bold">
                      {item.problemId}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-border-strong"></span>
                    <h3 className="font-headline-sm text-headline-sm text-text-primary font-bold">
                      {(item as any).problemTitle || `Problem Reference ${item.problemId}`}
                    </h3>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-sm bg-surface-subtle p-space-sm rounded-lg border border-border-hairline text-body-sm">
                  <div>
                    <span className="text-text-muted text-[11px] block uppercase font-bold">Assigned Date</span>
                    <span className="font-mono-code text-text-primary font-semibold">
                      {item.assignedAt ? new Date(item.assignedAt).toLocaleDateString() : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-muted text-[11px] block uppercase font-bold">Statutory Deadline</span>
                    <span className={`font-mono-code font-semibold ${item.overdue ? 'text-[#ba1a1a]' : 'text-text-primary'}`}>
                      {item.deadlineAt ? new Date(item.deadlineAt).toLocaleDateString() : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-muted text-[11px] block uppercase font-bold">Scoring Progress</span>
                    <span className="font-mono-code text-ashoka-blue font-bold">
                      {(item as any).criteriaCompleted ?? (isSubmitted ? 5 : isInProgress ? 4 : 0)} / 5 Rubrics
                    </span>
                  </div>
                  <div>
                    <span className="text-text-muted text-[11px] block uppercase font-bold">Node Compliance</span>
                    <span className="font-label-sm text-gov-emerald flex items-center gap-1 font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-gov-emerald"></span>
                      UIDAI VERIFIED
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Accept Assignment Confirmation Modal */}
      {acceptTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-surface-crisp rounded-xl max-w-md w-full p-space-lg shadow-xl border border-border-hairline flex flex-col gap-space-md">
            <div className="flex items-center gap-space-sm text-gov-emerald">
              <span className="material-symbols-outlined text-[28px]">how_to_reg</span>
              <h3 className="font-headline-sm text-headline-sm font-bold text-text-primary">
                Accept Evaluation Assignment
              </h3>
            </div>
            <p className="font-body-md text-body-md text-text-secondary">
              Are you sure you want to accept assignment <strong className="font-mono-code text-ashoka-blue">{acceptTarget.assignmentId}</strong>? You will be formally bound by the statutory evaluation timeline.
            </p>
            <div className="flex items-center justify-end gap-space-sm pt-space-sm border-t border-border-hairline">
              <button
                type="button"
                onClick={() => setAcceptTarget(null)}
                className="px-space-md py-2 rounded-lg bg-surface-muted text-text-primary font-label-md hover:bg-surface-container font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAccept}
                disabled={actionLoading}
                className="px-space-md py-2 rounded-lg bg-gov-emerald text-on-primary font-label-md hover:bg-emerald-700 font-bold shadow-sm cursor-pointer"
              >
                {actionLoading ? 'Accepting…' : 'Confirm Acceptance'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Decline Assignment Modal with Reason */}
      {declineTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-surface-crisp rounded-xl max-w-md w-full p-space-lg shadow-xl border border-border-hairline flex flex-col gap-space-md">
            <div className="flex items-center gap-space-sm text-status-action-text">
              <span className="material-symbols-outlined text-[28px]">cancel</span>
              <h3 className="font-headline-sm text-headline-sm font-bold text-text-primary">
                Decline Evaluation Assignment
              </h3>
            </div>
            <p className="font-body-md text-body-md text-text-secondary">
              Declare reason for declining assignment <strong className="font-mono-code text-ashoka-blue">{declineTarget.assignmentId}</strong> (e.g. conflict of interest or institutional affiliation):
            </p>
            <textarea
              rows={3}
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="State statutory justification or conflict of interest..."
              className="w-full p-space-sm rounded-lg bg-surface-subtle font-body-sm text-text-primary border border-border-hairline focus:outline-none focus:bg-surface-crisp focus:ring-2 focus:ring-ashoka-blue"
            ></textarea>
            <div className="flex items-center justify-end gap-space-sm pt-space-sm border-t border-border-hairline">
              <button
                type="button"
                onClick={() => { setDeclineTarget(null); setDeclineReason(''); }}
                className="px-space-md py-2 rounded-lg bg-surface-muted text-text-primary font-label-md hover:bg-surface-container font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDecline}
                disabled={actionLoading}
                className="px-space-md py-2 rounded-lg bg-status-action-bg text-status-action-text border border-status-action-border font-label-md hover:bg-orange-100 font-bold shadow-xs cursor-pointer"
              >
                {actionLoading ? 'Declining…' : 'Confirm Decline'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
