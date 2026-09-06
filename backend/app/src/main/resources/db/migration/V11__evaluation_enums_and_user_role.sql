-- V11: Phase 2 evaluation enums + EVALUATOR role.
--
-- PostgreSQL 12+ allows ALTER TYPE ... ADD VALUE inside a transaction block,
-- but the new value CANNOT be used until the committing transaction commits
-- ("unsafe use of new value ... of enum type"). Flyway wraps each migration in
-- one transaction, so V11 contains ONLY the ADD VALUE / CREATE TYPE statements.
-- Nothing here uses the new values; V12/V13 (separate committed migrations) may.
--
-- Brand-new enum types (CREATE TYPE) are usable in the same migration, so V12
-- can reference them.

-- (a) EVALUATOR role + Phase 2 audit actions. Each ADD VALUE is its own
-- statement; nothing in this migration uses these values.
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'EVALUATOR';

-- ALTER TYPE accepts exactly ONE ADD VALUE per statement; a comma-separated
-- list is a syntax error.
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'EVALUATION_STARTED';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'EVALUATION_ANALYZED';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'EVALUATION_ROUTED';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'EVALUATION_ASSIGNED';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'EVALUATION_SUBMITTED';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'EVALUATION_AGGREGATED';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'EVALUATION_PRIORITIZED';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'EVALUATION_COMPLETED';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'EVALUATION_DISAGREEMENT_FLAGGED';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'EVALUATION_DISAGREEMENT_RESOLVED';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'EVALUATION_WEIGHT_UPDATED';

-- (b) Brand-new enum types (safe to create AND use in later migrations).
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
