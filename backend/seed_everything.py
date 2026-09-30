#!/usr/bin/env python3
"""
Comprehensive Seed Script for SIH26043
Creates multiple actors for every role, problems, submissions, evaluations, and registrations.
"""
import subprocess
import json
import uuid

def run_psql(db: str, sql: str):
    cmd = ["docker", "exec", "-i", "-e", "PGCLIENTENCODING=UTF8", "sih26043-pg", "psql", "-v", "ON_ERROR_STOP=1", "-U", "sih", "-d", db]
    res = subprocess.run(cmd, input=f"SET client_encoding = 'UTF8';\n{sql}".encode('utf-8'), capture_output=True)
    if res.returncode != 0:
        stdout_str = res.stdout.decode('utf-8', errors='replace')
        stderr_str = res.stderr.decode('utf-8', errors='replace')
        print(f"Error in {db}:\nSTDOUT: {stdout_str}\nSTDERR: {stderr_str}")
        raise RuntimeError(stderr_str)
    return res.stdout.decode('utf-8', errors='replace')

def seed_all():
    print("Seeding comprehensive demo data into SIH26043...")

    # Define standard UUIDs
    admin_id = "11111111-1111-4111-8111-111111111111"
    rev1_id = "22222222-2222-4222-8222-222222222221"
    rev2_id = "22222222-2222-4222-8222-222222222222"
    
    eval1_id = "44444444-4444-4444-8444-444444444441"
    eval2_id = "44444444-4444-4444-8444-444444444442"
    
    eval1_prof = "de459150-5e08-4886-892e-2ce3fec658a1"
    eval2_prof = "de459150-5e08-4886-892e-2ce3fec658a2"

    sub1_id = "1a1be98a-2239-4704-a1c9-abbec4ab8181" # Priya
    sub2_id = "1a1be98a-2239-4704-a1c9-abbec4ab8182" # Rahul
    sub3_id = "1a1be98a-2239-4704-a1c9-abbec4ab8183" # Anita

    sub1_part = "a71a2e7b-b7d2-4837-9fe1-a1829aa7f611"
    sub2_part = "a71a2e7b-b7d2-4837-9fe1-a1829aa7f612"
    sub3_part = "a71a2e7b-b7d2-4837-9fe1-a1829aa7f613"

    p_ids = [f"11111111-aaaa-4000-8000-0000000000{i:02d}" for i in range(1, 11)]
    c_ids = [f"22222222-bbbb-4000-8000-0000000000{i:02d}" for i in range(1, 11)]
    s_ids = [f"33333333-cccc-4000-8000-0000000000{i:02d}" for i in range(1, 11)]

    # ==========================
    # 1. SIH_SOURCE: Users & Registrations
    # ==========================
    print("Seeding sih_source (Users & KYC Registrations)...")
    run_psql("sih_source", """
        DELETE FROM source_registration;
        DELETE FROM users WHERE phone IN ('9800000001', '9820000001', '9820000002', '9700000001', '9700000002', '9876543211', '9876543212', '9876543213');
    """)

    users_sql = f"""
    INSERT INTO users (user_id, phone, email, role, kyc_status, created_at) VALUES 
    ('{admin_id}', '9800000001', 'admin@sih.gov.in', 'ADMIN', 'VERIFIED', now()),
    ('{rev1_id}', '9820000001', 'rev1@sih.gov.in', 'REVIEWER', 'VERIFIED', now()),
    ('{rev2_id}', '9820000002', 'rev2@sih.gov.in', 'REVIEWER', 'VERIFIED', now()),
    ('{eval1_id}', '9700000001', 'eval1@university.ac.in', 'EVALUATOR', 'VERIFIED', now()),
    ('{eval2_id}', '9700000002', 'eval2@industry.com', 'EVALUATOR', 'VERIFIED', now()),
    ('{sub1_id}', '9876543211', 'priya@university.ac.in', 'SUBMITTER', 'VERIFIED', now()),
    ('{sub2_id}', '9876543212', 'rahul@university.ac.in', 'SUBMITTER', 'VERIFIED', now()),
    ('{sub3_id}', '9876543213', 'anita@university.ac.in', 'SUBMITTER', 'VERIFIED', now())
    ON CONFLICT (user_id) DO UPDATE SET kyc_status = 'VERIFIED';
    """
    run_psql("sih_source", users_sql)

    registrations_data = [
        ("GOVT", "PRI", "UNDER_REVIEW", {"organizationName": "Khadur Sahib Gram Panchayat", "state": "Punjab", "district": "Tarn Taran", "contactPersonName": "Harpreet Singh"}, rev1_id, None),
        ("GOVT", "ULB", "SUBMITTED", {"organizationName": "Wani Municipal Council (ULB)", "state": "Maharashtra", "district": "Yavatmal", "contactPersonName": "Dr. Sneha K. Patil"}, rev2_id, None),
        ("COMMUNITY", "NGO", "ACTION_REQUIRED", {"organizationName": "Pune Green Earth Foundation", "state": "Maharashtra", "district": "Pune", "contactPersonName": "Ananya Joshi"}, rev1_id, "PFMS Bank passbook mandate requires signature of Authorized Secretary."),
        ("INDUSTRY", "STARTUP", "APPROVED", {"organizationName": "JalShakti Automation Labs Pvt Ltd", "state": "Rajasthan", "district": "Jaipur", "contactPersonName": "Vikramaditya Rathore"}, rev1_id, None),
    ]

    for reg in registrations_data:
        comment_val = f"'{reg[5]}'" if reg[5] else "NULL"
        payload_esc = json.dumps(reg[3]).replace("'", "''")
        run_psql("sih_source", f"""
        INSERT INTO source_registration (
            source_bucket, source_type, status, source_payload,
            submitted_by_user_id, assigned_reviewer_id, action_required_comment, submitted_at
        ) VALUES (
            '{reg[0]}'::source_bucket, '{reg[1]}'::sub_entity_type, '{reg[2]}'::registration_status,
            '{payload_esc}'::jsonb, '{sub3_id}', '{reg[4]}', {comment_val}, now() - interval '1 day'
        );
        """)

    # ==========================
    # 2. SIH_PORTAL: Participants, Problems, Submissions
    # ==========================
    print("Seeding sih_portal (Participants, Problems, Submissions)...")
    run_psql("sih_portal", """
        DELETE FROM submission_file;
        DELETE FROM submission;
        DELETE FROM published_problem;
    """)

    parts_sql = f"""
    INSERT INTO participant (participant_id, user_id, participant_type, full_name, email, phone) VALUES 
    ('{sub1_part}', '{sub1_id}', 'STUDENT', 'Priya Sharma', 'priya@university.ac.in', '9876543211'),
    ('{sub2_part}', '{sub2_id}', 'STUDENT', 'Rahul Verma', 'rahul@university.ac.in', '9876543212'),
    ('{sub3_part}', '{sub3_id}', 'STUDENT', 'Anita Desai', 'anita@university.ac.in', '9876543213')
    ON CONFLICT (participant_id) DO NOTHING;
    """
    run_psql("sih_portal", parts_sql)

    problems_data = [
        (p_ids[0], c_ids[0], "IoT-Enabled Pothole & Road Surface Telemetry System", "Edge-computing telemetry unit that maps pavement defects.", "Real-time mapping dashboard.", "GOVT", "ULB", "IMMEDIATE", "CRITICAL", "Bengaluru, Karnataka", '["IoT", "Computer Vision"]', 3, "OPEN_TO_ALL", '[]'),
        (p_ids[1], c_ids[1], "Decentralized Solar Microgrid Energy Trading", "Peer-to-peer microgrid controller enabling surplus energy trading.", "Smart-meter firmware.", "GOVT", "PRI", "SHORT_TERM", "HIGH", "Punjab", '["Clean Energy", "IoT"]', 2, "OPEN_TO_ALL", '[]'),
        (p_ids[2], c_ids[2], "Autonomous Water Pipeline Leakage Mesh", "Non-invasive acoustic sensor mesh for water leaks.", "Acoustic clamp-on leak detection sensor.", "INDUSTRY", "STARTUP", "IMMEDIATE", "CRITICAL", "Rajasthan", '["Water", "Sensors"]', 4, "OPEN_TO_ALL", '[]'),
        (p_ids[3], c_ids[3], "Municipal Solid Waste Segregation Edge AI", "Optical sorting receptacle classifying dry vs wet waste.", "Embedded optical sorting bin prototype.", "CITIZEN", "RWA", "SHORT_TERM", "HIGH", "Indore", '["AI/ML", "Waste"]', 2, "OPEN_TO_ALL", '[]'),
        (p_ids[4], c_ids[4], "AI-Driven Flood Level Forecasting for Brahmaputra", "Predictive inundation modeling pipeline delivering advance flood warnings.", "Dynamic evacuation routes.", "GOVT", "DEPARTMENT", "IMMEDIATE", "CRITICAL", "Assam", '["Disaster", "AI"]', 5, "OPEN_TO_ALL", '[]')
    ]

    for p in problems_data:
        run_psql("sih_portal", f"""
        INSERT INTO published_problem (
            problem_id, cycle_id, title, description, expected_outcome,
            source_bucket, sub_entity_type, urgency, severity, location,
            domains, evidence_count, access_rule, access_universities, published_at
        ) VALUES (
            '{p[0]}', '{p[1]}', '{p[2]}', '{p[3]}', '{p[4]}',
            '{p[5]}', '{p[6]}', '{p[7]}', '{p[8]}', '{p[9]}',
            '{p[10]}'::jsonb, {p[11]}, '{p[12]}', '{p[13]}'::jsonb, now() - interval '2 days'
        );
        """)

    submissions_data = [
        (s_ids[0], p_ids[0], sub1_part, "VeloSense — Edge IMU & Camera Pipeline", "TensorFlow Lite model.", "UNDER_REVIEW", 1, None),
        (s_ids[1], p_ids[1], sub2_part, "UrjaSetu — Smart Microgrid Peer Ledger", "ESP32-based bidirectional metering node.", "RETURNED", 1, "Please update schematics."),
        (s_ids[2], p_ids[2], sub3_part, "JalDrishti — Acoustic Mesh Pipeline", "Low-frequency hydrophone array.", "ACCEPTED", 1, "High feasibility. Accepted."),
        (s_ids[3], p_ids[3], sub1_part, "SwachhBin — Dual-Stream AI Sorter", "Compact optical hopper.", "SUBMITTED", 1, None),
    ]

    for s in submissions_data:
        dec_comment_val = f"'{s[7]}'" if s[7] else "NULL"
        dec_at_val = "now() - interval '4 hours'" if s[7] else "NULL"
        run_psql("sih_portal", f"""
        INSERT INTO submission (
            submission_id, problem_id, submitter_participant_id,
            title, summary, status, review_round, decision_comment, decided_at, submitted_at
        ) VALUES (
            '{s[0]}', '{s[1]}', '{s[2]}', '{s[3]}', '{s[4]}',
            '{s[5]}'::submission_status, {s[6]}, {dec_comment_val}, {dec_at_val}, now() - interval '1 day'
        );
        """)

    # ==========================
    # 3. SIH_EVAL: Evaluators, Cycles, Reviews
    # ==========================
    print("Seeding sih_eval (Evaluators, Cycles, Project Reviews)...")
    run_psql("sih_eval", """
        DELETE FROM project_review;
        DELETE FROM evaluation_cycle;
    """)

    run_psql("sih_eval", f"""
        INSERT INTO evaluator_profile (profile_id, user_id, evaluator_type, full_name, experience_years) VALUES 
        ('{eval1_prof}', '{eval1_id}', 'HEI', 'Dr. Demo Evaluator One', 10),
        ('{eval2_prof}', '{eval2_id}', 'INDUSTRY', 'Tech Lead Evaluator Two', 15)
        ON CONFLICT (user_id) DO NOTHING;
    """)

    cycles_data = [
        (c_ids[0], p_ids[0], "EVALUATION_COMPLETED", 84.50, 87.00, "P1", "now() - interval '3 days'", "now() - interval '1 day'"),
        (c_ids[1], p_ids[1], "EVALUATION_IN_PROGRESS", None, None, None, "now() - interval '5 hours'", "NULL"),
    ]

    for c in cycles_data:
        comp_val = c[7] if c[7] == "NULL" else f"{c[7]}"
        final_val = c[3] if c[3] is not None else "NULL"
        prio_val = c[4] if c[4] is not None else "NULL"
        band_val = f"'{c[5]}'::priority_band" if c[5] is not None else "NULL"
        run_psql("sih_eval", f"""
        INSERT INTO evaluation_cycle (
            cycle_id, problem_id, status, trigger_method, started_at, completed_at,
            final_score, priority_score, priority_band
        ) VALUES (
            '{c[0]}', '{c[1]}', '{c[2]}'::evaluation_status, 'ADMIN', {c[6]}, {comp_val},
            {final_val}, {prio_val}, {band_val}
        );
        """)

    reviews_data = [
        (str(uuid.uuid4()), s_ids[0], 1, p_ids[0], c_ids[0], eval1_prof, eval1_id, "IoT Pothole System", "VeloSense Pipeline", "ASSIGNED", None),
        (str(uuid.uuid4()), s_ids[1], 1, p_ids[1], c_ids[1], eval1_prof, eval1_id, "Solar Microgrid", "UrjaSetu Ledger", "RETURNED", "Update schematics"),
        (str(uuid.uuid4()), s_ids[2], 1, p_ids[2], c_ids[1], eval2_prof, eval2_id, "Acoustic Mesh", "JalDrishti", "ACCEPTED", "Great project"),
    ]

    for r in reviews_data:
        comment_val = f"'{r[10]}'" if r[10] else "NULL"
        decided_val = "now() - interval '2 hours'" if r[10] else "NULL"
        run_psql("sih_eval", f"""
        INSERT INTO project_review (
            project_review_id, submission_id, round, problem_id, cycle_id,
            evaluator_profile_id, reviewer_user_id, problem_title, submission_title,
            status, decision_comment, decided_at
        ) VALUES (
            '{r[0]}', '{r[1]}', {r[2]}, '{r[3]}', '{r[4]}',
            '{r[5]}', '{r[6]}', '{r[7]}', '{r[8]}',
            '{r[9]}'::project_review_status, {comment_val}, {decided_val}
        );
        """)

    print("ALL SEEDING COMPLETED SUCCESSFULLY!")

if __name__ == "__main__":
    seed_all()
