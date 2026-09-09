// Auth
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

// Evaluator Profile
export type EvaluatorType = 'GOVERNMENT' | 'INDUSTRY' | 'HEI' | 'CITIZEN' | 'COMMUNITY';
export interface EvaluatorProfileResponse {
  profileId: string;
  userId: string;
  evaluatorType: EvaluatorType;
  fullName: string;
  organization: string | null;
  designation: string | null;
  experienceYears: number | null;
  maxWorkload?: number;
  active?: boolean;
  regions?: string[];
  regionStates?: string[];
  status?: string;
  createdAt: string;
  updatedAt: string;
}
export interface CreateEvaluatorProfileRequest {
  userId: string;
  evaluatorType: EvaluatorType;
  fullName: string;
  organization?: string;
  designation?: string;
  experienceYears?: number;
  maxWorkload?: number;
}

// Criteria
export interface EvaluationCriteria {
  id: string;
  key: string;
  sortOrder: number;
  label: string;
  description: string;
  maxScore: number;
  existingScore?: number | null;
  existingComment?: string | null;
}

// Assignments
export type AssignmentStatus = 'ASSIGNED' | 'IN_PROGRESS' | 'SUBMITTED' | 'DECLINED' | 'EXPIRED' | 'REVIEWED';
export interface AssignmentResponse {
  assignmentId: string;
  cycleId: string;
  problemId: string;
  evaluatorProfileId: string;
  status: AssignmentStatus;
  cycleStatus: string;
  assignedAt: string;
  deadline: string;
  submittedAt: string | null;
  declinedAt: string | null;
  declineReason: string | null;
  overdue: boolean;
  scoredCriteriaCount: number;
  totalCriteriaCount: number;
  finalScore: number | null;
}
export interface CriterionScoreInput {
  criterionKey: string;
  score: number;
  comment?: string;
}
export interface ScorecardSubmitRequest {
  scores: CriterionScoreInput[];
  overallFeedback?: string;
  recommendation?: string;
}
export interface DeclineAssignmentRequest {
  reason?: string;
}

// Project Reviews
export type ProjectReviewStatus = 'ASSIGNED' | 'ACCEPTED' | 'RETURNED';
export interface SubmittedFile {
  fileId: string;
  fileName: string;
  fileSizeBytes: number;
  contentType: string;
  uploadedAt: string;
}
export interface ProjectReviewResponse {
  reviewId: string;
  submissionId: string;
  problemId: string;
  cycleId: string | null;
  problemTitle: string;
  submissionTitle: string;
  submissionSummary: string | null;
  githubUrl: string | null;
  additionalLinks: string[];
  submissionRound: number;
  reviewStatus: ProjectReviewStatus;
  existingDecisionComment: string | null;
  createdAt: string;
  decisionAt: string | null;
  submittedFiles: SubmittedFile[];
}
export interface ProjectReviewDecisionRequest {
  decision: 'ACCEPTED' | 'RETURNED';
  decisionComment?: string;
}

// Evaluation Cycle
export type EvaluationStatus =
  | 'RECEIVED' | 'ANALYZING' | 'ROUTING' | 'EVALUATION_IN_PROGRESS'
  | 'EVALUATION_COMPLETED' | 'SCORES_AGGREGATED' | 'PRIORITIZED'
  | 'PHASE_3_READY' | 'ANALYSIS_FAILED';

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

// Problem (may be unavailable)
export type ProblemStatus = 'SUBMITTED' | 'SOURCE_VERIFYING' | 'SOURCE_VERIFIED' | 'REGISTERED' | 'REJECTED' | 'ARCHIVED';
export interface ProblemResponse {
  problemId: string;
  title: string;
  description: string;
  sourceBucket: string;
  subEntityType: string;
  status: ProblemStatus;
  urgency: string;
  severity: string;
  expectedOutcome: string | null;
  affectedPopulation: number | null;
  domains?: string[];
  accessRule?: string;
  accessUniversities?: string[];
  evidenceCount?: number;
}

// AI Analysis
export interface AiAnalysisResponse {
  cycleId: string;
  analysisId: string | null;
  status: 'SUCCESS' | 'FAILED' | 'HEURISTIC_FALLBACK';
  provider: string | null;
  model: string | null;
  problemCategory: string | null;
  domain: string | null;
  sector: string | null;
  impactAreas: string[];
  complexityLevel: string | null;
  potentialScale: string | null;
  technologyRelevance: string | null;
  socialImpact: string | null;
  summary: string | null;
  errorMessage: string | null;
  latencyMs: number | null;
  analyzedAt: string | null;
}

// Routing Result
export interface RoutingResultResponse {
  cycleId: string;
  success: boolean;
  assignmentId: string | null;
  evaluatorProfileId: string | null;
  evaluatorPool: string | null;
  message: string | null;
}
