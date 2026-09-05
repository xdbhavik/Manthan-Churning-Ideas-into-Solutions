-- V2: ProblemSource base table (JOINED inheritance root) + Government bucket.
-- Refs: 05-data-dictionary-common.md (sec 2), 06-data-dictionary-government.md.

CREATE TYPE gov_subtype AS ENUM ('DEPARTMENT', 'PRI', 'ULB');

CREATE TYPE department_problem_type AS ENUM (
    'INFRASTRUCTURE', 'SERVICE_DELIVERY', 'POLICY', 'TECHNOLOGY', 'DATA_ANALYTICS'
);

CREATE TYPE pri_level AS ENUM ('GRAM_PANCHAYAT', 'BLOCK_PANCHAYAT', 'ZILLA_PARISHAD');

CREATE TYPE pri_identified_through AS ENUM (
    'GRAM_SABHA', 'WARD_SABHA', 'MAHILA_SABHA', 'STANDING_COMMITTEE'
);

CREATE TYPE pri_funds_source AS ENUM ('15TH_FC', 'SFC', 'OWN', 'OTHER');

CREATE TYPE field_verification_status AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

CREATE TYPE ulb_type AS ENUM ('MUNICIPAL_CORPORATION', 'MUNICIPALITY', 'NAGAR_PANCHAYAT');

CREATE TYPE ulb_problem_category AS ENUM (
    'ROADS', 'WATER_SUPPLY', 'SEWERAGE', 'DRAINAGE', 'STREET_LIGHTING',
    'SOLID_WASTE', 'PUBLIC_HEALTH', 'BUILDING_VIOLATION', 'PARKS', 'TRAFFIC', 'OTHER'
);

CREATE TYPE ulb_severity AS ENUM ('CRITICAL', 'MAJOR', 'MINOR');

CREATE TYPE ulb_frequency AS ENUM ('ONE_TIME', 'RECURRING', 'CHRONIC');

-- ---------------------------------------------------------------------------
-- problem_source (abstract base; all subtypes inherit via JOINED tables)
-- ---------------------------------------------------------------------------

CREATE TABLE problem_source (
    source_id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    bucket                   source_bucket NOT NULL,
    sub_entity_type          sub_entity_type NOT NULL,
    contact_person_name      VARCHAR(100),
    contact_email            VARCHAR(100),
    contact_phone            VARCHAR(15),
    organization_name        VARCHAR(255),
    registration_number      VARCHAR(50),
    is_verified_source       BOOLEAN       NOT NULL DEFAULT FALSE,
    registered_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
    verification_credentials JSONB
);

CREATE INDEX idx_problem_source_bucket ON problem_source (bucket);
CREATE INDEX idx_problem_source_sub_entity ON problem_source (sub_entity_type);
CREATE INDEX idx_problem_source_verified ON problem_source (is_verified_source);

-- Deferred FK from V1 (problem_source did not exist then).
ALTER TABLE users
    ADD CONSTRAINT fk_users_linked_source
    FOREIGN KEY (linked_source_id) REFERENCES problem_source (source_id);

-- ---------------------------------------------------------------------------
-- government_source (level 2)
-- ---------------------------------------------------------------------------

CREATE TABLE government_source (
    source_id                  UUID        PRIMARY KEY REFERENCES problem_source (source_id) ON DELETE CASCADE,
    gov_subtype                gov_subtype NOT NULL,
    ministry_name              VARCHAR(255),
    department_name            VARCHAR(255),
    official_email_domain      VARCHAR(100),
    scheme_mission_reference   VARCHAR(100),
    project_code               VARCHAR(100),
    authorization_document_url VARCHAR(500),
    authorization_metadata     JSONB
);

-- ---------------------------------------------------------------------------
-- department_source (level 3)
-- ---------------------------------------------------------------------------

CREATE TABLE department_source (
    source_id                  UUID      PRIMARY KEY REFERENCES government_source (source_id) ON DELETE CASCADE,
    department_full_name       VARCHAR(255) NOT NULL,
    problem_type               department_problem_type,
    scope_of_work              TEXT,
    target_beneficiaries_desc  TEXT,
    geographic_coverage        TEXT,
    budget_range_min           DECIMAL(15,2),
    budget_range_max           DECIMAL(15,2),
    timeline_deadline          DATE,
    expected_deliverables      TEXT,
    technical_requirements     TEXT,
    compliance_requirements    TEXT,
    evaluation_criteria        TEXT,
    data_resources_available   TEXT,
    nodal_officer_name         VARCHAR(100),
    nodal_officer_designation  VARCHAR(100),
    nodal_officer_phone        VARCHAR(15),
    previous_attempts_summary  TEXT,
    stakeholders_involved      TEXT
);

CREATE INDEX idx_department_source_problem_type ON department_source (problem_type);

-- ---------------------------------------------------------------------------
-- pri_source (level 3)
-- ---------------------------------------------------------------------------

CREATE TABLE pri_source (
    source_id                        UUID PRIMARY KEY REFERENCES government_source (source_id) ON DELETE CASCADE,
    pri_level                        pri_level NOT NULL,
    pri_name                         VARCHAR(255) NOT NULL,
    pri_code                         VARCHAR(50),
    gpdp_reference                   VARCHAR(100),
    identified_through               pri_identified_through,
    sector_theme                     VARCHAR(100),
    households_affected              INT,
    population_affected_male         INT,
    population_affected_female       INT,
    population_affected_other        INT,
    village_ward_names               TEXT,
    existing_infrastructure_status   TEXT,
    funds_source                     pri_funds_source,
    funds_available                  DECIMAL(15,2),
    priority_ranking                 INT,
    sarpanch_name                    VARCHAR(100),
    secretary_name                   VARCHAR(100),
    gram_sabha_resolution_no         VARCHAR(50),
    gram_sabha_resolution_date       DATE,
    related_schemes                  TEXT,
    field_verification_status        field_verification_status
);

CREATE INDEX idx_pri_source_level ON pri_source (pri_level);
CREATE INDEX idx_pri_source_code ON pri_source (pri_code);

-- ---------------------------------------------------------------------------
-- ulb_source (level 3)
-- ---------------------------------------------------------------------------

CREATE TABLE ulb_source (
    source_id                     UUID PRIMARY KEY REFERENCES government_source (source_id) ON DELETE CASCADE,
    ulb_name                      VARCHAR(255) NOT NULL,
    ulb_type                      ulb_type,
    ulb_code                      VARCHAR(50),
    ward_number                   VARCHAR(20),
    ward_name                     VARCHAR(100),
    problem_category              ulb_problem_category,
    street_area_landmark          VARCHAR(255),
    property_id                   VARCHAR(50),
    severity                      ulb_severity,
    frequency                     ulb_frequency,
    affected_area_sqm             DECIMAL(10,2),
    affected_households           INT,
    existing_complaint_reference  VARCHAR(100),
    budget_head                   VARCHAR(100),
    relevant_municipal_dept       VARCHAR(100),
    ward_councillor_name          VARCHAR(100),
    ward_councillor_phone         VARCHAR(15),
    municipal_commissioner_name   VARCHAR(100),
    municipal_commissioner_phone  VARCHAR(15)
);

CREATE INDEX idx_ulb_source_type ON ulb_source (ulb_type);
CREATE INDEX idx_ulb_source_code ON ulb_source (ulb_code);
