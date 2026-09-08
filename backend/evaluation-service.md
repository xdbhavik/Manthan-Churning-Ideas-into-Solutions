# SIH26043 — evaluation-service: planning & design notes

> Consolidated record of the planning behind the **evaluation-service** (the Phase‑2
> evaluation engine). Written for the team working on SIH26043; keep it updated when the
> pipeline moves forward. Scope here is *planning and design*, not a code tour — link to
> the sources you care about under each section.

---

## 1. What this service is

`evaluation-service` is the **Phase‑2 evaluation engine** of SIH26043. Given a problem that
has been registered, it runs a state-machine pipeline that ends with a scored, prioritised
problem ready for Phase 3:

```
RECEIVED → ANALYZING → ROUTING → EVALUATION_IN_PROGRESS → EVALUATION_COMPLETED
        → SCORES_AGGREGATED → PRIORITIZED → PHASE_3_READY
```

It is a standalone Spring Boot service (port **8083**, DB **`sih_eval`**) that owns the whole
`evaluation_*` aggregate. It never reads another service's database — it reaches problems via
an internal HTTP call to problem-service (`GET /internal/problems/{id}`).

### Where it sits

```
                      ┌──────────────────────────  gateway :8080 (Caddy)  ──────────────────────────┐
                      │                                                                             │
        /auth /registration /sources /reviewer/registrations        /evaluation/*                   │
                      ▼                                                                             │
           source-service :8081 (sih_source)                      evaluation-service :8083 (sih_eval)
           (identity, registration, accounts, EVALUATOR role)          ▲                           │
                      ▲                                                │ GET /internal/problems/{id}
                      │        problem-service :8082 (sih_problem) ────┘
                      └──────── (problems, domains, problem audit)
```

All three services + the gateway register with **Eureka** (`eureka-server :8761`). The internal
problem→source and evaluation→problem calls resolve peers through discovery by service id, not
by fixed URL.

---

## 2. Planning history (how we got here)

| Milestone | Commit | What was decided / built |
|---|---|---|
| Monolith baseline | `5370b3e` | Phase‑2 engine + frontends lived in one `app`. |
| Step 1a/1b — reactor | `73b4c83`, `7d8128c` | Claim-based JWT (`AuthUser` from token claims); Maven multi-module reactor with shared kernel jars `edith-common` (enums, `ApiException`, internal DTOs) and `edith-security` (`JwtService`, `JwtAuthFilter`). |
| **Step 3 — extract evaluation-service** | `47f009d` | The evaluation pipeline became a standalone service on its own DB (`sih_eval`) with its own Flyway schema. Cross-database FKs were replaced by plain UUID columns (ownership lives elsewhere now). |
| Step 4 — extract problem-service | `e15d83e` | Problem aggregate moved out; evaluation now reaches problems over `GET /internal/problems/{id}` instead of a shared table. |
| **Routing engine** | `20fb1ed` | Profile onboarding + bucket-based least-loaded auto-route after `analyze`, plus manual `route` retry (see §7). |
| Step 6 — Eureka | `f8fe6ce` | Discovery clients; internal `@HttpExchange` clients address peers by service id. |
| **Local LLM provider** | `c9df0d7` | The Anthropic call was replaced by the user's local OpenAI-compatible model (`agentrouter/deepseek-v4-flash`). API key lives only in gitignored `.env`; empty key → deterministic heuristic. |
| **Evaluator scoring endpoints** *(uncommitted)* | — | `/evaluation/me/*` dashboard: accept / decline / submit scorecards against seeded per-pool criteria, plus ADMIN `POST /evaluation/evaluator-profiles`. Two design fixes fell out of it (see §7.4). |

Pipeline steps **not yet built** (design intent exists, code does not): `SCORES_AGGREGATED`
(aggregation), `PRIORITIZED` / `PHASE_3_READY`. See §10.

---

## 3. Locked decisions (product-owner rules)

These were confirmed with the product owner and are the *source of truth* for routing:

- **Who evaluates a problem** is decided by **where the problem came from** — its origin bucket,
  denormalised as `problem.source_bucket`. The evaluator pool that matches the bucket does the
  scoring:

  | Problem `source_bucket` | Evaluator pool (`evaluator_type`) |
  |---|---|
  | `GOVT` | `GOVERNMENT` |
  | `INDUSTRY` | `INDUSTRY` |
  | `COMMUNITY` | `COMMUNITY` |
  | `HEI` | `HEI` |
  | `CITIZEN` | `CITIZEN` |

- **How many evaluators:** exactly **one** — the least-loaded **active** profile of the matching
  pool whose open workload is below its `max_workload`.
- **When:** automatically, in the same `analyze` request, immediately after the cycle reaches
  `ROUTING`; plus an explicit ADMIN/REVIEWER `POST …/cycles/{id}/route` as the retry path.
- **No candidate** (no active profile of that pool, or everyone is at capacity): the cycle
  **stays `ROUTING`** and is visible in the queue; a later `route` call retries. Not an error.
- **The AI never scores.** `analyze` produces an advisory problem profile (LLM or heuristic); it
  informs the human evaluator and is stored for audit, but is never part of the score.

---

## 4. Data model (`sih_eval`)

Flyway `V1__evaluation_schema.sql` + `V2__evaluation_seed_data.sql`. `ddl-auto: validate` — the
schema is migration-owned; **never hand-edit an applied migration** (checksum → `validate` fails).

Cross-service references are **plain UUIDs** (no FK to `sih_source`/`sih_problem`):

| Table | Purpose | Notes |
|---|---|---|
| `evaluator_profile` | 1:1 with a `users` row whose role is `EVALUATOR` (`user_id` unique) | pool, `max_workload` (default 5), `is_active`, `region_states JSONB`, `affiliated_source_id` (conflict-of-interest) |
| `evaluator_domain` | profile ↔ domain matching | **not used yet** — owner rule is bucket-based, so domain filter is dormant |
| `evaluation_cycle` | aggregate root, **1 per problem** (`problem_id` unique) | status + final score/priority output columns |
| `evaluation_status_history` | append-only lifecycle trail | one row per transition, `from_status`/`to_status` |
| `problem_analysis` | AI output (LLM or heuristic) | parsed columns + `raw_payload JSONB` for audit; `status` ∈ `SUCCESS / HEURISTIC_FALLBACK / FAILED` |
| `evaluation_criterion` | per-pool scoring catalog | seeded in V2: **5 criteria per pool**, `max_score 10`, `UNIQUE(evaluator_type, criterion_key)` |
| `evaluation_assignment` | one row per selected evaluator | `UNIQUE (cycle_id, evaluator_profile_id)`, deadline, `conflict_recheck` |
| `evaluation_response` | **normalised per-criterion scores** | composite PK `(assignment_id, criterion_id)`, `score SMALLINT CHECK 1..10` |
| `evaluation_aggregation` | final per-cycle result (1:1) | `per_type_scores JSONB`, `weighting_method CONFIGURED/EQUAL` — **table only, step unbuilt** |
| `evaluation_disagreement` | divergence flag + resolution trail | **unbuilt step** |
| `weight_config` | per-pool weights | V2 default seed, e.g. GOVERNMENT 0.25 / INDUSTRY 0.15 / HEI 0.15 / CITIZEN 0.25 / COMMUNITY 0.20 |
| `audit_log` | **service-local** generic audit | `entity_type` + `entity_id`; full `AuditAction` vocabulary incl. `EVALUATION_STARTED/ANALYZED/ROUTED/SUBMITTED/COMPLETED/…` |

### Cycle state machine (enforced in `EvaluationStatusService.ALLOWED`)

```
RECEIVED ─────────────► ANALYZING ────────► ROUTING ──────────────► EVALUATION_IN_PROGRESS
                             ▲                │  ▲  │                        │
                       ANALYSIS_FAILED        │  └──(decline / expiry of the last open
                             │                │        assignment) ──── back to ROUTING
                             └── retry ───────┘                        │
                                     EVALUATION_IN_PROGRESS ─► EVALUATION_COMPLETED ─► SCORES_AGGREGATED
                                                                                          │
                                              PRIORITIZED ◄──(or back to EVALUATION_IN_PROGRESS for
                                                  │               re-aggregation after a disagreement)
                                                  ▼
                                           PHASE_3_READY  (terminal)
```

Illegal transitions → `400`; `current == target` → `400 "Already in status …"`.

### Assignment lifecycle

```
ASSIGNED ──accept──► IN_PROGRESS ──submit──► SUBMITTED
    │                    │                       ▲
    │                    └──decline──────────► DECLINED     (also EXPIRED lazily, see §8.4)
    └─────────────────────decline───────────► DECLINED
```

`REVIEWED` exists in the enum (post-aggregation review), unused today.

---

## 5. HTTP surface

All routes go through the gateway on `:8080` with the same prefix (`/evaluation/…`). Enforced
roles come from the claim-based JWT (`ROLE_<role>`).

### 5.1 ADMIN / REVIEWER — pipeline steps + read model (`EvaluationAdminController`)

| Method & path | Action | Notes |
|---|---|---|
| `POST /evaluation/problems/{problemId}/start` | Open an evaluation cycle | Validates problem is `REGISTERED` and no cycle exists yet → `RECEIVED` (201). |
| `POST /evaluation/cycles/{cycleId}/analyze` | Run AI problem analysis | Advances to `ROUTING`, then **auto-routes** (§7). Idempotent re-run replaces the profile. |
| `POST /evaluation/cycles/{cycleId}/route` | Route to an evaluator (manual retry) | No-op `routed=false` when cycle is not `ROUTING`. |
| `GET /evaluation/cycles/{cycleId}` | Cycle detail | |
| `GET /evaluation/cycles/{cycleId}/history` | Status history | append-only, ascending. |
| `GET /evaluation/queue?status=&page=&size=` | Evaluation queue | FIFO by `started_at`; optional status filter; page size ≤ 100. |

### 5.2 ADMIN — evaluator profile onboarding (`EvaluatorProfileAdminController`)

| Method & path | Action | Notes |
|---|---|---|
| `POST /evaluation/evaluator-profiles` | Bind an EVALUATOR user to a pool | `{userId, evaluatorType, fullName, …}`. 409 if a profile already exists for the user. Defaults `maxWorkload=5`, `experienceYears=0`, `active=true`. |

**Two-call onboarding flow (why this endpoint exists):** there was no way to create an
`evaluator_profile`, so routing had no candidates. The identity half lives in source-service
(`POST /users/evaluators`, ADMIN, creates the phone/role record and returns its `userId`); this
endpoint supplies the *pool + workload* half. Cross-service role validation is deferred (no
`GET /internal/users/{id}` yet).

### 5.3 EVALUATOR — own dashboard (`EvaluatorController`)

Everything is implicitly scoped to the caller's profile (JWT subject → `user_id` → profile);
an `assignmentId` in the path is authorised against that profile (**403** for someone else's).

| Method & path | Action | Notes |
|---|---|---|
| `GET /evaluation/me/profile` | My profile | 404 when EVALUATOR role exists but no profile onboarded yet. |
| `GET /evaluation/me/criteria` | My pool's active criteria (blank scorecard) | display order; each has its own `maxScore`. |
| `GET /evaluation/me/assignments?status=` | My work queue | earliest deadline first, optional status filter; served entirely from `sih_eval` so it lists even when problem-service is down. |
| `GET /evaluation/me/assignments/{id}` | Scoring screen | work item + problem (fetched live) + advisory AI profile + my entered scores; problem `null` on upstream outage but criteria form still returned. |
| `POST /evaluation/me/assignments/{id}/accept` | `ASSIGNED → IN_PROGRESS` | idempotent re-accept; past deadline → `EXPIRED` + 409. |
| `POST /evaluation/me/assignments/{id}/decline` | `ASSIGNED/IN_PROGRESS → DECLINED` | optional reason; if last open assignment, cycle drops back to `ROUTING`. |
| `POST /evaluation/me/assignments/{id}/submit` | Store scorecard, close assignment | all-or-nothing validation (§8.2); if last open assignment, cycle → `EVALUATION_COMPLETED`. |

### 5.4 Internal (not routed by the gateway)

`GET /internal/problems/{id}` on **problem-service** → `ProblemContextResponse`
(`edith-common`). Enum values travel as `name()` strings so the services never share a
persisted enum. The snapshot also carries the problem's **access scope**
(`accessRule` ∈ `OPEN_TO_ALL`/`UNIVERSITY_ONLY`/`SELECTED_UNIVERSITIES` + the
`accessUniversities` name list for `SELECTED_UNIVERSITIES`), which the evaluator sees on
the scoring screen (§5.3 `GET /evaluation/me/assignments/{id}`). Wrapped by
`ProblemContextGateway`, which maps failures to domain errors:

- upstream 404 → `404`;
- other upstream error status → `502`;
- connect / timeout (problem-service down) → `503`.

---

## 6. Intake (start) — `EvaluationIntakeService`

1. Fetch the problem snapshot via the gateway.
2. **Eligibility:** `problem.status == REGISTERED` (else `400 INVALID_PROBLEM_STATUS`); no cycle
   already exists for that problem (else `409 DUPLICATE_EVALUATION`).
3. Create the cycle in `RECEIVED` with `trigger_method=ADMIN`, append the first history row
   (`null → RECEIVED`, "Evaluation cycle opened"), and write an `EVALUATION_STARTED` audit row on
   `entity_id = problem_id`.

> **`@Version` merge gotcha (recorded — easy to reintroduce):** `save()` on a *new* entity whose
> `@Version` is pre-set (1) goes through Hibernate `merge()`, which returns a managed copy; the
> original stays transient with a `null` id until flush. **Always read the id from the returned
> copy** (`cycle = cycleRepository.save(cycle)`), or history/audit rows get a null FK. Same rule
> applies to assignments and profiles.

---

## 7. Routing — `EvaluationRoutingService`

### 7.1 The algorithm

`route(cycleId, actor, ip)`:

1. Load cycle; if `status != ROUTING` → `routed=false` ("requires ROUTING") — **no-op, not an error.**
2. `problemGateway.fetch(problemId)` → `source_bucket` → map to pool via the fixed
   `BUCKET_TO_POOL` table (§3). Unknown / null bucket → `400`.
3. Compute the **already-tried set** = every profile that already holds an assignment on this
   cycle. Re-route after a decline must pick someone new (and must not violate
   `UNIQUE (cycle_id, evaluator_profile_id)`).
4. Among active profiles of the pool, **excluding already-tried**, pick the one with the lowest
   open workload (`ASSIGNED` + `IN_PROGRESS` counts), strictly below its `max_workload`; ties →
   first in repo order.
5. None eligible → `routed=false` ("no active \<pool\> evaluator under max_workload"), cycle stays
   `ROUTING` for a later retry.
6. Otherwise create one `ASSIGNED` assignment with `deadline = now + assignment-deadline-days`
   (**7 days**, config `app.evaluation.assignment-deadline-days`), transition the cycle to
   `EVALUATION_IN_PROGRESS`, and write an `EVALUATION_ROUTED` audit row.

### 7.2 Auto-route wiring

`analyze` calls `analysisService.analyze(...)` (which moves the cycle to `ROUTING` and commits its
own transaction), then `routingService.route(...)` in a **separate transaction**. A routing
no-op/failure can therefore never roll back a committed analysis profile. Kept at the controller
(not inside `ProblemAnalysisService`) so the analysis service and its tests stay untouched.

### 7.3 Why one evaluator per cycle vs. the 5-pool weight model

The owner's rule assigns **one** evaluator from the **matching** pool — the other four pools never
see a given problem. But `evaluation_aggregation` / `weight_config` (seeded with five weights) were
designed for **several evaluators per problem across pools**. **This is the single biggest design
gap to revisit before building aggregation** (§10): the 5-pool weighted average cannot be computed
from one evaluator.

### 7.4 Two fixes that came out of building the evaluator flow

1. **`EVALUATION_IN_PROGRESS → ROUTING` edge was missing** — a declined problem was a dead end.
   Added to `ALLOWED`; decline of the last open assignment now drops the cycle back to `ROUTING`.
2. **Re-route would pick the decliner again → 500** — a `DECLINED` row no longer counts toward open
   load, so the same least-loaded profile got re-assigned, violating the unique constraint.
   `leastLoadedCandidate` now excludes **every** profile already on the cycle.

---

## 8. Evaluator workflow — `EvaluatorAssignmentService`

### 8.1 Scoping

Every method resolves the caller's profile from the JWT subject first. No endpoint takes an
evaluator id; ownership is enforced (`requireOwnAssignment` → **403** for someone else's row,
**404** when the row doesn't exist).

### 8.2 Scorecard is all-or-nothing

A submission must cover **every active criterion of the pool exactly once**, keyed by
`criterionId` *or* `criterionKey`:

- unknown criterion / duplicate / missing criterion → `400` (missing ones are named in the error);
- score above that criterion's `maxScore` → `400`;
- no active criteria configured for the pool → `409`.

Persist as one `evaluation_response` row per criterion, then close the assignment (`SUBMITTED`,
`submitted_at=now`, store `feedback` + `recommendation`, set `conflict_recheck=true` +
`eligibility_rechecked_at`). Audit `EVALUATION_SUBMITTED` on the problem.

### 8.3 Cycle knock-on

After a submit or decline, if the cycle is `EVALUATION_IN_PROGRESS` and has **no open assignment**
left, the service transitions it:
- submit → `EVALUATION_COMPLETED` (+ audit `EVALUATION_COMPLETED`);
- decline → back to `ROUTING` (problem still unevaluated; ADMIN re-routes).

With several open assignments the cycle keeps running on the rest.

### 8.4 Deadlines are lazy (no scheduler)

Accepting or submitting **past the deadline** marks the assignment `EXPIRED` and fails with 409 —
late work is never silently accepted. `overdue` is surfaced on the queue item for `ASSIGNED` /
`IN_PROGRESS` work. Expiry/relief scheduling is deliberately out of scope for now.

---

## 9. AI analysis — `ProblemAnalysisService` + `service/analysis/*`

`analyze(cycleId, actor, ip)`:

1. Cycle must be `RECEIVED` / `ANALYZING` / `ANALYSIS_FAILED`; it moves to `ANALYZING` first
   (retry after a failure is allowed — no audit loop).
2. Assemble `ProblemContext` (title/description/bucket/urgency/severity/population/outcome/
   location/domains/evidence count) from the problem snapshot.
3. Ask the LLM client; on empty → deterministic **heuristic fallback**; persist the
   `problem_analysis` row (re-run **replaces** the previous profile — `analyzed_at` is set
   explicitly on update too); advance to `ROUTING`; audit `EVALUATION_ANALYZED`.

### 9.1 LLM client (`OpenAiCompatibleAnalysisClient`)

- OpenAI-compatible `chat/completions` against a **local router** (`/v1`), model
  `agentrouter/deepseek-v4-flash`. Inside Docker the host is `host.docker.internal:20128`.
- The system prompt demands **strict JSON with exactly the required keys** and explicitly says it
  must **not score/rank/recommend** — the analysis is advisory context for a human evaluator.
- Settings live in `app.llm.openai.*` (max-tokens 8192, timeout 60 s, 1 retry, temperature 0.2,
  `response_format=json_object` when the router accepts it). `stream:false` is forced because the
  local router streams SSE by default.
- **API key:** read only from `OPENAI_API_KEY` (compose `:-` with **no default**, provided via
  gitignored `.env`). Empty key ⇒ client returns empty ⇒ heuristic fallback, so the service and
  pipeline run without a key.
- **Never throws to the pipeline.** Failures retry up to `max-retries+1` then report `empty`.

### 9.2 Known model quirks (recorded)

- **Reasoning models spend the `max_tokens` budget on `reasoning_content` first**; a truncated
  answer arrives as empty `content` with `finish_reason=length`. Logged distinctly as "raise
  max-tokens", not "endpoint down". This is why the budget is 8192.
- Markdown fences around the JSON are stripped defensively.

### 9.3 Heuristic fallback (`HeuristicAnalysisFallback`)

Deterministic keyword classifier producing the **same JSON shape** (category/domain/sector,
impact-areas vocabulary, complexity/scale/social/technology as LOW/MEDIUM/HIGH). Status recorded
as `HEURISTIC_FALLBACK`. Guarantees the pipeline reaches `ROUTING` offline; `ANALYSIS_FAILED`
stays reachable only for a total outage.

---

## 10. Roadmap — what is designed but not built

| Step | Cycle target | What must happen | Open design questions |
|---|---|---|---|
| Aggregation | `SCORES_AGGREGATED` | Fold `evaluation_response` rows + `weight_config` into `evaluation_aggregation` (overall score, `per_type_scores`). | **1 evaluator vs 5-pool weights** — §7.3. Must be resolved first. |
| Prioritisation | `PRIORITIZED → PHASE_3_READY` | `final_score`, `impact_level`, `priority_score`, `priority_band`; queue by `(priority_band, priority_score DESC)`. | Interaction between pool-specific scores and a single final score. |
| Disagreement | — | Flag deviation beyond threshold; `evaluation_disagreement` lifecycle + re-aggregation edge (`SCORES_AGGREGATED → EVALUATION_IN_PROGRESS` already allowed). | Needs >1 evaluator to be meaningful. |
| Domain/geo matching | — | Use `evaluator_domain` and `region_states` to narrow candidates. | Owner rule is bucket-based; dormant by design. |
| Expiry/relief | — | Scheduler for `EXPIRED`/deadline relief instead of lazy-only. | |

Also optional (out of current scope): conflict-of-interest check against `affiliated_source_id`,
cross-service role validation (`GET /internal/users/{id}`), evidence surfacing to evaluators.

---

## 11. Configuration

See `src/main/resources/application.yaml`:

- `spring.datasource.url` default `jdbc:postgresql://localhost:5432/sih_eval` (compose overrides
  with `DB_URL`).
- `app.jwt.*` — shared HMAC secret/issuer, `issuer: sih26043`.
- `app.problem-service.base-url` — default `http://problem-service` (Eureka service id).
- `app.evaluation.assignment-deadline-days: 7`.
- `app.llm.openai.*` — as §9.1.
- `eureka.client.service-url.defaultZone` — `http://eureka-server:8761/eureka/` in compose;
  `prefer-ip-address: true` (container hostnames are random ids).

---

## 12. Testing

Six Mockito, DB-free test classes (50 methods) mirror the services:

| Class | Methods | Covers |
|---|---|---|
| `EvaluationIntakeServiceTest` | 4 | eligibility, duplicate cycle, history/audit |
| `ProblemAnalysisServiceTest` | 7 | transitions, fallback, idempotent re-run |
| `EvaluationRoutingServiceTest` | 10 | pool mapping (all 5), least-loaded pick, workload cap, no-candidate, exclude-already-tried, non-ROUTING no-op |
| `EvaluationStatusServiceTest` | 5 | allowed/illegal transitions |
| `EvaluatorProfileAdminServiceTest` | 3 | create ok, duplicate → 409 |
| `EvaluatorAssignmentServiceTest` | 21 | queue/detail, accept/decline/submit, scorecard validation, cycle knock-on, expiry, ownership |

Run offline (no DB): `./mvnw -o -pl evaluation-service -am test`. A full build that also boots
the Spring context against the live DB: `./mvnw -o -pl evaluation-service -am clean package`
(with the stack up).

---

## 13. Deploy & verify (docker)

1. Package on the host: `./mvnw -DskipTests package`.
2. `docker compose up -d --build` (service jars are thin-copied by `Dockerfile.service`; each
   compose service names its own jar — `JAR_FILE` has **no default**).
3. Databases `sih_source` / `sih_problem` / `sih_eval` are created by `db/init` on a fresh
   volume; on an existing volume create them manually.

Smoke recipe (through the gateway `:8080`):

- Admin OTP-login (`9800000001`) → onboard a profile:
  `POST /evaluation/evaluator-profiles` `{userId: <EVALUATOR-user-uuid>, evaluatorType: GOVERNMENT, fullName: "…"}` → 201; duplicate → 409.
- `POST /evaluation/problems/{id}/start` (problem must be `REGISTERED`) → 201 `RECEIVED`.
- `POST /evaluation/cycles/{id}/analyze` → cycle `ROUTING` then **auto-route** to
  `EVALUATION_IN_PROGRESS`; a `sih_eval.evaluation_assignment` row exists; `…/history` shows the
  trail; `audit_log` has `EVALUATION_ROUTED`.
- Evaluator (`9700000001`) sees the assignment in `/evaluation/me/assignments`, accepts, scores
  the 5 seeded criteria, submits → assignment `SUBMITTED`, cycle `EVALUATION_COMPLETED`,
  `evaluation_response` rows + `EVALUATION_SUBMITTED`/`EVALUATION_COMPLETED` audit rows.
- Decline path: decline leaves the last open assignment → cycle back to `ROUTING`; an ADMIN
  re-route returns a *fresh* evaluator (`routed=false` when everyone already tried / at capacity).

Seeded dev actors (created during past e2e runs — not part of any migration): ADMIN `9800000001`,
REVIEWER `9829858790`, GOVT SUBMITTER `9900000001`, EVALUATOR `9700000001`. OTP dev code `123456`.

---

## 14. Files that matter

```
evaluation-service/src/main/java/com/EDITH/SIH26043/
├── EvaluationServiceApp.java
├── client/        ProblemContextApi (HttpExchange) · ProblemClientConfig · ProblemContextGateway
├── config/        CorsConfig · OpenApiConfig (Swagger tags)
├── entity/        Evaluation{Assignment,Criterion,Cycle,Disagreement,Response,StatusHistory} ·
│                  Evaluator{Domain,Profile} · ProblemAnalysis · ScoreAggregation · AuditLog · WeightConfig
├── repository/    (one per aggregate root / table)
├── security/      SecurityConfig (@PreAuthorize role rules)
├── service/       EvaluationIntakeService · ProblemAnalysisService · EvaluationRoutingService ·
│                  EvaluationStatusService · EvaluatorAssignmentService · EvaluatorProfileAdminService ·
│                  AuditService · service/analysis/{OpenAiCompatibleAnalysisClient, HeuristicAnalysisFallback, …}
└── web/           EvaluationAdminController · EvaluatorProfileAdminController · EvaluatorController · web/dto/*
evaluation-service/src/main/resources/
├── application.yaml
└── db/migration/  V1__evaluation_schema.sql · V2__evaluation_seed_data.sql
evaluation-service/src/test/java/com/EDITH/SIH26043/service/   (6 test classes)
```

Shared contract: `edith-common/…/internal/ProblemContextResponse.java`.
