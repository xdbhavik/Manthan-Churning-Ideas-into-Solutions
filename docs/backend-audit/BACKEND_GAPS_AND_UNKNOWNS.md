# Backend Gaps, Inconsistencies & Unknowns

> Findings to resolve in a later integration phase. Nothing here implies a change
> was made; this is a record of discrepancies between code, docs, and expectations.

---

## 1. Missing / incomplete functionality

1. **SMS dispatch is a no-op** — `OtpService.sendSms` returns `CompletableFuture.completedFuture(null)`
   (`source-service/.../service/OtpService.java`). In prod the 6-digit code is
   generated but never delivered. Only workable because non-prod returns `devOtp`
   and/or uses `MOCK_OTP_CODE`.
2. **CodeJudge sandbox disabled** — `CODEJUDGE_SANDBOX_ENABLED=false`. BUILDING /
   RUNNING / TESTING / ARCHITECTURE_ANALYSIS / REQUIREMENT_MATCHING stages are
   **never entered**. `FUNCTIONAL` and `PROBLEM_ALIGNMENT` categories always score
   `NOT_EVALUATED` (0) — the final score is driven by the 6 static-evidence
   categories. See `ScoringEngine.notEvaluatedNote`.
3. **`idempotency_key` table is dormant** — defined in `V1__source_schema.sql` but has
   no entity and no service usage (only mentioned in `HmacHasher` Javadoc).
4. **`SourceVerificationService` has no effect on problem rows** — recording a PASS
   marks `problem_source.is_verified_source=true` but does not advance any problem
   status (explicitly documented in the service Javadoc). The `SOURCE_VERIFYING` /
   `SOURCE_VERIFIED` problem statuses are reachable only via manual
   `PATCH /problems/{id}/status`.
5. **No evaluator self-onboarding** — evaluators exist only if an ADMIN calls
   `POST /users/evaluators` (source-service) then `POST /evaluation/evaluator-profiles`
   (evaluation-service). The two calls are **not** chained server-side.
6. **No withdraw/delete submission endpoint**; terminal statuses are ACCEPTED/RETURNED.

## 2. Unimplemented / referenced-but-absent endpoints

- No endpoint exposes `team` or `team_member` updates/deletes (team membership is
  fixed at submission-create time).
- No endpoint for editing `weight_config` (the `EVALUATION_WEIGHT_UPDATED` audit
  action exists but no controller/service writes it).
- No endpoint to resolve `evaluation_disagreement` (entity + status enum exist;
  `EVALUATION_DISAGREEMENT_RESOLVED` is defined but never emitted).
- The `ADMIN_UI_API_GUIDE.md` and per-service `.md` files at the repo root describe
  some behaviors not found in code — treat code as the source of truth.

## 3. Inconsistent API contracts

1. **`audit_action` DB enums differ across services** — Java `AuditAction`
   (edith-common) has 27 values. The DB enums are split: `sih_problem.audit_action`
   has **21** values (V1 only); `sih_eval.audit_action` has **27** (V1's 21 plus 6
   added by `V3__project_review.sql` — `PROBLEM_PUBLISHED`,
   `PROJECT_REVIEW_ASSIGNED`, `PROJECT_REVIEW_DECIDED` — and `V4__auto_evaluation.sql`
   — `EVALUATION_AI_SCORED`, `EVALUATION_AI_UNAVAILABLE`, `EVALUATION_MODE_CHANGED`).
   This is consistent in practice (problem-service never writes the 6
   evaluation-only actions), but it means the shared `AuditAction` enum is broader
   than `sih_problem`'s DB type — writing one of those 6 into `sih_problem.audit_log`
   would fail at runtime.
2. **`CommunitySource` entity vs DDL** — `community_source` DDL defines
   `organization_name`/`registration_number` but the entity doesn't map them (they
   live on the root `ProblemSource`). Payload keys are ignored silently.
3. **Portal `SourceAccountResponse` vs `SourceAccountDetail`** — two different
   internal records; `SourceAccountDetail` adds `institutionName`. Frontends do not
   consume these (internal only).
4. **`GET /problems/{id}/evidence` vs other problem GETs** — evidence list null-guards
   `me`, other endpoints don't; cosmetic only (security still holds via auth entry point).
5. **`AuditAction` vs audit payloads in problem-service** — `ProblemStatusService`
   maps transition → `REJECTED`/`ARCHIVED`/`STATUS_CHANGED`; `ProblemCollectionEngine`
   records `CREATED`; evidence upload records via `AuditService` (action UNVERIFIED
   — inspect `EvidenceUploadService` if needed).
6. **`PriFundsSource` = `FIFTEEN_FC`** in DB/Java (not `15TH_FC`) — naming deviation
   to avoid a leading digit.

## 4. Unclear / unverified behavior

1. **`@Version` merge semantics in codejudge** — entities pre-set `version = 1`,
   which the code comments note causes `merge()` on save. Not a correctness issue
   observed, but worth noting.
2. **Optimistic-lock 500** — `@Version` conflicts surface via the catch-all handler
   as 500 `"Unexpected error: ObjectOptimisticLockingFailureException"` (no dedicated
   handler). `ProblemStatusService.transition` handles its own `expectedVersion` 409
   explicitly.
3. **Portal list endpoints return `List` (no paging)** — a large catalog could be
   large; no server-side limit.
4. **`Severity` is nullable** on `problem` and on the submit DTO (no `@NotNull`) —
   a problem can be persisted without severity.
5. **`EvidenceUploadService` metadata/fileUrl** — `fileUrl` stores an **absolute
   filesystem path** (`target.toString()`), not a download URL; there is **no
   evidence download endpoint** in problem-service (portal has download for
   submission files, but evidence has none).
6. **`GET /evaluation/queue` `size` capped at 100**; `page`/`size` semantics are
   Spring `Pageable` defaults otherwise.

## 5. Frontend integration blockers

1. **Submit is atomic on evaluation-service** — if evaluation-service is down, a
   student cannot submit (502/503). Frontend must handle and retry.
2. **UNIVERSITY auto-bind depends on source-service** — if `GET /internal/users/.../source-accounts`
   is unreachable, `me()` throws 502/503 (portal `SourceAccountsGateway` maps them).
3. **CodeJudge result polling** — no webhook/push to the portal; the frontend must
   poll codejudge (or the reviewer reads the advisory result). UNVERIFIED whether
   any portal endpoint surfaces the codejudge result to the submitter.
4. **No problem search/filter query params** — a redesigned UI wanting filtering
   must fetch full lists or accept this limitation.

## 6. Security / authorization requiring verification

1. **`/internal/**` is `permitAll()` in every service** — protection relies entirely
   on the gateway **not** routing `/internal/**` (confirmed in `Caddyfile` and
   docker-compose). If a service is exposed directly on its port (it is, via
   `ports:` mapping in docker-compose), `/internal/**` is reachable **without any
   auth**. Service-to-service calls also send no shared secret/JWT. This is a
   real exposure if the compose ports are reachable from outside — VERIFY network
   exposure in the target deployment.
2. **JWT `role`/`kyc` are client-verifiable claims** — role changes lag up to 15 min
   (access TTL) and cannot be force-expired (no token revocation list).
3. **OTP is HMAC-peppered but 6 digits** — brute-force limited by 3 attempts per
   challenge and 5 challenges/phone/hour; pepper prevents offline cracking of a
   leaked DB. Production pepper/JWT secret presence is enforced at startup.
4. **`GET /problems` lists ALL problems to staff** (REVIEWER/ADMIN) with no
   filtering/ownership — by design, but confirm it's intended for the new admin UI.

## 7. Could not be confirmed (UNKNOWN)

1. Runtime behavior of `AiStage`/`AiAdvisor` against a live LLM (no key configured
   in this environment).
2. Exact `EvaluatorType`→pool display strings used by any frontend (backend returns
   `name()` strings).
3. Whether seed/demo data scripts (`seed_demo_data.py`, `seed-sample-cases.ps1`,
   `test_submit.py`, `link_cycles_assignments.py`) are still current — they are
   helper scripts outside the build and were not executed.
