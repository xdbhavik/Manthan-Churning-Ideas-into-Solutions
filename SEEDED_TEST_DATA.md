# SIH26043 — Seeded Test Data Reference Guide

This document catalogs all dummy test data seeded across the **SIH26043** microservice databases (`sih_source`, `sih_problem`, `sih_eval`, and `sih_portal`).

> **Quick Credentials Reference:**
> * **Universal Development OTP:** `123456` *(Valid for all accounts across all portals)*
> * **API Gateway URL (AWS Deployed):** `https://api.bhavik.site` *(Local fallback: `http://localhost:8080` or `:8090`)*
> * **Database Target:** AWS RDS PostgreSQL `sih-postgres.cv4ygog0qn0f.ap-south-1.rds.amazonaws.com` *(Local fallback: Docker Container `sih26043-pg`)*

---

## 1. Evaluator Portal (`http://localhost:3001`)

Evaluator visibility is **strictly isolated by evaluator pool**. An evaluator only has visibility into problem assignments and student project reviews matching their designated pool type.

### 1.1 Government Pool Evaluator
* **Login Phone:** `9700000001` (OTP: `123456`)
* **User ID:** `44444444-4444-4444-8444-444444444444`
* **Evaluator Profile ID:** `de459150-5e08-4886-892e-2ce3fec658ac`
* **Name & Designation:** Demo Evaluator, Joint Director (Urban Local Governance), SIH26043
* **Assigned Problem Statements (3):**
  1. **IoT-Enabled Pothole & Road Surface Telemetry System**
     * *Problem ID:* `11111111-aaaa-4000-8000-000000000001`
     * *Cycle ID:* `22222222-bbbb-4000-8000-000000000001`
     * *Status:* `ASSIGNED` *(Open in queue for Accept/Decline action)*
  2. **Decentralized Solar Microgrid Energy Trading for Rural Gram Panchayats**
     * *Problem ID:* `11111111-aaaa-4000-8000-000000000002`
     * *Cycle ID:* `22222222-bbbb-4000-8000-000000000002`
     * *Status:* `IN_PROGRESS` *(Ready for rubric scorecard entry)*
  3. **AI-Driven Flood Level Forecasting & Evacuation Routing for Brahmaputra Basin**
     * *Problem ID:* `11111111-aaaa-4000-8000-000000000005`
     * *Cycle ID:* `22222222-bbbb-4000-8000-000000000005`
     * *Status:* `SUBMITTED` *(Scored: 82/100, Priority Band: HIGH)*
* **Assigned Project Submissions for Review (2):**
  1. `VeloSense - Edge IMU & Camera Pipeline for Transit Buses` *(Submission ID: `33333333-cccc-4000-8000-000000000001`, Status: `ASSIGNED`)*
  2. `UrjaSetu - Smart Microgrid Peer Ledger` *(Submission ID: `33333333-cccc-4000-8000-000000000002`, Status: `RETURNED`)*

---

### 1.2 Industry Pool Evaluator
* **Login Phone:** `9700000002` (OTP: `123456`)
* **User ID:** `55555555-5555-4555-8555-555555555551`
* **Evaluator Profile ID:** `5a3ed3bd-d43f-479b-8ffe-891176949380`
* **Name & Designation:** Industry Evaluator, Principal Architect (Tata Advanced Tech / SIH26043)
* **Assigned Problem Statements (3):**
  1. **Autonomous Water Pipeline Leakage & Contamination Detection Mesh**
     * *Problem ID:* `11111111-aaaa-4000-8000-000000000003`
     * *Cycle ID:* `22222222-bbbb-4000-8000-000000000003`
     * *Status:* `ASSIGNED`
  2. **Dynamic Traffic Signal Synchronization via Reinforcement Learning**
     * *Problem ID:* `11111111-aaaa-4000-8000-000000000008`
     * *Cycle ID:* `22222222-bbbb-4000-8000-000000000008`
     * *Status:* `IN_PROGRESS`
  3. **Industrial Effluent Monitoring & Automatic Valve Cut-Off Telemetry**
     * *Problem ID:* `11111111-aaaa-4000-8000-000000000009`
     * *Cycle ID:* `22222222-bbbb-4000-8000-000000000009`
     * *Status:* `SUBMITTED` *(Scored: 86/100, Priority Band: CRITICAL)*
* **Assigned Project Submissions for Review (1):**
  1. `JalDrishti - Acoustic Mesh for Municipal Pipeline Surveillance` *(Submission ID: `33333333-cccc-4000-8000-000000000003`, Status: `ACCEPTED`)*

---

### 1.3 Higher Education Institution (HEI) Pool Evaluator
* **Login Phone:** `9700000003` (OTP: `123456`)
* **User ID:** `55555555-5555-4555-8555-555555555552`
* **Evaluator Profile ID:** `3b9d093e-03c0-48d4-8d75-56b84ac2df3e`
* **Name & Designation:** HEI Evaluator, Dean of R&D (IIT Bombay / SIH26043)
* **Assigned Problem Statements (2):**
  1. **Zero-Latency Tele-Diagnosis Assistant for Remote Primary Health Centres (PHCs)**
     * *Problem ID:* `11111111-aaaa-4000-8000-000000000007`
     * *Cycle ID:* `22222222-bbbb-4000-8000-000000000007`
     * *Status:* `ASSIGNED`
  2. **Portable Optical Micro-Spectrometer for High-Throughput Soil NPK Profiling**
     * *Problem ID:* `11111111-aaaa-4000-8000-000000000010`
     * *Cycle ID:* `22222222-bbbb-4000-8000-000000000010`
     * *Status:* `SUBMITTED` *(Scored: 89/100, Priority Band: HIGH)*
* **Assigned Project Submissions for Review (1):**
  1. `SwasthyaTablet - Offline Clinical Diagnostic Aide` *(Submission ID: `33333333-cccc-4000-8000-000000000006`, Status: `ASSIGNED`)*

---

### 1.4 Citizen Pool Evaluator
* **Login Phone:** `9700000004` (OTP: `123456`)
* **User ID:** `55555555-5555-4555-8555-555555555553`
* **Evaluator Profile ID:** `b01ac6cb-723f-4d5b-98dc-22688bbcbfa2`
* **Name & Designation:** Citizen Evaluator, Lead Civic Auditor (Civil Society Observer / SIH26043)
* **Assigned Problem Statements (2):**
  1. **Municipal Solid Waste Segregation at Source using Edge AI Cameras**
     * *Problem ID:* `11111111-aaaa-4000-8000-000000000004`
     * *Cycle ID:* `22222222-bbbb-4000-8000-000000000004`
     * *Status:* `ASSIGNED`
  2. **Bilingual Voice-Based Digital Literacy Assistant for Rural Senior Citizens**
     * *Problem ID:* `11111111-aaaa-4000-8000-000000000011`
     * *Cycle ID:* `22222222-bbbb-4000-8000-000000000011`
     * *Status:* `SUBMITTED` *(Scored: 78/100, Priority Band: MEDIUM)*
* **Assigned Project Submissions for Review (1):**
  1. `SwachhBin - Dual-Stream AI Waste Classification Bin` *(Submission ID: `33333333-cccc-4000-8000-000000000004`, Status: `ASSIGNED`)*

---

### 1.5 Community Pool Evaluator
* **Login Phone:** `9700000005` (OTP: `123456`)
* **User ID:** `55555555-5555-4555-8555-555555555554`
* **Evaluator Profile ID:** `5c7e84bd-5299-4b5b-9990-7788a97d9212`
* **Name & Designation:** Community Evaluator, Programme Director (Gramin Vikas Trust / SIH26043)
* **Assigned Problem Statements (2):**
  1. **Affordable Cold-Storage Monitoring Mesh for Marginalised Vegetable Farmers**
     * *Problem ID:* `11111111-aaaa-4000-8000-000000000006`
     * *Cycle ID:* `22222222-bbbb-4000-8000-000000000006`
     * *Status:* `ASSIGNED`
  2. **Participatory Spring-Shed Hydrogeology Monitoring for Himalayan Hill Hamlets**
     * *Problem ID:* `11111111-aaaa-4000-8000-000000000012`
     * *Cycle ID:* `22222222-bbbb-4000-8000-000000000012`
     * *Status:* `SUBMITTED` *(Scored: 91/100, Priority Band: CRITICAL)*
* **Assigned Project Submissions for Review (1):**
  1. `KrishiSheet - LoRa Mesh Cold Room Tracker` *(Submission ID: `33333333-cccc-4000-8000-000000000005`, Status: `ACCEPTED`)*

---

## 2. Submitter Portal (`http://localhost:3002`)

The submitter portal test accounts demonstrate each lifecycle stage from fresh onboarding through KYC approval and problem statement submission.

| Phone | User ID | Organization / Persona | State / Bucket | KYC Status & Screen Behavior |
| :--- | :--- | :--- | :--- | :--- |
| `9900000001` | `33333333-3333-4333-8333-333333333333` | **Bruhat Bengaluru Mahanagara Palike (BBMP)** | Karnataka / `GOVT` (`ULB`) | **Approved KYC Dashboard (`view-completed`)**<br>• `canSubmit: true`<br>• Active source account linked<br>• Has 3 submitted problem statements ready to inspect |
| `9900000002` | `33333333-3333-4333-8333-000000000002` | **Khadur Sahib Gram Panchayat** | Punjab / `GOVT` (`PRI`) | **Application Tracking View (`view-tracking`)**<br>• Status: `SUBMITTED` / `UNDER_REVIEW`<br>• Tests progress stepper and status timeline |
| `9900000003` | `33333333-3333-4333-8333-000000000003` | **Pune Green Earth Foundation** | Maharashtra / `COMMUNITY` (`NGO`) | **Action Required View (`view-action-required`)**<br>• Status: `ACTION_REQUIRED`<br>• Reviewer Deficiency Note: *"PFMS Bank passbook mandate requires signature of Authorized Secretary."*<br>• Tests document correction & resubmission |
| `9900000004` | `33333333-3333-4333-8333-000000000004` | **Draft Applicant (MSME)** | Gujarat / `INDUSTRY` (`MSME`) | **Draft Wizard Resume (`view-wizard`)**<br>• Status: `DRAFT`<br>• Resumes directly at Step 4 (Document Upload) with steps 1–3 pre-filled |
| `9900000005` | `33333333-3333-4333-8333-000000000005` | **Fresh New User** | N/A | **Clean Onboarding Start (`view-wizard`)**<br>• No registrations<br>• Starts at Wizard Step 1 (Category Selection) |

### 2.1 Accepted Student Solutions in Submitter Portal (`#view-my-solutions`)

The Submitter Portal includes a dedicated **Accepted Solutions** workspace where problem statement owners can inspect student innovations, view evaluator scorecards, download files, and assign institutional mentors:

| Submitter Phone | Submitter Persona | Linked Problem Statement | Accepted Student Solution | Scorecard & Review Details | Mentor Assignment State |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `9900000002` | **Khadur Sahib Gram Panchayat** (`PRI` / `GOVT`) | `11111111-aaaa-4000-8000-000000000002`<br>*(Decentralized Solar Microgrid Energy Trading for Rural Gram Panchayats)* | **UrjaSetu - Smart Microgrid Peer Ledger**<br>• Team: *UrjaVanguard* (IIT Delhi)<br>• Leader: Aarav Sharma<br>• Microcontroller: ESP32-S3 + LoRa mesh | **89 / 100** (P1 Band)<br>• Feasibility: 28/30<br>• Rural Impact: 27/30<br>• Novelty: 18/20<br>• Field Deployability: 16/20 | **Pre-assigned Mentor:**<br>Er. Gurpreet Singh *(Punjab Energy Development Agency - PEDA)* |
| `9900000001` | **Bruhat Bengaluru Mahanagara Palike (BBMP)** (`ULB` / `GOVT`) | `11111111-aaaa-4000-8000-000000000001`<br>*(IoT-Enabled Pothole & Road Surface Telemetry System)* | **VeloSense - Edge IMU & Camera Pipeline for Transit Buses**<br>• Team: *UrbanTrackers* (NITK Surathkal)<br>• Leader: Priya Sharma<br>• Hardware: Raspberry Pi 4 + Coral TPU | **92 / 100** (Critical Band)<br>• AI Accuracy: 33/35 (32 FPS)<br>• Latency: 32/35 (<1.2s)<br>• Scalability: 27/30 | **Unassigned**<br>*(Ready for testing the interactive "Assign Mentor" form in UI)* |
| `9900000003` | **Tata Utilities / Infra Tech Ltd** (`COMPANY` / `INDUSTRY`) | `11111111-aaaa-4000-8000-000000000003`<br>*(Autonomous Water Pipeline Leakage & Contamination Mesh)* | **JalDrishti - Acoustic Mesh for Municipal Pipeline Surveillance**<br>• Hydrophone sensor mesh | **88 / 100** (High Feasibility) | Ready for Mentor Assignment |
| `9900000006` | **Kisan Vikas Sahakari Mandali** (`SHG` / `COMMUNITY`) | `11111111-aaaa-4000-8000-000000000006`<br>*(Affordable Cold-Storage Monitoring Mesh)* | **KrishiSheet - LoRa Mesh Cold Room Tracker**<br>• Environmental LoRa beacon with SMS dispatch | **86 / 100** (Field-Ready) | Ready for Mentor Assignment |

---

## 3. Reviewer Portal (`http://localhost:8086`)

The reviewer portal allows KYC verification officers to evaluate statutory dossiers, review uploaded verification files, approve source entities, or return dossiers with deficiency comments.

* **Reviewer Mobile:** `9829858790` (OTP: `123456`)
* **Reviewer User ID:** `22222222-2222-4222-8222-222222222222`
* **Designation:** Senior Statutory KYC Verification Officer

### Live Queue Dossiers:

| Registration ID | Entity Name | Category / Bucket | Sub-Type | Jurisdiction | Status | Contact Officer |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `66666666-aaaa-4000-8000-000000000002` | Khadur Sahib Gram Panchayat | `GOVT` | `PRI` | Tarn Taran, Punjab | `UNDER_REVIEW` | Harpreet Singh Dhillon (VDO) |
| `66666666-aaaa-4000-8000-000000000003` | Pune Green Earth Foundation | `COMMUNITY` | `NGO` | Pune, Maharashtra | `ACTION_REQUIRED` | Ananya Joshi (Trustee) |
| `66666666-aaaa-4000-8000-000000000005` | Wani Municipal Council | `GOVT` | `ULB` | Yavatmal, Maharashtra | `SUBMITTED` | Chief Officer M. G. Patil |
| `66666666-aaaa-4000-8000-000000000006` | Bastar Central University Research Cell | `HEI` | `UNIVERSITY` | Bastar, Chhattisgarh | `SUBMITTED` | Prof. Arvind Netam (Registrar) |
| `66666666-aaaa-4000-8000-000000000007` | Indirapuram Residents Apex Association | `CITIZEN` | `RWA` | Ghaziabad, Uttar Pradesh | `UNDER_REVIEW` | Sunil Verma (President) |
| `66666666-aaaa-4000-8000-000000000008` | Mahila Utkarsha Self Help Federation | `COMMUNITY` | `SHG` | Nashik, Maharashtra | `SUBMITTED` | Sunita Tai Deshmukh |

---

## 4. Innovation Portal (`http://localhost:3003`)

The Innovation Portal allows students/participants to browse published challenges, form teams, and submit solutions with source code links and deliverables.

* **Student Mobile:** `9876543210` (OTP: `123456`)
* **User ID:** `1a1be98a-2239-4704-a1c9-abbec4ab8186`
* **Participant ID:** `a71a2e7b-b7d2-4837-9fe1-a1829aa7f61f`
* **Student Name:** Priya Sharma
* **Institution:** Indian Institute of Science (IISc), Bengaluru
* **Email:** `priya@university.ac.in`

### 4.1 Tracked Student Submissions (6):

| Submission ID | Challenge Title | Solution Name | Status | GitHub Repo | Evaluator Comment |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `33333333-cccc-4000-8000-000000000001` | IoT-Enabled Pothole Telemetry | **VeloSense** (Edge IMU & Camera) | `UNDER_REVIEW` | [velosense-pothole-telemetry](https://github.com/priya-sharma/velosense-pothole-telemetry) | Assigned to Govt Evaluator. |
| `33333333-cccc-4000-8000-000000000002` | Solar Microgrid Energy Trading | **UrjaSetu** (Microgrid Peer Ledger) | `RETURNED` | [urja-setu-microgrid](https://github.com/priya-sharma/urja-setu-microgrid) | *"Please update hardware circuit schematics to include anti-islanding protection and resubmit."* |
| `33333333-cccc-4000-8000-000000000003` | Water Pipeline Leakage Mesh | **JalDrishti** (Acoustic Hydrophone Mesh) | `ACCEPTED` | [jal-drishti-pipeline](https://github.com/priya-sharma/jal-drishti-pipeline) | *"High feasibility and excellent preliminary benchmark data. Accepted for Phase 3 funding."* |
| `33333333-cccc-4000-8000-000000000004` | Solid Waste Segregation | **SwachhBin** (Dual-Stream AI Hopper) | `SUBMITTED` | [swachhbin-ai-sorter](https://github.com/priya-sharma/swachhbin-ai-sorter) | In evaluation review queue. |
| `33333333-cccc-4000-8000-000000000005` | Cold-Storage Monitoring | **KrishiSheet** (LoRa Mesh Cold Room) | `ACCEPTED` | [krishisheet-lora](https://github.com/priya-sharma/krishisheet-lora) | *"Outstanding field-readiness and focus on farmer affordability."* |
| `33333333-cccc-4000-8000-000000000006` | Tele-Diagnosis Assistant | **SwasthyaTablet** (Offline Clinical Aide) | `SUBMITTED` | [swasthya-tablet](https://github.com/priya-sharma/swasthya-tablet) | In HEI evaluation queue. |

---

## 5. Complete Problem Catalog (12 Canonical Problem Statements)

| Problem ID | Category | Sub-Entity | Problem Title | Location | Urgency / Severity | Access Rule | Target Evaluator Pool |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `11111111-aaaa-4000-8000-000000000001` | `GOVT` | `ULB` | IoT-Enabled Pothole & Road Surface Telemetry System | Bengaluru, Karnataka | `IMMEDIATE` / `CRITICAL` | `OPEN_TO_ALL` | **GOVERNMENT** |
| `11111111-aaaa-4000-8000-000000000002` | `GOVT` | `PRI` | Decentralized Solar Microgrid Energy Trading for Rural Gram Panchayats | Tarn Taran, Punjab | `SHORT_TERM` / `HIGH` | `OPEN_TO_ALL` | **GOVERNMENT** |
| `11111111-aaaa-4000-8000-000000000005` | `GOVT` | `DEPARTMENT` | AI-Driven Flood Level Forecasting & Evacuation Routing for Brahmaputra Basin | Guwahati, Assam | `IMMEDIATE` / `CRITICAL` | `OPEN_TO_ALL` | **GOVERNMENT** |
| `11111111-aaaa-4000-8000-000000000003` | `INDUSTRY` | `COMPANY` | Autonomous Water Pipeline Leakage & Contamination Detection Mesh | Surat, Gujarat | `MEDIUM_TERM` / `HIGH` | `OPEN_TO_ALL` | **INDUSTRY** |
| `11111111-aaaa-4000-8000-000000000008` | `INDUSTRY` | `STARTUP` | Dynamic Traffic Signal Synchronization via Reinforcement Learning | Pune, Maharashtra | `SHORT_TERM` / `MEDIUM` | `OPEN_TO_ALL` | **INDUSTRY** |
| `11111111-aaaa-4000-8000-000000000009` | `INDUSTRY` | `MSME` | Industrial Effluent Monitoring & Automatic Valve Cut-Off Telemetry | Vapi, Gujarat | `IMMEDIATE` / `CRITICAL` | `OPEN_TO_ALL` | **INDUSTRY** |
| `11111111-aaaa-4000-8000-000000000007` | `HEI` | `RESEARCH_LAB`| Zero-Latency Tele-Diagnosis Assistant for Remote Primary Health Centres (PHCs) | Gadchiroli, Maharashtra | `IMMEDIATE` / `CRITICAL` | `OPEN_TO_ALL` | **HEI** |
| `11111111-aaaa-4000-8000-000000000010` | `HEI` | `UNIVERSITY` | Portable Optical Micro-Spectrometer for High-Throughput Soil NPK Profiling | Pantnagar, Uttarakhand | `MEDIUM_TERM` / `HIGH` | `OPEN_TO_ALL` | **HEI** |
| `11111111-aaaa-4000-8000-000000000004` | `CITIZEN` | `RWA` | Municipal Solid Waste Segregation at Source using Edge AI Cameras | Indore, Madhya Pradesh | `SHORT_TERM` / `MEDIUM` | `OPEN_TO_ALL` | **CITIZEN** |
| `11111111-aaaa-4000-8000-000000000011` | `CITIZEN` | `INDIVIDUAL` | Bilingual Voice-Based Digital Literacy Assistant for Rural Senior Citizens | Warangal, Telangana | `LONG_TERM` / `LOW` | `OPEN_TO_ALL` | **CITIZEN** |
| `11111111-aaaa-4000-8000-000000000006` | `COMMUNITY`| `CBO_COOP` | Affordable Cold-Storage Monitoring Mesh for Marginalised Vegetable Farmers | Nashik, Maharashtra | `IMMEDIATE` / `HIGH` | `OPEN_TO_ALL` | **COMMUNITY** |
| `11111111-aaaa-4000-8000-000000000012` | `COMMUNITY`| `NGO` | Participatory Spring-Shed Hydrogeology Monitoring for Himalayan Hill Hamlets | Almora, Uttarakhand | `SHORT_TERM` / `HIGH` | `OPEN_TO_ALL` | **COMMUNITY** |

---

## 6. System & Admin Credentials

| Role | Mobile Phone | User ID | Permissions / Portal |
| :--- | :--- | :--- | :--- |
| **SUPER ADMIN** | `9800000001` | `11111111-1111-4111-8111-111111111111` | Global Admin UI (`http://localhost:3000`) — System monitoring, full problem management, cycle triggers |

---

## 7. Re-seeding and Automated Verification Scripts

* **To reset/re-seed all dummy data:**
  ```powershell
  python backend/seed_comprehensive_data.py
  ```
* **To run the complete automated test suite across all 4 portals:**
  ```powershell
  python backend/verify_all_portals.py
  ```
