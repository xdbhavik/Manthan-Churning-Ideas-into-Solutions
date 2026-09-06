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
 * Swagger UI / OpenAPI 3 documentation for problem-service (8082).
 *
 * <p>UI:   http://localhost:8080/problem-service/swagger-ui/index.html
 * Spec:   http://localhost:8080/problem-service/v3/api-docs
 *
 * <p>The JWT Bearer scheme is registered globally so "Authorize" once works for
 * the whole surface.
 */
@Configuration
public class OpenApiConfig {

    static final String BEARER_SCHEME = "bearerAuth";

    // Tag names reused by @Tag annotations on each controller.
    public static final String TAG_PROBLEMS = "📋 Problems";
    public static final String TAG_DOMAINS = "🗂️ Domain Taxonomy";
    public static final String TAG_AUDIT = "📜 Audit Logs";

    @Bean
    public OpenAPI sih26043ProblemOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("SIH26043 · Problem Service")
                        .description("""
### 🏛️ Overview

REST API for the **problem aggregate** of the SIH26043 platform — problem intake,
evidence, geo-location, domain tagging, the status state-machine and the
problem-scoped audit trail.

This service owns the `sih_problem` database. It authorizes submissions against
source-service (`GET /internal/source-accounts/{id}`) and serves problem context
to evaluation-service (`GET /internal/problems/{id}`).

| Endpoint group | Purpose |
|----------------|---------|
| **Problems** | Submission via a verified source account, retrieval, status transitions, evidence upload |
| **Domain taxonomy** | Public 3-level problem-domain tree |
| **Audit logs** | Immutable per-problem action trail (REVIEWER+) |

---

### 🔐 Quick Start (local/dev)

1. Get a JWT via **source-service** (`POST /auth/verify-otp`, fixed mock OTP `123456`).
2. Click **Authorize ▶**, paste the token.
3. Call `POST /problems` with a `sourceAccountId` you own.

---

### 🧠 Design Highlights

- **Stateless JWT** validation from token claims (no per-request users-DB hit).
- **Flyway** migrations against the service's own `sih_problem` database.
- **Optimistic locking** (`@Version`) on Problem → 409 on stale reviewer writes.
- **Immutable audit trail** — every mutation records (actor, IP, before, after).
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
                                .description("🧑‍💻 Through the gateway (default)"),
                        new Server()
                                .url("http://localhost:8082")
                                .description("🎯 Direct to problem-service"),
                        new Server()
                                .url("https://api.sih26043.example.gov.in")
                                .description("🚀 Production")
                ))
                .tags(List.of(
                        new Tag().name(TAG_PROBLEMS).description(
                                "🔒 Problem submission, retrieval, status transitions and evidence uploads."),
                        new Tag().name(TAG_DOMAINS).description(
                                "🌐 PUBLIC · Problem-domain taxonomy."),
                        new Tag().name(TAG_AUDIT).description(
                                "🔒🔒 REVIEWER / ADMIN only — immutable per-resource audit history.")
                ))
                .addSecurityItem(new SecurityRequirement().addList(BEARER_SCHEME))
                .components(new Components()
                        .addSecuritySchemes(BEARER_SCHEME, new SecurityScheme()
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .in(SecurityScheme.In.HEADER)
                                .name("Authorization")
                                .description("""
Short-lived **access token** obtained from `POST /auth/verify-otp` on source-service
(valid ~15 min).

```
Authorization: Bearer <accessToken>
```""")))
                ;
    }

    /**
     * Every operation can legitimately fail with 400 (bean-validation / type-mismatch /
     * unreadable body — see GlobalExceptionHandler) or 500. Injecting shared defaults
     * onto any operation that doesn't already declare them keeps the contract aligned
     * with the real error surface.
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
        responses.computeIfAbsent("400", k -> new ApiResponse()
                .description("Validation or conversion failure — RFC 7807 problem detail"));
        responses.computeIfAbsent("500", k -> new ApiResponse()
                .description("Unexpected server error — RFC 7807 problem detail"));
    }
}
