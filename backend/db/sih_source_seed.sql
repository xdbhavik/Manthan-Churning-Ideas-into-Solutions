
DELETE FROM source_registration;
DELETE FROM users WHERE phone IN ('9800000001', '9820000001', '9820000002', '9700000001', '9700000002', '9876543211', '9876543212', '9876543213');


INSERT INTO users (user_id, phone, email, role, kyc_status, created_at) VALUES 
('11111111-1111-4111-8111-111111111111', '9800000001', 'admin@sih.gov.in', 'ADMIN', 'VERIFIED', now()),
('22222222-2222-4222-8222-222222222221', '9820000001', 'rev1@sih.gov.in', 'REVIEWER', 'VERIFIED', now()),
('22222222-2222-4222-8222-222222222222', '9820000002', 'rev2@sih.gov.in', 'REVIEWER', 'VERIFIED', now()),
('44444444-4444-4444-8444-444444444441', '9700000001', 'eval1@university.ac.in', 'EVALUATOR', 'VERIFIED', now()),
('44444444-4444-4444-8444-444444444442', '9700000002', 'eval2@industry.com', 'EVALUATOR', 'VERIFIED', now()),
('1a1be98a-2239-4704-a1c9-abbec4ab8181', '9876543211', 'priya@university.ac.in', 'SUBMITTER', 'VERIFIED', now()),
('1a1be98a-2239-4704-a1c9-abbec4ab8182', '9876543212', 'rahul@university.ac.in', 'SUBMITTER', 'VERIFIED', now()),
('1a1be98a-2239-4704-a1c9-abbec4ab8183', '9876543213', 'anita@university.ac.in', 'SUBMITTER', 'VERIFIED', now())
ON CONFLICT (user_id) DO UPDATE SET kyc_status = 'VERIFIED';


INSERT INTO source_registration (
    source_bucket, source_type, status, source_payload,
    submitted_by_user_id, assigned_reviewer_id, action_required_comment, submitted_at
) VALUES (
    'GOVT'::source_bucket, 'PRI'::sub_entity_type, 'UNDER_REVIEW'::registration_status,
    '{"organizationName": "Khadur Sahib Gram Panchayat", "state": "Punjab", "district": "Tarn Taran", "contactPersonName": "Harpreet Singh"}'::jsonb, '1a1be98a-2239-4704-a1c9-abbec4ab8183', '22222222-2222-4222-8222-222222222221', NULL, now() - interval '1 day'
);


INSERT INTO source_registration (
    source_bucket, source_type, status, source_payload,
    submitted_by_user_id, assigned_reviewer_id, action_required_comment, submitted_at
) VALUES (
    'GOVT'::source_bucket, 'ULB'::sub_entity_type, 'SUBMITTED'::registration_status,
    '{"organizationName": "Wani Municipal Council (ULB)", "state": "Maharashtra", "district": "Yavatmal", "contactPersonName": "Dr. Sneha K. Patil"}'::jsonb, '1a1be98a-2239-4704-a1c9-abbec4ab8183', '22222222-2222-4222-8222-222222222222', NULL, now() - interval '1 day'
);


INSERT INTO source_registration (
    source_bucket, source_type, status, source_payload,
    submitted_by_user_id, assigned_reviewer_id, action_required_comment, submitted_at
) VALUES (
    'COMMUNITY'::source_bucket, 'NGO'::sub_entity_type, 'ACTION_REQUIRED'::registration_status,
    '{"organizationName": "Pune Green Earth Foundation", "state": "Maharashtra", "district": "Pune", "contactPersonName": "Ananya Joshi"}'::jsonb, '1a1be98a-2239-4704-a1c9-abbec4ab8183', '22222222-2222-4222-8222-222222222221', 'PFMS Bank passbook mandate requires signature of Authorized Secretary.', now() - interval '1 day'
);


INSERT INTO source_registration (
    source_bucket, source_type, status, source_payload,
    submitted_by_user_id, assigned_reviewer_id, action_required_comment, submitted_at
) VALUES (
    'INDUSTRY'::source_bucket, 'STARTUP'::sub_entity_type, 'APPROVED'::registration_status,
    '{"organizationName": "JalShakti Automation Labs Pvt Ltd", "state": "Rajasthan", "district": "Jaipur", "contactPersonName": "Vikramaditya Rathore"}'::jsonb, '1a1be98a-2239-4704-a1c9-abbec4ab8183', '22222222-2222-4222-8222-222222222221', NULL, now() - interval '1 day'
);

