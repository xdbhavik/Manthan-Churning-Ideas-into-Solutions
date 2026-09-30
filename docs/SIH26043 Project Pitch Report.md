### Pitch Report: SIH26043 — The Jharkhand Innovation Portal

#### 1\. Executive Summary

The SIH26043 project is a production-grade strategic framework designed to bridge the gap between Jharkhand’s grassroots societal challenges and the high-performance technical capabilities of its universities and industrial partners. Unlike standard reporting tools, this platform functions as an institutional nervous system, facilitating a rigorous, end-to-end innovation lifecycle. It is architected to satisfy the mandates of NEP 2020 by transforming raw community needs into scalable, verified solutions with complete technical and governance oversight.**The Jharkhand Innovation Portal**       **Transforms fragmented societal complaints**           **Into structured, verified innovation opportunities**               **Connecting knowledge seekers with industrial problem-solvers**                   **Creating a measurable, AI-ready record of social impact.**

##### Final Technical & Strategic Verdict

Metric,Rating,Strategic Context

Feasibility,4/5,High technical maturity utilizing proven microservices patterns.

Clarity,4/5,"Clearly defined ""Problem-to-Impact"" lifecycle with deterministic routing."

Innovation,High,"Beyond a portal; introduces ""Agentic Legibility"" for AI-readiness."

Tech Stack,Java 21 / React 19,"Modern, enterprise-grade stack (Spring Boot 3.x, PostgreSQL/PostGIS)."

Alignment,NEP 2020,Supports experiential learning and industry-academia synergy.

The following report details the architectural differentiators and strategic logic that elevate this platform into a high-trust innovation ecosystem.

#### 2\. Strategic Differentiators: Beyond the Marketplace

Traditional "placement portals" and civic complaint apps often fail due to a lack of technical substance and context loss. The Jharkhand Innovation Portal succeeds by enforcing technical rigour at the intake level and maintaining expert oversight throughout the resolution phase.

##### Continuity of Expertise

To mitigate "hackathon fatigue" where solutions fail to meet actual needs, we implement the  **Continuity Principle** . This ensures the specific domain expert who analyzed and scored the original problem statement is the same evaluator tasked with reviewing the final student solution.

* **Elimination of Context Loss:**  Evaluators retain the subtle nuances of the original challenge, ensuring reviews are grounded in specific expected outcomes.  
* **Persistent Scoring Rationale:**  The same criteria used to judge "Difficulty" and "Impact" during intake are applied to evaluate "Functional Alignment" at submission.  
* **High-Trust Feedback Loops:**  Students receive mentorship-level feedback from the same expert who validated the problem, mirroring professional R\&D workflows.

##### Technical Spotlight: Agentic Legibility

As we enter the era of AI-assisted engineering, the platform introduces the  **Agentic Legibility**  metric via the CodeJudge service. This score measures how easily an AI agent can navigate, understand, and operate within a project repository. By grading codebases on documentation structure, architectural layering, and command clarity, we future-proof the Jharkhand ecosystem for automated maintenance and AI collaboration.

##### AI-Augmented, Safety-First Approach

The platform utilizes LLMs for advisory analysis—extracting sectors, categories, and complexity from raw text. However, we maintain a  **Safety-First**  posture to mitigate the risks of model hallucinations or outages in public-sector workflows:

* **Advisory Only:**  AI analysis informs human evaluators but never dictates final scores or routing.  
* **Deterministic Fallbacks:**  If the AI model is unavailable, the system automatically degrades to a heuristic keyword-based classifier, ensuring the pipeline never stalls.  
* **Human-in-the-Loop:**  All automated findings are presented to experts for validation, ensuring final decisions are accountable and grounded in human context.

#### 3\. The Ecosystem Lifecycle: Problem-to-Impact

The platform is architected as a multi-actor network rather than a linear application. This ecosystem approach synchronizes the participation of government, academia, and industry to ensure societal impact.

##### The 9-Stage Problem Lifecycle

1. **Discovery:**  Citizens, ULBs, or departments identify a localized challenge.  
2. **Collection:**  Structured intake of evidence (photos, video, location, and documents).  
3. **Verification:**  Verification of problem existence and automated deduplication of repeat reports.  
4. **Categorization:**  Mapping the challenge to specific thematic domains (e.g., Agriculture, Water).  
5. **Evaluation:**  Multi-pool expert scoring to determine severity, feasibility, and impact.  
6. **Routing:**  Automatic matching to universities based on faculty and research specializations.  
7. **Challenge:**  Publication of the problem as a "Structured Innovation Opportunity."  
8. **Resolution:**  Student and industry teams collaborate to develop and submit repositories.  
9. **Impact:**  Final validation by the community or government owner to measure real-world benefit.

##### Multi-Actor Network Roles

Actor,Role as Contributor,Role as Recipient

Citizens,Provides local problem context and evidence.,Receives validated solutions and improved services.

Government,Sets official requirements; provides pilot permissions.,Gains data-driven insights and adoptable innovations.

HEIs,Provides faculty expertise and research facilities.,Gains experiential learning and research data.

Industry,"Mentorship, funding, and prototyping support.",Discovers high-performing talent and potential startups.

#### 4\. Technical Architecture: A Production-Grade Framework

The platform employs a microservices-based approach to ensure domain isolation, horizontal scalability, and independent deployment of critical engines.

##### Core Microservices

* **Source Service (Port 8081):**  Manages identity, JWT-based authentication, and university account registration. Responsible for the /auth/\* context.  
* **Problem Service (Port 8082):**  Handles the collection of problem statements and evidence storage with SHA-256 integrity. Manages the /problems/\* endpoints.  
* **Evaluation Service (Port 8083):**  Orchestrates the expert pipeline, AI advisory analysis, and pool-based routing via the /evaluation/\* context.  
* **Portal Service (Port 8084):**  The public surface managing the innovation catalog, student teams, and submissions. Responsible for the /portal/\* endpoints.  
* **CodeJudge Service (Port 8085):**  An isolated worker service for automated technical rigour and "Agentic Legibility" scoring. Managed via internal endpoints.  
* **Gateway (Caddy \- Port 8080):**  Provides secure path-based routing, SSL termination, and service discovery integration.

##### Tech Stack Rationale

Technology,Rationale,Strategic Impact

Spring Boot 3.x,"Enterprise-grade, modern Java 21 framework.",Reliability and long-term maintainability.

PostgreSQL / PostGIS,Relational storage with geospatial extensions.,Readiness for location-based impact analytics.

Netflix Eureka,Decoupled service discovery with fast failure detection.,Load-balanced @HttpExchange internal calls.

Caddy 2,Automatic HTTPS and zero-config path routing.,"Secure, simplified infrastructure management."

React 19,Type-safe (TypeScript) modern frontend.,"High-performance, responsive user interfaces."

##### Data Flow Guarantees

* **Idempotent Publish:**  Problem publication to the portal is designed as an upsert, allowing safe retries if network interruptions occur between services.  
* **Optimistic Locking:**  Every mutable entity (problems, submissions, cycles) utilizes @Version fields to prevent stale writes and ensure data consistency.  
* **Zero-Friction Onboarding:**  University profiles are automatically bound to existing HEI source accounts upon first login, ensuring no redundant registration.  
* **Fail-Closed Privacy:**  Access rules are enforced at the service level; if an access rule cannot be resolved, the problem remains hidden by default.

#### 5\. The 5-Pool Evaluation & Expertise Routing Model

Strategic validation is achieved through a multi-sectoral scoring model. Every problem is evaluated across five distinct pools to ensure viability from all angles of the ecosystem.

##### Manual/Auto Hybrid Scoring

The platform allows administrators to toggle each pool between  **MANUAL**  and  **AUTO**  modes. In AUTO mode, a specialized AI agent scores the problem based on seeded criteria. Crucially, the AI used for scoring is distinct from the advisory AI; if the model is unreachable, the system automatically degrades to manual human routing to prevent pipeline stalls.

##### Evaluation Routing Matrix

Problem Source Bucket,Corresponding Evaluator Pool

Government (GOVT),Government Experts

Industry (INDUSTRY),Industrial Specialists

Higher Education (HEI),Academic/Research Faculty

Community (COMMUNITY),Social/NGO Experts

Citizen (CITIZEN),Public Service Evaluators

##### Aggregation & Priority Logic

The final score is a weighted average of the five pools, calculated using  **HALF\_UP**  scaling to two decimal places.

* **Priority Alignment:**  The priority\_score is directly mapped from the final\_score to ensure the priority band and precise score never conflict.  
* **Disagreement Flags:**  If the spread between pools exceeds  **30%** , a "Disagreement Flag" is triggered. The status is moved to REVIEW\_REQUIRED, alerting human administrators to perform a secondary review without halting the problem's overall progress.

#### 6\. CodeJudge: Automated Technical Rigour

To provide objective technical evidence for human reviewers, the platform integrates the  **CodeJudge**  service. This ensures that every student submission is grounded in engineering reality.

##### The 3-Layer CodeJudge Model

1. **Evidence Collection:**  Automated cloning and scanning of the repository to collect build status, test results, and security vulnerabilities.  
2. **Intelligence Interpretation:**  Analysis of evidence against the specific functional requirements of the original problem statement.  
3. **Deterministic Scoring:**  A configuration-driven scoring engine that computes final marks based on findings, ensuring the same code always receives the same score.

##### Sandbox Pipeline Safety

CodeJudge executes untrusted code within a hardened, ephemeral sandbox with the following safety measures:

* x  **CPU/Memory Caps:**  Prevents resource abuse or infinite loops during builds.  
* x  **Network Isolation:**  Default "No Network" policy to prevent data exfiltration.  
* x  **Ephemeral Workspace:**  All code and artifacts are destroyed immediately after evaluation.  
* x  **Read-Only Filesystem:**  Protects the host system from malicious modifications.

##### Technical Scoring Rubric (100 Points Total)

Metric,Points,Description

Functional Implementation,25,Successful execution and passing of functional tests.

Problem Alignment,25,Mapping of solution features to stated requirements.

Engineering Quality,15,"""Agentic Legibility"" and general coding standards."

Architecture,10,"Proper layering, modularity, and separation of concerns."

Testing,10,Presence and coverage of unit and integration tests.

Security,5,"Absence of secrets, hardcoded keys, or vulnerabilities."

Documentation,5,"Quality of README, setup guides, and inline comments."

Innovation,5,Novelty of the technical approach or implementation.

#### 7\. Governance, Security, and the Access Matrix

In a public-private innovation ecosystem, "Fail-Closed" security is mandatory. We ensure that sensitive government data and student intellectual property are protected by architectural constraints.

##### Problem Access Control Matrix

Participant Type,OPEN\_TO\_ALL,UNIVERSITY\_ONLY,SELECTED\_UNIVERSITIES,AUTO\_SELECTED\_UNIVERSITIES

Student,Visible,Hidden (404),Hidden (404),Hidden (404)

University,Visible,Visible,Visible (If Whitelisted),Visible (If AI-Matched)

##### Evidence Integrity & Integrity

* **Tamper-Proof Records:**  Every file uploaded is hashed using SHA-256 upon intake.  
* **Authorized Access:**  Evaluators do not have direct access to storage; they receive time-limited, JWT-authorized download URLs specific to their assigned reviews.  
* **Zero-Friction University Onboarding:**  HEI source accounts are auto-granted "University Participant" status upon first login. The institution name is auto-populated from the verified source registration to prevent  **cosmetic UI drift** .

#### 8\. Implementation Roadmap

The implementation is phased to de-risk the platform’s highest-risk technical integrations—the code sandbox and AI routing—early in the development cycle.

##### 8-Milestone Delivery Plan

1. **M1: Foundation:**  Core microservices, Eureka discovery, and the  **edith-common / edith-security**  shared kernels.  
2. **M2: Intake & Evidence:**  Problem submission with SHA-256 hashing and location mapping.  
3. **M3: Advisory AI:**  Integration of LLMs for domain classification and problem profiling.  
4. **M4: Routing & Pools:**  Expert pool management and least-loaded routing logic.  
5. **M5: Portal & Catalog:**  Publication engine and participant access control.  
6. **M6: Submissions & Teams:**  Team formation and project submission workflows.  
7. **M7: CodeJudge Sandbox:**  Hardened execution environment for automated evaluation.  
8. **M8: Scoring & Reports:**  Final aggregation, priority banding, and impact reporting.

##### Future Extensibility

Feature,Technical Foundation

Multi-Round Resolution,Supported by the EvaluationDisagreement entity and resubmit loop.

Automated Repo Eval,CodeJudge internal API is designed for portal-triggering.

Multimedia Evaluation,File metadata snapshot system supports Video/PPT extensions.

Leaderboards,ScoreAggregation results are indexed for public ranking.

**Closing Statement**  The SIH26043 Jharkhand Innovation Portal is a sophisticated, production-ready architecture. By combining microservices isolation, deterministic AI fallbacks, and a novel approach to technical rigour through "Agentic Legibility," this platform provides the Jharkhand ecosystem with the technological foundation required to turn societal problems into measurable, scalable innovations.

&nbsp;