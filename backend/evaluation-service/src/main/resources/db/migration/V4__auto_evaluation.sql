-- V4: automated (AI) evaluation with a per-pool MANUAL/AUTO switch.
--
-- Three additions:
--   1. evaluator_pool_mode — one independent MANUAL/AUTO switch per evaluator
--      pool, seeded MANUAL so the default behaviour is exactly V3's (a human
--      scores every pool) until somebody flips a switch.
--   2. evaluator_profile.is_system — the five seeded system AI profiles that own
--      the scorecard of an AUTO pool. evaluator_assignment.evaluator_profile_id
--      is NOT NULL and evaluator_profile.user_id is NOT NULL UNIQUE, so the AI
--      must be a real profile row with a synthetic user_id.
--   3. evaluation_response.score_source — HUMAN | AI, so an AI scorecard is
--      honestly distinguishable at row level (the precedent is
--      problem_analysis.provider/model).
--
-- The new audit vocabulary is added first, each ADD VALUE in its own implicit
-- transaction (Flyway), and NO row using the new labels is written in this
-- migration — so PG's "a new enum value cannot be used until committed" rule is
-- never triggered. Same pattern as V3; V1–V3 are never edited (checksums).

ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'EVALUATION_AI_SCORED';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'EVALUATION_AI_UNAVAILABLE';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'EVALUATION_MODE_CHANGED';

CREATE TYPE evaluation_mode AS ENUM ('MANUAL', 'AUTO');
CREATE TYPE score_source    AS ENUM ('HUMAN', 'AI');

-- ---------------------------------------------------------------------------
-- evaluator_pool_mode — the per-pool switch. PK on evaluator_type is what makes
-- the switches independent: five rows, five pools, no global flag.
-- ---------------------------------------------------------------------------

CREATE TABLE evaluator_pool_mode (
    evaluator_type     evaluator_type  PRIMARY KEY,
    mode               evaluation_mode NOT NULL DEFAULT 'MANUAL',
    updated_by_user_id UUID,
    updated_at         TIMESTAMPTZ     NOT NULL DEFAULT now(),
    version            INT             NOT NULL DEFAULT 1
);

INSERT INTO evaluator_pool_mode (evaluator_type, mode) VALUES
    ('GOVERNMENT', 'MANUAL'),
    ('INDUSTRY',   'MANUAL'),
    ('HEI',        'MANUAL'),
    ('CITIZEN',    'MANUAL'),
    ('COMMUNITY',  'MANUAL');

-- ---------------------------------------------------------------------------
-- evaluator_profile.is_system — marks the AI profiles so routing never hands a
-- MANUAL pool to the machine and a project review never lands on a user id
-- nobody can log in as.
-- ---------------------------------------------------------------------------

ALTER TABLE evaluator_profile ADD COLUMN is_system BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX idx_eval_profile_system ON evaluator_profile (is_system);

-- The five system AI evaluators, one per pool.
--
-- Deterministic ids (never gen_random_uuid) so the seed is reproducible and a
-- source-service user — always a random v4 UUID — can never collide with them:
--   profile_id = a1e00000-0000-4000-8000-00000000000N
--   user_id    = a1e00000-0000-4000-a000-00000000000N   (N = 1..5)
-- max_workload is effectively unlimited: the AI has no queue, and an AUTO pool
-- must never be starved by a workload limit.
INSERT INTO evaluator_profile
    (profile_id, user_id, evaluator_type, full_name, organization, designation,
     experience_years, region_states, max_workload, is_active, is_system)
VALUES
    ('a1e00000-0000-4000-8000-000000000001', 'a1e00000-0000-4000-a000-000000000001',
     'GOVERNMENT', 'AI Evaluator — Government', 'SIH26043', 'Automated evaluator',
     0, '[]', 100000, TRUE, TRUE),
    ('a1e00000-0000-4000-8000-000000000002', 'a1e00000-0000-4000-a000-000000000002',
     'INDUSTRY',   'AI Evaluator — Industry',   'SIH26043', 'Automated evaluator',
     0, '[]', 100000, TRUE, TRUE),
    ('a1e00000-0000-4000-8000-000000000003', 'a1e00000-0000-4000-a000-000000000003',
     'HEI',        'AI Evaluator — HEI',        'SIH26043', 'Automated evaluator',
     0, '[]', 100000, TRUE, TRUE),
    ('a1e00000-0000-4000-8000-000000000004', 'a1e00000-0000-4000-a000-000000000004',
     'CITIZEN',    'AI Evaluator — Citizen',    'SIH26043', 'Automated evaluator',
     0, '[]', 100000, TRUE, TRUE),
    ('a1e00000-0000-4000-8000-000000000005', 'a1e00000-0000-4000-a000-000000000005',
     'COMMUNITY',  'AI Evaluator — Community',  'SIH26043', 'Automated evaluator',
     0, '[]', 100000, TRUE, TRUE);

-- ---------------------------------------------------------------------------
-- evaluation_response.score_source — provenance of a single score row.
-- ---------------------------------------------------------------------------

ALTER TABLE evaluation_response
    ADD COLUMN score_source score_source NOT NULL DEFAULT 'HUMAN';
