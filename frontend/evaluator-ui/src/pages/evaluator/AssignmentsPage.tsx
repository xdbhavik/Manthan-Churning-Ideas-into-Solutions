import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getMyAssignments,
  acceptAssignment,
  declineAssignment,
} from '../../services/evaluatorService';
import { getErrorMessage, getErrorStatus } from '../../lib/api';
import type { AssignmentResponse, AssignmentStatus } from '../../types';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorPanel from '../../components/ui/ErrorPanel';
import EmptyState from '../../components/ui/EmptyState';
import StatusBadge from '../../components/ui/StatusBadge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'All Assignments' },
  { value: 'ASSIGNED', label: 'ASSIGNED' },
  { value: 'IN_PROGRESS', label: 'IN_PROGRESS' },
  { value: 'SUBMITTED', label: 'SUBMITTED' },
  { value: 'DECLINED', label: 'DECLINED' },
  { value: 'EXPIRED', label: 'EXPIRED' },
  { value: 'REVIEWED', label: 'REVIEWED' },
];

export default function AssignmentsPage() {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<AssignmentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ msg: string; status: number | null } | null>(null);
  const [statusFilter, setStatusFilter] = useState<AssignmentStatus | ''>('');
  const [search, setSearch] = useState('');
  const [acceptTarget, setAcceptTarget] = useState<AssignmentResponse | null>(null);
  const [declineTarget, setDeclineTarget] = useState<AssignmentResponse | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      setAssignments(await getMyAssignments(statusFilter || undefined));
    } catch (e) {
      setError({ msg: getErrorMessage(e), status: getErrorStatus(e) });
    } finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { void load(); }, [load]);

  const filtered = assignments.filter((a) => {
    const q = search.toLowerCase();
    return !q || a.assignmentId.toLowerCase().includes(q) || a.cycleId.toLowerCase().includes(q) || a.problemId.toLowerCase().includes(q);
  });

  const handleAccept = async () => {
    if (!acceptTarget) return;
    setActionLoading(true); setActionError('');
    try {
      await acceptAssignment(acceptTarget.assignmentId);
      setSuccessMsg('Assignment ' + acceptTarget.assignmentId + ' accepted.');
      setAcceptTarget(null);
      void load();
    } catch (e) { setActionError(getErrorMessage(e)); }
    finally { setActionLoading(false); }
  };

  const handleDecline = async () => {
    if (!declineTarget) return;
    setActionLoading(true); setActionError('');
    try {
      await declineAssignment(declineTarget.assignmentId, declineReason ? { reason: declineReason } : {});
      setSuccessMsg('Assignment ' + declineTarget.assignmentId + ' declined.');
      setDeclineTarget(null); setDeclineReason('');
      void load();
    } catch (e) { setActionError(getErrorMessage(e)); }
    finally { setActionLoading(false); }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[24px] font-bold text-[#0A2540] tracking-tight">Work Queue</h1>
          <p className="text-[13px] text-[#64748B] mt-0.5">Your assigned evaluation dossiers</p>
        </div>
        <button type="button" onClick={load} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#CBD5E1] bg-white text-[13px] font-semibold text-[#0A2540] hover:bg-[#F8FAFC] transition-colors shadow-xs">
          <span className="material-symbols-outlined text-[18px] text-[#64748B]">sync</span>
          Refresh
        </button>
      </div>

      {successMsg && (
        <div className="mb-4 flex items-center gap-2 p-3 bg-[#ECFDF5] border border-[#A7F3D0] rounded-lg text-[13px] text-[#065F46]">
          <span className="material-symbols-outlined text-[16px]">check_circle</span>
          {successMsg}
          <button type="button" onClick={() => setSuccessMsg('')} className="ml-auto"><span className="material-symbols-outlined text-[16px]">close</span></button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as AssignmentStatus | '')}
          className="border border-[#E2E8F0] rounded-lg px-3 py-2 text-[13px] text-[#0A2540] bg-white"
        >
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by ID, Cycle ID, Problem ID…"
          className="flex-1 min-w-[200px] border border-[#E2E8F0] rounded-lg px-3 py-2 text-[13px] text-[#0A2540] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#0A2540]/10"
        />
      </div>

      {loading && <div className="py-12 flex justify-center"><LoadingSpinner label="Loading assignments…" /></div>}
      {error && !loading && <ErrorPanel status={error.status} message={error.msg} onRetry={load} />}

      {!loading && !error && filtered.length === 0 && (
        <EmptyState icon="assignment" title="No assignments found" description="No assignments match your current filters." action={{ label: 'Clear filters', onClick: () => { setStatusFilter(''); setSearch(''); } }} />
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="grid gap-4">
          {filtered.map((a) => (
            <div key={a.assignmentId} className={'bg-white rounded-xl border shadow-sm transition-shadow hover:shadow-md ' + (a.overdue ? 'border-[#FDE68A]' : 'border-[#E2E8F0]')}>
              {a.overdue && (
                <div className="flex items-center gap-2 px-4 py-2 bg-[#FFFBEB] border-b border-[#FDE68A] rounded-t-xl text-[12px] font-semibold text-[#92400E]">
                  <span className="material-symbols-outlined text-[16px]">warning</span>
                  OVERDUE — Accepting or submitting after the deadline will be rejected by the server.
                </div>
              )}
              <div className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono-code text-[13px] font-semibold text-[#0A2540]">{a.assignmentId}</span>
                      <StatusBadge status={a.status} />
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[12px] text-[#64748B] flex-wrap">
                      <span>Cycle: <span className="font-mono-code text-[#0A2540]">{a.cycleId}</span></span>
                      <span>Problem: <span className="font-mono-code text-[#0A2540]">{a.problemId}</span></span>
                      <span>Cycle status: <StatusBadge status={a.cycleStatus} /></span>
                    </div>
                  </div>
                  <div className="text-right text-[12px] text-[#64748B]">
                    <div>Assigned: {new Date(a.assignedAt).toLocaleDateString()}</div>
                    <div>Deadline: <span className={a.overdue ? 'text-[#BE123C] font-semibold' : ''}>{new Date(a.deadline).toLocaleDateString()}</span></div>
                    {a.submittedAt && <div>Submitted: {new Date(a.submittedAt).toLocaleDateString()}</div>}
                  </div>
                </div>

                {/* Progress */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex-1 bg-[#F1F5F9] rounded-full h-1.5">
                    <div
                      className="bg-[#059669] h-1.5 rounded-full transition-all"
                      style={{ width: a.totalCriteriaCount > 0 ? (a.scoredCriteriaCount / a.totalCriteriaCount * 100) + '%' : '0%' }}
                    />
                  </div>
                  <span className="text-[12px] font-semibold text-[#0A2540] shrink-0">
                    {a.scoredCriteriaCount} / {a.totalCriteriaCount} scored
                  </span>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => navigate('/evaluator/assignments/' + a.assignmentId)}
                    className="px-3 py-1.5 bg-[#0A2540] text-white text-[13px] font-semibold rounded-lg hover:bg-[#1E3A8A] transition-colors"
                  >
                    Open Assignment
                  </button>
                  {a.status === 'ASSIGNED' && (
                    <button type="button" onClick={() => setAcceptTarget(a)} className="px-3 py-1.5 bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] text-[13px] font-semibold rounded-lg hover:bg-[#D1FAE5] transition-colors">
                      Accept
                    </button>
                  )}
                  {(a.status === 'ASSIGNED' || a.status === 'IN_PROGRESS') && (
                    <button type="button" onClick={() => { setDeclineTarget(a); setDeclineReason(''); }} className="px-3 py-1.5 bg-[#FFF1F2] border border-[#FECDD3] text-[#BE123C] text-[13px] font-semibold rounded-lg hover:bg-[#FFE4E6] transition-colors">
                      Decline
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Accept dialog */}
      <ConfirmDialog
        open={!!acceptTarget}
        title="Accept Assignment"
        confirmLabel="Accept"
        variant="primary"
        onConfirm={handleAccept}
        onCancel={() => { setAcceptTarget(null); setActionError(''); }}
        loading={actionLoading}
      >
        {acceptTarget && (
          <div className="text-[13px] text-[#475569] space-y-1">
            <div>Assignment ID: <span className="font-mono-code text-[#0A2540]">{acceptTarget.assignmentId}</span></div>
            <div>Problem ID: <span className="font-mono-code text-[#0A2540]">{acceptTarget.problemId}</span></div>
            <div>Deadline: <span className={acceptTarget.overdue ? 'text-[#BE123C] font-semibold' : 'text-[#0A2540]'}>{new Date(acceptTarget.deadline).toLocaleDateString()}</span></div>
            {acceptTarget.overdue && <div className="text-[#BE123C] font-semibold">Warning: This assignment is past its deadline.</div>}
            {actionError && <div className="text-[#BE123C]">{actionError}</div>}
          </div>
        )}
      </ConfirmDialog>

      {/* Decline dialog */}
      <ConfirmDialog
        open={!!declineTarget}
        title="Decline Assignment"
        confirmLabel="Decline Assignment"
        variant="danger"
        onConfirm={handleDecline}
        onCancel={() => { setDeclineTarget(null); setActionError(''); setDeclineReason(''); }}
        loading={actionLoading}
      >
        {declineTarget && (
          <div className="text-[13px] text-[#475569] space-y-3">
            <div>Assignment: <span className="font-mono-code text-[#0A2540]">{declineTarget.assignmentId}</span></div>
            <div>
              <label className="block text-[12px] font-semibold text-[#0A2540] mb-1">Decline Reason (optional)</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {['Conflict of interest', 'Outside expertise', 'Workload issue', 'Other'].map((s) => (
                  <button key={s} type="button" onClick={() => setDeclineReason(s)}
                    className={'px-2 py-0.5 rounded text-[11px] border transition-colors ' + (declineReason === s ? 'bg-[#0A2540] text-white border-[#0A2540]' : 'bg-white text-[#475569] border-[#CBD5E1] hover:border-[#0A2540]')}
                  >{s}</button>
                ))}
              </div>
              <textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value.slice(0, 1000))}
                rows={3}
                placeholder="Optional reason…"
                className="w-full border border-[#CBD5E1] rounded-lg px-3 py-2 text-[13px] resize-none focus:outline-none focus:ring-2 focus:ring-[#0A2540]/10"
              />
              <div className="text-right text-[11px] text-[#94A3B8]">{declineReason.length}/1000</div>
            </div>
            {actionError && <div className="text-[#BE123C]">{actionError}</div>}
          </div>
        )}
      </ConfirmDialog>
    </div>
  );
}
