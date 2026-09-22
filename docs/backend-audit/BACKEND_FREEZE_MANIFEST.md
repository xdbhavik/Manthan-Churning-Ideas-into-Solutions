# Backend Freeze Manifest — Audit Baseline

> Records the backend state at audit time so the future frontend redesign has a
> stable baseline. Nothing in this file implies any modification; the backend was
> not changed.

---

## 1. Git baseline

| Item | Value |
|:---|:---|
| Commit | `d9b7743` ("Add files via upload") |
| Branch | `main` |
| Recent history | `d9b7743`, `563039c`, `d4bb100`, `15536c3`, `f8bd2b9`, `8b6d5db`, `1334c13`, `b461cf9`, `8c25434`, `20c056b` |

### Working-tree status at audit (pre-existing, NOT introduced by this audit)

| Path | Status |
|:---|:---|
| `start-all.bat` | Modified (uncommitted, +12/−2) |
| `start-all.sh` | Untracked (new file) |

> These are root-level orchestration scripts, **not** backend source. They were
> left untouched. No backend source/config was modified.

---

## 2. Backend directories & files

```
backend/
├── pom.xml                       # Maven reactor (modules, versions)
├── mvnw / mvnw.cmd               # Maven wrapper
├── Dockerfile.service            # thin JRE wrapper for the 5 JVM services
├── Dockerfile.codejudge          # adds git + python3 for codejudge
├── docker-compose.yml            # backend cluster (db, eureka, 5 services, gateway)
├── .env.example                  # OPENAI_API_KEY template only
├── db/init/01-create-service-dbs.sql
├── gateway/Caddyfile             # reverse proxy + /internal/** shielding
├── edith-common/                 # shared enums, ApiException, internal DTOs
├── edith-security/               # JwtService, JwtAuthFilter, AuthUser
├── eureka-server/                # discovery
├── source-service/               # :8081  (auth, users, registration, accounts)
├── problem-service/              # :8082  (problems, domains, audit)
├── evaluation-service/           # :8083  (cycles, evaluators, project reviews)
├── portal-service/               # :8084  (participants, catalog, submissions)
├── codejudge-service/            # :8085  (repo evaluation + Python analyzer)
├── codejudgeservice.md, evaluation-service.md, portalservice.md,
│   problem-service.md            # service markdown docs (treat code as source of truth)
└── seed_demo_data.py, seed-sample-cases.ps1, test_submit.py,
    link_cycles_assignments.py    # helper scripts (not part of build)
```

---

## 3. Framework & dependency versions

| Component | Version |
|:---|:---|
| Java | 21 |
| Spring Boot (parent) | 4.1.1 |
| Spring Cloud | 2025.1.3 |
| Lombok | 1.18.46 |
| PostgreSQL image | `postgis/postgis:16-3.4` |
| Caddy | 2 |
| Build | Maven (multi-module) |

Per-service artifacts: `*-0.0.1-SNAPSHOT.jar` (e.g. `source-service-0.0.1-SNAPSHOT.jar`).

---

## 4. API endpoint inventory

**89 total endpoints** (82 public/gateway + 7 internal service-to-service).

| Module | Count | Controllers |
|:---|:---:|:---|
| source-service | 26 | `AuthController` (5), `UserController` (3), `RegistrationController` (8), `ReviewerRegistrationController` (5), `SourceAccountController` (2), `VerificationController` (1), `InternalSourceAccountController` (1), `InternalUserSourceAccountsController` (1) |
| problem-service | 10 | `ProblemController` (7), `InternalProblemController` (1), `DomainController` (1), `AuditController` (1) |
| evaluation-service | 25 | `EvaluationAdminController` (11), `EvaluatorController` (7), `EvaluatorProjectReviewController` (3), `EvaluatorProfileAdminController` (1), `EvaluatorPoolModeController` (2), `InternalProjectReviewController` (1) |
| portal-service | 16 | `PortalController` (14), `InternalPublishController` (1), `InternalReviewResultController` (1) |
| codejudge-service | 12 | `CodeJudgeController` (6), `CodeJudgeAdminController` (4), `InternalCodeJudgeController` (2) |

Internal (off-gateway, `/internal/**`) endpoints:
1. `GET /internal/source-accounts/{id}` (source)
2. `GET /internal/users/{userId}/source-accounts` (source)
3. `GET /internal/problems/{id}` (problem)
4. `POST /internal/project-reviews` (evaluation)
5. `POST /internal/published-problems` (portal)
6. `POST /internal/submissions/{submissionId}/review-result` (portal)
7. `POST /internal/codejudge/evaluations` (codejudge)
8. `GET /internal/codejudge/evaluations/{id}/summary` (codejudge)

Full catalog in `API_REFERENCE.md`.

---

## 5. Database schema / migration baseline

| Database | Migrations | Notes |
|:---|:---|:---|
| `sih_source` | `V1__source_schema.sql`, `V2__seed_dev_users.sql` | 4 dev users |
| `sih_problem` | `V1`–`V5` | domains, universities, access rules seeded |
| `sih_eval` | `V1`–`V5` | criteria/weights seeded, project review + auto-eval columns |
| `sih_portal` | `V1`–`V3` | access-rule enum + submission commit/branch columns |
| `sih_codejudge` | `V1`–`V3` | 8 categories + 3 policies seeded, problem snapshot columns |

`ddl-auto: validate` everywhere; Flyway is authoritative. Full schema in
`DATA_MODEL.md`.

---

## 6. Existing tests (status: present, NOT executed in this audit)

Unit tests exist for service/business logic (no controller or integration tests).
Listed by module:

- **source-service** (3): `SourceServiceAppTests`, `AuthServiceTest`,
  `SourceAccountLookupServiceTest`.
- **problem-service** (4): `ProblemSubmissionServiceTest`, `ProblemCollectionEngineTest`,
  `AutoUniversitySelectionServiceTest`, `OpenAiCompatibleDomainResolutionClientTest`.
- **evaluation-service** (14): `ScoreAggregationServiceTest`, `ProjectReviewServiceTest`,
  `ProblemAnalysisServiceTest`, `PrioritizationServiceTest`, `PortalPublishServiceTest`,
  `EvaluatorProfileAdminServiceTest`, `EvaluatorPoolModeServiceTest`,
  `EvaluatorAssignmentServiceTest`, `EvaluationStatusServiceTest`,
  `EvaluationRoutingServiceTest`, `EvaluationIntakeServiceTest`,
  `EvaluationCompletionServiceTest`, `AutoEvaluationServiceTest`,
  `OpenAiCompatibleCriterionScoringClientTest`.
- **portal-service** (4): `SubmissionServiceTest`, `SubmissionFileServiceTest`,
  `PublishedProblemServiceTest`, `ParticipantServiceTest`.
- **codejudge-service** (8): `JobQueueServiceTest`, `EvaluationServiceTest`,
  `ScoringEngineTest`, `LegibilitySignalScorerTest`, `EvaluationPipelineTest`,
  `StaticHeuristicsScannerTest`, `SecretScanServiceTest`, plus Python
  `tests/test_scan_repo.py`.

**Verification performed during audit**: no tests were run (read-only audit). Code
was verified by direct source inspection. A build/test run would require
`./mvnw -DskipTests package` (or `./mvnw test`); this was not performed to avoid
any modification to `target/` or generated artifacts.

---

## 7. Known bugs / limitations (carried forward)

See `BACKEND_GAPS_AND_UNKNOWNS.md` for full detail. Highlights:

- SMS OTP delivery is a placeholder no-op.
- CodeJudge sandbox disabled (`FUNCTIONAL`/`PROBLEM_ALIGNMENT` always `NOT_EVALUATED`).
- `idempotency_key` table dormant.
- Evidence `file_url` stores an absolute filesystem path; no evidence download endpoint.
- No pagination on most list endpoints.
- `@Version` conflict surfaces as 500 (no dedicated handler) except where services
  do explicit `expectedVersion` checks.
- `/internal/**` is `permitAll()` and directly reachable on service ports if the
  compose `ports:` are externally exposed.

---

## 8. Confirmation

No backend source code, routes, services, repositories, entities, DTOs, schema,
migrations, configuration, dependencies, or environment files were modified during
this audit. The only outputs are the documentation files under `docs/backend-audit/`.
