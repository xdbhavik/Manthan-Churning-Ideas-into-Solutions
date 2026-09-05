package com.EDITH.SIH26043.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Spring Boot 4 ships Jackson 3 (tools.jackson) for its own auto-configuration,
 * so a Jackson 2 (com.fasterxml) ObjectMapper bean is no longer created
 * automatically. AuditService still uses Jackson 2 for JSONB snapshots, so we
 * register one explicitly.
 */
@Configuration
public class JacksonConfig {

    @Bean
    public ObjectMapper objectMapper() {
        return new ObjectMapper();
    }
}
