package com.EDITH.SIH26043.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * Stateless JWT security for portal-service. The whole portal surface is behind a
 * valid shared-claim token; the service-to-service publish/review intake
 * ({@code /internal/**}) is public on the internal port only. Role checks via
 * {@code @PreAuthorize}.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;

    public SecurityConfig(JwtAuthFilter jwtAuthFilter) {
        this.jwtAuthFilter = jwtAuthFilter;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        AuthenticationEntryPoint entryPoint = (req, res, ex) ->
                res.sendError(HttpStatus.UNAUTHORIZED.value(), "Unauthorized");

        return http
                .csrf(csrf -> csrf.disable())
                .cors(Customizer.withDefaults())
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(eh -> eh.authenticationEntryPoint(entryPoint))
                .authorizeHttpRequests(auth -> auth
                        // CORS preflight (OPTIONS) is always public.
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        // Public: Swagger/OpenAPI docs and UI for this service
                        .requestMatchers("/swagger-ui/**", "/swagger-ui.html",
                                "/v3/api-docs/**", "/v3/api-docs.yaml").permitAll()
                        // Public: Spring error dispatch (so RFC-7807 errors reach callers)
                        .requestMatchers("/error").permitAll()
                        // Service-to-service: evaluation-service publishes completed
                        // problems here and delivers review decisions. Not routed through
                        // the public gateway.
                        .requestMatchers("/internal/**").permitAll()
                        // Everything else requires a valid token
                        .anyRequest().authenticated())
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
                .build();
    }
}
