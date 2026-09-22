import type { SubmissionStatus } from '../../types/dto';
import { SUBMISSION_STATUS_LABEL } from '../../models/labels';

const STYLES: Record<SubmissionStatus, string> = {
  DRAFT: 'bg-draft-bg text-draft-text border-draft-border',
  SUBMITTED: 'bg-submitted-bg text-submitted-text border-submitted-border',
  UNDER_REVIEW: 'bg-review-bg text-review-text border-review-border',
  RETURNED: 'bg-returned-bg text-returned-text border-returned-border',
  ACCEPTED: 'bg-accepted-bg text-accepted-text border-accepted-border',
};

export function StatusBadge({
  status,
  className = '',
}: {
  status: SubmissionStatus;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border text-xs font-bold px-2.5 py-1 ${STYLES[status]} ${className}`}
    >
      {SUBMISSION_STATUS_LABEL[status]}
    </span>
  );
}
