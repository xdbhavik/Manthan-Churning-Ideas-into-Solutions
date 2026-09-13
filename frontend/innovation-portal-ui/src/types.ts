// ----------------------------------------------------------------------------
// Innovation Portal types — mirror the portal-service / evaluation-service /
// source-service DTOs exactly as returned over the gateway (camelCase).
// ----------------------------------------------------------------------------

// ---- Auth (source-service) ----
export type JwtRole = 'SUBMITTER' | 'REVIEWER' | 'ADMIN' | 'EVALUATOR';

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
  role: JwtRole;
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

// ---- Portal participant ----
export type ParticipantType = 'STUDENT' | 'UNIVERSITY';

export interface Participant {
  participantId: string;
  participantType: ParticipantType | null;
  fullName: string;
  email: string | null;
  phone: string | null;
  institutionName: string | null;
  sourceAccountId: string | null;
}

export interface ParticipantRegisterRequest {
  fullName: string;
  email?: string;
  phone?: string;
}

// ---- Published problem (portal-service) ----
export type SourceBucket = 'GOVT' | 'CITIZEN' | 'INDUSTRY' | 'COMMUNITY' | 'HEI';
export type Urgency = 'IMMEDIATE' | 'SHORT_TERM' | 'LONG_TERM';
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type AccessRule = 'OPEN_TO_ALL' | 'UNIVERSITY_ONLY' | 'SELECTED_UNIVERSITIES';

export interface PublishedProblem {
  problemId: string;
  cycleId?: string;
  title: string;
  description?: string;
  expectedOutcome?: string | null;
  sourceBucket: SourceBucket | null;
  subEntityType?: string | null;
  urgency?: Urgency | null;
  severity?: Severity | null;
  location?: string | null;
  domains: string[];
  evidenceCount: number;
  accessRule: AccessRule | null;
  accessUniversities?: string[];
  publishedAt: string;
}

// ---- Submission (portal-service) ----
export type SubmissionStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'ACCEPTED' | 'RETURNED';

export interface SubmissionFile {
  fileId: string;
  fileName: string;
  fileSize: string;
  sizeBytes: number;
  contentType: string | null;
  sha256: string;
  uploadedAt: string;
  downloadUrl?: string;
}

export interface FileItem {
  fileId: string;
  originalName: string;
  contentType: string | null;
  sizeBytes: number;
  sha256: string;
  uploadedAt: string;
}

export interface TeamMemberBrief {
  participantId: string;
  fullName: string;
}

export interface TeamBrief {
  teamId: string;
  name: string;
  members: TeamMemberBrief[];
}

export interface SubmissionLink {
  label: string;
  url: string;
}

export interface Submission {
  submissionId: string;
  problemId: string;
  teamId: string | null;
  title: string | null;
  summary: string | null;
  githubUrl: string | null;
  links: SubmissionLink[];
  status: SubmissionStatus;
  reviewRound: number;
  reviewerUserId: string | null;
  decisionComment: string | null;
  submittedAt: string | null;
  decidedAt: string | null;
  files: FileItem[];
  team: TeamBrief | null;
}

export interface SubmissionCreateRequest {
  problemId: string;
  title?: string;
  summary?: string;
  githubUrl?: string;
  links?: SubmissionLink[];
  teamName?: string;
  memberUserIds?: string[];
}

export interface SubmissionMetaRequest {
  title?: string;
  summary?: string;
  githubUrl?: string;
  links?: SubmissionLink[];
}

// ---- Project review (evaluation-service) ----
export type ProjectReviewStatus = 'ASSIGNED' | 'ACCEPTED' | 'RETURNED';

export interface ProjectReview {
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
  submittedFiles: FileItem[];
}

export interface ProjectReviewDecisionRequest {
  decision: 'ACCEPTED' | 'RETURNED';
  decisionComment?: string;
}

// ---- Evaluation cycle / queue (evaluation-service) ----
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

export interface EvaluationCycle {
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

export interface EvaluationCriteria {
  id: string;
  key: string;
  sortOrder: number;
  label: string;
  description: string;
  maxScore: number;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

// ---- Shared navigation ----
export type NavPath =
  | 'overview'
  | 'problem-catalog'
  | 'my-submissions'
  | 'project-review-queue'
  | 'evaluation-rubrics'
  | 'admin-cycles-and-publish'
  | 'nodal-officers-directory'
  | 'my-profile';