-- One human evaluator_profile per remaining pool, bound to the EVALUATOR logins
-- seeded in source-service V3 (GOVERNMENT is V5's demo profile). Without a
-- routable human in each pool, strict source-bucket routing would skip every
-- bucket except GOVERNMENT. Two DBs, no FK: user_id is just the shared UUID.

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
VALUES
    ('55555555-5555-4555-8555-555555555551', 'INDUSTRY',  'Industry Evaluator',  'SIH26043', 'Evaluator', 5, '[]'::jsonb, NULL, 5, TRUE, NOW(), NOW(), 1),
    ('55555555-5555-4555-8555-555555555552', 'HEI',       'HEI Evaluator',       'SIH26043', 'Evaluator', 5, '[]'::jsonb, NULL, 5, TRUE, NOW(), NOW(), 1),
    ('55555555-5555-4555-8555-555555555553', 'CITIZEN',   'Citizen Evaluator',   'SIH26043', 'Evaluator', 5, '[]'::jsonb, NULL, 5, TRUE, NOW(), NOW(), 1),
    ('55555555-5555-4555-8555-555555555554', 'COMMUNITY', 'Community Evaluator', 'SIH26043', 'Evaluator', 5, '[]'::jsonb, NULL, 5, TRUE, NOW(), NOW(), 1)
ON CONFLICT (user_id) DO NOTHING;
