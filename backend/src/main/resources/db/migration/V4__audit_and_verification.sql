-- V4: AuditLog + SourceVerification.
-- Refs: 05-data-dictionary-common.md (sec 7-8), 11-api-and-indexes.md (sec 2).

-- ---------------------------------------------------------------------------
-- audit_log (immutable action trail)
-- ---------------------------------------------------------------------------

CREATE TABLE audit_log (
    log_id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    problem_id          UUID         REFERENCES problem (problem_id) ON DELETE CASCADE,
    action_type         audit_action NOT NULL,
    performed_by_user_id UUID        REFERENCES users (user_id),
    performed_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    before_state        JSONB,
    after_state         JSONB,
    ip_address          VARCHAR(45)
);

CREATE INDEX idx_audit_problem ON audit_log (problem_id, performed_at);
CREATE INDEX idx_audit_user ON audit_log (performed_by_user_id);

-- ---------------------------------------------------------------------------
-- source_verification (identity check only; never evaluates the problem)
-- ---------------------------------------------------------------------------

CREATE TABLE source_verification (
    verification_id     UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id           UUID                NOT NULL REFERENCES problem_source (source_id),
    verification_method verification_method  NOT NULL,
    verified_by_user_id UUID                REFERENCES users (user_id),
    result              verification_result  NOT NULL,
    notes               TEXT,
    verified_at         TIMESTAMPTZ         NOT NULL DEFAULT now(),
    evidence_url        VARCHAR(500)
);

CREATE INDEX idx_source_verification_source ON source_verification (source_id);
CREATE INDEX idx_source_verification_result ON source_verification (result);