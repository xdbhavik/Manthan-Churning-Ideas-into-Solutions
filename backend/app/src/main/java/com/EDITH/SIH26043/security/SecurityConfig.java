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
 * Stateless JWT security. Public surface: /auth/** and /domains.
 * Everything else requires a valid token; role checks via @PreAuthorize.
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
                        // CORS preflight (OPTIONS) is always public; browser sends before Bearer header.
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        // Public: registration wizard (new users have no token yet)
                        .requestMatchers("/registration/source-types").permitAll()
                        .requestMatchers(HttpMethod.POST, "/registration").permitAll()
                        .requestMatchers(HttpMethod.GET, "/registration/{id}/status").permitAll()
                        // Public: auth flow (OTP issue + verify, register)
                        .requestMatchers("/auth/**").permitAll()
                        // Public: domain taxonomy
                        .requestMatchers(HttpMethod.GET, "/domains").permitAll()
                        // Public: Swagger/OpenAPI docs and UI
                        .requestMatchers("/swagger-ui/**", "/swagger-ui.html",
                                "/v3/api-docs/**", "/v3/api-docs.yaml").permitAll()
                        // Public: Spring error dispatch (so RFC-7807 errors reach callers)
                        .requestMatchers("/error").permitAll()
                        // Everything else requires a valid token
                        .anyRequest().authenticated())
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
                .build();
    }
}