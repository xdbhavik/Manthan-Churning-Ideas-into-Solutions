#!/usr/bin/env python3
"""
Comprehensive Seed Script for SIH26043

Seeds realistic, interconnected dummy data across all databases:
1. sih_source:
   - Dev users (Admin, Reviewer, Submitters in varied states, Evaluators across 5 pools)
   - Verified ProblemSource & SourceAccount for primary Submitter
   - Reviewer queue dossiers in various states (SUBMITTED, UNDER_REVIEW, ACTION_REQUIRED, APPROVED)
2. sih_problem:
   - 12 real-world problem statements across all 5 source buckets (GOVT, INDUSTRY, HEI, CITIZEN, COMMUNITY)
   - Associated locations, domains, evidence attachments, and metadata
   - Submitted problems for primary Submitter
3. sih_eval:
   - Evaluation cycles for all 12 problems
   - Evaluator assignments strictly matching pool visibility:
     * GOVT problems -> GOVERNMENT evaluator ONLY (login 9700000001)
     * INDUSTRY problems -> INDUSTRY evaluator ONLY (login 9700000002)
     * HEI problems -> HEI evaluator ONLY (login 9700000003)
     * CITIZEN problems -> CITIZEN evaluator ONLY (login 9700000004)
     * COMMUNITY problems -> COMMUNITY evaluator ONLY (login 9700000005)
   - Mix of assignment states (ASSIGNED, IN_PROGRESS, SUBMITTED) per pool
   - Completed criterion scorecards for SUBMITTED assignments
   - Project reviews assigned to the matching pool evaluator
4. sih_portal:
   - 12 published problems with cycle linkages
   - Student participants (Priya Sharma, Rohan Mehta)
   - Submissions across various states (SUBMITTED, UNDER_REVIEW, ACCEPTED, RETURNED)
"""

import os
import subprocess
import json
import uuid

PG_HOST = os.environ.get("PGHOST")
PG_USER = os.environ.get("PGUSER", "sih")
PG_PASSWORD = os.environ.get("PGPASSWORD")
PG_PORT = os.environ.get("PGPORT", "5432")

def run_psql(db: str, sql: str) -> str:
    if PG_HOST:
        cmd = ["psql", "-v", "ON_ERROR_STOP=1", "-h", PG_HOST, "-p", str(PG_PORT), "-U", PG_USER, "-d", db]
        env = os.environ.copy()
        env["PGCLIENTENCODING"] = "UTF8"
        if PG_PASSWORD:
            env["PGPASSWORD"] = PG_PASSWORD
        res = subprocess.run(cmd, input=f"SET client_encoding = 'UTF8';\n{sql}".encode('utf-8'), capture_output=True, env=env)
    else:
        cmd = ["docker", "exec", "-i", "-e", "PGCLIENTENCODING=UTF8", "sih26043-pg", "psql", "-v", "ON_ERROR_STOP=1", "-U", "sih", "-d", db]
        input_bytes = f"SET client_encoding = 'UTF8';\n{sql}".encode('utf-8')
        res = subprocess.run(cmd, input=input_bytes, capture_output=True)
    stdout_str = res.stdout.decode('utf-8', errors='replace')
    stderr_str = res.stderr.decode('utf-8', errors='replace')
    if res.returncode != 0:
        print(f"Error in {db}:\nSTDOUT: {stdout_str}\nSTDERR: {stderr_str}")
        raise RuntimeError(stderr_str)
    return stdout_str

def seed_all():
    print("=====================================================================")
    print("  SIH26043 Comprehensive Multi-Portal Test Data Seeding")
    print("=====================================================================")

    # -------------------------------------------------------------------------
    # 0. Ensure Human Evaluator Profiles exist in sih_eval
    # -------------------------------------------------------------------------
    print("\n[Step 0] Ensuring active human evaluator profiles in sih_eval...")
    run_psql("sih_eval", """
        INSERT INTO evaluator_profile (profile_id, user_id, evaluator_type, full_name, organization, designation, experience_years, region_states, max_workload, is_active, is_system, created_at, updated_at, version)
        VALUES
          ('de459150-5e08-4886-892e-2ce3fec658ac', '44444444-4444-4444-8444-444444444444', 'GOVERNMENT', 'Government Evaluator', 'Govt of India', 'Director', 10, '[]'::jsonb, 5, true, false, NOW(), NOW(), 1),
          ('5a3ed3bd-d43f-479b-8ffe-891176949380', '55555555-5555-4555-8555-555555555551', 'INDUSTRY', 'Industry Evaluator', 'CII / Tech Labs', 'VP Technology', 12, '[]'::jsonb, 5, true, false, NOW(), NOW(), 1),
          ('3b9d093e-03c0-48d4-8d75-56b84ac2df3e', '55555555-5555-4555-8555-555555555552', 'HEI', 'HEI Evaluator', 'IIT Bombay', 'Professor', 15, '[]'::jsonb, 5, true, false, NOW(), NOW(), 1),
          ('b01ac6cb-723f-4d5b-98dc-22688bbcbfa2', '55555555-5555-4555-8555-555555555553', 'CITIZEN', 'Citizen Evaluator', 'Consumer Action Forum', 'Civic Lead', 8, '[]'::jsonb, 5, true, false, NOW(), NOW(), 1),
          ('5c7e84bd-5299-4b5b-9990-7788a97d9212', '55555555-5555-4555-8555-555555555554', 'COMMUNITY', 'Community Evaluator', 'Rural Development Trust', 'Community Coordinator', 9, '[]'::jsonb, 5, true, false, NOW(), NOW(), 1)
        ON CONFLICT (user_id) DO UPDATE SET is_active = true, is_system = false;
    """)
    profile_out = run_psql("sih_eval", """
        SELECT profile_id, user_id, evaluator_type
        FROM evaluator_profile
        WHERE user_id IN (
            '44444444-4444-4444-8444-444444444444',
            '55555555-5555-4555-8555-555555555551',
            '55555555-5555-4555-8555-555555555552',
            '55555555-5555-4555-8555-555555555553',
            '55555555-5555-4555-8555-555555555554'
        );
    """)
    eval_profiles = {}
    for line in profile_out.splitlines():
        parts = [p.strip() for p in line.split("|")]
        if len(parts) >= 3 and len(parts[0]) == 36:
            pid, uid, etype = parts[0], parts[1], parts[2]
            eval_profiles[etype] = {"profile_id": pid, "user_id": uid}
            print(f"  * {etype} pool -> Profile ID: {pid}, User ID: {uid}")

    required_pools = ["GOVERNMENT", "INDUSTRY", "HEI", "CITIZEN", "COMMUNITY"]
    for pool in required_pools:
        if pool not in eval_profiles:
            raise RuntimeError(f"Missing evaluator profile for pool: {pool}")

    # Fetch evaluation criteria for each pool to populate scorecards
    crit_out = run_psql("sih_eval", """
        SELECT criterion_id, evaluator_type, criterion_key, max_score
        FROM evaluation_criterion
        ORDER BY evaluator_type, sort_order;
    """)
    criteria_by_pool = {p: [] for p in required_pools}
    for line in crit_out.splitlines():
        parts = [p.strip() for p in line.split("|")]
        if len(parts) >= 4 and len(parts[0]) == 36:
            cid, etype, ckey, mscore = parts[0], parts[1], parts[2], int(parts[3])
            if etype in criteria_by_pool:
                criteria_by_pool[etype].append({"id": cid, "key": ckey, "max_score": mscore})

    # -------------------------------------------------------------------------
    # 1. sih_source Database
    # -------------------------------------------------------------------------
    print("\n[Step 1] Seeding sih_source (Users, Sources, Accounts, Reviewer Queue)...")

    # Clean existing volatile test records
    run_psql("sih_source", """
        DELETE FROM refresh_token;
        DELETE FROM otp_challenge;
        DELETE FROM idempotency_key;
        DELETE FROM registration_status_history;
        DELETE FROM source_account;
        DELETE FROM source_registration;
        DELETE FROM ulb_source;
        DELETE FROM government_source;
        DELETE FROM department_source;
        DELETE FROM pri_source;
        DELETE FROM industry_source;
        DELETE FROM hei_source;
        DELETE FROM community_source;
        DELETE FROM citizen_source;
        UPDATE users SET linked_source_id = NULL;
        DELETE FROM problem_source;
    """)

    # Ensure users exist
    submitter_1_id = "33333333-3333-4333-8333-333333333333" # 9900000001 (Verified Submitter)
    submitter_2_id = "33333333-3333-4333-8333-000000000002" # 9900000002 (Under Review Submitter)
    submitter_3_id = "33333333-3333-4333-8333-000000000003" # 9900000003 (Action Required Submitter)
    submitter_4_id = "33333333-3333-4333-8333-000000000004" # 9900000004 (Draft Submitter)
    submitter_5_id = "33333333-3333-4333-8333-000000000005" # 9900000005 (Fresh Submitter, no reg)
    submitter_6_id = "33333333-3333-4333-8333-000000000006" # 9900000006 (Indirapuram RWA)
    submitter_7_id = "33333333-3333-4333-8333-000000000007" # 9900000007 (Mahila Utkarsha SHG)
    reviewer_user_id = "22222222-2222-4222-8222-222222222222" # 9829858790 (Reviewer)

    users_sql = f"""
    INSERT INTO users (user_id, phone, email, role, kyc_status, created_at)
    VALUES
        ('11111111-1111-4111-8111-111111111111', '9800000001', 'admin@sih.local', 'ADMIN', 'UNVERIFIED', NOW()),
        ('{reviewer_user_id}', '9829858790', 'reviewer@sih.local', 'REVIEWER', 'UNVERIFIED', NOW()),
        ('{submitter_1_id}', '9900000001', 'submitter@sih.local', 'SUBMITTER', 'VERIFIED', NOW()),
        ('{submitter_2_id}', '9900000002', 'submitter2@sih.local', 'SUBMITTER', 'UNVERIFIED', NOW()),
        ('{submitter_3_id}', '9900000003', 'submitter3@sih.local', 'SUBMITTER', 'UNVERIFIED', NOW()),
        ('{submitter_4_id}', '9900000004', 'submitter4@sih.local', 'SUBMITTER', 'UNVERIFIED', NOW()),
        ('{submitter_5_id}', '9900000005', 'submitter5@sih.local', 'SUBMITTER', 'UNVERIFIED', NOW()),
        ('{submitter_6_id}', '9900000006', 'submitter6@sih.local', 'SUBMITTER', 'UNVERIFIED', NOW()),
        ('{submitter_7_id}', '9900000007', 'submitter7@sih.local', 'SUBMITTER', 'UNVERIFIED', NOW()),
        ('44444444-4444-4444-8444-444444444444', '9700000001', 'evaluator@sih.local', 'EVALUATOR', 'UNVERIFIED', NOW()),
        ('55555555-5555-4555-8555-555555555551', '9700000002', 'industry.evaluator@sih.local', 'EVALUATOR', 'UNVERIFIED', NOW()),
        ('55555555-5555-4555-8555-555555555552', '9700000003', 'hei.evaluator@sih.local', 'EVALUATOR', 'UNVERIFIED', NOW()),
        ('55555555-5555-4555-8555-555555555553', '9700000004', 'citizen.evaluator@sih.local', 'EVALUATOR', 'UNVERIFIED', NOW()),
        ('55555555-5555-4555-8555-555555555554', '9700000005', 'community.evaluator@sih.local', 'EVALUATOR', 'UNVERIFIED', NOW())
    ON CONFLICT (phone) DO UPDATE SET user_id = EXCLUDED.user_id, role = EXCLUDED.role, kyc_status = EXCLUDED.kyc_status;
    """
    run_psql("sih_source", users_sql)

    # 1a. Verified Problem Source & Account for Submitter 1 (BBMP ULB)
    primary_source_id = "44444444-aaaa-4000-8000-000000000001"
    primary_account_id = "55555555-aaaa-4000-8000-000000000001"
    primary_reg_id = "66666666-aaaa-4000-8000-000000000001"

    run_psql("sih_source", f"""
    INSERT INTO problem_source (
        source_id, bucket, sub_entity_type, contact_person_name, contact_email,
        contact_phone, organization_name, registration_number, is_verified_source, registered_at
    ) VALUES (
        '{primary_source_id}', 'GOVT', 'ULB', 'Dr. Rajesh Kumar, IAS', 'commissioner@bbmp.gov.in',
        '9900000001', 'Bruhat Bengaluru Mahanagara Palike (BBMP)', 'KA-ULB-BBMP-2024-001', true, NOW() - interval '30 days'
    );

    INSERT INTO government_source (
        source_id, gov_subtype, ministry_name, department_name, official_email_domain
    ) VALUES (
        '{primary_source_id}', 'ULB', 'Urban Development Department, Karnataka', 'Road & Infrastructure Cell', 'bbmp.gov.in'
    );

    INSERT INTO ulb_source (
        source_id, ulb_name, ulb_type, municipal_commissioner_name, municipal_commissioner_phone
    ) VALUES (
        '{primary_source_id}', 'Bruhat Bengaluru Mahanagara Palike', 'MUNICIPAL_CORPORATION', 'Dr. Rajesh Kumar, IAS', '9900000001'
    );

    UPDATE users SET linked_source_id = '{primary_source_id}', kyc_status = 'VERIFIED' WHERE user_id = '{submitter_1_id}';

    INSERT INTO source_registration (
        registration_id, source_bucket, source_type, status, source_payload,
        submitted_by_user_id, source_id, assigned_reviewer_id, submitted_at, reviewed_at
    ) VALUES (
        '{primary_reg_id}', 'GOVT', 'ULB', 'APPROVED',
        '{json.dumps({"organizationName": "Bruhat Bengaluru Mahanagara Palike", "pan": "AAABB1122C", "dossierId": "#BBMP-2024-001", "state": "Karnataka", "district": "Bengaluru Urban", "contactPersonName": "Dr. Rajesh Kumar, IAS", "contactPhone": "9900000001"})}',
        '{submitter_1_id}', '{primary_source_id}', '{reviewer_user_id}', NOW() - interval '30 days', NOW() - interval '29 days'
    );

    INSERT INTO source_account (
        source_account_id, owner_user_id, source_id, registration_id,
        source_bucket, source_type, display_name, status, verification_status, activated_at
    ) VALUES (
        '{primary_account_id}', '{submitter_1_id}', '{primary_source_id}', '{primary_reg_id}',
        'GOVT', 'ULB', 'Bruhat Bengaluru Mahanagara Palike (BBMP)', 'ACTIVE', 'VERIFIED', NOW() - interval '29 days'
    );
    """)

    # 1b. Additional Submitter accounts for testing all wizard and deficiency states
    reg_queue = [
        # Submitter 2: UNDER_REVIEW (tracking screen test)
        # Submitter 2: UNDER_REVIEW (tracking screen test)
        (
            "66666666-aaaa-4000-8000-000000000002", "GOVT", "PRI", "UNDER_REVIEW",
            json.dumps({
                "organizationName": "Khadur Sahib Gram Panchayat", "priName": "Khadur Sahib Gram Panchayat",
                "priLevel": "GRAM_PANCHAYAT", "pan": "AAATK9012F",
                "dossierId": "#PRI-KYC-2024-88912", "state": "Punjab", "district": "Tarn Taran",
                "contactPersonName": "Harpreet Singh Dhillon (VDO)", "contactPhone": "9900000002"
            }), submitter_2_id, reviewer_user_id, None
        ),
        # Submitter 3: ACTION_REQUIRED (deficiency screen test)
        (
            "66666666-aaaa-4000-8000-000000000003", "COMMUNITY", "NGO", "ACTION_REQUIRED",
            json.dumps({
                "organizationName": "Pune Green Earth Foundation", "pan": "AAACP1194E",
                "dossierId": "#NGO-KYC-2024-11823", "state": "Maharashtra", "district": "Pune",
                "contactPersonName": "Ananya Joshi (Director)", "contactPhone": "9900000003"
            }), submitter_3_id, reviewer_user_id, "PFMS Bank passbook mandate requires signature of Authorized Secretary."
        ),
        # Submitter 4: DRAFT (draft resumption test)
        (
            "66666666-aaaa-4000-8000-000000000004", "INDUSTRY", "STARTUP", "DRAFT",
            json.dumps({
                "organizationName": "JalShakti Automation Labs Pvt Ltd", "companyName": "JalShakti Automation Labs Pvt Ltd",
                "pan": "AAACJ8821K", "state": "Rajasthan", "district": "Jaipur",
                "contactPersonName": "Vikramaditya Rathore", "contactPhone": "9900000004"
            }), submitter_4_id, None, None
        ),
        # Reviewer queue item 1: SUBMITTED (Urban Local Body)
        (
            "66666666-aaaa-4000-8000-000000000005", "GOVT", "ULB", "SUBMITTED",
            json.dumps({
                "organizationName": "Wani Municipal Council", "ulbName": "Wani Municipal Council",
                "ulbType": "MUNICIPALITY", "pan": "AAALW4421M",
                "dossierId": "#ULB-KYC-2024-55102", "state": "Maharashtra", "district": "Yavatmal",
                "contactPersonName": "Dr. Sneha K. Patil (Chief Officer)", "contactPhone": "9820011223"
            }), submitter_2_id, reviewer_user_id, None
        ),
        # Reviewer queue item 2: SUBMITTED (HEI University)
        (
            "66666666-aaaa-4000-8000-000000000006", "HEI", "UNIVERSITY", "SUBMITTED",
            json.dumps({
                "organizationName": "Bastar Central University Research Cell", "institutionName": "Bastar Central University Research Cell",
                "pan": "AAABU7712K", "dossierId": "#HEI-KYC-2024-30114", "state": "Chhattisgarh", "district": "Bastar",
                "contactPersonName": "Prof. Arvind Netam (Registrar)", "contactPhone": "9877112233"
            }), submitter_2_id, reviewer_user_id, None
        ),
        # Reviewer queue item 3: UNDER_REVIEW (Citizen RWA)
        (
            "66666666-aaaa-4000-8000-000000000007", "CITIZEN", "RWA", "UNDER_REVIEW",
            json.dumps({
                "organizationName": "Indirapuram Residents Apex Association", "rwaName": "Indirapuram Residents Apex Association",
                "pan": "AAAAR3310N", "dossierId": "#RWA-KYC-2024-77291", "state": "Uttar Pradesh", "district": "Ghaziabad",
                "contactPersonName": "Sunil Verma (President)", "contactPhone": "9818822334"
            }), submitter_6_id, reviewer_user_id, None
        ),
        # Reviewer queue item 4: SUBMITTED (Community SHG)
        (
            "66666666-aaaa-4000-8000-000000000008", "COMMUNITY", "SHG", "SUBMITTED",
            json.dumps({
                "organizationName": "Mahila Utkarsha Self Help Federation", "shgName": "Mahila Utkarsha Self Help Federation",
                "pan": "AAAMU9921B", "dossierId": "#SHG-KYC-2024-99210", "state": "Maharashtra", "district": "Nashik",
                "contactPersonName": "Sunita Tai Deshmukh", "contactPhone": "9866112244"
            }), submitter_7_id, reviewer_user_id, None
        )
    ]

    reg_sqls = []
    for reg_id, bucket, stype, status, payload, sub_user, rev_user, comment in reg_queue:
        comment_val = f"'{comment.replace("'", "''")}'" if comment else "NULL"
        rev_val = f"'{rev_user}'" if rev_user else "NULL"
        reg_sqls.append(f"""
        INSERT INTO source_registration (
            registration_id, source_bucket, source_type, status, source_payload,
            submitted_by_user_id, assigned_reviewer_id, action_required_comment,
            submitted_at, created_at, updated_at
        ) VALUES (
            '{reg_id}', '{bucket}', '{stype}', '{status}', '{payload.replace("'", "''")}'::jsonb,
            '{sub_user}', {rev_val}, {comment_val},
            NOW() - interval '2 days', NOW() - interval '3 days', NOW() - interval '1 day'
        );
        """)
    run_psql("sih_source", "\n".join(reg_sqls))

    print(f"  [OK] Seeded primary submitter source account, plus {len(reg_queue)} queue items for reviewer portal.")

    # -------------------------------------------------------------------------
    # 2. Problem Definitions across all 5 Pools
    # -------------------------------------------------------------------------
    # Each problem has:
    # id, cycle_id, loc_id, bucket, sub_entity, urgency, severity, domain_id, title, desc, outcome, location_dict, access_rule
    problems_catalog = [
        # ---- GOVERNMENT POOL (3 problems) ----
        {
            "id": "11111111-aaaa-4000-8000-000000000001",
            "cycle_id": "22222222-bbbb-4000-8000-000000000001",
            "loc_id": "99999999-0000-4000-8000-000000000001",
            "bucket": "GOVT",
            "sub_entity": "ULB",
            "urgency": "IMMEDIATE",
            "severity": "CRITICAL",
            "domain_id": "00000000-0000-4000-8000-000000000005", # Transportation
            "domain_names": ["IoT", "Civic Tech", "Computer Vision"],
            "title": "IoT-Enabled Pothole & Road Surface Telemetry System",
            "desc": "State transit buses across metropolitan areas frequently experience mechanical fatigue and passenger safety risks caused by undetected road surface deterioration. This challenge calls for an edge-computing telemetry unit that continuously maps pavement defects, potholes, and roughness indices in real-time.",
            "outcome": "Real-time pavement defect GIS mapping dashboard with onboard IMU and camera sensors installed on municipal transit fleets.",
            "loc": {"country": "India", "state": "Karnataka", "district": "Bengaluru Urban", "lat": 12.9716, "lng": 77.5946, "text": "Bengaluru, Karnataka"},
            "access_rule": "OPEN_TO_ALL",
            "target_evaluator_type": "GOVERNMENT",
            "assignment_status": "ASSIGNED", # Open in queue for Evaluator to Accept/Decline
            "cycle_status": "EVALUATION_IN_PROGRESS"
        },
        {
            "id": "11111111-aaaa-4000-8000-000000000002",
            "cycle_id": "22222222-bbbb-4000-8000-000000000002",
            "loc_id": "99999999-0000-4000-8000-000000000002",
            "bucket": "GOVT",
            "sub_entity": "PRI",
            "urgency": "SHORT_TERM",
            "severity": "HIGH",
            "domain_id": "00000000-0000-4000-8000-000000000008", # Energy & Utilities
            "domain_names": ["Clean Energy", "IoT", "Embedded Systems"],
            "title": "Decentralized Solar Microgrid Energy Trading for Rural Gram Panchayats",
            "desc": "Rural agriculture feeders face frequent voltage instability and transmission losses. Installing rooftop solar without smart local settlement limits community adoption. We need a peer-to-peer microgrid controller enabling surplus clean energy trading between agrarian households.",
            "outcome": "Functional smart-meter microgrid controller firmware and tokenized energy barter settlement ledger.",
            "loc": {"country": "India", "state": "Punjab", "district": "Tarn Taran", "lat": 31.4518, "lng": 74.9288, "text": "Tarn Taran, Punjab"},
            "access_rule": "OPEN_TO_ALL",
            "target_evaluator_type": "GOVERNMENT",
            "assignment_status": "IN_PROGRESS", # In progress for Evaluator to submit scorecard
            "cycle_status": "EVALUATION_IN_PROGRESS"
        },
        {
            "id": "11111111-aaaa-4000-8000-000000000005",
            "cycle_id": "22222222-bbbb-4000-8000-000000000005",
            "loc_id": "99999999-0000-4000-8000-000000000005",
            "bucket": "GOVT",
            "sub_entity": "DEPARTMENT",
            "urgency": "IMMEDIATE",
            "severity": "CRITICAL",
            "domain_id": "00000000-0000-4000-8000-000000000007", # Environment & Climate
            "domain_names": ["Disaster Management", "AI/ML", "GIS"],
            "title": "AI-Driven Flood Level Forecasting & Evacuation Routing for Brahmaputra Basin",
            "desc": "Monsoon flash floods in Assam displace thousands of riverside families with less than 6 hours warning. We require an ensemble hydrological forecasting model integrating satellite radar rainfall, upstream gauge heights, and digital elevation models.",
            "outcome": "Predictive inundation modeling pipeline delivering 48-hour advance flood warnings and dynamic evacuation routes.",
            "loc": {"country": "India", "state": "Assam", "district": "Kamrup Metropolitan", "lat": 26.1445, "lng": 91.7362, "text": "Guwahati, Assam"},
            "access_rule": "UNIVERSITY_ONLY",
            "target_evaluator_type": "GOVERNMENT",
            "assignment_status": "SUBMITTED", # Completed scorecard
            "cycle_status": "EVALUATION_COMPLETED",
            "final_score": 88.0,
            "priority_band": "P1"
        },

        # ---- INDUSTRY POOL (3 problems) ----
        {
            "id": "11111111-aaaa-4000-8000-000000000003",
            "cycle_id": "22222222-bbbb-4000-8000-000000000003",
            "loc_id": "99999999-0000-4000-8000-000000000003",
            "bucket": "INDUSTRY",
            "sub_entity": "STARTUP",
            "urgency": "IMMEDIATE",
            "severity": "CRITICAL",
            "domain_id": "00000000-0000-4000-8000-000000000003", # Water & Sanitation
            "domain_names": ["Water Resource Management", "Sensors", "Hardware"],
            "title": "Autonomous Water Pipeline Leakage & Contamination Detection Mesh",
            "desc": "Aging municipal drinking water networks suffer non-revenue water (NRW) losses exceeding 38% due to unmapped underground pinhole leaks and cross-contamination from adjacent drainage sewers. A non-invasive acoustic sensor mesh is needed.",
            "outcome": "Low-cost acoustic clamp-on leak detection sensor node and predictive GIS leak location pipeline.",
            "loc": {"country": "India", "state": "Rajasthan", "district": "Jaipur", "lat": 26.9124, "lng": 75.7873, "text": "Jaipur, Rajasthan"},
            "access_rule": "OPEN_TO_ALL",
            "target_evaluator_type": "INDUSTRY",
            "assignment_status": "ASSIGNED", # Open in queue for Industry Evaluator
            "cycle_status": "EVALUATION_IN_PROGRESS"
        },
        {
            "id": "11111111-aaaa-4000-8000-000000000008",
            "cycle_id": "22222222-bbbb-4000-8000-000000000008",
            "loc_id": "99999999-0000-4000-8000-000000000008",
            "bucket": "INDUSTRY",
            "sub_entity": "COMPANY",
            "urgency": "SHORT_TERM",
            "severity": "MEDIUM",
            "domain_id": "00000000-0000-4000-8000-000000000005", # Transportation
            "domain_names": ["Smart Cities", "AI/ML", "Reinforcement Learning"],
            "title": "Dynamic Traffic Signal Synchronization via Reinforcement Learning",
            "desc": "Fixed-timer traffic signals at high-density urban corridors cause fuel wastage and excessive emergency vehicle transit delays. This challenge seeks a reinforcement learning algorithm running on edge cameras at junction clusters.",
            "outcome": "Adaptive multi-intersection signal control agent demonstrating 25% reduction in commuter delay times.",
            "loc": {"country": "India", "state": "Telangana", "district": "Hyderabad", "lat": 17.3850, "lng": 78.4867, "text": "Hyderabad, Telangana"},
            "access_rule": "OPEN_TO_ALL",
            "target_evaluator_type": "INDUSTRY",
            "assignment_status": "IN_PROGRESS",
            "cycle_status": "EVALUATION_IN_PROGRESS"
        },
        {
            "id": "11111111-aaaa-4000-8000-000000000010",
            "cycle_id": "22222222-bbbb-4000-8000-000000000010",
            "loc_id": "99999999-0000-4000-8000-000000000010",
            "bucket": "INDUSTRY",
            "sub_entity": "MSME",
            "urgency": "IMMEDIATE",
            "severity": "HIGH",
            "domain_id": "00000000-0000-4000-8000-000000000007", # Environment & Climate
            "domain_names": ["Environmental Tech", "IoT", "Hardware"],
            "title": "Industrial Effluent Monitoring & Automatic Valve Cut-Off Telemetry",
            "desc": "Unscheduled chemical effluent releases into river tributaries violate CPCB standards and harm downstream irrigation. We require a tamper-proof spectral absorption optical sensor with cellular telemetry and failsafe valve shutoff.",
            "outcome": "Tamper-proof industrial effluent monitoring unit with automated cut-off valve solenoid trigger and audit ledger.",
            "loc": {"country": "India", "state": "Gujarat", "district": "Valsad", "lat": 20.3718, "lng": 72.9042, "text": "Vapi, Gujarat"},
            "access_rule": "UNIVERSITY_ONLY",
            "target_evaluator_type": "INDUSTRY",
            "assignment_status": "SUBMITTED",
            "cycle_status": "EVALUATION_COMPLETED",
            "final_score": 84.5,
            "priority_band": "P1"
        },

        # ---- HEI POOL (2 problems) ----
        {
            "id": "11111111-aaaa-4000-8000-000000000007",
            "cycle_id": "22222222-bbbb-4000-8000-000000000007",
            "loc_id": "99999999-0000-4000-8000-000000000007",
            "bucket": "HEI",
            "sub_entity": "UNIVERSITY",
            "urgency": "IMMEDIATE",
            "severity": "HIGH",
            "domain_id": "00000000-0000-4000-8000-000000000001", # Healthcare
            "domain_names": ["Healthcare", "Telemedicine", "Edge Computing"],
            "title": "Zero-Latency Tele-Diagnosis Assistant for Remote Primary Health Centres (PHCs)",
            "desc": "Tribal primary health centres often lack resident specialists. An offline-capable diagnostic companion is required to assist ASHA health workers in analyzing digital stethoscopes, pulse oximeters, and basic ECG strips.",
            "outcome": "Offline tablet diagnostic application with verified clinical triage decision-trees and HL7 FHIR sync.",
            "loc": {"country": "India", "state": "Chhattisgarh", "district": "Bastar", "lat": 19.3649, "lng": 81.9547, "text": "Bastar, Chhattisgarh"},
            "access_rule": "SELECTED_UNIVERSITIES",
            "target_evaluator_type": "HEI",
            "assignment_status": "ASSIGNED", # Open in queue for HEI Evaluator
            "cycle_status": "EVALUATION_IN_PROGRESS"
        },
        {
            "id": "11111111-aaaa-4000-8000-000000000011",
            "cycle_id": "22222222-bbbb-4000-8000-000000000011",
            "loc_id": "99999999-0000-4000-8000-000000000011",
            "bucket": "HEI",
            "sub_entity": "RESEARCH_LAB",
            "urgency": "SHORT_TERM",
            "severity": "HIGH",
            "domain_id": "00000000-0000-4000-8000-000000000002", # Agriculture
            "domain_names": ["Precision Agriculture", "Spectroscopy", "Embedded Hardware"],
            "title": "Portable Optical Micro-Spectrometer for High-Throughput Soil NPK Profiling",
            "desc": "Traditional chemical lab soil health card testing takes up to 3 weeks, leading farmers to apply generic urea blends that degrade topsoil microbiome. A handheld NIR reflectance spectrometer provides immediate N-P-K nutrient quantitation.",
            "outcome": "Calibrated portable spectrometer prototype delivering soil NPK estimations within 90 seconds with 85%+ chemical lab concordance.",
            "loc": {"country": "India", "state": "Maharashtra", "district": "Pune", "lat": 18.5204, "lng": 73.8567, "text": "Pune, Maharashtra"},
            "access_rule": "OPEN_TO_ALL",
            "target_evaluator_type": "HEI",
            "assignment_status": "SUBMITTED",
            "cycle_status": "EVALUATION_COMPLETED",
            "final_score": 91.2,
            "priority_band": "P1"
        },

        # ---- CITIZEN POOL (2 problems) ----
        {
            "id": "11111111-aaaa-4000-8000-000000000004",
            "cycle_id": "22222222-bbbb-4000-8000-000000000004",
            "loc_id": "99999999-0000-4000-8000-000000000004",
            "bucket": "CITIZEN",
            "sub_entity": "RWA",
            "urgency": "SHORT_TERM",
            "severity": "HIGH",
            "domain_id": "00000000-0000-4000-8000-000000000007", # Environment & Climate
            "domain_names": ["AI/ML", "Robotics", "Waste Management"],
            "title": "Municipal Solid Waste Segregation at Source using Edge AI Cameras",
            "desc": "Despite extensive public awareness campaigns, source waste segregation in residential colonies remains below 40%. The objective is to engineer an edge AI optical sorting receptacle capable of classifying dry recyclables, compostable organic waste, and biomedical waste at the point of disposal.",
            "outcome": "Embedded optical sorting bin prototype with automated flap mechanism and 95%+ multi-class sorting accuracy.",
            "loc": {"country": "India", "state": "Madhya Pradesh", "district": "Indore", "lat": 22.7196, "lng": 75.8577, "text": "Indore, Madhya Pradesh"},
            "access_rule": "OPEN_TO_ALL",
            "target_evaluator_type": "CITIZEN",
            "assignment_status": "ASSIGNED", # Open in queue for Citizen Evaluator
            "cycle_status": "EVALUATION_IN_PROGRESS"
        },
        {
            "id": "11111111-aaaa-4000-8000-000000000009",
            "cycle_id": "22222222-bbbb-4000-8000-000000000009",
            "loc_id": "99999999-0000-4000-8000-000000000009",
            "bucket": "CITIZEN",
            "sub_entity": "INDIVIDUAL",
            "urgency": "LONG_TERM",
            "severity": "LOW",
            "domain_id": "00000000-0000-4000-8000-000000000009", # Digital & e-Gov
            "domain_names": ["NLP", "Accessibility", "Voice Tech"],
            "title": "Bilingual Voice-Based Digital Literacy Assistant for Rural Senior Citizens",
            "desc": "Elderly citizens in rural areas face immense hurdles navigating Direct Benefit Transfer (DBT) and pension verification portals. We need a voice-first multilingual assistant supporting regional vernaculars with conversational grounding.",
            "outcome": "Speech-to-intent navigation engine in Hindi and Bhojpuri helping rural senior citizens check pension statuses.",
            "loc": {"country": "India", "state": "Uttar Pradesh", "district": "Varanasi", "lat": 25.3176, "lng": 82.9739, "text": "Varanasi, Uttar Pradesh"},
            "access_rule": "OPEN_TO_ALL",
            "target_evaluator_type": "CITIZEN",
            "assignment_status": "SUBMITTED",
            "cycle_status": "EVALUATION_COMPLETED",
            "final_score": 78.5,
            "priority_band": "P2"
        },

        # ---- COMMUNITY POOL (2 problems) ----
        {
            "id": "11111111-aaaa-4000-8000-000000000006",
            "cycle_id": "22222222-bbbb-4000-8000-000000000006",
            "loc_id": "99999999-0000-4000-8000-000000000006",
            "bucket": "COMMUNITY",
            "sub_entity": "SHG",
            "urgency": "SHORT_TERM",
            "severity": "MEDIUM",
            "domain_id": "00000000-0000-4000-8000-000000000002", # Agriculture & Food
            "domain_names": ["Agriculture", "IoT", "Supply Chain"],
            "title": "Affordable Cold-Storage Monitoring Mesh for Marginalised Vegetable Farmers",
            "desc": "Post-harvest vegetable loss exceeds 22% among marginal farmers due to lack of real-time temperature, humidity, and ethylene gas tracking in rural cooperative aggregators.",
            "outcome": "Ultra-low-power LoRa sensor nodes with SMS alerts to farmer producer companies (FPCs) when spoilage thresholds are breached.",
            "loc": {"country": "India", "state": "Maharashtra", "district": "Nashik", "lat": 19.9975, "lng": 73.7898, "text": "Nashik, Maharashtra"},
            "access_rule": "OPEN_TO_ALL",
            "target_evaluator_type": "COMMUNITY",
            "assignment_status": "ASSIGNED", # Open in queue for Community Evaluator
            "cycle_status": "EVALUATION_IN_PROGRESS"
        },
        {
            "id": "11111111-aaaa-4000-8000-000000000012",
            "cycle_id": "22222222-bbbb-4000-8000-000000000012",
            "loc_id": "99999999-0000-4000-8000-000000000012",
            "bucket": "COMMUNITY",
            "sub_entity": "NGO",
            "urgency": "IMMEDIATE",
            "severity": "HIGH",
            "domain_id": "00000000-0000-4000-8000-000000000003", # Water & Sanitation
            "domain_names": ["Hydrogeology", "Community Action", "Water Security"],
            "title": "Participatory Spring-Shed Hydrogeology Monitoring for Himalayan Hill Hamlets",
            "desc": "Over 50% of Himalayan perennial mountain springs have experienced declining discharge or seasonal drying. Rural mountain communities require a lightweight sensor and citizen-science hydrogeology logging tool to map aquifer recharge zones.",
            "outcome": "Offline mobile water discharge ledger and telemetry recharge-zone demarcation dashboard for hill village panchayats.",
            "loc": {"country": "India", "state": "Himachal Pradesh", "district": "Shimla", "lat": 31.1048, "lng": 77.1734, "text": "Shimla, Himachal Pradesh"},
            "access_rule": "OPEN_TO_ALL",
            "target_evaluator_type": "COMMUNITY",
            "assignment_status": "SUBMITTED",
            "cycle_status": "EVALUATION_COMPLETED",
            "final_score": 86.4,
            "priority_band": "P1"
        }
    ]

    # -------------------------------------------------------------------------
    # 3. Seed sih_problem Database
    # -------------------------------------------------------------------------
    print("\n[Step 2] Seeding sih_problem (Locations, Canonical Problems, Evidence, Domains)...")
    run_psql("sih_problem", """
        DELETE FROM evidence;
        DELETE FROM problem_domain;
        DELETE FROM audit_log;
        DELETE FROM problem;
        DELETE FROM location;
    """)

    prob_sqls = []
    for p in problems_catalog:
        loc = p["loc"]
        # 1. Insert Location
        prob_sqls.append(f"""
        INSERT INTO location (location_id, country, state, district, latitude, longitude)
        VALUES ('{p["loc_id"]}', '{loc["country"]}', '{loc["state"]}', '{loc["district"]}', {loc["lat"]}, {loc["lng"]});
        """)

        # 2. Insert Problem
        title_esc = p["title"].replace("'", "''")
        desc_esc = p["desc"].replace("'", "''")
        outcome_esc = p["outcome"].replace("'", "''")
        submitter_id = submitter_1_id if p["bucket"] == "GOVT" else "NULL"
        source_id = primary_source_id if p["bucket"] == "GOVT" else str(uuid.uuid4())
        account_id = f"'{primary_account_id}'" if p["bucket"] == "GOVT" else "NULL"
        sub_user_val = f"'{submitter_1_id}'" if p["bucket"] == "GOVT" else "NULL"

        prob_sqls.append(f"""
        INSERT INTO problem (
            problem_id, title, description, source_bucket, sub_entity_type,
            status, urgency, severity, source_id, source_account_id,
            location_id, affected_population, expected_outcome,
            submitted_at, updated_at, submitted_by_user_id, access_rule, access_universities
        ) VALUES (
            '{p["id"]}', '{title_esc}', '{desc_esc}', '{p["bucket"]}', '{p["sub_entity"]}',
            'REGISTERED', '{p["urgency"]}', '{p["severity"]}', '{source_id}', {account_id},
            '{p["loc_id"]}', 250000, '{outcome_esc}',
            NOW() - interval '5 days', NOW() - interval '2 days', {sub_user_val},
            '{p["access_rule"]}', '[]'::jsonb
        );
        INSERT INTO problem_domain (problem_id, domain_id, is_primary)
        VALUES ('{p["id"]}', '{p["domain_id"]}', true)
        ON CONFLICT DO NOTHING;
        INSERT INTO evidence (evidence_id, problem_id, evidence_type, file_url, file_hash)
        VALUES
            ('{str(uuid.uuid4())}', '{p["id"]}', 'DOCUMENT', 'https://sih.gov.in/evidence/{p["id"]}/feasibility_report.pdf', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'),
            ('{str(uuid.uuid4())}', '{p["id"]}', 'DATASET', 'https://sih.gov.in/evidence/{p["id"]}/baseline_sensor_metrics.csv', 'b5a2c94298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b999');
        """)

    run_psql("sih_problem", "\n".join(prob_sqls))

    print(f"  [OK] Seeded {len(problems_catalog)} canonical problem records with locations & evidence in sih_problem.")

    # -------------------------------------------------------------------------
    # 4. Seed sih_eval Database (Cycles, Strict Pool Assignments, Scorecards)
    # -------------------------------------------------------------------------
    print("\n[Step 3] Seeding sih_eval with STRICT Evaluator Pool Visibility...")
    run_psql("sih_eval", """
        DELETE FROM evaluation_response;
        DELETE FROM evaluation_assignment;
        DELETE FROM project_review;
        DELETE FROM evaluation_cycle;
    """)

    eval_sqls = []
    for p in problems_catalog:
        c_id = p["cycle_id"]
        p_id = p["id"]
        target_pool = p["target_evaluator_type"]
        evaluator_info = eval_profiles[target_pool]
        eval_profile_id = evaluator_info["profile_id"]
        eval_user_id = evaluator_info["user_id"]
        cycle_status = p["cycle_status"]

        final_val = f"{p['final_score']}" if "final_score" in p else "NULL"
        prio_score_val = f"{p['final_score']}" if "final_score" in p else "NULL"
        prio_band_val = f"'{p['priority_band']}'::priority_band" if "priority_band" in p else "NULL"
        completed_val = "NOW() - interval '1 day'" if cycle_status == "EVALUATION_COMPLETED" else "NULL"

        # 1. Insert Evaluation Cycle
        eval_sqls.append(f"""
        INSERT INTO evaluation_cycle (
            cycle_id, problem_id, status, trigger_method, started_at, completed_at,
            final_score, priority_score, priority_band
        ) VALUES (
            '{c_id}', '{p_id}', '{cycle_status}'::evaluation_status, 'ADMIN',
            NOW() - interval '4 days', {completed_val},
            {final_val}, {prio_score_val}, {prio_band_val}
        );
        """)

        # 2. Insert Evaluation Assignment — VISIBLE ONLY TO THE MATCHING EVALUATOR!
        asn_id = str(uuid.uuid4())
        asn_status = p["assignment_status"]
        submitted_at_val = "NOW() - interval '1 day'" if asn_status == "SUBMITTED" else "NULL"

        eval_sqls.append(f"""
        INSERT INTO evaluation_assignment (
            assignment_id, cycle_id, evaluator_profile_id, status,
            assigned_at, deadline, submitted_at, feedback, recommendation
        ) VALUES (
            '{asn_id}', '{c_id}', '{eval_profile_id}', '{asn_status}'::assignment_status,
            NOW() - interval '3 days', NOW() + interval '5 days', {submitted_at_val},
            'Evaluated under strict pool governance guidelines. Robust technical justification and clear impact.',
            'RECOMMENDED FOR PHASE 3 PILOT'
        );
        """)

        # 3. For SUBMITTED assignments: populate criterion scores in evaluation_response
        if asn_status == "SUBMITTED":
            pool_criteria = criteria_by_pool.get(target_pool, [])
            for c in pool_criteria:
                cid = c["id"]
                score = min(c["max_score"], 8) # realistic score
                eval_sqls.append(f"""
                INSERT INTO evaluation_response (
                    assignment_id, criterion_id, score, comment, score_source
                ) VALUES (
                    '{asn_id}', '{cid}', {score}, 'Criteria satisfactorily met based on submitted documentation and impact scope.', 'HUMAN'
                ) ON CONFLICT DO NOTHING;
                """)

    run_psql("sih_eval", "\n".join(eval_sqls))

    print(f"  [OK] Seeded {len(problems_catalog)} cycles & strictly-partitioned assignments in sih_eval.")

    # -------------------------------------------------------------------------
    # 5. Seed sih_portal Database (Published Problems, Participants, Submissions)
    # -------------------------------------------------------------------------
    print("\n[Step 4] Seeding sih_portal (Published Problems, Submissions, Files)...")
    run_psql("sih_portal", """
        DELETE FROM submission_file;
        DELETE FROM submission;
        DELETE FROM published_problem;
    """)

    # Ensure Student Participant exists (Priya Sharma)
    priya_user_id = "1a1be98a-2239-4704-a1c9-abbec4ab8186"
    priya_participant_id = "a71a2e7b-b7d2-4837-9fe1-a1829aa7f61f"
    run_psql("sih_portal", f"""
    DELETE FROM participant WHERE user_id = '{priya_user_id}' AND participant_id != '{priya_participant_id}';
    INSERT INTO participant (participant_id, user_id, participant_type, full_name, email, phone, institution_name)
    VALUES ('{priya_participant_id}', '{priya_user_id}', 'STUDENT', 'Priya Sharma', 'priya@university.ac.in', '9876543210', 'Indian Institute of Science (IISc), Bengaluru')
    ON CONFLICT (participant_id) DO UPDATE SET full_name = EXCLUDED.full_name, user_id = EXCLUDED.user_id, institution_name = EXCLUDED.institution_name;
    """)

    # Insert 12 published problems
    portal_sqls = []
    for p in problems_catalog:
        title_esc = p["title"].replace("'", "''")
        desc_esc = p["desc"].replace("'", "''")
        outcome_esc = p["outcome"].replace("'", "''")
        loc_str = p["loc"]["text"].replace("'", "''")
        dom_json = json.dumps(p["domain_names"])
        owner_id = submitter_2_id if p["id"] == "11111111-aaaa-4000-8000-000000000002" else (submitter_1_id if p["bucket"] == "GOVT" else (submitter_3_id if p["bucket"] == "INDUSTRY" else submitter_4_id))

        portal_sqls.append(f"""
        INSERT INTO published_problem (
            problem_id, cycle_id, title, description, expected_outcome,
            source_bucket, sub_entity_type, urgency, severity, location,
            domains, evidence_count, access_rule, access_universities, published_at, submitted_by_user_id
        ) VALUES (
            '{p["id"]}', '{p["cycle_id"]}', '{title_esc}', '{desc_esc}', '{outcome_esc}',
            '{p["bucket"]}', '{p["sub_entity"]}', '{p["urgency"]}', '{p["severity"]}', '{loc_str}',
            '{dom_json}'::jsonb, 2, '{p["access_rule"]}', '[]'::jsonb, NOW() - interval '3 days', '{owner_id}'
        );
        """)
    run_psql("sih_portal", "\n".join(portal_sqls))

    # Student Submissions for Priya across 5 distinct problem statements
    submissions = [
        # GOVT Submission 1 (Pothole Problem) -> ACCEPTED
        {
            "sub_id": "33333333-cccc-4000-8000-000000000001",
            "prob_id": "11111111-aaaa-4000-8000-000000000001",
            "cycle_id": "22222222-bbbb-4000-8000-000000000001",
            "title": "VeloSense - Edge IMU & Camera Pipeline for Transit Buses",
            "summary": "Lightweight TensorFlow Lite model running on Raspberry Pi 4 with MPU6050 accelerometer, streaming geo-tagged road defects over 4G.",
            "github": "https://github.com/priya-sharma/velosense-pothole-telemetry",
            "status": "ACCEPTED",
            "comment": "Validated on Bengaluru BMTC Route 335E with 94.2% detection precision for major potholes. High civic utility for BBMP.",
            "target_pool": "GOVERNMENT",
            "review_status": "ACCEPTED"
        },
        # GOVT Submission 2 (Solar Microgrid) -> ACCEPTED
        {
            "sub_id": "33333333-cccc-4000-8000-000000000002",
            "prob_id": "11111111-aaaa-4000-8000-000000000002",
            "cycle_id": "22222222-bbbb-4000-8000-000000000002",
            "title": "UrjaSetu - Smart Microgrid Peer Ledger",
            "summary": "ESP32-based bidirectional metering node interfacing with an open-source consensus ledger for local power settlement.",
            "github": "https://github.com/priya-sharma/urja-setu-microgrid",
            "status": "ACCEPTED",
            "comment": "Top-tier student engineering project. Anti-islanding safety relay verified. Highly recommended for pilot adoption by Tarn Taran Gram Panchayat under PM-KUSUM.",
            "target_pool": "GOVERNMENT",
            "review_status": "ACCEPTED"
        },
        # INDUSTRY Submission (Water Leakage) -> ACCEPTED
        {
            "sub_id": "33333333-cccc-4000-8000-000000000003",
            "prob_id": "11111111-aaaa-4000-8000-000000000003",
            "cycle_id": "22222222-bbbb-4000-8000-000000000003",
            "title": "JalDrishti - Acoustic Mesh for Municipal Pipeline Surveillance",
            "summary": "Low-frequency hydrophone array with digital bandpass filters distinguishing micro-leaks from turbulent pipe flow.",
            "github": "https://github.com/priya-sharma/jal-drishti-pipeline",
            "status": "ACCEPTED",
            "comment": "High feasibility and excellent preliminary sensor benchmark data. Accepted for Phase 3 prototype funding.",
            "target_pool": "INDUSTRY",
            "review_status": "ACCEPTED"
        },
        # CITIZEN Submission (Waste Segregation) -> SUBMITTED
        {
            "sub_id": "33333333-cccc-4000-8000-000000000004",
            "prob_id": "11111111-aaaa-4000-8000-000000000004",
            "cycle_id": "22222222-bbbb-4000-8000-000000000004",
            "title": "SwachhBin - Dual-Stream AI Waste Classification Bin",
            "summary": "Compact optical hopper with motorized tilt tray, categorizing dry vs wet municipal waste in under 800ms.",
            "github": "https://github.com/priya-sharma/swachhbin-ai-sorter",
            "status": "SUBMITTED",
            "target_pool": "CITIZEN",
            "review_status": "ASSIGNED"
        },
        # COMMUNITY Submission (Cold-Storage) -> ACCEPTED
        {
            "sub_id": "33333333-cccc-4000-8000-000000000005",
            "prob_id": "11111111-aaaa-4000-8000-000000000006",
            "cycle_id": "22222222-bbbb-4000-8000-000000000006",
            "title": "KrishiSheet - LoRa Mesh Cold Room Tracker",
            "summary": "Battery-powered environmental telemetry beacon for cooperative cold stores with SMS notification dispatch.",
            "github": "https://github.com/priya-sharma/krishisheet-lora",
            "status": "ACCEPTED",
            "comment": "Outstanding field-readiness and clear focus on cooperative farmer affordability.",
            "target_pool": "COMMUNITY",
            "review_status": "ACCEPTED"
        },
        # HEI Submission (PHC Tele-Diagnosis) -> SUBMITTED
        {
            "sub_id": "33333333-cccc-4000-8000-000000000006",
            "prob_id": "11111111-aaaa-4000-8000-000000000007",
            "cycle_id": "22222222-bbbb-4000-8000-000000000007",
            "title": "SwasthyaTablet - Offline Clinical Diagnostic Aide",
            "summary": "FHIR-compliant decision companion for remote rural ASHA workers.",
            "github": "https://github.com/priya-sharma/swasthya-tablet",
            "status": "SUBMITTED",
            "target_pool": "HEI",
            "review_status": "ASSIGNED"
        }
    ]

    sub_sqls = []
    rev_sqls = []
    for s in submissions:
        title_esc = s["title"].replace("'", "''")
        sum_esc = s["summary"].replace("'", "''")
        comment_val = f"'{s['comment'].replace("'", "''")}'" if "comment" in s else "NULL"
        decided_val = "NOW() - interval '6 hours'" if "comment" in s else "NULL"

        # 1. Portal Submission
        sub_sqls.append(f"""
        INSERT INTO submission (
            submission_id, problem_id, submitter_participant_id,
            title, summary, github_url, status, review_round,
            decision_comment, decided_at, submitted_at
        ) VALUES (
            '{s["sub_id"]}', '{s["prob_id"]}', '{priya_participant_id}',
            '{title_esc}', '{sum_esc}', '{s["github"]}',
            '{s["status"]}'::submission_status, 1,
            {comment_val}, {decided_val}, NOW() - interval '2 days'
        );
        """)

        # 2. Project Review in sih_eval ASSIGNED TO THE MATCHING EVALUATOR!
        eval_info = eval_profiles[s["target_pool"]]
        eval_prof_id = eval_info["profile_id"]
        eval_uid = eval_info["user_id"]
        prob_title = next(p["title"] for p in problems_catalog if p["id"] == s["prob_id"]).replace("'", "''")

        rev_sqls.append(f"""
        INSERT INTO project_review (
            project_review_id, submission_id, round, problem_id, cycle_id,
            evaluator_profile_id, reviewer_user_id, problem_title, submission_title,
            summary, github_url, status, decision_comment, decided_at
        ) VALUES (
            '{str(uuid.uuid4())}', '{s["sub_id"]}', 1, '{s["prob_id"]}', '{s["cycle_id"]}',
            '{eval_prof_id}', '{eval_uid}', '{prob_title}', '{title_esc}',
            '{sum_esc}', '{s["github"]}', '{s["review_status"]}'::project_review_status,
            {comment_val}, {decided_val}
        );
        """)

    run_psql("sih_portal", "\n".join(sub_sqls))
    run_psql("sih_eval", "\n".join(rev_sqls))

    print(f"  [OK] Seeded {len(submissions)} participant submissions & matching pool project reviews in sih_eval.")

    # -------------------------------------------------------------------------
    # 6. Summary Verification
    # -------------------------------------------------------------------------
    print("\n=====================================================================")
    print("  SEEDING COMPLETE — SUMMARY OF CREATED TEST DATA")
    print("=====================================================================")
    print("1. Submitter Portal (http://localhost:3002):")
    print("   * Verified Login: 9900000001 (OTP: 123456) -> Active BBMP Source Account, 3 Submitted Problems")
    print("   * Under Review:   9900000002 (OTP: 123456) -> Tests Application Status Tracking")
    print("   * Action Needed:  9900000003 (OTP: 123456) -> Tests Deficiency/Correction Submission")
    print("   * Draft Wizard:   9900000004 (OTP: 123456) -> Tests Wizard Resume from Step 4")
    print("   * Fresh User:     9900000005 (OTP: 123456) -> Tests New Onboarding Wizard from Step 1")
    print("\n2. Reviewer Portal (http://localhost:8086):")
    print("   * Reviewer Login: 9829858790 (OTP: 123456) -> 7 varied dossiers (SUBMITTED, UNDER_REVIEW, ACTION_REQUIRED)")
    print("\n3. Evaluator Portal (http://localhost:3001) [STRICT POOL VISIBILITY ENFORCED]:")
    for pool in required_pools:
        phone = {
            "GOVERNMENT": "9700000001",
            "INDUSTRY":   "9700000002",
            "HEI":        "9700000003",
            "CITIZEN":    "9700000004",
            "COMMUNITY":  "9700000005"
        }[pool]
        count_prob = sum(1 for p in problems_catalog if p["target_evaluator_type"] == pool)
        count_rev = sum(1 for s in submissions if s["target_pool"] == pool)
        print(f"   * {pool:11s} Evaluator: Phone {phone} (OTP: 123456) -> Sees ONLY {count_prob} {pool} problems & {count_rev} {pool} project reviews")
    print("\n4. Innovation Portal (http://localhost:3003):")
    print("   * Student Login: 9876543210 (Priya Sharma) -> 12 Published Problems, 6 Submissions")
    print("=====================================================================\n")

if __name__ == "__main__":
    seed_all()
