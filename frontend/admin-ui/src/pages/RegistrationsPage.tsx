import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '../components/layout/Header';
import StatusBadge from '../components/ui/StatusBadge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorAlert from '../components/ui/ErrorAlert';
import ConfirmModal from '../components/ui/ConfirmModal';
import Pagination from '../components/ui/Pagination';
import {
  getQueue,
  assign,
  approve,
  reject,
  requestAction,
} from '../services/registrationService';
import { getErrorMessage } from '../lib/api';
import type { RegistrationResponse, RegistrationStatus } from '../types';

const STATUS_TABS: { label: string; value: RegistrationStatus | ''; icon: string }[] = [
  { label: 'All Registrations', value: '', icon: 'inbox' },
  { label: 'Submitted', value: 'SUBMITTED', icon: 'mark_email_unread' },
  { label: 'Under Review', value: 'UNDER_REVIEW', icon: 'rate_review' },
  { label: 'Action Required', value: 'ACTION_REQUIRED', icon: 'warning' },
  { label: 'Approved', value: 'APPROVED', icon: 'verified' },
  { label: 'Rejected', value: 'REJECTED', icon: 'cancel' },
  { label: 'Draft', value: 'DRAFT', icon: 'edit_note' },
];

function RegistrationDetail({
  reg,
  onAction,
  actionLoading,
}: {
  reg: RegistrationResponse;
  onAction: (action: 'assign' | 'approve' | 'reject' | 'request-action', comment?: string) => void;
  actionLoading: boolean;
}) {
  const [comment, setComment] = useState('');
  const [confirmAction, setConfirmAction] = useState<'approve' | 'reject' | 'request-action' | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const canDecide = reg.status === 'SUBMITTED' || reg.status === 'UNDER_REVIEW';

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="flex flex-col gap-space-xl max-w-4xl">
      {/* Header Record Card */}
      <div className="bg-surface-crisp rounded-lg border border-border-hairline shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-space-xl py-space-md border-b border-border-hairline bg-surface-subtle/50">
          <div className="flex items-center gap-space-sm">
            <span className="material-symbols-outlined text-ashoka-blue text-[20px]" aria-hidden="true">
              assignment
            </span>
            <span className="font-label-lg text-label-lg text-text-primary tracking-tight">
              Registration Overview
            </span>
          </div>
          <StatusBadge status={reg.status} />
        </div>

        <div className="p-space-xl grid grid-cols-1 md:grid-cols-2 gap-space-lg">
          <DetailField
            label="Registration ID"
            value={reg.registrationId}
            mono
            onCopy={() => handleCopy(reg.registrationId, 'id')}
            copied={copiedField === 'id'}
          />
          <DetailField label="Source Bucket" value={reg.sourceBucket} />
          <DetailField label="Source Type" value={reg.sourceType} />
          <DetailField label="Version" value={`v${reg.version}`} />
          <DetailField
            label="Submitter User ID"
            value={reg.submittedByUserId ?? '—'}
            mono
            onCopy={reg.submittedByUserId ? () => handleCopy(reg.submittedByUserId!, 'submitter') : undefined}
            copied={copiedField === 'submitter'}
          />
          <DetailField
            label="Assigned Reviewer"
            value={reg.assignedReviewerId ?? 'Unassigned'}
            mono
          />
          <DetailField
            label="Submitted At"
            value={reg.submittedAt ? new Date(reg.submittedAt).toLocaleString('en-IN') : '—'}
          />
          <DetailField
            label="Reviewed At"
            value={reg.reviewedAt ? new Date(reg.reviewedAt).toLocaleString('en-IN') : '—'}
          />
        </div>

        {/* Special notices if rejection or action requested */}
        {reg.rejectionReason && (
          <div className="mx-space-xl mb-space-xl p-space-md bg-red-50/80 border border-red-200 rounded-lg flex items-start gap-space-sm">
            <span className="material-symbols-outlined text-red-600 text-[20px] flex-shrink-0 mt-0.5">error</span>
            <div>
              <p className="font-label-sm text-label-sm text-red-800 uppercase tracking-wider font-semibold">
                Reason for Rejection
              </p>
              <p className="font-body-md text-body-md text-red-900 mt-1">{reg.rejectionReason}</p>
            </div>
          </div>
        )}

        {reg.actionRequiredComment && (
          <div className="mx-space-xl mb-space-xl p-space-md bg-status-action-bg/60 border border-status-action-border rounded-lg flex items-start gap-space-sm">
            <span className="material-symbols-outlined text-status-action-text text-[20px] flex-shrink-0 mt-0.5">warning</span>
            <div>
              <p className="font-label-sm text-label-sm text-status-action-text uppercase tracking-wider font-semibold">
                Action Required from Submitter
              </p>
              <p className="font-body-md text-body-md text-text-primary mt-1">{reg.actionRequiredComment}</p>
            </div>
          </div>
        )}
      </div>

      {/* Source Payload Card */}
      <div className="bg-surface-crisp rounded-lg border border-border-hairline shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-space-xl py-space-md border-b border-border-hairline bg-surface-subtle/50">
          <div className="flex items-center gap-space-sm">
            <span className="material-symbols-outlined text-text-secondary text-[20px]" aria-hidden="true">
              data_object
            </span>
            <span className="font-label-lg text-label-lg text-text-primary">
              Source Payload Data
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleCopy(JSON.stringify(reg.source, null, 2), 'payload')}
            className="flex items-center gap-space-xs text-body-sm font-label-md text-ashoka-blue hover:underline cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">
              {copiedField === 'payload' ? 'check' : 'content_copy'}
            </span>
            {copiedField === 'payload' ? 'Copied' : 'Copy JSON'}
          </button>
        </div>
        <div className="p-space-xl">
          <pre className="font-mono-code text-body-sm text-text-secondary bg-surface-subtle p-space-md rounded border border-border-hairline overflow-x-auto max-h-64 select-text">
            {JSON.stringify(reg.source, null, 2)}
          </pre>
        </div>
      </div>

      {/* Reviewer Action Desk */}
      {canDecide ? (
        <div className="bg-surface-crisp rounded-lg border border-border-hairline shadow-sm p-space-xl flex flex-col gap-space-lg">
          <div className="flex items-center justify-between border-b border-border-hairline pb-space-md">
            <div>
              <h3 className="font-headline-sm text-headline-sm text-text-primary">
                Review Decision Desk
              </h3>
              <p className="font-body-sm text-body-sm text-text-muted mt-0.5">
                Execute statutory audit decisions on this registration record.
              </p>
            </div>
            <span className="font-label-sm text-[11px] px-space-sm py-1 rounded bg-amber-50 text-amber-800 border border-amber-200">
              Pending Evaluation
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
            <button
              id="reg-assign-btn"
              type="button"
              disabled={actionLoading}
              onClick={() => onAction('assign')}
              className="h-10 px-space-lg rounded border border-border-strong bg-surface-crisp text-text-primary hover:bg-surface-muted transition-colors cursor-pointer flex items-center justify-center gap-space-sm disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">person_add</span>
              Assign to Myself
            </button>

            <button
              id="reg-approve-btn"
              type="button"
              disabled={actionLoading}
              onClick={() => setConfirmAction('approve')}
              className="h-10 px-space-lg rounded bg-gov-emerald text-white hover:bg-emerald-700 transition-colors cursor-pointer flex items-center justify-center gap-space-sm font-semibold shadow-sm disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              Approve Registration
            </button>
          </div>

          <div className="border-t border-border-hairline pt-space-lg flex flex-col gap-space-sm">
            <label className="font-label-md text-label-md text-text-primary flex items-center justify-between" htmlFor="reg-comment">
              <span>
                Review Comment / Justification
                <span className="text-red-500 ml-1">*</span>
              </span>
              <span className="font-body-sm text-text-muted text-[11px]">Required for Reject or Request Action</span>
            </label>
            <textarea
              id="reg-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="State clear official rationale or requested amendments for the submitter..."
              className="w-full px-space-md py-space-sm rounded border border-border-strong bg-surface-crisp font-body-md text-body-md text-text-primary focus:outline-none focus:border-ashoka-blue resize-none"
            />
            <div className="flex gap-space-md pt-space-xs">
              <button
                id="reg-reject-btn"
                type="button"
                disabled={actionLoading || !comment.trim()}
                onClick={() => setConfirmAction('reject')}
                className="flex-1 h-10 rounded bg-red-600 text-white hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-40 flex items-center justify-center gap-space-xs font-medium"
              >
                <span className="material-symbols-outlined text-[18px]">cancel</span>
                Reject Registration
              </button>
              <button
                id="reg-request-action-btn"
                type="button"
                disabled={actionLoading || !comment.trim()}
                onClick={() => setConfirmAction('request-action')}
                className="flex-1 h-10 rounded bg-amber-500 text-white hover:bg-amber-600 transition-colors cursor-pointer disabled:opacity-40 flex items-center justify-center gap-space-xs font-medium"
              >
                <span className="material-symbols-outlined text-[18px]">undo</span>
                Request Action
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-space-lg bg-surface-muted/60 border border-border-hairline rounded-lg text-text-muted text-body-sm flex items-center gap-space-sm">
          <span className="material-symbols-outlined text-[18px]">lock</span>
          <span>
            This registration is currently in status <strong>{reg.status}</strong> and cannot be modified.
          </span>
        </div>
      )}

      {/* Confirm Modals */}
      <ConfirmModal
        isOpen={confirmAction === 'approve'}
        title="Approve Registration"
        description="Approving this registration validates the source identity and enables full platform access. This action cannot be reversed."
        confirmLabel="Confirm Approval"
        danger={false}
        onConfirm={() => {
          setConfirmAction(null);
          onAction('approve');
        }}
        onCancel={() => setConfirmAction(null)}
      />
      <ConfirmModal
        isOpen={confirmAction === 'reject'}
        title="Reject Registration"
        description="Rejecting this registration is permanent. The submitter will receive your comment as formal notification."
        confirmLabel="Confirm Rejection"
        danger={true}
        onConfirm={() => {
          setConfirmAction(null);
          onAction('reject', comment);
          setComment('');
        }}
        onCancel={() => setConfirmAction(null)}
      />
      <ConfirmModal
        isOpen={confirmAction === 'request-action'}
        title="Request Action from Submitter"
        description="The submitter will be notified to revise their documentation according to your notes and resubmit."
        confirmLabel="Send Request"
        danger={false}
        onConfirm={() => {
          setConfirmAction(null);
          onAction('request-action', comment);
          setComment('');
        }}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}

function DetailField({
  label,
  value,
  mono,
  onCopy,
  copied,
}: {
  label: string;
  value: string;
  mono?: boolean;
  onCopy?: () => void;
  copied?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider text-[11px]">
        {label}
      </span>
      <div className="flex items-center gap-space-xs">
        <span
          className={`font-body-md text-body-md text-text-primary break-all ${
            mono ? 'font-mono-code text-body-sm bg-surface-muted px-1.5 py-0.5 rounded' : ''
          }`}
        >
          {value}
        </span>
        {onCopy && (
          <button
            type="button"
            onClick={onCopy}
            title="Copy to clipboard"
            className="p-0.5 text-text-muted hover:text-text-primary cursor-pointer transition-colors"
          >
            <span className="material-symbols-outlined text-[15px]">
              {copied ? 'check' : 'content_copy'}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

export default function RegistrationsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<RegistrationStatus | ''>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState<RegistrationResponse | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Fetch full queue for stats & counts
  const {
    data: allData,
    refetch: refetchAll,
  } = useQuery({
    queryKey: ['registrations-all'],
    queryFn: () => getQueue(),
  });

  // Fetch specifically for the active tab
  const {
    data: tabData,
    isLoading: isTabLoading,
    refetch: refetchTab,
  } = useQuery({
    queryKey: ['registrations-tab', statusFilter],
    queryFn: () => getQueue(statusFilter || undefined),
  });

  // Explicit fetches for counts the default queue may exclude
  const { data: approvedData } = useQuery({
    queryKey: ['registrations-count', 'APPROVED'],
    queryFn: () => getQueue('APPROVED'),
  });
  const { data: rejectedData } = useQuery({
    queryKey: ['registrations-count', 'REJECTED'],
    queryFn: () => getQueue('REJECTED'),
  });

  // Calculate metrics
  const metrics = useMemo(() => {
    const list = allData || [];
    return {
      total: list.length,
      submitted: list.filter((r) => r.status === 'SUBMITTED').length,
      underReview: list.filter((r) => r.status === 'UNDER_REVIEW').length,
      actionRequired: list.filter((r) => r.status === 'ACTION_REQUIRED').length,
      approved: (approvedData || []).length,
      rejected: (rejectedData || []).length,
    };
  }, [allData, approvedData, rejectedData]);

  // Filter and search
  const filteredData = useMemo(() => {
    if (!tabData) return [];
    return tabData.filter((item) => {
      // Backend already filters by status if provided, but we double-check here
      const matchesStatus = !statusFilter || item.status === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.registrationId.toLowerCase().includes(q) ||
        item.sourceBucket.toLowerCase().includes(q) ||
        (item.submittedByUserId && item.submittedByUserId.toLowerCase().includes(q));
      return matchesStatus && matchesSearch;
    });
  }, [tabData, statusFilter, searchQuery]);

  const [page, setPage] = useState(0);
  const pageSize = 8;
  const totalPages = Math.ceil(filteredData.length / pageSize);
  const paginatedData = filteredData.slice(page * pageSize, (page + 1) * pageSize);

  const actionMutation = useMutation({
    mutationFn: async ({ action, id, comment }: { action: string; id: string; comment?: string }) => {
      if (action === 'assign') return assign(id);
      if (action === 'approve') return approve(id, comment);
      if (action === 'reject') return reject(id, comment!);
      if (action === 'request-action') return requestAction(id, comment!);
      throw new Error('Unknown action');
    },
    onSuccess: (updated) => {
      setSelected(updated);
      queryClient.invalidateQueries({ queryKey: ['registrations-all'] });
      queryClient.invalidateQueries({ queryKey: ['registrations-tab'] });
      setActionError(null);
      setActionSuccess('Action applied successfully.');
      setTimeout(() => setActionSuccess(null), 4000);
    },
    onError: (err) => {
      setActionError(getErrorMessage(err));
      setActionSuccess(null);
    },
  });

  return (
    <div className="admin-page flex flex-col h-full bg-background">
      <Header
        title="Registration Verification Queue"
        subtitle="Review, audit, and verify statutory registrations submitted by departments and partners."
      />

      {/* Top Metrics Ribbon */}
      <section aria-label="Queue Metrics" className="px-space-2xl pt-space-lg pb-space-sm border-b border-border-hairline bg-surface-crisp/60">
        <div className="stagger-enter grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-space-md">
          <div className="surface-lift p-space-md rounded-lg border border-border-hairline bg-surface-crisp flex flex-col">
            <span className="font-label-sm text-[11px] text-text-muted uppercase tracking-wider">Total Queue</span>
            <span className="font-headline-md text-headline-md text-text-primary mt-1 font-semibold tabular-nums">
              {metrics.total}
            </span>
          </div>
          <div className="surface-lift p-space-md rounded-lg border border-blue-200/70 bg-blue-50/40 flex flex-col">
            <span className="font-label-sm text-[11px] text-blue-700 uppercase tracking-wider">Pending Review</span>
            <span className="font-headline-md text-headline-md text-blue-900 mt-1 font-semibold tabular-nums">
              {metrics.submitted}
            </span>
          </div>
          <div className="surface-lift p-space-md rounded-lg border border-purple-200/70 bg-purple-50/40 flex flex-col">
            <span className="font-label-sm text-[11px] text-purple-700 uppercase tracking-wider">Under Review</span>
            <span className="font-headline-md text-headline-md text-purple-900 mt-1 font-semibold tabular-nums">
              {metrics.underReview}
            </span>
          </div>
          <div className="surface-lift p-space-md rounded-lg border border-amber-200/70 bg-amber-50/40 flex flex-col">
            <span className="font-label-sm text-[11px] text-amber-700 uppercase tracking-wider">Action Required</span>
            <span className="font-headline-md text-headline-md text-amber-900 mt-1 font-semibold tabular-nums">
              {metrics.actionRequired}
            </span>
          </div>
          <div className="surface-lift p-space-md rounded-lg border border-emerald-200/70 bg-emerald-50/40 flex flex-col">
            <span className="font-label-sm text-[11px] text-emerald-700 uppercase tracking-wider">Approved</span>
            <span className="font-headline-md text-headline-md text-emerald-900 mt-1 font-semibold tabular-nums">
              {metrics.approved}
            </span>
          </div>
        </div>
      </section>

      {/* Unified Filter & Search Toolbar */}
      <div className="toolbar-sheen px-space-2xl py-space-md border-b border-border-hairline bg-surface-crisp flex flex-wrap items-center justify-between gap-space-md">
        {/* Horizontal Status Pill Strip */}
        <div className="flex items-center gap-space-xs overflow-x-auto pb-1 sm:pb-0" role="tablist">
          {STATUS_TABS.map(({ label, value, icon }) => {
            const count =
              value === ''
                ? metrics.total
                : value === 'SUBMITTED'
                ? metrics.submitted
                : value === 'UNDER_REVIEW'
                ? metrics.underReview
                : value === 'ACTION_REQUIRED'
                ? metrics.actionRequired
                : value === 'APPROVED'
                ? metrics.approved
                : value === 'REJECTED'
                ? metrics.rejected
                : 0;

            const isActive = statusFilter === value;
            return (
              <button
                key={value}
                id={`tab-${value || 'all'}`}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => {
                  setStatusFilter(value);
                  setPage(0);
                }}
                className={`pressable flex items-center gap-space-xs px-space-md py-1.5 rounded-full text-label-sm font-label-md transition-all cursor-pointer whitespace-nowrap border ${
                  isActive
                    ? 'bg-ashoka-blue text-white border-ashoka-blue shadow-sm'
                    : 'bg-surface-crisp text-text-secondary border-border-hairline hover:border-border-strong hover:bg-surface-subtle'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]" aria-hidden="true">{icon}</span>
                <span>{label}</span>
                <span
                  className={`ml-1 text-[11px] px-1.5 py-0.2 rounded-full font-mono-code ${
                    isActive ? 'bg-white/20 text-white' : 'bg-surface-muted text-text-muted'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Bar + Refresh */}
        <div className="flex items-center gap-space-sm">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-2.5 top-2.5 text-[18px] text-text-muted">
              search
            </span>
            <input
              type="text"
              placeholder="Search by ID or bucket..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(0);
              }}
              className="h-9 pl-9 pr-space-md rounded border border-border-strong bg-surface-crisp text-body-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-ashoka-blue w-60"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-text-muted hover:text-text-primary"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>

          <button
            type="button"
            title="Refresh queue"
            onClick={() => { refetchAll(); refetchTab(); }}
                className="icon-button flex items-center justify-center w-9 h-9 rounded border border-border-strong bg-surface-crisp text-text-secondary hover:text-text-primary hover:bg-surface-muted cursor-pointer transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
          </button>
        </div>
      </div>

      {/* Main Content Workspace */}
      <div className="queue-layout flex flex-1 overflow-hidden">
        {isTabLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <LoadingSpinner message="Loading registration queue data..." />
          </div>
        ) : filteredData.length === 0 ? (
          /* Clean Unified Empty State (Not dual split!) */
          <div className="flex-1 flex items-center justify-center p-space-2xl">
            <div className="max-w-md w-full text-center flex flex-col items-center bg-surface-crisp border border-border-hairline rounded-lg p-space-2xl shadow-sm">
              <div className="w-12 h-12 rounded-lg bg-surface-muted flex items-center justify-center mb-space-md text-text-muted">
                <span className="material-symbols-outlined text-[28px]">inbox</span>
              </div>
              <h3 className="font-headline-sm text-headline-sm text-text-primary">
                {statusFilter ? `No ${statusFilter.replace(/_/g, ' ')} Registrations` : 'Registration Queue Empty'}
              </h3>
              <p className="font-body-md text-body-md text-text-secondary mt-space-xs leading-relaxed">
                {statusFilter || searchQuery
                  ? 'No records match your active search or filter criteria. Try clearing filters or searching for another identifier.'
                  : 'There are currently no new registration applications awaiting departmental verification.'}
              </p>
              <div className="mt-space-lg flex gap-space-sm">
                {(statusFilter || searchQuery) && (
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter('');
                      setSearchQuery('');
                      setPage(0);
                    }}
                    className="px-space-lg h-9 rounded border border-border-strong text-text-primary hover:bg-surface-muted text-label-md transition-colors cursor-pointer"
                  >
                    Clear Filters
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => { refetchAll(); refetchTab(); }}
                  className="px-space-lg h-9 rounded bg-ashoka-blue text-white hover:bg-institutional-navy text-label-md transition-colors cursor-pointer"
                >
                  Refresh Queue
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Two-Pane Master Detail Layout */
          <>
            {/* Left Queue List */}
            <div className="queue-pane w-[380px] border-r border-border-hairline flex flex-col bg-surface-crisp flex-shrink-0">
              <div className="px-space-lg py-space-xs bg-surface-muted/40 border-b border-border-hairline flex items-center justify-between text-body-sm text-text-muted">
                <span>Showing {paginatedData.length} of {filteredData.length}</span>
                <span className="font-mono-code text-[11px]">Sorted: Newest</span>
              </div>

              <div className="flex-1 overflow-y-auto p-space-md flex flex-col gap-space-xs">
                {paginatedData.map((reg) => {
                  const isSelected = selected?.registrationId === reg.registrationId;
                  return (
                    <button
                      key={reg.registrationId}
                      id={`reg-item-${reg.registrationId}`}
                      type="button"
                      onClick={() => setSelected(reg)}
                       className={`queue-card text-left p-space-md rounded-lg border transition-all cursor-pointer relative ${
                        isSelected
                          ? 'border-ashoka-blue bg-blue-50/40 shadow-xs'
                          : 'border-border-hairline bg-surface-crisp hover:border-border-strong hover:bg-surface-subtle/60'
                      }`}
                    >
                      {/* Active indicator line */}
                      {isSelected && (
                        <div className="absolute left-0 top-2 bottom-2 w-1 bg-ashoka-blue rounded-r" />
                      )}

                      <div className="flex items-center justify-between mb-space-xs">
                        <StatusBadge status={reg.status} />
                        <span className="font-body-sm text-[11px] text-text-muted">
                          {reg.submittedAt ? new Date(reg.submittedAt).toLocaleDateString('en-IN') : 'Draft'}
                        </span>
                      </div>

                      <div className="font-label-lg text-label-lg text-text-primary truncate font-medium">
                        {reg.sourceBucket || 'Default Registry Bucket'}
                      </div>

                      <div className="font-mono-code text-[11px] text-text-muted truncate mt-0.5">
                        ID: {reg.registrationId}
                      </div>

                      <div className="mt-space-xs pt-space-xs border-t border-border-hairline/60 flex items-center justify-between text-text-muted text-[11px]">
                        <span className="truncate">By: {reg.submittedByUserId || 'System'}</span>
                        <span>v{reg.version}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Pagination */}
              <Pagination
                page={page}
                totalPages={totalPages}
                totalElements={filteredData.length}
                size={pageSize}
                onPageChange={setPage}
              />
            </div>

            {/* Right Detail Panel */}
            <div className="detail-pane flex-1 overflow-y-auto p-space-2xl bg-background">
              {actionError && <ErrorAlert message={actionError} className="mb-space-lg max-w-4xl" />}
              {actionSuccess && (
                <div className="flex items-center gap-space-sm p-space-md bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg mb-space-lg max-w-4xl">
                  <span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span>
                  <span className="font-body-sm text-body-sm font-medium">{actionSuccess}</span>
                </div>
              )}

              {selected ? (
                <RegistrationDetail
                  reg={selected}
                  onAction={(action, comment) =>
                    actionMutation.mutate({ action, id: selected.registrationId, comment })
                  }
                  actionLoading={actionMutation.isPending}
                />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="max-w-sm text-center flex flex-col items-center text-text-muted">
                    <div className="w-12 h-12 rounded-lg bg-surface-muted flex items-center justify-center mb-space-md">
                      <span className="material-symbols-outlined text-[24px]">touch_app</span>
                    </div>
                    <p className="font-label-lg text-label-lg text-text-primary">
                      Select a registration
                    </p>
                    <p className="font-body-sm text-body-sm text-text-muted mt-1 leading-relaxed">
                      Choose an application from the queue list on the left to review documentation and execute administrative decisions.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
