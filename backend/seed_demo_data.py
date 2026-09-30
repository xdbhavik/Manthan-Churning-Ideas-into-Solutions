#!/usr/bin/env python3
"""
Seed realistic demo data across SIH26043 databases:
1. sih_portal: 10 published problems + 4 submissions for student Priya Sharma
2. sih_eval: 4 evaluation cycles + 3 project reviews for demo evaluator
3. sih_source: 4 registrations in various states (SUBMITTED, UNDER_REVIEW, ACTION_REQUIRED, APPROVED)
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
    print("Seeding demo data into SIH26043...")

    # 1. First get Priya Sharma's participant_id and user_id from sih_portal
    out = run_psql("sih_portal", "SELECT participant_id, user_id FROM participant WHERE phone = '9876543210';")
    priya_participant_id = None
    priya_user_id = None
    for line in out.splitlines():
        parts = [p.strip() for p in line.split("|")]
        if len(parts) >= 2 and len(parts[0]) == 36:
            priya_participant_id = parts[0]
            priya_user_id = parts[1]
            break

    if not priya_participant_id:
        print("Priya Sharma participant not found, creating...")
        priya_user_id = "8e5fb907-bf8c-4a6f-a9a7-885963de32b9"
        priya_participant_id = "a71a2e7b-b7d2-4837-9fe1-a1829aa7f61f"
        run_psql("sih_portal", f"""
            INSERT INTO participant (participant_id, user_id, participant_type, full_name, email, phone)
            VALUES ('{priya_participant_id}', '{priya_user_id}', 'STUDENT', 'Priya Sharma', 'priya@university.ac.in', '9876543210')
            ON CONFLICT (participant_id) DO NOTHING;
        """)

    print(f"Priya Participant ID: {priya_participant_id}, User ID: {priya_user_id}")

    # Generate fixed predictable UUIDs for problems & cycles so relations are stable
    p_ids = [
        "11111111-aaaa-4000-8000-000000000001",
        "11111111-aaaa-4000-8000-000000000002",
        "11111111-aaaa-4000-8000-000000000003",
        "11111111-aaaa-4000-8000-000000000004",
        "11111111-aaaa-4000-8000-000000000005",
        "11111111-aaaa-4000-8000-000000000006",
        "11111111-aaaa-4000-8000-000000000007",
        "11111111-aaaa-4000-8000-000000000008",
        "11111111-aaaa-4000-8000-000000000009",
        "11111111-aaaa-4000-8000-000000000010",
    ]

    c_ids = [
        "22222222-bbbb-4000-8000-000000000001",
        "22222222-bbbb-4000-8000-000000000002",
        "22222222-bbbb-4000-8000-000000000003",
        "22222222-bbbb-4000-8000-000000000004",
        "22222222-bbbb-4000-8000-000000000005",
        "22222222-bbbb-4000-8000-000000000006",
        "22222222-bbbb-4000-8000-000000000007",
        "22222222-bbbb-4000-8000-000000000008",
        "22222222-bbbb-4000-8000-000000000009",
        "22222222-bbbb-4000-8000-000000000010",
    ]

    s_ids = [
        "33333333-cccc-4000-8000-000000000001",
        "33333333-cccc-4000-8000-000000000002",
        "33333333-cccc-4000-8000-000000000003",
        "33333333-cccc-4000-8000-000000000004",
    ]

    # Clean existing demo records in sih_portal to avoid conflicts
    run_psql("sih_portal", """
        DELETE FROM submission_file;
        DELETE FROM submission;
        DELETE FROM published_problem;
    """)

    # 2. Insert 10 Published Problems
    problems_data = [
        (
            p_ids[0], c_ids[0],
            "IoT-Enabled Pothole & Road Surface Telemetry System",
            "State transit buses across metropolitan areas frequently experience mechanical fatigue and passenger safety risks caused by undetected road surface deterioration. This challenge calls for an edge-computing telemetry unit that continuously maps pavement defects, potholes, and roughness indices in real-time.",
            "Real-time pavement defect GIS mapping dashboard with onboard IMU and camera sensors installed on municipal transit fleets.",
            "GOVT", "ULB", "IMMEDIATE", "CRITICAL", "Bengaluru, Karnataka",
            '["IoT", "Civic Tech", "Computer Vision"]', 3, "OPEN_TO_ALL", '[]'
        ),
        (
            p_ids[1], c_ids[1],
            "Decentralized Solar Microgrid Energy Trading for Rural Gram Panchayats",
            "Rural agriculture feeders face frequent voltage instability and transmission losses. Installing rooftop solar without smart local settlement limits community adoption. We need a peer-to-peer microgrid controller enabling surplus clean energy trading between agrarian households.",
            "Functional smart-meter microgrid controller firmware and tokenized energy barter settlement ledger.",
            "GOVT", "PRI", "SHORT_TERM", "HIGH", "Tarn Taran, Punjab",
            '["Clean Energy", "IoT", "Embedded Systems"]', 2, "OPEN_TO_ALL", '[]'
        ),
        (
            p_ids[2], c_ids[2],
            "Autonomous Water Pipeline Leakage & Contamination Detection Mesh",
            "Aging municipal drinking water networks suffer non-revenue water (NRW) losses exceeding 38% due to unmapped underground pinhole leaks and cross-contamination from adjacent drainage sewers. A non-invasive acoustic sensor mesh is needed.",
            "Low-cost acoustic clamp-on leak detection sensor node and predictive GIS leak location pipeline.",
            "INDUSTRY", "STARTUP", "IMMEDIATE", "CRITICAL", "Jaipur, Rajasthan",
            '["Water Resource Management", "Sensors", "Hardware"]', 4, "OPEN_TO_ALL", '[]'
        ),
        (
            p_ids[3], c_ids[3],
            "Municipal Solid Waste Segregation at Source using Edge AI Cameras",
            "Despite extensive public awareness campaigns, source waste segregation in residential colonies remains below 40%. The objective is to engineer an edge AI optical sorting receptacle capable of classifying dry recyclables, compostable organic waste, and biomedical waste at the point of disposal.",
            "Embedded optical sorting bin prototype with automated flap mechanism and 95%+ multi-class sorting accuracy.",
            "CITIZEN", "RWA", "SHORT_TERM", "HIGH", "Indore, Madhya Pradesh",
            '["AI/ML", "Robotics", "Waste Management"]', 2, "OPEN_TO_ALL", '[]'
        ),
        (
            p_ids[4], c_ids[4],
            "AI-Driven Flood Level Forecasting & Evacuation Routing for Brahmaputra Basin",
            "Monsoon flash floods in Assam displace thousands of riverside families with less than 6 hours warning. We require an ensemble hydrological forecasting model integrating satellite radar rainfall, upstream gauge heights, and digital elevation models.",
            "Predictive inundation modeling pipeline delivering 48-hour advance flood warnings and dynamic evacuation routes.",
            "GOVT", "DEPARTMENT", "IMMEDIATE", "CRITICAL", "Guwahati, Assam",
            '["Disaster Management", "AI/ML", "GIS"]', 5, "UNIVERSITY_ONLY", '[]'
        ),
        (
            p_ids[5], c_ids[5],
            "Affordable Cold-Storage Monitoring Mesh for Marginalised Vegetable Farmers",
            "Post-harvest vegetable loss exceeds 22% among marginal farmers due to lack of real-time temperature, humidity, and ethylene gas tracking in rural cooperative aggregators.",
            "Ultra-low-power LoRa sensor nodes with SMS alerts to farmer producer companies (FPCs) when spoilage thresholds are breached.",
            "COMMUNITY", "SHG", "SHORT_TERM", "MEDIUM", "Nashik, Maharashtra",
            '["Agriculture", "IoT", "Supply Chain"]', 1, "OPEN_TO_ALL", '[]'
        ),
        (
            p_ids[6], c_ids[6],
            "Zero-Latency Tele-Diagnosis Assistant for Remote Primary Health Centres (PHCs)",
            "Tribal primary health centres often lack resident specialists. An offline-capable diagnostic companion is required to assist ASHA health workers in analyzing digital stethoscopes, pulse oximeters, and basic ECG strips.",
            "Offline tablet diagnostic application with verified clinical triage decision-trees and HL7 FHIR sync.",
            "HEI", "UNIVERSITY", "IMMEDIATE", "HIGH", "Bastar, Chhattisgarh",
            '["Healthcare", "Telemedicine", "Edge Computing"]', 3, "SELECTED_UNIVERSITIES", '["COEP Technological University", "IIT Bombay", "NIT Raipur"]'
        ),
        (
            p_ids[7], c_ids[7],
            "Dynamic Traffic Signal Synchronization via Reinforcement Learning",
            "Fixed-timer traffic signals at high-density urban corridors cause fuel wastage and excessive emergency vehicle transit delays. This challenge seeks a reinforcement learning algorithm running on edge cameras at junction clusters.",
            "Adaptive multi-intersection signal control agent demonstrating 25% reduction in commuter delay times.",
            "INDUSTRY", "COMPANY", "SHORT_TERM", "MEDIUM", "Hyderabad, Telangana",
            '["Smart Cities", "AI/ML", "Reinforcement Learning"]', 2, "OPEN_TO_ALL", '[]'
        ),
        (
            p_ids[8], c_ids[8],
            "Bilingual Voice-Based Digital Literacy Assistant for Rural Senior Citizens",
            "Elderly citizens in rural areas face immense hurdles navigating Direct Benefit Transfer (DBT) and pension verification portals. We need a voice-first multilingual assistant supporting regional vernaculars with conversational grounding.",
            "Speech-to-intent navigation engine in Hindi and Bhojpuri helping rural senior citizens check pension statuses.",
            "CITIZEN", "INDIVIDUAL", "LONG_TERM", "LOW", "Varanasi, Uttar Pradesh",
            '["NLP", "Accessibility", "Voice Tech"]', 1, "OPEN_TO_ALL", '[]'
        ),
        (
            p_ids[9], c_ids[9],
            "Industrial Effluent Monitoring & Automatic Valve Cut-Off Telemetry",
            "Unscheduled chemical effluent releases into river tributaries violate CPCB standards and harm downstream irrigation. We require a tamper-proof spectral absorption optical sensor with cellular telemetry and failsafe valve shutoff.",
            "Tamper-proof industrial effluent monitoring unit with automated cut-off valve solenoid trigger and audit ledger.",
            "INDUSTRY", "MSME", "IMMEDIATE", "HIGH", "Vapi, Gujarat",
            '["Environmental Tech", "IoT", "Hardware"]', 4, "UNIVERSITY_ONLY", '[]'
        ),
    ]

    for p in problems_data:
        title_esc = p[2].replace("'", "''")
        desc_esc = p[3].replace("'", "''")
        out_esc = p[4].replace("'", "''")
        sql = f"""
        INSERT INTO published_problem (
            problem_id, cycle_id, title, description, expected_outcome,
            source_bucket, sub_entity_type, urgency, severity, location,
            domains, evidence_count, access_rule, access_universities, published_at
        ) VALUES (
            '{p[0]}', '{p[1]}', '{title_esc}', '{desc_esc}', '{out_esc}',
            '{p[5]}', '{p[6]}', '{p[7]}', '{p[8]}', '{p[9]}',
            '{p[10]}'::jsonb, {p[11]}, '{p[12]}', '{p[13]}'::jsonb, now() - interval '2 days'
        );
        """
        run_psql("sih_portal", sql)

    print("Seeded 10 published problems into sih_portal.")

    # 3. Insert Submissions for Priya Sharma across various lifecycle states
    submissions_data = [
        (
            s_ids[0], p_ids[0], priya_participant_id,
            "VeloSense — Edge IMU & Camera Pipeline for Transit Buses",
            "Lightweight TensorFlow Lite model running on Raspberry Pi 4 with MPU6050 accelerometer, streaming geo-tagged road defects over 4G.",
            "https://github.com/priya-sharma/velosense-pothole-telemetry",
            "UNDER_REVIEW", 1, None
        ),
        (
            s_ids[1], p_ids[1], priya_participant_id,
            "UrjaSetu — Smart Microgrid Peer Ledger",
            "ESP32-based bidirectional metering node interfacing with an open-source consensus ledger for local power settlement.",
            "https://github.com/priya-sharma/urja-setu-microgrid",
            "RETURNED", 1, "Please update the hardware circuit schematics to include anti-islanding protection and resubmit in Round 2."
        ),
        (
            s_ids[2], p_ids[2], priya_participant_id,
            "JalDrishti — Acoustic Mesh for Municipal Pipeline Surveillance",
            "Low-frequency hydrophone array with digital bandpass filters distinguishing micro-leaks from turbulent pipe flow.",
            "https://github.com/priya-sharma/jal-drishti-pipeline",
            "ACCEPTED", 1, "High feasibility and excellent preliminary sensor benchmark data. Accepted for Phase 3 prototype funding."
        ),
        (
            s_ids[3], p_ids[3], priya_participant_id,
            "SwachhBin — Dual-Stream AI Waste Classification Bin",
            "Compact optical hopper with motorized tilt tray, categorizing dry vs wet municipal waste in under 800ms.",
            "https://github.com/priya-sharma/swachhbin-ai-sorter",
            "SUBMITTED", 1, None
        ),
    ]

    for s in submissions_data:
        title_esc = s[3].replace("'", "''")
        sum_esc = s[4].replace("'", "''")
        dec_comment_esc = s[8].replace("'", "''") if s[8] else None
        dec_comment_val = f"'{dec_comment_esc}'" if dec_comment_esc else "NULL"
        dec_at_val = "now() - interval '4 hours'" if dec_comment_esc else "NULL"
        sql = f"""
        INSERT INTO submission (
            submission_id, problem_id, submitter_participant_id,
            title, summary, github_url, status, review_round,
            decision_comment, decided_at, submitted_at
        ) VALUES (
            '{s[0]}', '{s[1]}', '{s[2]}',
            '{title_esc}', '{sum_esc}', '{s[5]}',
            '{s[6]}'::submission_status, {s[7]},
            {dec_comment_val}, {dec_at_val}, now() - interval '1 day'
        );
        """
        run_psql("sih_portal", sql)

    print("Seeded 4 submissions for Priya Sharma into sih_portal.")

    # 4. Seed Evaluation Cycles and Project Reviews in sih_eval
    run_psql("sih_eval", """
        DELETE FROM project_review;
        DELETE FROM evaluation_cycle;
    """)

    # Seed 4 evaluation cycles
    cycles_data = [
        (c_ids[0], p_ids[0], "EVALUATION_COMPLETED", 84.50, 87.00, "P1", "now() - interval '3 days'", "now() - interval '1 day'"),
        (c_ids[1], p_ids[1], "EVALUATION_IN_PROGRESS", None, None, None, "now() - interval '5 hours'", "NULL"),
        (c_ids[2], p_ids[2], "SCORES_AGGREGATED", 79.20, 81.00, "P2", "now() - interval '2 days'", "now() - interval '6 hours'"),
        (c_ids[3], p_ids[3], "PRIORITIZED", 88.00, 91.50, "P1", "now() - interval '1 day'", "now() - interval '2 hours'"),
    ]

    for c in cycles_data:
        comp_val = c[7] if c[7] == "NULL" else f"{c[7]}"
        final_val = c[3] if c[3] is not None else "NULL"
        prio_val = c[4] if c[4] is not None else "NULL"
        band_val = f"'{c[5]}'::priority_band" if c[5] is not None else "NULL"
        sql = f"""
        INSERT INTO evaluation_cycle (
            cycle_id, problem_id, status, trigger_method, started_at, completed_at,
            final_score, priority_score, priority_band
        ) VALUES (
            '{c[0]}', '{c[1]}', '{c[2]}'::evaluation_status, 'ADMIN', {c[6]}, {comp_val},
            {final_val}, {prio_val}, {band_val}
        );
        """
        run_psql("sih_eval", sql)

    print("Seeded evaluation cycles into sih_eval.")

    # Evaluator profile ID
    eval_profile_id = "de459150-5e08-4886-892e-2ce3fec658ac"
    eval_user_id = "44444444-4444-4444-8444-444444444444"

    # Insert Evaluator Profile
    run_psql("sih_eval", f"""
        INSERT INTO evaluator_profile (profile_id, user_id, evaluator_type, full_name, experience_years)
        VALUES ('{eval_profile_id}', '{eval_user_id}', 'HEI', 'Dr. Demo Evaluator', 10)
        ON CONFLICT (user_id) DO NOTHING;
    """)

    # Seed 3 Project Reviews for the evaluator
    reviews_data = [
        (
            str(uuid.uuid4()), s_ids[0], 1, p_ids[0], c_ids[0], eval_profile_id, eval_user_id,
            "IoT-Enabled Pothole & Road Surface Telemetry System",
            "VeloSense — Edge IMU & Camera Pipeline for Transit Buses",
            "Lightweight TensorFlow Lite model running on Raspberry Pi 4 with MPU6050 accelerometer, streaming geo-tagged road defects over 4G.",
            "https://github.com/priya-sharma/velosense-pothole-telemetry",
            "ASSIGNED", None
        ),
        (
            str(uuid.uuid4()), s_ids[1], 1, p_ids[1], c_ids[1], eval_profile_id, eval_user_id,
            "Decentralized Solar Microgrid Energy Trading for Rural Gram Panchayats",
            "UrjaSetu — Smart Microgrid Peer Ledger",
            "ESP32-based bidirectional metering node interfacing with an open-source consensus ledger for local power settlement.",
            "https://github.com/priya-sharma/urja-setu-microgrid",
            "RETURNED", "Please update the hardware circuit schematics to include anti-islanding protection and resubmit in Round 2."
        ),
        (
            str(uuid.uuid4()), s_ids[2], 1, p_ids[2], c_ids[2], eval_profile_id, eval_user_id,
            "Autonomous Water Pipeline Leakage & Contamination Detection Mesh",
            "JalDrishti — Acoustic Mesh for Municipal Pipeline Surveillance",
            "Low-frequency hydrophone array with digital bandpass filters distinguishing micro-leaks from turbulent pipe flow.",
            "https://github.com/priya-sharma/jal-drishti-pipeline",
            "ACCEPTED", "High feasibility and excellent preliminary sensor benchmark data. Accepted for Phase 3 prototype funding."
        ),
    ]

    for r in reviews_data:
        prob_title_esc = r[7].replace("'", "''")
        sub_title_esc = r[8].replace("'", "''")
        sum_esc = r[9].replace("'", "''")
        comment_esc = r[12].replace("'", "''") if r[12] else None
        comment_val = f"'{comment_esc}'" if comment_esc else "NULL"
        decided_val = "now() - interval '2 hours'" if comment_esc else "NULL"
        sql = f"""
        INSERT INTO project_review (
            project_review_id, submission_id, round, problem_id, cycle_id,
            evaluator_profile_id, reviewer_user_id, problem_title, submission_title,
            summary, github_url, status, decision_comment, decided_at
        ) VALUES (
            '{r[0]}', '{r[1]}', {r[2]}, '{r[3]}', '{r[4]}',
            '{r[5]}', '{r[6]}', '{prob_title_esc}', '{sub_title_esc}',
            '{sum_esc}', '{r[10]}', '{r[11]}'::project_review_status,
            {comment_val}, {decided_val}
        );
        """
        run_psql("sih_eval", sql)

    print("Seeded project reviews into sih_eval.")

    # 5. Seed Source Registrations in sih_source for Reviewer queue
    run_psql("sih_source", """
        DELETE FROM source_registration;
    """)

    submitter_user = "33333333-3333-4333-8333-333333333333"
    reviewer_user = "22222222-2222-4222-8222-222222222222"

    registrations_data = [
        (
            "GOVT", "PRI", "UNDER_REVIEW",
            json.dumps({
                "organizationName": "Khadur Sahib Gram Panchayat",
                "pan": "AAATK9012F",
                "dossierId": "#PRI-KYC-2024-88912",
                "state": "Punjab",
                "district": "Tarn Taran",
                "contactPersonName": "Harpreet Singh Dhillon (VDO)",
                "contactPhone": "9810081923"
            }),
            reviewer_user, None
        ),
        (
            "GOVT", "ULB", "SUBMITTED",
            json.dumps({
                "organizationName": "Wani Municipal Council (ULB)",
                "pan": "AAALW4421M",
                "dossierId": "#ULB-KYC-2024-55102",
                "state": "Maharashtra",
                "district": "Yavatmal",
                "contactPersonName": "Dr. Sneha K. Patil (Chief Officer)",
                "contactPhone": "9820011223"
            }),
            reviewer_user, None
        ),
        (
            "COMMUNITY", "NGO", "ACTION_REQUIRED",
            json.dumps({
                "organizationName": "Pune Green Earth Foundation",
                "pan": "AAACP1194E",
                "dossierId": "#NGO-KYC-2024-11823",
                "state": "Maharashtra",
                "district": "Pune",
                "contactPersonName": "Ananya Joshi (Director)",
                "contactPhone": "9833012948"
            }),
            reviewer_user, "PFMS Bank passbook mandate requires signature of Authorized Secretary."
        ),
        (
            "INDUSTRY", "STARTUP", "APPROVED",
            json.dumps({
                "organizationName": "JalShakti Automation Labs Pvt Ltd",
                "pan": "AAACJ8821K",
                "dossierId": "#STP-KYC-2024-99021",
                "state": "Rajasthan",
                "district": "Jaipur",
                "contactPersonName": "Vikramaditya Rathore (CTO)",
                "contactPhone": "9829011928"
            }),
            reviewer_user, None
        ),
    ]

    for reg in registrations_data:
        comment_esc = reg[5].replace("'", "''") if reg[5] else None
        comment_val = f"'{comment_esc}'" if comment_esc else "NULL"
        payload_esc = reg[3].replace("'", "''")
        sql = f"""
        INSERT INTO source_registration (
            source_bucket, source_type, status, source_payload,
            submitted_by_user_id, assigned_reviewer_id, action_required_comment,
            submitted_at
        ) VALUES (
            '{reg[0]}'::source_bucket, '{reg[1]}'::sub_entity_type, '{reg[2]}'::registration_status,
            '{payload_esc}'::jsonb, '{submitter_user}', '{reg[4]}', {comment_val},
            now() - interval '1 day'
        );
        """
        run_psql("sih_source", sql)

    print("Seeded source registrations into sih_source.")
    print("ALL SEEDING COMPLETED SUCCESSFULLY!")

if __name__ == "__main__":
    seed_all()
