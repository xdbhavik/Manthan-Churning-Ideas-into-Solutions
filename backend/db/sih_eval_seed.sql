
DELETE FROM project_review;
DELETE FROM evaluation_cycle;


INSERT INTO evaluator_profile (profile_id, user_id, evaluator_type, full_name, experience_years) VALUES 
('de459150-5e08-4886-892e-2ce3fec658a1', '44444444-4444-4444-8444-444444444441', 'HEI', 'Dr. Demo Evaluator One', 10),
('de459150-5e08-4886-892e-2ce3fec658a2', '44444444-4444-4444-8444-444444444442', 'INDUSTRY', 'Tech Lead Evaluator Two', 15)
ON CONFLICT (user_id) DO NOTHING;


INSERT INTO evaluation_cycle (
    cycle_id, problem_id, status, trigger_method, started_at, completed_at,
    final_score, priority_score, priority_band
) VALUES (
    '22222222-bbbb-4000-8000-000000000001', '11111111-aaaa-4000-8000-000000000001', 'EVALUATION_COMPLETED'::evaluation_status, 'ADMIN', now() - interval '3 days', now() - interval '1 day',
    84.5, 87.0, 'P1'::priority_band
);


INSERT INTO evaluation_cycle (
    cycle_id, problem_id, status, trigger_method, started_at, completed_at,
    final_score, priority_score, priority_band
) VALUES (
    '22222222-bbbb-4000-8000-000000000002', '11111111-aaaa-4000-8000-000000000002', 'EVALUATION_IN_PROGRESS'::evaluation_status, 'ADMIN', now() - interval '5 hours', NULL,
    NULL, NULL, NULL
);


INSERT INTO project_review (
    project_review_id, submission_id, round, problem_id, cycle_id,
    evaluator_profile_id, reviewer_user_id, problem_title, submission_title,
    status, decision_comment, decided_at
) VALUES (
    '68641da2-9b66-41a7-8721-b6914b4ad838', '33333333-cccc-4000-8000-000000000001', 1, '11111111-aaaa-4000-8000-000000000001', '22222222-bbbb-4000-8000-000000000001',
    'de459150-5e08-4886-892e-2ce3fec658a1', '44444444-4444-4444-8444-444444444441', 'IoT Pothole System', 'VeloSense Pipeline',
    'ASSIGNED'::project_review_status, NULL, NULL
);


INSERT INTO project_review (
    project_review_id, submission_id, round, problem_id, cycle_id,
    evaluator_profile_id, reviewer_user_id, problem_title, submission_title,
    status, decision_comment, decided_at
) VALUES (
    'abaa9e64-7a9d-4311-af1f-fa4321b9b31b', '33333333-cccc-4000-8000-000000000002', 1, '11111111-aaaa-4000-8000-000000000002', '22222222-bbbb-4000-8000-000000000002',
    'de459150-5e08-4886-892e-2ce3fec658a1', '44444444-4444-4444-8444-444444444441', 'Solar Microgrid', 'UrjaSetu Ledger',
    'RETURNED'::project_review_status, 'Update schematics', now() - interval '2 hours'
);


INSERT INTO project_review (
    project_review_id, submission_id, round, problem_id, cycle_id,
    evaluator_profile_id, reviewer_user_id, problem_title, submission_title,
    status, decision_comment, decided_at
) VALUES (
    '2722e5ab-0e37-4db2-97d8-9e16b2707b20', '33333333-cccc-4000-8000-000000000003', 1, '11111111-aaaa-4000-8000-000000000003', '22222222-bbbb-4000-8000-000000000002',
    'de459150-5e08-4886-892e-2ce3fec658a2', '44444444-4444-4444-8444-444444444442', 'Acoustic Mesh', 'JalDrishti',
    'ACCEPTED'::project_review_status, 'Great project', now() - interval '2 hours'
);

