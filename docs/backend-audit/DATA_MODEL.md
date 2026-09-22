# Data Model

> One private PostgreSQL database per service. Flyway owns schema (`ddl-auto:
> validate`). Cross-service ids are **plain UUID columns without FKs**;
> intra-service FKs are declared in DDL. Native Postgres enums + JSONB are used
> extensively. All tables use `TIMESTAMPTZ` (`Instant` in Java) and
> `UUID` primary keys (mostly `DEFAULT gen_random_uuid()`).

---

## 1. source-service — database `sih_source`

Migration: `V1__source_schema.sql`, `V2__seed_dev_users.sql`.

### 1.1 Inheritance spine: `problem_source` (JOINED, 3 levels)

`problem_source` is the root of a **JOINED subclass** hierarchy. `SourceMapper`
materializes the correct concrete subclass on approval. Discriminator semantics
carried by `bucket` + `sub_entity_type`.

| Table | Extends | Purpose |
|:---|:---|:---|
| `problem_source` | — | root (bucket, sub_entity_type, contact, verification) |
| `government_source` | problem_source | GOVT |
| `department_source` / `pri_source` / `ulb_source` | government_source | DEPARTMENT / PRI / ULB |
| `citizen_source` | problem_source | CITIZEN |
| `individual_source` / `rwa_source` | citizen_source | INDIVIDUAL / RWA |
| `industry_source` | problem_source | INDUSTRY |
| `company_source` / `startup_source` / `msme_source` / `csr_source` | industry_source | COMPANY / STARTUP / MSME / CSR |
| `community_source` | problem_source | COMMUNITY |
| `ngo_source` / `shg_source` / `cbo_coop_source` | community_source | NGO / SHG / CBO_COOP |
| `hei_source` | problem_source | HEI |
| `university_source` / `research_lab_source` | hei_source | UNIVERSITY / RESEARCH_LAB |

`problem_source` columns: `source_id UUID PK`, `bucket source_bucket NOT NULL`,
`sub_entity_type sub_entity_type NOT NULL`, `contact_person_name VARCHAR(100)`,
`contact_email VARCHAR(100)`, `contact_phone VARCHAR(15)`, `organization_name
VARCHAR(255)`, `registration_number VARCHAR(50)`, `is_verified_source BOOLEAN
NOT NULL DEFAULT FALSE`, `registered_at TIMESTAMPTZ NOT NULL DEFAULT now()`,
`verification_credentials JSONB`.

> The full column list for each subclass is long; key subtype columns are listed
> in the source files (`source-service/.../entity/*Source.java`) and mirror the
> `CREATE TABLE` DDL in `V1__source_schema.sql`. Notable subtype fields:
> - `hei_source.institution_name VARCHAR(255) NOT NULL` (used by portal for
>   UNIVERSITY auto-bind + `SELECTED_UNIVERSITIES` matching).
> - `university_source.*` (PI details, `problem_type`, `student_involvement`, etc.).
> - `department_source.department_full_name VARCHAR(255) NOT NULL` (required field).
> - `individual_source.contact_number VARCHAR(15) NOT NULL`, `aadhaar_hash`,
>   `voter_id_hash` (HMAC-peppered SHA-256).

### 1.2 Core identity & workflow tables

**`users`**: `user_id UUID PK`, `phone VARCHAR(15) NOT NULL UNIQUE`,
`email VARCHAR(100)`, `role user_role NOT NULL`, `kyc_status kyc_status NOT NULL
DEFAULT 'UNVERIFIED'`, `linked_source_id UUID` (FK → `problem_source.source_id`),
`created_at TIMESTAMPTZ NOT NULL DEFAULT now()`.

**`otp_challenge`**: `challenge_id UUID PK`, `phone VARCHAR(15) NOT NULL`,
`otp_code_hash VARCHAR(255) NOT NULL`, `expires_at TIMESTAMPTZ NOT NULL`,
`consumed_at TIMESTAMPTZ`, `attempt_count INT NOT NULL DEFAULT 0`,
`created_at TIMESTAMPTZ NOT NULL`. Indexes on `(phone, created_at DESC)`, `(expires_at)`.

**`refresh_token`**: `token UUID PK`, `user_id UUID NOT NULL REFERENCES users ON
DELETE CASCADE`, `expires_at TIMESTAMPTZ NOT NULL`, `revoked_at TIMESTAMPTZ`,
`created_at TIMESTAMPTZ NOT NULL`. Index `(user_id)`.

**`source_registration`**: `registration_id UUID PK`, `source_bucket source_bucket
NOT NULL`, `source_type sub_entity_type NOT NULL`, `status registration_status NOT
NULL DEFAULT 'DRAFT'`, `source_payload JSONB NOT NULL DEFAULT '{}'`,
`submitted_by_user_id UUID NOT NULL REFERENCES users`, `source_id UUID` (FK →
problem_source), `assigned_reviewer_id UUID` (FK → users), `rejection_reason TEXT`,
`action_required_comment TEXT`, `submitted_at`, `reviewed_at`, `created_at`,
`updated_at`, `version INT NOT NULL DEFAULT 1`. Indexes on status/submitter/reviewer.

**`registration_status_history`**: `history_id UUID PK`, `registration_id UUID NOT
NULL REFERENCES source_registration ON DELETE CASCADE`, `from_status registration_status`
(nullable), `to_status registration_status NOT NULL`, `changed_by_user_id UUID` (FK→users),
`comment TEXT`, `changed_at TIMESTAMPTZ NOT NULL`.

**`source_account`**: `source_account_id UUID PK`, `owner_user_id UUID NOT NULL
REFERENCES users`, `source_id UUID NOT NULL UNIQUE REFERENCES problem_source`,
`registration_id UUID UNIQUE REFERENCES source_registration`, `source_bucket
source_bucket NOT NULL`, `source_type sub_entity_type NOT NULL`, `display_name
VARCHAR(255)`, `status source_account_status NOT NULL DEFAULT 'PENDING'`,
`verification_status account_verification_status NOT NULL DEFAULT 'UNVERIFIED'`,
`activated_at`, `created_at`, `updated_at`, `version INT NOT NULL DEFAULT 1`.
Indexes `(owner_user_id)`, `(status, verification_status)`.

**`source_verification`**: `verification_id UUID PK`, `source_id UUID NOT NULL
REFERENCES problem_source`, `verification_method verification_method NOT NULL`,
`verified_by_user_id UUID` (FK→users), `result verification_result NOT NULL`,
`notes TEXT`, `verified_at TIMESTAMPTZ NOT NULL`, `evidence_url VARCHAR(500)`.

**`idempotency_key`**: `idem_key VARCHAR(128) PK`, `user_id UUID` (FK→users),
`request_hash VARCHAR(64) NOT NULL`, `response_status SMALLINT`, `response_body
JSONB`, `created_at`. *(No entity or service usage — dormant table.)*

### 1.3 Dev seed (`V2__seed_dev_users.sql`)

| user_id (deterministic) | phone | role | kyc |
|:---|:---|:---|:---|
| `11111111-1111-4111-8111-111111111111` | `9800000001` | ADMIN | UNVERIFIED |
| `22222222-2222-4222-8222-222222222222` | `9829858790` | REVIEWER | UNVERIFIED |
| `33333333-3333-4333-8333-333333333333` | `9900000001` | SUBMITTER | UNVERIFIED |
| `44444444-4444-4444-8444-444444444444` | `9700000001` | EVALUATOR | UNVERIFIED |

---

## 2. problem-service — database `sih_problem`

Migrations `V1`–`V5`.

**`problem`**: `problem_id UUID PK`, `title VARCHAR(255) NOT NULL`, `description
TEXT NOT NULL`, `source_bucket source_bucket NOT NULL`, `sub_entity_type
sub_entity_type NOT NULL`, `status problem_status NOT NULL DEFAULT 'SUBMITTED'`,
`urgency urgency NOT NULL`, `severity severity`, `source_id UUID NOT NULL`,
`source_account_id UUID`, `location_id UUID REFERENCES location`, `affected_population
INT`, `expected_outcome TEXT`, `existing_intervention TEXT`, `submitted_at NOT NULL
DEFAULT now()`, `updated_at NOT NULL`, `submitted_by_user_id UUID`, `version INT
NOT NULL DEFAULT 1`, `metadata JSONB`, `access_rule problem_access_rule NOT NULL
DEFAULT 'OPEN_TO_ALL'`, `access_universities JSONB NOT NULL DEFAULT '[]'`.
Indexes on status/bucket/sub_entity/location/submitted_at/user/source/source_account.

**`location`**: `location_id UUID PK`, `country VARCHAR(100) NOT NULL DEFAULT
'India'`, `state VARCHAR(100) NOT NULL`, `district VARCHAR(100) NOT NULL`,
`block_tehsil VARCHAR(100)`, `village_ward VARCHAR(100)`, `pincode VARCHAR(10)`,
`latitude DECIMAL(10,8) NOT NULL`, `longitude DECIMAL(11,8) NOT NULL`, `landmark
VARCHAR(255)`, `boundary_geojson JSONB`, `lgd_code VARCHAR(20)`.

**`evidence`**: `evidence_id UUID PK`, `problem_id UUID NOT NULL REFERENCES problem
ON DELETE CASCADE`, `evidence_type evidence_type NOT NULL`, `file_url VARCHAR(500)
NOT NULL`, `file_hash VARCHAR(64) NOT NULL` (SHA-256 hex), `metadata JSONB`,
`captured_at`, `uploaded_by_user_id UUID`. Indexes on problem/type/user.

**`domain`**: `domain_id UUID PK`, `domain_name VARCHAR(100) NOT NULL UNIQUE`,
`description TEXT`, `parent_domain_id UUID REFERENCES domain` (self-FK), `level INT
NOT NULL DEFAULT 1 CHECK (1..3)`. Constraint `chk_domain_no_self_parent`.

**`problem_domain`** (composite PK `(problem_id, domain_id)`): `is_primary BOOLEAN
NOT NULL DEFAULT FALSE`. Partial unique index `uq_problem_domain_one_primary ON
(problem_id) WHERE is_primary`.

**`university`**: `university_id UUID PK` (no DB default — seed supplies),
`name VARCHAR(255) NOT NULL UNIQUE`, `short_name VARCHAR(50)`, `state VARCHAR(100)`,
`active BOOLEAN NOT NULL DEFAULT TRUE`, `created_at NOT NULL DEFAULT now()`.
Seeded 16 institutions (IITs, IISc, NIT Trichy, Anna Univ, DTU, PAU, IITTM, TISS, GTU).

**`university_domain`** (composite PK `(university_id, domain_id)`): maps
universities → root domains.

**`audit_log`**: `log_id UUID PK`, `problem_id UUID REFERENCES problem ON DELETE
CASCADE`, `action_type audit_action NOT NULL`, `performed_by_user_id UUID`,
`performed_at TIMESTAMPTZ NOT NULL`, `before_state JSONB`, `after_state JSONB`,
`ip_address VARCHAR(45)`.

### Domain seed (`V2__domain_seed.sql`)
Deterministic UUIDs; 12 level-1 roots (Healthcare, Agriculture & Food, Water &
Sanitation, Education & Skills, Transportation & Mobility, Public Safety & Justice,
Environment & Climate, Energy & Utilities, Digital & e-Governance, Rural & Urban
Development, Employment & Livelihoods, Tourism & Culture), ~24 level-2, 6 level-3.

---

## 3. evaluation-service — database `sih_eval`

Migrations `V1`–`V5`.

**`evaluation_cycle`**: `cycle_id UUID PK`, `problem_id UUID NOT NULL UNIQUE`,
`status evaluation_status NOT NULL DEFAULT 'RECEIVED'`, `trigger_method VARCHAR(20)
NOT NULL DEFAULT 'ADMIN'`, `triggered_by_user_id UUID`, `started_at NOT NULL`,
`completed_at`, `final_score DECIMAL(5,2)`, `impact_level impact_level`,
`priority_score DECIMAL(5,2)`, `priority_band priority_band`, `metadata JSONB`,
`created_at`, `updated_at`, `version INT DEFAULT 1`.

**`evaluation_assignment`**: `assignment_id UUID PK`, `cycle_id UUID NOT NULL REFERENCES
evaluation_cycle ON DELETE CASCADE`, `evaluator_profile_id UUID NOT NULL REFERENCES
evaluator_profile`, `assigned_by_user_id UUID`, `status assignment_status NOT NULL
DEFAULT 'ASSIGNED'`, `assigned_at NOT NULL`, `deadline NOT NULL`, `submitted_at`,
`conflict_recheck BOOLEAN NOT NULL DEFAULT FALSE`, `eligibility_rechecked_at`,
`feedback TEXT`, `recommendation VARCHAR(255)`, `updated_at`, `version INT`.
`UNIQUE (cycle_id, evaluator_profile_id)`.

**`evaluation_criterion`**: `criterion_id UUID PK`, `evaluator_type evaluator_type
NOT NULL`, `criterion_key VARCHAR(50) NOT NULL`, `criterion_label VARCHAR(255) NOT
NULL`, `description TEXT`, `max_score INT NOT NULL DEFAULT 10` (CHECK IN (5,10)),
`sort_order INT NOT NULL DEFAULT 0`, `is_active BOOLEAN NOT NULL DEFAULT TRUE`.
`UNIQUE (evaluator_type, criterion_key)`. 25 seeded rows (5 per pool).

**`evaluation_response`** (composite PK `(assignment_id, criterion_id)`): `score INT
NOT NULL` (CHECK 1..10), `comment TEXT`, `score_source score_source NOT NULL
DEFAULT 'HUMAN'`.

**`evaluation_aggregation`**: `aggregation_id UUID PK`, `cycle_id UUID NOT NULL
UNIQUE REFERENCES evaluation_cycle ON DELETE CASCADE`, `status aggregation_status
NOT NULL DEFAULT 'PENDING'`, `overall_score DECIMAL(5,2)`, `per_type_scores JSONB
NOT NULL DEFAULT '{}'`, `weighting_method weighting_method NOT NULL DEFAULT
'CONFIGURED'`, `num_assignments INT NOT NULL DEFAULT 0`, `disagreement_flag BOOLEAN
NOT NULL DEFAULT FALSE`, `disagreement_details JSONB`, `aggregated_at`, `updated_at`,
`version INT`.

**`evaluation_disagreement`**: `disagreement_id UUID PK`, `cycle_id UUID NOT NULL
REFERENCES evaluation_cycle ON DELETE CASCADE`, `assignment_id UUID` (cascade),
`evaluator_profile_id UUID`, `deviation_score DECIMAL(6,2) NOT NULL`, `threshold
DECIMAL(6,2) NOT NULL`, `status disagreement_status NOT NULL DEFAULT 'OPEN'`,
`action_taken VARCHAR(50)`, `comment TEXT`, `resolved_by_user_id UUID`,
`resolved_at`, `created_at NOT NULL`.

**`weight_config`**: `weight_id UUID PK`, `evaluator_type evaluator_type NOT NULL
UNIQUE`, `weight DECIMAL(4,3) NOT NULL` (CHECK 0..1), `is_default BOOLEAN NOT NULL
DEFAULT TRUE`, `updated_by_user_id UUID`, `updated_at NOT NULL`. Seed:
GOVERNMENT 0.25, INDUSTRY 0.15, HEI 0.15, CITIZEN 0.25, COMMUNITY 0.20.

**`problem_analysis`**: `analysis_id UUID PK`, `cycle_id UUID NOT NULL UNIQUE
REFERENCES evaluation_cycle ON DELETE CASCADE`, `provider VARCHAR(50) NOT NULL`,
`model VARCHAR(100)`, `problem_category VARCHAR(100)`, `domain VARCHAR(100)`,
`sector VARCHAR(100)`, `impact_areas JSONB NOT NULL DEFAULT '[]'`, `complexity
VARCHAR(50)`, `potential_scale VARCHAR(50)`, `technology_relevance VARCHAR(50)`,
`social_impact VARCHAR(50)`, `status analysis_status NOT NULL DEFAULT 'SUCCESS'`,
`error_message TEXT`, `latency_ms BIGINT`, `model_version VARCHAR(100)`,
`raw_payload JSONB NOT NULL DEFAULT '{}'`, `analyzed_at NOT NULL`.

**`evaluator_profile`**: `profile_id UUID PK`, `user_id UUID NOT NULL UNIQUE`,
`evaluator_type evaluator_type NOT NULL`, `full_name VARCHAR(150) NOT NULL`,
`organization VARCHAR(255)`, `designation VARCHAR(150)`, `experience_years INT NOT
NULL DEFAULT 0`, `region_states JSONB NOT NULL DEFAULT '[]'`, `affiliated_source_id
UUID`, `max_workload INT NOT NULL DEFAULT 5` (CHECK > 0), `is_active BOOLEAN NOT
NULL DEFAULT TRUE`, `is_system BOOLEAN NOT NULL DEFAULT FALSE` (V4), `created_at`,
`updated_at`, `version INT`.

**`evaluator_domain`** (composite PK `(profile_id, domain_id)`): join to problem-service
domains by id.

**`evaluator_pool_mode`**: `evaluator_type evaluator_type PK`, `mode evaluation_mode
NOT NULL DEFAULT 'MANUAL'`, `updated_by_user_id UUID`, `updated_at NOT NULL`,
`version INT`.

**`project_review`**: `project_review_id UUID PK`, `submission_id UUID NOT NULL`,
`round INT NOT NULL DEFAULT 1`, `problem_id UUID NOT NULL`, `cycle_id UUID NOT NULL
REFERENCES evaluation_cycle ON DELETE CASCADE`, `evaluator_profile_id UUID NOT NULL`,
`reviewer_user_id UUID NOT NULL`, `problem_title VARCHAR(500) NOT NULL`,
`submission_title VARCHAR(255)`, `summary TEXT`, `github_url VARCHAR(500)`, `links
JSONB NOT NULL DEFAULT '[]'`, `files JSONB NOT NULL DEFAULT '[]'`, `status
project_review_status NOT NULL DEFAULT 'ASSIGNED'`, `decision_comment TEXT`,
`created_at NOT NULL`, `decided_at`, `version INT`. `UNIQUE (submission_id, round)`.

**`evaluation_status_history`**: `history_id UUID PK`, `cycle_id UUID NOT NULL
REFERENCES evaluation_cycle ON DELETE CASCADE`, `from_status evaluation_status`,
`to_status evaluation_status NOT NULL`, `changed_by_user_id UUID`, `comment TEXT`,
`changed_at NOT NULL`.

**`audit_log`**: `audit_id UUID PK`, `entity_type VARCHAR(50) NOT NULL`,
`entity_id UUID NOT NULL`, `action_type audit_action NOT NULL`, `performed_by_user_id
UUID`, `performed_at NOT NULL`, `before_state JSONB`, `after_state JSONB`,
`ip_address VARCHAR(64)`.

---

## 4. portal-service — database `sih_portal`

Migrations `V1`–`V3`.

**`participant`**: `participant_id UUID PK`, `user_id UUID NOT NULL UNIQUE` (JWT
subject), `participant_type participant_type NOT NULL`, `full_name VARCHAR(150) NOT
NULL`, `email VARCHAR(255)`, `phone VARCHAR(20)`, `institution_name VARCHAR(255)`,
`source_account_id UUID`, `created_at`, `updated_at`, `version INT`.

**`published_problem`**: `problem_id UUID PK` (upstream problem-service id, NOT
generated — natural idempotent UPSERT), `cycle_id UUID NOT NULL`, `title VARCHAR(255)
NOT NULL`, `description TEXT NOT NULL`, `expected_outcome TEXT`, `source_bucket
source_bucket NOT NULL`, `sub_entity_type sub_entity_type NOT NULL`, `urgency urgency
NOT NULL`, `severity severity`, `location VARCHAR(500)`, `domains JSONB NOT NULL
DEFAULT '[]'`, `evidence_count INT NOT NULL DEFAULT 0`, `access_rule access_rule NOT
NULL DEFAULT 'OPEN_TO_ALL'`, `access_universities JSONB NOT NULL DEFAULT '[]'`,
`published_at NOT NULL DEFAULT now()`, `updated_at NOT NULL`, `version INT`.

**`team`**: `team_id UUID PK`, `problem_id UUID NOT NULL REFERENCES published_problem
ON DELETE CASCADE`, `name VARCHAR(150) NOT NULL`, `created_by_participant_id UUID NOT
NULL REFERENCES participant`, `created_at NOT NULL`.

**`team_member`** (composite PK `(team_id, participant_id)`): `role VARCHAR(20) NOT
NULL DEFAULT 'MEMBER'`.

**`submission`**: `submission_id UUID PK`, `problem_id UUID NOT NULL REFERENCES
published_problem`, `team_id UUID` (FK→team), `submitter_participant_id UUID NOT NULL
REFERENCES participant`, `title VARCHAR(255)`, `summary TEXT`, `github_url
VARCHAR(500)`, `commit_sha VARCHAR(64)` (V3), `branch VARCHAR(120)` (V3), `links
JSONB NOT NULL DEFAULT '[]'`, `status submission_status NOT NULL DEFAULT 'DRAFT'`,
`review_round INT NOT NULL DEFAULT 0`, `reviewer_user_id UUID`, `decision_comment
TEXT`, `submitted_at`, `decided_at`, `created_at`, `updated_at`, `version INT`.

**`submission_file`**: `file_id UUID PK`, `submission_id UUID NOT NULL REFERENCES
submission ON DELETE CASCADE`, `original_name VARCHAR(255) NOT NULL`, `content_type
VARCHAR(100)`, `size_bytes BIGINT NOT NULL`, `storage_path VARCHAR(500) NOT NULL`,
`sha256 VARCHAR(64) NOT NULL`, `uploaded_by UUID`, `uploaded_at NOT NULL DEFAULT now()`.

---

## 5. codejudge-service — database `sih_codejudge`

Migrations `V1`–`V3`.

**`project_submission`**: `submission_id UUID PK`, `portal_submission_id UUID`,
`problem_id UUID NOT NULL`, `problem_title VARCHAR(255)`, `problem_description TEXT`
(V3), `problem_expected_outcome TEXT` (V3), `problem_domains JSONB NOT NULL DEFAULT
'[]'` (V3), `problem_status VARCHAR(40)` (V3), `team_id UUID`, `owner_user_id UUID
NOT NULL`, `repository_url VARCHAR(500) NOT NULL`, `branch VARCHAR(120)`, `commit_sha
VARCHAR(64) NOT NULL`, `demo_url VARCHAR(500)`, `documentation_url VARCHAR(500)`,
`created_at`, `updated_at`, `version INT`.

**`evaluation`**: `evaluation_id UUID PK`, `submission_id UUID NOT NULL REFERENCES
project_submission`, `status evaluation_status NOT NULL DEFAULT 'QUEUED'`,
`scoring_version VARCHAR(20)`, `final_score DOUBLE PRECISION`, `verdict verdict`,
`config_snapshot JSONB NOT NULL DEFAULT '{}'`, `tool_versions JSONB NOT NULL DEFAULT
'{}'`, `started_at`, `completed_at`, `created_at`, `updated_at`, `version INT`.

**`evaluation_job`**: `job_id UUID PK`, `evaluation_id UUID NOT NULL UNIQUE REFERENCES
evaluation`, `status job_status NOT NULL DEFAULT 'QUEUED'`, `priority INT NOT NULL
DEFAULT 5`, `claim_owner VARCHAR(120)`, `claimed_at`, `attempts INT NOT NULL DEFAULT
0`, `last_error TEXT`, `created_at`, `updated_at`, `version INT`.

**`evaluation_category`** (seed): `category_key VARCHAR(40) PK`, `name VARCHAR(120)
NOT NULL`, `description VARCHAR(500)`, `max_score DOUBLE NOT NULL`, `weight DOUBLE
NOT NULL`, `sort_order INT NOT NULL DEFAULT 0`, `active BOOLEAN NOT NULL DEFAULT
TRUE`, `updated_at`. 8 seeded categories (weights sum 100): PROBLEM_ALIGNMENT 25,
FUNCTIONAL 25, ENGINEERING 15, ARCHITECTURE 10, TESTING 10, INNOVATION 5, SECURITY 5,
DOCUMENTATION 5.

**`evaluation_policy`** (seed): `rule_key VARCHAR(60) PK`, `description TEXT`,
`severity finding_severity`, `action VARCHAR(20) NOT NULL` (PENALTY/BLOCK/NONE),
`amount DOUBLE NOT NULL DEFAULT 0`, `active BOOLEAN NOT NULL DEFAULT TRUE`,
`updated_at`. Seeds: `CRITICAL_SECURITY_BLOCK` (BLOCK, amount 1),
`HIGH_SECURITY_PENALTY` (PENALTY, amount 3), `PASSING_SCORE` (NONE, amount 40).

**`evaluation_category_score`**: `category_score_id UUID PK`, `evaluation_id UUID NOT
NULL REFERENCES evaluation ON DELETE CASCADE`, `category_key VARCHAR(40) NOT NULL
REFERENCES evaluation_category`, `score DOUBLE NOT NULL DEFAULT 0`, `max_score DOUBLE
NOT NULL`, `weight DOUBLE NOT NULL DEFAULT 0`, `status VARCHAR(20) NOT NULL DEFAULT
'EVALUATED'` (EVALUATED/NOT_EVALUATED/BLOCKED), `note VARCHAR(500)`, `created_at`.
`UNIQUE (evaluation_id, category_key)`.

**`code_analysis`**: `analysis_id UUID PK`, `evaluation_id UUID NOT NULL REFERENCES
evaluation ON DELETE CASCADE`, `category_key VARCHAR(40) NOT NULL`, `score DOUBLE
NOT NULL DEFAULT 0`, `max_score DOUBLE NOT NULL DEFAULT 0`, `payload JSONB NOT NULL
DEFAULT '{}'`, `tool VARCHAR(80) NOT NULL`, `tool_version VARCHAR(40)`, `status
analysis_status NOT NULL DEFAULT 'SUCCESS'`, `created_at`.

**`security_finding`**: `finding_id UUID PK`, `evaluation_id UUID NOT NULL REFERENCES
evaluation ON DELETE CASCADE`, `severity finding_severity NOT NULL`, `type VARCHAR(60)
NOT NULL`, `file VARCHAR(500)`, `line INT`, `message TEXT NOT NULL`, `created_at`.

**`evaluation_finding`**: `finding_id UUID PK`, `evaluation_id UUID NOT NULL REFERENCES
evaluation ON DELETE CASCADE`, `severity finding_severity NOT NULL`, `category
VARCHAR(40) NOT NULL`, `message TEXT NOT NULL`, `evidence_ref VARCHAR(500)`, `created_at`.

**`evaluation_report`**: `report_id UUID PK`, `evaluation_id UUID NOT NULL UNIQUE
REFERENCES evaluation ON DELETE CASCADE`, `report_json JSONB NOT NULL`,
`report_markdown TEXT NOT NULL`, `generated_at NOT NULL DEFAULT now()`.

**`ai_evaluation`**: `ai_evaluation_id UUID PK`, `evaluation_id UUID NOT NULL
REFERENCES evaluation ON DELETE CASCADE`, `status VARCHAR(20) NOT NULL DEFAULT
'UNAVAILABLE'` (AVAILABLE/UNAVAILABLE/ERROR/SKIPPED), `model VARCHAR(120)`,
`confidence DOUBLE`, `payload JSONB NOT NULL DEFAULT '{}'`, `raw_payload JSONB`,
`created_at`.

**`evaluation_status_history`**: `history_id UUID PK`, `evaluation_id UUID NOT NULL
REFERENCES evaluation ON DELETE CASCADE`, `from_status evaluation_status`,
`to_status evaluation_status NOT NULL`, `actor VARCHAR(120) NOT NULL DEFAULT
'MACHINE'`, `note VARCHAR(500)`, `created_at`.

---

## 6. Cross-cutting data-model notes

- **Enum persistence**: `@JdbcTypeCode(SqlTypes.NAMED_ENUM)` + `columnDefinition`
  naming a Postgres `CREATE TYPE`. No `@Enumerated` mappings.
- **JSON/JSONB**: `Map`/`List` fields use `@JdbcTypeCode(SqlTypes.JSON)`.
- **Optimistic locking**: `@Version Integer version` on `SourceAccount`,
  `SourceRegistration`, `Problem`, `EvaluationCycle`, `EvaluationAssignment`,
  `ScoreAggregation`, `ProjectReview`, `EvaluatorProfile`, `EvaluatorPoolMode`,
  `Participant`, `PublishedProblem`, `Submission`, `Evaluation`, `EvaluationJob`,
  `ProjectSubmission`. `ProblemStatusService.transition` additionally enforces an
  explicit `expectedVersion` check (409 on mismatch).
- **Soft deletion**: none. Rejection/archival is modeled as enum status, not deletion.
  Cascade delete only via intra-service FKs (e.g. `evidence`, `evaluation_*`,
  `submission_file`).
- **Data lifecycle & ownership**:
  - `source_account` is created **only** by `RegistrationReviewService.approve()`.
  - `participant` is 1:1 with a source-service `user_id`.
  - `published_problem.problem_id` is the upstream problem-service id.
  - `project_review` is keyed `UNIQUE(submission_id, round)` for resubmission rounds.
- **DTO vs entity differences**: entities carry internal fields not exposed (e.g.
  `Problem.metadata`, `Evaluation.configSnapshot/toolVersions`); DTOs carry
  denormalized/derived fields (`SourceAccountResponse.canSubmit`, `ProblemResponse.version`
  defaulted to 1, `MyAssignmentResponse.overdue`). Internal records
  (`SourceAccountResponse`, `SourceAccountDetail`, `ProblemContextResponse`) travel
  enums as `name()` strings.
