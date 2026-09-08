-- V1: portal-service schema (sih_portal database).
--
-- The public portal is a leaf in the microservices graph: it owns participant
-- profiles, the published problem catalog, teams, submissions and submission
-- files, and holds NO cross-service foreign keys —
--
--   * participant.user_id            -> plain UUID (source-service users)
--   * participant.source_account_id  -> plain UUID (source-service source_account)
--   * published_problem.problem_id   -> plain UUID (problem-service problem); the
--     PRIMARY KEY is the upstream problem id so publish is a natural UPSERT
--   * published_problem.cycle_id     -> plain UUID (evaluation-service cycle)
--   * submission.reviewer_user_id    -> plain UUID (source-service users / eval)
--   * submission_file.uploaded_by    -> plain UUID (source-service users)
--
-- Intra-aggregate FKs stay: team_member -> team/participant, submission ->
-- published_problem/participant, submission_file -> submission.
--
-- Enum values mirror edith-common enums (SourceBucket, SubEntityType, Urgency,
-- Severity, ProblemAccessRule) plus the portal-local participant_type and
-- submission_status. access_rule is also materialised as a native enum so the
-- SELECTED_UNIVERSITIES name snapshot can be filtered in SQL.

-- ---------------------------------------------------------------------------
-- Enum types
-- ---------------------------------------------------------------------------

CREATE TYPE participant_type AS ENUM ('STUDENT', 'UNIVERSITY');

CREATE TYPE submission_status AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED', 'RETURNED');

CREATE TYPE source_bucket AS ENUM ('GOVT', 'CITIZEN', 'INDUSTRY', 'COMMUNITY', 'HEI');

CREATE TYPE sub_entity_type AS ENUM (
    'DEPARTMENT', 'PRI', 'ULB',
    'INDIVIDUAL', 'RWA',
    'COMPANY', 'STARTUP', 'MSME', 'CSR',
    'NGO', 'SHG', 'CBO_COOP',
    'UNIVERSITY', 'RESEARCH_LAB'
);

CREATE TYPE urgency AS ENUM ('IMMEDIATE', 'SHORT_TERM', 'LONG_TERM');

CREATE TYPE severity AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

CREATE TYPE access_rule AS ENUM ('OPEN_TO_ALL', 'UNIVERSITY_ONLY', 'SELECTED_UNIVERSITIES');

-- ---------------------------------------------------------------------------
-- participant — portal profile bound 1:1 to a source-service user id. A
-- UNIVERSITY participant is auto-created on first contact when the caller owns an
-- ACTIVE+VERIFIED HEI source account (no second registration); a STUDENT must
-- POST /portal/participants to register.
-- ---------------------------------------------------------------------------

CREATE TABLE participant (
    participant_id     UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            UUID             NOT NULL UNIQUE,
    participant_type   participant_type NOT NULL,
    full_name          VARCHAR(150)     NOT NULL,
    email              VARCHAR(255),
    phone              VARCHAR(20),
    -- UNIVERSITY only: HEI institution snapshot, used for SELECTED_UNIVERSITIES
    -- matching. Null for STUDENT participants.
    institution_name   VARCHAR(255),
    -- UNIVERSITY only: the source account that auto-bound this participant. Null
    -- for STUDENT participants.
    source_account_id  UUID,
    created_at         TIMESTAMPTZ      NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ      NOT NULL DEFAULT now(),
    version            INT              NOT NULL DEFAULT 1
);

CREATE INDEX idx_participant_type ON participant (participant_type);

-- ---------------------------------------------------------------------------
-- published_problem — one row per evaluated problem, pushed by evaluation-service
-- at EVALUATION_COMPLETED. problem_id is the upstream problem-service UUID and is
-- the natural key: publish is an idempotent UPSERT on it.
-- ---------------------------------------------------------------------------

CREATE TABLE published_problem (
    problem_id          UUID            PRIMARY KEY,
    cycle_id            UUID            NOT NULL,
    title               VARCHAR(255)    NOT NULL,
    description         TEXT            NOT NULL,
    expected_outcome    TEXT,
    source_bucket       source_bucket   NOT NULL,
    sub_entity_type     sub_entity_type NOT NULL,
    urgency             urgency         NOT NULL,
    severity            severity,
    location            VARCHAR(500),
    domains             JSONB           NOT NULL DEFAULT '[]',
    evidence_count      INT             NOT NULL DEFAULT 0,
    access_rule         access_rule     NOT NULL DEFAULT 'OPEN_TO_ALL',
    -- University-name snapshot honoured when access_rule = SELECTED_UNIVERSITIES.
    access_universities JSONB           NOT NULL DEFAULT '[]',
    published_at        TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    version             INT             NOT NULL DEFAULT 1
);

CREATE INDEX idx_published_problem_rule ON published_problem (access_rule);
CREATE INDEX idx_published_problem_published ON published_problem (published_at DESC);

-- ---------------------------------------------------------------------------
-- team — a group of participants solving one published problem (students may
-- solve individually with no team row; universities always lead their own).
-- ---------------------------------------------------------------------------

CREATE TABLE team (
    team_id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    problem_id               UUID         NOT NULL REFERENCES published_problem (problem_id) ON DELETE CASCADE,
    name                     VARCHAR(150) NOT NULL,
    created_by_participant_id UUID        NOT NULL REFERENCES participant (participant_id),
    created_at               TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_team_problem ON team (problem_id);

CREATE TABLE team_member (
    team_id        UUID         NOT NULL REFERENCES team (team_id) ON DELETE CASCADE,
    participant_id UUID         NOT NULL REFERENCES participant (participant_id),
    role           VARCHAR(20)  NOT NULL DEFAULT 'MEMBER',
    PRIMARY KEY (team_id, participant_id)
);

CREATE INDEX idx_team_member_participant ON team_member (participant_id);

-- ---------------------------------------------------------------------------
-- submission — a solution attempt against a published problem. team_id is NULL
-- for an individual submission. review_round increments on every submit/resubmit
-- so a RETURNED draft can come back as a fresh round for the same evaluator.
-- ---------------------------------------------------------------------------

CREATE TABLE submission (
    submission_id            UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
    problem_id               UUID              NOT NULL REFERENCES published_problem (problem_id),
    team_id                  UUID              REFERENCES team (team_id),
    submitter_participant_id UUID              NOT NULL REFERENCES participant (participant_id),
    title                    VARCHAR(255),
    summary                  TEXT,
    github_url               VARCHAR(500),
    links                    JSONB             NOT NULL DEFAULT '[]',
    status                   submission_status NOT NULL DEFAULT 'DRAFT',
    review_round             INT               NOT NULL DEFAULT 0,
    -- The evaluation-service reviewer (a source-service user id) assigned to the
    -- current round — the evaluator who scored the problem's cycle.
    reviewer_user_id         UUID,
    decision_comment         TEXT,
    submitted_at             TIMESTAMPTZ,
    decided_at               TIMESTAMPTZ,
    created_at               TIMESTAMPTZ       NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ       NOT NULL DEFAULT now(),
    version                  INT               NOT NULL DEFAULT 1
);

CREATE INDEX idx_submission_problem_status ON submission (problem_id, status);
CREATE INDEX idx_submission_submitter ON submission (submitter_participant_id);
CREATE INDEX idx_submission_reviewer ON submission (reviewer_user_id, status);

-- ---------------------------------------------------------------------------
-- submission_file — immutable metadata for one uploaded artifact. The bytes live
-- under the portal-files volume (app.portal.storage-dir); sha256 enables content
-- dedupe and integrity checks. Files are only editable while the submission is
-- DRAFT or RETURNED.
-- ---------------------------------------------------------------------------

CREATE TABLE submission_file (
    file_id        UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id  UUID           NOT NULL REFERENCES submission (submission_id) ON DELETE CASCADE,
    original_name  VARCHAR(255)   NOT NULL,
    content_type   VARCHAR(100),
    size_bytes     BIGINT         NOT NULL,
    storage_path   VARCHAR(500)   NOT NULL,
    sha256         VARCHAR(64)    NOT NULL,
    uploaded_by    UUID,
    uploaded_at    TIMESTAMPTZ    NOT NULL DEFAULT now()
);

CREATE INDEX idx_submission_file_submission ON submission_file (submission_id);
