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

Every problem is routed to **all five evaluator pools**; each pool is scored either by a human
evaluator or — when that pool's switch is on `AUTO` — by the AI itself, which accepts, scores and
submits with no human in the loop. The five pool scorecards are then folded into one weighted 0–100
result, banded, and handed to phase 3 (§7.6). With all five pools on `AUTO`, `analyze` alone takes a
problem from `REGISTERED` to `PHASE_3_READY` and publishes the problem statement to the portal.

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
| **Evaluator scoring endpoints** | `ce1391a` | `/evaluation/me/*` dashboard: accept / decline / submit scorecards against seeded per-pool criteria, plus ADMIN `POST /evaluation/evaluator-profiles`. Two design fixes fell out of it (see §7.4). |
| **Automated evaluator (AI scoring + per-pool switch)** *(uncommitted)* | — | All five pools are routed; each pool's evaluator owns a `MANUAL`/`AUTO` switch (§7.5). `AUTO` = the pool's system AI profile scores and submits on its own (§9.4), degrading to a human when the model is unavailable. A completed cycle is published to the portal, so all-`AUTO` means `analyze` alone publishes the problem statement. |
| **Aggregation + priority band** *(uncommitted)* | — | The five pool scorecards are folded into one weighted 0–100 score, written to `evaluation_aggregation` + the cycle's result columns, and banded; the cycle runs on to `PHASE_3_READY` automatically or via `POST …/aggregate` + `…/prioritize` (§7.6). Disagreement across pools is flagged, never gating. |

Every pipeline step in the §1 state machine is now built; the remaining roadmap items are listed in
§10.

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

- **How many evaluators:** one **per pool** — all five pools get an assignment. Each pool's
  handler is decided by that pool's **MANUAL/AUTO switch** (§7.5): `MANUAL` → the least-loaded
  **active human** profile of the pool whose open workload is below its `max_workload`; `AUTO` →
  the pool's seeded **system AI profile**, which scores the problem itself (see §9.4).
- **When:** automatically, in the same `analyze` request, immediately after the cycle reaches
  `ROUTING`; plus an explicit ADMIN/REVIEWER `POST …/cycles/{id}/route` (single-pool retry) and
  `POST …/cycles/{id}/route-pools` (the five-pool repair pass) as the manual paths.
- **No human candidate** for a `MANUAL` pool (no active profile of that pool, or everyone at
  capacity): that pool is **skipped, audited, and the cycle still advances** on the pools that
  did route. A later `route-pools` call retries it. Not an error.
- **The AI now scores — but only through AUTO.** `analyze` still produces an *advisory* problem
  profile (LLM or heuristic) that is stored for audit; the **scoring** AI is a separate client
  with its own prompt, and it only ever runs for a pool whose switch is `AUTO`. A pool left on
  `MANUAL` is scored by a human, by the same code path as before this feature. LLM unavailable ⇒
  that pool **degrades to a human for that run** + audit `EVALUATION_AI_UNAVAILABLE`; the cycle is
  never blocked.
- **The final score is the weighted pool average, and nothing else.** `priority_score` is the same
  number as `final_score` — no urgency or impact bonus is added, because the only other input
  available (the AI problem profile) is advisory by contract and must never move a score. AI and
  human scorecards weigh the same; provenance is recorded, not priced. A pool that did not score is
  **absent**, and the weights renormalise over the pools that did — never zero-filled. A wide spread
  is **flagged for review, not blocked**: full autonomy is the rule, so the flag is recorded and the
  cycle still reaches `PHASE_3_READY` (§7.6).

---

## 4. Data model (`sih_eval`)

Flyway `V1__evaluation_schema.sql` + `V2__evaluation_seed_data.sql` + `V4__auto_evaluation.sql`.
`ddl-auto: validate` — the schema is migration-owned; **never hand-edit an applied migration**
(checksum → `validate` fails).

Cross-service references are **plain UUIDs** (no FK to `sih_source`/`sih_problem`):

| Table | Purpose | Notes |
|---|---|---|
| `evaluator_profile` | 1:1 with a `users` row whose role is `EVALUATOR` (`user_id` unique) | pool, `max_workload` (default 5), `is_active`, `region_states JSONB`, `affiliated_source_id` (conflict-of-interest), **`is_system`** (V4) |
| `evaluator_pool_mode` | **per-pool MANUAL/AUTO switch** (V4) | PK `evaluator_type`; seeded with all five pools at `MANUAL`, so today's behaviour is the default. Mirrors the `weight_config` shape |
| `evaluator_domain` | profile ↔ domain matching | **not used yet** — owner rule is bucket-based, so domain filter is dormant |
| `evaluation_cycle` | aggregate root, **1 per problem** (`problem_id` unique) | status + final score/priority output columns |
| `evaluation_status_history` | append-only lifecycle trail | one row per transition, `from_status`/`to_status` |
| `problem_analysis` | AI output (LLM or heuristic) | parsed columns + `raw_payload JSONB` for audit; `status` ∈ `SUCCESS / HEURISTIC_FALLBACK / FAILED` |
| `evaluation_criterion` | per-pool scoring catalog | seeded in V2: **5 criteria per pool**, `max_score 10`, `UNIQUE(evaluator_type, criterion_key)` |
| `evaluation_assignment` | one row per pool handler (human or AI) | `UNIQUE (cycle_id, evaluator_profile_id)`, deadline, `conflict_recheck` |
| `evaluation_response` | **normalised per-criterion scores** | composite PK `(assignment_id, criterion_id)`, `score SMALLINT CHECK 1..10`, **`score_source` ∈ `HUMAN`/`AI`** (V4, default `HUMAN`) |
| `evaluation_aggregation` | final per-cycle result (1:1) — **built** (§7.6) | `overall_score`, `per_type_scores JSONB` (all five pools, present or not), `weighting_method CONFIGURED/EQUAL`, `num_assignments`, `disagreement_flag` + `disagreement_details JSONB` |
| `evaluation_disagreement` | divergence flag + resolution trail | **unbuilt step** — the *flag* is written to `evaluation_aggregation`; this table's lifecycle is not |
| `weight_config` | per-pool weights | V2 default seed, e.g. GOVERNMENT 0.25 / INDUSTRY 0.15 / HEI 0.15 / CITIZEN 0.25 / COMMUNITY 0.20 — **consumed by `ScoreAggregationService`**; a config that is incomplete, out of `[0,1]` or not summing to 1.0 falls back to equal weights |
| `audit_log` | **service-local** generic audit | `entity_type` + `entity_id`; full `AuditAction` vocabulary incl. `EVALUATION_STARTED/ANALYZED/ROUTED/SUBMITTED/AGGREGATED/PRIORITIZED/COMPLETED/…`, plus V4's `EVALUATION_MODE_CHANGED`, `EVALUATION_AI_SCORED`, `EVALUATION_AI_UNAVAILABLE` |

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

AUTO pool: ASSIGNED ─── AI scores + submits in one step ──► SUBMITTED
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
| `POST /evaluation/cycles/{cycleId}/analyze` | Run AI problem analysis | Advances to `ROUTING`, then **routes all five pools** (§7.5). Idempotent re-run replaces the profile. When the pass leaves the cycle `EVALUATION_COMPLETED` (every pool `AUTO`), it publishes to the portal and **aggregates + prioritises** best-effort — one call can end at `PHASE_3_READY`. |
| `POST /evaluation/cycles/{cycleId}/route` | Route to one evaluator (manual retry) | Single-pool, bucket-based, non-`ROUTING` → no-op `routed=false`. |
| `POST /evaluation/cycles/{cycleId}/route-pools` | Route **all five pools** (repair pass) | Used to fill a pool that was skipped earlier or to pick up a `MANUAL` pool after a decline. Skips pools that already hold an assignment, so it is safe to re-run. Same publish + aggregation gate as `analyze`. |
| `POST /evaluation/cycles/{cycleId}/aggregate` | Fold the pool scorecards into a result | `EVALUATION_COMPLETED → SCORES_AGGREGATED`. Manual/repair counterpart of the automatic pass (§7.6). Re-running upserts the same row and audits without re-transitioning. 409 when the cycle is not completed/aggregated, or when no pool produced a scorecard. |
| `POST /evaluation/cycles/{cycleId}/prioritize` | Band the aggregated score, hand to phase 3 | `SCORES_AGGREGATED → PRIORITIZED → PHASE_3_READY`. `priority_score = final_score`; the band is P1/P2/P3/P4 by descending threshold. Idempotent — re-invoking re-applies changed thresholds. 409 when the cycle has no aggregation row. |
| `GET /evaluation/cycles/{cycleId}/aggregation` | Read the stored aggregation | The per-pool snapshot (all five, with `present`/`reason`), the effective weights and the disagreement evidence. 404 when the cycle has not been aggregated. |
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

### 5.4 EVALUATOR / ADMIN — the per-pool switch (`EvaluatorPoolModeController`)

The route is open to both roles; the finer question — *which* pool a caller may flip — is a service
guard, because `@PreAuthorize` cannot see which department an evaluator belongs to.

| Method & path | Action | Notes |
|---|---|---|
| `GET /evaluation/pool-modes` | All five pools + their current mode | Also reports `activeHumanEvaluators`, `aiScoringAvailable`, and a human-readable `note` (e.g. an `AUTO` pool with no model configured says it will degrade). |
| `PUT /evaluation/pool-modes/{pool}` | Flip one pool | `{mode: "MANUAL"|"AUTO"}`. **403** when an `EVALUATOR` targets a pool their profile does not belong to, or has no profile at all; `ADMIN` may flip any pool. Audited as `EVALUATION_MODE_CHANGED` with the previous mode in `before`. |

### 5.5 Internal (not routed by the gateway)

`GET /internal/problems/{id}` on **problem-service** → `ProblemContextResponse`
(`edith-common`). Enum values travel as `name()` strings so the services never share a
persisted enum. The snapshot also carries the problem's **access scope**
(`accessRule` ∈ `OPEN_TO_ALL`/`UNIVERSITY_ONLY`/`SELECTED_UNIVERSITIES`/
`AUTO_SELECTED_UNIVERSITIES` + the
`accessUniversities` name list for the two *named* rules), which the evaluator sees on
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

`route(cycleId, actor, ip)` — the **single-pool** path, still used by the ADMIN retry endpoint:

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
own transaction), then `routingService.routeAllPools(...)` in a **separate transaction**. A routing
no-op/failure can therefore never roll back a committed analysis profile. Kept at the controller
(not inside `ProblemAnalysisService`) so the analysis service and its tests stay untouched.

### 7.3 Why one evaluator per cycle vs. the 5-pool weight model

The original owner rule assigned **one** evaluator from the **matching** pool, while
`evaluation_aggregation` / `weight_config` (seeded with five weights) were designed for **several
evaluators per problem across pools**, so the weighted average was not computable. `routeAllPools`
(§7.5) closed the first half: every pool now carries a scorecard. `ScoreAggregationService` (§7.6)
closes the second — a completed cycle is folded into one result, so the seeded weights are no
longer decorative.

### 7.4 Two fixes that came out of building the evaluator flow

1. **`EVALUATION_IN_PROGRESS → ROUTING` edge was missing** — a declined problem was a dead end.
   Added to `ALLOWED`; decline of the last open assignment now drops the cycle back to `ROUTING`.
2. **Re-route would pick the decliner again → 500** — a `DECLINED` row no longer counts toward open
   load, so the same least-loaded profile got re-assigned, violating the unique constraint.
   `leastLoadedCandidate` now excludes **every** profile already on the cycle.

### 7.5 Multi-pool routing + the per-pool MANUAL/AUTO switch

`routeAllPools(cycleId, actor, ip)` runs in three ordered phases. The ordering is not cosmetic —
see the cycle-status note below.

**Phase 0 — plan.** Load the cycle; accept `ROUTING` **or** `EVALUATION_IN_PROGRESS` (the latter is
the repair pass). Any other status → every pool reported `SKIPPED / "cycle not routable"`. Then for
each of the five `EvaluatorType`s in enum order:

| Pool state | Outcome |
|---|---|
| mode `AUTO`, model reachable and a complete scorecard prepared | handler **`AI`**, owner = the pool's seeded system profile |
| mode `AUTO`, model unavailable / answer rejected | audit `EVALUATION_AI_UNAVAILABLE`, **fall through to `MANUAL`** for this run |
| mode `MANUAL` (the default, incl. no row at all) | handler **`HUMAN`**, owner = `leastLoadedCandidate(pool)` |
| no eligible human (none active / all at `max_workload`) | pool **skipped** + `EVALUATION_ROUTED` audit with the reason |
| the pool already holds an assignment on this cycle | pool **skipped** — makes the pass idempotent and keeps `UNIQUE (cycle_id, evaluator_profile_id)` intact |

Note the last row is about *any* row, including a `DECLINED` one. Re-routing a declined pool is
`route()`'s job (it excludes every already-tried profile, so it picks somebody new), and that
endpoint deliberately only runs while the cycle is `ROUTING`. So a decline that leaves siblings
open cannot be repaired until the cycle returns to `ROUTING` — see the limits in §10.

`leastLoadedCandidate` **excludes `is_system` profiles**, so a `MANUAL` pool can never be handed to
the AI.

The scoring preparation happens here, in phase 0, so an unreachable model is discovered *before*
any assignment row exists — the degrade is a plan change, not a rollback.

**Phase 1 — create.** All planned assignments are saved and each pool gets its usual
`EVALUATION_ROUTED` audit row. Then, **once**, the cycle moves `ROUTING → EVALUATION_IN_PROGRESS`
— but only if at least one assignment was created *and* the cycle entered as `ROUTING`.

**Phase 2 — score.** Every `AI` plan is submitted through `submitAsSystem(...)`, i.e. the exact
write path a human uses (§8.2 invariants untouched), with `score_source = AI` and an
`EVALUATION_AI_SCORED` audit row carrying pool/provider/model.

> **Why the phases are strictly ordered.** `completeCycleIfNoOpenAssignments` only fires when the
> cycle is `EVALUATION_IN_PROGRESS`, and `ALLOWED` has no `ROUTING → EVALUATION_COMPLETED` edge. If
> an AI scorecard were submitted while the cycle was still `ROUTING`, the completion knock-on would
> be swallowed and an all-`AUTO` cycle would stall one step short of done. Creating **all**
> assignments (and transitioning) before submitting **any** scorecard is what makes "five pools,
> all `AUTO`" land on `EVALUATION_COMPLETED` in a single pass: the last submit then sees no open
> assignment left and completes the cycle normally.

**Return value.** `RouteAllOutcomeResponse` reports the final `cycleStatus` plus one entry per pool
(`pool`, `mode`, `handler` `AI`/`HUMAN`/`NONE`, `assignmentId`, `outcome`, `reason`), which is what
makes the switch's effect observable from the client. The reported status is the **entity's**, read
after phase 2, because phase 2 may have advanced it further than routing alone would.

**The publish gate reads both fields.** The controllers fire the portal publish only when the pass
ran *and* the cycle ended `EVALUATION_COMPLETED` — i.e. a non-empty pool list as well as the status.
A pass that refused to run (phase 0's not-routable early return) also reports
`cycleStatus = EVALUATION_COMPLETED` when the cycle is already completed, so gating on the status
alone would append a `PROBLEM_PUBLISHED` audit row — and a portal upsert — for a request that routed
nothing. `POST …/publish-to-portal` remains the explicit, always-valid re-publish.

### 7.6 Aggregation & priority band — `ScoreAggregationService` + `PrioritizationService`

The step that follows `EVALUATION_COMPLETED`. It consumes the five pool scorecards, applies
`weight_config`, writes the `evaluation_aggregation` row and the four `evaluation_cycle` result
columns (`final_score`, `impact_level`, `priority_score`, `priority_band`), and drives
`EVALUATION_COMPLETED → SCORES_AGGREGATED → PRIORITIZED → PHASE_3_READY`. With every pool on `AUTO`
the whole pipeline therefore runs from a single `analyze` call to terminal `PHASE_3_READY`.

**Per-pool normalisation.** For each pool, over its **active** criteria, using each criterion's
**own** `max_score` (null ⇒ 10, matching `validateScorecard`):

```
raw_p  = Σ score_i          max_p = Σ maxScore_i
norm_p = 100 × raw_p / max_p          → scale 2, HALF_UP
```

Normalising against the pool's own maxima means a pool is never penalised for using a 5-point
criterion where another uses a 10.

**Presence.** A pool counts only when it has a `SUBMITTED` assignment whose stored responses cover
every one of its active criteria. A short scorecard is **excluded with a reason**, never scored: an
unanswered criterion is not a score of zero. `validateScorecard` already makes this impossible on
the write path, so this is a defensive check against a hand-edited row. When several assignments
exist for one pool (a repair pass or a hand-inserted row), the **earliest** submission is folded,
sorted by `submitted_at` then `assignment_id` so the choice is deterministic rather than
query-order dependent.

**Weighting.** `CONFIGURED` iff all five `weight_config` rows exist, each weight ∈ `[0,1]` and
`|Σ w − 1| ≤ 0.001`; otherwise `EQUAL`. The effective weight of a present pool is
`w_p / Σ_{present} w_q` under `CONFIGURED`, or `1 / |present|` under `EQUAL`, and
`overall_score = Σ effectiveWeight × norm`, scale 2, clamped to `[0,100]`.

**Partial coverage renormalises over the pools that scored** — the divisor is the sum over present
pools, not the full 1.0. A skipped or declined pool is *absent from the evaluation*, which is not
the same claim as "that department scored it zero"; zero-filling would make the final score a
function of routing luck. `per_type_scores` still lists **all five** pools with an explicit
`reason`, so the reduced coverage is visible rather than silent. `EQUAL` is the fallback for a
**malformed config**, never for missing data.

**Outputs.**

```
impact_level   : ≥ impact-high-threshold (70) → HIGH ; ≥ impact-medium-threshold (40) → MEDIUM ; else LOW
priority_score = overall_score
priority_band  : ≥ priority-p1-threshold (80) → P1 ; ≥ 65 → P2 ; ≥ 50 → P3 ; else P4
spread         = max(norm_p) − min(norm_p)   (only with ≥ 2 pools present)
disagreement_flag = spread > disagreement-spread-threshold (30)     ← strict >
status         = flagged ? REVIEW_REQUIRED : AGGREGATED
```

`priority_score` is deliberately **the same number** as `final_score`. Nothing in the domain model
supplies a second input — the AI problem profile is contractually advisory and must not influence a
score — so an "adjusted" priority would be an invented constant that lets the coarse band and the
precise score disagree. Keeping them equal makes the band the honest bucket of the score, and
`priority_score` still does real work as the tie-break inside a band for
`idx_eval_cycle_priority (priority_band, priority_score DESC)`. Banding is the only opinionated
part, and it lives in one method behind `@Value`-injected thresholds.

**AI and human scorecards weigh the same.** The pool's `scoreSource` (`AI`/`HUMAN`) is recorded in
`per_type_scores` per pool, so provenance is visible without being a different price.

**`per_type_scores` shape.** Always all five `EvaluatorType` keys in enum order (a `LinkedHashMap`
throughout — absent entries carry nulls, which `Map.of` cannot hold). A pool that scored: `present:
true`, `normalisedScore`, `rawScore`, `maxScore`, `criteriaScored`, `scoreSource`, `assignmentId`
(text), `submittedAt` (ISO-8601 text, so the JSONB survives a mapper change), `configuredWeight`,
`effectiveWeight`. A pool that did not: `present: false`, `reason`, `configuredWeight`,
`effectiveWeight: 0`. `num_assignments` is the number of scorecards **folded in**, i.e. present
pools — not always five. `disagreement_details` carries `spread`, `threshold`, `poolsScored`,
`poolsTotal`, `maxPool`/`maxScore`, `minPool`/`minScore`.

**Disagreement is a flag, never a gate.** A flagged spread sets `disagreement_flag` +
`AggregationStatus.REVIEW_REQUIRED` and audits `EVALUATION_DISAGREEMENT_FLAGGED`, but the pipeline
still proceeds to `PHASE_3_READY` — consistent with the standing full-autonomy rule. The flag is
read back via `GET …/aggregation`. The `evaluation_disagreement` table and its resolve endpoints
remain unbuilt (§10).

**Transitions, audit, actor.** One service per state-machine hop, matching the existing idiom:

| Service | Transition | Audit |
|---|---|---|
| `ScoreAggregationService.aggregate` | `EVALUATION_COMPLETED → SCORES_AGGREGATED` | `EVALUATION_AGGREGATED` (+ `EVALUATION_DISAGREEMENT_FLAGGED` when flagged) |
| `PrioritizationService.prioritize` | `SCORES_AGGREGATED → PRIORITIZED → PHASE_3_READY` | `EVALUATION_PRIORITIZED` |

`EvaluationStatusService.transition` throws `400` when `current == target`, so a **re-run** skips
the transition it has already made (and `prioritize` only takes the remaining hop). That is what
makes the manual endpoints safe to re-invoke: `aggregate` on a `SCORES_AGGREGATED` cycle upserts the
same row and re-audits; `prioritize` on a `PHASE_3_READY` cycle is a pure recompute, which is how a
changed band threshold gets applied. The manual endpoints pass the JWT user; the automatic pass
passes `cycle.getTriggeredByUserId()` with ip `"internal"` — the same attribution
`PortalPublishService` uses for machine-triggered work, so no synthetic system user is invented.
Guards: unknown cycle → 404; wrong status → 409; no present pool → 409 **before any write**;
`prioritize` with no aggregation row or a null `overall_score` → 409.

**The automatic pass.** `EvaluationCompletionService` (deliberately **not** `@Transactional`) is
invoked from the same three places as the publish gate — `analyze`, `route-pools` and the
evaluator's `submit` — **after** the publish call. It no-ops unless the cycle is actually
`EVALUATION_COMPLETED`, resolves the actor as above, then calls `aggregate` then `prioritize`, each
committing in its own transaction. It catches `RuntimeException` and logs `warn`: a failure leaves
the cycle safely parked at `EVALUATION_COMPLETED` (or `SCORES_AGGREGATED`) for the manual endpoint
to finish, and can never turn a successful scorecard submission into a 500. Ordering against the
publish is safe in both directions and not load-bearing — `PortalPublishService.PUBLISHABLE_STATUSES`
already covers `EVALUATION_COMPLETED`, `SCORES_AGGREGATED`, `PRIORITIZED` and `PHASE_3_READY`, so
the manual `publish-to-portal` retry still works after aggregation has moved the cycle on.

**Read model.** `AggregationResponse` (cycle status + `reviewRequired` + message alongside the
stored columns) and `PrioritizationResponse` (`finalScore`, `impactLevel`, `priorityScore`,
`priorityBand`, status). `GET …/aggregation` returns the row **without recomputing** it.

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

The `EVALUATION_COMPLETED` knock-on lives in `persistScorecard`/`completeCycleIfNoOpenAssignments`,
**not** in the controller. What the controller adds, after the scoring transaction has committed, is
the best-effort pair: publish the problem to the portal, then run the aggregation + prioritisation
pass (§7.6). Both are post-commit and non-fatal, so neither can roll the scorecard back.

### 8.4 Deadlines are lazy (no scheduler)

Accepting or submitting **past the deadline** marks the assignment `EXPIRED` and fails with 409 —
late work is never silently accepted. `overdue` is surfaced on the queue item for `ASSIGNED` /
`IN_PROGRESS` work. Expiry/relief scheduling is deliberately out of scope for now.

### 8.5 The system door — `submitAsSystem(...)`

An `AUTO` pool's scorecard is written by `submitAsSystem(assignmentId, req, actorUserId, ip)`, which
shares `persistScorecard(...)` with the human `submit(...)`. Both are therefore held to the **same
all-or-nothing validation** and the same cycle knock-on; the differences are deliberate and small:

- ownership comes from the **assignment's own** `evaluator_profile_id` (there is no caller profile
  to resolve), and the assignment must be owned by a **system** profile — pointing it at a human
  assignment is a `409 "human evaluator"`, so the door cannot be used to bypass a human's ownership;
- every `evaluation_response` row is written with `score_source = AI`, versus `HUMAN` for `submit`;
- it adds an `EVALUATION_AI_SCORED` audit row (pool, provider, model) **alongside** the
  `EVALUATION_SUBMITTED` row a human submit writes — the lifecycle fact is identical, so existing
  completion/reporting queries need no change, while the machine provenance stays visible.

An AI assignment goes straight `ASSIGNED → SUBMITTED` with no `IN_PROGRESS` step and
`submitted_at == assigned_at`. That is a natural tell, and the design does not pretend otherwise.

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
  must **not score/rank/recommend** — the analysis is advisory context for a human evaluator. The
  scoring AI is a *different* client with its own prompt (§9.4): the two contracts are kept apart
  on purpose, so this advisory promise stays true.
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

### 9.4 AI scoring — `AutoEvaluationService` + `CriterionScoringClient`

This is the part that fills a scorecard without a human, and it is deliberately a **separate client
from §9.1**: the analysis prompt forbids scoring, and that advisory contract must not be weakened.

- `CriterionScoringClient.score(CriterionScoringRequest) → Optional<CriterionScoringResult>` —
  `Optional.empty()` on *any* failure, never an exception, exactly mirroring the analysis client.
- `OpenAiCompatibleCriterionScoringClient` copies the proven recipe from §9.1–9.2 verbatim (same
  `app.llm.openai.*` keys, lazy `RestClient`, retry loop, markdown-fence strip,
  `response_format: json_object`, `stream:false`, blank-`content`/`finish_reason` handling) with a
  new **scoring** system prompt: score every supplied criterion, integer 1..10, never exceed that
  criterion's `maxScore`, calibrate rather than inflate, judge only from the evidence given.
- **Evidence in:** the `ProblemContextResponse` snapshot (title, description, urgency, severity,
  expectedOutcome, location, domains, evidenceCount) + the persisted advisory `problem_analysis`
  profile (advisory only — `null` when absent, and scoring still runs) + the pool's active
  criterion catalog (`findByEvaluatorTypeAndActiveIsTrueOrderBySortOrderAsc`).
- **A bad answer is rejected, not repaired.** A score outside `1..10`, a non-numeric score, empty
  content, unparseable JSON, or a missing `scores` object invalidates the whole response. Clamping
  would be fabricating a number the model never gave. A hallucinated extra `criterionKey` is
  dropped; a *missing* one is the caller's business.
- **`AutoEvaluationService.prepare(...)`** then enforces the scorecard's own rule: it must cover
  **every** active criterion of the pool, each at or below its `maxScore`. A half-filled form can
  never reach the write path — any shortfall discards the card and the pool degrades to a human.
  No active criteria at all → nothing to score, client never called.
- **Kill switch:** `app.evaluation.auto-scoring-enabled` (env `EVALUATION_AUTO_ENABLED`, default
  `true`). When false, `enabled()`/`available()` are false and every `AUTO` pool degrades exactly as
  an unavailable model does — one place to take the machine out of the loop without touching the
  per-pool switches the evaluators own. The env var is wired through `docker-compose.yml`
  (`EVALUATION_AUTO_ENABLED: ${EVALUATION_AUTO_ENABLED:-true}`), so the switch is reachable in the
  deployed stack — `EVALUATION_AUTO_ENABLED=false docker compose up -d --no-deps evaluation-service`.
  Note the asymmetry with `available()`: it reports *configuration* (key present, switch on), not
  reachability, so a dead `OPENAI_BASE_URL` still shows `aiScoringAvailable: true` on
  `GET /evaluation/pool-modes` and only fails at call time — which is precisely the second
  degradation branch (see §13).

---

## 10. Roadmap — what is designed but not built

| Step | Cycle target | What must happen | Open design questions |
|---|---|---|---|
| Disagreement | — | The `evaluation_disagreement` lifecycle: rows, resolve endpoints, and the re-aggregation round trip (`SCORES_AGGREGATED → EVALUATION_IN_PROGRESS` is already allowed). The *flag* is written today — `disagreement_flag` + `disagreement_details` + `EVALUATION_DISAGREEMENT_FLAGGED` (§7.6); only the separate table is unbuilt. | Who resolves a flag and what re-scoring it triggers. |
| Domain/geo matching | — | Use `evaluator_domain` and `region_states` to narrow candidates. | Owner rule is bucket-based; dormant by design. |
| Expiry/relief | — | Scheduler for `EXPIRED`/deadline relief instead of lazy-only. | |

Also optional (out of current scope): conflict-of-interest check against `affiliated_source_id`,
cross-service role validation (`GET /internal/users/{id}`), evidence surfacing to evaluators.

### Deliberate limits of the automation

- **AI-scored project reviews are out of scope.** Portal project reviews stay human. But AI scoring
  created a coupling that had to be fixed: `ProjectReviewService.createInternal` used to take the
  *first* `SUBMITTED` assignment as the reviewer, and on an all-`AUTO` cycle that could be a system
  profile — a reviewer nobody can log in as, parking the student's submission in `UNDER_REVIEW`
  forever. The resolver now prefers the first `SUBMITTED` assignment whose profile is **not**
  `is_system`, falls back to the least-loaded active **human** of any pool when the whole cycle was
  AI-scored, and only then 409s. The fallback deliberately ignores `max_workload`: one project over
  capacity beats a submission stuck forever.
- **Late pooling is now recoverable.** A `MANUAL` pool with no eligible human is skipped, and
  because `EVALUATION_IN_PROGRESS → ROUTING` only happens when nothing is open, the old design
  could not fill it afterwards. `routeAllPools` accepts `EVALUATION_IN_PROGRESS` and skips pools
  that already hold an assignment, so `POST …/cycles/{id}/route-pools` is the repair pass
  (§5.1/§7.5). A pool's scorecard is therefore never permanently lost.
- **…except after a mid-cycle decline.** A pool whose evaluator *declined* while the cycle still
  had open siblings is not repaired by `route-pools` (the row exists, so the pool is reported
  skipped) and not by `route()` (which only runs on a `ROUTING` cycle). The honest reading is that
  the pool is lost until the cycle returns to `ROUTING`, which only happens once nothing is open.
  A `route-missing-pools` variant that revives a terminal row is the follow-up; it was left out
  deliberately because reviving a `DECLINED` assignment is a new write path with its own invariants.
- **No scheduler.** The `AUTO` run happens synchronously inside the `analyze` (or `route-pools`)
  request, matching the existing auto-route idiom; the service still has no `@EnableScheduling`.
- **`PHASE_3_READY` has no consumer yet.** Nothing downstream reads it (there is no codejudge
  hand-off), so prioritisation is terminal in practice. The aggregation + band step is complete on
  its own terms; wiring phase 3 to it is a further change.
- **`AggregationStatus.PENDING` stays unused** — the row is written only when aggregation actually
  runs, so there is no half-initialised state to reason about.
- **`weight_config` has no admin endpoint.** The seeded defaults are consumed as-is; the
  `EVALUATION_WEIGHT_UPDATED` audit action and the `updatedByUserId` column remain ready for a
  weight-editing endpoint. Until then, a changed weight means a direct DB update plus a re-run of
  `POST …/aggregate`.

---

## 11. Configuration

See `src/main/resources/application.yaml`:

- `spring.datasource.url` default `jdbc:postgresql://localhost:5432/sih_eval` (compose overrides
  with `DB_URL`).
- `app.jwt.*` — shared HMAC secret/issuer, `issuer: sih26043`.
- `app.problem-service.base-url` — default `http://problem-service` (Eureka service id).
- `app.evaluation.assignment-deadline-days: 7`.
- `app.evaluation.auto-scoring-enabled` — env `EVALUATION_AUTO_ENABLED`, default `true`; the hard
  kill-switch for AI scoring (§9.4).
- `app.evaluation.impact-high-threshold` / `impact-medium-threshold` — env `EVAL_IMPACT_HIGH` (70)
  / `EVAL_IMPACT_MEDIUM` (40); where the weighted 0–100 score lands on the impact scale (§7.6).
- `app.evaluation.priority-p1-threshold` / `priority-p2-threshold` / `priority-p3-threshold` — env
  `EVAL_PRIORITY_P1` (80) / `EVAL_PRIORITY_P2` (65) / `EVAL_PRIORITY_P3` (50); the inclusive lower
  bounds of P1/P2/P3 in descending order, so `priority_score == final_score` and these three are
  the only knobs that decide the band.
- `app.evaluation.disagreement-spread-threshold` — env `EVAL_DISAGREEMENT_SPREAD` (30); how far
  apart the present pools' 0–100 scores may be (max − min) before the run is flagged for review.
  Strict `>` — a spread exactly at the threshold is not flagged. The flag is recorded, never a gate.
- `app.llm.openai.*` — as §9.1, shared by the analysis and scoring clients.
- `eureka.client.service-url.defaultZone` — `http://eureka-server:8761/eureka/` in compose;
  `prefer-ip-address: true` (container hostnames are random ids).

---

## 12. Testing

Fourteen Mockito, DB-free test classes (165 methods) mirror the services:

| Class | Methods | Covers |
|---|---|---|
| `EvaluationIntakeServiceTest` | 4 | eligibility, duplicate cycle, history/audit |
| `ProblemAnalysisServiceTest` | 7 | transitions, fallback, idempotent re-run |
| `EvaluationRoutingServiceTest` | 17 | pool mapping (all 5), least-loaded pick, workload cap, no-candidate, exclude-already-tried, non-ROUTING no-op, **multi-pool pass**: AI vs human handler per mode, system profile never offered to a `MANUAL` pool, AI degrade → human + audit, skipped pool does not stall the others, no-routable-pool keeps `ROUTING`, already-assigned pools skipped, completed cycle not routable |
| `EvaluationStatusServiceTest` | 5 | allowed/illegal transitions |
| `EvaluatorProfileAdminServiceTest` | 3 | create ok, duplicate → 409 |
| `EvaluatorAssignmentServiceTest` | 25 | queue/detail, accept/decline/submit, scorecard validation, cycle knock-on, expiry, ownership, **`submitAsSystem`**: `AI` provenance, `EVALUATION_AI_SCORED`, human assignment refused through the system door, same all-criteria rule |
| `EvaluatorPoolModeServiceTest` | 9 | default `MANUAL` with no row, human count excludes system profiles, `AUTO`-without-model warning, own-pool flip + `EVALUATION_MODE_CHANGED` audit, in-place update, cross-pool 403, missing-profile 403, ADMIN override |
| `AutoEvaluationServiceTest` | 7 | complete answer → scorecard, criteria + advisory carried in the request, missing criterion discarded, above-`maxScore` discarded, unreachable model → empty (no exception), no active criteria, kill switch |
| `analysis/OpenAiCompatibleCriterionScoringClientTest` | 13 | request shape (`model`/`stream:false`/`response_format`/pool/criteria), markdown fences, numeric-string scores, hallucinated keys dropped, out-of-range & non-numeric rejected, empty/unparseable/no-`scores` rejected, 503 retried once then empty, no API key → **zero calls**, `configured()` |
| `PortalPublishServiceTest` | 6 | (unchanged) |
| `ProjectReviewServiceTest` | 15 | create/decide, idempotency, ownership, **reviewer resolution**: human preferred over AI, all-AI cycle → least-loaded human, all-AI with no human → 409, dangling profile still finds a reviewer |
| `ScoreAggregationServiceTest` | 27 | weighted average against a hand-computed value; per-criterion `maxScore` normalisation (mixed 5/10); partial coverage renormalised over present pools; all five pools in the snapshot; AI and human weigh identically while `scoreSource` records provenance; `EQUAL` for no rows / off-sum / out-of-range / all-zero weights; incomplete stored scorecard excluded with a reason; no active criteria excluded; no present pool → 409 with **no write and no transition**; wrong status → 409; unknown cycle → 404; transition + `EVALUATION_AGGREGATED` audited with the passed actor; re-run upserts the same row and skips the transition; the DTO carries the managed row id; impact boundaries and tunable thresholds; spread over/at the threshold and the single-pool case; disagreement flagged + `EVALUATION_DISAGREEMENT_FLAGGED`; `get` returns the stored row / 404 when absent |
| `PrioritizationServiceTest` | 12 | band boundaries 80/65/50 including exact equality; tunable thresholds; `priority_score == final_score == overallScore`; both hops in order; already-`PRIORITIZED` takes only the remaining hop; `PHASE_3_READY` is a pure recompute; `EVALUATION_PRIORITIZED` audited with the passed actor; a flagged disagreement still reaches phase 3; wrong status / missing row / null score / unknown cycle guards |
| `EvaluationCompletionServiceTest` | 15 | completed cycle → `aggregate` then `prioritize` in order; actor is `cycle.getTriggeredByUserId()` and ip `"internal"`; a `REVIEW_REQUIRED` aggregation does **not** stop prioritisation; no-op on a non-completed cycle, an already-aggregated cycle, an unknown/null cycle and an unknown/null assignment; aggregation and prioritisation failures are both swallowed; the by-assignment entry point resolves the cycle and still respects the status guard |

The scoring client's suite is the one exception to "mock everything": it spins up a real in-JVM
`com.sun.net.httpserver.HttpServer`, because the client builds its own `RestClient` and offers no
injection point — so the suite exercises the actual wire recipe.

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
- `POST /evaluation/cycles/{id}/analyze` → cycle `ROUTING` then **all five pools routed**; five
  `sih_eval.evaluation_assignment` rows exist; `…/history` shows the trail; `audit_log` has
  `EVALUATION_ROUTED`.
- Evaluator (`9700000001`) sees **their pool's** assignment in `/evaluation/me/assignments`, accepts,
  scores the 5 seeded criteria, submits → assignment `SUBMITTED`, `evaluation_response` rows with
  `score_source = HUMAN`. The cycle completes only once **every** pool's assignment is submitted.
- Decline path: decline leaves the last open assignment → cycle back to `ROUTING`; an ADMIN
  re-route returns a *fresh* evaluator (`routed=false` when everyone already tried / at capacity).

**AUTO-path smoke (V4).** After Flyway applies `V4`, `SELECT * FROM evaluator_pool_mode` must show
five `MANUAL` rows and `evaluator_profile` five `is_system = TRUE` rows.

1. **Switch authz** — an EVALUATOR of `GOVERNMENT` flips `GOVERNMENT → AUTO` (200); the same user
   flipping `HEI` → 403; ADMIN flips any → 200; `GET /evaluation/pool-modes` reflects all of it.
2. **Full-auto** — with all five pools `AUTO`, walk a problem to `REGISTERED` and `analyze`: five
   system-owned assignments, all `SUBMITTED`; cycle `EVALUATION_COMPLETED`; five
   `EVALUATION_AI_SCORED` audit rows; `GET /portal/problems` lists the problem — published by the AI
   alone.
3. **Mixed** — set `HEI → MANUAL` (leaving others `AUTO`) and re-`analyze`: four AI assignments +
   one human assignment. The cycle does **not** complete until the HEI evaluator submits; then it
   does, and publishes.
4. **Degradation** — clear `OPENAI_API_KEY` (or stop the router) with pools `AUTO`: `analyze` must
   not fail; `audit_log` shows `EVALUATION_AI_UNAVAILABLE` and the pool is routed to a human; the
   cycle stays alive. `EVALUATION_AUTO_ENABLED=false` must behave identically.
5. **Provenance** — `evaluation_response.score_source` is `AI` for AI pools and `HUMAN` for the
   human one.
6. **Project-review regression** — on the fully-AUTO problem, submit a portal project and assert the
   `project_review.reviewer_user_id` is a **human** (never a system profile) and that the evaluator
   can open it via `GET /evaluation/me/project-reviews`.

**Aggregation + band smoke (§7.6).**

7. **End to end, one call** — with all five pools `AUTO`, `analyze` a fresh `REGISTERED` problem: the
   response is no longer the last word, the cycle must read `PHASE_3_READY` on
   `GET /evaluation/cycles/{id}` with non-null `finalScore`, `impactLevel`, `priorityScore`,
   `priorityBand` and `completedAt`. `GET …/aggregation` must show five `perTypeScores` entries with
   `present: true` and `scoreSource: AI`. Cross-check `overall_score` by hand against the weighted
   average of the five pool scores, and the band against the thresholds.
8. **The rows agree** — `docker exec sih26043-pg psql -U sih -d sih_eval -c "…"`: the
   `evaluation_aggregation` row and the `evaluation_cycle` columns carry the same numbers, and
   `audit_log` holds `EVALUATION_AGGREGATED` + `EVALUATION_PRIORITIZED` (plus
   `EVALUATION_DISAGREEMENT_FLAGGED` iff the spread exceeded 30).
9. **Idempotency** — `POST …/aggregate` on the now-`PHASE_3_READY` cycle → 409 (status guard), not a
   duplicate row or a constraint error. On a cycle manually left at `EVALUATION_COMPLETED`,
   `aggregate` twice: the second upserts, skips the transition, and does not error.
10. **Mixed path** — one pool `MANUAL`, the rest `AUTO`: `analyze` leaves the cycle at
    `EVALUATION_IN_PROGRESS` (four AI `SUBMITTED` assignments + one human `ASSIGNED`); nothing is
    published and `GET …/aggregation` is **404**, because the hook no-ops on a cycle that is not yet
    `EVALUATION_COMPLETED`. The human submits via `POST /evaluation/me/assignments/{id}/submit` →
    the cycle completes, publishes **and** aggregates + prioritises with no further call. That pool's
    `scoreSource` must read `HUMAN`.
11. **No migration was needed** — no new file under `db/migration/`, and the service log shows no
    Flyway migration on boot; the eval head stays `V4`.
12. **Kill switch unaffected** — with `EVALUATION_AUTO_ENABLED=false` the `AUTO` pools degrade to
    humans exactly as before and the cycle still aggregates once they submit. Restore all five pools
    to `MANUAL` (the shipped default) afterwards.

**Result of the 2026-09-12 run** (gateway `:8080`, real local model):

| Step | Observed |
|---|---|
| 1 | EVALUATOR flip own pool 200; `HEI` from a GOVERNMENT evaluator 403 (`"The HEI switch is owned by the HEI evaluator; you evaluate for GOVERNMENT"`); ADMIN 200. |
| 2 | Through the true `POST …/analyze` path on a REGISTERED problem: 5 system-owned `SUBMITTED` assignments, 25 `AI` response rows, `EVALUATION_AI_SCORED` ×5, `EVALUATION_ROUTED` ×5, `EVALUATION_COMPLETED`, and the problem in `published_problem` — one call, no human, no second pass. |
| 3 | `HEI → MANUAL`: 4 AI `SUBMITTED` + 1 human `ASSIGNED`, cycle `EVALUATION_IN_PROGRESS`; published only after the human submitted. One pool was skipped for want of a human evaluator, exactly as §7.5 predicts. |
| 4 | Both branches. `EVALUATION_AUTO_ENABLED=false`: `GET /pool-modes` hinted the degrade, 5× `EVALUATION_AI_UNAVAILABLE`, the two pools that *have* a human were routed to one, the other three skipped, cycle alive. Dead `OPENAI_BASE_URL` with the switch **on**: `aiScoringAvailable` still `true` (config, not reachability), analysis fell back to `STATUS: HEURISTIC_FALLBACK`, scoring degraded identically. |
| 5 | One cycle carried `AI` and `HUMAN` rows side by side. |
| 6 | On the all-AUTO problem the review landed on the HEI **human** (`is_system = f`), `ASSIGNED`, openable via `GET /evaluation/me/project-reviews`. **This step is also what caught the portal-side client bug in §7.3 of `portalservice.md`** — the push had never once succeeded over HTTP. |

**Result of the aggregation run** (same gateway, real local model):

| Step | Observed |
|---|---|
| 7 | All-AUTO problem `4bfda590…`, cycle `32030f56…`: a single `analyze` returned with the cycle already at `PHASE_3_READY`, `finalScore 29.80 / impactLevel LOW / priorityScore 29.80 / priorityBand P4 / completedAt` set. Aggregation `AGGREGATED`, `CONFIGURED`, 5/5 pools `present`, all `scoreSource: AI`, `criteriaScored 5`, spread 24 → unflagged. Hand-check: `36×.25 + 44×.15 + 32×.15 + 20×.25 + 22×.20 = 29.80`. |
| 8 | `evaluation_aggregation` and the `evaluation_cycle` columns agreed; `status_history` showed all eight hops; `audit_log` held `EVALUATION_AGGREGATED` + `EVALUATION_PRIORITIZED` (actor the cycle's trigger, ip `internal`). |
| 9 | Re-`aggregate` on the `PHASE_3_READY` cycle → 409; re-`prioritize` → 200 pure recompute; still exactly one aggregation row. |
| 10 | HEI `MANUAL`, rest `AUTO`, problem `af79e762…`, cycle `0d87384b…`: `analyze` left `EVALUATION_IN_PROGRESS` (4 AI `SUBMITTED` + 1 human `ASSIGNED`), `GET …/aggregation` → 404. The HEI human (`9700000002`) submitted 9/10 ×5 → 200 `EVALUATION_COMPLETED`, then auto-advance to `PHASE_3_READY`, `finalScore 47.40 / impactLevel MEDIUM / priorityBand P4`, with `HEI.scoreSource: HUMAN` (norm 90.0) beside four `AI` pools. Hand-check: `46×.25 + 64×.15 + 90×.15 + 32×.25 + 24×.20 = 47.40`. |
| 10b | That same run set `disagreementFlag: true` / `status REVIEW_REQUIRED` with `{spread: 66.0, maxPool: HEI, maxScore: 90.0, minPool: COMMUNITY, minScore: 24.0, threshold: 30, poolsScored: 5, poolsTotal: 5}` — and still reached `PHASE_3_READY`, so locked decision 5 holds in production. `audit_log` carries `EVALUATION_DISAGREEMENT_FLAGGED` (spread 66.00, maxPool HEI) between the aggregate and prioritise rows; `evaluation_response` split 20 `AI` / 5 `HUMAN`. |
| 11 | Flyway validated four migrations and applied none; the head stayed `V4`. |
| 12 | Not re-run in this pass (covered by the V4 run's step 4 above); the five pools were restored to `MANUAL`. |

Modes were returned to their shipped default (all five `MANUAL`) after each run.

Seeded dev actors (created during past e2e runs — not part of any migration): ADMIN `9800000001`,
REVIEWER `9829858790`, GOVT SUBMITTER `9900000001`, EVALUATOR `9700000001`/`9700000002`. OTP dev code
`123456`. Note the login call takes `{"challengeId": …, "code": "123456"}` — the field is `code`.

---

## 14. Files that matter

```
evaluation-service/src/main/java/com/EDITH/SIH26043/
├── EvaluationServiceApp.java
├── client/        ProblemContextApi (HttpExchange) · ProblemClientConfig · ProblemContextGateway
├── config/        CorsConfig · OpenApiConfig (Swagger tags)
├── entity/        Evaluation{Assignment,Criterion,Cycle,Disagreement,Response,StatusHistory} ·
│                  Evaluator{Domain,PoolMode,Profile} · ProblemAnalysis · ScoreAggregation · AuditLog · WeightConfig
├── repository/    (one per aggregate root / table)
├── security/      SecurityConfig (@PreAuthorize role rules)
├── service/       EvaluationIntakeService · ProblemAnalysisService · EvaluationRoutingService ·
│                  EvaluationStatusService · EvaluatorAssignmentService · EvaluatorProfileAdminService ·
│                  EvaluatorPoolModeService · AutoEvaluationService · ScoreAggregationService ·
│                  PrioritizationService · EvaluationCompletionService ·
│                  AuditService · service/analysis/{OpenAiCompatibleAnalysisClient, HeuristicAnalysisFallback,
│                  CriterionScoringClient, OpenAiCompatibleCriterionScoringClient, …}
└── web/           EvaluationAdminController · EvaluatorProfileAdminController · EvaluatorPoolModeController ·
                   EvaluatorController · web/dto/*
evaluation-service/src/main/resources/
├── application.yaml
└── db/migration/  V1__evaluation_schema.sql · V2__evaluation_seed_data.sql · V3__project_review.sql ·
                   V4__auto_evaluation.sql
evaluation-service/src/test/java/com/EDITH/SIH26043/service/   (14 test classes)
```

Shared contract: `edith-common/…/internal/ProblemContextResponse.java`.
