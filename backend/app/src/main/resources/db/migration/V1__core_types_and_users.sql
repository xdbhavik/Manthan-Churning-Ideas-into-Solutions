-- V1: Core enum types, users, and authentication/session tables.
-- Refs: phase-1-backend-plan 05-data-dictionary-common.md (sections 9-13).

-- PostGIS is required by the location table (V2) for geo_coordinates.
CREATE EXTENSION IF NOT EXISTS postgis;

-- ---------------------------------------------------------------------------
-- Enum types (created once, referenced by later migrations)
-- ---------------------------------------------------------------------------

CREATE TYPE user_role AS ENUM ('SUBMITTER', 'REVIEWER', 'ADMIN');

CREATE TYPE kyc_status AS ENUM ('UNVERIFIED', 'VERIFIED');

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

CREATE TYPE audit_action AS ENUM (
    'CREATED', 'UPDATED', 'STATUS_CHANGED', 'EVIDENCE_ADDED',
    'SOURCE_VERIFICATION_INITIATED', 'SOURCE_VERIFIED',
    'SOURCE_VERIFICATION_FAILED', 'REJECTED', 'ARCHIVED', 'WITHDRAWN'
);

CREATE TYPE verification_method AS ENUM (
    'OFFICIAL_EMAIL', 'AUTHORIZATION_DOC', 'OTP',
    'REGISTRATION_API', 'INSTITUTIONAL_EMAIL', 'MANUAL_REVIEW'
);

CREATE TYPE verification_result AS ENUM ('PASS', 'FAIL', 'NEEDS_REVIEW');

-- ---------------------------------------------------------------------------
-- users
-- Table name plural/lowercase to avoid reserved keyword USER.
-- linked_source_id FK -> problem_source is added in V2 (table not yet created).
-- ---------------------------------------------------------------------------

CREATE TABLE users (
    user_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone            VARCHAR(15)  NOT NULL UNIQUE,
    email            VARCHAR(100),
    role             user_role    NOT NULL,
    kyc_status       kyc_status   NOT NULL DEFAULT 'UNVERIFIED',
    linked_source_id UUID,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- otp_challenge — one row per OTP issued.
-- Rate limit (5 OTP / phone / hour) uses the (phone, created_at) index.
-- OTP is 6 digits; only a salted/hash-protected value is stored, never plaintext.
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- refresh_token — rotating refresh tokens (UUID stored in DB, 7-day TTL).
-- ---------------------------------------------------------------------------

CREATE TABLE refresh_token (
    token      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID        NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_refresh_token_user ON refresh_token (user_id);

-- ---------------------------------------------------------------------------
-- idempotency_key — Idempotency-Key header storage for POST/PUT (24h TTL).
-- Expired entries are purged by a scheduled cleanup job (Phase 2 concern).
-- ---------------------------------------------------------------------------

CREATE TABLE idempotency_key (
    idem_key        VARCHAR(128) PRIMARY KEY,
    user_id         UUID REFERENCES users (user_id) ON DELETE CASCADE,
    request_hash    VARCHAR(64)  NOT NULL,
    response_status SMALLINT,
    response_body   JSONB,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);
