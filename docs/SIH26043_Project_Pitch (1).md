# SIH26043 — Societal Problem Innovation Platform
### Government of Jharkhand · Disaster Management · Software

---

## The Problem We're Solving

Communities across Jharkhand face hundreds of real, local problems every day — broken handpumps, unsafe roads, failing sanitation systems, inaccessible healthcare. Citizens see these problems first. But they have nowhere to send them that actually works.

At the same time, universities have students hungry for real projects. Industry has money, mentors, and infrastructure sitting idle. Government has the mandate but not the mechanism.

**The gap isn't talent. It isn't money. It's connection.**

There is no common infrastructure that takes a citizen's photo of a broken water pump and turns it into a verified, deduplicated, domain-classified challenge that automatically lands on the desk of the right water-engineering faculty member at the right university — with an industry partner already notified.

We built that infrastructure.

---

## What We Built

**SIH26043 is a production-grade, end-to-end platform** that takes a raw citizen complaint and carries it all the way through to a scored, reviewed, implemented student solution — with every decision traceable, every participant notified, and AI working at every stage to reduce manual work without ever replacing human judgment.

The platform serves four groups simultaneously:

- **Citizens and local bodies** — submit problems from their phones
- **Government and industry** — submit formal challenges and sponsor solutions
- **Universities and students** — discover verified challenges, form teams, build and submit solutions
- **Evaluators and admins** — score problems, review solutions, manage the pipeline

---

## The Full Lifecycle — From Street-Level Problem to Implemented Solution

```
Citizen spots broken handpump
         ↓
Submits via mobile app (photo + location + description)
         ↓
AI classifies domain (Water Management) — multilingual, works in Hindi
         ↓
Sentence embedding check: 19 similar reports already exist → deduplicated into one canonical challenge
         ↓
Problem verified and registered
         ↓
AI + human evaluators score it: urgency 8/10, feasibility HIGH, impact 1,200 people
         ↓
Auto-routed to universities whose faculty expertise matches "Water Quality + Rural Infrastructure"
         ↓
University team forms, submits a solution prototype
         ↓
CodeJudge runs automated technical evaluation on their GitHub repo
         ↓
Human evaluator reviews, accepts the solution
         ↓
All four parties notified — citizen, university, industry partner, government
         ↓
Impact recorded. Contributors credited.
```

This is not a concept. Every step in this flow is a working, tested microservice.

---

## The Five Features That Make This Different

### 1. Sentence Embedding Deduplication
*The feature judges have never seen done right.*

When 20 citizens report the same broken handpump using completely different words, traditional systems create 20 separate tickets. Ours doesn't.

Every incoming problem is converted into a semantic vector using sentence embeddings. Before it enters the system as a new record, it's compared against all existing problems. If the semantic similarity crosses the threshold, the new report is merged into the existing canonical challenge — and its evidence (photo, location, description) is added to strengthen the original record.

The result: one well-evidenced challenge instead of twenty duplicates. More upvotes. Higher priority. Faster routing. This is **the technical heart of the platform** and it works on citizen-written natural language, not structured forms.

### 2. Multilingual AI Domain Classification + Faculty Expertise Matching
*From a Hindi complaint to the right professor's inbox — automatically.*

Our classification pipeline handles submissions in Hindi, English, and mixed-language text. It uses an LLM-backed domain resolver that maps free-text problem descriptions to our three-level domain taxonomy (12 root domains, 26 sub-domains, 6 specialisations). The AI never hard-codes the university match — it identifies the domain, and a deterministic semantic matching engine then intersects that against our faculty expertise directory to find the right department and the right people.

This means routing decisions are:
- Explainable — you can see exactly which domains matched which faculty profiles
- Safe — the AI identifies the domain; a deterministic engine makes the routing call
- Audited — every routing decision is logged with the domain evidence that drove it

### 3. AI-Assisted Multi-Pool Evaluation with Human Continuity
*Five expert perspectives. One weighted score. The same human who scored the problem reviews the solution.*

Every verified problem goes through a five-pool evaluation: Government, Industry, Community, HEI, and Citizen perspectives each contribute a weighted score. Each pool can run in MANUAL mode (human evaluator) or AUTO mode (AI scores and submits on its own). When all five pools are on AUTO, a problem goes from registered to published with zero human intervention required.

Before any pool scores it, the platform runs **AI-assisted problem analysis**: an LLM generates a structured profile of the problem — category, sector, impact areas, complexity, scale, tech relevance, social impact — with a deterministic fallback if the model is unavailable. This analysis is **advisory only**. It runs outside the scoring transaction and never contributes to the evaluation score directly; it exists purely to give human evaluators a head start, not to make the call for them.

The innovation here is **continuity**: the evaluator who scored the original problem is the same person who later reviews the student solution. They already understand the domain, the context, and the expectations. This is not incidental — it's a design principle baked into the data model.

And critically: **project reviews are always human**. Even when a problem's five pools were entirely scored by AI in AUTO mode, a human evaluator is always assigned to the student solution review. No student's work is judged by a machine alone. Across the whole platform, AI is a **co-pilot, not the pilot** — advisory where it assists analysis, configurable as an active AI evaluator where pools are set to AUTO, but never the final, unaccountable word on a person's work.

### 4. CodeJudge — Automated Solution Evaluation
*The only hackathon platform that evaluates the code, not just the description.*

When a student team submits a GitHub repository, CodeJudge clones it at a pinned commit, and runs a full multi-stage evaluation pipeline:

- **Repository scan** — language detection, framework identification, build system, test coverage, documentation
- **Build and run** — does it actually build? Does it start? Does the API respond?
- **Security scan** — secrets detection, SAST findings, dependency vulnerabilities
- **Architecture analysis** — coupling, structure, code quality
- **Problem requirement matching** — does the solution actually address what was asked?
- **Agentic Legibility Scoring** — a novel metric that grades how well the codebase is structured for AI-assisted development: bootstrap clarity, command discoverability, architecture documentation, test coverage, security posture

Every score is traceable to a specific artifact — a test run result, a file, a finding. The AI contributes assessments; a deterministic engine computes the final score. Same commit + same config = same score, always.

This gives evaluators a rich evidence deck before they even open the repository.

### 5. Notification Fan-out Across All Four Parties
*No one is left waiting.*

Every state transition in the lifecycle triggers targeted notifications. A citizen gets told when their problem was verified, when it was matched to a university, and when a solution was accepted. A university gets notified the moment a new challenge in their domain is published. An evaluator gets pinged when a submission lands in their queue. An industry partner gets a summary when a solution is ready for mentorship or prototyping.

This runs as a dedicated notification service delivering via email and mobile push — so the platform stays alive in people's pockets, not just on a dashboard they have to remember to check.

---

## Architecture — Built to Production Standards

The platform is a **true microservices system** — not a monolith split into folders, but independent services with their own databases, their own schema migrations, and their own deployment units.

```
Citizen App (Android/iOS)    Web Browsers
         │                        │
         └──────────┬─────────────┘
                    ▼
          Caddy API Gateway (:8080)
                    │
    ┌───────┬───────┼───────┬───────┬───────┐
    ▼       ▼       ▼       ▼       ▼       ▼
source  problem  eval   portal  codejudge  notify
:8081   :8082   :8083  :8084   :8085      :8086
  │       │       │      │       │           │
 DB      DB      DB     DB      DB        (fanout)
```

| Service | Responsibility |
|---|---|
| **source-service** | Identity, OTP auth, source registration, citizen mobile app backend |
| **problem-service** | Problem intake, sentence embedding deduplication, AI domain classification, evidence storage, access rules |
| **evaluation-service** | 5-pool scoring pipeline, faculty expertise matching, AI/human auto-routing, aggregation, prioritisation |
| **portal-service** | Multi-tenant portal (university + industry roles), solution submissions, team formation, file management |
| **codejudge-service** | Automated repo evaluation, agentic legibility scoring, sandbox execution, evidence-backed scoring |
| **notification-service** | Fan-out across email and mobile push for all lifecycle events |

**Gateway:** Caddy 2 — automatic HTTPS, path-based routing, blocks internal service calls from the public internet.

**Service discovery:** Netflix Eureka — all services register and resolve peers by ID, not fixed URLs. Stateless and horizontally scalable.

**Database:** PostgreSQL 16 per service — complete data isolation. No cross-service foreign keys. No shared schema.

**Auth:** Shared claim-based JWT (OTP login, no passwords) — works identically for web and mobile. Stateless across all services.

**AI layer:** OpenAI-compatible local LLM for domain classification, problem analysis, and advisory scoring — with a deterministic heuristic fallback so the pipeline never blocks if the model is unavailable.

**Tech stack summary:** Spring Boot 4.x · Java 21 · PostgreSQL 16 · Flyway · Spring Cloud Netflix Eureka · Caddy 2 · React 19 · TypeScript · Vite 6 · Tailwind CSS 4 · Docker + Docker Compose

---

## The Four Interfaces

| Interface | Who Uses It | Key Capabilities |
|---|---|---|
| **Citizen Mobile App** (Android + iOS) | Citizens, panchayats, local bodies | Submit problems with photo/video/location, track status, receive notifications |
| **Innovation Portal** (web) | University teams, students, industry | Browse verified challenges, form teams, submit solutions, track reviews |
| **Evaluator Workspace** (web) | Domain experts, faculty | Review scored problems, evaluate student submissions, see AI evidence |
| **Admin Dashboard** (web) | Admins, government reviewers | Manage pipeline, configure routing, monitor analytics, publish problems |

---

## Security and Data Integrity

Every design decision treats data correctness as non-negotiable:

- **Access control on every read and write** — a student never sees a restricted problem; visibility is enforced server-side, not filtered in the UI
- **Optimistic locking** — two concurrent decisions on the same record cannot both win; one gets a 409 conflict
- **Idempotent operations** — publishing a problem twice produces one record, not two; retry-safe throughout
- **Full audit trail** — every state transition, routing decision, and evaluation action is logged in the same transaction as the change it records
- **SHA-256 evidence integrity** — every uploaded file is hashed; duplicates are detected, originals are preserved
- **Sandbox-isolated code execution** — student code runs in ephemeral containers with no network access to production data
- **No secrets in code** — all credentials via environment variables; JWT secret minimum 32 bytes

---

## The Demo Flow (2 Minutes, Maximum Impact)

1. Open the citizen mobile app. Submit a photo of a broken handpump in Ranchi with a Hindi description.
2. Watch the platform classify it: domain "Water Management → Rural Infrastructure" — in real time.
3. Show the deduplication screen: 3 similar existing reports detected, merged. Evidence count goes from 1 to 4.
4. Walk the problem through evaluation: AI scores all five pools in AUTO mode. Priority band assigned. Status: PHASE_3_READY.
5. Switch to the university portal. The challenge has appeared on the dashboard of the Water Engineering department — automatically routed by faculty expertise match.
6. Show the notification: faculty member's phone received a push notification 12 seconds ago.
7. Switch to a student account. Form a team, submit a GitHub repo as the solution.
8. Open CodeJudge results: build passed, 14/17 requirements matched, agentic legibility score 76/100, security: no critical findings.
9. Evaluator accepts the solution. Citizen gets notified. Challenge closed.

---

## Why This Wins

**The real innovation is not any single feature — it's that all five work together in one coherent pipeline.**

Other platforms stop at submission. We go from street-level complaint to scored, reviewed, credited solution — with AI working at every handoff and a human in the loop at every decision that matters.

The features that matter most to a judge:

- **Deduplication via sentence embeddings** — technically substantive, genuinely useful, demonstrable in real time
- **Multilingual classification** — works in Hindi, which is what Jharkhand citizens actually write
- **Semantic faculty matching** — routing is evidence-based and auditable, not a dropdown someone filled in
- **CodeJudge agentic legibility** — a forward-looking metric that no other hackathon platform evaluates
- **Human continuity principle** — the same expert who understood the problem is the one who judges the solution
- **AI as co-pilot, not pilot** — advisory analysis speeds up experts, AUTO mode handles the routine load, but a human always has the final say on a student's work

This platform is not a website where people post problems. It is infrastructure that connects society's needs to the people capable of solving them — and it proves that connection worked.

---

*SIH26043 · Built on Spring Boot 4.x, React 19, PostgreSQL 16 · 6 microservices · 4 frontends · Fully containerised · One command to deploy*
