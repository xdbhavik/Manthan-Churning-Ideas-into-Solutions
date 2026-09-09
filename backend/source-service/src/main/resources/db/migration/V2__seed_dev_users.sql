-- Seed the local demo accounts used by the admin/evaluator/reviewer/submitter flows.
-- These accounts are intentionally dev-only and are not part of the production schema.

INSERT INTO users (user_id, phone, email, role, kyc_status, created_at)
VALUES
    ('11111111-1111-4111-8111-111111111111', '9800000001', 'admin@sih.local', 'ADMIN', 'UNVERIFIED', NOW()),
    ('22222222-2222-4222-8222-222222222222', '9829858790', 'reviewer@sih.local', 'REVIEWER', 'UNVERIFIED', NOW()),
    ('33333333-3333-4333-8333-333333333333', '9900000001', 'submitter@sih.local', 'SUBMITTER', 'UNVERIFIED', NOW()),
    ('44444444-4444-4444-8444-444444444444', '9700000001', 'evaluator@sih.local', 'EVALUATOR', 'UNVERIFIED', NOW())
ON CONFLICT (phone) DO NOTHING;
