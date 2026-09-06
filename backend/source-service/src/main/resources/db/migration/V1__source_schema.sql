-- V1 (source-service baseline): identity/auth + source registration & accounts.
--
-- Re-based from the monolith V1-V13 (app) keeping ONLY the tables the
-- source aggregate owns. Problem/domain/evidence/evaluation tables are NOT
-- created here (they live in problem-service / evaluation-service). Cross-DB
-- references (problem.source_id, evidence.uploaded_by_user_id, audit_log.*)
-- are gone. Enums are created exactly as the Phase-1 migrations did, EXCEPT:
--   * user_role already contains EVALUATOR (monolith added it later in V11);
--   * pri_funds_source is created with 'FIFTEEN_FC' (monolith V2+V7 renamed it).
-- community_source.organization_name is nullable from birth (monolith V10).

-- Enum types
CREATE TYPE user_role AS ENUM ('SUBMITTER', 'REVIEWER', 'ADMIN', 'EVALUATOR');
CREATE TYPE kyc_status AS ENUM ('UNVERIFIED', 'VERIFIED');
CREATE TYPE source_bucket AS ENUM ('GOVT', 'CITIZEN', 'INDUSTRY', 'COMMUNITY', 'HEI');
CREATE TYPE sub_entity_type AS ENUM (
    'DEPARTMENT', 'PRI', 'ULB',
    'INDIVIDUAL', 'RWA',
    'COMPANY', 'STARTUP', 'MSME', 'CSR',
    'NGO', 'SHG', 'CBO_COOP',
    'UNIVERSITY', 'RESEARCH_LAB'
);
-- severity is referenced by individual_source.self_reported_severity (below).
CREATE TYPE severity AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');
CREATE TYPE verification_method AS ENUM (
    'OFFICIAL_EMAIL', 'AUTHORIZATION_DOC', 'OTP',
    'REGISTRATION_API', 'INSTITUTIONAL_EMAIL', 'MANUAL_REVIEW'
);
CREATE TYPE verification_result AS ENUM ('PASS', 'FAIL', 'NEEDS_REVIEW');

-- users (linked_source_id FK -> problem_source is added after that table)
CREATE TABLE users (
    user_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone            VARCHAR(15)  NOT NULL UNIQUE,
    email            VARCHAR(100),
    role             user_role    NOT NULL,
    kyc_status       kyc_status   NOT NULL DEFAULT 'UNVERIFIED',
    linked_source_id UUID,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- otp_challenge
CREATE TABLE otp_challenge (
    challenge_id  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    phone         VARCHAR(15)  NOT NULL,
    otp_code_hash VARCHAR(255) NOT NULL,
    expires_at    TIMESTAMPTZ  NOT NULL,
    consumed_at   TIMESTAMPTZ,
    attempt_count INT          NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_otp_challenge_phone_created ON otp_challenge (phone, created_at DESC);
CREATE INDEX idx_otp_challenge_expires ON otp_challenge (expires_at);

-- refresh_token
CREATE TABLE refresh_token (
    token      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID        NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_refresh_token_user ON refresh_token (user_id);

-- idempotency_key
CREATE TABLE idempotency_key (
    idem_key        VARCHAR(128) PRIMARY KEY,
    user_id         UUID REFERENCES users (user_id) ON DELETE CASCADE,
    request_hash    VARCHAR(64)  NOT NULL,
    response_status SMALLINT,
    response_body   JSONB,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- problem_source root + Government bucket (monolith V2, verbatim)
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

CREATE TYPE pri_funds_source AS ENUM ('FIFTEEN_FC', 'SFC', 'OWN', 'OTHER');

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

-- ---------------------------------------------------------------------------
-- source_verification (monolith V4 -- audit_log is problem-scoped, dropped)
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

-- ---------------------------------------------------------------------------
-- Citizen / Industry / Community / HEI buckets (monolith V5, verbatim)
-- V5: Citizen, Industry, Community, HEI buckets (JOINED subclasses).
-- Refs: 07-10 data-dictionary docs.

-- ===========================================================================
-- Citizen bucket
-- ===========================================================================

CREATE TYPE citizen_subtype AS ENUM ('INDIVIDUAL', 'RWA');

CREATE TYPE individual_frequency AS ENUM ('FIRST_TIME', 'DAILY', 'WEEKLY', 'OCCASIONAL');

CREATE TYPE rwa_scope AS ENUM ('COMMON_AREA', 'INDIVIDUAL_UNITS');

CREATE TABLE citizen_source (
    source_id                       UUID PRIMARY KEY REFERENCES problem_source (source_id) ON DELETE CASCADE,
    citizen_subtype                 citizen_subtype NOT NULL,
    is_anonymous                    BOOLEAN NOT NULL DEFAULT FALSE,
    preferred_language              VARCHAR(10) NOT NULL DEFAULT 'en',
    willing_to_validate_solution    BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE individual_source (
    source_id                    UUID PRIMARY KEY REFERENCES citizen_source (source_id) ON DELETE CASCADE,
    citizen_name                 VARCHAR(100),
    contact_number               VARCHAR(15) NOT NULL,
    email_id                     VARCHAR(100),
    aadhaar_hash                 VARCHAR(64),
    voter_id_hash                VARCHAR(64),
    date_of_observation          DATE,
    frequency                    individual_frequency,
    self_reported_severity       severity,
    people_affected_estimate     INT,
    landmark_nearby              VARCHAR(255),
    reported_elsewhere           BOOLEAN,
    elsewhere_reference          VARCHAR(255),
    desired_resolution           TEXT,
    audio_description_available  BOOLEAN
);

CREATE INDEX idx_individual_source_contact ON individual_source (contact_number);

CREATE TABLE rwa_source (
    source_id                          UUID PRIMARY KEY REFERENCES citizen_source (source_id) ON DELETE CASCADE,
    rwa_name                           VARCHAR(255) NOT NULL,
    rwa_registration_number            VARCHAR(50),
    colony_apartment_name              VARCHAR(255),
    representative_name                VARCHAR(100),
    representative_designation         VARCHAR(50),
    residents_represented              INT,
    scope                              rwa_scope,
    resolution_passed                  BOOLEAN,
    resolution_date                    DATE,
    previous_communication_with_authorities TEXT
);

CREATE INDEX idx_rwa_source_reg ON rwa_source (rwa_registration_number);

-- ===========================================================================
-- Industry bucket
-- ===========================================================================

CREATE TYPE industry_subtype AS ENUM ('COMPANY', 'STARTUP', 'MSME', 'CSR');

CREATE TYPE company_size AS ENUM ('LARGE', 'MID', 'SMALL');

CREATE TYPE industry_problem_type AS ENUM (
    'PROCESS_IMPROVEMENT', 'PRODUCT_INNOVATION', 'SUSTAINABILITY',
    'DIGITAL_TRANSFORMATION', 'SUPPLY_CHAIN', 'OTHER'
);

CREATE TYPE trl_level AS ENUM ('TRL_1', 'TRL_2', 'TRL_3', 'TRL_4', 'TRL_5', 'TRL_6', 'TRL_7', 'TRL_8', 'TRL_9');

CREATE TYPE ip_arrangement AS ENUM ('COMPANY_RETAINS', 'SHARED', 'SOLVER_OWNS', 'OPEN_SOURCE');

CREATE TYPE startup_stage AS ENUM ('IDEA', 'MVP', 'EARLY_REVENUE', 'GROWTH', 'SCALE');

CREATE TYPE funding_raised AS ENUM ('BOOTSTRAPPED', 'ANGEL', 'SEED', 'SERIES_A', 'SERIES_B_PLUS');

CREATE TYPE startup_collab_sought AS ENUM ('TECHNICAL', 'RESEARCH', 'FUNDING', 'MARKET_ACCESS');

CREATE TYPE msme_enterprise_type AS ENUM ('MICRO', 'SMALL', 'MEDIUM');

CREATE TYPE msme_problem_category AS ENUM (
    'TECHNOLOGY_UPGRADE', 'QUALITY_CERTIFICATION', 'MARKET_ACCESS',
    'SKILL_GAP', 'WORKING_CAPITAL', 'ENERGY_EFFICIENCY'
);

CREATE TYPE msme_expected_support AS ENUM ('TECHNICAL', 'FINANCIAL', 'TRAINING', 'INFRASTRUCTURE');

CREATE TYPE csr_impl_partner_pref AS ENUM ('NGO', 'GOVT', 'DIRECT', 'HEI');

CREATE TABLE industry_source (
    source_id                      UUID PRIMARY KEY REFERENCES problem_source (source_id) ON DELETE CASCADE,
    industry_subtype               industry_subtype NOT NULL,
    company_name                   VARCHAR(255) NOT NULL,
    cin_registration_number        VARCHAR(25),
    industry_sector                VARCHAR(100),
    company_size                   company_size,
    problem_type                   industry_problem_type,
    challenge_brief                TEXT,
    current_state                  TEXT,
    desired_state_success_metrics  TEXT,
    constraints                    TEXT,
    technology_readiness_level     trl_level,
    data_available_for_solvers     TEXT,
    ip_arrangement                 ip_arrangement,
    budget_prize_funding           DECIMAL(15,2),
    pilot_opportunity              BOOLEAN,
    commercialization_pathway      TEXT,
    internal_champion_name         VARCHAR(100),
    internal_champion_designation  VARCHAR(100),
    nda_required                   BOOLEAN NOT NULL DEFAULT FALSE,
    previous_solutions_tried       TEXT
);

CREATE INDEX idx_industry_source_cin ON industry_source (cin_registration_number);

CREATE TABLE company_source (
    source_id           UUID PRIMARY KEY REFERENCES industry_source (source_id) ON DELETE CASCADE,
    parent_company_name VARCHAR(255),
    business_unit       VARCHAR(100),
    annual_turnover_cr  DECIMAL(10,2),
    employee_count      INT,
    website             VARCHAR(255),
    is_public_sector    BOOLEAN
);

CREATE TABLE startup_source (
    source_id                        UUID PRIMARY KEY REFERENCES industry_source (source_id) ON DELETE CASCADE,
    incorporation_date               DATE,
    founder_ceo_name                 VARCHAR(100),
    founder_ceo_contact              VARCHAR(15),
    sector_domain                    VARCHAR(100),
    stage                            startup_stage,
    problem_they_face                TEXT,
    problem_they_want_to_publish     TEXT,
    team_size                        INT,
    team_composition                 TEXT,
    funding_raised                   funding_raised,
    udyam_registration               VARCHAR(20),
    incubator_accelerator_affiliation VARCHAR(255),
    prototype_mvp_available          BOOLEAN,
    market_validation                TEXT,
    collaboration_sought             startup_collab_sought
);

CREATE TABLE msme_source (
    source_id                 UUID PRIMARY KEY REFERENCES industry_source (source_id) ON DELETE CASCADE,
    udyam_registration_number VARCHAR(20) NOT NULL,
    enterprise_type           msme_enterprise_type,
    product_service_category  VARCHAR(100),
    nic_code                  VARCHAR(10),
    annual_turnover           DECIMAL(15,2),
    employment_count          INT,
    problem_category          msme_problem_category,
    specific_challenge        TEXT,
    expected_support          msme_expected_support,
    district_industry_centre  VARCHAR(100)
);

CREATE INDEX idx_msme_source_udyam ON msme_source (udyam_registration_number);

CREATE TABLE csr_source (
    source_id                        UUID PRIMARY KEY REFERENCES industry_source (source_id) ON DELETE CASCADE,
    csr_policy_reference             VARCHAR(100),
    schedule_vii_alignment           VARCHAR(100),
    problem_project_description      TEXT,
    target_geography                 TEXT,
    target_beneficiaries             INT,
    budget_allocation                DECIMAL(15,2),
    implementation_partner_pref      csr_impl_partner_pref,
    monitoring_evaluation_requirements TEXT,
    previous_csr_projects            TEXT,
    csr1_registration                VARCHAR(50),
    compliance_documents             TEXT
);
-- ===========================================================================
-- Community bucket
-- ===========================================================================

CREATE TYPE community_subtype AS ENUM ('NGO', 'SHG', 'CBO_COOP');

CREATE TYPE community_registration_type AS ENUM ('TRUST', 'SOCIETY', 'SEC_8', 'COOPERATIVE', 'CBO', 'FPO', 'OTHER');

CREATE TYPE ngo_engagement_method AS ENUM ('PRA', 'FGD', 'BASELINE_SURVEY', 'OTHER');

CREATE TYPE shg_forming_agency AS ENUM ('BANK', 'NGO', 'GOVT_PROGRAM');

CREATE TYPE shg_bank_linkage AS ENUM ('SAVINGS_ONLY', 'LOAN_TAKEN', 'LOAN_REPAID', 'NO_ACCOUNT');

CREATE TYPE shg_problem_issue AS ENUM ('LIVELIHOOD', 'SKILL', 'INFRASTRUCTURE', 'MARKET', 'SOCIAL', 'OTHER');

CREATE TYPE cbo_org_type AS ENUM ('COOPERATIVE_SOCIETY', 'CBO', 'FPO', 'OTHER');

CREATE TYPE cbo_membership_type AS ENUM ('FARMERS', 'ARTISANS', 'WOMEN', 'MIXED', 'OTHER');

CREATE TYPE cbo_external_support AS ENUM ('TECHNICAL', 'FINANCIAL', 'MARKET', 'INFRASTRUCTURE');

CREATE TABLE community_source (
    source_id            UUID PRIMARY KEY REFERENCES problem_source (source_id) ON DELETE CASCADE,
    community_subtype    community_subtype NOT NULL,
    organization_name    VARCHAR(255),
    registration_type    community_registration_type,
    registration_number  VARCHAR(50),
    registration_date    DATE,
    years_of_operation   INT,
    geographic_focus     TEXT,
    sectoral_expertise   TEXT,
    problem_statement    TEXT,
    proposed_intervention TEXT,
    budget_estimate      DECIMAL(15,2),
    monitoring_plan      TEXT
);

CREATE INDEX idx_community_source_reg ON community_source (registration_number);

CREATE TABLE ngo_source (
    source_id                   UUID PRIMARY KEY REFERENCES community_source (source_id) ON DELETE CASCADE,
    ngo_darpan_id               VARCHAR(20),
    fcra_registration           VARCHAR(50),
    has_12a_status              BOOLEAN,
    has_80g_status              BOOLEAN,
    csr1_registration           VARCHAR(50),
    community_engagement_method ngo_engagement_method,
    baseline_data               TEXT,
    beneficiary_profile         TEXT,
    implementation_capacity     TEXT,
    community_consent_evidence  TEXT,
    previous_project_references TEXT,
    staff_count_field_presence  TEXT
);

CREATE INDEX idx_ngo_source_darpan ON ngo_source (ngo_darpan_id);

CREATE TABLE shg_source (
    source_id                      UUID PRIMARY KEY REFERENCES community_source (source_id) ON DELETE CASCADE,
    shg_name                       VARCHAR(255) NOT NULL,
    shg_registration_number        VARCHAR(50),
    forming_agency                 shg_forming_agency,
    member_count                   INT,
    member_demographics            TEXT,
    savings_corpus                 DECIMAL(12,2),
    bank_linkage_status            shg_bank_linkage,
    village_name                   VARCHAR(100),
    gp_name                        VARCHAR(100),
    block_name                     VARCHAR(100),
    district_name                  VARCHAR(100),
    problem_issue                  shg_problem_issue,
    current_activity               TEXT,
    proposed_activity              TEXT,
    expected_investment_required   DECIMAL(12,2),
    beneficiary_contribution_pct   DECIMAL(5,2),
    market_linkage_needed          BOOLEAN,
    training_required              TEXT,
    vo_federation_support          VARCHAR(100)
);

CREATE TABLE cbo_coop_source (
    source_id                     UUID PRIMARY KEY REFERENCES community_source (source_id) ON DELETE CASCADE,
    org_type                      cbo_org_type NOT NULL,
    membership_count              INT,
    membership_type               cbo_membership_type,
    geographic_coverage           TEXT,
    sector                        VARCHAR(100),
    governance_structure          TEXT,
    annual_turnover               DECIMAL(15,2),
    existing_assets_infrastructure TEXT,
    proposed_solution             TEXT,
    equity_contribution           DECIMAL(12,2),
    external_support_needed       cbo_external_support
);

-- ===========================================================================
-- HEI bucket
-- ===========================================================================

CREATE TYPE hei_subtype AS ENUM ('UNIVERSITY', 'RESEARCH_LAB');

CREATE TYPE hei_institution_type AS ENUM (
    'CENTRAL_UNIV', 'STATE_UNIV', 'DEEMED', 'PRIVATE',
    'AUTONOMOUS_COLLEGE', 'RESEARCH_INSTITUTE'
);

CREATE TYPE university_problem_type AS ENUM ('RESEARCH', 'INSTITUTIONAL', 'COMMUNITY', 'INDUSTRY_COLLAB');

CREATE TYPE student_involvement AS ENUM ('UG', 'PG', 'PHD', 'NONE');

CREATE TYPE lab_collab_sought AS ENUM ('INDUSTRY', 'GOVT', 'INTERNATIONAL', 'OTHER_LABS');

CREATE TYPE research_funding_status AS ENUM ('FUNDED', 'SEEKING', 'CO_FUNDING');

CREATE TABLE hei_source (
    source_id               UUID PRIMARY KEY REFERENCES problem_source (source_id) ON DELETE CASCADE,
    hei_subtype             hei_subtype NOT NULL,
    institution_name        VARCHAR(255) NOT NULL,
    institution_type        hei_institution_type,
    naac_grade              VARCHAR(10),
    nirf_rank               INT,
    ugc_aicte_affiliation   VARCHAR(100),
    department_centre_name  VARCHAR(100)
);

CREATE INDEX idx_hei_source_name ON hei_source (institution_name);

CREATE TABLE university_source (
    source_id                        UUID PRIMARY KEY REFERENCES hei_source (source_id) ON DELETE CASCADE,
    principal_investigator_name      VARCHAR(100),
    pi_designation                   VARCHAR(100),
    pi_contact_email                 VARCHAR(100),
    pi_contact_phone                 VARCHAR(15),
    co_investigators                 TEXT,
    problem_type                     university_problem_type,
    research_gap_literature_context  TEXT,
    research_questions_objectives    TEXT,
    methodology_approach             TEXT,
    expected_outcomes                TEXT,
    timeline_months                  INT,
    budget_requirement               DECIMAL(15,2),
    existing_facilities_labs         TEXT,
    ethical_clearance_needed         BOOLEAN,
    student_involvement              student_involvement,
    industry_government_partner      TEXT,
    previous_related_work            TEXT
);

CREATE TABLE research_lab_source (
    source_id                    UUID PRIMARY KEY REFERENCES hei_source (source_id) ON DELETE CASCADE,
    lab_name                     VARCHAR(100),
    scientist_researcher_name    VARCHAR(100),
    researcher_designation       VARCHAR(100),
    research_area                VARCHAR(100),
    trl_current                  trl_level,
    collaboration_sought         lab_collab_sought,
    equipment_facilities_available TEXT,
    funding_status               research_funding_status,
    patent_ip_potential          TEXT,
    publication_plan             TEXT,
    ongoing_projects             TEXT
);
-- ---------------------------------------------------------------------------
-- Source registration workflow (monolith V8, verbatim)
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

-- ---------------------------------------------------------------------------
-- source_account ownership spine (monolith V9 -- problem ALTER/backfill dropped)
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
