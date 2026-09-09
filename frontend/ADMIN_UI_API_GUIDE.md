# Admin UI - Backend API Analysis & Feature Guide

Based on analysis of all backend services, here's what the admin-ui should implement.

---

## User Roles & Permissions

| Role | Source Service | Evaluation Service | Portal | Problem Service |
|------|---------------|-------------------|--------|----------------|
| **ADMIN** | Full access | Full access | - | Full access |
| **REVIEWER** | Review queue, decisions, verification | Evaluation queue, start/analyze/route | - | Status changes, audit |
| **EVALUATOR** | - | My assignments, scoring | - | - |
| **SUBMITTER** | Register, submit problems | - | Submit to portal | Submit problems |

---

## 1. Authentication & User Management (`/auth`, `/users`)

### Auth Endpoints (Public)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new SUBMITTER (returns OTP challenge) |
| POST | `/auth/login` | Login OTP for existing user |
| POST | `/auth/verify-otp` | Verify OTP → returns JWT access + refresh tokens |
| POST | `/auth/refresh` | Rotate refresh token (returns new pair) |
| POST | `/auth/logout` | Revoke refresh token |

### User Management (ADMIN only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users/{id}` | Get any user profile |
| PATCH | `/users/{id}/role` | Change role (SUBMITTER → REVIEWER → ADMIN) |
| POST | `/users/evaluators` | Create EVALUATOR account + OTP challenge |

### Frontend Features Needed
- **Login Page**: Phone + OTP flow (register/login/verify)
- **Token Management**: Auto-refresh before expiry, logout
- **Admin User Table**: List users, search/filter, change role inline
- **Evaluator Onboarding Form**: Create evaluator (phone → returns OTP for them)

---

## 2. Source Registration Review (`/reviewer/registrations`)

**Role: REVIEWER / ADMIN**

### Queue & List
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/reviewer/registrations` | Queue: SUBMITTED, UNDER_REVIEW, ACTION_REQUIRED (FIFO). Optional `?status=` filter |

### Decisions (each appends history)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/reviewer/registrations/{id}/assign` | Claim → SUBMITTED → UNDER_REVIEW |
| POST | `/reviewer/registrations/{id}/approve` | **Creates SourceAccount** (ACTIVE+VERIFIED), sets owner KYC=VERIFIED. Optional `comment` |
| POST | `/reviewer/registrations/{id}/reject` | Requires `reason` (shown to submitter) |
| POST | `/reviewer/registrations/{id}/request-action` | Sets ACTION_REQUIRED, requires `comment` |

### Frontend Features Needed
- **Reviewer Dashboard**: Queue table with status badges, filters, pagination
- **Registration Detail Modal**: View full registration JSON, evidence, source type
- **Decision Actions**: Assign/Approve/Reject/Request-Action buttons with comment modals
- **History Timeline**: Show status history per registration

---

## 3. Source Account Verification (`/sources`)

**Role: REVIEWER / ADMIN**

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/sources/{id}/verify` | Record verification check: `result` (PASS/FAIL/NEEDS_REVIEW), `method` (OFFICIAL_EMAIL, AUTHORIZATION_DOC, OTP, REGISTRATION_API, INSTITUTIONAL_EMAIL, MANUAL_REVIEW), optional `documentRef` |

### Frontend Features Needed
- **Verification Panel**: On source account detail, add verification records
- **Method Dropdown**: Enum selector for verification method
- **Result Badge**: PASS/FAIL/NEEDS_REVIEW with color coding

---

## 4. User Source Accounts (`/source/accounts`) - Read Only

**Role: Owner / REVIEWER / ADMIN**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/source/accounts` | List my verified source accounts (newest first) |
| GET | `/source/accounts/{id}` | Get account detail (owner or staff) |

### Frontend Features Needed
- **Source Account List**: Cards/table with status (ACTIVE/INACTIVE, VERIFIED/UNVERIFIED), `canSubmit` indicator
- **Detail View**: Owner info, verification history, linked problems

---

## 5. Problem Management (`/problems`)

**Roles: SUBMITTER (own), REVIEWER/ADMIN (all)**

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/problems` | Submit problem (requires `sourceAccountId`, domains, location, evidence) |
| GET | `/problems/{id}` | Get problem detail |
| PATCH | `/problems/{id}/status` | **REVIEWER/ADMIN**: Change status (REGISTERED → IN_REVIEW → EVALUATING → etc.) |
| POST | `/problems/{id}/evidence` | Upload evidence file (multipart) |

### Frontend Features Needed
- **Problem List** (Admin): All problems with filters (status, domain, source, date)
- **Problem Detail**: Full view with evidence, audit trail, status history
- **Status Transition UI**: Dropdown with valid next states per current status
- **Evidence Gallery**: View/download uploaded files

---

## 6. Domain Taxonomy (`/domains`) - Public

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/domains` | Full hierarchical tree (roots → children) |

### Frontend Features Needed
- **Domain Tree Picker**: For problem submission, multi-select with primary domain
- **Admin Domain View**: Read-only tree visualization

---

## 7. Audit Trail (`/audit`)

**Role: REVIEWER / ADMIN**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/audit/{problemId}` | Immutable chronological history: CREATED, UPDATED, STATUS_CHANGED, EVIDENCE_ADDED, SOURCE_VERIFICATION_*, REJECTED, ARCHIVED, WITHDRAWN |

### Frontend Features Needed
- **Audit Timeline**: Expandable entries with before/after JSON diff, actor, IP, timestamp
- **Filter by Action Type**: Checkboxes for action categories

---

## 8. Evaluation Pipeline (`/evaluation`)

**Role: ADMIN / REVIEWER**

### Cycle Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/evaluation/problems/{problemId}/start` | Start cycle (problem must be REGISTERED) |
| POST | `/evaluation/cycles/{cycleId}/analyze` | Run AI analysis → auto-routes if evaluator available |
| POST | `/evaluation/cycles/{cycleId}/route` | Manual route to least-loaded evaluator |
| POST | `/evaluation/cycles/{cycleId}/publish-to-portal` | Manual publish retry (idempotent) |

### Read Model
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/evaluation/cycles/{cycleId}` | Cycle detail |
| GET | `/evaluation/cycles/{cycleId}/history` | Status history trail |
| GET | `/evaluation/queue` | Paged list, optional `?status=`, FIFO by `startedAt` |

### Frontend Features Needed
- **Evaluation Queue**: Table with status, problem summary, startedAt, current assignee
- **Cycle Detail View**: Status badge, analysis result, routing history, assignments
- **Pipeline Actions**: Buttons for Analyze / Route / Publish (enabled per status)
- **Status Flow Diagram**: Visual: RECEIVED → ANALYZING → ROUTING → EVALUATION_IN_PROGRESS → EVALUATION_COMPLETED

---

## 9. Evaluator Profile Management (`/evaluation/evaluator-profiles`)

**Role: ADMIN only**

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/evaluation/evaluator-profiles` | Create profile: binds EVALUATOR userId to pool (GOVERNMENT/INDUSTRY/COMMUNITY/HEI/CITIZEN), `maxWorkload` (default 5), `experienceYears`, `active` |

### Frontend Features Needed
- **Evaluator Management Table**: List all evaluators with pool, workload, active toggle
- **Create Evaluator Profile Form**: User picker (from /users/evaluators), pool dropdown, workload number
- **Workload Monitor**: Show current assigned count vs maxWorkload

---

## 10. Evaluator Dashboard (`/evaluation/me`) - For EVALUATOR Role

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/evaluation/me/profile` | My pool, maxWorkload |
| GET | `/evaluation/me/criteria` | Active criteria for my pool (blank scorecard) |
| GET | `/evaluation/me/assignments` | My work queue, optional `?status=` |
| GET | `/evaluation/me/assignments/{id}` | Scoring screen: problem, AI profile (advisory), criteria with existing scores |
| POST | `/evaluation/me/assignments/{id}/accept` | ASSIGNED → IN_PROGRESS |
| POST | `/evaluation/me/assignments/{id}/decline` | With optional reason, returns cycle to ROUTING |
| POST | `/evaluation/me/assignments/{id}/submit` | Submit scorecard (all criteria required, maxScore validated) |

### Frontend Features Needed
- **Evaluator Dashboard**: Assignments table with deadline, status, actions
- **Scoring Screen**: Side-by-side problem + criteria form, AI profile as read-only context
- **Score Validation**: Client-side check all criteria filled, no score > maxScore

---

## 11. Portal (Reference - Not Admin UI)

For completeness, portal endpoints exist at `/portal` for participants (students, universities). Not needed in admin-ui.

---

## 12. Registration Wizard (Public - For Submitters)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/registration/source-types` | Catalog of source types (wizard step 1) |
| POST | `/registration` | Create registration draft |
| GET | `/registration/{id}/status` | Public status check (no auth) |
| GET | `/registration/mine` | My registrations (auth) |
| GET | `/registration/{id}` | Detail (owner) |
| PATCH | `/registration/{id}` | Update draft (owner) |
| POST | `/registration/{id}/submit` | Submit for review (owner) |
| GET | `/registration/{id}/history` | Status history (owner) |

---

## Implementation Priority for Admin UI

### Phase 1 - Core Admin
1. **Login/Auth** (JWT + refresh)
2. **User Management** (list, role change, create evaluator)
3. **Registration Review Queue** (queue, detail, approve/reject/action)
4. **Source Account Verification** (record checks)

### Phase 2 - Problem & Evaluation Ops
5. **Problem List & Detail** (with status transitions)
6. **Audit Trail Viewer**
7. **Evaluation Queue & Cycle Detail**
8. **Pipeline Actions** (analyze, route, publish)

### Phase 3 - Evaluator Management
9. **Evaluator Profiles** (CRUD, workload monitoring)
10. **Domain Taxonomy Viewer**

---

## Key Data Models (from DTOs)

### UserResponse
```json
{ "id": "uuid", "phone": "string", "role": "SUBMITTER|REVIEWER|ADMIN|EVALUATOR", "kycStatus": "UNVERIFIED|VERIFIED", "createdAt": "ISO8601" }
```

### RegistrationResponse
```json
{ "id": "uuid", "sourceType": "GOVT|INDUSTRY|...", "status": "DRAFT|SUBMITTED|...", "payload": {...}, "submittedAt": "...", "decidedAt": "...", "decidedBy": "uuid", "decisionComment": "..." }
```

### SourceAccountResponse
```json
{ "sourceAccountId": "uuid", "sourceType": "...", "sourceName": "...", "status": "ACTIVE|INACTIVE", "verificationStatus": "VERIFIED|UNVERIFIED|...", "canSubmit": true, "ownerUserId": "uuid", "createdAt": "..." }
```

### EvaluationCycleResponse
```json
{ "cycleId": "uuid", "problemId": "uuid", "status": "RECEIVED|ANALYZING|ROUTING|EVALUATION_IN_PROGRESS|EVALUATION_COMPLETED|PUBLISHED", "startedAt": "...", "assignedEvaluatorId": "uuid|null", "analysisProfile": {...} }
```

### ProblemAnalysisResponse
```json
{ "summary": "...", "suggestedDomains": [...], "complexity": "LOW|MEDIUM|HIGH", "keyEntities": [...], "advisoryOnly": true }
```

---

## API Base URL

All endpoints proxied through gateway at `http://localhost:8090` (per vite.config.ts proxy config).

---

## Notes for Frontend Implementation

1. **JWT Handling**: Store accessToken in memory, refreshToken in httpOnly cookie or secure storage. Auto-refresh 1 min before expiry.
2. **Role-Based UI**: Hide/show menu items and actions based on `UserRole` from JWT claims.
3. **Error Handling**: Backend returns `ApiException` with HTTP status + message. Show user-friendly toasts.
4. **Pagination**: Use `Page<EvaluationCycleResponse>` format: `{ content: [], totalElements, totalPages, number, size }`
5. **File Uploads**: Use multipart/form-data for evidence/files (max 50MB per portal-service).
6. **Idempotency**: Several endpoints are idempotent (analyze, route, publish) - safe to retry.
7. **Audit IP**: Client IP captured via `X-Forwarded-For` header for audit trails.