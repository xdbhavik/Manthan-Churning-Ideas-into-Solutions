import subprocess
import json

urja_project_details = {
    "studentDetails": {
        "teamLeaderName": "Aarav Sharma",
        "email": "aarav.sharma@iitd.ac.in",
        "institution": "IIT Delhi",
        "department": "Department of Electrical Engineering",
        "semester": "7th Semester (B.Tech)"
    },
    "teamDetails": {
        "teamName": "UrjaVanguard",
        "size": 4,
        "track": "Hardware & Clean Energy"
    },
    "technicalDetails": {
        "microcontroller": "ESP32-S3 WROOM with RS485 Modbus",
        "meshProtocol": "MQTT over LoRaWAN + Sub-GHz 865MHz Mesh",
        "smartContract": "Solidity Peer Trading Engine on Polygon Edge Testnet",
        "antiIslandingSafety": "Hardware Optocoupler Tripping Relay with IEC 62116 compliance"
    },
    "projectLinks": {
        "Demo Video": "https://youtu.be/demo-urjasetu-microgrid",
        "Circuit Schematics": "https://cadlab.io/project/urjasetu-v2",
        "Firmware Repo": "https://github.com/priya-sharma/urja-setu-microgrid"
    }
}

urja_scorecard = {
    "totalScore": 89,
    "maxScore": 100,
    "overallRemarks": "Top-tier student engineering project. Anti-islanding safety relay verified. Highly recommended for pilot adoption by Tarn Taran Gram Panchayat under PM-KUSUM.",
    "submittedAt": "2026-10-13T10:30:00Z",
    "criteria": [
        {"key": "technical_feasibility", "label": "Technical Feasibility", "maxScore": 30, "description": "Robustness of hardware & firmware architecture"},
        {"key": "rural_impact", "label": "Rural Gram Panchayat Impact", "maxScore": 30, "description": "Affordability and ease of adoption for village solar micro-grids"},
        {"key": "innovation_originality", "label": "Innovation & Novelty", "maxScore": 20, "description": "Novelty of peer-to-peer micro-billing protocol"},
        {"key": "field_deployability", "label": "Pilot Field Readiness", "maxScore": 20, "description": "Safety compliance and anti-islanding relay protection"}
    ],
    "criteriaScores": {
        "technical_feasibility": {"score": 28, "comment": "High reliability ESP32 edge metering with zero packet loss in bench tests."},
        "rural_impact": {"score": 27, "comment": "Direct economic benefit for rural agricultural solar pump owners."},
        "innovation_originality": {"score": 18, "comment": "Clever local consensus ledger without requiring high internet bandwidth."},
        "field_deployability": {"score": 16, "comment": "Anti-islanding relay protection verified in updated revision."}
    }
}

urja_mentor = {
    "fullName": "Er. Gurpreet Singh",
    "email": "gurpreet.singh@punjabenergy.gov.in",
    "organization": "Punjab Energy Development Agency (PEDA)",
    "note": "Assigned to facilitate hardware testing at Tarn Taran rural substation."
}

velosense_project_details = {
    "studentDetails": {
        "teamLeaderName": "Priya Sharma",
        "email": "priya.sharma@nitk.edu.in",
        "institution": "NIT Karnataka, Surathkal",
        "department": "Computer Science & Engineering",
        "semester": "7th Semester (B.Tech)"
    },
    "teamDetails": {
        "teamName": "UrbanTrackers",
        "size": 3,
        "track": "Edge AI & Smart Cities"
    },
    "technicalDetails": {
        "edgeHardware": "Raspberry Pi 4 (4GB) + Google Coral Edge TPU",
        "sensorArray": "MPU6050 6-Axis IMU + Sony IMX219 Wide-Angle Camera",
        "backendTelemetry": "FastAPI + TimescaleDB + PostGIS"
    },
    "projectLinks": {
        "Project Walkthrough": "https://youtu.be/velosense-demo",
        "CAD Enclosure Model": "https://grabcad.com/library/velosense-transit-case-1"
    }
}

velosense_scorecard = {
    "totalScore": 92,
    "maxScore": 100,
    "overallRemarks": "Validated on Bengaluru BMTC Route 335E with 94.2% detection precision for major potholes. Excellent municipal telemetry platform.",
    "submittedAt": "2026-10-12T14:15:00Z",
    "criteria": [
        {"key": "ai_accuracy", "label": "Edge AI Inference Accuracy", "maxScore": 35, "description": "Quantized model detection precision at 30+ FPS"},
        {"key": "telemetry_latency", "label": "Telemetry Transmission Latency", "maxScore": 35, "description": "Geo-tagged defect upload latency over cellular"},
        {"key": "scalability", "label": "City-Wide Fleet Scalability", "maxScore": 30, "description": "Ease of retrofitting municipal public transit fleet"}
    ],
    "criteriaScores": {
        "ai_accuracy": {"score": 33, "comment": "TensorFlow Lite quantized INT8 model runs cleanly at 32 FPS on Coral TPU."},
        "telemetry_latency": {"score": 32, "comment": "Average 4G upload latency < 1.2s per geo-tagged telemetry packet."},
        "scalability": {"score": 27, "comment": "Compact 3D-printed case mounts cleanly onto standard bus windshields."}
    }
}

sql = f"""
UPDATE submission
SET status = 'ACCEPTED',
    decided_at = NOW() - interval '1 day',
    decision_comment = 'Verified by Government Evaluator. Outstanding decentralization architecture and firmware design.',
    project_details = '{json.dumps(urja_project_details)}'::jsonb,
    review_scorecard = '{json.dumps(urja_scorecard)}'::jsonb,
    mentor_assignment = '{json.dumps(urja_mentor)}'::jsonb
WHERE submission_id = '33333333-cccc-4000-8000-000000000002';

UPDATE submission
SET status = 'ACCEPTED',
    decided_at = NOW() - interval '2 days',
    decision_comment = 'Real-time road surface defect detection pipeline benchmarked at 32 FPS on Raspberry Pi 4. High civic utility for BBMP.',
    project_details = '{json.dumps(velosense_project_details)}'::jsonb,
    review_scorecard = '{json.dumps(velosense_scorecard)}'::jsonb,
    mentor_assignment = '{{}}'::jsonb
WHERE submission_id = '33333333-cccc-4000-8000-000000000001';
"""

import os

PG_HOST = os.environ.get("PGHOST")
PG_USER = os.environ.get("PGUSER", "sih")
PG_PASSWORD = os.environ.get("PGPASSWORD")
PG_PORT = os.environ.get("PGPORT", "5432")

if PG_HOST:
    cmd = ["psql", "-v", "ON_ERROR_STOP=1", "-h", PG_HOST, "-p", str(PG_PORT), "-U", PG_USER, "-d", "sih_portal"]
    env = os.environ.copy()
    env["PGCLIENTENCODING"] = "UTF8"
    if PG_PASSWORD:
        env["PGPASSWORD"] = PG_PASSWORD
    p = subprocess.run(cmd, input=f"SET client_encoding = 'UTF8';\n{sql}".encode('utf-8'), capture_output=True, env=env)
    print("STDOUT:", p.stdout.decode('utf-8', errors='replace'))
    print("STDERR:", p.stderr.decode('utf-8', errors='replace'))
else:
    cmd = ["docker", "exec", "-i", "sih26043-pg", "psql", "-U", "sih", "-d", "sih_portal"]
    p = subprocess.run(cmd, input=sql, text=True, capture_output=True)
    print("STDOUT:", p.stdout)
    print("STDERR:", p.stderr)
