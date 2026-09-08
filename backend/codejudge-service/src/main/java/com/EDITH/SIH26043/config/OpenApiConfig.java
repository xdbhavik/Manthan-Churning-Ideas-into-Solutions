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
 * Swagger UI / OpenAPI 3 documentation for codejudge-service.
 *
 * <p>UI:   http://localhost:8080/codejudge/swagger-ui/index.html (via gateway)
 * Spec:   http://localhost:8080/codejudge/v3/api-docs
 */
@Configuration
public class OpenApiConfig {

    static final String BEARER_SCHEME = "bearerAuth";

    public static final String TAG_EVALUATION = "🤖 Evaluations";
    public static final String TAG_ADMIN = "🛠 CodeJudge Admin";

    @Bean
    public OpenAPI sih26043OpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("SIH26043 · CodeJudge Service")
                        .description("""
### 🤖 Automated Repository Evaluation (microservice)

Turns a **student-submitted project repository at a fixed commit** into an
evidence-backed, deterministic score and report. Clone → static scan (the Python
agentic-legibility analyzer) → built-in security scan → deterministic scoring →
report generation, driven by a DB-backed job queue.

Untrusted build/run/test execution is **gated behind `app.codejudge.sandbox-enabled`**
and stays disabled in this deployment — no student code ever executes here.
""")
                        .version("0.1.0-dev")
                        .contact(new Contact()
                                .name("Team EDITH · SIH26043")
                                .email("edith-sih26043@example.gov.in"))
                        .license(new License()
                                .name("MIT License (internal use)")
                                .url("https://opensource.org/licenses/MIT")))
                .servers(List.of(
                        new Server()
                                .url("http://localhost:8080/codejudge")
                                .description("🧑‍💻 Local Dev via gateway"),
                        new Server()
                                .url("http://localhost:8085")
                                .description("🧪 Direct to codejudge-service")))
                .tags(List.of(
                        new Tag().name(TAG_EVALUATION).description(
                                "🔒 Evaluation lifecycle — create, poll, score, report, findings."),
                        new Tag().name(TAG_ADMIN).description(
                                "🔒 Reviewer/Admin — retry failed evaluations, queue visibility.")))
                .components(new Components()
                        .addSecuritySchemes(BEARER_SCHEME, new SecurityScheme()
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .in(SecurityScheme.In.HEADER)
                                .name("Authorization")
                                .description("Short-lived access token obtained from POST /auth/verify-otp on the gateway.")));
    }

    /** Inject shared 400/500 error responses on every operation. */
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
