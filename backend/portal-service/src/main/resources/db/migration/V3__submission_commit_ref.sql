-- V3: pin a submission to an exact repository commit (sih_portal database).
--
-- A portal submission previously carried an unpinned github_url only, which is not
-- enough to judge it: a moving branch HEAD would silently change what was scored.
-- These two columns let a student pin the commit they want evaluated, and are the
-- payload codejudge-service requires at intake (commitSha is mandatory there; see
-- EvaluationCreateRequest).
--
-- Both are NULLABLE on purpose:
--   * a DRAFT is authored incrementally and only needs a commit at submit time;
--   * file-only submissions (no github_url) are still valid and are simply never
--     handed to codejudge.
-- The submit-time gate lives in SubmissionService, not in the schema.
--
-- Additive only — V1/V2 are applied and never edited.

ALTER TABLE submission
    ADD COLUMN commit_sha VARCHAR(64),
    ADD COLUMN branch     VARCHAR(120);
