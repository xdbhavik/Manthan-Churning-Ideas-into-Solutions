package com.EDITH.SIH26043.security;

import com.nimbusds.jwt.SignedJWT;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.util.List;

/**
 * Resolves the Bearer JWT into a Spring Security authentication whose principal
 * is a claim-derived {@link AuthUser}. No {@code users}-table lookup: the role
 * (and thus authorities) come from the token itself, so a service without the
 * users table can still authorize every request.
 */
@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;

    public JwtAuthFilter(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            try {
                SignedJWT jwt = jwtService.parseAndVerify(header.substring(7));
                AuthUser user = jwtService.authUserOf(jwt);
                var auth = new UsernamePasswordAuthenticationToken(
                        user, null,
                        List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name())));
                SecurityContextHolder.getContext().setAuthentication(auth);
            } catch (IllegalArgumentException ignored) {
                // invalid/expired token or unreadable claims -> leave unauthenticated (401 by entry point)
            }
        }
        chain.doFilter(request, response);
    }
}