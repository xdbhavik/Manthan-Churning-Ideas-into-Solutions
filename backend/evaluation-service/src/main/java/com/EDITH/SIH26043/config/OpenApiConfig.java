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
 * Swagger UI / OpenAPI 3 documentation for evaluation-service.
 *
 * <p>UI:   http://localhost:8080/evaluation/swagger-ui/index.html (via gateway)
 * Spec:   http://localhost:8080/evaluation/v3/api-docs
 *
 * <p>JWT Bearer scheme is registered globally, so click "Authorize" once after
 * /auth/verify-otp on the gateway and every protected endpoint attaches the
 * token automatically.
 */
@Configuration
public class OpenApiConfig {

    static final String BEARER_SCHEME = "bearerAuth";

    public static final String TAG_EVALUATION = "🏭 Evaluation Engine";
    public static final String TAG_EVALUATOR = "🧑‍⚖️ Evaluator Dashboard";

    @Bean
    public OpenAPI sih26043OpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("SIH26043 · Evaluation Service")
                        .description("""
### 🏭 Evaluation Engine (microservice)

ADMIN/REVIEWER pipeline for the Smart India Hackathon (SIH) 26043 platform:
intake → AI problem analysis (OpenAI-compatible LLM with deterministic heuristic fallback) →
routing → aggregation → prioritization → Phase-3 handoff.

Problem data (title, location, domains, evidence count, status) is **not** stored
here — it is fetched on demand from problem-service via an internal
`GET /internal/problems/{id}` call.
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
                                .url("http://localhost:8080/evaluation")
                                .description("🧑‍💻 Local Dev via gateway"),
                        new Server()
                                .url("http://localhost:8083")
                                .description("🧪 Direct to evaluation-service")))
                .tags(List.of(
                        new Tag().name(TAG_EVALUATION).description(
                                "🔒🔒 ADMIN / REVIEWER only — evaluation pipeline: intake, analysis, routing, aggregation, prioritization, handoff."),
                        new Tag().name(TAG_EVALUATOR).description(
                                "🔒 EVALUATOR role — my assignments, problem context, accept/reject/submit scores.")))
                .components(new Components()
                        .addSecuritySchemes(BEARER_SCHEME, new SecurityScheme()
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .in(SecurityScheme.In.HEADER)
                                .name("Authorization")
                                .description("Short-lived access token obtained from POST /auth/verify-otp on the gateway.")))
                ;
    }

    /**
     * Every operation can legitimately fail with 400 (validation / type-mismatch
     * / unreadable body) or 500. Inject shared defaults so the documented error
     * surface matches the real one (schemathesis contract checks).
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
