package com.EDITH.SIH26043.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Swagger UI / OpenAPI 3 documentation for API testing.
 *
 * <p>UI: http://localhost:8080/swagger-ui/index.html
 * Spec: http://localhost:8080/v3/api-docs
 *
 * <p>JWT Bearer scheme is registered globally, so after login you can click
 * "Authorize" once and every protected endpoint sends the token automatically.
 */
@Configuration
public class OpenApiConfig {

    private static final String BEARER_SCHEME = "bearerAuth";

    @Bean
    public OpenAPI sih26043OpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("SIH26043 - Problem Collection & Verification API")
                        .description("""
                                REST API for collecting problem statements from multiple source
                                buckets (GOVT, CITIZEN, INDUSTRY, COMMUNITY, HEI) with OTP-based
                                auth, evidence uploads, source verification and audit trail.

                                Flow: /auth/register or /auth/login -> /auth/verify-otp
                                -> paste the accessToken into Authorize -> call protected APIs.
                                In local/test profiles the OTP is the fixed mock code 123456.
                                """)
                        .version("0.0.1-SNAPSHOT")
                        .contact(new Contact().name("EDITH Team")))
                .components(new Components()
                        .addSecuritySchemes(BEARER_SCHEME, new SecurityScheme()
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .description("Access token from /auth/verify-otp")))
                .addSecurityItem(new SecurityRequirement().addList(BEARER_SCHEME));
    }
}
