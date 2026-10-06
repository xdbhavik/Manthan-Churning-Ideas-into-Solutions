import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getMyAssignments,
  acceptAssignment,
  rejectAssignment,
} from '../../services/evaluatorService';
import type { AssignmentResponse } from '../../types';
import { getProblem, getProblemEvidence } from '../../services/problemService';
import { getAssignment } from '../../services/evaluatorService';
import type { ProblemEvidenceResponse, ProblemResponse } from '../../types';

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
  const [queueError, setQueueError] = useState('');
  const [viewTarget, setViewTarget] = useState<AssignmentResponse | null>(null);
  const [viewProblem, setViewProblem] = useState<ProblemResponse | null>(null);
  const [viewContext, setViewContext] = useState<Awaited<ReturnType<typeof getAssignment>>['problem']>(null);
  const [viewEvidence, setViewEvidence] = useState<ProblemEvidenceResponse[]>([]);
  const [evidenceError, setEvidenceError] = useState('');
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState('');

  const handleViewProblem = async (item: AssignmentResponse) => {
    setViewTarget(item);
    setViewProblem(null);
    setViewContext(null);
    setViewEvidence([]);
    setEvidenceError('');
    setViewError('');
    setViewLoading(true);
    try {
      const [problem, detail] = await Promise.all([
        getProblem(item.problemId),
        getAssignment(item.assignmentId),
      ]);
      if (!detail.problem) throw new Error('Full problem context is unavailable');
      setViewProblem(problem);
      setViewContext(detail.problem);
      try {
        setViewEvidence(await getProblemEvidence(item.problemId));
      } catch {
        setEvidenceError('Evidence records could not be loaded. The remaining problem details are available below.');
      }
    } catch {
      setViewError('Problem statement could not be loaded. Please retry before making a decision.');
    } finally {
      setViewLoading(false);
    }
  };

  const loadAssignments = useCallback(async () => {
    try {
      const data = await getMyAssignments();
      setAssignments(data || []);
      setQueueError('');
    } catch (error) {
      setAssignments([]);
      setQueueError('Could not load the live evaluator queue. Please try again.');
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
      setActionSuccess(`Assignment ${acceptTarget.assignmentId} accepted. The cycle completes after every evaluator pool accepts.`);
      setAcceptTarget(null);
      void loadAssignments();
    } catch {
      setQueueError('Accept failed. The assignment was not changed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecline = async () => {
    if (!declineTarget) return;
    setActionLoading(true);
    try {
      await rejectAssignment(declineTarget.assignmentId, declineReason ? { reason: declineReason } : {});
      setActionSuccess(`Problem for assignment ${declineTarget.assignmentId} rejected.`);
      setDeclineTarget(null);
      setDeclineReason('');
      void loadAssignments();
    } catch {
      setQueueError('Reject failed. The problem and assignment were not changed.');
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
  const awaitingCount = assignments.filter((a) => a.status === 'ASSIGNED'
    || (a.directGovernmentDecision && a.status === 'IN_PROGRESS')).length;
  const activeCount = assignments.filter((a) => a.status === 'IN_PROGRESS'
    && !a.directGovernmentDecision).length;
  const conflictCount = assignments.filter((a) => a.status === 'EXPIRED' || a.overdue).length;
  const finalizedCount = assignments.filter((a) => a.status === 'ACCEPTED' || a.status === 'SUBMITTED' || a.status === 'REVIEWED' || a.status === 'REJECTED').length;
  const canDecideViewed = !!viewTarget
    && (viewTarget.status === 'ASSIGNED' || viewTarget.status === 'IN_PROGRESS')
    && !!viewTarget.directGovernmentDecision;

  return (
    <div className="w-full px-space-lg py-space-base flex flex-col gap-space-lg max-w-7xl mx-auto">
      {/* Top Header Ribbon */}
      <div className="w-full flex flex-col xl:flex-row items-start xl:items-center justify-between gap-space-md border-b border-border-hairline pb-space-base">
        <div className="flex flex-col">
          <div className="flex items-center gap-space-sm mb-space-2xs">
            <span className="font-mono-code text-[11px] px-space-xs py-0.5 rounded bg-surface-container-high text-ashoka-blue font-semibold uppercase tracking-wider">
              EVALUATOR WORK QUEUE
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
      {queueError && (
        <div className="p-space-sm bg-[#ffdad6]/60 border border-[#ba1a1a]/30 text-[#ba1a1a] rounded-xl font-body-sm flex items-center justify-between">
          <span>{queueError}</span>
          <button type="button" onClick={() => setQueueError('')}>Dismiss</button>
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
                <option value="ACCEPTED">Accepted</option>
                <option value="SUBMITTED">Submitted / Finalized</option>
                <option value="DECLINED">Declined</option>
                <option value="REJECTED">Rejected</option>
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
            const isAccepted = item.status === 'ACCEPTED';
            const isExpired = item.status === 'EXPIRED' || item.overdue;
            const canAccept = (isAssigned || isInProgress) && item.directGovernmentDecision;
            const canRejectProblem = canAccept;

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
                          : isAccepted
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
                    {canAccept && (
                      <>
                        <button
                          type="button"
                          onClick={() => void handleViewProblem(item)}
                          className="px-space-sm py-1.5 rounded-lg bg-ashoka-blue hover:bg-institutional-navy text-on-primary font-label-md text-label-md flex items-center gap-1 shadow-xs cursor-pointer font-bold"
                        >
                          <span className="material-symbols-outlined text-[16px]">visibility</span>
                          <span>View Statement</span>
                        </button>
                        {canRejectProblem && (
                          <button
                            type="button"
                            onClick={() => setDeclineTarget(item)}
                            className="px-space-sm py-1.5 rounded-lg bg-status-action-bg hover:bg-orange-100 text-status-action-text font-label-md text-label-md flex items-center gap-1 cursor-pointer font-bold border border-status-action-border"
                          >
                            <span className="material-symbols-outlined text-[16px]">cancel</span>
                            <span>Reject Problem</span>
                          </button>
                        )}
                      </>
                    )}

                    {isSubmitted && (
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
                    <span className="text-text-muted text-[11px] block uppercase font-bold">Pool Decision</span>
                    <span className="font-mono-code text-ashoka-blue font-bold">
                      {isAccepted ? 'Accepted' : item.status === 'REJECTED' ? 'Rejected' : 'Awaiting decision'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Problem statement review dialog; acceptance is available after the statement loads. */}
      {viewTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs" role="dialog" aria-modal="true" aria-labelledby="problem-view-title">
          <div className="bg-surface-crisp rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-xl border border-border-hairline flex flex-col">
            <div className="p-space-lg border-b border-border-hairline flex items-start justify-between gap-space-md">
              <div>
                <p className="font-mono-code text-[11px] text-text-muted uppercase tracking-wider">Problem statement · {viewTarget.problemId}</p>
                <h2 id="problem-view-title" className="font-headline-lg text-headline-lg text-text-primary font-bold mt-1">{viewContext?.title || viewProblem?.title || 'Review assigned problem'}</h2>
              </div>
              <button type="button" aria-label="Close problem statement" onClick={() => setViewTarget(null)} className="p-2 rounded-lg hover:bg-surface-muted text-text-secondary">✕</button>
            </div>
            <div className="p-space-lg overflow-y-auto flex flex-col gap-space-md">
              {viewLoading && <p className="text-text-secondary">Loading the full problem statement…</p>}
              {viewError && <div className="p-space-md rounded-lg bg-status-action-bg border border-status-action-border text-status-action-text" role="alert">{viewError}<button type="button" onClick={() => void handleViewProblem(viewTarget)} className="ml-3 underline font-semibold">Retry</button></div>}
              {viewProblem && viewContext && <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-space-sm">
                  {[['Problem ID', viewProblem.problemId], ['Status', viewContext.status], ['Source bucket', viewContext.sourceBucket], ['Sub-entity type', viewContext.subEntityType], ['Urgency', viewContext.urgency], ['Severity', viewContext.severity], ['Affected population', viewContext.affectedPopulation?.toLocaleString()], ['Evidence files', String(viewContext.evidenceCount)]].map(([label, value]) => <div key={label} className="rounded-lg bg-surface-subtle border border-border-hairline p-space-sm"><span className="block text-[11px] text-text-muted uppercase font-bold">{label}</span><span className="font-semibold text-text-primary break-words">{value || '—'}</span></div>)}
                </div>
                <section><h3 className="font-headline-sm text-text-primary font-bold mb-1">Problem statement</h3><p className="text-body-md text-text-secondary whitespace-pre-wrap leading-relaxed">{viewContext.description || 'No description provided.'}</p></section>
                <section><h3 className="font-headline-sm text-text-primary font-bold mb-1">Expected outcome</h3><p className="text-body-md text-text-secondary whitespace-pre-wrap">{viewContext.expectedOutcome || 'Not provided'}</p></section>
                <section><h3 className="font-headline-sm text-text-primary font-bold mb-1">Existing intervention</h3><p className="text-body-md text-text-secondary whitespace-pre-wrap">{viewContext.existingIntervention || 'Not provided'}</p></section>
                <div className="grid md:grid-cols-2 gap-space-md">
                  <section><h3 className="font-headline-sm text-text-primary font-bold mb-1">Location</h3><p className="text-body-md text-text-secondary">{viewContext.location || 'Not specified'}{viewProblem.locationId ? ` · Location ID: ${viewProblem.locationId}` : ''}</p></section>
                  <section><h3 className="font-headline-sm text-text-primary font-bold mb-1">Domains</h3><div className="flex flex-wrap gap-2">{viewContext.domains?.length ? viewContext.domains.map((domain) => <span key={domain} className="px-2.5 py-1 rounded-full bg-surface-muted text-text-secondary text-sm">{domain}</span>) : <span className="text-body-sm text-text-secondary">Not assigned</span>}</div></section>
                </div>
                <section className="rounded-lg border border-border-hairline p-space-md"><h3 className="font-headline-sm text-text-primary font-bold mb-2">Access & submission record</h3><dl className="grid sm:grid-cols-2 gap-x-space-lg gap-y-space-sm text-sm">{[['Access rule', viewContext.accessRule], ['Eligible universities', viewContext.accessUniversities?.join(', ') || 'All / not restricted'], ['Source ID', viewProblem.sourceId], ['Source account ID', viewProblem.sourceAccountId], ['Submitted by user ID', viewProblem.submittedByUserId], ['Submitted at', viewProblem.submittedAt ? new Date(viewProblem.submittedAt).toLocaleString() : null], ['Last updated', viewProblem.updatedAt ? new Date(viewProblem.updatedAt).toLocaleString() : null], ['Record version', viewProblem.version]].map(([label, value]) => <div key={label}><dt className="text-text-muted">{label}</dt><dd className="font-medium text-text-primary break-all">{value || '—'}</dd></div>)}</dl></section>
                {viewProblem.metadata && Object.keys(viewProblem.metadata).length > 0 && <section className="rounded-lg border border-border-hairline p-space-md"><h3 className="font-headline-sm text-text-primary font-bold mb-2">Additional submitted information</h3><pre className="text-xs whitespace-pre-wrap break-words text-text-secondary">{JSON.stringify(viewProblem.metadata, null, 2)}</pre></section>}
                <section><div className="flex items-center justify-between gap-2"><h3 className="font-headline-sm text-text-primary font-bold">Supporting evidence</h3><span className="text-xs text-text-muted">{viewEvidence.length} record(s)</span></div>{evidenceError && <p className="mt-2 text-sm text-status-action-text">{evidenceError} <button type="button" onClick={() => void handleViewProblem(viewTarget)} className="underline font-semibold">Retry full dossier load</button></p>}{viewEvidence.length > 0 && <div className="mt-2 flex flex-col gap-2">{viewEvidence.map((evidence) => <article key={evidence.evidenceId} className="rounded-lg bg-surface-subtle border border-border-hairline p-space-sm"><div className="flex flex-wrap justify-between gap-2"><strong className="text-text-primary">{evidence.evidenceType}</strong>{evidence.capturedAt && <time className="text-xs text-text-muted">Captured {new Date(evidence.capturedAt).toLocaleString()}</time>}</div><p className="mt-1 text-xs text-text-secondary break-all">Evidence ID: {evidence.evidenceId}</p><p className="mt-1 text-xs text-text-secondary break-all">SHA-256: {evidence.fileHash}</p>{evidence.metadata && <pre className="mt-2 text-xs whitespace-pre-wrap break-words text-text-secondary">{JSON.stringify(evidence.metadata, null, 2)}</pre>}<a href={evidence.fileUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-ashoka-blue underline">Open evidence file</a></article>)}</div>}{!evidenceError && viewEvidence.length === 0 && <p className="mt-2 text-sm text-text-secondary">No supporting evidence attached.</p>}</section>
              </>}
            </div>
            <div className="p-space-md border-t border-border-hairline flex flex-wrap justify-end gap-space-sm">
              <button type="button" onClick={() => setViewTarget(null)} className="px-space-md py-2 rounded-lg bg-surface-muted text-text-primary font-semibold">Close</button>
              {canDecideViewed && viewProblem && viewContext && !evidenceError && <button type="button" onClick={() => { setAcceptTarget(viewTarget); setViewTarget(null); }} className="px-space-md py-2 rounded-lg bg-gov-emerald text-on-primary font-bold shadow-sm">Accept after review</button>}
              {canDecideViewed && viewProblem && viewContext && !evidenceError && <button type="button" onClick={() => { setDeclineTarget(viewTarget); setViewTarget(null); }} className="px-space-md py-2 rounded-lg bg-status-action-bg text-status-action-text border border-status-action-border font-bold">Reject problem</button>}
            </div>
          </div>
        </div>
      )}

      {/* Accept Assignment Confirmation Modal */}
      {acceptTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-surface-crisp rounded-xl max-w-md w-full p-space-lg shadow-xl border border-border-hairline flex flex-col gap-space-md">
            <div className="flex items-center gap-space-sm text-gov-emerald">
              <span className="material-symbols-outlined text-[28px]">how_to_reg</span>
              <h3 className="font-headline-sm text-headline-sm font-bold text-text-primary">
                Accept Problem Statement
              </h3>
            </div>
            <p className="font-body-md text-body-md text-text-secondary">
              Accepting <strong className="font-mono-code text-ashoka-blue">{acceptTarget.problemId}</strong> records this pool's final decision. The cycle completes and portal publication starts after every assigned pool accepts.
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
                {actionLoading ? 'Accepting…' : 'Confirm Accept'}
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
                Reject Problem Statement
              </h3>
            </div>
            <p className="font-body-md text-body-md text-text-secondary">
              Reject problem <strong className="font-mono-code text-ashoka-blue">{declineTarget.problemId}</strong>? This will close the assignment and mark the problem statement rejected.
            </p>
            <textarea
              rows={3}
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="Add a reason for rejection (optional)..."
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
                {actionLoading ? 'Rejecting…' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
