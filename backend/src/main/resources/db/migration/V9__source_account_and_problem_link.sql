-- V9: Source account spine + problem ownership link (Phase 1, Sprint 8).
-- source_account is the single ownership handle between an approved registration
-- and the problems submitted under it: 1 SOURCE : N PROBLEMS. A problem may only
-- be submitted through an ACTIVE + VERIFIED account owned by the caller, which
-- turns "is this submitter really a ULB?" into a foreign key instead of a
-- self-declared request field.

CREATE TYPE source_account_status AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED');
CREATE TYPE account_verification_status AS ENUM ('UNVERIFIED', 'VERIFIED', 'REVOKED');

-- ---------------------------------------------------------------------------
-- source_account (ownership spine)
-- ---------------------------------------------------------------------------

CREATE TABLE source_account (
    source_account_id   UUID                        PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id       UUID                        NOT NULL REFERENCES users (user_id),
    source_id           UUID                        NOT NULL UNIQUE REFERENCES problem_source (source_id),
    registration_id     UUID                        UNIQUE REFERENCES source_registration (registration_id),
    source_bucket       source_bucket               NOT NULL,
    source_type         sub_entity_type             NOT NULL,
    display_name        VARCHAR(255),
    status              source_account_status       NOT NULL DEFAULT 'PENDING',
    verification_status account_verification_status NOT NULL DEFAULT 'UNVERIFIED',
    activated_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ                 NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ                 NOT NULL DEFAULT now(),
    version             INT                         NOT NULL DEFAULT 1
);

CREATE INDEX idx_source_account_owner ON source_account (owner_user_id);
CREATE INDEX idx_source_account_status ON source_account (status, verification_status);

-- ---------------------------------------------------------------------------
-- problem.source_account_id -- nullable, because pre-V9 rows predate the spine
-- ---------------------------------------------------------------------------

ALTER TABLE problem
    ADD COLUMN source_account_id UUID REFERENCES source_account (source_account_id);

CREATE INDEX idx_problem_source_account ON problem (source_account_id);

-- ---------------------------------------------------------------------------
-- Backfill 1: every already-APPROVED registration gets its live account.
-- DISTINCT ON guards the UNIQUE (source_id) constraint.
-- ---------------------------------------------------------------------------

INSERT INTO source_account (owner_user_id, source_id, registration_id, source_bucket,
                            source_type, display_name, status, verification_status,
                            activated_at, created_at)
SELECT DISTINCT ON (r.source_id) r.submitted_by_user_id,
                                 r.source_id,
                                 r.registration_id,
                                 r.source_bucket,
                                 r.source_type,
                                 COALESCE(s.organization_name, s.contact_person_name),
                                 'ACTIVE',
                                 'VERIFIED',
                                 COALESCE(r.reviewed_at, now()),
                                 COALESCE(r.reviewed_at, now())
FROM source_registration r
         JOIN problem_source s ON s.source_id = r.source_id
WHERE r.status = 'APPROVED'
  AND r.source_id IS NOT NULL
ORDER BY r.source_id, r.reviewed_at;

-- ---------------------------------------------------------------------------
-- Backfill 2: pre-V9 problems each created their own inline source row. Give
-- every one an account so the FK can be populated, but leave it SUSPENDED /
-- UNVERIFIED -- no reviewer ever saw those sources and this migration must not
-- pretend otherwise. Anonymous submissions (no submitter) stay unlinked.
-- ---------------------------------------------------------------------------

INSERT INTO source_account (owner_user_id, source_id, source_bucket, source_type,
                            display_name, status, verification_status, created_at)
SELECT DISTINCT ON (p.source_id) p.submitted_by_user_id,
                                 p.source_id,
                                 p.source_bucket,
                                 p.sub_entity_type,
                                 COALESCE(s.organization_name, s.contact_person_name),
                                 'SUSPENDED',
                                 'UNVERIFIED',
                                 p.submitted_at
FROM problem p
         JOIN problem_source s ON s.source_id = p.source_id
WHERE p.submitted_by_user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM source_account a WHERE a.source_id = p.source_id)
ORDER BY p.source_id, p.submitted_at;

UPDATE problem p
SET source_account_id = a.source_account_id
FROM source_account a
WHERE a.source_id = p.source_id
  AND p.source_account_id IS NULL;
