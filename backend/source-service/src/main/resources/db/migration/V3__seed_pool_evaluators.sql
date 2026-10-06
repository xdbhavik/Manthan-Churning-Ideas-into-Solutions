-- Seed one EVALUATOR login per evaluator pool so source-bucket based routing can
-- be exercised across all five pools. GOVERNMENT already exists as the demo
-- evaluator 9700000001 (source V2 + evaluation V5); this adds the other four.
-- Dev-only accounts, same shape as V2 (passwordless OTP login, UNVERIFIED KYC).

INSERT INTO users (user_id, phone, email, role, kyc_status, created_at)
VALUES
    ('55555555-5555-4555-8555-555555555551', '9700000002', 'industry.evaluator@sih.local',  'EVALUATOR', 'UNVERIFIED', NOW()),
    ('55555555-5555-4555-8555-555555555552', '9700000003', 'hei.evaluator@sih.local',       'EVALUATOR', 'UNVERIFIED', NOW()),
    ('55555555-5555-4555-8555-555555555553', '9700000004', 'citizen.evaluator@sih.local',   'EVALUATOR', 'UNVERIFIED', NOW()),
    ('55555555-5555-4555-8555-555555555554', '9700000005', 'community.evaluator@sih.local', 'EVALUATOR', 'UNVERIFIED', NOW())
ON CONFLICT (phone) DO NOTHING;
