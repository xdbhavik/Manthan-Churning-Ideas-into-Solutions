import type { AuditAction, EvaluationStatus, ProblemStatus, RegistrationStatus } from '../../types';

type Status =
  | RegistrationStatus
  | ProblemStatus
  | EvaluationStatus
  | AuditAction
  | string;

const statusStyles: Record<string, string> = {
  // Registration
  DRAFT: 'bg-surface-muted text-text-muted border border-border-hairline',
  SUBMITTED: 'bg-status-submitted-bg text-status-submitted-text border border-status-submitted-border',
  UNDER_REVIEW: 'bg-status-review-bg text-status-review-text border border-status-review-border',
  APPROVED: 'bg-status-approved-bg text-status-approved-text border border-status-approved-border',
  REJECTED: 'bg-red-50 text-red-700 border border-red-200',
  ACTION_REQUIRED: 'bg-status-action-bg text-status-action-text border border-status-action-border',
  // Problem
  SOURCE_VERIFYING: 'bg-amber-50 text-amber-700 border border-amber-200',
  SOURCE_VERIFIED: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  REGISTERED: 'bg-status-approved-bg text-status-approved-text border border-status-approved-border',
  ARCHIVED: 'bg-surface-muted text-text-muted border border-border-hairline',
  // Evaluation
  RECEIVED: 'bg-blue-50 text-blue-700 border border-blue-200',
  ANALYZING: 'bg-purple-50 text-purple-700 border border-purple-200',
  ROUTING: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
  EVALUATION_IN_PROGRESS: 'bg-status-review-bg text-status-review-text border border-status-review-border',
  EVALUATION_COMPLETED: 'bg-status-approved-bg text-status-approved-text border border-status-approved-border',
  SCORES_AGGREGATED: 'bg-teal-50 text-teal-700 border border-teal-200',
  PRIORITIZED: 'bg-gov-emerald/10 text-gov-emerald border border-gov-emerald/20',
  PHASE_3_READY: 'bg-green-100 text-green-800 border border-green-300',
  ANALYSIS_FAILED: 'bg-red-50 text-red-700 border border-red-200',
};

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

export default function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const style = statusStyles[status] ?? 'bg-surface-muted text-text-muted border border-border-hairline';
  const label = status.replace(/_/g, ' ');
  return (
    <span
      className={`inline-flex items-center px-space-sm py-space-2xs rounded font-label-sm text-label-sm whitespace-nowrap shrink-0 status-pop ${style} ${className}`}
    >
      {label}
    </span>
  );
}
