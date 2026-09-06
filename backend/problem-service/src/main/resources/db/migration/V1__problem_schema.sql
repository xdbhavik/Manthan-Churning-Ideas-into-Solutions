-- V1: Step 4 problem-service schema (sih_problem database).
--
-- Re-based from the monolith's V1/V3/V4/V9 problem-bearing pieces, squashed
-- into a single baseline and stripped of every cross-service foreign key:
--
--   * problem.source_id             -> plain UUID (source-service problem_source)
--   * problem.source_account_id     -> plain UUID (source-service source_account)
--   * problem.submitted_by_user_id  -> plain UUID (source-service users)
--   * evidence.uploaded_by_user_id  -> plain UUID (source-service users)
--   * audit_log.performed_by_user_id -> plain UUID (source-service users)
--
-- Intra-aggregate FKs stay: evidence/problem_domain -> problem, audit_log ->
-- problem, problem.location_id -> location, domain.parent_domain_id -> domain.
--
-- The PostGIS geo_coordinates column + sync trigger are dropped: no entity maps
-- them and nothing in the public API queries geometry, so the problem service
-- does not need the PostGIS extension.

-- ---------------------------------------------------------------------------
-- Enum types (values shared via edith-common)
-- ---------------------------------------------------------------------------

CREATE TYPE source_bucket AS ENUM ('GOVT', 'CITIZEN', 'INDUSTRY', 'COMMUNITY', 'HEI');

CREATE TYPE sub_entity_type AS ENUM (
    'DEPARTMENT', 'PRI', 'ULB',
    'INDIVIDUAL', 'RWA',
    'COMPANY', 'STARTUP', 'MSME', 'CSR',
    'NGO', 'SHG', 'CBO_COOP',
    'UNIVERSITY', 'RESEARCH_LAB'
);

CREATE TYPE problem_status AS ENUM (
    'SUBMITTED', 'SOURCE_VERIFYING', 'SOURCE_VERIFIED',
    'REGISTERED', 'REJECTED', 'ARCHIVED'
);

CREATE TYPE urgency AS ENUM ('IMMEDIATE', 'SHORT_TERM', 'LONG_TERM');

CREATE TYPE severity AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

CREATE TYPE evidence_type AS ENUM ('PHOTO', 'VIDEO', 'DOCUMENT', 'AUDIO', 'DATASET', 'LOCATION_PIN');

-- Full AuditAction vocabulary (shared via edith-common); problem-service only
-- persists the Phase-1 subset but the type must agree with the Java enum.
CREATE TYPE audit_action AS ENUM (
    'CREATED','UPDATED','STATUS_CHANGED','EVIDENCE_ADDED',
    'SOURCE_VERIFICATION_INITIATED','SOURCE_VERIFIED','SOURCE_VERIFICATION_FAILED',
    'REJECTED','ARCHIVED','WITHDRAWN',
    'EVALUATION_STARTED','EVALUATION_ANALYZED','EVALUATION_ROUTED','EVALUATION_ASSIGNED',
    'EVALUATION_SUBMITTED','EVALUATION_AGGREGATED','EVALUATION_PRIORITIZED',
    'EVALUATION_COMPLETED','EVALUATION_DISAGREEMENT_FLAGGED',
    'EVALUATION_DISAGREEMENT_RESOLVED','EVALUATION_WEIGHT_UPDATED');

-- ---------------------------------------------------------------------------
-- location (administrative + explicit lat/long; geo point dropped)
-- ---------------------------------------------------------------------------

CREATE TABLE location (
    location_id      UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    country          VARCHAR(100)   NOT NULL DEFAULT 'India',
    state            VARCHAR(100)   NOT NULL,
    district         VARCHAR(100)   NOT NULL,
    block_tehsil     VARCHAR(100),
    village_ward     VARCHAR(100),
    pincode          VARCHAR(10),
    latitude         DECIMAL(10,8)  NOT NULL,
    longitude        DECIMAL(11,8)  NOT NULL,
    landmark         VARCHAR(255),
    boundary_geojson JSONB,
    lgd_code         VARCHAR(20)
);

CREATE INDEX idx_location_lgd ON location (lgd_code);
CREATE INDEX idx_location_latlong ON location (latitude, longitude);

-- ---------------------------------------------------------------------------
-- domain (self-referential taxonomy, max depth 3)
-- ---------------------------------------------------------------------------

CREATE TABLE domain (
    domain_id        UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_name      VARCHAR(100) NOT NULL UNIQUE,
    description      TEXT,
    parent_domain_id UUID         REFERENCES domain (domain_id),
    level            INT          NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 3)
);

ALTER TABLE domain ADD CONSTRAINT chk_domain_no_self_parent CHECK (parent_domain_id <> domain_id);

CREATE INDEX idx_domain_parent ON domain (parent_domain_id);

-- ---------------------------------------------------------------------------
-- problem (central canonical record; optimistic locking via version)
-- ---------------------------------------------------------------------------

CREATE TABLE problem (
    problem_id            UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    title                 VARCHAR(255)    NOT NULL,
    description           TEXT            NOT NULL,
    source_bucket         source_bucket   NOT NULL,
    sub_entity_type       sub_entity_type NOT NULL,
    status                problem_status  NOT NULL DEFAULT 'SUBMITTED',
    urgency               urgency         NOT NULL,
    severity              severity,
    source_id             UUID            NOT NULL,
    source_account_id     UUID,
    location_id           UUID            REFERENCES location (location_id),
    affected_population   INT,
    expected_outcome      TEXT,
    existing_intervention TEXT,
    submitted_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ     NOT NULL DEFAULT now(),
    submitted_by_user_id  UUID,
    version               INT             NOT NULL DEFAULT 1,
    metadata              JSONB
);

CREATE INDEX idx_problem_status ON problem (status);
CREATE INDEX idx_problem_source_bucket_p ON problem (source_bucket);
CREATE INDEX idx_problem_sub_entity ON problem (sub_entity_type);
CREATE INDEX idx_problem_location ON problem (location_id);
CREATE INDEX idx_problem_submitted_at ON problem (submitted_at);
CREATE INDEX idx_problem_user ON problem (submitted_by_user_id);
CREATE INDEX idx_problem_source ON problem (source_id);
CREATE INDEX idx_problem_source_account ON problem (source_account_id);

-- ---------------------------------------------------------------------------
-- evidence (immutable file attachment; uploader is a plain UUID)
-- ---------------------------------------------------------------------------

CREATE TABLE evidence (
    evidence_id         UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    problem_id          UUID           NOT NULL REFERENCES problem (problem_id) ON DELETE CASCADE,
    evidence_type       evidence_type  NOT NULL,
    file_url            VARCHAR(500)   NOT NULL,
    file_hash           VARCHAR(64)    NOT NULL,
    metadata            JSONB,
    captured_at         TIMESTAMPTZ,
    uploaded_by_user_id UUID
);

CREATE INDEX idx_evidence_problem ON evidence (problem_id);
CREATE INDEX idx_evidence_type ON evidence (evidence_type);
CREATE INDEX idx_evidence_user ON evidence (uploaded_by_user_id);

-- ---------------------------------------------------------------------------
-- problem_domain (junction; one primary domain per problem enforced)
-- ---------------------------------------------------------------------------

CREATE TABLE problem_domain (
    problem_id UUID    NOT NULL REFERENCES problem (problem_id) ON DELETE CASCADE,
    domain_id  UUID    NOT NULL REFERENCES domain (domain_id),
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (problem_id, domain_id)
);

CREATE UNIQUE INDEX uq_problem_domain_one_primary
    ON problem_domain (problem_id) WHERE is_primary = TRUE;

CREATE INDEX idx_problem_domain_problem ON problem_domain (problem_id);
CREATE INDEX idx_problem_domain_domain ON problem_domain (domain_id);
CREATE INDEX idx_problem_domain_primary ON problem_domain (problem_id, is_primary);

-- ---------------------------------------------------------------------------
-- audit_log (immutable problem-scoped action trail)
-- ---------------------------------------------------------------------------

CREATE TABLE audit_log (
    log_id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    problem_id          UUID         REFERENCES problem (problem_id) ON DELETE CASCADE,
    action_type         audit_action NOT NULL,
    performed_by_user_id UUID,
    performed_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    before_state        JSONB,
    after_state         JSONB,
    ip_address          VARCHAR(45)
);

CREATE INDEX idx_audit_problem ON audit_log (problem_id, performed_at);
CREATE INDEX idx_audit_user ON audit_log (performed_by_user_id);
