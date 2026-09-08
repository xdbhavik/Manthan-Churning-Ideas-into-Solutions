// ─── Auth types ──────────────────────────────────────────────────────────────

export interface OtpResponse {
  challengeId: string;
  expiresAt: string;
  devOtp: string | null;
  requestsRemainingInWindow: number;
}

export interface UserResponse {
  userId: string;
  phone: string;
  email: string | null;
  role: 'SUBMITTER' | 'REVIEWER' | 'ADMIN' | 'EVALUATOR';
  kycStatus: 'UNVERIFIED' | 'VERIFIED';
  linkedSourceId: string | null;
  createdAt: string;
}

export interface VerifyOtpResponse {
  accessToken: string;
  refreshToken: string;
  user: UserResponse;
  expiresAt: string;
}

// ─── Registration types ───────────────────────────────────────────────────────

export type RegistrationStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'ACTION_REQUIRED';

export interface RegistrationResponse {
  registrationId: string;
  sourceBucket: string;
  sourceType: string;
  status: RegistrationStatus;
  source: Record<string, unknown>;
  submittedByUserId: string;
  sourceId: string | null;
  assignedReviewerId: string | null;
  rejectionReason: string | null;
  actionRequiredComment: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
}

// ─── Problem types ────────────────────────────────────────────────────────────

export type ProblemStatus =
  | 'SUBMITTED'
  | 'SOURCE_VERIFYING'
  | 'SOURCE_VERIFIED'
  | 'REGISTERED'
  | 'REJECTED'
  | 'ARCHIVED';

export interface ProblemResponse {
  problemId: string;
  title: string;
  description: string;
  sourceBucket: string;
  subEntityType: string;
  status: ProblemStatus;
  urgency: string;
  severity: string;
  sourceId: string | null;
  sourceAccountId: string | null;
  locationId: string | null;
  affectedPopulation: number | null;
  expectedOutcome: string | null;
  existingIntervention: string | null;
  submittedAt: string;
  updatedAt: string;
  submittedByUserId: string;
  version: number;
}

// ─── Source account / verification ───────────────────────────────────────────

export interface SourceAccountResponse {
  sourceAccountId: string;
  ownerUserId: string;
  displayName: string;
  sourceBucket: string;
  status: string;
  verificationStatus: string;
  canSubmit: boolean;
  createdAt: string;
}

export interface SourceVerificationResponse {
  verificationId: string;
  sourceAccountId: string;
  method: string;
  result: string;
  notes: string | null;
  evidenceUrl: string | null;
  performedByUserId: string;
  performedAt: string;
  ipAddress: string | null;
}

// ─── Evaluation types ─────────────────────────────────────────────────────────

export type EvaluationStatus =
  | 'RECEIVED'
  | 'ANALYZING'
  | 'ROUTING'
  | 'EVALUATION_IN_PROGRESS'
  | 'EVALUATION_COMPLETED'
  | 'SCORES_AGGREGATED'
  | 'PRIORITIZED'
  | 'PHASE_3_READY'
  | 'ANALYSIS_FAILED';

export interface EvaluationCycleResponse {
  cycleId: string;
  problemId: string;
  status: EvaluationStatus;
  triggerMethod: string | null;
  triggeredByUserId: string | null;
  startedAt: string;
  completedAt: string | null;
  finalScore: number | null;
  impactLevel: string | null;
  priorityScore: number | null;
  priorityBand: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface EvaluationStatusHistoryResponse {
  historyId: string;
  cycleId: string;
  fromStatus: EvaluationStatus | null;
  toStatus: EvaluationStatus;
  changedByUserId: string | null;
  comment: string | null;
  changedAt: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface ProblemAnalysisResponse {
  cycleId: string;
  analysisId: string | null;
  status: string;
  summary: string | null;
  tags: string[] | null;
}

// ─── Audit types ──────────────────────────────────────────────────────────────

export type AuditAction =
  | 'CREATED'
  | 'UPDATED'
  | 'STATUS_CHANGED'
  | 'EVIDENCE_ADDED'
  | 'SOURCE_VERIFICATION_INITIATED'
  | 'SOURCE_VERIFIED'
  | 'SOURCE_VERIFICATION_FAILED'
  | 'REJECTED'
  | 'ARCHIVED'
  | 'WITHDRAWN'
  | 'EVALUATION_STARTED'
  | 'EVALUATION_ANALYZED'
  | 'EVALUATION_ROUTED'
  | 'EVALUATION_ASSIGNED'
  | 'EVALUATION_SUBMITTED'
  | 'EVALUATION_AGGREGATED'
  | 'EVALUATION_PRIORITIZED'
  | 'EVALUATION_COMPLETED'
  | 'EVALUATION_DISAGREEMENT_FLAGGED'
  | 'EVALUATION_DISAGREEMENT_RESOLVED'
  | 'EVALUATION_WEIGHT_UPDATED';

export interface AuditLog {
  logId: string;
  problemId: string;
  actionType: AuditAction;
  performedByUserId: string | null;
  performedAt: string;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
  ipAddress: string | null;
}
