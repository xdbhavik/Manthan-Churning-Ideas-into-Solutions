# Business Logic — Feature Workflows & Rules

> Complete request-to-database flows, state machines, authorization, and side
> effects, as implemented. Status codes cited are the actual codes thrown.

---

## 1. Authentication & Identity (source-service)

### OTP issuance (`OtpService.issue`)
1. Count `otp_challenge` rows for the phone in the last hour; if `>= 5` → **429**
   `"OTP rate limit reached for this phone (5/hour)"`.
2. Generate 6-digit code: fixed `app.otp.mock-code` if set **and not prod**, else
   `SecureRandom` 6-digit.
3. Persist `otp_challenge` with `otp_code_hash = HMAC-SHA256(code, IDENTITY_PEPPER)`,
   5-min `expiresAt`, `attemptCount=0`. Only the hash is stored.
4. Fire-and-forget `sendSms` (currently a placeholder no-op).
5. Return `OtpResponse` (`challengeId`, `expiresAt`, `devOtp` non-prod only,
   `requestsRemainingInWindow`).

### Register / login
- `POST /auth/register`: `createUser(SUBMITTER)` then `issue`. `createUser` throws
  **409** if phone exists.
- `POST /auth/login`: **404** if phone unknown, else `issue`.
- `POST /users/evaluators` (ADMIN): `createUser(EVALUATOR)` then `issue` (evaluator
  never self-registers).

### Verify OTP (`AuthService.verifyOtp` → `OtpService.verifyAndGetPhone`)
- **404** unknown challenge; **400** already used; **400** expired; **429** if
  `attemptCount >= 3`; increment attempts; constant-time compare HMAC; **400**
  `"Incorrect OTP"` on mismatch; on success set `consumedAt`, return phone.
- Resolve user by phone (**401** if missing), mint 15-min HS256 access JWT (claims:
  `sub`, `iss=sih26043`, `iat`, `exp`, `phone`, `role`, `kyc`) + a server-side UUID
  refresh token (7-day TTL). Return `VerifyOtpResponse`.

### Refresh & logout
- `refresh`: **401** unknown/expired/revoked token or deleted user; rotate (revoke
  old, mint new pair).
- `logout`: revoke the refresh token if present (idempotent, no error on unknown).
  Access token stays valid until TTL (no revocation list).

### Role/account status
- Roles: `SUBMITTER`, `REVIEWER`, `ADMIN`, `EVALUATOR`. Role is claim-based; a
  changed role/kyc only takes effect when a new access token is minted (≤15 min lag).
- `kyc_status` (`UNVERIFIED`/`VERIFIED`) is set `VERIFIED` when a registration the
  user owns is **approved**.

---

## 2. Source Registration & Verification (source-service)

### Registration draft lifecycle (`RegistrationService`)
State machine (submit-side):
```
DRAFT --submit--> SUBMITTED --(reviewer)--> UNDER_REVIEW --approve--> APPROVED
                                                 |--reject--> REJECTED
                                                 |--request-action--> ACTION_REQUIRED
ACTION_REQUIRED --submit--> UNDER_REVIEW
```
- `POST /registration` (public): find-or-create user (SUBMITTER); create DRAFT
  registration with `source_payload` (JSONB, includes `documents`); append history
  row; issue OTP. `sourceBucket` derived from `sourceType` via `SourceTypeCatalog.bucketOf`.
- `PATCH /registration/{id}`: owner-only (**403**), only DRAFT/ACTION_REQUIRED
  (**409** otherwise); replaces payload.
- `POST /registration/{id}/submit`: owner-only; DRAFT→SUBMITTED (validate required
  fields via `SourceTypeCatalog.validatePayload`, else **400**) or
  ACTION_REQUIRED→UNDER_REVIEW (clears comment); **409** otherwise.
- `GET /registration/{id}/status` is public (no payload, status + reason/comment only).

### Reviewer decisions (`RegistrationReviewService`)
- Queue: `SUBMITTED|UNDER_REVIEW|ACTION_REQUIRED` (FIFO by `submittedAt`).
- `assign`: SUBMITTED/UNDER_REVIEW → UNDER_REVIEW, set `assignedReviewerId` (**409** otherwise).
- `approve`: only SUBMITTED/UNDER_REVIEW. If payload lacks materialization-required
  fields → **422**. Otherwise:
  1. `SourceMapper.materialize(...)` → concrete `ProblemSource` subclass (JOINED).
  2. Save `ProblemSource` (`verified_source=true`).
  3. Open `SourceAccount` (`ACTIVE` + `VERIFIED` from birth) — **the only place
     source_account rows are created**.
  4. Mark registration APPROVED, set `sourceId`, `reviewedAt`.
  5. Set owner `linkedSourceId` + `kycStatus=VERIFIED`.
  6. Append history.
- `reject`: **400** blank reason; SUBMITTED/UNDER_REVIEW → REJECTED (stores reason).
- `request-action`: **400** blank comment; → ACTION_REQUIRED (stores comment).

### Source verification (`SourceVerificationService.verify`)
- REVIEWER/ADMIN only; **404** unknown source; appends `source_verification` row;
  on `PASS` also sets `problem_source.is_verified_source=true`. No effect on problem
  rows (see `BACKEND_GAPS_AND_UNKNOWNS.md`).

---

## 3. Problem Ingestion & Status (problem-service)

### Submission (`ProblemSubmissionService` → `ProblemCollectionEngine.receiveSubmission`)
1. `effectiveAccessRule`: `req.accessRule ?? OPEN_TO_ALL`.
2. If `AUTO_SELECTED_UNIVERSITIES`: call `AutoUniversitySelectionService.resolve`
   **before** the write transaction (fail-closed 400 if LLM unconfigured/unresolvable).
3. `requireSubmittableAccount`: fetch `GET /internal/source-accounts/{id}`;
   - not owned → **403 `SOURCE_NOT_OWNED`**;
   - `!canSubmit` (not ACTIVE+VERIFIED) → **403 `SOURCE_NOT_VERIFIED`**.
4. `requireKnownDomains`: unknown domain id → **400**.
5. Persist `location` (country defaults `"India"`, lat/lon as `BigDecimal`).
6. Persist `problem` (status `SUBMITTED`, sourceBucket/subEntityType from account).
7. `applyAccessRule`: `SELECTED_UNIVERSITIES` requires non-empty `accessUniversities`
   (**400**); `AUTO_SELECTED_UNIVERSITIES` requires resolved list (**400**); others → empty.
8. Attach `problem_domain` (first = primary).
9. Store `evidence` (SHA-256 dedupe → **409** on duplicate `file_hash`).
10. Audit `CREATED`.

### Status transitions (`ProblemStatusService.transition`)
Allowed map:
```
SUBMITTED         -> SOURCE_VERIFYING, REJECTED, ARCHIVED
SOURCE_VERIFYING  -> SOURCE_VERIFIED, REJECTED
SOURCE_VERIFIED   -> REGISTERED, SUBMITTED, REJECTED
REGISTERED        -> SUBMITTED, ARCHIVED, REJECTED
REJECTED          -> SUBMITTED, ARCHIVED
ARCHIVED          -> SUBMITTED, REJECTED
```
- REVIEWER/ADMIN only. **404** missing; **409** stale `expectedVersion`; **400**
  already-in-target / illegal transition. Audit action = REJECTED/ARCHIVED/STATUS_CHANGED.

### Evidence upload (`EvidenceUploadService.upload`)
- multipart; SHA-256 streamed; **409** duplicate hash; sanitized filename stored
  under `EVIDENCE_STORAGE_DIR`; **400** path traversal; **500** I/O/hash failure.

### Domain taxonomy (`DomainService`) — 3-level tree, `GET /domains` public.

### `canSee()` equivalent (problem-side access rule)
Access rules (`ProblemAccessRule`) are enforced at the **portal** (see §6) and by
`AUTO_SELECTED_UNIVERSITIES` resolution at submit time. problem-service itself does
not filter problem lists by access rule beyond ownership.

---

## 4. Evaluation Cycle Lifecycle (evaluation-service)

State machine (`EvaluationStatusService.ALLOWED`):
```
RECEIVED -> ANALYZING
ANALYZING -> ROUTING | ANALYSIS_FAILED
ANALYSIS_FAILED -> ANALYZING
ROUTING -> EVALUATION_IN_PROGRESS
EVALUATION_IN_PROGRESS -> EVALUATION_COMPLETED | ROUTING
EVALUATION_COMPLETED -> SCORES_AGGREGATED
SCORES_AGGREGATED -> EVALUATION_IN_PROGRESS | PRIORITIZED
PRIORITIZED -> PHASE_3_READY
PHASE_3_READY -> (terminal)
```
`completedAt` set when reaching PRIORITIZED / PHASE_3_READY. Every transition
appends an `evaluation_status_history` row. Illegal transition → **400**
`"Illegal evaluation transition X -> Y"`.

### Start (`EvaluationIntakeService.start`)
- Fetch problem context; **400** unless problem status == `REGISTERED`; **409** if a
  cycle already exists for the problem (`problem_id` UNIQUE). Create cycle
  `RECEIVED`, `triggerMethod="ADMIN"`. Audit `EVALUATION_STARTED`.

### Analyze (`ProblemAnalysisService.analyze`)
- RECEIVED/ANALYSIS_FAILED → ANALYZING; else **400**. LLM analysis
  (`OpenAiCompatibleAnalysisClient`) with `HeuristicAnalysisFallback` on
  unavailable/failed. Upsert `problem_analysis`. Transition → ROUTING. Audit
  `EVALUATION_ANALYZED`.
- `POST /cycles/{id}/analyze` additionally auto-routes all pools and (if completed)
  best-effort publishes.

### Route (`EvaluationRoutingService`)
- `route` (single bucket pool): only from ROUTING; `poolFor(sourceBucket)`
  (`GOVT→GOVERNMENT`, `INDUSTRY→INDUSTRY`, `COMMUNITY→COMMUNITY`, `HEI→HEI`,
  `CITIZEN→CITIZEN`); pick **least-loaded** active human under `max_workload`
  (excluding already-assigned). **400** unknown bucket.
- `routeAllPools` (five pools): for each pool in MANUAL mode → least-loaded human;
  AUTO mode → AI scorecard if `AutoEvaluationService.available()`, else degrade to
  human (audit `EVALUATION_AI_UNAVAILABLE`). Creates assignments, transition
  ROUTING→EVALUATION_IN_PROGRESS if any created, submits AI scorecards via
  `submitAsSystem`.
- Least-loaded algorithm: `openLoad = count(status in {ASSIGNED, IN_PROGRESS})`,
  choose candidate with smallest openLoad `< maxWorkload`; ties → first found.

### Scoring (`EvaluatorAssignmentService.persistScorecard`)
- Validate scorecard: **409** already submitted / not ASSIGNED|IN_PROGRESS /
  expired (sets EXPIRED); **400** missing criterion ref, unknown criterion,
  duplicate, score>max, incomplete. Persist `evaluation_response` rows; assignment
  → SUBMITTED; audit `EVALUATION_SUBMITTED`.
- `submitAsSystem` (AI): **409** if assignment belongs to a human.
- `completeCycleIfNoOpenAssignments`: when no open assignment remains in
  EVALUATION_IN_PROGRESS → EVALUATION_COMPLETED (audit `EVALUATION_COMPLETED`).
- `accept`: ASSIGNED→IN_PROGRESS. `decline`: →DECLINED; reopens routing if none open.

### Aggregate (`ScoreAggregationService.aggregate`)
- Only from EVALUATION_COMPLETED/SCORES_AGGREGATED (**409** otherwise); **409** no
  submitted scorecard. Compute per-pool normalised scores, configured weights (or
  EQUAL), `overallScore = Σ(weight × normalised)` clamped [0,100]. `impactLevel`
  (HIGH≥70, MEDIUM≥40, else LOW). Disagreement flag if spread > 30 (≥2 pools).
  Upsert `ScoreAggregation`; set cycle `finalScore`/`impactLevel`; transition
  → SCORES_AGGREGATED. Audit `EVALUATION_AGGREGATED` (+ `EVALUATION_DISAGREEMENT_FLAGGED`).

### Prioritize (`PrioritizationService.prioritize`)
- Only from aggregated statuses (**409**). `priorityScore = finalScore`;
  `band` P1≥80, P2≥65, P3≥50, else P4. SCORES_AGGREGATED→PRIORITIZED→PHASE_3_READY.
  Audit `EVALUATION_PRIORITIZED`.

### Publish (`PortalPublishService`)
- Only from `{EVALUATION_COMPLETED, SCORES_AGGREGATED, PRIORITIZED, PHASE_3_READY}`
  (**409**). Calls `POST /internal/published-problems` with `cycleId` + problem
  context. Audit `PROBLEM_PUBLISHED`. Best-effort in auto-flows, throws in manual
  `publish-to-portal`.

---

## 5. Portal Participants & Catalog (portal-service)

### Participant resolution (`ParticipantService.me`)
- Look up `participant` by JWT `userId`; return if found.
- Else, `firstUsableHeiAccount`: first `SourceAccountDetail` with `canSubmit` and
  `sourceBucket == "HEI"`. If found → auto-create `UNIVERSITY` participant
  (`institutionName` = HEI `institutionName`, `sourceAccountId`). Else → **404
  `STUDENT_NOT_REGISTERED`**.
- `POST /portal/participants` (STUDENT self-register): **409** if profile exists or
  HEI account owned.

### `canSee()` access matrix
| Participant | `OPEN_TO_ALL` | `UNIVERSITY_ONLY` | `SELECTED_UNIVERSITIES` / `AUTO_SELECTED_UNIVERSITIES` |
|:---|:---:|:---:|:---|
| STUDENT | visible | **hidden (404)** | **hidden (404)** |
| UNIVERSITY | visible | visible | visible only if normalized `institutionName` ∈ `accessUniversities` (case/whitespace-insensitive) |

Applied in `PublishedProblemService.list/detail` (hidden rows → 404, never leaked)
and `SubmissionService.requireVisible`/`createTeam` (member join → 403).

### Catalog
- `GET /portal/problems`: published problems the caller may see, newest first.
- `GET /portal/problems/{id}`: detail or 404.

---

## 6. Submission Lifecycle (portal-service)

State machine:
```
DRAFT --submit--> UNDER_REVIEW --(evaluator decide)--> ACCEPTED | RETURNED
RETURNED --edit meta / upload--> (still RETURNED) --submit--> UNDER_REVIEW (review_round++)
```
`SUBMITTED` exists only as a transient enum value (referenced in `ACTIVE_STATUSES`);
the persisted post-submit status is `UNDER_REVIEW`.

### Create draft (`SubmissionService.create`)
- `requireVisible` (**403** if not visible, **404** if problem missing).
- Team mode if `memberUserIds` non-empty OR `teamName` non-blank: create `team`,
  add leader (`LEADER`), add members (**403** if a member can't see the problem).
- Individual: **409** if an active (DRAFT/SUBMITTED/UNDER_REVIEW) submission already
  exists for the problem.
- Save DRAFT.

### Edit meta (`updateMeta`) — DRAFT/RETURNED only (**409** "meta frozen" otherwise);
null fields unchanged.

### Files (`SubmissionFileService`)
- Upload/delete only DRAFT/RETURNED (**409**) by submitter/team member (**403**);
  50 MB cap; SHA-256 + sanitized name under `PORTAL_FILE_STORAGE_DIR`.
- Download authorized for submitter/team member, assigned `reviewerUserId`, or
  REVIEWER/ADMIN role.

### Submit (`SubmissionService.submit`) — the critical path
1. `requireActor` (submitter/team member). Only DRAFT/RETURNED (**409**).
2. `requireArtifact`: title/summary/file/link present (**400**).
3. `requirePinnedCommit`: GitHub submission must pin `commitSha` 7-64 chars
   `[A-Za-z0-9._-]` (**400**).
4. **Blocking** call `POST /internal/project-reviews` (evaluation-service) to open a
   review assigned to the evaluator who scored the problem. Failure (409/502/503)
   **rolls back the whole transaction** — no UNDER_REVIEW row without a review.
5. Bump `reviewRound++`, set `reviewerUserId`, status `UNDER_REVIEW`, `submittedAt`.
6. Best-effort `POST /internal/codejudge/evaluations` (repo-backed only; never rolls
   back). File-only submissions skip codejudge.

### Review result (`SubmissionService.acceptReviewResult`, internal)
- `decision` ∈ {ACCEPTED, RETURNED} (**400** otherwise). Already at a terminal state
  → idempotent. Only from UNDER_REVIEW (**409**). Set status + `decisionComment` +
  `decidedAt`.

---

## 7. Project Reviews (evaluation-service)

### Create (`ProjectReviewService.createInternal`)
- **409** `PROBLEM_NOT_EVALUATED` if no cycle / cycle not in reviewable statuses /
  no submitted assignment.
- Idempotent on `(submissionId, round)`.
- `resolveReviewer`: (1) first SUBMITTED assignment with a non-system profile;
  (2) least-loaded active human (ignores max_workload); (3) else **409**.
- Audit `PROJECT_REVIEW_ASSIGNED`.

### Decide (`ProjectReviewService.decide`)
- **409** not ASSIGNED; **400** decision not ACCEPTED/RETURNED. Set status +
  `decisionComment` + `decidedAt`. Audit `PROJECT_REVIEW_DECIDED`. Best-effort
  `POST /internal/submissions/{id}/review-result` (portal).

---

## 8. CodeJudge Pipeline (codejudge-service)

### Create (`EvaluationService.create`)
- `validateRepositoryUrl`: reject empty (**400**), `http://` (**400**), and
  non-remote/non-local. Idempotent on `(portalSubmissionId, commitSha)`.
- Persist `project_submission` (+ problem snapshot via problem-service, tolerant).
- Persist `evaluation` (QUEUED); `JobQueueService.enqueue`.

### Worker (`EvaluationWorker` `@Scheduled` 3s)
- `claimNext` (DB-backed queue, optimistic-lock retry, max 3 attempts, stale-claim
  reclaim after 900s). Runs `EvaluationPipeline`.

### Pipeline stages (order, with `sandbox-enabled=false`)
`CloneStage` (CLONING) → `ScanStage` (SCANNING) → `SecurityScanStage`
(SECURITY_SCANNING) → `AiStage` (AI_ANALYSIS) → `ScoringStage` (SCORING) →
`ReportStage` (REPORT_GENERATION → COMPLETED). BUILDING/RUNNING/TESTING/
ARCHITECTURE_ANALYSIS/REQUIREMENT_MATCHING are never entered.

- **Clone**: `git clone --quiet` + `git checkout <commitSha>`; or directory snapshot.
- **Scan**: `AgenticLegibilityInvoker` (Python) else `StaticHeuristicsScanner`;
  writes `code_analysis` rows per category.
- **SecurityScan**: `SecretScanService` regex scan (private keys → CRITICAL, AWS
  keys → CRITICAL, hardcoded secrets → HIGH, committed `.env` → HIGH).
- **Ai**: `AiAdvisor` advisory JSON (UNAVAILABLE if no key).
- **Scoring**: `ScoringEngine.evaluate` — `score = Σ(categoryScore/categoryMax × weight)`;
  SECURITY penalty = `highCount × HIGH_SECURITY_PENALTY`; CRITICAL → verdict BLOCKED;
  verdict EXCELLENT≥80 / GOOD≥60 / NEEDS_WORK otherwise.
- **Report**: JSON + Markdown report.

### Retry / reevaluate (admin)
- `retry`: only FAILED → QUEUED + re-enqueue (**409** otherwise).
- `reevaluate`: new `evaluation` over the same submission (fresh job).

---

## 9. Authorization summary

| Operation | Required role / ownership |
|:---|:---|
| User get/role-change, evaluator onboarding | `ADMIN` |
| Registration review (queue/assign/approve/reject/request-action) | `REVIEWER` or `ADMIN` |
| Source verification (`POST /sources/{id}/verify`) | `REVIEWER` or `ADMIN` |
| Problem status change, audit read | `REVIEWER` or `ADMIN` |
| Problem submit/read/evidence | owner (SUBMITTER sees own; staff sees all) |
| Evaluation cycle admin | `ADMIN` or `REVIEWER` |
| Evaluator workspace + project reviews | `EVALUATOR` (own profile/assignments/reviews) |
| Evaluator profile create | `ADMIN` |
| Pool mode read/write | `EVALUATOR`/`ADMIN` (ownership: pool's own evaluator or ADMIN) |
| Portal (`/portal/**`) | any authenticated user resolving to a `Participant` |
| CodeJudge (`/codejudge/**`) | `ADMIN` or `EVALUATOR` |
| CodeJudge admin (`/codejudge/admin/**`) | `ADMIN` |

Resource-level ownership checks: source accounts (owner or staff), registrations
(owner or staff), problems (owner or staff), submissions (submitter/team member/
assigned reviewer/staff), assignments/project reviews (assigned evaluator),
codejudge evaluations (owner or staff).
