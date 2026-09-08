-- V1: codejudge-service schema (sih_codejudge database).
--
-- CodeJudge is the automated repository-evaluation engine. It owns the pinned
-- submission + evaluation aggregate and holds NO cross-service foreign keys:
--
--   * project_submission.portal_submission_id -> plain UUID (portal submission)
--   * project_submission.problem_id           -> plain UUID (problem-service)
--   * project_submission.owner_user_id        -> plain UUID (source-service user)
--
-- Intra-aggregate FKs stay (evaluation -> project_submission, evidence rows ->
-- evaluation, evaluation_job -> evaluation). Every evaluation is a fresh run on a
-- pinned commit; evidence tables are keyed to evaluation_id so re-evaluations are
-- explicit and historical reports stay truthful.
--
-- Enum values mirror the codejudge enums. Scoring weights/maxima are SEED DATA in
-- V2 (evaluation_category) and live in the DB, never in code — changing a weight
-- is a config change + a new scoring version, not a redeploy.

-- ---------------------------------------------------------------------------
-- Enum types
-- ---------------------------------------------------------------------------

CREATE TYPE evaluation_status AS ENUM (
    'SUBMITTED', 'QUEUED', 'CLONING', 'SCANNING', 'BUILDING', 'RUNNING',
    'TESTING', 'SECURITY_SCANNING', 'ARCHITECTURE_ANALYSIS',
    'REQUIREMENT_MATCHING', 'AI_ANALYSIS', 'SCORING', 'REPORT_GENERATION',
    'COMPLETED', 'FAILED'
);

CREATE TYPE job_status AS ENUM ('QUEUED', 'CLAIMED', 'DONE', 'FAILED');

CREATE TYPE finding_severity AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

CREATE TYPE verdict AS ENUM ('EXCELLENT', 'GOOD', 'NEEDS_WORK', 'BLOCKED');

CREATE TYPE analysis_status AS ENUM ('SUCCESS', 'HEURISTIC_FALLBACK', 'FAILED', 'SKIPPED', 'UNAVAILABLE');

-- ---------------------------------------------------------------------------
-- project_submission — a submitted project repository pinned to a commit. The
-- row is created fast (inside the create request); the long-running evaluation
-- happens later via the DB job queue.
-- ---------------------------------------------------------------------------

CREATE TABLE project_submission (
    submission_id          UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    -- portal submission id (when the Innovation Portal hands off), else null.
    portal_submission_id   UUID,
    problem_id             UUID           NOT NULL,
    -- Problem-title snapshot for the report; enriched when problem-service is
    -- reachable, else a stable fallback so reports never render blank.
    problem_title          VARCHAR(255),
    team_id                UUID,
    owner_user_id          UUID           NOT NULL,
    repository_url         VARCHAR(500)   NOT NULL,
    branch                 VARCHAR(120),
    -- Mandatory: evaluation is pinned to this exact commit. A moving branch HEAD
    -- is rejected at intake.
    commit_sha             VARCHAR(64)    NOT NULL,
    demo_url               VARCHAR(500),
    documentation_url      VARCHAR(500),
    created_at             TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ    NOT NULL DEFAULT now(),
    version                INT            NOT NULL DEFAULT 1
);

CREATE INDEX idx_project_submission_problem ON project_submission (problem_id);
CREATE INDEX idx_project_submission_owner ON project_submission (owner_user_id);

-- ---------------------------------------------------------------------------
-- evaluation — the aggregate root: one row per evaluation run of a submission.
-- status walks the state machine; final_score + verdict are set by the scoring
-- stage. config_snapshot / tool_versions record what produced the result so a
-- historical report stays truthful after scoring-rule changes.
-- ---------------------------------------------------------------------------

CREATE TABLE evaluation (
    evaluation_id     UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id     UUID             NOT NULL REFERENCES project_submission (submission_id),
    status            evaluation_status NOT NULL DEFAULT 'QUEUED',
    scoring_version   VARCHAR(20),
    final_score       DOUBLE PRECISION,
    verdict           verdict,
    -- Snapshot of the applied evaluation_category/policy config (JSON), copied
    -- onto the row by the scoring stage.
    config_snapshot   JSONB            NOT NULL DEFAULT '{}',
    -- Tool + version evidence, e.g. {"agentic-legibility": "x.y.z"}.
    tool_versions     JSONB            NOT NULL DEFAULT '{}',
    started_at        TIMESTAMPTZ,
    completed_at      TIMESTAMPTZ,
    created_at        TIMESTAMPTZ      NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ      NOT NULL DEFAULT now(),
    version           INT              NOT NULL DEFAULT 1
);

CREATE INDEX idx_evaluation_submission ON evaluation (submission_id);
CREATE INDEX idx_evaluation_status ON evaluation (status, created_at DESC);

-- ---------------------------------------------------------------------------
-- evaluation_job — DB-backed queue row. One QUEUED job per evaluation; claimed
-- atomically by a worker (@Version optimistic lock). A stale CLAIMED row is
-- reclaimed after the clone/heartbeat timeout.
-- ---------------------------------------------------------------------------

CREATE TABLE evaluation_job (
    job_id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluation_id   UUID         NOT NULL UNIQUE REFERENCES evaluation (evaluation_id),
    status          job_status   NOT NULL DEFAULT 'QUEUED',
    priority        INT          NOT NULL DEFAULT 5,
    claim_owner     VARCHAR(120),
    claimed_at      TIMESTAMPTZ,
    attempts        INT          NOT NULL DEFAULT 0,
    last_error      TEXT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    version         INT          NOT NULL DEFAULT 1
);

CREATE INDEX idx_evaluation_job_queue ON evaluation_job (status, priority, created_at);

-- ---------------------------------------------------------------------------
-- evaluation_status_history — append-only lifecycle trail (from/to + actor).
-- ---------------------------------------------------------------------------

CREATE TABLE evaluation_status_history (
    history_id     UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluation_id  UUID              NOT NULL REFERENCES evaluation (evaluation_id) ON DELETE CASCADE,
    from_status    evaluation_status,
    to_status      evaluation_status NOT NULL,
    actor          VARCHAR(120)      NOT NULL DEFAULT 'MACHINE',
    note           VARCHAR(500),
    created_at     TIMESTAMPTZ       NOT NULL DEFAULT now()
);

CREATE INDEX idx_status_history_evaluation ON evaluation_status_history (evaluation_id, created_at);

-- ---------------------------------------------------------------------------
-- evaluation_category — SEEDED config (V2): the eight CodeJudge categories with
-- weight = max_score summing to 100. Changing a weight is a data change.
-- ---------------------------------------------------------------------------

CREATE TABLE evaluation_category (
    category_key  VARCHAR(40)   PRIMARY KEY,
    name          VARCHAR(120)  NOT NULL,
    description   VARCHAR(500),
    max_score     DOUBLE PRECISION NOT NULL,
    weight        DOUBLE PRECISION NOT NULL,
    sort_order    INT           NOT NULL DEFAULT 0,
    active        BOOLEAN       NOT NULL DEFAULT TRUE,
    updated_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- evaluation_policy — SEEDED config: severity -> penalty/block rules that the
-- deterministic scoring engine applies (never hard-coded in the scanners).
-- ---------------------------------------------------------------------------

CREATE TABLE evaluation_policy (
    rule_key     VARCHAR(60)       PRIMARY KEY,
    description  TEXT,
    severity     finding_severity,
    action       VARCHAR(20)       NOT NULL, -- PENALTY | BLOCK | NONE
    amount       DOUBLE PRECISION  NOT NULL DEFAULT 0,
    active       BOOLEAN           NOT NULL DEFAULT TRUE,
    updated_at   TIMESTAMPTZ       NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- evaluation_category_score — per-run category result. score/max reference the
-- underlying evidence (code_analysis, security_finding) so every mark is
-- auditable. status: EVALUATED | NOT_EVALUATED | BLOCKED.
-- ---------------------------------------------------------------------------

CREATE TABLE evaluation_category_score (
    category_score_id UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluation_id     UUID           NOT NULL REFERENCES evaluation (evaluation_id) ON DELETE CASCADE,
    category_key      VARCHAR(40)    NOT NULL REFERENCES evaluation_category (category_key),
    score             DOUBLE PRECISION NOT NULL DEFAULT 0,
    max_score         DOUBLE PRECISION NOT NULL,
    weight            DOUBLE PRECISION NOT NULL DEFAULT 0,
    status            VARCHAR(20)    NOT NULL DEFAULT 'EVALUATED',
    note              VARCHAR(500),
    created_at        TIMESTAMPTZ    NOT NULL DEFAULT now(),
    UNIQUE (evaluation_id, category_key)
);

CREATE INDEX idx_category_score_evaluation ON evaluation_category_score (evaluation_id);

-- ---------------------------------------------------------------------------
-- code_analysis — one evidence row per agentic-legibility category (bootstrap,
-- entry_points, documentation, architecture, testing, code_quality, security).
-- payload holds the raw analyzer signals (JSON); score/max are computed by the
-- deterministic signal rubric at scan time. tool records the analyzer version.
-- ---------------------------------------------------------------------------

CREATE TABLE code_analysis (
    analysis_id     UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluation_id   UUID             NOT NULL REFERENCES evaluation (evaluation_id) ON DELETE CASCADE,
    category_key    VARCHAR(40)      NOT NULL,
    score           DOUBLE PRECISION NOT NULL DEFAULT 0,
    max_score       DOUBLE PRECISION NOT NULL DEFAULT 0,
    payload         JSONB            NOT NULL DEFAULT '{}',
    tool            VARCHAR(80)      NOT NULL,
    tool_version    VARCHAR(40),
    status          analysis_status  NOT NULL DEFAULT 'SUCCESS',
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT now()
);

CREATE INDEX idx_code_analysis_evaluation ON code_analysis (evaluation_id);

-- ---------------------------------------------------------------------------
-- security_finding — secrets/SAST findings from the built-in scan (HIGH +
-- CRITICAL drive policy penalties/blocks).
-- ---------------------------------------------------------------------------

CREATE TABLE security_finding (
    finding_id     UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluation_id  UUID             NOT NULL REFERENCES evaluation (evaluation_id) ON DELETE CASCADE,
    severity       finding_severity NOT NULL,
    type           VARCHAR(60)      NOT NULL,
    file           VARCHAR(500),
    line           INT,
    message        TEXT             NOT NULL,
    created_at     TIMESTAMPTZ      NOT NULL DEFAULT now()
);

CREATE INDEX idx_security_finding_evaluation ON security_finding (evaluation_id, severity);

-- ---------------------------------------------------------------------------
-- evaluation_finding — human-readable findings used by the report (ordered by
-- severity, each with an evidence ref).
-- ---------------------------------------------------------------------------

CREATE TABLE evaluation_finding (
    finding_id    UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluation_id UUID             NOT NULL REFERENCES evaluation (evaluation_id) ON DELETE CASCADE,
    severity      finding_severity NOT NULL,
    category      VARCHAR(40)      NOT NULL,
    message       TEXT             NOT NULL,
    evidence_ref  VARCHAR(500),
    created_at    TIMESTAMPTZ      NOT NULL DEFAULT now()
);

CREATE INDEX idx_evaluation_finding_evaluation ON evaluation_finding (evaluation_id, severity);

-- ---------------------------------------------------------------------------
-- ai_evaluation — advisory AI output. In the default deployment the LLM key is
-- empty, so one UNAVAILABLE row is recorded and the pipeline continues on
-- deterministic evidence. Never a scoring authority.
-- ---------------------------------------------------------------------------

CREATE TABLE ai_evaluation (
    ai_evaluation_id UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluation_id    UUID          NOT NULL REFERENCES evaluation (evaluation_id) ON DELETE CASCADE,
    status           VARCHAR(20)   NOT NULL DEFAULT 'UNAVAILABLE', -- AVAILABLE | UNAVAILABLE | ERROR | SKIPPED
    model            VARCHAR(120),
    confidence       DOUBLE PRECISION,
    payload          JSONB         NOT NULL DEFAULT '{}',
    raw_payload      JSONB,
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- evaluation_report — rendered report + audit. report_json is the structured
-- form; report_markdown is the human-readable rendering the portal can display.
-- One row per evaluation (re-evaluations create a new evaluation row).
-- ---------------------------------------------------------------------------

CREATE TABLE evaluation_report (
    report_id       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluation_id   UUID         NOT NULL UNIQUE REFERENCES evaluation (evaluation_id) ON DELETE CASCADE,
    report_json     JSONB        NOT NULL,
    report_markdown TEXT         NOT NULL,
    generated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);
