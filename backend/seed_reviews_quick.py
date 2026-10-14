#!/usr/bin/env python3
import subprocess
import json
import uuid

def run_psql(db, sql):
    cmd = ['docker', 'exec', '-i', '-e', 'PGCLIENTENCODING=UTF8', 'sih26043-pg', 'psql', '-v', 'ON_ERROR_STOP=1', '-U', 'sih', '-d', db]
    stmt = "SET client_encoding = 'UTF8';\n" + sql
    res = subprocess.run(cmd, input=stmt.encode('utf-8'), capture_output=True)
    if res.returncode != 0:
        print(f"Error in {db}:\nSTDOUT: {res.stdout.decode()}\nSTDERR: {res.stderr.decode()}")
        raise RuntimeError("SQL execution failed")
    return res.stdout.decode()

# 1. Fetch all problems from sih_problem in JSON
cmd = ['docker', 'exec', '-i', 'sih26043-pg', 'psql', '-U', 'sih', '-d', 'sih_problem', '-t', '-A', '-c', 
       "SELECT json_agg(t) FROM (SELECT problem_id, cycle_id, title, description, expected_outcome, source_bucket, sub_entity_type, urgency, severity, location_text, domain_names, access_rule FROM problem) t;"]
res = subprocess.run(cmd, capture_output=True)
problems = json.loads(res.stdout.decode())

print(f"Fetched {len(problems)} problems from sih_problem.")

# 2. Build multi-row INSERT for sih_portal.published_problem
rows = []
for p in problems:
    pid = p['problem_id']
    cid = p['cycle_id']
    title = p['title'].replace("'", "''")
    desc = p['description'].replace("'", "''")
    outcome = (p.get('expected_outcome') or '').replace("'", "''")
    bucket = p['source_bucket']
    sub_entity = p['sub_entity_type']
    urgency = p['urgency']
    severity = p['severity']
    loc = (p.get('location_text') or '').replace("'", "''")
    doms = json.dumps(p.get('domain_names') or [])
    rule = p['access_rule']
    rows.append(f"('{pid}', '{cid}', '{title}', '{desc}', '{outcome}', '{bucket}', '{sub_entity}', '{urgency}', '{severity}', '{loc}', '{doms}'::jsonb, 2, '{rule}', '[]'::jsonb, NOW() - interval '3 days')")

portal_seed_sql = f"""
DELETE FROM submission_file;
DELETE FROM submission;
DELETE FROM published_problem;

INSERT INTO published_problem (
    problem_id, cycle_id, title, description, expected_outcome,
    source_bucket, sub_entity_type, urgency, severity, location,
    domains, evidence_count, access_rule, access_universities, published_at
) VALUES
{','.join(rows)};
"""

priya_user_id = '1a1be98a-2239-4704-a1c9-abbec4ab8186'
priya_participant_id = 'a71a2e7b-b7d2-4837-9fe1-a1829aa7f61f'

participant_and_sub_sql = f"""
DELETE FROM participant WHERE user_id = '{priya_user_id}' AND participant_id != '{priya_participant_id}';
INSERT INTO participant (participant_id, user_id, participant_type, full_name, email, phone, institution_name)
VALUES ('{priya_participant_id}', '{priya_user_id}', 'STUDENT', 'Priya Sharma', 'priya@university.ac.in', '9876543210', 'Indian Institute of Science (IISc), Bengaluru')
ON CONFLICT (participant_id) DO UPDATE SET full_name = EXCLUDED.full_name, user_id = EXCLUDED.user_id, institution_name = EXCLUDED.institution_name;

INSERT INTO submission (submission_id, problem_id, submitter_participant_id, title, summary, github_url, status, review_round, submitted_at)
VALUES
('33333333-cccc-4000-8000-000000000001', '11111111-aaaa-4000-8000-000000000001', '{priya_participant_id}', 'VeloSense - Edge IMU & Camera Pipeline for Transit Buses', 'Lightweight TensorFlow Lite model running on Raspberry Pi 4 with MPU6050 accelerometer.', 'https://github.com/priya-sharma/velosense-pothole-telemetry', 'UNDER_REVIEW', 1, NOW() - interval '2 days'),
('33333333-cccc-4000-8000-000000000002', '11111111-aaaa-4000-8000-000000000002', '{priya_participant_id}', 'UrjaSetu - Smart Microgrid Peer Ledger', 'ESP32-based bidirectional metering node interfacing with an open-source consensus ledger.', 'https://github.com/priya-sharma/urja-setu-microgrid', 'RETURNED', 1, NOW() - interval '2 days'),
('33333333-cccc-4000-8000-000000000003', '11111111-aaaa-4000-8000-000000000003', '{priya_participant_id}', 'JalDrishti - Acoustic Mesh for Municipal Pipeline Surveillance', 'Low-frequency hydrophone array with digital bandpass filters distinguishing micro-leaks.', 'https://github.com/priya-sharma/jal-drishti-pipeline', 'ACCEPTED', 1, NOW() - interval '2 days'),
('33333333-cccc-4000-8000-000000000004', '11111111-aaaa-4000-8000-000000000004', '{priya_participant_id}', 'SwachhBin - Dual-Stream AI Waste Classification Bin', 'Compact optical hopper with motorized tilt tray, categorizing dry vs wet municipal waste in under 800ms.', 'https://github.com/priya-sharma/swachhbin-ai-sorter', 'SUBMITTED', 1, NOW() - interval '2 days'),
('33333333-cccc-4000-8000-000000000005', '11111111-aaaa-4000-8000-000000000006', '{priya_participant_id}', 'KrishiSheet - LoRa Mesh Cold Room Tracker', 'Battery-powered environmental telemetry beacon for cooperative cold stores.', 'https://github.com/priya-sharma/krishisheet-lora', 'ACCEPTED', 1, NOW() - interval '2 days'),
('33333333-cccc-4000-8000-000000000006', '11111111-aaaa-4000-8000-000000000007', '{priya_participant_id}', 'SwasthyaTablet - Offline Clinical Diagnostic Aide', 'FHIR-compliant decision companion for remote rural ASHA workers.', 'https://github.com/priya-sharma/swasthya-tablet', 'SUBMITTED', 1, NOW() - interval '2 days');
"""

run_psql('sih_portal', portal_seed_sql + participant_and_sub_sql)
print("Seeded sih_portal (published problems + student submissions).")

# 3. Seed project reviews in sih_eval
eval_sql = f"""
DELETE FROM project_review;

-- GOVT Reviews (Assigned to Government Evaluator de459150-5e08-4886-892e-2ce3fec658ac)
INSERT INTO project_review (project_review_id, submission_id, round, problem_id, cycle_id, evaluator_profile_id, reviewer_user_id, problem_title, submission_title, summary, github_url, status)
VALUES
('{str(uuid.uuid4())}', '33333333-cccc-4000-8000-000000000001', 1, '11111111-aaaa-4000-8000-000000000001', '22222222-bbbb-4000-8000-000000000001', 'de459150-5e08-4886-892e-2ce3fec658ac', '44444444-4444-4444-8444-444444444444', 'IoT-Enabled Pothole & Road Surface Telemetry System', 'VeloSense - Edge IMU & Camera Pipeline for Transit Buses', 'Lightweight TensorFlow Lite model running on Raspberry Pi 4.', 'https://github.com/priya-sharma/velosense-pothole-telemetry', 'ASSIGNED'),
('{str(uuid.uuid4())}', '33333333-cccc-4000-8000-000000000002', 1, '11111111-aaaa-4000-8000-000000000002', '22222222-bbbb-4000-8000-000000000002', 'de459150-5e08-4886-892e-2ce3fec658ac', '44444444-4444-4444-8444-444444444444', 'Decentralized Solar Microgrid Energy Trading for Rural Gram Panchayats', 'UrjaSetu - Smart Microgrid Peer Ledger', 'ESP32-based bidirectional metering node.', 'https://github.com/priya-sharma/urja-setu-microgrid', 'RETURNED');

-- INDUSTRY Reviews (Assigned to Industry Evaluator 5a3ed3bd-d43f-479b-8ffe-891176949380)
INSERT INTO project_review (project_review_id, submission_id, round, problem_id, cycle_id, evaluator_profile_id, reviewer_user_id, problem_title, submission_title, summary, github_url, status)
VALUES
('{str(uuid.uuid4())}', '33333333-cccc-4000-8000-000000000003', 1, '11111111-aaaa-4000-8000-000000000003', '22222222-bbbb-4000-8000-000000000003', '5a3ed3bd-d43f-479b-8ffe-891176949380', '55555555-5555-4555-8555-555555555551', 'Autonomous Water Pipeline Leakage & Contamination Detection Mesh', 'JalDrishti - Acoustic Mesh for Municipal Pipeline Surveillance', 'Low-frequency hydrophone array.', 'https://github.com/priya-sharma/jal-drishti-pipeline', 'ACCEPTED');

-- HEI Reviews (Assigned to HEI Evaluator 3b9d093e-03c0-48d4-8d75-56b84ac2df3e)
INSERT INTO project_review (project_review_id, submission_id, round, problem_id, cycle_id, evaluator_profile_id, reviewer_user_id, problem_title, submission_title, summary, github_url, status)
VALUES
('{str(uuid.uuid4())}', '33333333-cccc-4000-8000-000000000006', 1, '11111111-aaaa-4000-8000-000000000007', '22222222-bbbb-4000-8000-000000000007', '3b9d093e-03c0-48d4-8d75-56b84ac2df3e', '55555555-5555-4555-8555-555555555552', 'Zero-Latency Tele-Diagnosis Assistant for Remote Primary Health Centres (PHCs)', 'SwasthyaTablet - Offline Clinical Diagnostic Aide', 'FHIR-compliant decision companion.', 'https://github.com/priya-sharma/swasthya-tablet', 'ASSIGNED');

-- CITIZEN Reviews (Assigned to Citizen Evaluator b01ac6cb-723f-4d5b-98dc-22688bbcbfa2)
INSERT INTO project_review (project_review_id, submission_id, round, problem_id, cycle_id, evaluator_profile_id, reviewer_user_id, problem_title, submission_title, summary, github_url, status)
VALUES
('{str(uuid.uuid4())}', '33333333-cccc-4000-8000-000000000004', 1, '11111111-aaaa-4000-8000-000000000004', '22222222-bbbb-4000-8000-000000000004', 'b01ac6cb-723f-4d5b-98dc-22688bbcbfa2', '55555555-5555-4555-8555-555555555553', 'Municipal Solid Waste Segregation at Source using Edge AI Cameras', 'SwachhBin - Dual-Stream AI Waste Classification Bin', 'Compact optical hopper.', 'https://github.com/priya-sharma/swachhbin-ai-sorter', 'ASSIGNED');

-- COMMUNITY Reviews (Assigned to Community Evaluator 5c7e84bd-5299-4b5b-9990-7788a97d9212)
INSERT INTO project_review (project_review_id, submission_id, round, problem_id, cycle_id, evaluator_profile_id, reviewer_user_id, problem_title, submission_title, summary, github_url, status)
VALUES
('{str(uuid.uuid4())}', '33333333-cccc-4000-8000-000000000005', 1, '11111111-aaaa-4000-8000-000000000006', '22222222-bbbb-4000-8000-000000000006', '5c7e84bd-5299-4b5b-9990-7788a97d9212', '55555555-5555-4555-8555-555555555554', 'Affordable Cold-Storage Monitoring Mesh for Marginalised Vegetable Farmers', 'KrishiSheet - LoRa Mesh Cold Room Tracker', 'Battery-powered environmental telemetry.', 'https://github.com/priya-sharma/krishisheet-lora', 'ACCEPTED');
"""

run_psql('sih_eval', eval_sql)
print("Seeded sih_eval project reviews.")
print("ALL DONE!")
