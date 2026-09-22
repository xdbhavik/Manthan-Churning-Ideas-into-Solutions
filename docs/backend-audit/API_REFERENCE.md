# API Reference — Complete Endpoint Catalog

> All routes below are the **service-local** paths. Frontends call the gateway on
> `:8080`/`:8090` with the same relative paths (the gateway forwards by prefix).
> `Authorization: Bearer <accessJwt>` is required unless marked **Public**.
> Role requirements come from `@PreAuthorize` or in-service checks.
>
> Error responses are RFC 7807 `ProblemDetail` (`type=about:blank`): `{title, status,
> detail}` plus `fieldErrors` (map) on validation failure. Full error mapping in
> §"Common error handling".

---

## Common error handling (identical in every service)

`GlobalExceptionHandler` (`@RestControllerAdvice`) in each service:

| Exception | HTTP | `detail` |
|:---|:---:|:---|
| `ApiException` | `ex.getStatus()` | `ex.getMessage()` |
| `AccessDeniedException` | 403 | `"Insufficient role for this operation"` |
| `MethodArgumentNotValidException` | 400 | `"Validation failed"` (+ `fieldErrors` property) |
| `HttpMessageNotReadableException` | 400 | `"Malformed or invalid request body"` |
| `MethodArgumentTypeMismatchException` | 400 | `"Invalid value for parameter '<name>'"` |
| other (`Exception`) | 500 (or passthrough of Spring `ErrorResponse` non-500) | `"Unexpected error: <ClassName>"` |

Auth entry point: `401 Unauthorized` (missing/invalid/expired JWT).

---

# Module: source-service (auth, users, registration, accounts)

Base port `8081`. Gateway prefixes: `/auth`, `/users`, `/registration`,
`/reviewer/registrations`, `/source/accounts`, `/sources`.

## Auth — `AuthController` (`/auth`)

| # | Method & path | Auth | Req body | Success | Response |
|:-|:---|:---|:---|:---:|:---|
| 1 | `POST /auth/register` | Public | `OtpRequest` | 201 | `OtpResponse` |
| 2 | `POST /auth/login` | Public | `OtpRequest` | 200 | `OtpResponse` |
| 3 | `POST /auth/verify-otp` | Public | `VerifyOtpRequest` | 200 | `VerifyOtpResponse` |
| 4 | `POST /auth/refresh` | Public | `RefreshRequest` | 200 | `RefreshResponse` |
| 5 | `POST /auth/logout` | Public | `RefreshRequest` | 204 | (no body) |

**`OtpRequest`** (register/login):
```json
{ "phone": "9876543210", "email": "x@y.z" }
```
- `phone`: `@NotBlank @Pattern("^[0-9]{10}$")` (10 digits)
- `email`: optional, `@Size(max=100)`

**`OtpResponse`**: `{ challengeId: UUID, expiresAt: ISO-8601, devOtp: string|null, requestsRemainingInWindow: int }`
(`devOtp` only non-prod.)

**`VerifyOtpRequest`**: `{ "challengeId": UUID, "code": "123456" }`
**`VerifyOtpResponse`**: `{ accessToken: string, refreshToken: UUID, user: UserResponse, expiresAt: ISO-8601 }`

**`RefreshRequest`**: `{ "refreshToken": UUID }`
**`RefreshResponse`**: `{ accessToken: string, refreshToken: UUID }`

**`UserResponse`**: `{ userId: UUID, phone, email, role, kycStatus, linkedSourceId: UUID|null, createdAt }`

Errors: register → 409 (phone taken), 429 (rate limit); login → 404 (unknown phone),
429; verify-otp → 400 (wrong/expired/used/too-many-attempts), 401 (no user for
phone); refresh → 401 (unknown/expired/revoked).

## Users (admin) — `UserController` (`/users`)

| # | Method & path | Auth | Req body | Success | Response |
|:-|:---|:---|:---|:---:|:---|
| 6 | `GET /users/{id}` | ADMIN | — | 200 | `UserResponse` |
| 7 | `PATCH /users/{id}/role` | ADMIN | `{ "role": "REVIEWER" }` | 200 | `UserResponse` |
| 8 | `POST /users/evaluators` | ADMIN | `OtpRequest` | 201 | `EvaluatorOnboardResponse` |

`EvaluatorOnboardResponse`: `{ userId, phone, role, otp: OtpResponse }`
Errors: 400 (invalid role), 403 (not ADMIN), 404 (user not found), 409 (phone
taken), 429 (OTP rate limit).

## Registration — `RegistrationController` (`/registration`)

| # | Method & path | Auth | Req body | Success | Response |
|:-|:---|:---|:---|:---:|:---|
| 9 | `GET /registration/source-types` | Public | — | 200 | `SourceTypesResponse` |
| 10 | `POST /registration` | Public | `RegistrationCreateRequest` | 201 | `RegistrationResponse` |
| 11 | `GET /registration/{id}/status` | Public | — | 200 | `RegistrationStatusResponse` |
| 12 | `GET /registration/mine` | Bearer | — | 200 | `List<RegistrationResponse>` |
| 13 | `GET /registration/{id}` | Bearer | — | 200 | `RegistrationResponse` |
| 14 | `PATCH /registration/{id}` | Bearer | `RegistrationUpdateRequest` | 200 | `RegistrationResponse` |
| 15 | `POST /registration/{id}/submit` | Bearer | — | 200 | `RegistrationResponse` |
| 16 | `GET /registration/{id}/history` | Bearer | — | 200 | `List<RegistrationHistoryResponse>` |

**`RegistrationCreateRequest`**:
```json
{
  "sourceType": "DEPARTMENT",
  "account": { "phone": "9876543210", "email": "x@y.z" },
  "source": { "departmentFullName": "...", "...": "..." },
  "documents": [ { "documentType": "AUTHORIZATION", "documentId": "..." } ]
}
```
- `sourceType`: `@NotNull` `SubEntityType` (see enum table).
- `account.phone`: `@NotBlank @Pattern(^[0-9]{10}$)`; `account.email` optional.
- `source`: `@NotNull Map<String,Object>` (type-specific fields, camelCase keys).
- `documents`: optional `List<DocumentPayload(documentType, documentId)>`.

**`RegistrationUpdateRequest`**: `{ "source": { ... } }` (`@NotNull Map`).

**`RegistrationResponse`**: `{ registrationId, sourceBucket, sourceType, status,
source: Map, submittedByUserId, sourceId: UUID|null, assignedReviewerId: UUID|null,
rejectionReason, actionRequiredComment, submittedAt, reviewedAt, createdAt,
updatedAt, version: int }`

**`RegistrationStatusResponse`** (public, no payload): `{ registrationId,
sourceBucket, sourceType, status, rejectionReason, actionRequiredComment,
submittedAt, reviewedAt, createdAt }`

**`RegistrationHistoryResponse`**: `{ historyId, fromStatus, toStatus,
changedByUserId, comment, changedAt }`

`SourceTypesResponse`: `{ categories: [ { bucket, label, subTypes: [ {key,label} ] } ] }`.

Errors: create/update/submit owner-scoped (403 "Not your registration"); submit 400
(missing required fields), 409 (bad status).

## Reviewer queue — `ReviewerRegistrationController` (`/reviewer/registrations`)

Class-level `@PreAuthorize("hasRole('REVIEWER') or hasRole('ADMIN')")`.

| # | Method & path | Req body | Success | Response |
|:-|:---|:---|:---:|:---|
| 17 | `GET /reviewer/registrations?status=` | — | 200 | `List<RegistrationResponse>` |
| 18 | `POST /reviewer/registrations/{id}/assign` | — | 200 | `RegistrationResponse` |
| 19 | `POST /reviewer/registrations/{id}/approve` | `RegistrationDecisionRequest` (optional) | 200 | `RegistrationResponse` |
| 20 | `POST /reviewer/registrations/{id}/reject` | `RegistrationDecisionRequest` | 200 | `RegistrationResponse` |
| 21 | `POST /reviewer/registrations/{id}/request-action` | `RegistrationDecisionRequest` | 200 | `RegistrationResponse` |

`RegistrationDecisionRequest`: `{ "comment": "..." }` — optional for approve;
mandatory non-blank for reject (else 400) and request-action (else 400).

Queue: default returns statuses `SUBMITTED|UNDER_REVIEW|ACTION_REQUIRED` ordered by
`submittedAt` ASC; `status` query narrows to one bucket.
Errors: assign 409 (not SUBMITTED/UNDER_REVIEW); approve 409 (not decidable) or
422 (payload missing materialization fields); reject/request-action 400 (blank
reason/comment), 409.

## Source accounts — `SourceAccountController` (`/source/accounts`)

| # | Method & path | Auth | Success | Response |
|:-|:---|:---|:---:|:---|
| 22 | `GET /source/accounts` | Bearer | 200 | `List<SourceAccountResponse>` |
| 23 | `GET /source/accounts/{id}` | Bearer | 200 | `SourceAccountResponse` |

`SourceAccountResponse`: `{ sourceAccountId, sourceId, registrationId, sourceBucket,
sourceType, displayName, status, verificationStatus, canSubmit: bool, activatedAt,
createdAt }`. Errors: 403 (not owner, not staff), 404.

## Source verification — `VerificationController` (`/sources`)

| # | Method & path | Auth | Req body | Success | Response |
|:-|:---|:---|:---|:---:|:---|
| 24 | `POST /sources/{id}/verify` | REVIEWER/ADMIN | `VerifySourceRequest` | 201 | `SourceVerification` (entity) |

`VerifySourceRequest`: `{ "method": "OFFICIAL_EMAIL", "result": "PASS",
"notes": "...", "evidenceUrl": "..." }` (`method`/`result` `@NotNull`).

## Internal (service-to-service, not routed by gateway)

| # | Method & path | Success | Response |
|:-|:---|:---:|:---|
| 25 | `GET /internal/source-accounts/{id}` | 200 | `SourceAccountResponse` (internal) |
| 26 | `GET /internal/users/{userId}/source-accounts` | 200 | `List<SourceAccountDetail>` |

Internal `SourceAccountResponse`: `{ sourceAccountId, ownerUserId, sourceId, status,
verificationStatus, sourceBucket, sourceType, displayName, canSubmit }` (enum strings).

`SourceAccountDetail`: `{ sourceAccountId, sourceId, sourceBucket, sourceType, status,
verificationStatus, institutionName, displayName, canSubmit }`.

---

# Module: problem-service (problems, domains, audit)

Base port `8082`. Gateway prefixes: `/problems`, `/domains`, `/audit`.

## Problems — `ProblemController` (`/problems`)

| # | Method & path | Auth | Req body / params | Success | Response |
|:-|:---|:---|:---|:---:|:---|
| 27 | `GET /problems` | Bearer | — | 200 | `List<ProblemResponse>` |
| 28 | `GET /problems/universities` | Bearer | — | 200 | `List<String>` (active university names) |
| 29 | `POST /problems` | Bearer | `ProblemSubmitRequest` | 201 | `ProblemResponse` |
| 30 | `GET /problems/{id}` | Bearer | — | 200 | `ProblemResponse` |
| 31 | `PATCH /problems/{id}/status` | REVIEWER/ADMIN | `StatusPatchRequest` | 200 | `ProblemResponse` |
| 32 | `POST /problems/{id}/evidence` | Bearer | multipart `file` + `evidenceType` (default `DOCUMENT`) | 200 | `Evidence` (entity) |
| 33 | `GET /problems/{id}/evidence` | Bearer | — | 200 | `List<Evidence>` |

Notes:
- `GET /problems`: SUBMITTER sees only own submissions (`findBySubmittedByUserId`);
  REVIEWER/ADMIN see all. Ordered `submittedAt` DESC (nulls last).
- `GET /problems/{id}` / evidence endpoints: 404 if missing; 403 `"Not your submission"`
  for a SUBMITTER who doesn't own it.
- Evidence upload: multipart, SHA-256 dedupe (409 duplicate), 50 MB/55 MB caps.

**`ProblemSubmitRequest`**:
```json
{
  "title": "...", "description": "...",
  "urgency": "IMMEDIATE", "severity": "HIGH",
  "affectedPopulation": 0, "expectedOutcome": "...", "existingIntervention": "...",
  "sourceAccountId": "UUID",
  "location": { "state": "...", "district": "...", "blockTehsil": "...",
                "villageWard": "...", "pincode": "...", "latitude": 12.3,
                "longitude": 77.5, "landmark": "...", "lgdCode": "..." },
  "domainIds": ["UUID", ...],
  "evidence": [ { "evidenceType": "DOCUMENT", "fileUrl": "...", "fileHash": "...",
                  "metadata": {}, "capturedAt": "ISO" } ],
  "accessRule": "OPEN_TO_ALL",
  "accessUniversities": ["IIT Madras"]
}
```
Validation: `title`/`description` `@NotBlank`; `urgency` `@NotNull`; `sourceAccountId`
`@NotNull`; `location` `@Valid @NotNull` (`state`,`district` `@NotBlank`, `latitude`/`longitude` `@NotNull`); `evidence.evidenceType/fileUrl/fileHash` required per item. `accessRule` defaults `OPEN_TO_ALL`.

**`ProblemResponse`**: `{ problemId, title, description, sourceBucket, subEntityType,
status, urgency, severity, sourceId, sourceAccountId, locationId, affectedPopulation,
expectedOutcome, existingIntervention, submittedAt, updatedAt, submittedByUserId,
accessRule, accessUniversities: [], version: int }`

**`StatusPatchRequest`**: `{ "status": "REGISTERED", "expectedVersion": 1 }`
(`status` `@NotNull`; `expectedVersion` optional).

Submission errors: 403 `SOURCE_NOT_OWNED` / `SOURCE_NOT_VERIFIED`; 400 (unknown
domain, `SELECTED_UNIVERSITIES` empty, `AUTO_SELECTED_UNIVERSITIES` unresolved);
409 (duplicate evidence hash); 404/502/503 (source-service gateway).

## Domains — `DomainController` (`/domains`)

| # | Method & path | Auth | Success | Response |
|:-|:---|:---|:---:|:---|
| 34 | `GET /domains` | Public | 200 | `List<Domain>` (3-level tree) |

## Audit — `AuditController` (`/audit`)

| # | Method & path | Auth | Success | Response |
|:-|:---|:---|:---:|:---|
| 35 | `GET /audit/{problemId}` | REVIEWER/ADMIN | 200 | `List<AuditLog>` (oldest first) |

## Internal

| # | Method & path | Success | Response |
|:-|:---|:---:|:---|
| 36 | `GET /internal/problems/{id}` | 200 | `ProblemContextResponse` |

`ProblemContextResponse`: `{ problemId, status, title, description, sourceBucket,
subEntityType, urgency, severity, affectedPopulation, expectedOutcome,
existingIntervention, location, domains: [..], evidenceCount, accessRule,
accessUniversities: [..] }`.

---

# Module: evaluation-service (evaluation cycles, evaluators, project reviews)

Base port `8083`. Gateway prefix: `/evaluation`.

## Cycle administration — `EvaluationAdminController` (`/evaluation`)

Class-level `@PreAuthorize("hasRole('ADMIN') or hasRole('REVIEWER')")`.

| # | Method & path | Req body | Success | Response |
|:-|:---|:---|:---:|:---|
| 37 | `POST /evaluation/problems/{problemId}/start` | — | 201 | `EvaluationCycleResponse` |
| 38 | `POST /evaluation/cycles/{cycleId}/analyze` | — | 200 | `ProblemAnalysisResponse` |
| 39 | `POST /evaluation/cycles/{cycleId}/route` | — | 200 | `RouteOutcomeResponse` |
| 40 | `POST /evaluation/cycles/{cycleId}/route-pools` | — | 200 | `RouteAllOutcomeResponse` |
| 41 | `POST /evaluation/cycles/{cycleId}/aggregate` | — | 200 | `AggregationResponse` |
| 42 | `POST /evaluation/cycles/{cycleId}/prioritize` | — | 200 | `PrioritizationResponse` |
| 43 | `GET /evaluation/cycles/{cycleId}/aggregation` | — | 200 | `AggregationResponse` |
| 44 | `POST /evaluation/cycles/{cycleId}/publish-to-portal` | — | 200 | `{ cycleId, published: true }` |
| 45 | `GET /evaluation/cycles/{cycleId}` | — | 200 | `EvaluationCycleResponse` |
| 46 | `GET /evaluation/cycles/{cycleId}/history` | — | 200 | `List<EvaluationStatusHistoryResponse>` |
| 47 | `GET /evaluation/queue?status=&page=0&size=20` | — | 200 | `Page<EvaluationCycleResponse>` |

`EvaluationCycleResponse`: `{ cycleId, problemId, status, triggerMethod,
triggeredByUserId, startedAt, completedAt, finalScore, impactLevel, priorityScore,
priorityBand, createdAt, updatedAt, version }`.

`EvaluationStatusHistoryResponse`: `{ historyId, cycleId, fromStatus, toStatus,
changedByUserId, comment, changedAt }`.

## Evaluator workspace — `EvaluatorController` (`/evaluation/me`)

Class-level `@PreAuthorize("hasRole('EVALUATOR')")`.

| # | Method & path | Req body | Success | Response |
|:-|:---|:---|:---:|:---|
| 48 | `GET /evaluation/me/profile` | — | 200 | `EvaluatorProfileResponse` |
| 49 | `GET /evaluation/me/criteria` | — | 200 | `List<CriterionScoreResponse>` |
| 50 | `GET /evaluation/me/assignments?status=` | — | 200 | `List<MyAssignmentResponse>` |
| 51 | `GET /evaluation/me/assignments/{assignmentId}` | — | 200 | `AssignmentDetailResponse` |
| 52 | `POST /evaluation/me/assignments/{assignmentId}/accept` | — | 200 | `AssignmentOutcomeResponse` |
| 53 | `POST /evaluation/me/assignments/{assignmentId}/decline` | `DeclineRequest` (optional) | 200 | `AssignmentOutcomeResponse` |
| 54 | `POST /evaluation/me/assignments/{assignmentId}/submit` | `ScoreSubmissionRequest` | 200 | `AssignmentOutcomeResponse` |

`EvaluatorProfileResponse`: `{ profileId, userId, evaluatorType, fullName,
organization, designation, experienceYears, regionStates: [], affiliatedSourceId,
maxWorkload, active, createdAt, updatedAt }`.

`CriterionScoreResponse`: `{ criterionId, criterionKey, criterionLabel, description,
maxScore, sortOrder, myScore, myComment }`.

`MyAssignmentResponse`: `{ assignmentId, cycleId, problemId, status, assignedAt,
deadline, submittedAt, overdue, criteriaTotal, criteriaScored, cycleStatus }`.

`AssignmentDetailResponse`: `{ assignment, feedback, recommendation, problem:
ProblemContextResponse|null, analysis: ProblemAnalysisResponse|null, criteria: [] }`.

`AssignmentOutcomeResponse`: `{ assignmentId, status, submittedAt, criteriaScored,
cycleStatus, message }`.

**`ScoreSubmissionRequest`**:
```json
{ "scores": [ { "criterionId": "UUID", "criterionKey": "policy_relevance",
                "score": 8, "comment": "..." } ],
  "feedback": "...", "recommendation": "..." }
```
- `scores`: `@NotEmpty`; each `score` `@NotNull @Min(1) @Max(10)`, `criterionKey`
  `@Size(max=50)`, comment `@Size(max=4000)`; `feedback` `@Size(max=4000)`,
  `recommendation` `@Size(max=255)`.

`DeclineRequest`: `{ "reason": "..." }` (`@Size(max=1000)`).

## Project reviews — `EvaluatorProjectReviewController` (`/evaluation/me/project-reviews`)

Class-level `@PreAuthorize("hasRole('EVALUATOR')")`.

| # | Method & path | Req body | Success | Response |
|:-|:---|:---|:---:|:---|
| 55 | `GET /evaluation/me/project-reviews?status=` | — | 200 | `List<ProjectReviewListItem>` |
| 56 | `GET /evaluation/me/project-reviews/{projectReviewId}` | — | 200 | `ProjectReviewDetailView` |
| 57 | `POST /evaluation/me/project-reviews/{projectReviewId}/decision` | `ProjectReviewDecisionRequest` | 200 | `ProjectReviewDetailView` |

`ProjectReviewDecisionRequest`: `{ "decision": "ACCEPTED", "comment": "..." }`
(`decision` `@NotBlank` = `ACCEPTED`/`RETURNED`; `comment` `@Size(max=2000)`).

`ProjectReviewListItem`: `{ projectReviewId, problemId, problemTitle, submissionTitle,
round, status, createdAt, decidedAt }`.

`ProjectReviewDetailView`: `{ projectReviewId, submissionId, problemId, cycleId,
problemTitle, submissionTitle, summary, githubUrl, links: [], round, status,
decisionComment, files: [ProjectReviewFile], createdAt, decidedAt }`.

## Evaluator profiles (admin) — `EvaluatorProfileAdminController` (`/evaluation/evaluator-profiles`)

| # | Method & path | Auth | Req body | Success | Response |
|:-|:---|:---|:---|:---:|:---|
| 58 | `POST /evaluation/evaluator-profiles` | ADMIN | `EvaluatorProfileRequest` | 201 | `EvaluatorProfileResponse` |

`EvaluatorProfileRequest`: `{ userId: UUID (@NotNull), evaluatorType: "GOVERNMENT"
(@NotNull), fullName: "..." (@NotBlank, max150), organization, designation,
experienceYears, maxWorkload }`.

## Pool modes — `EvaluatorPoolModeController` (`/evaluation/pool-modes`)

Class-level `@PreAuthorize("hasAnyRole('EVALUATOR','ADMIN')")`.

| # | Method & path | Req body | Success | Response |
|:-|:---|:---|:---:|:---|
| 59 | `GET /evaluation/pool-modes` | — | 200 | `List<PoolModeResponse>` |
| 60 | `PUT /evaluation/pool-modes/{pool}` | `PoolModeUpdateRequest` | 200 | `PoolModeResponse` |

`{pool}` = `GOVERNMENT|INDUSTRY|HEI|CITIZEN|COMMUNITY`. `PoolModeUpdateRequest`:
`{ "mode": "AUTO" }` (`@NotNull` `MANUAL`/`AUTO`).

`PoolModeResponse`: `{ evaluatorType, mode, updatedByUserId, updatedAt,
aiScoringAvailable, activeHumanEvaluators, note }`.

## Internal

| # | Method & path | Req body | Success | Response |
|:-|:---|:---|:---:|:---|
| 61 | `POST /internal/project-reviews` | `ProjectReviewCreateRequest` | 201 | `ProjectReviewCreateResponse` |

`ProjectReviewCreateRequest`: `{ submissionId (@NotNull), problemId (@NotNull),
cycleId (@NotNull), round (@NotNull), problemTitle, submissionTitle, summary,
githubUrl, links: [], files: [{fileId,fileName,sizeBytes,contentType}] }`.

`ProjectReviewCreateResponse`: `{ projectReviewId, reviewerUserId,
evaluatorProfileId, status }`.

---

# Module: portal-service (participants, catalog, submissions)

Base port `8084`. Gateway prefix: `/portal`. No `@PreAuthorize`; all `/portal/**`
require a Bearer token (`anyRequest().authenticated()`), and every read/write
resolves the caller to a `Participant` (auto-binding HEI owners, else
404 `STUDENT_NOT_REGISTERED`).

## Portal — `PortalController` (`/portal`)

| # | Method & path | Req body / params | Success | Response |
|:-|:---|:---|:---:|:---|
| 62 | `GET /portal/me` | — | 200 | `ParticipantResponse` |
| 63 | `POST /portal/participants` | `ParticipantRegisterRequest` | 201 | `ParticipantResponse` |
| 64 | `GET /portal/problems` | — | 200 | `List<PublishedProblemSummary>` |
| 65 | `GET /portal/problems/{problemId}` | — | 200 | `PublishedProblemDetail` |
| 66 | `GET /portal/submissions` | — | 200 | `List<SubmissionView>` |
| 67 | `POST /portal/submissions` | `SubmissionCreateRequest` | 201 | `SubmissionView` |
| 68 | `GET /portal/submissions/{submissionId}` | — | 200 | `SubmissionView` |
| 69 | `PATCH /portal/submissions/{submissionId}` | `SubmissionMetaRequest` | 200 | `SubmissionView` |
| 70 | `POST /portal/submissions/{submissionId}/submit` | — | 200 | `SubmissionView` |
| 71 | `GET /portal/submissions/{submissionId}/files` | — | 200 | `List<FileItemView>` |
| 72 | `POST /portal/submissions/{submissionId}/files` | multipart `file` | 201 | `FileItemView` |
| 73 | `DELETE /portal/submissions/{submissionId}/files/{fileId}` | — | 204 | (no body) |
| 74 | `GET /portal/files/{fileId}/download` | — | 200 | binary stream |

**`ParticipantRegisterRequest`**: `{ "fullName": "...", "email": "...", "phone": "..." }`
(`fullName` `@NotBlank @Size(max=150)`, `email` `@Email @Size(max=255)`, `phone` `@Size(max=20)`).

**`ParticipantResponse`**: `{ participantId, participantType: "STUDENT"|"UNIVERSITY",
fullName, email, phone, institutionName: string|null, sourceAccountId: UUID|null }`.

**`PublishedProblemSummary`**: `{ problemId, title, expectedOutcome, sourceBucket,
subEntityType, urgency, severity, location, domains: [], evidenceCount, accessRule,
publishedAt }`.

**`PublishedProblemDetail`**: summary + `description` + `accessUniversities: []`.

**`SubmissionCreateRequest`**: `{ problemId (@NotNull), title (max255), summary
(max20000), githubUrl (max500), commitSha (max64, `[A-Za-z0-9._-]*`), branch (max120),
links: [], teamName (max150), memberUserIds: [] }`.

**`SubmissionMetaRequest`**: same editable fields (title/summary/githubUrl/commitSha/
branch/links); null fields unchanged.

**`SubmissionView`**: `{ submissionId, problemId, teamId: UUID|null, title, summary,
githubUrl, commitSha, branch, links: [], status, reviewRound, reviewerUserId,
decisionComment, submittedAt, decidedAt, files: [FileItemView], team: TeamView|null }`.

**`FileItemView`**: `{ fileId, originalName, contentType, sizeBytes, sha256, uploadedAt }`.

**`TeamView`**: `{ teamId, name, members: [{participantId, fullName}] }`.

Portal errors: 404 `STUDENT_NOT_REGISTERED` (me), 409 (already participant / owns
HEI / active submission / frozen meta / not evaluated), 403 (problem/member not
visible, not submitter/team member), 400 (no artifact / missing commitSha),
502/503 (evaluation-service down → submit rolls back).

## Internal

| # | Method & path | Req body | Success | Response |
|:-|:---|:---|:---:|:---|
| 75 | `POST /internal/published-problems` | `PublishedProblemPushRequest` | 201 (new) / 200 (existing) | (no body) |
| 76 | `POST /internal/submissions/{submissionId}/review-result` | `ReviewResultPushRequest` | 200 | `SubmissionView` |

`PublishedProblemPushRequest`: `{ cycleId (@NotNull), problem: ProblemContextResponse (@Valid @NotNull) }`.

`ReviewResultPushRequest`: `{ "decision": "ACCEPTED"|"RETURNED" (@NotBlank), "comment": "..." (max4000) }`.

---

# Module: codejudge-service (automated repo evaluation)

Base port `8085`. Gateway prefix: `/codejudge`. `SecurityConfig` requires
`hasAnyRole("ADMIN","EVALUATOR")` for `/codejudge/**` (except `/internal/**`,
Swagger, `/error`, OPTIONS).

## Evaluations — `CodeJudgeController` (`/codejudge/evaluations`)

| # | Method & path | Req body / params | Success | Response |
|:-|:---|:---|:---:|:---|
| 77 | `POST /codejudge/evaluations` | `EvaluationCreateRequest` | 202 | `EvaluationCreateResponse` |
| 78 | `GET /codejudge/evaluations/{evaluationId}` | — | 200 | `EvaluationDetailResponse` |
| 79 | `GET /codejudge/evaluations/{evaluationId}/score` | — | 200 | `EvaluationScoreResponse` |
| 80 | `GET /codejudge/evaluations/{evaluationId}/findings` | — | 200 | `List<FindingResponse>` |
| 81 | `GET /codejudge/evaluations/{evaluationId}/report?format=` | `format`=`json`/`markdown`/`md` | 200 | JSON `EvaluationReportResponse` or `text/markdown` |
| 82 | `GET /codejudge/evaluations?status=` | — | 200 | `List<EvaluationDetailResponse>` |

**`EvaluationCreateRequest`**: `{ portalSubmissionId: UUID|null, problemId (@NotNull),
problemTitle (max255), teamId, repositoryUrl (@NotBlank, max500), branch (max120),
commitSha (@NotBlank, 7-64, `[A-Za-z0-9._-]+`), demoUrl, documentationUrl }`.

`EvaluationCreateResponse`: `{ evaluationId, submissionId, status }`.

`EvaluationDetailResponse`: `{ evaluationId, submissionId, problemId, problemTitle,
teamId, repositoryUrl, branch, commitSha, status, scoringVersion, finalScore, verdict,
startedAt, completedAt, createdAt, history: [StatusHistoryResponse] }`.

`EvaluationScoreResponse`: `{ evaluationId, status, scoringVersion, finalScore, verdict,
categories: [CategoryScoreResponse] }`.

`CategoryScoreResponse`: `{ categoryKey, score, maxScore, weight, status, note }`.

`FindingResponse`: `{ severity, category, message, evidenceRef, createdAt }`.

`StatusHistoryResponse`: `{ fromStatus, toStatus, actor, note, createdAt }`.

## Admin — `CodeJudgeAdminController` (`/codejudge/admin`, `@PreAuthorize("hasRole('ADMIN')")`)

| # | Method & path | Success | Response |
|:-|:---|:---:|:---|
| 83 | `POST /codejudge/admin/evaluations/{evaluationId}/retry` | 200 | `EvaluationCreateResponse` |
| 84 | `POST /codejudge/admin/evaluations/{evaluationId}/reevaluate` | 200 | `EvaluationCreateResponse` |
| 85 | `GET /codejudge/admin/jobs?status=` | 200 | `List<JobResponse>` |
| 86 | `GET /codejudge/admin/scoring-config` | 200 | `{ categories: [], policies: [] }` |

`JobResponse`: `{ jobId, evaluationId, status, priority, claimOwner, claimedAt,
attempts, lastError, createdAt }`.

## Internal

| # | Method & path | Req body | Success | Response |
|:-|:---|:---|:---:|:---|
| 87 | `POST /internal/codejudge/evaluations` | `InternalEvaluationCreateRequest` | 202 | `EvaluationCreateResponse` |
| 88 | `GET /internal/codejudge/evaluations/{evaluationId}/summary` | — | 200 | `EvaluationSummaryResponse` |

`InternalEvaluationCreateRequest`: `{ ownerUserId (@NotNull), submission:
EvaluationCreateRequest (@NotNull @Valid) }`.

`EvaluationSummaryResponse`: `{ evaluationId, submissionId, portalSubmissionId,
status, scoringVersion, finalScore, verdict, completedAt, categories: [],
findings: [] }`.

---

## Enum reference (verbatim values)

| Enum | Values |
|:---|:---|
| `UserRole` | `SUBMITTER, REVIEWER, ADMIN, EVALUATOR` |
| `KycStatus` | `UNVERIFIED, VERIFIED` |
| `RegistrationStatus` | `DRAFT, SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED, ACTION_REQUIRED` |
| `SourceAccountStatus` | `PENDING, ACTIVE, SUSPENDED` |
| `AccountVerificationStatus` | `UNVERIFIED, VERIFIED, REVOKED` |
| `VerificationMethod` | `OFFICIAL_EMAIL, AUTHORIZATION_DOC, OTP, REGISTRATION_API, INSTITUTIONAL_EMAIL, MANUAL_REVIEW` |
| `VerificationResult` | `PASS, FAIL, NEEDS_REVIEW` |
| `SourceBucket` | `GOVT, CITIZEN, INDUSTRY, COMMUNITY, HEI` |
| `SubEntityType` | `DEPARTMENT, PRI, ULB, INDIVIDUAL, RWA, COMPANY, STARTUP, MSME, CSR, NGO, SHG, CBO_COOP, UNIVERSITY, RESEARCH_LAB` |
| `ProblemStatus` | `SUBMITTED, SOURCE_VERIFYING, SOURCE_VERIFIED, REGISTERED, REJECTED, ARCHIVED` |
| `ProblemAccessRule` | `OPEN_TO_ALL, UNIVERSITY_ONLY, SELECTED_UNIVERSITIES, AUTO_SELECTED_UNIVERSITIES` |
| `EvidenceType` | `PHOTO, VIDEO, DOCUMENT, AUDIO, DATASET, LOCATION_PIN` |
| `Severity` | `CRITICAL, HIGH, MEDIUM, LOW` |
| `Urgency` | `IMMEDIATE, SHORT_TERM, LONG_TERM` |
| `AuditAction` (Java) | `CREATED, UPDATED, STATUS_CHANGED, EVIDENCE_ADDED, SOURCE_VERIFICATION_INITIATED, SOURCE_VERIFIED, SOURCE_VERIFICATION_FAILED, REJECTED, ARCHIVED, WITHDRAWN, EVALUATION_STARTED, EVALUATION_ANALYZED, EVALUATION_ROUTED, EVALUATION_ASSIGNED, EVALUATION_SUBMITTED, EVALUATION_AGGREGATED, EVALUATION_PRIORITIZED, EVALUATION_COMPLETED, EVALUATION_DISAGREEMENT_FLAGGED, EVALUATION_DISAGREEMENT_RESOLVED, EVALUATION_WEIGHT_UPDATED, PROBLEM_PUBLISHED, PROJECT_REVIEW_ASSIGNED, PROJECT_REVIEW_DECIDED, EVALUATION_AI_SCORED, EVALUATION_AI_UNAVAILABLE, EVALUATION_MODE_CHANGED` |
| `EvaluationStatus` | `RECEIVED, ANALYZING, ROUTING, EVALUATION_IN_PROGRESS, EVALUATION_COMPLETED, SCORES_AGGREGATED, PRIORITIZED, PHASE_3_READY, ANALYSIS_FAILED` |
| `AssignmentStatus` | `ASSIGNED, IN_PROGRESS, SUBMITTED, DECLINED, EXPIRED, REVIEWED` |
| `AnalysisStatus` | `SUCCESS, FAILED, HEURISTIC_FALLBACK` |
| `AggregationStatus` | `PENDING, AGGREGATED, REVIEW_REQUIRED` |
| `DisagreementStatus` | `OPEN, REVIEWED, RESOLVED, ESCALATED` |
| `ImpactLevel` | `HIGH, MEDIUM, LOW` |
| `PriorityBand` | `P1, P2, P3, P4` |
| `WeightingMethod` | `CONFIGURED, EQUAL` |
| `EvaluatorType` | `GOVERNMENT, INDUSTRY, HEI, CITIZEN, COMMUNITY` |
| `EvaluationMode` | `MANUAL, AUTO` |
| `ScoreSource` | `HUMAN, AI` |
| `ProjectReviewStatus` | `ASSIGNED, ACCEPTED, RETURNED` |
| `ParticipantType` | `STUDENT, UNIVERSITY` |
| `SubmissionStatus` | `DRAFT, SUBMITTED, UNDER_REVIEW, ACCEPTED, RETURNED` |
| `TeamRole` | `LEADER, MEMBER` |
| `JobStatus` (codejudge) | `QUEUED, CLAIMED, DONE, FAILED` |
| `EvaluationStatus` (codejudge) | `SUBMITTED, QUEUED, CLONING, SCANNING, BUILDING, RUNNING, TESTING, SECURITY_SCANNING, ARCHITECTURE_ANALYSIS, REQUIREMENT_MATCHING, AI_ANALYSIS, SCORING, REPORT_GENERATION, COMPLETED, FAILED` |
| `AnalysisStatus` (codejudge) | `SUCCESS, HEURISTIC_FALLBACK, FAILED, SKIPPED, UNAVAILABLE` |
| `FindingSeverity` | `LOW, MEDIUM, HIGH, CRITICAL` |
| `Verdict` | `EXCELLENT, GOOD, NEEDS_WORK, BLOCKED` |

(Remaining taxonomy enums — `GovSubtype`, `PriLevel`, `UlbType`, `CompanySize`,
`StartupStage`, `Msme*`, `Community*`, `Hei*`, `UniversityProblemType`, etc. — are
documented in `DATA_MODEL.md` §3.)
