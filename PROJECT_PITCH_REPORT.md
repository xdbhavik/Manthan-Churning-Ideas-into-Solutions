# SIH26043 — Innovation Portal Platform

## Executive Summary

**SIH26043** is a **microservices-based innovation portal platform** designed for the Smart India Hackathon (SIH) ecosystem. It implements a complete **problem-to-solution lifecycle**: from problem statement ingestion by government/industry sources, through AI-assisted evaluation by domain experts, to automated publication on a public portal where students and universities submit solutions — which are then reviewed by the **same evaluator** who assessed the original problem, ensuring continuity and domain expertise.

The platform comprises **6 independent microservices** + **4 specialized frontend applications**, all containerized with Docker, orchestrated via Docker Compose, and communicating through a **Caddy API Gateway** with **Eureka service discovery**.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              EXTERNAL USERS (Browsers)                                │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                        CADDY API GATEWAY (:8080)                                      │
│         Routes: /auth/* → source:8081  |  /problems/* → problem:8082                  │
│                  /evaluation/* → eval:8083  |  /portal/* → portal:8084                │
│                  /internal/* (blocked from external)                                   │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                       │
         ┌───────────────┬─────────────┼─────────────┬─────────────┬───────────────┐
         ▼               ▼             ▼             ▼             ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ source-svc   │ │ problem-svc  │ │ evaluation-  │ │ portal-svc   │ │ codejudge-   │
│ :8081        │ │ :8082        │ │ svc :8083    │ │ :8084        │ │ svc :8085    │
│ sih_source   │ │ sih_problem  │ │ sih_eval     │ │ sih_portal   │ │ sih_codejudge│
│              │ │              │ │              │ │              │ │              │
│ Auth/Identity│ │ Problem      │ │ Evaluation   │ │ Innovation   │ │ Automated    │
│ Source reg.  │ │ Collection   │ │ Pipeline +   │ │ Portal       │ │ Code Eval    │
│ University   │ │ Evidence     │ │ AI Analysis  │ │ Submissions  │ │ (Agentic     │
│ accounts     │ │              │ │ Routing      │ │ Project      │ │  Legibility) │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
         ▲               ▲             ▲             ▲             ▲               ▲
         │               │             │             │             │               │
         └───────────────┴─────────────┴─────────────┴─────────────┴───────────────┘
                                       │
                    ┌──────────────────┴──────────────────┐
                    ▼                                     ▼
            ┌─────────────┐                      ┌─────────────┐
            │  POSTGRES   │                      │  POSTGRES   │
            │  (per-svc DB)                       │  (shared   │
            │  sih_source │                      │   volume)   │
            │  sih_problem│                      │  evidence/  │
            │  sih_eval   │                      │  portal/    │
            │  sih_portal │                      │  codejudge  │
            │  sih_codejudge                     │  workspaces │
            └─────────────┘                      └─────────────┘
```

### Service Registry & Discovery
- **Netflix Eureka** (`:8761`) — all services register and resolve peers by service ID
- Self-preservation disabled for fast failure detection
- Internal service calls use Eureka-resolved URLs (load-balanced)

---

## Tech Stack Highlights

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Backend Framework** | Spring Boot 3.x / 4.x, Java 21 | Modern, performant, enterprise-grade |
| **Build** | Maven multi-module reactor | Single source of truth, shared dependencies |
| **Database** | PostgreSQL 16 + PostGIS (per-service DB) | Data isolation, polyglot persistence |
| **Schema Migration** | Flyway (versioned, validated) | Safe, repeatable migrations |
| **Service Discovery** | Spring Cloud Netflix Eureka | Decoupled internal communication |
| **API Gateway** | Caddy 2 | Automatic HTTPS, simple config, path-based routing |
| **Auth** | Shared JWT (HS256, 15-min access / 7-day rotating refresh) | Stateless, cross-service auth |
| **Security** | Spring Security OAuth2 Resource Server, method-level `@PreAuthorize` | Role-based + participant-kind authorization |
| **AI/LLM** | OpenAI-compatible client (local model router) + deterministic heuristic fallback | Never blocks pipeline; advisory analysis only |
| **Frontend** | React 19 + Vite 6 + TypeScript + Tailwind CSS 4 | Modern, fast, type-safe |
| **Containerization** | Docker multi-stage (builder → nginx) | Small prod images, SPA routing |
| **Observability** | Structured logging, audit_log tables per service | Traceable lifecycle events |

---

## Core Features by Persona

### 1. Problem Sources (Government, Industry, Citizens, Universities, Communities)
- **Submit problem statements** with metadata: bucket (GOVT/CITIZEN/INDUSTRY/COMMUNITY/HEI), urgency, severity, domains, location, expected outcomes
- **Attach evidence** (documents, images, datasets) — stored with SHA-256 integrity
- **Track status** through registration → evaluation → publication

### 2. Evaluators (Domain Experts)
- **Receive assigned problems** via least-loaded routing by domain bucket
- **AI-assisted problem analysis** — LLM generates structured profile (category, sector, impact areas, complexity, scale, tech relevance, social impact) with deterministic fallback
- **Score problems** using configurable rubrics (criteria weights managed per evaluator profile)
- **Review student submissions** — same evaluator who scored the problem reviews the solution (continuity principle)
- **ACCEPT / RETURN decisions** with mandatory remarks for returns; auto-pushes result to portal

### 3. Admins / Reviewers
- **Start evaluation cycles** for registered problems
- **Drive pipeline manually** (analyze → route → aggregate → prioritize → complete)
- **Monitor queue** with real-time status, scores, priority bands
- **Manual portal publish retry** (idempotent) when auto-publish fails
- **Audit trail** for every state transition

### 4. Students / University Teams (Participants)
- **OTP-based login** (phone + optional email) — no passwords, dev OTP in response for local testing
- **Auto-bind university accounts** — HEI source account owners become `UNIVERSITY` participants on first login (no second registration)
- **Browse published catalog** — filtered by access rule (`OPEN_TO_ALL` / `UNIVERSITY_ONLY` / `SELECTED_UNIVERSITIES`)
- **Create submissions** — solo or collegiate teams; title, abstract, GitHub, demo links, file uploads (50 MB/file)
- **Draft → Submit → Under Review → Accepted / Returned** lifecycle with resubmit rounds
- **Track review status** with evaluator comments

### 5. Automated Code Evaluation (CodeJudge Service)
- **Agentic Legibility Scoring** — grades repositories on 7 categories (Bootstrap, Commands, Docs, Architecture, Testing, Quality, Security) for AI-agent readiness
- **Async job queue** with deterministic state machine
- **Python scanner** (stdlib only) + optional LLM qualitative pass
- **Sandbox-gated execution** (off by default for safety)
- **Integrates with portal** via internal API for future automated repo evaluation

---

## Key Workflows

### A. Problem Ingestion → Evaluation → Publication
```
1. Source submits problem → problem-service (REGISTERED)
2. Admin starts cycle → evaluation-service (RECEIVED)
3. AI Analysis (LLM + heuristic fallback) → ANALYZING → ROUTING
4. Auto-route to least-loaded matching evaluator → EVALUATION_IN_PROGRESS
5. Evaluator scores via rubric → EVALUATION_COMPLETED
6. Auto-publish to portal (best-effort, idempotent) → PublishedProblem visible
```

### B. Participant Onboarding (Zero-Friction for Universities)
```
1. User logs in with phone (OTP) → JWT from source-service
2. GET /portal/me
   ├─ Has participant profile? → Return it
   └─ No profile → Call source-service for HEI accounts
       ├─ Has ACTIVE+VERIFIED HEI? → Auto-create UNIVERSITY participant (institution name from source)
       └─ No HEI → 404 STUDENT_NOT_REGISTERED → POST /portal/participants (STUDENT)
```

### C. Submission Lifecycle with Resubmit Loop
```
1. Participant creates DRAFT (solo or team; all members must see problem)
2. Upload files, edit meta (DRAFT/RETURNED only)
3. POST /submit
   ├─ Validates artifact exists (title/summary/file/link)
   ├─ Snapshots files, increments round
   ├─ POST eval /internal/project-reviews → creates review for SAME evaluator
   │   └─ On eval failure → rollback to DRAFT (no orphan SUBMITTED)
   └─ Status → UNDER_REVIEW (reviewer_user_id stored)
4. Evaluator decides:
   ├─ ACCEPT → Portal ACCEPTED + comment
   └─ RETURN → Portal RETURNED + mandatory comment
       └─ Participant edits → Resubmit → New round → Same evaluator
```

### D. Access Control (canSee) — Never Leaks Restricted Problems
| Participant Type | OPEN_TO_ALL | UNIVERSITY_ONLY | SELECTED_UNIVERSITIES |
|------------------|-------------|-----------------|----------------------|
| **STUDENT** | ✅ Visible | ❌ Hidden (404) | ❌ Hidden (404) |
| **UNIVERSITY** | ✅ Visible | ✅ Visible | ✅ Only if institution in whitelist |

Applied at: catalog list, detail view, submission create, team member join.

---

## Innovation Highlights & Differentiators

### 1. **Continuity of Expertise**
> *The same evaluator who analyzed the problem reviews the student's solution.*
- Eliminates context loss; evaluator knows the problem's nuances, expected outcomes, scoring rationale
- Implemented via `evaluator_profile_id` linkage from evaluation cycle → project review

### 2. **AI-Augmented, Never AI-Blocked**
- LLM analysis runs **outside** the scoring transaction
- Deterministic heuristic fallback guarantees pipeline never stalls on model outage
- Analysis is **advisory only** — never contributes to evaluation score
- Structured JSON output with strict schema validation

### 3. **Zero-Friction University Onboarding**
- No separate university registration flow
- HEI source account = instant `UNIVERSITY` participant on first portal login
- Institution name auto-populated from source registration

### 4. **True Microservices Isolation**
- **No shared databases** — each service owns its schema
- **No shared role model** — portal resolves participant kind from source accounts, not JWT roles
- **Internal contracts only** — `/internal/**` endpoints, Eureka-resolved, never through gateway
- **Best-effort cross-service pushes** — eval→portal publish & review-result are fire-and-forget (logged, never thrown)

### 5. **Evidence Integrity & Authorization**
- SHA-256 on every uploaded file
- File bytes stored on dedicated `portal-files` volume (not in DB)
- Download authorization: submitter/team member OR assigned reviewer OR REVIEWER/ADMIN
- Evaluator downloads via portal `contentUrl` with their own JWT

### 6. **Optimistic Locking Everywhere**
- `@Version` on every mutable entity (problem, cycle, submission, participant, review)
- Stale writes → 409 CONFLICT, mirrors across all services

### 7. **Agentic Legibility Scoring (CodeJudge)**
- Novel metric: **how well can an AI agent operate in this repo?**
- 7-category rubric (100 pts), mechanical scanner + qualitative pass
- Zero runtime dependencies (stdlib only)
- Integrated as async internal service for future automated evaluation

---

## Frontend Applications (4 Specialized UIs)

| App | Port | Users | Key Features |
|-----|------|-------|--------------|
| **Innovation Portal UI** | 3003 | All (Participant/Evaluator/Admin) | Unified SPA with role-adaptive dashboard, problem catalog (grid/table, multi-filter), submission dossier, review workbench, admin cycles, rubrics, nodal institutes directory |
| **Admin UI** | 3000 | Admin/Reviewer | User management, problem registry, registrations, evaluation monitoring, audit logs |
| **Evaluator UI** | 3001 | Evaluator | Work queue, criteria panel, assignment scoring, profile management |
| **Submitter UI** | 3002 | Student/University | Problem submission wizard, team formation, file upload, status tracking |

**Shared Design System**: Material Symbols, consistent color tokens (`#00152f` primary, `#795900` amber, `#002c47` teal), Inter font, 8px roundness.

---

## Security & Compliance

| Concern | Implementation |
|---------|----------------|
| **Authentication** | OTP (SMS/email) → JWT pair; dev mock OTP for local testing |
| **Authorization** | JWT roles (SUBMITTER, EVALUATOR, ADMIN, REVIEWER) + server-side `canSee(participant, problem)` |
| **Token Rotation** | Refresh token rotated on every use; old token revoked immediately |
| **Audit Trail** | Per-service `audit_log` table: actor, action, entity, before/after snapshots, IP |
| **File Safety** | 50 MB upload cap, content-type validation, SHA-256, sanitized filenames |
| **Rate Limiting** | OTP: 5 requests/phone/hour (source-service) |
| **No Secrets in Code** | All secrets via `.env` / compose env substitution; JWT secret min 32 bytes |

---

## Deployment & Operations

### One-Command Startup
```bash
# Build all jars
./mvnw -DskipTests package

# Start full stack (db, eureka, 5 services, gateway, 4 frontends)
docker compose up -d --build
```

### Service Endpoints (via Gateway :8080)
| Service | Internal | Gateway Path |
|---------|----------|--------------|
| Source Auth | :8081 | `/auth/*` |
| Problem Collection | :8082 | `/problems/*` |
| Evaluation Pipeline | :8083 | `/evaluation/*` |
| Innovation Portal | :8084 | `/portal/*` |
| CodeJudge | :8085 | (internal only) |

### Frontend Access
- Innovation Portal: **http://localhost:3003**
- Admin UI: http://localhost:3000
- Evaluator UI: http://localhost:3001
- Submitter UI: http://localhost:3002

### Health Checks
- PG: `pg_isready` on `postgres` maintenance DB
- Services: Spring Boot Actuator `/actuator/health` (not exposed externally)
- Eureka: `:8761` dashboard

---

## Data Flow Guarantees

| Guarantee | Mechanism |
|-----------|-----------|
| **No restricted problem leak** | `canSee` enforced on every read + write; 404 for invisible |
| **No submission without review** | Portal→eval create is transactional; failure rolls back |
| **No scorecard rollback on portal outage** | Eval→portal pushes are best-effort, outside scoring transaction |
| **Idempotent publish** | Portal upserts on `problem_id`; safe to retry |
| **Idempotent review create** | `UNIQUE(submission_id, round)` in eval DB |
| **Idempotent review decision** | Duplicate push → no-op on portal |
| **Optimistic concurrency** | `@Version` on all mutable entities → 409 on stale write |

---

## Testing & Quality

- **Unit/Integration tests** per service (Spring Boot testcontainers for PostgreSQL)
- **Contract tests** for internal DTOs (`edith-common` shared module)
- **CodeJudge scanner tests** (Python unittest, zero dependencies)
- **Flyway migration validation** (`ddl-auto: validate`)
- **OpenAPI/Swagger** on every service (`/swagger-ui.html`)

---

## Why This Project Wins

### For SIH Judges
1. **Complete end-to-end lifecycle** — problem → evaluation → publication → submission → review → decision
2. **Real microservices architecture** — not a monolith split; true DB isolation, service discovery, async contracts
3. **AI integration with safety** — LLM used for advisory analysis only; deterministic fallback; never blocks
4. **Domain-driven design** — each service owns a clear bounded context (auth, problem, evaluation, portal, codejudge)
5. **Production-ready patterns** — Eureka, Caddy, Flyway, optimistic locking, audit logs, rotating tokens
6. **Innovation in evaluation** — Agentic Legibility Scoring is a novel, forward-looking metric

### For Stakeholders (Government/Industry)
- **Transparency** — full audit trail from problem submission to final decision
- **Scalability** — stateless services, horizontal scaling via Eureka
- **Extensibility** — new source buckets, evaluation criteria, access rules without schema changes
- **University engagement** — zero-friction onboarding brings institutions in instantly

### For Developers
- **Clean codebase** — multi-module Maven, shared kernel (`edith-common`, `edith-security`), strict typing
- **Developer experience** — dev OTP, Swagger UI, hot-reload frontends, single `docker compose up`
- **Observability** — structured logs, status history tables, audit events

---

## Future Extensibility (Designed In)

| Feature | Foundation Already Present |
|---------|---------------------------|
| Multi-round evaluator disagreement | `EvaluationDisagreement` entity + repository |
| Automated repo evaluation on submit | CodeJudge internal API (`/internal/codejudge/evaluations`) |
| Student-college team linking | `Team` / `TeamMember` entities support cross-participant teams |
| Deadlines & SLA on reviews | `EvaluationCycle` has `startedAt`/`completedAt`; can add `dueAt` |
| Leaderboards / public rankings | `ScoreAggregation` + `finalScore` + `priorityScore` on cycle |
| Portal audit log | Evaluation audits decisions; portal can add its own table |
| Evidence binary sharing | Current: snapshot only; future: signed URLs or shared object store |

---

## Repository Structure

```
bana-to-lete-hai-pehle/
├── docker-compose.yml              # Frontend stack (4 UIs)
├── backend/
│   ├── docker-compose.yml          # Full microservices stack (6 svcs + db + eureka + gateway)
│   ├── pom.xml                     # Reactor parent (edith-common, edith-security, 5 services)
│   ├── source-service/             # Auth, identity, source registration (8081)
│   ├── problem-service/            # Problem collection, evidence (8082)
│   ├── evaluation-service/         # Pipeline, AI analysis, routing, project review (8083)
│   ├── portal-service/             # Innovation portal, participants, submissions (8084)
│   ├── codejudge-service/          # Automated repo evaluation (8085) + Python scanner
│   ├── edith-common/               # Shared DTOs, enums, internal contracts
│   ├── edith-security/             # JWT auth, AuthUser, security config
│   ├── gateway/Caddyfile           # API gateway routing
│   └── db/init/                    # Flyway init scripts (per-service DB creation)
├── frontend/
│   ├── innovation-portal-ui/       # Main unified portal (React 19, TS, Vite, Tailwind 4)
│   ├── admin-ui/                   # Admin dashboard
│   ├── evaluator-ui/               # Evaluator workspace
│   ├── submitter-ui/               # Student/University submission UI
│   └── docker-compose.yml          # Frontend-only compose
└── PROJECT_PITCH_REPORT.md         # This file
```

---

## Closing Statement

**SIH26043 is not a prototype — it's a production-grade platform architecture** that demonstrates:

✅ **Microservices done right** (isolation, discovery, contracts, resilience)  
✅ **AI as a co-pilot, not the pilot** (advisory analysis, deterministic fallback)  
✅ **Domain expertise continuity** (same evaluator, problem-to-solution)  
✅ **Zero-friction onboarding** (universities appear on first login)  
✅ **Novel evaluation science** (Agentic Legibility for the AI era)  
✅ **Full-stack delivery** (6 services, 4 UIs, gateway, DB, CI-ready)

This platform solves the core SIH challenge: **connecting real-world problems to student solutions with expert oversight, transparency, and technological rigor** — while introducing a forward-looking metric (agentic legibility) that prepares the ecosystem for AI-assisted development.

---

*Generated from comprehensive codebase analysis — every service, controller, entity, frontend component, and integration point documented above reflects the actual committed implementation.*