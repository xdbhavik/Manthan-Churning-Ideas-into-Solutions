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
  id?: string;
  key: string;
  sortOrder: number;
  label: string;
  description: string;
  maxScore: number;
  existingScore?: number | null;
  existingComment?: string | null;
}

// Assignments
export type AssignmentStatus = 'ASSIGNED' | 'IN_PROGRESS' | 'ACCEPTED' | 'SUBMITTED' | 'DECLINED' | 'EXPIRED' | 'REVIEWED' | 'REJECTED';
export interface AssignmentResponse {
  assignmentId: string;
  cycleId: string;
  problemId: string;
  evaluatorProfileId: string;
  status: AssignmentStatus;
  directGovernmentDecision?: boolean;
  cycleStatus?: string;
  assignedAt: string;
  deadline?: string;
  deadlineAt?: string;
  submittedAt?: string | null;
  declinedAt?: string | null;
  declineReason?: string | null;
  overdue: boolean;
  scoredCriteriaCount?: number;
  totalCriteriaCount?: number;
  finalScore?: number | null;
  problemTitle?: string;
  urgency?: string;
  criteriaCompleted?: number;
  criteriaTotal?: number;
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
  projectReviewId: string;
  submissionId: string;
  problemId: string;
  cycleId: string | null;
  problemTitle: string;
  submissionTitle: string;
  summary: string | null;
  githubUrl: string | null;
  links: Array<Record<string, string>>;
  round: number;
  status: ProjectReviewStatus;
  decisionComment: string | null;
  files: Array<{
    fileId: string;
    fileName: string;
    sizeBytes: number | null;
    contentType: string | null;
    contentUrl: string | null;
  }>;
  context?: Record<string, unknown>;
  createdAt: string;
  decidedAt: string | null;
}
export interface ProjectReviewListItem {
  projectReviewId: string;
  problemId: string;
  problemTitle: string;
  submissionTitle: string;
  round: number;
  status: ProjectReviewStatus;
  createdAt: string;
  decidedAt: string | null;
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
  sourceId?: string;
  sourceAccountId?: string | null;
  locationId?: string | null;
  existingIntervention?: string | null;
  submittedAt?: string;
  updatedAt?: string;
  submittedByUserId?: string | null;
  version?: number;
  metadata?: Record<string, unknown> | null;
  location?: string | null;
}
export interface ProjectReviewScorecardCriterion {
  key: string;
  label: string;
  description: string | null;
  maxScore: number;
  sortOrder: number;
}
export interface ProjectReviewCriterionScore {
  score: number | null;
  comment: string | null;
}
export interface ProjectReviewScorecardView {
  criteria: ProjectReviewScorecardCriterion[];
  status: 'NOT_STARTED' | 'DRAFT' | 'SUBMITTED';
  criteriaScores: Record<string, ProjectReviewCriterionScore>;
  overallRemarks: string | null;
  totalScore: number;
  maxScore: number;
  updatedAt: string | null;
  submittedAt: string | null;
}
export interface ProjectReviewScorecardRequest {
  criteriaScores: Record<string, ProjectReviewCriterionScore>;
  overallRemarks: string;
  submit: boolean;
}

export interface ProblemEvidenceResponse {
  evidenceId: string;
  problemId: string;
  evidenceType: string;
  fileUrl: string;
  fileHash: string;
  metadata: Record<string, unknown> | null;
  capturedAt: string | null;
  uploadedByUserId: string | null;
}

export interface AssignmentDetailResponse {
  assignment: AssignmentResponse;
  feedback: string | null;
  recommendation: string | null;
  problem: {
    problemId: string;
    status: string | null;
    title: string;
    description: string;
    sourceBucket: string | null;
    subEntityType: string | null;
    urgency: string | null;
    severity: string | null;
    affectedPopulation: number | null;
    expectedOutcome: string | null;
    existingIntervention: string | null;
    location: string | null;
    domains: string[];
    evidenceCount: number;
    accessRule: string | null;
    accessUniversities: string[];
  } | null;
  analysis: Record<string, unknown> | null;
  criteria: Array<{
    criterionId: string;
    criterionKey: string;
    criterionLabel: string;
    description: string;
    maxScore: number;
    sortOrder: number;
    myScore: number | null;
    myComment: string | null;
  }>;
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
