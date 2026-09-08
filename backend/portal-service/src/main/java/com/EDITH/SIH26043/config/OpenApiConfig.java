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
 * Swagger UI / OpenAPI 3 documentation for portal-service.
 *
 * <p>UI:   http://localhost:8080/portal/swagger-ui/index.html (via gateway)
 * Spec:   http://localhost:8080/portal/v3/api-docs
 *
 * <p>JWT Bearer scheme is registered globally, so click "Authorize" once after
 * /auth/verify-otp on the gateway and every protected endpoint attaches the
 * token automatically.
 */
@Configuration
public class OpenApiConfig {

    static final String BEARER_SCHEME = "bearerAuth";

    public static final String TAG_PORTAL = "🌐 Public Portal";
    public static final String TAG_PARTICIPANT = "🧑‍🎓 Participants";
    public static final String TAG_SUBMISSION = "📦 Submissions";

    @Bean
    public OpenAPI sih26043OpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("SIH26043 · Portal Service")
                        .description("""
### 🌐 Public Problem Portal (microservice)

Publishes fully-evaluated problem statements for students and universities to
solve, honours each problem's access rule, and collects project submissions
(documents, video, images, PPT, description, GitHub links) that travel to
evaluation-service for a same-evaluator ACCEPT / RETURN review.

Problem data is **pushed** here by evaluation-service over
`POST /internal/published-problems` once a cycle reaches EVALUATION_COMPLETED.
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
                                .url("http://localhost:8080/portal")
                                .description("🧑‍💻 Local Dev via gateway"),
                        new Server()
                                .url("http://localhost:8084")
                                .description("🧪 Direct to portal-service")))
                .tags(List.of(
                        new Tag().name(TAG_PORTAL).description(
                                "🔒 Portal surface — participants, problem catalog, teams, submissions, files."),
                        new Tag().name(TAG_PARTICIPANT).description(
                                "🔒 Self registration / profile for STUDENT and UNIVERSITY participants."),
                        new Tag().name(TAG_SUBMISSION).description(
                                "🔒 Project submissions — create, upload files, submit, resubmit after RETURN.")))
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
