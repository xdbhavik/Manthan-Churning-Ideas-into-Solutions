
DELETE FROM submission_file;
DELETE FROM submission;
DELETE FROM published_problem;


INSERT INTO participant (participant_id, user_id, participant_type, full_name, email, phone) VALUES 
('a71a2e7b-b7d2-4837-9fe1-a1829aa7f611', '1a1be98a-2239-4704-a1c9-abbec4ab8181', 'STUDENT', 'Priya Sharma', 'priya@university.ac.in', '9876543211'),
('a71a2e7b-b7d2-4837-9fe1-a1829aa7f612', '1a1be98a-2239-4704-a1c9-abbec4ab8182', 'STUDENT', 'Rahul Verma', 'rahul@university.ac.in', '9876543212'),
('a71a2e7b-b7d2-4837-9fe1-a1829aa7f613', '1a1be98a-2239-4704-a1c9-abbec4ab8183', 'STUDENT', 'Anita Desai', 'anita@university.ac.in', '9876543213')
ON CONFLICT (participant_id) DO NOTHING;


INSERT INTO published_problem (
    problem_id, cycle_id, title, description, expected_outcome,
    source_bucket, sub_entity_type, urgency, severity, location,
    domains, evidence_count, access_rule, access_universities, published_at
) VALUES (
    '11111111-aaaa-4000-8000-000000000001', '22222222-bbbb-4000-8000-000000000001', 'IoT-Enabled Pothole & Road Surface Telemetry System', 'Edge-computing telemetry unit that maps pavement defects.', 'Real-time mapping dashboard.',
    'GOVT', 'ULB', 'IMMEDIATE', 'CRITICAL', 'Bengaluru, Karnataka',
    '["IoT", "Computer Vision"]'::jsonb, 3, 'OPEN_TO_ALL', '[]'::jsonb, now() - interval '2 days'
);


INSERT INTO published_problem (
    problem_id, cycle_id, title, description, expected_outcome,
    source_bucket, sub_entity_type, urgency, severity, location,
    domains, evidence_count, access_rule, access_universities, published_at
) VALUES (
    '11111111-aaaa-4000-8000-000000000002', '22222222-bbbb-4000-8000-000000000002', 'Decentralized Solar Microgrid Energy Trading', 'Peer-to-peer microgrid controller enabling surplus energy trading.', 'Smart-meter firmware.',
    'GOVT', 'PRI', 'SHORT_TERM', 'HIGH', 'Punjab',
    '["Clean Energy", "IoT"]'::jsonb, 2, 'OPEN_TO_ALL', '[]'::jsonb, now() - interval '2 days'
);


INSERT INTO published_problem (
    problem_id, cycle_id, title, description, expected_outcome,
    source_bucket, sub_entity_type, urgency, severity, location,
    domains, evidence_count, access_rule, access_universities, published_at
) VALUES (
    '11111111-aaaa-4000-8000-000000000003', '22222222-bbbb-4000-8000-000000000003', 'Autonomous Water Pipeline Leakage Mesh', 'Non-invasive acoustic sensor mesh for water leaks.', 'Acoustic clamp-on leak detection sensor.',
    'INDUSTRY', 'STARTUP', 'IMMEDIATE', 'CRITICAL', 'Rajasthan',
    '["Water", "Sensors"]'::jsonb, 4, 'OPEN_TO_ALL', '[]'::jsonb, now() - interval '2 days'
);


INSERT INTO published_problem (
    problem_id, cycle_id, title, description, expected_outcome,
    source_bucket, sub_entity_type, urgency, severity, location,
    domains, evidence_count, access_rule, access_universities, published_at
) VALUES (
    '11111111-aaaa-4000-8000-000000000004', '22222222-bbbb-4000-8000-000000000004', 'Municipal Solid Waste Segregation Edge AI', 'Optical sorting receptacle classifying dry vs wet waste.', 'Embedded optical sorting bin prototype.',
    'CITIZEN', 'RWA', 'SHORT_TERM', 'HIGH', 'Indore',
    '["AI/ML", "Waste"]'::jsonb, 2, 'OPEN_TO_ALL', '[]'::jsonb, now() - interval '2 days'
);


INSERT INTO published_problem (
    problem_id, cycle_id, title, description, expected_outcome,
    source_bucket, sub_entity_type, urgency, severity, location,
    domains, evidence_count, access_rule, access_universities, published_at
) VALUES (
    '11111111-aaaa-4000-8000-000000000005', '22222222-bbbb-4000-8000-000000000005', 'AI-Driven Flood Level Forecasting for Brahmaputra', 'Predictive inundation modeling pipeline delivering advance flood warnings.', 'Dynamic evacuation routes.',
    'GOVT', 'DEPARTMENT', 'IMMEDIATE', 'CRITICAL', 'Assam',
    '["Disaster", "AI"]'::jsonb, 5, 'OPEN_TO_ALL', '[]'::jsonb, now() - interval '2 days'
);


INSERT INTO submission (
    submission_id, problem_id, submitter_participant_id,
    title, summary, status, review_round, decision_comment, decided_at, submitted_at
) VALUES (
    '33333333-cccc-4000-8000-000000000001', '11111111-aaaa-4000-8000-000000000001', 'a71a2e7b-b7d2-4837-9fe1-a1829aa7f611', 'VeloSense — Edge IMU & Camera Pipeline', 'TensorFlow Lite model.',
    'UNDER_REVIEW'::submission_status, 1, NULL, NULL, now() - interval '1 day'
);


INSERT INTO submission (
    submission_id, problem_id, submitter_participant_id,
    title, summary, status, review_round, decision_comment, decided_at, submitted_at
) VALUES (
    '33333333-cccc-4000-8000-000000000002', '11111111-aaaa-4000-8000-000000000002', 'a71a2e7b-b7d2-4837-9fe1-a1829aa7f612', 'UrjaSetu — Smart Microgrid Peer Ledger', 'ESP32-based bidirectional metering node.',
    'RETURNED'::submission_status, 1, 'Please update schematics.', now() - interval '4 hours', now() - interval '1 day'
);


INSERT INTO submission (
    submission_id, problem_id, submitter_participant_id,
    title, summary, status, review_round, decision_comment, decided_at, submitted_at
) VALUES (
    '33333333-cccc-4000-8000-000000000003', '11111111-aaaa-4000-8000-000000000003', 'a71a2e7b-b7d2-4837-9fe1-a1829aa7f613', 'JalDrishti — Acoustic Mesh Pipeline', 'Low-frequency hydrophone array.',
    'ACCEPTED'::submission_status, 1, 'High feasibility. Accepted.', now() - interval '4 hours', now() - interval '1 day'
);


INSERT INTO submission (
    submission_id, problem_id, submitter_participant_id,
    title, summary, status, review_round, decision_comment, decided_at, submitted_at
) VALUES (
    '33333333-cccc-4000-8000-000000000004', '11111111-aaaa-4000-8000-000000000004', 'a71a2e7b-b7d2-4837-9fe1-a1829aa7f611', 'SwachhBin — Dual-Stream AI Sorter', 'Compact optical hopper.',
    'SUBMITTED'::submission_status, 1, NULL, NULL, now() - interval '1 day'
);

