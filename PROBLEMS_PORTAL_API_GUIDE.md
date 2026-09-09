# Problems Portal - Frontend Development Guide

This guide specifies how to build the frontend client for the **Problems Portal** feature. The backend microservice (`portal-service`) is fully implemented, containerized, and routed through the API Gateway. **No backend changes are required or permitted.**

---

## 1. Feature Overview

The **Problems Portal** is the public-facing catalog and project submission portal for students and universities in the SIH26043 platform. After problem statements submitted by sources undergo evaluation and scoring in `evaluation-service`, approved problems are published directly into the portal catalog.

### Core Objectives
1. **Participant Identity & Onboarding**:
   - **University Participants**: Users owning an `ACTIVE` and `VERIFIED` Higher Education Institution (`HEI`) source account are automatically bound as `UNIVERSITY` participants upon first contact. No manual registration needed.
   - **Student Participants**: Regular users can self-register with their full name, email, and phone to participate as `STUDENT` participants.
2. **Access-Controlled Problem Catalog**:
   - Participants browse and inspect published problems filtered strictly by their participant type and institution matching (`OPEN_TO_ALL`, `UNIVERSITY_ONLY`, `SELECTED_UNIVERSITIES`).
3. **Project Submissions & Team Collaboration**:
   - Participants create **Individual** or **Team** submissions (with defined member participant IDs).
   - Authors manage draft submissions, attach repository links, live demos, and upload project files/artifacts (up to 50 MB per file).
4. **Lifecycle & Review Flow**:
   - Submissions move through: `DRAFT` &rarr; `UNDER_REVIEW` &rarr; `ACCEPTED` or `RETURNED`.
   - If returned with evaluator feedback, teams can modify their metadata, update files, and resubmit for subsequent review rounds.

---

## 2. API Reference

All requests must route through the central Gateway baseUrl (default: `http://localhost:8080`).

### Authentication & Gateway Overview
- **Gateway Route**: `/portal/**` &rarr; proxied to `portal-service:8084`.
- **Auth Header**: `Authorization: Bearer <jwt_access_token>`.
- **Identity Context**: Stateless JWT containing `userId`, `phone`, and platform `role`. Portal controllers resolve caller identity internally via `@AuthenticationPrincipal AuthUser`.

---

### Endpoint 1: Get Current Participant Profile
- **Method & Path**: `GET /portal/me`
- **Auth**: Required (`Bearer <JWT>`)
- **Description**: Returns the caller's portal participant profile. If the user owns an active and verified HEI source account and accesses this endpoint for the first time, a `UNIVERSITY` participant record is auto-created.
- **Request Body / Query Params**: None.
- **Success Response (`200 OK`)**:
```json
{
  "participantId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "participantType": "STUDENT", // "STUDENT" | "UNIVERSITY"
  "fullName": "Aarav Sharma",
  "email": "aarav@example.edu",
  "phone": "+919876543210",
  "institutionName": null,      // Non-null for UNIVERSITY participants
  "sourceAccountId": null       // UUID string if UNIVERSITY, null if STUDENT
}
```
- **Error Responses**:
  - `401 Unauthorized`: Missing or invalid JWT.
  - `404 Not Found`: `STUDENT_NOT_REGISTERED` — User has no HEI account and has not yet registered as a student. *Frontend must redirect to Student Registration.*

---

### Endpoint 2: Register as Student
- **Method & Path**: `POST /portal/participants`
- **Auth**: Required (`Bearer <JWT>`)
- **Description**: Registers the caller as a `STUDENT` participant.
- **Request Headers**: `Content-Type: application/json`
- **Request Body**:
```typescript
interface ParticipantRegisterRequest {
  fullName: string;      // Required, max 150 chars, non-blank
  email?: string;        // Optional, valid email format, max 255 chars
  phone?: string;        // Optional, max 20 chars (falls back to JWT phone)
}
```
*Example Payload:*
```json
{
  "fullName": "Pooja Patel",
  "email": "pooja.patel@college.edu",
  "phone": "+919876501234"
}
```
- **Success Response (`201 Created`)**: Returns `ParticipantResponse` (same shape as `/portal/me`).
- **Error Responses**:
  - `400 Bad Request`: Validation failure (e.g. `fullName` missing, invalid email).
  - `409 Conflict`: 
    - `"A portal participant already exists for this user"`
    - `"HEI_ACCOUNT_REGISTERED_AS_UNIVERSITY — this user owns a verified university source account and is bound as a UNIVERSITY participant"`

---

### Endpoint 3: List Published Problems
- **Method & Path**: `GET /portal/problems`
- **Auth**: Required (`Bearer <JWT>`)
- **Description**: Retrieves published problems visible to the caller based on access rules, ordered newest first. Restricted problems are excluded at the database/service layer.
- **Request Body / Query Params**: None.
- **Success Response (`200 OK`)**:
```json
[
  {
    "problemId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "title": "Automated Crop Disease Detection via Edge Computing",
    "expectedOutcome": "Mobile application and lightweight neural net detecting leaf blight.",
    "sourceBucket": "GOVERNMENT",        // "MINISTRY" | "STATE_DEPT" | "AGENCY" | "PSU" | "INDUSTRY" | "NGO" | "CITIZEN" | "HEI"
    "subEntityType": "AGRICULTURE",      // Sub-domain entity enum string
    "urgency": "HIGH",                   // "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
    "severity": "MAJOR",                 // "MINOR" | "MODERATE" | "MAJOR" | "CRITICAL"
    "location": "Pune, Maharashtra",
    "domains": ["AI/ML", "IoT", "Agriculture"],
    "evidenceCount": 2,
    "accessRule": "OPEN_TO_ALL",         // "OPEN_TO_ALL" | "UNIVERSITY_ONLY" | "SELECTED_UNIVERSITIES"
    "publishedAt": "2026-09-08T10:15:30Z"
  }
]
```
- **Error Responses**:
  - `401 Unauthorized`
  - `404 Not Found`: Caller not registered as a participant.

---

### Endpoint 4: Get Published Problem Detail
- **Method & Path**: `GET /portal/problems/{problemId}`
- **Auth**: Required (`Bearer <JWT>`)
- **Description**: Returns detailed problem specifications, including full markdown description and access constraints.
- **Path Parameters**: `problemId` (UUID string)
- **Success Response (`200 OK`)**:
```json
{
  "problemId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "title": "Automated Crop Disease Detection via Edge Computing",
  "description": "Full statement of the problem in rich markdown or text...",
  "expectedOutcome": "Mobile application and lightweight neural net detecting leaf blight.",
  "sourceBucket": "GOVERNMENT",
  "subEntityType": "AGRICULTURE",
  "urgency": "HIGH",
  "severity": "MAJOR",
  "location": "Pune, Maharashtra",
  "domains": ["AI/ML", "IoT", "Agriculture"],
  "evidenceCount": 2,
  "accessRule": "SELECTED_UNIVERSITIES",
  "accessUniversities": ["COEP Technological University", "IIT Bombay"],
  "publishedAt": "2026-09-08T10:15:30Z"
}
```
- **Error Responses**:
  - `400 Bad Request`: `problemId` is not a valid UUID format.
  - `404 Not Found`: Problem not found or caller cannot view this problem under access constraints.

---

### Endpoint 5: List My Submissions
- **Method & Path**: `GET /portal/submissions`
- **Auth**: Required (`Bearer <JWT>`)
- **Description**: Returns all submissions where the caller is either the direct submitter or a registered team member, ordered by last updated descending.
- **Request Body / Query Params**: None.
- **Success Response (`200 OK`)**: Array of `SubmissionView` objects (see [Submission Data Model](#submission-models)).
- **Error Responses**:
  - `401 Unauthorized`
  - `404 Not Found`: Caller is not a registered participant.

---

### Endpoint 6: Create Submission (Draft)
- **Method & Path**: `POST /portal/submissions`
- **Auth**: Required (`Bearer <JWT>`)
- **Description**: Creates a new submission in `DRAFT` state for a visible problem. Specifying `memberUserIds` (and optionally `teamName`) automatically creates a `Team` record.
- **Request Headers**: `Content-Type: application/json`
- **Request Body**:
```typescript
interface SubmissionCreateRequest {
  problemId: string;                     // Required UUID
  title?: string;                        // Max 255 chars
  summary?: string;                      // Max 20000 chars
  githubUrl?: string;                    // Max 500 chars
  links?: Array<{ [key: string]: string }>; // e.g. [{"label": "Figma", "url": "https://..."}]
  teamName?: string;                     // Max 150 chars (defaults to "Team for <Problem Title>" if empty)
  memberUserIds?: string[];              // Participant UUIDs of team members (excluding caller)
}
```
*Example Payload (Individual):*
```json
{
  "problemId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "title": "Smart AgroEdge Prototype",
  "summary": "Edge-computed CNN model with Flutter companion client.",
  "githubUrl": "https://github.com/example/smart-agro-edge",
  "links": [
    { "label": "Demo Video", "url": "https://youtu.be/sample" }
  ]
}
```
*Example Payload (Team):*
```json
{
  "problemId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "title": "Team AgroEdge Solution",
  "summary": "Cross-platform IoT node + cloud telemetry pipeline.",
  "teamName": "CyberKnights",
  "memberUserIds": ["c1e23456-789a-bcde-f012-3456789abcde"]
}
```
- **Success Response (`201 Created`)**: Returns created `SubmissionView`.
- **Error Responses**:
  - `400 Bad Request`: Missing `problemId` or invalid JSON.
  - `403 Forbidden`: Caller or one of the specified team members is not permitted to see the problem.
  - `404 Not Found`: Problem ID or a specified member ID does not exist.
  - `409 Conflict`: `"You already have an active submission for this problem"` (applies if an active `DRAFT`, `SUBMITTED`, or `UNDER_REVIEW` submission already exists for the submitter).

---

### Endpoint 7: Get Submission Detail
- **Method & Path**: `GET /portal/submissions/{submissionId}`
- **Auth**: Required (`Bearer <JWT>`)
- **Description**: Returns detailed view of a submission. Caller must be the submitter or a team member.
- **Path Parameters**: `submissionId` (UUID)
- **Success Response (`200 OK`)**: Returns `SubmissionView`.
- **Error Responses**:
  - `403 Forbidden`: Caller is neither submitter nor team member.
  - `404 Not Found`: Submission does not exist.

---

### Endpoint 8: Update Submission Metadata
- **Method & Path**: `PATCH /portal/submissions/{submissionId}`
- **Auth**: Required (`Bearer <JWT>`)
- **Description**: Updates descriptive fields of a submission. Allowed **only** when status is `DRAFT` or `RETURNED`. Null or omitted fields are left unmodified.
- **Path Parameters**: `submissionId` (UUID)
- **Request Body**:
```typescript
interface SubmissionMetaRequest {
  title?: string;                        // Max 255 chars
  summary?: string;                      // Max 20000 chars
  githubUrl?: string;                    // Max 500 chars
  links?: Array<{ [key: string]: string }>;
}
```
- **Success Response (`200 OK`)**: Returns updated `SubmissionView`.
- **Error Responses**:
  - `403 Forbidden`: Caller cannot modify this submission.
  - `409 Conflict`: `"Submission meta is frozen unless the status is DRAFT or RETURNED"`.

---

### Endpoint 9: Submit for Review
- **Method & Path**: `POST /portal/submissions/{submissionId}/submit`
- **Auth**: Required (`Bearer <JWT>`)
- **Description**: Submits the draft or returned submission. Validates presence of at least one artifact (title, summary, GitHub URL, external links, or uploaded file), increments `reviewRound`, synchronizes with `evaluation-service`, and transitions status to `UNDER_REVIEW`.
- **Path Parameters**: `submissionId` (UUID)
- **Request Body**: None.
- **Success Response (`200 OK`)**: Returns updated `SubmissionView` with `status: "UNDER_REVIEW"`, bumped `reviewRound`, and populated `submittedAt`.
- **Error Responses**:
  - `400 Bad Request`: `"Add at least a title and summary, a file, or a GitHub/link before submitting"`.
  - `403 Forbidden`: Caller is not submitter or team member.
  - `409 Conflict`: Submission is not in `DRAFT` or `RETURNED` status.
  - `502 Bad Gateway`: Evaluation service downstream is unreachable or rejected review creation (the transaction automatically rolls back).

---

### Endpoint 10: List Submission Files
- **Method & Path**: `GET /portal/submissions/{submissionId}/files`
- **Auth**: Required (`Bearer <JWT>`)
- **Description**: Lists file metadata attachments for a submission.
- **Path Parameters**: `submissionId` (UUID)
- **Success Response (`200 OK`)**: Array of `FileItemView`:
```json
[
  {
    "fileId": "6c4e09f1-3d71-482a-a92c-564d2629bbf4",
    "originalName": "architecture_diagram.png",
    "contentType": "image/png",
    "sizeBytes": 2048576,
    "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "uploadedAt": "2026-09-08T12:00:00Z"
  }
]
```
- **Error Responses**:
  - `403 Forbidden`: Caller not authorized to read files.
  - `404 Not Found`: Submission does not exist.

---

### Endpoint 11: Upload Submission File
- **Method & Path**: `POST /portal/submissions/{submissionId}/files`
- **Auth**: Required (`Bearer <JWT>`)
- **Description**: Uploads a single file artifact (maximum size: 50 MB). Only allowed when submission is `DRAFT` or `RETURNED`.
- **Path Parameters**: `submissionId` (UUID)
- **Request Headers**: `Content-Type: multipart/form-data`
- **Form Data**:
  - `file`: Binary file part (field name must be `"file"`).
- **Success Response (`201 Created`)**: Returns `FileItemView`.
- **Error Responses**:
  - `400 Bad Request`: Malformed file or invalid filename.
  - `403 Forbidden`: Caller is not a submitter or team member.
  - `409 Conflict`: `"Files are frozen unless the submission is DRAFT or RETURNED"`.
  - `413 Payload Too Large`: File exceeds the 50 MB multipart cap.

---

### Endpoint 12: Delete Submission File
- **Method & Path**: `DELETE /portal/submissions/{submissionId}/files/{fileId}`
- **Auth**: Required (`Bearer <JWT>`)
- **Description**: Permanently removes an attached file. Only allowed when submission is `DRAFT` or `RETURNED`.
- **Path Parameters**:
  - `submissionId`: UUID
  - `fileId`: UUID
- **Success Response (`204 No Content`)**
- **Error Responses**:
  - `403 Forbidden`: Not submitter or team member.
  - `404 Not Found`: File or submission not found.
  - `409 Conflict`: Submission is frozen (not in `DRAFT` or `RETURNED`).

---

### Endpoint 13: Download Submission File
- **Method & Path**: `GET /portal/files/{fileId}/download`
- **Auth**: Required (`Bearer <JWT>`)
- **Description**: Streams the file binary with appropriate `Content-Type`, `Content-Length`, and `Content-Disposition: attachment; filename="..."`.
- **Path Parameters**: `fileId` (UUID)
- **Success Response (`200 OK`)**: File binary stream.
- **Error Responses**:
  - `403 Forbidden`: Caller is neither the submitter, team member, assigned reviewer, nor staff (`ADMIN`/`REVIEWER`).
  - `404 Not Found`: File not found.

---

## 3. Data Models

### TypeScript Interfaces

```typescript
// Participant Types
export type ParticipantType = 'STUDENT' | 'UNIVERSITY';

export interface ParticipantProfile {
  participantId: string;
  participantType: ParticipantType;
  fullName: string;
  email: string | null;
  phone: string | null;
  institutionName: string | null;
  sourceAccountId: string | null;
}

// Problem Catalog Models
export type ProblemAccessRule = 'OPEN_TO_ALL' | 'UNIVERSITY_ONLY' | 'SELECTED_UNIVERSITIES';
export type UrgencyLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type SeverityLevel = 'MINOR' | 'MODERATE' | 'MAJOR' | 'CRITICAL';

export interface PublishedProblemSummary {
  problemId: string;
  title: string;
  expectedOutcome: string | null;
  sourceBucket: string | null;
  subEntityType: string | null;
  urgency: UrgencyLevel | null;
  severity: SeverityLevel | null;
  location: string | null;
  domains: string[];
  evidenceCount: number;
  accessRule: ProblemAccessRule | null;
  publishedAt: string; // ISO-8601 string
}

export interface PublishedProblemDetail extends PublishedProblemSummary {
  description: string;
  accessUniversities: string[];
}

// Submission Models
export type SubmissionStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'ACCEPTED'
  | 'RETURNED';

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

export interface TeamInfo {
  teamId: string;
  name: string;
  members: TeamMemberBrief[];
}

export interface SubmissionDetail {
  submissionId: string;
  problemId: string;
  teamId: string | null;
  title: string | null;
  summary: string | null;
  githubUrl: string | null;
  links: Array<{ [key: string]: string }>;
  status: SubmissionStatus;
  reviewRound: number;
  reviewerUserId: string | null;
  decisionComment: string | null;
  submittedAt: string | null;
  decidedAt: string | null;
  files: FileItem[];
  team: TeamInfo | null;
}

// Standard RFC-7807 Backend Error Response
export interface ApiProblemDetail {
  type: string;
  title?: string;
  status: number;
  detail: string;
  instance?: string;
  fieldErrors?: Record<string, string>;
}
```

---

## 4. UI Components Breakdown

```
src/
├── features/
│   ├── portal/
│   │   ├── components/
│   │   │   ├── ProblemCard.tsx
│   │   │   ├── ProblemFilters.tsx
│   │   │   ├── SubmissionStatusBadge.tsx
│   │   │   ├── FileUploadZone.tsx
│   │   │   ├── FileListTable.tsx
│   │   │   ├── TeamMembersInput.tsx
│   │   │   ├── ReviewFeedbackBanner.tsx
│   │   │   └── LinksEditor.tsx
│   │   ├── pages/
│   │   │   ├── StudentRegistrationModal.tsx
│   │   │   ├── ProblemsCatalogPage.tsx
│   │   │   ├── ProblemDetailPage.tsx
│   │   │   ├── MySubmissionsPage.tsx
│   │   │   ├── CreateSubmissionModal.tsx
│   │   │   └── SubmissionWorkspacePage.tsx
```

### Component Specifications

#### 1. `StudentRegistrationModal`
- **Props**: `{ isOpen: boolean; onSuccess: (profile: ParticipantProfile) => void; }`
- **Role**: Blocks interactions when a user encounters a `404 STUDENT_NOT_REGISTERED` error. Collects `fullName`, optional `email`, and `phone`. Submits via `POST /portal/participants`.

#### 2. `ProblemCard`
- **Props**: `{ problem: PublishedProblemSummary; onSelect: (id: string) => void; }`
- **Role**: Displays title, domain chips, location, severity/urgency indicators, evidence count, and access badge (`OPEN_TO_ALL` vs `UNIVERSITY_ONLY`).

#### 3. `ProblemFilters`
- **Props**: `{ domains: string[]; selectedDomain: string; onSelectDomain: (d: string) => void; searchQuery: string; onSearchChange: (q: string) => void; }`
- **Role**: Client-side filtering bar for domains, search terms, and severity tags.

#### 4. `SubmissionStatusBadge`
- **Props**: `{ status: SubmissionStatus; reviewRound: number; }`
- **Role**: Color-coded pill with status labels:
  - `DRAFT`: Gray / Slate
  - `UNDER_REVIEW`: Amber / Yellow ("Round X Under Review")
  - `RETURNED`: Red / Rose ("Action Needed: Returned")
  - `ACCEPTED`: Emerald / Green ("Accepted")

#### 5. `ReviewFeedbackBanner`
- **Props**: `{ status: SubmissionStatus; decisionComment?: string | null; reviewRound: number; }`
- **Role**: Prominently displays evaluator feedback when `status === 'RETURNED'`, alerting the user to make changes and submit a new round.

#### 6. `FileUploadZone` & `FileListTable`
- **Props**:
  - `FileUploadZone`: `{ submissionId: string; disabled: boolean; onUploadSuccess: (file: FileItem) => void; }`
  - `FileListTable`: `{ files: FileItem[]; canEdit: boolean; onDelete: (fileId: string) => void; onDownload: (fileId: string, name: string) => void; }`
- **Role**: Drag-and-drop file uploader supporting up to 50 MB files; renders file size (formatted in KB/MB), date, and action icons (delete / download).

#### 7. `LinksEditor`
- **Props**: `{ links: Array<{ label: string; url: string }>; onChange: (links: Array<{ label: string; url: string }>) => void; disabled: boolean; }`
- **Role**: Key-value pair editor for documentation links, live demos, and design files.

---

## 5. State Management

```
               [ Auth Context (JWT, User Info) ]
                               │
               [ Participant Context (Profile) ]
               ┌───────────────┴───────────────┐
      [ Catalog State ]               [ Submission State ]
      - problems: Problem[]           - MySubmissions: SubmissionDetail[]
      - filteredProblems: Problem[]   - activeDraft: SubmissionDetail | null
      - selectedDomain: string        - uploadProgress: Record<string, number>
      - searchQuery: string           - isSubmittingRound: boolean
```

### Key State Stores
1. **`ParticipantContext`**:
   - `profile`: `ParticipantProfile | null`
   - `isRegistered`: `boolean`
   - `isLoading`: `boolean`
   - Initial call on app load: `GET /portal/me`. If `404`, triggers registration dialog.
2. **`ProblemsCatalogStore`**:
   - `problems`: Cache of all visible problems.
   - `filters`: Search text, domain selection, urgency/severity filter.
3. **`SubmissionWorkspaceStore`**:
   - `activeSubmission`: Detailed view of the submission being edited.
   - `isEditable`: Derived boolean (`status === 'DRAFT' || status === 'RETURNED'`).
   - `isDirty`: Unsaved metadata form changes.

---

## 6. User Flows

### Flow 1: Portal Onboarding
```
User navigates to /portal
         │
    GET /portal/me
         │
    ┌────┴──────────────────────────┐
200 OK                        404 Not Found
    │                               │
Store Profile              Show StudentRegistrationModal
Load Catalog                        │
                               POST /portal/participants
                                    │
                               Set Profile & Load Catalog
```

### Flow 2: Problem Discovery to Submission Creation
```
Browse /portal/problems
         │
Click Problem Card ──> GET /portal/problems/{problemId}
         │
Click "Start Submission"
         │
Modal: Choose "Individual" OR "Team"
- If Team: Provide teamName + comma-separated Member Participant IDs
         │
POST /portal/submissions
         │
Redirect to /portal/submissions/{submissionId} (Submission Workspace)
```

### Flow 3: Authoring & Submitting
```
Submission Workspace (status: DRAFT or RETURNED)
         │
 ┌───────┼──────────────────────────┐
 │       │                          │
Edit Meta (Title,       Upload File Artifacts      Add Links
Summary, GitHub)        POST .../files             (Demo, Docs)
 │       │                          │
 └───────┬──────────────────────────┘
         │
Save Draft (PATCH /portal/submissions/{submissionId})
         │
Click "Submit for Review"
         │
Check: At least one artifact provided?
 ├── No  ──> Show client validation toast
 └── Yes ──> POST /portal/submissions/{submissionId}/submit
                 │
            Status changes to UNDER_REVIEW
            Workspace switches to Read-Only Mode
```

### Flow 4: Review Decision Handling
```
Submission is UNDER_REVIEW
         │
Evaluator marks ACCEPTED or RETURNED
         │
User opens /portal/submissions/{submissionId}
         │
 ├── If ACCEPTED: Shows success banner & accepted badge. All edits locked.
 └── If RETURNED: Shows ReviewFeedbackBanner with evaluator comment.
                  Workspace switches back to Editable Mode.
                  User updates files/meta and re-submits (Round X + 1).
```

---

## 7. Edge Cases & Error Handling

| Scenario | HTTP Status | Backend Response Detail | Frontend Handling |
|---|---|---|---|
| User is not registered as a student | `404` | `"STUDENT_NOT_REGISTERED — register at POST /portal/participants..."` | Display `StudentRegistrationModal`. Do not treat as generic 404 page. |
| Duplicate Student Registration | `409` | `"A portal participant already exists for this user"` or `"HEI_ACCOUNT_REGISTERED_AS_UNIVERSITY..."` | Fetch `/portal/me` immediately and sync state. |
| Submitting without artifacts | `400` | `"Add at least a title and summary, a file, or a GitHub/link before submitting"` | Prevent submit button click with frontend validation; show toast if API rejects. |
| Active submission exists | `409` | `"You already have an active submission for this problem"` | Alert user: "You already have an active draft or submission under review for this problem." Provide button to view existing submission. |
| Member lacks permission | `403` | `"Member <UUID> cannot see this problem under its access rule"` | Flag invalid team member ID in the team creation form. |
| Attempting edits on frozen submission | `409` | `"Submission meta is frozen unless the status is DRAFT or RETURNED"` | Ensure inputs are disabled when status is `SUBMITTED`, `UNDER_REVIEW`, or `ACCEPTED`. |
| Downstream evaluation service failure | `502` | `"Evaluation service unreachable / rejected"` | Show error notification: "Review submission pipeline is temporarily busy. Your draft was not modified. Please retry in a few moments." |
| File size limit exceeded | `413` | Spring multipart max size exceeded | Client check: validate `file.size <= 50 * 1024 * 1024` (50 MB) before triggering upload. |
| Invalid UUID format in URL | `400` | `"Invalid value for parameter 'submissionId'"` | Redirect to `/portal/submissions` with an "Invalid submission ID" notification. |

---

## 8. Frontend Implementation Boilerplate

### API Service Module (`src/features/portal/api.ts`)

```typescript
const BASE_URL = 'http://localhost:8080';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('access_token');
  const headers = new Headers(options.headers || {});
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (!response.ok) {
    let errorDetail = 'Request failed';
    try {
      const problem = await response.json();
      errorDetail = problem.detail || problem.title || errorDetail;
    } catch {
      errorDetail = response.statusText;
    }
    const error = new Error(errorDetail);
    (error as any).status = response.status;
    throw error;
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const portalApi = {
  // Participant
  getProfile: () => request<ParticipantProfile>('/portal/me'),
  registerStudent: (data: { fullName: string; email?: string; phone?: string }) =>
    request<ParticipantProfile>('/portal/participants', {\n      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Catalog
  getProblems: () => request<PublishedProblemSummary[]>('/portal/problems'),
  getProblemDetail: (problemId: string) =>
    request<PublishedProblemDetail>(`/portal/problems/${problemId}`),

  // Submissions
  getMySubmissions: () => request<SubmissionDetail[]>('/portal/submissions'),
  createSubmission: (data: {
    problemId: string;
    title?: string;
    summary?: string;
    githubUrl?: string;
    links?: Array<{ [key: string]: string }>;
    teamName?: string;
    memberUserIds?: string[];
  }) =>
    request<SubmissionDetail>('/portal/submissions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getSubmission: (submissionId: string) =>
    request<SubmissionDetail>(`/portal/submissions/${submissionId}`),
  updateMeta: (
    submissionId: string,
    data: {
      title?: string;
      summary?: string;
      githubUrl?: string;
      links?: Array<{ [key: string]: string }>;
    }
  ) =>
    request<SubmissionDetail>(`/portal/submissions/${submissionId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  submitReview: (submissionId: string) =>
    request<SubmissionDetail>(`/portal/submissions/${submissionId}/submit`, {
      method: 'POST',
    }),

  // Files
  listFiles: (submissionId: string) =>
    request<FileItem[]>(`/portal/submissions/${submissionId}/files`),
  uploadFile: (submissionId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return request<FileItem>(`/portal/submissions/${submissionId}/files`, {
      method: 'POST',
      body: formData,
    });
  },
  deleteFile: (submissionId: string, fileId: string) =>
    request<void>(`/portal/submissions/${submissionId}/files/${fileId}`, {
      method: 'DELETE',
    }),
  downloadFileUrl: (fileId: string) => `${BASE_URL}/portal/files/${fileId}/download`,
};
```

---

## 9. Constraints & Developer Notes

1. **No Backend Pagination**:
   - `GET /portal/problems` and `GET /portal/submissions` return complete unpaginated lists sorted newest first. Implement client-side pagination or virtual scrolling.
2. **Access-Rule Strictness**:
   - If a participant lacks permission for a problem statement, `GET /portal/problems/{problemId}` returns `404 Not Found` (never `403`) to ensure problem existence is not leaked.
3. **One Active Submission Rule**:
   - Participants can only have **one** active submission (`DRAFT`, `SUBMITTED`, or `UNDER_REVIEW`) per problem. If a past submission was `ACCEPTED`, they may draft another if allowed by program rules, but active drafts collide with `409 Conflict`.
4. **File Download Authorization**:
   - Downloads on `/portal/files/{fileId}/download` enforce strict authorization checks. Always attach the `Authorization: Bearer <JWT>` header when downloading via `fetch` or blob streaming rather than using simple `<a href="...">` tags.
5. **Team Member Identification**:
   - Team member inclusion takes a list of `memberUserIds` which correspond to **Participant IDs**, not source account IDs. The creator must not include their own ID in `memberUserIds` (the leader role is assigned automatically).
