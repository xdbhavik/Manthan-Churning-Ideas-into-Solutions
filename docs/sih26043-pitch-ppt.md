# SIH26043 — SIH Presentation (official 6-section template)

Hinglish. Har slide me: **slide pe kya likho**, **bolo kya**, **visual**.

Original SIH template ke 6 sections, exactly isi order me:
**Title Page → Proposed Solution → Technical Approach → Feasibility & Viability → Impact & Benefits → Research & References**

Total **15 slides** · target **8–10 min** + **2 min demo**.
Har number code se verify kiya gaya hai — "Fact-check" appendix me source likha hai.

---

# 🟦 SECTION 1 — TITLE PAGE

## Slide 1 — Title

**Slide pe likho**

> # SIH26043
> ### Societal Innovation Collaboration Portal — Jharkhand ke community challenges, universities aur industry ke beech
>
> | | |
> |---|---|
> | **Problem Statement ID** | **SIH26043** |
> | **Problem Statement Title** | *A digital platform to crowdsource societal challenges and facilitate collaborative problem solving through universities and industry partnerships* |
> | **Organization** | Government of Jharkhand |
> | **Department** | Department of Higher & Technical Education |
> | **Category** | **Software** |
> | **Theme** | ⚠️ `Disaster Management` (official sheet me) — **SIH portal se confirm karo** |
> | **Team Name** | `&lt;team name&gt;` |
> | **Team ID** | `&lt;team ID&gt;` |
> | **Institute** | `&lt;college name&gt;` |
> | **Team Members** | `&lt;naam 1&gt; · &lt;naam 2&gt; · &lt;naam 3&gt; · &lt;naam 4&gt; · &lt;naam 5&gt; · &lt;naam 6&gt;` |
>
> Crowdsource challenges → AI categorization → university + industry collaboration

**Bolo**

> "Namaste. Hum SIH26043 bana rahe hain — Jharkhand ke liye ek **Societal Innovation Collaboration
> Portal**. Matlab: citizen, PRI, ULB ya department apni community ka challenge daale; platform usko
> AI se categorize, prioritize aur sahi university tak route kare; aur university student + faculty
> team uspe solution proposal banaye — industry ke saath. Poora lifecycle, ek jagah, auditable."

**Visual** — dark background, project name bada, niche team details.

> ℹ️ **PS ID, Title, Organization, Department, Category** official PS sheet se liye gaye hain
> (`SIH2026_All_226_Problem_Statements.xlsx`, S.No 43). **Theme** wahi sheet `Disaster Management`
> bolti hai, jo content se match nahi karta — **portal se verify kar lena**, title page pe jaata hai.
> **Team details** tum bharo.

---

# 🟦 SECTION 2 — PROPOSED SOLUTION

## Slide 2 — Problem aur hamara idea

**Slide pe likho**

> ### Aaj ka process — teen taraf taakat hai, par jurne ka koi rasta nahi
> - **Citizens / PRI / ULB / departments** hi sabse pehle local problem dekhte hain — par usko
>   systematically submit karne ka **koi structured mechanism nahi**
> - **HEIs** ke paas academic expertise, research capability aur students ki poori pool hai —
>   par unhe real community problems **milte hi nahi**
> - **Industry / startups / MSMEs / CSR** ke paas funding, technical expertise aur implementation
>   capability hai — par wo academia se **jurte nahi**
> - Natija: collaboration **fragmented aur project-specific**; problem ka koi
>   categorization, evaluation, assignment ya tracking nahi
>
> ### Hamara idea
> **Ek Societal Innovation Collaboration Portal** jo poore chain ko own kare —
> **citizen challenge submit → AI categorize/prioritize → university route → student + faculty
> solution → industry support** — **har kadam ka digital record ke saath.**
>
> ### 🔑 PS ki thematic domains, aur hamari taxonomy — 11 me se 10 exact match
>
> | PS ne maanga | Hamara root domain | |
> |---|---|---|
> | education | **Education & Skills** | ✅ |
> | agriculture | **Agriculture & Food** | ✅ |
> | healthcare | **Healthcare** | ✅ |
> | water management / water resources | **Water & Sanitation** | ✅ |
> | sanitation | **Water & Sanitation** | ✅ |
> | environment | **Environment & Climate** | ✅ |
> | energy | **Energy & Utilities** | ✅ |
> | urban infrastructure / urban development | **Rural & Urban Development** | ✅ |
> | public service delivery / public administration | **Digital & e-Governance** | ✅ |
> | rural livelihoods | **Employment & Livelihoods** | ✅ |
> | accessibility | *(koi match nahi)* | ❌ |
>
> Plus hamare paas **3 extra** root domains hain jo PS ne naam nahi liye —
> `Transportation & Mobility`, `Public Safety & Justice`, `Tourism & Culture`.

**Bolo**

> "PS ka core yeh hai: Jharkhand me citizen sabse pehle problem dekhta hai, par usko submit karne ka
> koi mechanism nahi. University ke paas expertise hai par problem nahi. Industry ke paas funding aur
> implementation hai par connection nahi. Teen taraf taakat hai, jurne ka rasta nahi. Hamara idea:
> wahi bridge ban jao.
>
> Aur ek cheez dikhana chahta hoon — PS ne jo thematic domains likhi hain, hum usko apni taxonomy se
> map kiya. **Gyarah me se das exact match** karte hain. Ye sambhav nahi tha — matlab humne PS padha
> hai aur usi ke hisaab se system banaya hai, generic platform nahi."

**Visual** — left: 3 fragmented icons (citizen / university / industry) alag-alag, beech me tooti
line. Right: wahi 3 icons connected ek platform ke through, green arrows. Niche chhoti domain-mapping
table (10 ✅ / 1 ❌).

---

## Slide 3 — Solution kaise kaam karta hai (prototype)

**Slide pe likho**

> **7 steps — prototype me poora chalta hua**
>
> | # | Step | Kaun karta hai |
> |---|---|---|
> | 1 | **Actor register karta hai** — Citizen / Community / PRI / ULB / Department / Industry / HEI | Actor |
> | 2 | **Source verify hota hai** — ye actor asli hai ya nahi | **Human Reviewer** |
> | 3 | **Challenge submit hota hai** — title, description, location, domains, evidence, access rule | Citizen / Dept |
> | 4 | **Status walk** — challenge `REGISTERED` tak pahunchta hai | Admin/Evaluator |
> | 5 | **AI categorization + university routing** — domain match kar ke sahi HEIs ko bhejna | System |
> | 6 | **Scores aggregate + P1–P4 priority** — kis challenge pe pehle kaam ho | System |
> | 7 | **Portal pe publish → university team solution proposal banati hai → project review** | University team |
>
> **Kaun solve karta hai** — `STUDENT` (individual ya multidisciplinary team) aur `UNIVERSITY`
> (apne HEI account se, seedha routed challenges dekh sakti hai)
>
> **Access control per challenge** — 4 rules: `OPEN_TO_ALL` · `UNIVERSITY_ONLY` ·
> `SELECTED_UNIVERSITIES` · **`AUTO_SELECTED_UNIVERSITIES`** (AI domain nikaalta hai, Java
> deterministic match karke relevant universities ko khud route karta hai)

**Bolo**

> "Ye 7 steps hain. Step 1–3 me data aata hai. Step 4 pe problem eligible hoti hai. Step 5–6 me
> evaluation engine chalti hai. Step 7 me student ko problem milti hai aur uska solution wapas
> evaluate hota hai. Har problem ka apna access rule hai — kaun dekh sakta hai ye submitter tay karta
> hai, aur chautha rule to poora automatic hai."

**Visual** — 7-step horizontal pipeline, ek colour per stage. Ya `submitter-workflow.drawio.xml`.

---

## Slide 4 — ⭐ Solution ka core: AI kahan lagta hai, aur kahan jaan-bujhkar NAHI

**Slide pe likho**

> ### Humne AI ko sahi jagah lagaya — aur galat jagah rok diya
>
> **✅ AI lagta hai**
> 1. Problem text → domain tags
> 2. Problem analysis (complexity, impact)
> 3. AUTO pool me scorecard bhar na
>
> **⛔ AI NAHI lagta**
> - **Kaunsi university ko problem jayegi** — AI sirf domains deta hai. University match ek
>   **deterministic Java set-intersection** hai (`university_domain` table pe).
>   **Model kabhi university ka naam nahi leta.**
> - **Identity verification** — hamesha human reviewer
> - **Final priority override** — hamesha ADMIN
>
> ### Fail-closed, fail-open nahi
> AI unavailable / output kharab / koi university match nahi → **HTTP 400**, saaf message,
> aur **kuch bhi database me nahi likha jaata**.
> **Kabhi bhi chup-chaap audience widen nahi hota.**
>
> ### Control
> - Pool-wise switch: har evaluator pool `MANUAL` ya `AUTO`
> - **Kill switch** `EVALUATION_AUTO_ENABLED=false` → poora AI off, platform manual mode me chalta hai

**Bolo**

> "Ye hamara sabse strong point hai. Aaj har team kehti hai 'AI use kiya'. Hum dikhana chahte hain
> ki AI ko **kahan nahi** lagana, wo zyada important hai. Example: AI problem se domain nikaalta hai,
> par kaunsi university ko ye jayegi — wo AI decide nahi karta, wo ek simple deterministic
> set-intersection hai. Kyunki agar model ek university ka naam hallucinate kar de, to problem galat
> jagah chali jayegi. Aur agar AI fail ho, hum chupchaap 'sabko dikha do' nahi karte — hum saaf
> error dete hain aur kuch bhi save nahi hota."

**Visual** — 2 columns: left green "AI yahan", right blue "Human / Deterministic yahan".
Niche fail-closed flow diagram: `AI fail → 400 → kuch nahi likha gaya`.

---

# 🟦 SECTION 3 — TECHNICAL APPROACH

## Slide 5 — Architecture

**Slide pe likho**

> ### 5 microservices · 5 alag databases · ek gateway
>
> | Service | Kaam | Port |
> |---|---|---|
> | **source-service** | Actor registration + verification + user/role | 8081 |
> | **problem-service** | Problem aggregate, domain taxonomy, status machine, audit | 8082 |
> | **evaluation-service** | AI analysis, routing, scoring, aggregation, prioritization | 8083 |
> | **portal-service** | Participants, published problems, submissions, project review | 8084 |
> | **codejudge-service** | Code submissions ka evaluation + report | 8085 |
> | **gateway** | Single entry point, routing | 8080 |
> | **eureka-server** | Service discovery | 8761 |
>
> **Koi shared database nahi.** Har service apna data own karti hai; baaki services se sirf
> **HTTP contracts** pe baat hoti hai.
>
> **Methodology** — strangler pattern: pehle ek monolith tha, usse step-by-step 5 services me toda,
> har extraction ke baad end-to-end verify kiya.

**Bolo**

> "Ye monolith nahi hai jisme bas folders banaye hue hain. Paanch alag services, paanch alag
> databases, aur communication sirf HTTP contracts se. Iska fayda — ek service ka schema doosri ko
> tod nahi sakta, aur ek service down ho to baaki chalti rehti hain."

**Visual** — hero diagram. Gateway left → 5 services middle → 5 DB cylinders right → Eureka niche.
Dashed lines = service-to-service calls.

---

## Slide 6 — Tech stack + engineering numbers

**Slide pe likho**

> **Backend**
> - **Java 21** · **Spring Boot 4.1.1** · Maven multi-module
> - **Spring Security** (claim-based JWT) · Spring Data JPA · **Flyway** (versioned migrations)
> - **PostgreSQL 16 + PostGIS** — geographic problem locations ke liye
> - **Eureka** service discovery · API gateway
> - OpenAI-compatible LLM — **local model support** (API key repo me nahi, environment se)
>
> **Numbers**
>
> | | |
> |---|---|
> | Business microservices | **5** (+ gateway + discovery) |
> | Alag databases | **5** |
> | Java source files | **436** |
> | Automated tests | **331 tests / 31 classes** |
> | Flyway migrations | **14** |
> | Domain taxonomy | **12 root / 34 total** (3 levels) |
> | Evaluator pools | **5** — Govt · Industry · HEI · Citizen · Community |
> | Universities in catalog | **16** (34 domain mappings) |

**Bolo**

> "Stack modern hai — Java 21, Spring Boot 4.1, Postgres 16 PostGIS ke saath. 436 Java files,
> 331 automated tests, 14 database migrations. Har service ka apna database hai aur independently
> deploy hoti hai."

**Visual** — logos row + numbers table, numbers bade font me.

---

## Slide 7 — Flowchart 1: Actor → Verification → Problem

**Slide pe likho**

> ```
> Actor register (phone + OTP)
>         │
>         ▼
>   5 buckets: GOVT · INDUSTRY · COMMUNITY · CITIZEN · HEI
>         │
>         ▼
>   Source details + evidence submit
>         │
>         ▼
>   ┌─────────────────────────┐
>   │  HUMAN REVIEWER VERIFY  │   ← identity check, AI nahi
>   └─────────────────────────┘
>         │
>         ▼
>   source_account = ACTIVE + VERIFIED
>   (ek hi transaction me: source + account + KYC)
>         │
>         ▼
>   Problem file: title · description · location(GIS)
>                 domains · evidence · access rule
>         │
>         ▼
>   Status walk (Admin/Evaluator):
>   SOURCE_VERIFYING → SOURCE_VERIFIED → REGISTERED
>         │
>         ▼
>   Har change ka append-only AUDIT row (usi transaction me)
> ```
>
> 🔒 **Bina verified account, koi problem file nahi kar sakta** → `403 SOURCE_NOT_VERIFIED`

**Bolo**

> "Pehla sawaal — problem dene wala kaun hai. Registration ke baad ek human reviewer verify karta
> hai, aur jab tak verify na ho, us account se koi problem file nahi ho sakti. Ye spam ka pehla
> filter hai. Har status change ka audit row usi transaction me likhta hai, to trail kabhi adhoora
> nahi hota."

**Visual** — ye flowchart **`reviewer-workflow.drawio.xml`** se export kar lo.

---

## Slide 8 — Flowchart 2: AI evaluation engine → Portal

**Slide pe likho**

> ```
>            Problem (REGISTERED)
>                     │
>                     ▼
>          ┌──────────────────────┐
>          │  AI ANALYSIS         │  LLM problem padhta hai:
>          │                      │  domain · complexity · impact
>          └──────────────────────┘  (LLM fail → heuristic fallback)
>                     │
>                     ▼
>          ┌──────────────────────┐
>          │  ROUTING (5 pools)   │
>          └──────────────────────┘
>                     │
>    ┌────────┬───────┼────────┬────────┐
>    ▼        ▼       ▼        ▼        ▼
>  GOVT   INDUSTRY   HEI    CITIZEN  COMMUNITY
>    │        │       │        │        │
>    └────────┴───────┴────────┴────────┘
>                     │
>        MANUAL pool → least-loaded human evaluator
>        AUTO pool   → AI khud score + submit
>        koi nahi?   → pool SKIP + audit (cycle rukti nahi)
>                     │
>                     ▼
>          AGGREGATION: scores 0–100 normalise
>                       weight-config se combine
>                       spread zyada → REVIEW_REQUIRED
>                     │
>                     ▼
>          PRIORITIZATION:  P1 · P2 · P3 · P4
>                     │
>                     ▼
>          PORTAL PUBLISH  → student/university ko dikhti hai
>                     │
>                     ▼
>          Solution submit → UNDER_REVIEW → ACCEPTED / RETURNED
>                             (RETURNED → dobara submit kar sakte hain)
> ```
>
> 🔒 Jo problem visible nahi, uska endpoint **404** deta hai — `403` nahi.
> **Matlab restricted problem ka existence bhi leak nahi hota.**

**Bolo**

> "Ye hamara core engine hai. Problem analyze hoti hai, phir 5 different pools me route hoti hai —
> government evaluator, industry expert, academic, citizen, community. Har pool ka apna switch hai
> MANUAL ya AUTO. Agar koi pool unavailable ho to cycle rukti nahi — wo pool skip hota hai aur
> baaki kaam chalta rehta hai. Uske baad scores aggregate hote hain aur final priority banti hai."

**Visual** — ye flowchart **`evaluator-workflow.drawio.xml`** se export kar lo (ya `student-workflow`
+ `university-workflow` Slide 8 ke portal part ke liye).

---

# 🟦 SECTION 4 — FEASIBILITY & VIABILITY

## Slide 9 — Risks, challenges aur strategies

**Slide pe likho**

> | # | Risk / Challenge | Strategy (platform me already built) |
> |---|---|---|
> | 1 | **AI hallucination** — model galat domain/university bana de | Routing me model ka role **zero**. AI sirf domain ids deta hai, aur wo 12 root domains ke against **validate** hote hain; unknown ids **drop**. University match **deterministic Java** karta hai |
> | 2 | **AI unavailable / output kharab** | **Fail-closed**: `400` + actionable message, DB me kuch nahi likha jaata. Analysis me **heuristic fallback**. **Kill switch** se poora AI off |
> | 3 | **Evaluator shortage** — expert available nahi | Pool-wise **least-loaded** routing + workload cap. Pool khaali → **skip + audit**, cycle aage badhti hai. AUTO pool se AI cover karta hai |
> | 4 | **University name mismatch** — catalog naam vs actual naam alag | **Known limitation**: exact-normalized match (trim + lowercase). Mitigation: 16 real institutions seeded. Fuzzy/alias matching **roadmap** pe — *honest disclosure* |
> | 5 | **AI cost / latency** (~60s per call) | **Local LLM** support (near-zero marginal cost). LLM call **transaction ke bahar** — 60s call me DB connection hold nahi hota. Pool-wise switch se cost control |
> | 6 | **Cold start** — naye evaluator ka profile nahi | ADMIN onboarding API; **system AI profiles** seeded; profile ke bina clear 403/404 |
> | 7 | **Galat priority weights** | Weight config **externalized**; score spread zyada → `REVIEW_REQUIRED` flag; **ADMIN override** |
> | 8 | **Adoption** — departments ko platform pe laana | Phone + OTP registration; reviewer verification se trust; koi training zaroori nahi |

**Bolo**

> "Hum risk ko chhupate nahi. Sabse bada risk AI ka hai — aur uska jawab hai ki AI ko critical
> decision se hata diya. AI fail ho to platform fail-open nahi karta, saaf error deta hai. Evaluator
> na mile to cycle rukti nahi. Aur ek honest limitation bhi hai: university ka naam exact match hota
> hai, fuzzy matching abhi nahi hai — wo roadmap pe hai."

**Visual** — risk table, colour-coded: red/high risk, green/strategy.

---

## Slide 10 — Viability — ye sirf design nahi, bana hua hai

**Slide pe likho**

> ### Prototype ready hai, paper pe nahi
>
> | Dimension | Status |
> |---|---|
> | **Build** | 5 services + gateway + discovery **chal rahe hain** |
> | **Code** | **436** Java files |
> | **Tests** | **331** automated tests / 31 classes — service-wise isolated |
> | **Database** | 5 alag Postgres DBs, **14** versioned Flyway migrations |
> | **Security** | Claim-based JWT + `@PreAuthorize` har endpoint pe; `/internal/**` gateway se route nahi hota |
> | **Auditability** | Append-only audit log — har status change ka record |
> | **Concurrency** | Optimistic locking — do admin ek saath decide karein to ek hi jeetega |
> | **Observability** | Per-service health, discovery se instance-level view |
>
> ### Viability ke 4 reasons
> - **Cost** — 100% open-source stack; local LLM option se marginal cost ~0
> - **Scale** — services stateless; DB per service; horizontal scaling
> - **Ops** — `docker compose up` se poora stack; migrations automatic
> - **Reuse** — yahi engine kisi bhi hackathon / grant / tender evaluation pe lag sakti hai

**Bolo**

> "Ye sirf PPT pe design nahi hai. 436 Java files, 331 tests, paanch services chal rahi hain. Cost
> almost zero kyunki poora stack open-source hai aur local model support bhi hai. Aur scale ke liye
> services stateless hain — jitne instances chahiye add kar sakte ho."

**Visual** — left: green checkmark list. Right: 4 viability cards.

---

## Slide 11 — PS ke 7 modules: hum kahan hain *(honest status)*

**Slide pe likho**

> PS ne **"Expected Solution"** me 7 components maange the. Hum unke against khud ko measure karte hain:
>
> | # | PS ka module | Hamare paas | Status |
> |---|---|---|---|
> | 1 | **Citizen engagement** — citizens, community groups, **PRI**, **ULB**, govt depts; photo/video/location/documents | **11 source types** (`PRI` aur `ULB` naam se), 6 evidence types (**PHOTO · VIDEO · AUDIO · DOCUMENT · DATASET · LOCATION_PIN**) + PostGIS geo, human verification | ✅ **Strong** |
> | 2 | **AI problem management** — categorize, prioritize, **deduplicate**, route | Categorize ✅ (12 root / 34 nodes taxonomy) · Prioritize ✅ (P1–P4) · Route ✅ (AI domains → deterministic university match) · **Deduplicate ❌** | 🟡 **Good** |
> | 3 | **University collaboration** — teams, **faculty mentors**, solution proposals | Multidisciplinary teams ✅ · proposals ✅ · workflow ✅ · **faculty mentor ❌** | 🟡 **Good** |
> | 4 | **Industry partnership** — funding, prototyping, incubation, mentoring, tech transfer | 6 source types (Industry/Company/Startup/MSME/**CSR**/ResearchLab) + **funding, TRL, prototype, incubation, collaboration-sought fields maujood** · workflow 🟡 · **mentoring / tech transfer ❌** | 🟡 **Partial** |
> | 5 | **Project lifecycle** — milestones, deliverables, approvals, IP, testing | Approvals ✅ · documentation ✅ · **milestones ❌** · deliverables/IP **field-level only** · codejudge testing engine bana hai par wired nahi | 🟡 **Partial** |
> | 6 | **Visual analytics dashboard** — districts, sectors, patents, startups, trends | ❌ Read endpoints hain, dashboard nahi | ❌ **Missing** |
> | 7 | **Notification system** — poore lifecycle me | ❌ Koi notification service nahi; OTP SMS bhi placeholder | ❌ **Missing** |
>
> ### Hum apni kami khud batate hain
> **Sabse mushkil hissa — AI categorization, university routing, multi-stakeholder evaluation engine —
> bana hua hai.** Jo missing hai (analytics, notifications, dedup, mentor) **uska data model aur
> saara data already hamare DBs me hai** — sirf read/workflow layer baaki hai. **Inhe hum Phase 2
> bolte hain, aur stage pe naam le kar bolte hain.**
>
> Honest limitation: university routing abhi **domain-based** hai, **expertise-based nahi** —
> lekin `research_lab_source` me `research_area`, `trl_current` aur `equipment_facilities_available`
> fields **already maujood hain**, unhe routing me jodna next step hai.

**Bolo**

> "PS me 7 modules maange the. Main pehle apni kami batata hoon — analytics dashboard aur
> notification system abhi nahi hai, deduplication nahi hai, faculty mentor field nahi hai.
> Ye Phase 2 hai.
>
> Par jo sabse mushkil hissa hai — aur jahan zyadatar teams atak jaati hain — wo humne poora bana
> liya hai: AI categorization, standardized taxonomy, deterministic university routing,
> multi-stakeholder evaluation aur prioritization engine.
>
> Aur ek baat important hai — jo missing hai, uska **data model already hamare paas hai**. Jaise
> industry partnership ke liye funding, TRL, prototype, incubation ke real columns maujood hain.
> Sirf unke upar ka workflow baaki hai. Ye claim nahi hai, ye code me hai."

**Visual** — 7-row table, green/amber/red colour coding. Niche ek chhota honest-gap callout box.

---

# 🟦 SECTION 5 — IMPACT & BENEFITS

## Slide 12 — Impact: Social · Economic · Environmental

**Slide pe likho**

> ### 🌍 Social
> - **Transparent, merit-based selection** — "ye problem P1 kyun?" ka jawab **audit log me hai**, kisi ki opinion me nahi
> - **Equity** — chhote shehar ke colleges ko wahi opportunity jo metro colleges ko; routing automatic hai, to *references* ki zaroorat nahi
> - **Voice** — `CITIZEN` aur `COMMUNITY` buckets se aam nagrik aur local NGO apna problem rakh sakte hain, sirf bade departments nahi
> - **Accountability** — har decision attributed aur traceable
>
> ### 💰 Economic
> - **Time** — hafte bhar ka manual cycle → **same-day** automated pipeline
> - **Cost** — evaluation ka manual coordination cost bachta hai; open-source stack se licensing ~0
> - **Talent-solve matching** — MSME/startup ke real problems student talent se judte hain
> - **Ek central registry** — har challenge, uski evidence aur uska status ek jagah
>   ⚠️ *(automatic duplicate-detection Phase 2 me hai — abhi file-level dedup hai)*
>
> ### 🌱 Environmental *(honest framing)*
> - **Paper aur travel reduction** — end-to-end digital; problem submission, evaluation, scoring sab online
> - **Climate-first routing** — `Environment & Climate` ek root domain hai, aur catalog me agriculture/water/environment pe kaam karne wali universities tagged hain — climate problems unhi tak pahunchti hain
> - ⚠️ **Limitation:** software platform ka direct environmental impact modest hai. Hum overclaim nahi karenge — ye **indirect** hai

**Bolo**

> "Social impact sabse bada hai. Aaj priority ka koi record nahi hota; hamare platform me koi bhi
> poochh sakta hai ki ye problem P1 kyun mili, aur jawab log me hai. Isse chhote colleges ko bhi
> fair chance milta hai kyunki routing automatic hai — koi reference nahi chahiye. Economic side
> pe, hafte ka kaam same-day ho jaata hai. Environmental impact ke baare me main honest rahunga —
> ye indirect hai, paper aur travel bachta hai, isse zyada claim karna galat hoga."

**Visual** — 3 columns (Social / Economic / Environmental), har column me 3-4 bullets + icon.

---

## Slide 13 — Kaun benefit karega aur kitna

**Slide pe likho**

> ### Beneficiaries
>
> | Kaun | Kya milta hai |
> |---|---|
> | **Citizens / Community / NGO / SHG / CBO** | Apna local challenge seedha platform pe — bina kisi reference ke |
> | **PRI / ULB / Government departments** | Challenges verified + prioritized, evidence ke saath; district-level visibility |
> | **Universities / HEIs** | Students ko real-world problems; ek jagah routed challenges + team/faculty workflow |
> | **Students** | Equal access — routing automatic hai, to reference ki zaroorat nahi |
> | **Industry / MSME / Startups / CSR** | Apne real problems pe academic solutions; funding/prototyping ka rasta |
>
> ### Scale kya hai
> - **12 domains** × **5 evaluator pools** × unlimited challenges — routing **automatic**
> - Ek challenge ke **multiple pools** me parallel evaluation → bias kam
> - `AUTO` mode me **AI last scorecard bhar deta hai** → cycle bina human ke bhi complete ho sakti hai
> - **Reusable** — yahi engine kisi bhi societal-challenge / grant / tender evaluation pe chalegi

**Bolo**

> "Beneficiaries poore ecosystem ke hain. Aur scale ka point — 12 domains aur 5 pools, routing
> automatic. Ek problem multiple pools me parallel evaluate hoti hai, isse bias kam hota hai. Aur
> sabse important — ye engine reusable hai, SIH ke bahar bhi."

**Visual** — 5-row beneficiary table + scale bullets.

---

# 🟦 SECTION 6 — RESEARCH & REFERENCES

## Slide 14 — Prior work aur humara farak

**Slide pe likho**

> ### Pehle kya exist karta hai
>
> | Existing approach | Kami jo hamare design ne address ki |
> |---|---|
> | Google Form / spreadsheet se problem collection | **No verification, no audit trail, no lifecycle** — humne human-verified registration + append-only audit + versioned status machine lagayi |
> | Manual evaluator coordination (email/WhatsApp) | **No workload tracking, no fairness** — humne pool-wise least-loaded routing + workload cap lagaya |
> | Pure LLM-based scoring (LLM-as-a-judge) | **Black-box, hallucination risk, no accountability** — humne AI ko sirf *suggest* karne tak seemit kiya, routing deterministic rakhi, aur fail-closed banaya |
> | Crowdsourcing platforms | **No domain expertise matching, no priority model** — humne 5 domain-expert pools + weighted aggregation + P1–P4 model banaya |
> | University challenge / open-innovation portals | **Challenge post karte hain, par citizen submission + verification + routing + evaluation engine nahi** — humne poora lifecycle own kiya |
>
> ### Humara research contribution angle
> **"Human-in-the-loop, fail-closed AI"** — AI ko wahan lagana jahan uska error recoverable hai,
> aur critical deterministic decisions **code me** rakhna. Ye pattern LLM-based evaluation systems
> ke liye reusable design guideline hai.
>
> **PS ke teen named asks jo humne deliberately hard-code kiye:**
> `PRI` aur `ULB` **first-class actor types** hain (PS ne inhe naam se maanga) ·
> AI **sirf domain** deta hai, university ka naam **kabhi nahi** (deterministic Java match) ·
> koi match na mile to **400 + kuch save nahi**, silent audience-widening nahi.

**Bolo**

> "Existing me ya to sirf collection hai, ya sirf submission portal. Evaluation engine kahin nahi
> hai. Aur jo LLM-based scoring approaches hain, wo black-box hain — humne unme human-in-the-loop
> aur fail-closed behavior add kiya. Hamara design point ye hai ki AI ko wahan lagao jahan uska error
> recoverable ho."

**Visual** — 2-column: left "existing", right "hamara approach".

---

## Slide 15 — References

**Slide pe likho**

> ### Policy & problem statement *(PS ki apni foundation)*
> 1. **Ministry of Education, Government of India** (2020). *National Education Policy 2020*. — PS isi ko explicitly cite karta hai: experiential learning, multidisciplinary research, innovation, industry collaboration, community engagement.
> 2. **Government of Jharkhand, Department of Higher & Technical Education** (2026). *SIH26043 — A digital platform to crowdsource societal challenges and facilitate collaborative problem solving through universities and industry partnerships*. Smart India Hackathon 2026.
>
> ### AI governance — standards
> 3. **NIST** (2023). *Artificial Intelligence Risk Management Framework (AI RMF 1.0)*, NIST AI 100-1. U.S. National Institute of Standards and Technology.
> 4. **ISO/IEC 42001:2023** — *Information technology — Artificial intelligence — Management system*.
> 5. **NITI Aayog** (2018). *National Strategy for Artificial Intelligence*, Government of India.
> 6. **MeitY** (2021). *Responsible AI for All* — concept paper, Ministry of Electronics & IT, Government of India.
> 7. **European Union** — *Artificial Intelligence Act* (Regulation (EU) 2024/1689).
>
> ### AI evaluation — academic
> 8. **Zheng, L., et al.** (2023). *Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena*. NeurIPS 2023 (Datasets & Benchmarks). arXiv:2306.05685.
> 9. **Liu, Y., et al.** (2023). *G-Eval: NLG Evaluation using GPT-4 with Better Human Alignment*. EMNLP 2023. arXiv:2303.16634.
> 10. **Amershi, S., et al.** (2019). *Guidelines for Human-AI Interaction*. CHI 2019.
> 11. **Wu, X., et al.** (2022). *Human-in-the-loop Machine Learning: A Survey*. arXiv:2202.00622.
>
> ### Technical documentation
> 12. **Spring Boot 4.1.1** Reference Documentation — spring.io
> 13. **PostgreSQL 16** & **PostGIS** Documentation — postgresql.org / postgis.net
> 14. **Flyway** Documentation — documentation.red-gate.com/flyway
> 15. **Spring Cloud Netflix Eureka** — docs.spring.io
> 16. **Smart India Hackathon** official portal — sih.gov.in

**Bolo**

> "Hamara base PS ka apna hai — NEP 2020, jise ye problem statement khud cite karta hai. Uske upar
> AI governance ke standards — NIST ka AI Risk Management Framework aur ISO/IEC 42001. LLM-based
> scoring ke liye Zheng et al. aur Liu et al. ke papers hamare design ka base hain, aur
> human-in-the-loop ke liye Amershi et al. ki guidelines."

**Visual** — plain numbered list, chhota font. Judges references check karte hain.

---

> ## ⚠️ REFERENCES KE BAARE ME ZAROORI BAAT
>
> **Is session me web search aur web fetch dono kaam nahi kar rahe the** (search tool stub return kar
> raha tha, fetch pe authentication error aaya). Matlab **maine in references ko online verify nahi
> kiya** — ye mere knowledge se hain, aur ye sab well-known hain, phir bhi:
>
> **Submit karne se pehle har reference Google Scholar / official site pe check kar lo.**
> Galat citation judges ke saamne credibility ka loss hai, aur wo references section dekhte hain.
>
> Khaas dhyan do inpar (numbers/dates verify karna):
> - MeitY "Responsible AI for All" — exact title aur year
> - EU AI Act — regulation number `2024/1689`
> - arXiv numbers — 2306.05685, 2303.16634, 2202.00622
>
> **Aur Section 6 ko strong banane ke liye — ab tumhara PS pata hai (SIH26043, Jharkhand HE dept,
> societal innovation + university/industry collaboration), to in areas se 2–3 papers add karo:**
> - **Civic tech / citizen crowdsourcing platforms** — challenge collection aur participation
> - **University–industry collaboration** aur technology transfer models
> - **NEP 2020 implementation** / experiential learning pe published work
> - **e-Governance adoption in Indian states** (Jharkhand context ho to sona)
>
> Ye papers main nahi de sakta kyunki mujhe unke exact citations nahi pata — par judges yahi dekhte
> hain: ki tumne apne **specific** problem ke literature ko chhua hai ya generic AI papers chipka diye.

---
---

# 📎 APPENDIX — ye PPT ka hissa NAHI hai

## Appendix A — Q&A prep (judges ke likely sawaal)

| Sawaal | Jawab |
|---|---|
| **"AI hallucinate karega to?"** | Routing me AI ka role zero. Wo sirf domains deta hai, jo 12 root domains ke against validate hote hain — unknown ids drop. University match deterministic Java set-intersection hai. AI fail → **400**, DB me kuch nahi likha jaata. |
| **"Scale kaise karega?"** | Har service stateless aur independently scalable. Routing least-loaded algorithm. Pool-wise switches se load control. |
| **"Human verification kyun, AI se kyun nahi?"** | Identity verification me false-positive ki cost bahut zyada hai. Jaan-bujhkar human rakha. |
| **"Database alag kyun?"** | Ek service ka schema doosri ko tod na sake. Sirf HTTP contract shared hai. |
| **"AI ka cost?"** | Local OpenAI-compatible model support. Kill switch se poora AI off — platform manual mode me chalega. |
| **"Testing?"** | 331 automated tests / 31 test classes, service-wise isolated. |
| **"Kya ye sirf SIH ke liye hai?"** | Nahi — engine generic hai. Koi bhi process jisme challenge aata hai → categorize → route → evaluate → prioritize hota hai: societal challenges, grants, tenders, internal R&D proposals. |
| **"PS ke 7 modules me se kitne ban gaye?"** | 7 me se **5 pe kaam ho chuka hai** (1,2,3,4,5), aur **2 missing hain** (analytics dashboard, notifications). Sabse mushkil module — AI categorization + routing + prioritization — bana hua hai. Missing modules ka **data model already maujood hai**; Phase 2 me read-layer. |
| **"PS ne deduplication maanga tha?"** | Haan, aur wo **abhi nahi hai** — filhaal file-level dedup hai (identical evidence hash). Problem-level similarity detection Phase 2 me hai; hum ise flag karenge, auto-reject nahi — kyunki PS ka flow "validated" hai, human decision. *(Gap khud bolo.)* |
| **"University ko expertise ke hisaab se route karte ho?"** | Abhi **domain match** hai, expertise-weighting nahi. Lekin `research_area`, `trl_current`, `equipment_facilities_available` fields data model me already hain — unhe routing me jodna next step hai. *(Honest limitation — judge isse impress hota hai.)* |
| **"Biggest limitation?"** | (1) University name matching exact hai, fuzzy nahi. (2) Catalog abhi seeded hai, admin CRUD roadmap pe. (3) Analytics dashboard aur notification system Phase 2 me hain. *(Ye khud bolo — judge impress hota hai jab team apni limitation jaanti ho.)* |

## Appendix B — Fact-check (har number ka source)

| Claim | Source |
|---|---|
| 5 services + gateway + discovery, ports 8080–8085 / 8761 | `docker-compose.yml` |
| 5 databases (`sih_source`, `sih_problem`, `sih_eval`, `sih_portal`, `sih_codejudge`) | `db/init` + `docker-compose.yml` |
| 436 Java files | `find . -name '*.java'` |
| 331 `@Test` / 31 test classes | grep over `*/src/test` |
| 14 Flyway migrations | 5 services ke `db/migration` folders |
| 12 root domains / 34 total | `problem-service/…/V2__domain_seed.sql` |
| 4 access rules | `edith-common/…/enums/ProblemAccessRule.java` |
| 5 evaluator pools | `edith-common/…/enums/EvaluatorType.java` |
| 16 universities / 34 mappings | `problem-service/…/V5__university_catalog.sql` |
| 4 roles + 2 participant types + 5 source buckets | `UserRole` · `ParticipantType` · `SourceBucket` |
| Fail-closed 400 on AI failure | `AutoUniversitySelectionService` |
| PostGIS / Postgres 16 | `docker-compose.yml` (`postgis/postgis:16`) |
| PS ki themes me se 11 me se 10 map hoti hain | `V2__domain_seed.sql` (12 roots) vs official PS (S.No 43) |
| PRI + ULB first-class source types | `edith-common/…/enums/SubEntityType.java` |
| 6 evidence types (PHOTO/VIDEO/AUDIO/DOCUMENT/DATASET/LOCATION_PIN) | `edith-common/…/enums/EvidenceType.java` |
| Industry/research fields (funding, TRL, prototype, incubation, patent_ip_potential) | `source-service/…/V1__source_schema.sql` |
| **Analytics dashboard nahi hai** | grep `analytics\|dashboard\|trend\|district` over saare `@*Mapping` — 0 analytics hits (24 `@RequestMapping` total) |
| **Notification service nahi hai**; SMS placeholder | `OtpService.java:70` |

## Appendix C — Ready-made flowcharts (Section 3 ke liye)

5 draw.io diagrams ready hain — **File → Export as → PNG** (transparent, 2x) karke slides me daalo:

| File | Kis slide me |
|---|---|
| `reviewer-workflow.drawio.xml` | **Slide 7** (verification flowchart) |
| `evaluator-workflow.drawio.xml` | **Slide 8** (evaluation engine) |
| `student-workflow.drawio.xml` | Slide 8 ka portal part |
| `university-workflow.drawio.xml` | Slide 8 ka portal part |
| `submitter-workflow.drawio.xml` | Slide 3 (7-step journey) |

## Appendix D — Present karne se pehle 4 cheezein

1. **Slide 1 me sirf 2 cheezein bharo** — **Theme** (portal se confirm karo, sheet me
   `Disaster Management` likha hai jo content se match nahi karta) aur **team name/ID/members**.
   PS ID, Title, Organization, Department, Category **already bhar diye hain** official sheet se.
2. **Slide 12 ka environmental impact honest rakho** — maine jaan-bujhkar modest likha hai,
   overclaim mat karo. Judges overclaim pakad lete hain.
3. **Slide 2/12 ke "hafte bhar" / "same-day" claims** — ye **meri guestimate** hain, code se verify
   nahi ho sakti. Apne case ka real data daalo ya hata do.
4. **Slide 11 (PS module coverage) ko raata maar lo** — ye tumhara sabse strong slide hai aur
   isme gaps **jaan-bujhkar** likhe hain. Agar judge koi gap poochhe aur tum usse own karo, wo
   credibility banti hai. Gap chhupane ki koshish mat karo — PS ka har module judges ke saamne hai.
5. **Ek baar poora demo dry-run karo** — Docker up karke, warna stage pe surprise milega.
