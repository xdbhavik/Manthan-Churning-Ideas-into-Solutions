-- V3: problem access rule (who may access / work on a problem statement).
--
-- Adds the participation-scope column plus, for SELECTED_UNIVERSITIES, the
-- explicit list of allowed universities. Universities are stored as a
-- self-contained name snapshot (JSONB): problem-service does not own a
-- university registry, so it never resolves names cross-service on the read
-- path — the submitter names them at problem creation and the evaluator sees
-- that snapshot verbatim.

CREATE TYPE problem_access_rule AS ENUM ('OPEN_TO_ALL', 'UNIVERSITY_ONLY', 'SELECTED_UNIVERSITIES');

ALTER TABLE problem
    ADD COLUMN access_rule         problem_access_rule NOT NULL DEFAULT 'OPEN_TO_ALL',
    ADD COLUMN access_universities JSONB               NOT NULL DEFAULT '[]';
