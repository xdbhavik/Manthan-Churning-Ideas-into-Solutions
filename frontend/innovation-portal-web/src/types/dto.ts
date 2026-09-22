// ----------------------------------------------------------------------------
// Backend DTO types — mirror portal-service / source-service contracts exactly
// (camelCase). Participant-only scope. `commitSha`/`branch` included (backend V3).
// ----------------------------------------------------------------------------

export type JwtRole = 'SUBMITTER' | 'REVIEWER' | 'ADMIN' | 'EVALUATOR';

// ---- Auth (source-service) ----
export interface OtpRequest {
  phone: string;
  email?: string | null;
}

export interface OtpResponse {
  challengeId: string;
  expiresAt: string;
  devOtp: string | null;
  requestsRemainingInWindow: number;
}

export interface VerifyOtpRequest {
  challengeId: string;
  code: string;
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

export interface RefreshRequest {
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
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

export interface ParticipantUpdateRequest {
  fullName?: string;
  email?: string | null;
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
  commitSha: string | null;
  branch: string | null;
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
  commitSha?: string;
  branch?: string;
  links?: SubmissionLink[];
  teamName?: string;
  memberUserIds?: string[];
}

export interface SubmissionMetaRequest {
  title?: string;
  summary?: string;
  githubUrl?: string;
  commitSha?: string;
  branch?: string;
  links?: SubmissionLink[];
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}
