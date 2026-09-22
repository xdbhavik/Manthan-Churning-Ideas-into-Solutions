# Frontend Integration Map

> Practical guide for a future frontend developer. Maps UI features → endpoints →
> payloads → response fields → error states. Base URL is the gateway
> (`http://localhost:8080` or `:8090`); paths are relative.

---

## 1. Endpoint → Feature mapping

| # | Feature / UI action | Endpoint(s) | Auth | Notes |
|:-|:---|:---|:---|:---|
| 1 | OTP login (issue code) | `POST /auth/login` | public | then verify |
| 2 | Sign-up / OTP register | `POST /auth/register` | public | then verify |
| 3 | Verify OTP → get tokens | `POST /auth/verify-otp` | public | store `accessToken`+`refreshToken` |
| 4 | Refresh session | `POST /auth/refresh` | public | on 401, rotate refresh |
| 5 | Logout | `POST /auth/logout` | public | revoke refresh |
| 6 | Registration wizard: source types | `GET /registration/source-types` | public | step 1 |
| 7 | Submit source registration | `POST /registration` | public | creates user + OTP |
| 8 | Track registration status | `GET /registration/{id}/status` | public | poll |
| 9 | My registrations / edit / submit | `GET/PATCH/POST /registration/...` | bearer | submitter |
| 10 | Reviewer queue & decisions | `GET/POST /reviewer/registrations/...` | REVIEWER/ADMIN | approve/reject/request-action |
| 11 | My source accounts | `GET /source/accounts` | bearer | shows `canSubmit` + `sourceAccountId` |
| 12 | Record source verification | `POST /sources/{id}/verify` | REVIEWER/ADMIN | — |
| 13 | Admin: user management | `GET/PATCH /users/{id}[`/role]`, `POST /users/evaluators` | ADMIN | — |
| 14 | Domain taxonomy picker | `GET /domains` | public | 3-level tree |
| 15 | Submit a problem statement | `POST /problems` | bearer | needs `sourceAccountId` |
| 16 | My problems / all problems | `GET /problems` | bearer | SUBMITTER=own, staff=all |
| 17 | Problem detail / status change | `GET /problems/{id}`, `PATCH /problems/{id}/status` | bearer / REVIEWER+ADMIN | — |
| 18 | Evidence upload / list | `POST /problems/{id}/evidence`, `GET .../evidence` | bearer | multipart |
| 19 | Audit trail | `GET /audit/{problemId}` | REVIEWER/ADMIN | — |
| 20 | University picker (access rule) | `GET /problems/universities` | bearer | active names |
| 21 | Start evaluation cycle | `POST /evaluation/problems/{problemId}/start` | ADMIN/REVIEWER | — |
| 22 | Analyze / route / aggregate / prioritize | `POST /evaluation/cycles/{id}/{analyze,route,route-pools,aggregate,prioritize}` | ADMIN/REVIEWER | — |
| 23 | Cycle queue / detail / history | `GET /evaluation/queue`, `GET /evaluation/cycles/{id}`, `.../history` | ADMIN/REVIEWER | — |
| 24 | Manual publish | `POST /evaluation/cycles/{id}/publish-to-portal` | ADMIN/REVIEWER | — |
| 25 | Evaluator onboarding | `POST /evaluation/evaluator-profiles` | ADMIN | — |
| 26 | Pool mode switch | `GET/PUT /evaluation/pool-modes/{pool}` | EVALUATOR/ADMIN | MANUAL/AUTO |
| 27 | Evaluator: my assignments & scoring | `GET/POST /evaluation/me/assignments/...` | EVALUATOR | accept/decline/submit scores |
| 28 | Evaluator: my project reviews | `GET /evaluation/me/project-reviews`, `POST .../{id}/decision` | EVALUATOR | ACCEPTED/RETURNED |
| 29 | Portal: my profile / register | `GET /portal/me`, `POST /portal/participants` | bearer | auto-bind HEI |
| 30 | Browse catalog / detail | `GET /portal/problems`, `GET /portal/problems/{id}` | bearer | canSee-filtered |
| 31 | My submissions | `GET /portal/submissions` | bearer | — |
| 32 | Create draft submission | `POST /portal/submissions` | bearer | individual or team |
| 33 | Edit draft meta | `PATCH /portal/submissions/{id}` | bearer | DRAFT/RETURNED |
| 34 | Submit for review | `POST /portal/submissions/{id}/submit` | bearer | rolls back on eval failure |
| 35 | Upload/list/delete/download files | `POST/GET/DELETE /portal/submissions/{id}/files...`, `GET /portal/files/{id}/download` | bearer | DRAFT/RETURNED for write |
| 36 | CodeJudge: create/list/detail/score/findings/report | `POST/GET /codejudge/evaluations...` | EVALUATOR/ADMIN | — |
| 37 | CodeJudge admin: retry/reevaluate/jobs/config | `POST/GET /codejudge/admin/...` | ADMIN | — |

---

## 2. Auth flow (frontend must implement)

1. Collect phone → `POST /auth/login` (or `/register`). Non-prod returns `devOtp`
   (display for demo); prod relies on SMS.
2. Collect code → `POST /auth/verify-otp`. Store `accessToken` (15 min) and
   `refreshToken`.
3. Send `Authorization: Bearer <accessToken>` on all protected calls.
4. On `401`, call `POST /auth/refresh` with `refreshToken`; store the new pair.
   Refresh tokens **rotate** (old one is immediately invalid) — serialize refreshes
   to avoid clobbering.

## 3. Key request/response contract notes

- **Response wrapper**: none. Every endpoint returns its own JSON shape (records
  serialized directly). Errors are RFC 7807 `ProblemDetail`
  `{title, status, detail, fieldErrors?}`. Success statuses vary (200/201/202/204).
- **IDs**: all primary keys are UUID strings. `sourceAccountId`, `problemId`,
  `submissionId`, `assignmentId`, `cycleId`, `projectReviewId`, `evaluationId`,
  `fileId`, `participantId`, `userId`.
- **Enums**: serialized as `name()` strings (e.g. `"OPEN_TO_ALL"`, `"UNDER_REVIEW"`,
  `"GOVERNMENT"`).
- **Dates**: ISO-8601 instants (`Instant`).
- **Pagination**: only `GET /evaluation/queue` is paginated (`page`/`size`, capped
  100, returns Spring `Page` shape `{content, pageable, totalElements, totalPages,
  last, ...}`). Other list endpoints return unbounded arrays.

## 4. Which fields to display vs edit

| Entity | Display | Editable (endpoint) |
|:---|:---|:---|
| SourceAccount | `displayName, sourceBucket, sourceType, status, verificationStatus, canSubmit` | none (read-only) |
| Registration | full `RegistrationResponse` | `source` payload only (`PATCH /registration/{id}`) |
| Problem | `ProblemResponse` | only status (`PATCH /problems/{id}/status`, staff) |
| EvaluationCycle | `EvaluationCycleResponse` + history | none directly (drive via analyze/route/aggregate/prioritize) |
| Assignment | `MyAssignmentResponse` + detail | scores/feedback/recommendation (`submit`), accept/decline |
| PublishedProblem | summary/detail | none (pushed by evaluation-service) |
| Submission | `SubmissionView` | `title/summary/githubUrl/commitSha/branch/links` (`PATCH`); files |
| CodeJudge evaluation | detail/score/findings/report | none (create/retry/reevaluate only) |

## 5. Multiple-call dependencies & ordering

- **Submit a problem** requires a prior approved registration → `GET /source/accounts`
  to obtain `sourceAccountId` (must be `canSubmit=true`).
- **`AUTO_SELECTED_UNIVERSITIES`** requires a configured LLM (`OPENAI_API_KEY`);
  otherwise fails 400 — frontend should surface that message.
- **Evaluation**: start → analyze → route(-pools) → (evaluator scores) → aggregate →
  prioritize → publish. The cycle status tells the frontend which action is legal
  next (see `EvaluationStatus`).
- **Submit a solution**: `POST /portal/participants` (STUDENT) or auto-bind
  (UNIVERSITY) before any `/portal` call; then `POST /portal/submissions`, upload
  files, `PATCH` meta, then `POST .../submit`.
- **Submit is atomic**: evaluation-service must be reachable, else 502/503 and the
  draft stays DRAFT (frontend should tell the user to retry).
- **CodeJudge** runs async: submit returns UNDER_REVIEW; the evaluation result
  (score/findings/report) is polled via `GET /codejudge/evaluations?status=` or
  `.../{id}`. Statuses: `QUEUED → ... → COMPLETED | FAILED`.

## 6. Backend states the UI must represent

- `RegistrationStatus` (DRAFT/SUBMITTED/UNDER_REVIEW/APPROVED/REJECTED/ACTION_REQUIRED)
- `SourceAccountStatus` × `AccountVerificationStatus` (`canSubmit` derived)
- `ProblemStatus` (SUBMITTED … ARCHIVED)
- `EvaluationStatus` (RECEIVED … PHASE_3_READY, ANALYSIS_FAILED)
- `AssignmentStatus` (ASSIGNED/IN_PROGRESS/SUBMITTED/DECLINED/EXPIRED/REVIEWED)
- `SubmissionStatus` (DRAFT/SUBMITTED/UNDER_REVIEW/ACCEPTED/RETURNED)
- `ProjectReviewStatus` (ASSIGNED/ACCEPTED/RETURNED)
- codejudge `JobStatus`/`EvaluationStatus`/`Verdict`/`FindingSeverity`

## 7. Backend capabilities without an obvious frontend screen

- `POST /sources/{id}/verify` (source identity verification) — no dedicated UI path
  observed in the frontend suite; reviewer UI handles registration decisions only.
- `GET /evaluation/cycles/{id}/aggregation` (read aggregation after the fact).
- `POST /evaluation/cycles/{id}/publish-to-portal` (manual re-publish).
- `GET /evaluation/me/criteria` (criteria catalog per pool).
- `GET /codejudge/admin/scoring-config` (category/policy introspection).
- `GET /codejudge/admin/jobs` (queue depth/state) — likely needs an admin screen.
- `POST /codejudge/admin/evaluations/{id}/retry|reevaluate`.

## 8. Frontend-like concepts NOT supported by the backend

- **Password login / email-password**: not implemented — phone OTP only.
- **Edit/delete a problem** after submission: only status transitions exist.
- **Edit/delete a published problem**: portal catalog is push-only (evaluation-service).
- **Delete a submission** (withdraw): no withdraw endpoint; statuses are terminal.
- **Leave a team / remove a member**: `team_member` has no update/delete endpoint
  (only created at submission create time).
- **Global search / filtering of problems by domain/urgency/etc.**: `GET /problems`
  and `GET /portal/problems` return full/unfiltered lists (no query params).
- **Paginated submissions/catalog**: only the evaluation queue is paginated.
- **Notifications / email**: none implemented (SMS dispatch is a placeholder no-op).
- **Evaluator self-onboarding**: evaluators are created only by ADMIN
  (`POST /users/evaluators` + `POST /evaluation/evaluator-profiles`).

These are recorded as findings — do not assume them when designing the new UI. See
`BACKEND_GAPS_AND_UNKNOWNS.md`.
