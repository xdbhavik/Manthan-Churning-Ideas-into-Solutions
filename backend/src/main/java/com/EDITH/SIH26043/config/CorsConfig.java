package com.EDITH.SIH26043.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/**
 * Dev-only CORS so the standalone test UI (test-ui/index.html, opened directly
 * from disk or any localhost port) can call the API from the browser.
 *
 * <p>Completely disabled under the {@code prod} profile. Spring Security picks
 * this bean up automatically because {@code SecurityConfig} uses
 * {@code .cors(Customizer.withDefaults())} and the bean is named
 * {@code corsConfigurationSource}.</p>
 */
@Configuration
@Profile("!prod")
public class CorsConfig {

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration cfg = new CorsConfiguration();
        // allowedOriginPatterns("*") also matches the "null" Origin a file:// page sends.
        cfg.setAllowedOriginPatterns(List.of("*"));
        cfg.setAllowedMethods(List.of("GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"));
        cfg.setAllowedHeaders(List.of("*"));
        cfg.setExposedHeaders(List.of("Location"));
        cfg.setAllowCredentials(false);
        cfg.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", cfg);
        return source;
    }
}
