-- Seed the demo evaluator profile expected by the evaluator portal login flow.
-- The source-service demo evaluator account is 9700000001 and must be bound to an
-- evaluation profile before /evaluation/me/profile and /evaluation/me/criteria work.

INSERT INTO evaluator_profile (
    user_id,
    evaluator_type,
    full_name,
    organization,
    designation,
    experience_years,
    region_states,
    affiliated_source_id,
    max_workload,
    is_active,
    created_at,
    updated_at,
    version
)
VALUES (
    '44444444-4444-4444-8444-444444444444',
    'GOVERNMENT',
    'Demo Evaluator',
    'SIH26043',
    'Senior Evaluator',
    5,
    '[]'::jsonb,
    NULL,
    5,
    TRUE,
    NOW(),
    NOW(),
    1
)
ON CONFLICT (user_id) DO NOTHING;
