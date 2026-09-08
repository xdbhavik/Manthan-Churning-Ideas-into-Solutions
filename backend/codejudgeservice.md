# SIH26043 — CodeJudge Service: planning & design notes

> Detailed development plan for **CodeJudge** — the automated, evidence-driven evaluation
> engine that takes a **student-submitted project repository at a fixed commit**, then
> clones, scans, builds, runs, tests, security-scans, architecture-analyses, requirement-
> matches and AI-assesses it against the **problem statement**, ending in a deterministic,
> evidence-backed score and report.
>
> Scope here is **planning & design only** (no code yet). It is written to slot into the
> SIH26043 microservice reactor in the same way `evaluation-service` / `portal-service` did.
> Keep this file updated as the design moves. It intentionally reuses existing repo facts:
> shared claim-JWT (`edith-security`), per-service DB + Flyway, Eureka discovery, gateway
> (Caddy) routing, and the OpenAI-compatible **local** LLM provider.

---

## 1. What this service is

CodeJudge is **not** a "code scanner". It is a full evaluation pipeline that turns a pinned
repository commit into an **evidence set**, interprets that evidence against the **problem
statement**, and then produces a **deterministic** score (AI is advisory, never the final
arbiter).

```
                              CODEJUDGE
                                 │
                 ┌───────────────┼───────────────┐
                 ▼               ▼               ▼
         Code Analysis      Execution       PS Matching
                 │               │               │
                 ▼               ▼               ▼
             Quality          Testing        Requirements
             Security         Runtime        Compliance
             Architecture     API Tests      AI Analysis
                 │               │               │
                 └───────────────┼───────────────┘
                                 ▼
                          Scoring Engine
                                 │
                                 ▼
                          Final Evaluation
```

### Why a separate service

- It executes **untrusted student code** → needs a hard sandbox boundary, its own lifecycle,
  its own ops (queues, workers, timeouts, cleanup).
- It has a **long-running, multi-stage** job model (minutes), not a request/response pipeline.
- Its evidence + scoring model (commit-pinned, deterministic, re-evaluable) is a distinct
  aggregate that none of the existing services should own.

### Where it sits (proposed, mirrors evaluation-service)

```
                       gateway :8080 (Caddy)
        /auth /source /problem /evaluation /portal        /codejudge/*
                        │                                      │
   source :8081      problem :8082        eval :8083       portal :8084      codejudge :8085
   sih_source        sih_problem          sih_eval          sih_portal        sih_codejudge
                        ▲  ▲                                   ▲                  ▲
                        │  └──── GET /internal/problems/{id} ──┘   (problem snapshot)
                        └──── GET /internal/problems/{id} ◄──────────────────┐
   Eureka :8761  ◄──── all services register ◄────────────────────────────────┘
```

- **problem-service** — CodeJudge fetches the problem snapshot over the *existing*
  `GET /internal/problems/{id}` → `ProblemContextResponse` (`edith-common`), then persists a
  local problem-statement snapshot + extracted requirements.
- **portal-service** — the Innovation Portal. A portal `submission` that carries a
  **repository URL + commit SHA** is what CodeJudge evaluates. CodeJudge keeps its own
  `project_submission` row referencing the portal submission id (plain UUID, no cross-DB FK).
- **evaluation-service** — the existing *human* project-review engine (same-evaluator
  ACCEPT/RETURN). CodeJudge is **complementary**: it produces automated technical evidence +
  a report that a human evaluator can see/use. It does **not** replace the human decision.
- No shared DB; every arrow is JSON over HTTP (discovery-resolved `@HttpExchange`, as today).

> **Standing repo rule that applies here:** never hand-edit an applied Flyway migration.
> New migrations (V1, V2, …) for `sih_codejudge` are fine. The LLM API key stays only in the
> gitignored `.env` (`OPENAI_API_KEY`); empty key → deterministic fallback.

---

## 2. Objective (exact)

> **Primary:** clone the student's submitted project repository **at a fixed commit/version**,
> then scan, build, execute, test, analyse, and evaluate it **against the problem statement**,
> and produce an **evidence-based score/report**.

### Guardrails baked into the objective

1. **Commit-pinned evaluation** — the score must reference the exact `commitSha` that was
   submitted. Later student changes must not silently change the result.
2. **Deterministic scoring** — same commit + same config → same score. The AI never hands out
   "84/100"; it supplies assessments/evidence and the scoring engine computes marks.
3. **Every mark traceable to evidence** — a reviewer must be able to challenge any score and
   point at the artifact (test run, file, finding, runtime log) behind it.
4. **Evaluation versioning** — if scoring rules change, re-evaluations are explicit and the
   report records which config version produced it.
5. **Untrusted code in a sandbox** — build/test/runtime execution never touches the host or
   production data.

---

## 3. The three-layer model (the key architectural decision)

### Layer A — Evidence Collection (facts only)

```
Repository ──► Scanner ──► Build ──► Tests ──► Security ──► Architecture ──► Runtime
                                                                                 │
                                                                                 ▼
                                                                              Evidence
```

The system *collects facts*: what the repo is, whether it builds, whether it runs, what tests
pass/fail, what security findings exist, how the code is structured. No judgement here.

### Layer B — Intelligence (interpretation)

```
Problem Statement
      +  Requirements
      +  Repository Evidence
      +  Test Evidence
      +  Runtime Evidence
      +  AI (advisory)
              │
              ▼
      Evaluation Findings
```

Evidence is interpreted **against the requirements**. The AI contributes requirement
assessments, strengths, weaknesses, missing features, and confidence — each conclusion must
cite evidence and flag uncertainty. AI **never assumes missing functionality**.

### Layer C — Scoring (deterministic)

```
Findings ──► Scoring Rules ──► Weighted Score ──► /100
```

Final marks are computed by a deterministic engine from findings + **configuration-driven**
scoring rules. AI is **not the final authority** (see §17–§18).

---

## 4. Phase 0 — Requirements freeze (do this before any code)

> If we build scanners first and decide criteria afterwards, the architecture churns.
> Freeze the evaluation contract up front and make it **configuration-driven**.

### 4.1 Categories & weightage (initial, config-seeded)

| Category | Weight | Default `max_score` | Notes |
|---|---:|---:|---|
| Problem Statement Alignment | 25 | 25 | Requirement matching + evidence |
| Functional Implementation | 25 | 25 | Build/run + functional/API tests |
| Engineering / Code Quality | 15 | 15 | agentic-legibility evidence |
| Architecture | 10 | 10 | Modularity, layering, coupling |
| Testing | 10 | 10 | Test suite presence/coverage/results |
| Innovation | 5 | 5 | Idea/approach (AI-assisted, human-curable) |
| Security | 5 | 5 | Secrets/SAST/SCA findings → penalties/blocks |
| Documentation | 5 | 5 | README, setup, API docs |
| **Total** | **100** | **100** | |

The weights/maxima are **seeded data, not code** (DB tables, versioned — §21, §18). Changing a
weight is a config change + a new `scoring_version`, never a redeploy-with-new-logic.

### 4.2 Rules that must also be frozen (as config)

| Rule | Default decision |
|---|---|
| Minimum build/runtime bar | A repo that never builds → cap functional category, flag `CRITICAL_FLAW` |
| Mandatory tests | `mandatory=true` requirements must each map to ≥1 evidence item to earn the alignment mark |
| Security penalties | `HIGH` finding → configurable `-X` per category; `CRITICAL` (e.g. committed secret) → **evaluation blocked** (config `security.blockOnCritical=true`) |
| Passing score | config `passingScore` (e.g. 40) — report only; **human evaluator owns accept/return** |
| AI role | advisory only — no raw scores, no final authority |
| Human evaluator role | sees CodeJudge evidence + report; decides ACCEPT/RETURN (evaluation-service today) |
| Re-evaluation | explicit `POST …/evaluations/{id}/reevaluate` on a new commit OR new scoring version |
| Evaluation versioning | every `evaluation` row records `scoringVersion` + tool versions |

---

## 5. Complete architecture & data flow

```
                        INNOVATION PORTAL (portal-service)
                                   │  submit project (repo + commit)
                                   ▼
                         ┌────────────────────┐
                         │     CodeJudge      │  (codejudge-service :8085)
                         └─────────┬──────────┘
                                   │
                            Evaluation Job  (create → QUEUED)
                                   │
                                   ▼
                              Queue (DB-backed)
                                   │
                                   ▼
                          Evaluation Orchestrator
                                   │
       ┌───────────────┬───────────┼───────────────┬───────────────┐
       ▼               ▼           ▼               ▼               ▼
  Repo Scanner    Build Engine   Test Engine   Security Engine  Arch Analyzer
       │               │           │               │               │
       ▼               ▼           ▼               ▼               ▼
  agentic-legility  Runtime     (API/unit)      SAST / SCA        static
  (engineering)      checks                                     structure
       └───────────────┼───────────┼───────────────┼───────────────┘
                       ▼
              Evidence Collector
                       │
                       ▼
             Problem Statement Matcher
                       │
                       ▼
                 AI Evaluator  (advisory)
                       │
                       ▼
                 Scoring Engine (deterministic)
                       │
                       ▼
                 Report Generator
                       │
           ┌───────────┴───────────┐
           ▼                       ▼
    Student (portal)          Evaluator/Admin (APIs)
```

---

## 6. Evaluation pipeline (state machine)

One **evaluation** walks the stages below. Each stage persists its evidence; a failure in any
stage is captured and (where recoverable) retried, otherwise the evaluation becomes `FAILED`
with a structured reason.

```
SUBMITTED
   ▼
QUEUED
   ▼
CLONING ─────────────► SCANNING ──────────────► BUILDING
   │                       │                        │
   │                       ▼                        ▼
   │                agentic-legibility         RUNNING (runtime + health)
   │                (engineering evidence)          │
   │                                               ▼
   │                                          TESTING
   │                                               │
   │                                               ▼
   │                                         SECURITY_SCANNING
   │                                               │
   │                                               ▼
   │                                          ARCHITECTURE_ANALYSIS
   │                                               │
   │                                               ▼
   │                                          REQUIREMENT_MATCHING
   │                                               │
   │                                               ▼
   │                                             AI_ANALYSIS
   │                                               │
   │                                               ▼
   │                                              SCORING
   │                                               │
   │                                               ▼
   │                                         REPORT_GENERATION
   │                                               │
   └───────────────────────────────────────────────▼
                                               COMPLETED

ANY STATE ────(unrecoverable)──► FAILED
```

Design notes:
- The pipeline is **orchestrated by a worker** (one evaluation at a time per worker initially).
- Each stage is a separate `service/evaluation/*` step with a narrow input/output contract so
  stages can later be split into separate workers (§25).
- `evaluation_status_history` records every transition (append-only), mirroring `sih_eval`.
- A `FAILED` evaluation stores the failing stage + a machine + human readable reason and never
  leaves half-written scores.

---

## 7. Phase 1 — Repository submission (intake contract)

Student (or the portal on the student's behalf) submits:

```json
{
  "submissionId": "UUID",            // portal submission id (or null for standalone use)
  "problemId": "PS-001-uuid",
  "teamId": "TEAM-101-uuid",
  "repositoryUrl": "https://github.com/team/project",
  "branch": "main",
  "commitSha": "abc123",
  "demoUrl": "https://…",
  "documentationUrl": "https://…"
}
```

**Rules**
- `commitSha` is **mandatory**. Defaults to branch HEAD are rejected — a moving branch must not
  silently change what was evaluated.
- Evaluation is pinned to `abc123`. If the student later pushes `abc999`, that is a **different
  evaluation** (re-evaluate explicitly).
- On intake, CodeJudge validates the repo is reachable and `commitSha` exists (`git ls-remote`
  + `git cat-file -e` in the sandbox), else fails fast.
- URL allow-list / scheme policy (https only) is config.

> **Portal adapter (additive, later):** today a portal `submission` holds uploaded *files*.
> Repo-based judging needs portal `submission` to optionally carry `repositoryUrl/branch/
> commitSha` (portal `V2` migration). For the MVP, CodeJudge can be triggered directly with the
> payload above by an authorised SUBMITTER/ADMIN/EVALUATOR; the portal hand-off is a thin
> adapter that calls the same create API.

---

## 8. Phase 2 — Evaluation job system

Never run a 30-minute evaluation inside an HTTP request.

```
Bad:   POST /evaluate ──► [30 min processing] ──► response
Good:  POST /evaluations ──► { evaluationId, status: "QUEUED" }  ──► queue ──► worker
```

- Create is **fast**: validates the payload, inserts a `project_submission` + `evaluation`
  (`QUEUED`), returns `{ evaluationId, status }` (202-style semantics; repo returns 202 or 201).
- The queue is **DB-backed** (`evaluation_job`): claimable rows in `QUEUED` ordered by priority
  then createdAt, claimed atomically (`@Version` optimistic lock) so multiple workers can poll
  safely.
- Worker claims → runs the pipeline (§6) → marks `COMPLETED` or `FAILED`. Heartbeat/last-seen
  lets a dead worker's job be reclaimed (stale claim after timeout → back to `QUEUED`).
- Status polling: `GET /codejudge/evaluations/{id}` (see §22).

Create response:

```json
{ "evaluationId": "EVAL-001", "status": "QUEUED" }
```

---

## 9. Phase 3 — Repository scanner

The worker clones the repo **at `commitSha`** into an isolated workspace and detects:

| Detects | Examples |
|---|---|
| Language(s) | Java, Python, JS/TS, C/C++, Go… |
| Framework | Spring Boot, React, Next.js, Flask, Django… |
| Build system | Maven, Gradle, npm, pip, cargo… |
| Package manager | pom.xml, build.gradle, package-lock, requirements.txt… |
| Frontend / Backend | folder structure, manifests |
| Database | migration files, ORM config, docker-compose services |
| Tests | JUnit, pytest, jest (framework + location) |
| Docker / CI / CD | Dockerfile, docker-compose, .github/workflows |
| Documentation | README, docs/, ADRs |
| Project structure | modules/layers tree (feeds architecture analyzer) |

Scanner output is a **detection report** (evidence):

```json
{
  "languages": ["Java"],
  "framework": "Spring Boot",
  "buildSystem": "Maven",
  "packageManager": "pom.xml",
  "frontend": "React",
  "backend": "Java",
  "tests": ["JUnit"],
  "docker": true,
  "ci": [".github/workflows/ci.yml"],
  "docs": ["README.md"],
  "structure": { "modules": ["backend/", "frontend/"] }
}
```

The scan is done on the **read-only** clone so it cannot be mutated by later steps.

---

## 10. Phase 4 — agentic-legibility integration (engineering evidence)

`agentic-legibility` (the selected external analyzer) is CodeJudge's underlying **engineering
analysis** layer.

```
Repository ──► CodeJudge ──► agentic-legibility ──► structured engineering result
```

- CodeJudge invokes it in the sandbox, parses its (JSON) output, **normalises** it into
  CodeJudge's internal evidence format, and stores it as `code_analysis` rows.
- The external tool's score is **not** the CodeJudge final score — it is one category's
  evidence source (Engineering / Code Quality, plus documentation findings).

Normalised finding example:

```json
{
  "category": "DOCUMENTATION",
  "score": 16,
  "maxScore": 20,
  "findings": [
    { "severity": "MEDIUM", "message": "Setup instructions incomplete" }
  ]
}
```

- Version pin the analyzer (`toolVersion` recorded per evaluation) so results are reproducible.
- If the analyzer is unavailable, CodeJudge must still finish: engineering category falls back
  to the built-in static heuristics (same JSON shape, `HEURISTIC_FALLBACK` marker), mirroring
  the LLM fallback pattern already used in `sih_eval`.

---

## 11. Phase 5 + 6 — Build engine & runtime engine (execution)

### Build engine
```
Repository ──► env detection ──► docker sandbox ──► install deps ──► build
```
Result vocabulary (single source of truth):

```json
{ "buildStatus": "SUCCESS", "buildTimeSeconds": 42, "warnings": 7 }
```
`buildStatus` ∈ `SUCCESS | FAILED | TIMEOUT | DEPENDENCY_ERROR`. Logs (truncated + redacted)
are persisted as evidence. A failed build is a **major finding** for the Functional category
and blocks runtime/testing (config decides how deep the pipeline goes).

### Runtime engine
```
build ──► start ──► health check ──► application ready
```
Checks recorded as evidence: listening port, API reachable, DB connection, frontend served,
`/health` endpoint, startup errors. A structured runtime record:
```json
{ "started": true, "health": "PASS", "database": "PASS", "api": "PASS", "startupErrors": [] }
```

### Sandboxing contract (both engines)
Execution of student code is the **highest-risk** surface (§24). Every build/run happens in an
ephemeral sandbox: CPU/memory caps, wall-clock timeout, read-only base FS, disposable
workspace, no host credentials, no production DB access, restricted network, guaranteed
cleanup. Nothing ever executes on the service JVM or the compose host.

---

## 12. Phase 7 — Functional testing engine

The heart of the evaluation. Example problem:

> *Build a crop disease detection system.*

| Req | Statement | Mandatory |
|---|---|---|
| REQ-001 | User uploads image | true |
| REQ-002 | System detects disease | true |
| REQ-003 | Result displayed | true |
| REQ-004 | Prediction confidence shown | true |
| REQ-005 | History maintained | true |

The test engine runs the project's own tests plus **contract probes** against the running app
(API calls that exercise each requirement):

```
REQ-001 ── PASS      REQ-002 ── PASS      REQ-003 ── PASS
REQ-004 ── FAIL      REQ-005 ── PASS
FunctionalScore = 4/5
```

- Each executed probe persists a `test_execution` row (input, expected, actual, PASS/FAIL,
  artifact/log link).
- Requirement-to-probe mapping is configuration (`requirement` ↔ `test_case`), seeded per
  problem by an ADMIN/reviewer when structured requirements are first curated (§13).

---

## 13. Phase 8 + 13 — Problem statement integration & structured requirements

### 13.1 Fetch the problem

CodeJudge calls problem-service `GET /internal/problems/{id}` (existing
`ProblemContextResponse`, `edith-common`) and stores a **local snapshot** so reports are
stable even if the upstream problem later changes.

### 13.2 Free text → structured requirements

Feeding raw free-text problem statements straight to the AI is not ideal. Convert once, store,
curate:

```
Problem Statement ──► Requirement Extraction ──► Structured Requirements
```

```json
{
  "problemId": "PS-001",
  "requirements": [
    { "id": "REQ-001", "type": "FUNCTIONAL", "description": "User must upload a crop image", "mandatory": true },
    { "id": "REQ-002", "type": "AI",          "description": "System must classify the disease", "mandatory": true }
  ]
}
```

- **Extraction** is AI-assisted (LLM proposes the structured list from the problem snapshot +
  evaluation criteria) but the result is **curated/persisted by a human** (ADMIN/REVIEWER)
  before it is used for scoring. Deterministic engine never consumes raw free text.
- `requirement` rows are stored in `sih_codejudge` keyed to the problem snapshot; edits are
  versioned (a change can trigger re-evaluation).

---

## 14. Phase 9 — Requirement matcher

Matching maps **each requirement** → evidence from several layers:

```
Requirement ──► Repo Evidence ──► Code Evidence ──► Runtime Evidence ──► Test Evidence ──► Match
```

Example matrix (persisted in `requirement_evidence`):

| Requirement | Evidence | Status |
|---|---|---|
| Image upload | `/upload` API found | ✅ |
| Disease prediction | ML model file + inference path | ✅ |
| Confidence shown | response field `confidence` | ✅ |
| History maintained | no endpoint found | ❌ |

Result: `problemAlignment = 4/5` (then weighted per §18). The matcher is **rule + light-AI**:
rule heuristics do the deterministic linkage; AI is used only to propose candidate evidence for
a human to confirm. Missing functionality is reported as a **missing feature**, never assumed
present.

---

## 15. Phase 10 — Security engine (independent module)

Checks (repo + dependency + config level):

| Check class | Examples |
|---|---|
| Secrets | API keys, passwords, private keys, `.env` committed |
| Injection | SQL injection patterns, unsanitised queries |
| XSS | reflected/stored sinks in web code |
| Dependencies | known-vulnerable packages (SCA), outdated lockfile |
| Unsafe config | debug creds, permissive CORS, exposed actuator |
| Exposed endpoints / sensitive files | `.git`, `*.pem`, prod config, internal routes |

Finding shape:

```json
{
  "severity": "HIGH",
  "type": "SECRET",
  "file": ".env",
  "message": "Potential API credential detected"
}
```

**Configurable impact rules** (defaults):

| Severity | Default impact |
|---|---|
| `CRITICAL` | evaluation **blocked** (config `blockOnCritical: true`) — report generated with `BLOCKED` verdict |
| `HIGH` | configurable point penalty (default `-X` per category, e.g. Security full + cap Problem Alignment) |
| `MEDIUM` / `LOW` | findings only, no points (config-curable) |

Rules live in config/DB (`evaluation_policy`), never hard-coded in the scanner.

---

## 16. Phase 11 — Architecture analyzer

Static structure analysis on the read-only clone (frontend/backend layering, controllers,
services, repositories, models, config, tests, docs):

Checks: modularity, separation of concerns, coupling, dependency direction, API structure,
DB/migration structure, scalability indicators.

Output: a normalised architecture score + per-aspect findings:

```json
{ "category": "ARCHITECTURE", "score": 8, "maxScore": 10,
  "findings": [
    { "severity": "MEDIUM", "aspect": "COUPLING", "message": "Controller calls repository directly" }
  ] }
```

This is deterministic (structural metrics) with optional AI commentary (§17), never AI-graded.

---

## 17. Phase 12 — AI evaluator (advisory only)

Inputs (all evidence, never raw source unless summarised):

```
Problem Statement + Requirements + Repository Summary + Code Analysis
  + Test Results + Security Results + Architecture + Documentation
```

The LLM is asked:

> Evaluate whether the submitted project actually satisfies the stated requirements.
> For every conclusion: provide evidence, identify uncertainty, never assume missing
> functionality.

Structured output:

```json
{
  "requirementAssessments": [
    { "requirementId": "REQ-001", "assessment": "SATISFIED", "evidence": "…", "confidence": 0.95 }
  ],
  "strengths": [],
  "weaknesses": [],
  "missingFeatures": [],
  "confidence": 0.87
}
```

Rules:
- Prompting it for "give score 84" is **forbidden**. It produces **assessments**, not marks.
- Provider + settings reuse the repo pattern (`app.llm.openai.*`: base-url, model
  `agentrouter/deepseek-v4-flash`, key from `OPENAI_API_KEY`, temperature low, strict JSON,
  `stream:false`). Empty key → AI section marked `UNAVAILABLE`, pipeline continues on
  deterministic evidence.
- Full request/response (`raw_payload JSONB`) is stored for audit; a non-2xx/parse failure
  never fails the evaluation — it is recorded and skipped.
- Innovation (5) is the one category where AI commentary is allowed to inform, but the mark is
  still set deterministically from a small rubric the human reviews.

---

## 18. Phase 13 — Scoring engine (deterministic)

Inputs: category results (each `score/maxScore`) + findings + policy.

```
Final Score = Σ( CategoryScore / CategoryMax × CategoryWeight )
```

Worked example (weights = category maxima, summing to 100):

| Category | score | max | Notes |
|---|---:|---:|---|
| Problem Alignment | 22 | 25 | |
| Functionality | 21 | 25 | |
| Engineering | 13 | 15 | |
| Architecture | 8 | 10 | |
| Testing | 7 | 10 | |
| Innovation | 4 | 5 | |
| Security | 4 | 5 | (after HIGH penalty) |
| Documentation | 4 | 5 | |
| **TOTAL** | **83** | **100** | |

Scoring behaviour:
- Config lives in DB (`evaluation_category`, `evaluation_metric`, `evaluation_policy`) with a
  `scoringVersion`; a snapshot of the applied config is copied onto the evaluation row so
  historical reports stay truthful.
- Penalties/blocks (§15) are applied as config-driven deltas **before** the weighted sum.
- Category results always reference the underlying evidence (`evaluation_finding`,
  `requirement_evidence`, `test_execution`, …) so the total is auditable.
- The engine is pure + unit-testable: `score(categoryResults, policy) → total`, no I/O.

---

## 19. Phase 14 — Evidence store

Every number traces to evidence.

```
Score: 21/25 (Functionality)
Evidence:
├── 17/20 functional tests passed        (test_execution rows + log)
├── Required APIs detected                (scanner / runtime probe)
├── Runtime health check passed           (runtime record)
└── One mandatory feature incomplete      (requirement_evidence row, ❌)
```

Evidence types stored: clone meta, scanner report, build record, runtime record, test rows,
security findings, architecture findings, requirement matches, AI assessments, raw logs
(redacted + size-capped), scoring-config snapshot. An evaluator can open any category mark and
drill to the artifact — this is what makes scores challengeable (§20).

---

## 20. Phase 15 — Evaluation report

```
CODEJUDGE EVALUATION REPORT

Project:     Smart Crop Detection
Team:        Team ABC
Problem:     PS-001
Commit:      abc123
Scoring:     v3
Final Score: 83 / 100
```

Sections:
1. **Summary** — verdict band (`EXCELLENT / GOOD / NEEDS_WORK / BLOCKED`), confidence, one-paragraph
   AI summary.
2. **Strengths** — ✓ core functionality implemented, ✓ app runs, ✓ layered architecture.
3. **Weaknesses** — ⚠ test coverage limited, ⚠ docs incomplete, ✗ history feature missing.
4. **Detailed evaluation** — per category `score/max`, each linked to evidence (§19).
5. **Findings** — ordered `HIGH/MEDIUM/LOW` with file + message + remediation hint.
6. **Security** — separate block incl. any `BLOCKED` verdict reason.
7. **Audit footer** — evaluation id, commit, tool versions, config version, timestamps.

Delivered as structured JSON (report API) + a **Markdown rendering** the portal can display.
Human evaluator (evaluation-service) can cite this report when they ACCEPT/RETURN.

---

## 21. Database design (`sih_codejudge`)

Flyway `V1__codejudge_schema.sql` (+ `V2__codejudge_seed.sql` for categories/policy). Native PG
enums + `jsonb`, `ddl-auto: validate`, cross-service refs as **plain UUIDs**. Core relation:

```
Problem ──► ProjectSubmission ──► Evaluation ──┬─► Metrics (category results)
                                               ├─► Findings
                                               └─► Evidence
```

| Table | Purpose | Key columns / notes |
|---|---|---|
| `problem_statement` | local snapshot of the problem | `problem_id` PK (upstream id), title, description, criteria `jsonb`, `access_rule`, fetched_at |
| `requirement` | structured requirements for a problem | `requirement_id` PK, `problem_id`, `req_key` (`REQ-001`), `type`, `description`, `mandatory`, curated_by, `UNIQUE(problem_id, req_key)` |
| `project_submission` | a submitted repo at a commit | `submission_id` PK, `portal_submission_id UUID`, `problem_id`, `team_id`, `repository_url`, `branch`, `commit_sha UNIQUE per evaluation`, demo/docs urls |
| `evaluation` | aggregate root, one row per run | `evaluation_id` PK, `submission_id FK`, `status`, `scoring_version`, `tool_versions jsonb`, `config_snapshot jsonb`, `final_score NUMERIC(5,2)`, `verdict`, timestamps, `@Version` |
| `evaluation_job` | queue row | `job_id` PK, `evaluation_id FK`, `status QUEUED/CLAIMED/DONE/FAILED`, `priority`, `claim_owner`, `claimed_at`, `attempts`, `last_error` |
| `evaluation_status_history` | append-only lifecycle trail | `from_status` / `to_status`, actor/machine |
| `evaluation_category` | **config**: categories | `category_key`, `name`, `max_score`, `weight`, `sort_order`, `active` |
| `evaluation_metric` | **config**: fine-grained metrics per category | `category_key`, `metric_key`, `max_score`, rule pointer |
| `evaluation_policy` | **config**: penalties/blocks/pass bar | `rule_key`, `severity`, `action PENALTY/BLOCK/NONE`, `amount` |
| `code_analysis` | scanner + agentic-legibility result | `category`, `score`, `max_score`, `payload jsonb`, `tool`, `tool_version`, `status` |
| `build_record` | build + runtime evidence | `build_status`, `build_time_seconds`, `runtime jsonb`, `log_ref` |
| `test_case` | **config**: test/probe definition | `requirement_id`, name, probe spec `jsonb` |
| `test_execution` | per-run test/probe result | `test_case_id`, `status PASS/FAIL/ERROR/SKIP`, input/expected/actual `jsonb`, `log_ref` |
| `security_finding` | SAST/SCA findings | `severity`, `type`, `file`, `line`, `message`, `cve` (SCA), dedupe key |
| `requirement_evidence` | requirement ↔ evidence links | `requirement_id`, `evidence_type`, `evidence_ref`, `match_status SATISFIED/PARTIAL/MISSING` |
| `ai_evaluation` | advisory AI output | `evaluation_id`, `payload jsonb` (assessments/strengths/weaknesses), `model`, `confidence`, `status` |
| `evaluation_finding` | human-readable findings used in report | `severity`, `category`, `message`, `evidence_ref` |
| `evaluation_report` | rendered report + audit | `report_json jsonb`, `report_markdown text`, `generated_at` |

Seed (`V2`): the eight `evaluation_category` rows + weights (§4.1) and default `evaluation_policy`
rows (§4.2). All weight/rule changes = new seed or admin-updatable config, never a code change.

---

## 22. API design

Routed through the gateway as `/codejudge/*` (repo style; the `/api/v1` prefix from the sketch
is dropped in favour of the service prefix used by every SIH service).

Public (JWT-authenticated; SUBMITTER/UNIVERSITY owner, EVALUATOR/REVIEWER/ADMIN read):

| Method & path | Action | Notes |
|---|---|---|
| `POST /codejudge/evaluations` | Create evaluation from submission/repo payload | validates `commitSha`; 202 `{evaluationId, status: QUEUED}` |
| `GET /codejudge/evaluations/{id}` | Status + state history | |
| `GET /codejudge/evaluations/{id}/score` | Category scores + total | |
| `GET /codejudge/evaluations/{id}/report` | Full report (JSON or `Accept: text/markdown`) | |
| `GET /codejudge/evaluations/{id}/findings` | Findings, ordered by severity | |
| `GET /codejudge/evaluations/{id}/requirements` | Requirements + match status | |
| `GET /codejudge/evaluations?status=&page=` | List mine / by status | role-scoped |

Admin / reviewer (ADMIN/REVIEWER):

| Method & path | Action |
|---|---|
| `POST /codejudge/evaluations/{id}/retry` | Re-run from `FAILED` (new job) |
| `POST /codejudge/evaluations/{id}/reevaluate` | New run on a new commit / scoring version |
| `PUT /codejudge/requirements` | Curate structured requirements (extraction is AI-assisted, save is human) |
| `GET/PUT /codejudge/scoring-config` | Read / update categories, metrics, policy (new scoring version) |
| `GET /codejudge/jobs?status=` | Queue visibility |

Internal (not gateway-routed, `/internal/**` permitAll on the service):

| Method & path | Consumer | Purpose |
|---|---|---|
| `POST /internal/codejudge/evaluations` | portal-service / evaluation-service | trusted create (portal hand-off) |
| `GET /internal/codejudge/evaluations/{id}/summary` | portal-service / evaluation-service | feed report/verdict to human review |

Ownership: create/list/read are scoped to the JWT subject (portal participant/owner or
EVALUATOR/REVIEWER/ADMIN). Internal endpoints are trusted callers only.

---

## 23. Security architecture (untrusted code execution)

This service executes student repositories — the **single most critical** surface in the
system. Student code **never** runs on the service JVM or the compose host.

```
CodeJudge worker
   │
   ▼
Sandbox (ephemeral container per job)
   ├── CPU limit          e.g. --cpus 1.0
   ├── Memory limit       e.g. --memory 1g
   ├── Timeout            wall-clock kill (per stage, e.g. build 5m / test 10m)
   ├── Network policy     blocked, or allow-list egress (see notes)
   ├── Filesystem         read-only base + disposable tmpfs workspace
   ├── No secrets         no env, no mounted credentials, no prod DB URL
   └── Cleanup            container + workspace removed in finally (best-effort on crash)
```

Recommended principles (frozen):
- **Isolated execution** — one ephemeral sandbox per evaluation; never reuse a long-lived
  container across untrusted jobs.
- **Resource limits** — CPU/memory/pids + wall-clock timeouts at every stage.
- **Read-only base filesystem** — only the disposable workspace is writable.
- **Restricted network** — default **no network**. Repos that need dependency downloads run
  with egress restricted to the package registry allow-list (config), or an offline mirror.
- **No host credentials / no production DB** — the sandbox gets nothing; runtime DB is an
  ephemeral throwaway (in-memory or disposable container) only when the app needs one.
- **Cleanup guaranteed** — `finally` + a sweeper for orphaned sandboxes.
- **Log redaction** — secrets/URLs scrubbed before evidence is stored.

> **Runtime DB note:** "Database connection PASS" (§11) is checked against the sandbox's own
> disposable DB, never a shared/production one.

---

## 24. Worker architecture

Start monolithic, design for splitting later. One **orchestrator worker** executes the pipeline
today; each stage is a small, single-responsibility class so it can be extracted into a
dedicated worker when volume demands:

```
Evaluation Orchestrator
   ├── Repository Worker        clone @ commit + scanner
   ├── Static Analysis Worker   agentic-legibility + architecture
   ├── Build Worker             sandbox build
   ├── Runtime Worker           start + health
   ├── Test Worker              run tests/probes
   ├── Security Worker          SAST/SCA
   ├── AI Worker                LLM assessment (advisory)
   └── Report Worker            scoring + report
```

- Workers consume `evaluation_job` rows; multiple worker replicas are safe because claim is
  atomic.
- Keep the orchestrator's JVM free of sandbox responsibilities where practical: sandbox
  execution is delegated to a **runner** process/container so a rogue build cannot OOM the
  orchestrator.

---

## 25. Technology stack

Reuses the SIH26043 conventions so it drops into the existing reactor and docker-compose:

| Concern | Choice |
|---|---|
| Module | `codejudge-service` (Spring Boot, same parent/BOM as siblings) |
| Backend | Java 21, Spring Boot, Spring Data JPA |
| DB | PostgreSQL (`sih_codejudge`) + Flyway, `ddl-auto: validate` |
| Async/queue | DB-backed job queue first (no new infra); RabbitMQ/Kafka only if scale demands |
| Cache | (optional, later) Redis for detection caches |
| Execution sandbox | ephemeral Docker container per job (Docker Java client / CLI to host socket from a dedicated runner) |
| Code analysis | `agentic-legibility` + built-in static/architecture analyzers |
| AI | OpenAI-compatible **local** LLM (`app.llm.openai.*`, key via `OPENAI_API_KEY`) — advisory only |
| Storage | portal/object storage for evidence artifacts + reports (MVP: service-local volume + DB refs) |
| Service registry | Eureka; internal `@HttpExchange` clients by service id |
| Identity | shared claim-JWT (`edith-security`), no new role |
| Gateway | Caddy route `/codejudge/*` → `codejudge-service:8085` |

---

## 26. Repository structure (proposed)

```
codejudge-service/
├── pom.xml
├── src/main/java/com/EDITH/SIH26043/codejudge/
│   ├── CodeJudgeServiceApp.java
│   ├── config/             Security · OpenApi · SandboxProps · LlmProps · ClientConfig
│   ├── web/                EvaluationController · AdminController · InternalController · web/dto/*
│   ├── service/            EvaluationService · JobQueueService · OwnershipService · AuditService
│   ├── repository/         (per aggregate root)
│   ├── entity/             (ProblemStatement · Requirement · ProjectSubmission · Evaluation ·
│   │                        EvaluationJob · EvaluationStatusHistory · config tables · evidence tables)
│   ├── evaluation/
│   │   ├── orchestrator/   pipeline driver + stage registry + status machine
│   │   ├── workflow/       stage definitions (clone→…→report)
│   │   └── scoring/        ScoringEngine (pure) + config loader
│   ├── repositoryscanner/  detection
│   ├── buildengine/        sandbox build + runtime health
│   ├── testengine/         test/probe execution
│   ├── securityengine/     SAST/SCA + policy
│   ├── architectureengine/ structural analysis
│   ├── problemmatcher/     requirement matching + evidence links
│   ├── aiengine/           LLM client (advisory) + fallback
│   ├── reportengine/       report assembler + markdown
│   └── common/             Result types, evidence refs, enums
├── src/main/resources/
│   ├── application.yaml
│   ├── db/migration/       V1__codejudge_schema.sql · V2__codejudge_seed.sql
│   └── sandbox/            runner assets (image/Dockerfile, profiles)
└── src/test/java/.../      Mockito DB-free tests (mirrors sibling services)
```

Note: the plan uses `com.EDITH.SIH26043.codejudge` to match the repo. If CodeJudge is meant to
live outside SIH26043, swap the base package wholesale (e.g. `com.innovation.codejudge`); the
layering above is unchanged.

---

## 27. Development roadmap (8 milestones)

| M | Goal | Deliverable = "done when" |
|---|---|---|
| **M1 — Foundation** | Spring Boot module, DB, entities, REST, job state | `POST /codejudge/evaluations` → row + `QUEUED`; status endpoint returns history |
| **M2 — GitHub integration** | clone at commit, validate | Worker clones a real repo at `commitSha`; bad sha fails fast; clone evidence persisted |
| **M3 — agentic-legibility** | run + parse + normalise | Scanner detection + normalised engineering findings stored as `code_analysis` |
| **M4 — Build & test** | sandbox build/run/test | `BUILD_SUCCESS`, runtime health, test/probe executions recorded |
| **M5 — Problem matching** | problem fetch, requirement curation, matcher | Requirement ↔ evidence matrix produced (alignment %) |
| **M6 — Security + architecture** | SAST/SCA + structural analysis | Findings + policy penalties/blocks wired into scoring config |
| **M7 — AI evaluation** | evidence → LLM assessment | Advisory assessments/strengths/weaknesses with confidence + audit payload |
| **M8 — Scoring + report** | scoring engine, report, APIs | Deterministic `83/100`-style report with drillable evidence + audit trail |

Suggested cadence: M1–M2 first (they de-risk GitHub + sandbox, the riskiest integrations),
then M4 (execution), then M3/M5/M6 (analysis), then M7/M8 (intelligence + output). Milestones
are commit boundaries; each ends with offline Mockito tests green + a curl smoke through the
gateway.

---

## 28. MVP vs later

**MVP (v1):**
- ✅ GitHub repository + **commit-based** evaluation
- ✅ Repository scanner (language/framework/build/tests/docs)
- ✅ agentic-legibility engineering evidence (normalised)
- ✅ Build + run + health
- ✅ Basic automated tests / functional probes
- ✅ Basic security scan (secrets + SAST) + policy penalties
- ✅ Problem requirement extraction (curated) + requirement matching
- ✅ Deterministic score + evaluation report
- ✅ DB-backed job queue + state machine + status/report APIs

**V2:**
- AI evaluation (advisory assessments) + custom test generation
- Advanced architecture analysis (coupling/dependency graphs)
- Advanced security (SCA CVE feed, deeper SAST)

**V3:**
- Multi-language/ML-AI project evaluation, mobile app evaluation, hardware project integration
- Demo-video / PPT evaluation
- **Human + AI combined judging** (CodeJudge evidence as the human evaluator's input deck)

---

## 29. Risks & open questions

| # | Risk / question | Mitigation / default |
|---|---|---|
| 1 | **Sandbox escape / resource abuse** (untrusted code) | §23 hard limits, no network by default, ephemeral containers, no secrets, cleanup sweeper. **Validate on a hardened CI-like runner before enabling public creates.** |
| 2 | Dependency downloads need network vs "no network" | Config allow-list for package registries or an offline mirror; default deny. |
| 3 | agentic-legibility availability/quality | Version-pin; treat as evidence only; built-in heuristic fallback so pipeline never blocks. |
| 4 | Problem free-text is unstructured | §13 extraction + **human-curated** structured requirements before scoring. |
| 5 | Weighted scoring churn | Config-driven `scoring_version` snapshot on every evaluation; re-evaluate explicitly. |
| 6 | Portal submission is files, not a repo | Additive portal `V2` fields (`repositoryUrl/branch/commitSha`); MVP triggers CodeJudge directly. |
| 7 | AI hallucination / over-claiming | Advisory-only, evidence-citing prompt, "never assume missing functionality", raw payload audited. |
| 8 | Long-running jobs + container restarts | DB job queue with claim heartbeat + stale-claim re-queue; idempotent stage writes. |
| 9 | Repo/build reproducibility drift | Record commit + tool versions + config snapshot; refuse branch-HEAD evaluations. |
| 10 | Where the human evaluator sees the report | Keep CodeJudge read APIs; portal/evaluation-service consume `/internal/…/summary` later — no UI in scope (backend-only directive). |

---

## 30. Files that will matter (once built)

```
codejudge-service/src/main/resources/db/migration/V1__codejudge_schema.sql
codejudge-service/src/main/resources/application.yaml            (port 8085, DB_URL sih_codejudge,
                                                                  app.llm.openai.*, app.sandbox.*)
codejudge-service/src/main/java/com/EDITH/SIH26043/codejudge/
├── evaluation/orchestrator/EvaluationOrchestrator.java          (stage driver)
├── evaluation/scoring/ScoringEngine.java                        (pure, deterministic)
├── problemmatcher/RequirementMatcher.java
├── aiengine/OpenAiCompatibleEvaluator.java                      (mirrors sih_eval client)
├── buildengine/SandboxRunner.java                               (limits, timeout, cleanup)
└── service/JobQueueService.java
docker-compose.yml                                               (+ codejudge-service :8085, volume)
gateway/Caddyfile                                                (+ route /codejudge/*)
db/init/01-create-service-dbs.sql                                (+ CREATE DATABASE sih_codejudge)
.dockerignore                                                    (+ !codejudge-service/target/….jar)
```

Shared contracts to add in `edith-common` (or codejudge-local): a `CodeJudgeEvaluationRequest`
and `EvaluationSummaryResponse` if portal/evaluation-service need typed clients; otherwise
CodeJudge keeps its own DTOs and the only shared contract reused is the existing
`ProblemContextResponse` for the problem fetch.
