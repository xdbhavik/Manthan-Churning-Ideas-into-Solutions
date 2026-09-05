-- V3: Location, Domain, Problem, Evidence, ProblemDomain (junction).
-- Refs: 05-data-dictionary-common.md (sec 3-6), 11-api-and-indexes.md (sec 2).

-- ---------------------------------------------------------------------------
-- location
-- ---------------------------------------------------------------------------

CREATE TABLE location (
    location_id     UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    country         VARCHAR(100)   NOT NULL DEFAULT 'India',
    state           VARCHAR(100)   NOT NULL,
    district        VARCHAR(100)   NOT NULL,
    block_tehsil    VARCHAR(100),
    village_ward    VARCHAR(100),
    pincode         VARCHAR(10),
    latitude        DECIMAL(10,8)  NOT NULL,
    longitude       DECIMAL(11,8)  NOT NULL,
    geo_coordinates GEOMETRY(Point, 4326),
    landmark        VARCHAR(255),
    boundary_geojson JSONB,
    lgd_code        VARCHAR(20)
);

-- Keep the PostGIS point in sync with the explicit DECIMAL lat/long columns.
CREATE OR REPLACE FUNCTION sync_geo_coordinates() RETURNS trigger AS $$
BEGIN
    IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
        NEW.geo_coordinates := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
    ELSE
        NEW.geo_coordinates := NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_location_sync_geo
    BEFORE INSERT OR UPDATE OF latitude, longitude ON location
    FOR EACH ROW EXECUTE FUNCTION sync_geo_coordinates();

CREATE INDEX idx_location_geo ON location USING GIST (geo_coordinates);
CREATE INDEX idx_location_lgd ON location (lgd_code);
CREATE INDEX idx_location_latlong ON location (latitude, longitude);

-- ---------------------------------------------------------------------------
-- domain (self-referential taxonomy, max depth 3)
-- ---------------------------------------------------------------------------

CREATE TABLE domain (
    domain_id       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_name     VARCHAR(100) NOT NULL UNIQUE,
    description     TEXT,
    parent_domain_id UUID        REFERENCES domain (domain_id),
    level           INT          NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 3)
);

-- Cyclic prevention (self-parent is impossible by FK identity, enforced anyway).
ALTER TABLE domain ADD CONSTRAINT chk_domain_no_self_parent CHECK (parent_domain_id <> domain_id);

CREATE INDEX idx_domain_parent ON domain (parent_domain_id);

-- ---------------------------------------------------------------------------
-- problem (central canonical record; optimistic locking via version)
-- ---------------------------------------------------------------------------

CREATE TABLE problem (
    problem_id           UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    title                VARCHAR(255)   NOT NULL,
    description          TEXT           NOT NULL,
    source_bucket        source_bucket  NOT NULL,
    sub_entity_type      sub_entity_type NOT NULL,
    status               problem_status NOT NULL DEFAULT 'SUBMITTED',
    urgency              urgency        NOT NULL,
    severity             severity,
    source_id            UUID           NOT NULL REFERENCES problem_source (source_id),
    location_id          UUID           REFERENCES location (location_id),
    affected_population  INT,
    expected_outcome     TEXT,
    existing_intervention TEXT,
    submitted_at         TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ    NOT NULL DEFAULT now(),
    submitted_by_user_id UUID           REFERENCES users (user_id),
    version              INT            NOT NULL DEFAULT 1,
    metadata             JSONB
);

CREATE INDEX idx_problem_status ON problem (status);
-- Name differs from doc (idx_problem_source_bucket) because V2 already took
-- that name for the problem_source(bucket) index (Postgres index names are
-- schema-global).
CREATE INDEX idx_problem_source_bucket_p ON problem (source_bucket);
CREATE INDEX idx_problem_sub_entity ON problem (sub_entity_type);
CREATE INDEX idx_problem_location ON problem (location_id);
CREATE INDEX idx_problem_submitted_at ON problem (submitted_at);
CREATE INDEX idx_problem_user ON problem (submitted_by_user_id);
CREATE INDEX idx_problem_source ON problem (source_id);

-- ---------------------------------------------------------------------------
-- evidence
-- ---------------------------------------------------------------------------

CREATE TABLE evidence (
    evidence_id         UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    problem_id          UUID           NOT NULL REFERENCES problem (problem_id) ON DELETE CASCADE,
    evidence_type       evidence_type  NOT NULL,
    file_url            VARCHAR(500)   NOT NULL,
    file_hash           VARCHAR(64)    NOT NULL,
    metadata            JSONB,
    captured_at         TIMESTAMPTZ,
    uploaded_by_user_id UUID           REFERENCES users (user_id)
);

CREATE INDEX idx_evidence_problem ON evidence (problem_id);
CREATE INDEX idx_evidence_type ON evidence (evidence_type);
CREATE INDEX idx_evidence_user ON evidence (uploaded_by_user_id);

-- ---------------------------------------------------------------------------
-- problem_domain (junction; one primary domain per problem enforced)
-- ---------------------------------------------------------------------------

CREATE TABLE problem_domain (
    problem_id  UUID    NOT NULL REFERENCES problem (problem_id) ON DELETE CASCADE,
    domain_id   UUID    NOT NULL REFERENCES domain (domain_id),
    is_primary  BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (problem_id, domain_id)
);

-- Exactly one primary domain per problem (partial unique index).
CREATE UNIQUE INDEX uq_problem_domain_one_primary
    ON problem_domain (problem_id) WHERE is_primary = TRUE;

CREATE INDEX idx_problem_domain_problem ON problem_domain (problem_id);
CREATE INDEX idx_problem_domain_domain ON problem_domain (domain_id);
CREATE INDEX idx_problem_domain_primary ON problem_domain (problem_id, is_primary);