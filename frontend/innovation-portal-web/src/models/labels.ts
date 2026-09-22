import type { AccessRule, Severity, SourceBucket, SubmissionStatus, Urgency } from '../types/dto';

export const SOURCE_BUCKET_LABEL: Record<SourceBucket, string> = {
  GOVT: 'Government',
  CITIZEN: 'Citizen',
  INDUSTRY: 'Industry',
  COMMUNITY: 'Community',
  HEI: 'Institution',
};

export const URGENCY_LABEL: Record<Urgency, string> = {
  IMMEDIATE: 'Immediate',
  SHORT_TERM: 'Short-term',
  LONG_TERM: 'Long-term',
};

export const SEVERITY_LABEL: Record<Severity, string> = {
  CRITICAL: 'Critical',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
};

export const ACCESS_RULE_LABEL: Record<AccessRule, string> = {
  OPEN_TO_ALL: 'Open to all',
  UNIVERSITY_ONLY: 'University only',
  SELECTED_UNIVERSITIES: 'Selected universities',
};

export const SUBMISSION_STATUS_LABEL: Record<SubmissionStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under Review',
  ACCEPTED: 'Accepted',
  RETURNED: 'Returned',
};

export function shortId(id: string): string {
  return id.replace(/-/g, '').slice(0, 8).toUpperCase();
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}
