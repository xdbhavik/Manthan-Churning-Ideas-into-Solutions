-- V8: Source registration workflow (Phase 1).
-- source_registration owns the DRAFT -> SUBMITTED -> UNDER_REVIEW ->
-- APPROVED / REJECTED / ACTION_REQUIRED lifecycle. The concrete problem_source
-- row is materialized from source_payload only on APPROVAL, so drafts and
-- resubmissions never pollute the source tables.

CREATE TYPE registration_status AS ENUM (
    'DRAFT', 'SUBMITTED', 'UNDER_REVIEW',
    'APPROVED', 'REJECTED', 'ACTION_REQUIRED'
);

-- ---------------------------------------------------------------------------
-- source_registration (workflow aggregate)
-- ---------------------------------------------------------------------------

CREATE TABLE source_registration (
    registration_id         UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
    source_bucket           source_bucket       NOT NULL,
    source_type             sub_entity_type     NOT NULL,
    status                  registration_status NOT NULL DEFAULT 'DRAFT',
    source_payload          JSONB               NOT NULL DEFAULT '{}'::jsonb,
    submitted_by_user_id    UUID                NOT NULL REFERENCES users (user_id),
    source_id               UUID                REFERENCES problem_source (source_id),
    assigned_reviewer_id    UUID                REFERENCES users (user_id),
    rejection_reason        TEXT,
    action_required_comment TEXT,
    submitted_at            TIMESTAMPTZ,
    reviewed_at             TIMESTAMPTZ,
    created_at              TIMESTAMPTZ         NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ         NOT NULL DEFAULT now(),
    version                 INT                 NOT NULL DEFAULT 1
);

CREATE INDEX idx_source_registration_status ON source_registration (status);
CREATE INDEX idx_source_registration_submitter ON source_registration (submitted_by_user_id);
CREATE INDEX idx_source_registration_reviewer ON source_registration (assigned_reviewer_id);

-- ---------------------------------------------------------------------------
-- registration_status_history (immutable decision trail; every transition)
-- ---------------------------------------------------------------------------

CREATE TABLE registration_status_history (
    history_id          UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_id     UUID                NOT NULL REFERENCES source_registration (registration_id) ON DELETE CASCADE,
    from_status         registration_status,
    to_status           registration_status NOT NULL,
    changed_by_user_id  UUID                REFERENCES users (user_id),
    comment             TEXT,
    changed_at          TIMESTAMPTZ         NOT NULL DEFAULT now()
);

CREATE INDEX idx_reg_history_registration ON registration_status_history (registration_id, changed_at);
