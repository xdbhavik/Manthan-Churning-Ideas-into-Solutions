-- V1: Step 3 evaluation-service schema (sih_eval database).
--
-- Re-based from the monolith's V11/V12 (evaluation enums + engine tables),
-- squashed into a single baseline and stripped of every cross-service foreign
-- key. The evaluation aggregate now lives in its own database:
--
--   * evaluation_cycle.problem_id              -> plain UUID (problem-service)
--   * evaluation_cycle.triggered_by_user_id    -> plain UUID (source-service users)
--   * evaluator_profile.user_id                -> plain UUID (source-service users)
--   * evaluator_profile.affiliated_source_id   -> plain UUID (source-service)
--   * evaluator_domain.domain_id               -> plain UUID (problem-service domain)
--   * evaluation_assignment.assigned_by_user_id -> plain UUID (source-service users)
--   * evaluation_disagreement.resolved_by_user_id -> plain UUID (source-service users)
--   * weight_config.updated_by_user_id          -> plain UUID (source-service users)
--   * evaluation_status_history.changed_by_user_id -> plain UUID (source-service users)
--
-- Intra-aggregate FKs (e.g. problem_analysis.cycle_id -> evaluation_cycle) stay.

-- ---------------------------------------------------------------------------
-- Enum types
-- ---------------------------------------------------------------------------

CREATE TYPE evaluator_type     AS ENUM ('GOVERNMENT','INDUSTRY','HEI','CITIZEN','COMMUNITY');
CREATE TYPE evaluation_status  AS ENUM ('RECEIVED','ANALYZING','ROUTING',
    'EVALUATION_IN_PROGRESS','EVALUATION_COMPLETED','SCORES_AGGREGATED',
    'PRIORITIZED','PHASE_3_READY','ANALYSIS_FAILED');
CREATE TYPE assignment_status  AS ENUM ('ASSIGNED','IN_PROGRESS','SUBMITTED',
    'DECLINED','EXPIRED','REVIEWED');
CREATE TYPE analysis_status    AS ENUM ('SUCCESS','FAILED','HEURISTIC_FALLBACK');
CREATE TYPE aggregation_status AS ENUM ('PENDING','AGGREGATED','REVIEW_REQUIRED');
CREATE TYPE disagreement_status AS ENUM ('OPEN','REVIEWED','RESOLVED','ESCALATED');
CREATE TYPE impact_level       AS ENUM ('HIGH','MEDIUM','LOW');
CREATE TYPE priority_band      AS ENUM ('P1','P2','P3','P4');
CREATE TYPE weighting_method   AS ENUM ('CONFIGURED','EQUAL');

-- Full AuditAction vocabulary (shared via edith-common), used by the
-- service-local generic audit_log.
CREATE TYPE audit_action AS ENUM (
    'CREATED','UPDATED','STATUS_CHANGED','EVIDENCE_ADDED',
    'SOURCE_VERIFICATION_INITIATED','SOURCE_VERIFIED','SOURCE_VERIFICATION_FAILED',
    'REJECTED','ARCHIVED','WITHDRAWN',
    'EVALUATION_STARTED','EVALUATION_ANALYZED','EVALUATION_ROUTED','EVALUATION_ASSIGNED',
    'EVALUATION_SUBMITTED','EVALUATION_AGGREGATED','EVALUATION_PRIORITIZED',
    'EVALUATION_COMPLETED','EVALUATION_DISAGREEMENT_FLAGGED',
    'EVALUATION_DISAGREEMENT_RESOLVED','EVALUATION_WEIGHT_UPDATED');

-- ---------------------------------------------------------------------------
-- evaluator_profile — 1:1 with a users row whose role = 'EVALUATOR' (users
-- table lives in source-service; user_id is a plain UUID here).
-- ---------------------------------------------------------------------------

CREATE TABLE evaluator_profile (
    profile_id            UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id               UUID            NOT NULL UNIQUE,
    evaluator_type        evaluator_type  NOT NULL,
    full_name             VARCHAR(150)    NOT NULL,
    organization          VARCHAR(255),
    designation           VARCHAR(150),
    experience_years      INT             NOT NULL DEFAULT 0,
    region_states         JSONB           NOT NULL DEFAULT '[]',
    affiliated_source_id  UUID,
    max_workload          INT             NOT NULL DEFAULT 5 CHECK (max_workload > 0),
    is_active             BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at            TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ     NOT NULL DEFAULT now(),
    version               INT             NOT NULL DEFAULT 1
);
CREATE INDEX idx_eval_profile_type_active ON evaluator_profile (evaluator_type, is_active);
CREATE INDEX idx_eval_profile_affiliation ON evaluator_profile (affiliated_source_id);

-- ---------------------------------------------------------------------------
-- evaluator_domain — domain match filter. domain_id is a plain UUID
-- (domain taxonomy lives in problem-service).
-- ---------------------------------------------------------------------------

CREATE TABLE evaluator_domain (
    profile_id UUID NOT NULL REFERENCES evaluator_profile (profile_id) ON DELETE CASCADE,
    domain_id  UUID NOT NULL,
    PRIMARY KEY (profile_id, domain_id)
);
CREATE INDEX idx_eval_domain_domain ON evaluator_domain (domain_id);

-- ---------------------------------------------------------------------------
-- evaluation_cycle — Phase 2 aggregate root, 1 per problem (problem_id plain)
-- ---------------------------------------------------------------------------

CREATE TABLE evaluation_cycle (
    cycle_id             UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
    problem_id           UUID              NOT NULL UNIQUE,
    status               evaluation_status NOT NULL DEFAULT 'RECEIVED',
    trigger_method       VARCHAR(20)       NOT NULL DEFAULT 'ADMIN',
    triggered_by_user_id UUID,
    started_at           TIMESTAMPTZ       NOT NULL DEFAULT now(),
    completed_at         TIMESTAMPTZ,
    final_score          NUMERIC(5,2),
    impact_level         impact_level,
    priority_score       NUMERIC(5,2),
    priority_band        priority_band,
    metadata             JSONB,
    created_at           TIMESTAMPTZ       NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ       NOT NULL DEFAULT now(),
    version              INT               NOT NULL DEFAULT 1
);
CREATE INDEX idx_eval_cycle_status   ON evaluation_cycle (status);
CREATE INDEX idx_eval_cycle_priority ON evaluation_cycle (priority_band, priority_score DESC);

-- ---------------------------------------------------------------------------
-- problem_analysis — AI output (parsed columns + raw LLM payload)
-- ---------------------------------------------------------------------------

CREATE TABLE problem_analysis (
    analysis_id          UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_id             UUID             NOT NULL UNIQUE REFERENCES evaluation_cycle (cycle_id) ON DELETE CASCADE,
    provider             VARCHAR(50)      NOT NULL,
    model                VARCHAR(100),
    problem_category     VARCHAR(100),
    domain               VARCHAR(100),
    sector               VARCHAR(100),
    impact_areas         JSONB            NOT NULL DEFAULT '[]',
    complexity           VARCHAR(50),
    potential_scale      VARCHAR(50),
    technology_relevance VARCHAR(50),
    social_impact        VARCHAR(50),
    status               analysis_status  NOT NULL DEFAULT 'SUCCESS',
    error_message        TEXT,
    latency_ms           BIGINT,
    model_version        VARCHAR(100),
    raw_payload          JSONB            NOT NULL DEFAULT '{}',
    analyzed_at          TIMESTAMPTZ      NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- evaluation_criterion — fixed catalog per evaluator type (seeded in V2)
-- ---------------------------------------------------------------------------

CREATE TABLE evaluation_criterion (
    criterion_id    UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluator_type  evaluator_type NOT NULL,
    criterion_key   VARCHAR(50)    NOT NULL,
    criterion_label VARCHAR(255)   NOT NULL,
    description     TEXT,
    max_score       INT            NOT NULL DEFAULT 10 CHECK (max_score IN (5, 10)),
    sort_order      INT            NOT NULL DEFAULT 0,
    is_active       BOOLEAN        NOT NULL DEFAULT TRUE,
    UNIQUE (evaluator_type, criterion_key)
);

-- ---------------------------------------------------------------------------
-- evaluation_assignment — one row per selected evaluator
-- ---------------------------------------------------------------------------

CREATE TABLE evaluation_assignment (
    assignment_id           UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_id                UUID              NOT NULL REFERENCES evaluation_cycle (cycle_id) ON DELETE CASCADE,
    evaluator_profile_id    UUID              NOT NULL REFERENCES evaluator_profile (profile_id),
    assigned_by_user_id     UUID,
    status                  assignment_status NOT NULL DEFAULT 'ASSIGNED',
    assigned_at             TIMESTAMPTZ       NOT NULL DEFAULT now(),
    deadline                TIMESTAMPTZ       NOT NULL,
    submitted_at            TIMESTAMPTZ,
    conflict_recheck        BOOLEAN           NOT NULL DEFAULT FALSE,
    eligibility_rechecked_at TIMESTAMPTZ,
    feedback                TEXT,
    recommendation          VARCHAR(255),
    updated_at              TIMESTAMPTZ       NOT NULL DEFAULT now(),
    version                 INT               NOT NULL DEFAULT 1,
    UNIQUE (cycle_id, evaluator_profile_id)
);
CREATE INDEX idx_eval_assignment_profile_status ON evaluation_assignment (evaluator_profile_id, status);
CREATE INDEX idx_eval_assignment_cycle_status   ON evaluation_assignment (cycle_id, status);
CREATE INDEX idx_eval_assignment_deadline       ON evaluation_assignment (status, deadline);

-- ---------------------------------------------------------------------------
-- evaluation_response — normalized per-criterion scores
-- ---------------------------------------------------------------------------

CREATE TABLE evaluation_response (
    assignment_id UUID     NOT NULL REFERENCES evaluation_assignment (assignment_id) ON DELETE CASCADE,
    criterion_id  UUID     NOT NULL REFERENCES evaluation_criterion (criterion_id),
    score         SMALLINT NOT NULL CHECK (score BETWEEN 1 AND 10),
    comment       TEXT,
    PRIMARY KEY (assignment_id, criterion_id)
);
CREATE INDEX idx_eval_response_criterion ON evaluation_response (criterion_id);

-- ---------------------------------------------------------------------------
-- evaluation_aggregation — final result per cycle (1:1)
-- ---------------------------------------------------------------------------

CREATE TABLE evaluation_aggregation (
    aggregation_id       UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_id             UUID                NOT NULL UNIQUE REFERENCES evaluation_cycle (cycle_id) ON DELETE CASCADE,
    status               aggregation_status  NOT NULL DEFAULT 'PENDING',
    overall_score        NUMERIC(5,2),
    per_type_scores      JSONB               NOT NULL DEFAULT '{}',
    weighting_method     weighting_method    NOT NULL DEFAULT 'CONFIGURED',
    num_assignments      INT                 NOT NULL DEFAULT 0,
    disagreement_flag    BOOLEAN             NOT NULL DEFAULT FALSE,
    disagreement_details JSONB,
    aggregated_at        TIMESTAMPTZ,
    updated_at           TIMESTAMPTZ         NOT NULL DEFAULT now(),
    version              INT                 NOT NULL DEFAULT 1
);

-- ---------------------------------------------------------------------------
-- evaluation_disagreement — divergence flag + resolution trail
-- ---------------------------------------------------------------------------

CREATE TABLE evaluation_disagreement (
    disagreement_id      UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_id             UUID                NOT NULL REFERENCES evaluation_cycle (cycle_id) ON DELETE CASCADE,
    assignment_id        UUID                REFERENCES evaluation_assignment (assignment_id) ON DELETE CASCADE,
    evaluator_profile_id UUID                REFERENCES evaluator_profile (profile_id),
    deviation_score      NUMERIC(6,2)        NOT NULL,
    threshold            NUMERIC(6,2)        NOT NULL,
    status               disagreement_status NOT NULL DEFAULT 'OPEN',
    action_taken         VARCHAR(50),
    comment              TEXT,
    resolved_by_user_id  UUID,
    resolved_at          TIMESTAMPTZ,
    created_at           TIMESTAMPTZ         NOT NULL DEFAULT now()
);
CREATE INDEX idx_eval_disagreement_cycle ON evaluation_disagreement (cycle_id, status);

-- ---------------------------------------------------------------------------
-- weight_config — configurable per-type weights (admin-editable)
-- ---------------------------------------------------------------------------

CREATE TABLE weight_config (
    weight_id          UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluator_type     evaluator_type NOT NULL UNIQUE,
    weight             NUMERIC(4,3)   NOT NULL CHECK (weight >= 0 AND weight <= 1),
    is_default         BOOLEAN        NOT NULL DEFAULT TRUE,
    updated_by_user_id UUID,
    updated_at         TIMESTAMPTZ    NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- evaluation_status_history — append-only lifecycle trail
-- ---------------------------------------------------------------------------

CREATE TABLE evaluation_status_history (
    history_id         UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_id           UUID              NOT NULL REFERENCES evaluation_cycle (cycle_id) ON DELETE CASCADE,
    from_status        evaluation_status,
    to_status          evaluation_status NOT NULL,
    changed_by_user_id UUID,
    comment            TEXT,
    changed_at         TIMESTAMPTZ       NOT NULL DEFAULT now()
);
CREATE INDEX idx_eval_status_history_cycle ON evaluation_status_history (cycle_id, changed_at);

-- ---------------------------------------------------------------------------
-- audit_log — service-local generic audit trail (entity_type + entity_id).
-- ---------------------------------------------------------------------------

CREATE TABLE audit_log (
    audit_id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type          VARCHAR(50)   NOT NULL,
    entity_id            UUID          NOT NULL,
    action_type          audit_action  NOT NULL,
    performed_by_user_id UUID,
    performed_at         TIMESTAMPTZ   NOT NULL DEFAULT now(),
    before_state         JSONB,
    after_state          JSONB,
    ip_address           VARCHAR(64)
);
CREATE INDEX idx_audit_log_entity ON audit_log (entity_type, entity_id, performed_at);
