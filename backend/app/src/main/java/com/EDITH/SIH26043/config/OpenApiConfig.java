package com.EDITH.SIH26043.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.Operation;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.responses.ApiResponse;
import io.swagger.v3.oas.models.responses.ApiResponses;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import io.swagger.v3.oas.models.tags.Tag;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

/**
 * Swagger UI / OpenAPI 3 documentation for API testing.
 *
 * <p>UI:   http://localhost:8080/swagger-ui/index.html
 * Spec:   http://localhost:8080/v3/api-docs
 * YAML:   http://localhost:8080/v3/api-docs.yaml
 *
 * <p>JWT Bearer scheme is registered globally, so click "Authorize" once after
 * /auth/verify-otp and every protected endpoint attaches the token automatically.
 */
@Configuration
public class OpenApiConfig {

    static final String BEARER_SCHEME = "bearerAuth";

    // Tag names reused by @Tag annotations on each controller.
    public static final String TAG_AUTH = "🔐 Authentication";
    public static final String TAG_PROBLEMS = "📋 Problems";
    public static final String TAG_REGISTRATION = "📝 Source Registration";
    public static final String TAG_REVIEWER = "🔍 Reviewer Workflow";
    public static final String TAG_VERIFICATION = "✅ Source Verification";
    public static final String TAG_SOURCE_ACCOUNTS = "🏢 Source Accounts";
    public static final String TAG_DOMAINS = "🗂️ Domain Taxonomy";
    public static final String TAG_AUDIT = "📜 Audit Logs";
    public static final String TAG_USERS = "👤 Users";
    public static final String TAG_EVALUATION = "🏭 Evaluation Engine";
    public static final String TAG_EVALUATOR = "🧑‍⚖️ Evaluator Dashboard";

    @Bean
    public OpenAPI sih26043OpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("SIH26043 · Problem Collection & Verification Platform")
                        .description("""
### 🏛️ Overview

REST API for the Smart India Hackathon (SIH) 26043 — a **Problem Collection, Source
Verification & Governance** platform.

Submissions flow through three modules:

| Module | Purpose |
|--------|---------|
| **Module A** | Source onboarding → registration form → reviewer approval → verified `SourceAccount` |
| **Module B** | Problem intake via `ProblemCollectionEngine` → evidence → geo-location → domain tagging |
| **Module C** | Source/KYC verification, audit trail, problem state-machine transitions |

---

### 🔐 Quick Start (local/dev)

1. Call **`POST /auth/register`** (or `/auth/login`) with your phone number → receive a `challengeId`.
2. Dev shortcut: the fixed mock OTP is shown directly in the response (or set `MOCK_OTP_CODE=123456`).
3. Call **`POST /auth/verify-otp`** → copy the returned **`accessToken`**.
4. Click the green **Authorize ▶** button at the top-right, paste the token → **Authorize**.
5. All authenticated endpoints now attach the JWT automatically.

---

### 🧩 Source Buckets Supported
`GOVT` · `CITIZEN` · `INDUSTRY` · `COMMUNITY` · `HEI`  
(Departments, PRIs, ULBs, Individuals, NGOs, SHGs, Startups, Companies, Universities, Research Labs, …)

---

### 🧠 Design Highlights

- **Stateless JWT** auth (15-min access tokens · rotating 7-day refresh tokens)
- **Peppered HMAC-SHA-256** for OTP / identity storage (bare SHA-256 is brute-forceable on 6-digit codes)
- **Flyway** migrations (9 versions). PostgreSQL + PostGIS for geo-indexing.
- **Optimistic locking** (`@Version`) on Problem & SourceAccount → 409 on stale reviewer writes.
- **Immutable audit trail** — every mutation records (actor, IP, before, after).
- **JSONB extensibility** on Problem (`metadata`) and source payloads for unrecognized fields.

""")
                        .version("0.1.0-dev")
                        .contact(new Contact()
                                .name("Team EDITH · SIH26043")
                                .email("edith-sih26043@example.gov.in"))
                        .license(new License()
                                .name("MIT License (internal use)")
                                .url("https://opensource.org/licenses/MIT"))
                        .termsOfService("https://sih26043.example.gov.in/terms"))
                .servers(List.of(
                        new Server()
                                .url("http://localhost:8080")
                                .description("🧑‍💻 Local Dev (default)"),
                        new Server()
                                .url("http://localhost:8081")
                                .description("🧪 Test / Staging"),
                        new Server()
                                .url("https://api.sih26043.example.gov.in")
                                .description("🚀 Production")
                ))
                .tags(List.of(
                        new Tag().name(TAG_AUTH).description(
                                "🌐 PUBLIC · OTP login/register flow + JWT access & refresh token rotation."),
                        new Tag().name(TAG_PROBLEMS).description(
                                "🔒 Problem submission, retrieval, status transitions and evidence uploads."),
                        new Tag().name(TAG_REGISTRATION).description(
                                "🌐 Source registrations (public create/status, owner edit/submit, auth required for some)."),
                        new Tag().name(TAG_REVIEWER).description(
                                "🔒🔒 REVIEWER / ADMIN only — queue, assign, approve/reject/action-required."),
                        new Tag().name(TAG_VERIFICATION).description(
                                "🔒🔒 REVIEWER / ADMIN only — field + doc + API verification checks."),
                        new Tag().name(TAG_SOURCE_ACCOUNTS).description(
                                "🔒 Verified source-account handles (1 SOURCE : N PROBLEMS spine)."),
                        new Tag().name(TAG_DOMAINS).description(
                                "🌐 PUBLIC · Problem-domain taxonomy."),
                        new Tag().name(TAG_AUDIT).description(
                                "🔒🔒 REVIEWER / ADMIN only — immutable per-resource audit history."),
                        new Tag().name(TAG_USERS).description(
                                "🔒 User profile + ADMIN role management."),
                        new Tag().name(TAG_EVALUATION).description(
                                "🔒🔒 ADMIN / REVIEWER only — evaluation pipeline: intake, analysis, routing, aggregation, prioritization, handoff."),
                        new Tag().name(TAG_EVALUATOR).description(
                                "🔒 EVALUATOR role — my assignments, problem context, accept/reject/submit scores.")
                ))
                .components(new Components()
                        .addSecuritySchemes(BEARER_SCHEME, new SecurityScheme()
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .in(SecurityScheme.In.HEADER)
                                .name("Authorization")
                                .description("""
Short-lived **access token** obtained from `POST /auth/verify-otp` (valid ~15 min).  
Obtain a new pair any time via `POST /auth/refresh` using your refresh token.

```
Authorization: Bearer <accessToken>
```""")))
                ;
    }

    /**
     * Every operation can legitimately fail with 400 (bean-validation / type-mismatch /
     * unreadable body — see GlobalExceptionHandler) or 500. springdoc only documents the
     * status codes an operation explicitly declares, so contract/fuzz checks (Schemathesis)
     * flag perfectly valid 400s as "undocumented status code". Injecting shared defaults
     * onto any operation that doesn't already declare them makes the contract match the
     * real error surface. Per-operation annotations still override via the defaults here.
     */
    @Bean
    public OpenApiCustomizer defaultErrorResponses() {
        return openApi -> {
            if (openApi.getPaths() == null) {
                return;
            }
            openApi.getPaths().values().forEach(pathItem ->
                    pathItem.readOperations().forEach(OpenApiConfig::ensureDefaultErrorResponses));
        };
    }

    private static void ensureDefaultErrorResponses(Operation op) {
        ApiResponses responses = op.getResponses();
        if (responses == null) {
            responses = new ApiResponses();
            op.setResponses(responses);
        }
        // computeIfAbsent: leave any code the handler already documents untouched.
        responses.computeIfAbsent("400", k -> new ApiResponse()
                .description("Validation or conversion failure — RFC 7807 problem detail"));
        responses.computeIfAbsent("500", k -> new ApiResponse()
                .description("Unexpected server error — RFC 7807 problem detail"));
    }
}
