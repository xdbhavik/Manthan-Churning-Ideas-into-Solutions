-- V3: problem-statement snapshot on project_submission (sih_codejudge database).
--
-- CodeJudge judges a repository against the problem it claims to solve. Until now
-- the only statement data it held was the caller-supplied problem_title, so the
-- code was effectively measured in isolation. These columns carry the
-- problem-service context snapshot taken at intake, letting a report always state
-- what the submission was measured against — even if problem-service is later
-- unreachable, or the statement is edited after the fact.
--
-- Every column is nullable (problem_domains defaults to an empty array) because
-- the snapshot is an ENRICHMENT, not a precondition: intake must still succeed
-- when problem-service is down. See ProblemContextGateway.
--
-- Additive only — V1/V2 are applied and never edited.

ALTER TABLE project_submission
    ADD COLUMN problem_description      TEXT,
    ADD COLUMN problem_expected_outcome TEXT,
    ADD COLUMN problem_domains          JSONB       NOT NULL DEFAULT '[]',
    ADD COLUMN problem_status           VARCHAR(40);
