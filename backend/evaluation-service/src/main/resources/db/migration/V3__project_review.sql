-- V3: project review (portal project submissions reviewed by the SAME evaluator
-- who scored the problem's cycle).
--
-- Adds the new audit vocabulary for publishing + project review to the existing
-- service-local audit_action enum. Each ADD VALUE runs in its own implicit
-- transaction inside Flyway; no row using the new labels is written in this
-- migration, so the "new enum value cannot be used until committed" PG rule is
-- never triggered.
--
-- project_review.submission_id is the PORTAL submission id (plain UUID, no FK —
-- the portal owns submissions in sih_portal). cycle_id / evaluator_profile_id
-- reference rows this service owns, so those FKs stay intra-service.

ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'PROBLEM_PUBLISHED';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'PROJECT_REVIEW_ASSIGNED';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'PROJECT_REVIEW_DECIDED';

CREATE TYPE project_review_status AS ENUM ('ASSIGNED', 'ACCEPTED', 'RETURNED');

CREATE TABLE project_review (
    project_review_id     UUID                 PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id         UUID                 NOT NULL,
    round                 INT                  NOT NULL DEFAULT 1,
    problem_id            UUID                 NOT NULL,
    cycle_id              UUID                 NOT NULL REFERENCES evaluation_cycle (cycle_id) ON DELETE CASCADE,
    evaluator_profile_id  UUID                 NOT NULL REFERENCES evaluator_profile (profile_id),
    reviewer_user_id      UUID                 NOT NULL,
    problem_title         VARCHAR(500)         NOT NULL,
    submission_title      VARCHAR(255),
    summary               TEXT,
    github_url            VARCHAR(500),
    links                 JSONB                NOT NULL DEFAULT '[]',
    files                 JSONB                NOT NULL DEFAULT '[]',
    status                project_review_status NOT NULL DEFAULT 'ASSIGNED',
    decision_comment      TEXT,
    created_at            TIMESTAMPTZ          NOT NULL DEFAULT now(),
    decided_at            TIMESTAMPTZ,
    version               INT                  NOT NULL DEFAULT 1,
    UNIQUE (submission_id, round)
);
CREATE INDEX idx_project_review_profile_status ON project_review (evaluator_profile_id, status);
CREATE INDEX idx_project_review_submission ON project_review (submission_id);
