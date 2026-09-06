package com.EDITH.SIH26043.security;

import com.EDITH.SIH26043.enums.KycStatus;
import com.EDITH.SIH26043.enums.UserRole;
import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jose.crypto.MACVerifier;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.text.ParseException;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

/**
 * Minimal HMAC-SHA-256 JWT access tokens (15-min TTL), Nimbus-backed.
 * No third-party libs required beyond what spring-security-oauth2-jose brings.
 */
@Component
public class JwtService {

    private static final Logger log = LoggerFactory.getLogger(JwtService.class);
    private static final String DEV_FALLBACK_JWT_SECRET =
            "dev-jwt-secret-change-me-before-production--minimum-32-chars!";

    private final String secret;
    private final String issuer;
    private final long ttlMinutes;

    public JwtService(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.issuer}") String issuer,
            @Value("${app.jwt.access-token-ttl-minutes}") long ttlMinutes,
            @Value("${spring.profiles.active:}") String activeProfiles) {
        boolean prod = activeProfiles != null && activeProfiles.contains("prod");
        if (secret == null || secret.isBlank()) {
            if (prod) {
                throw new IllegalStateException(
                        "JWT_SECRET must be set in production (>= 32 chars for HS256). "
                        + "Empty secret means signing will fail at runtime.");
            }
            log.warn("========================================");
            log.warn("⚠️  app.jwt.secret is NOT CONFIGURED.");
            log.warn("    Using INSECURE dev fallback JWT secret.");
            log.warn("    Set JWT_SECRET env var before production!");
            log.warn("========================================");
            secret = DEV_FALLBACK_JWT_SECRET;
        } else if (secret.length() < 32) {
            if (prod) {
                throw new IllegalStateException(
                        "JWT_SECRET must be at least 32 characters in production for HS256. "
                        + "Got length: " + secret.length());
            }
            log.warn("⚠️  app.jwt.secret is shorter than 32 chars (dev-only). "
                    + "HS256 requires 256-bit = 32+ bytes. Prod needs 32+ chars.");
        }
        this.secret = secret;
        this.issuer = issuer;
        this.ttlMinutes = ttlMinutes;
    }

    public String issueAccessToken(AuthUser user) {
        Instant now = Instant.now();
        JWTClaimsSet claims = new JWTClaimsSet.Builder()
                .subject(user.getUserId().toString())
                .issuer(issuer)
                .issueTime(Date.from(now))
                .expirationTime(Date.from(now.plusSeconds(ttlMinutes * 60)))
                .claim("phone", user.getPhone())
                .claim("role", user.getRole().name())
                .claim("kyc", user.getKycStatus() == null ? null : user.getKycStatus().name())
                .build();
        return sign(claims);
    }

    public SignedJWT parseAndVerify(String token) {
        try {
            SignedJWT jwt = SignedJWT.parse(token);
            MACVerifier verifier = new MACVerifier(secret.getBytes());
            if (!jwt.verify(verifier)) {
                throw new IllegalArgumentException("Invalid JWT signature");
            }
            JWTClaimsSet claims = jwt.getJWTClaimsSet();
            if (claims.getExpirationTime() == null
                    || claims.getExpirationTime().before(new Date())) {
                throw new IllegalArgumentException("JWT expired");
            }
            return jwt;
        } catch (ParseException | JOSEException e) {
            throw new IllegalArgumentException("Malformed JWT", e);
        }
    }

    /**
     * Maps a verified token to the {@link AuthUser} principal entirely from
     * claims. No DB lookup: {@code role} and {@code kyc} change only when a new
     * token is minted (<= access-token TTL), which is the accepted trade-off of
     * claim-based auth.
     */
    public AuthUser authUserOf(SignedJWT jwt) {
        try {
            JWTClaimsSet claims = jwt.getJWTClaimsSet();
            UUID userId = UUID.fromString(claims.getSubject());
            String role = claims.getStringClaim("role");
            if (role == null || role.isBlank()) {
                throw new IllegalArgumentException("JWT missing role claim");
            }
            String kyc = claims.getStringClaim("kyc");
            return new AuthUser(
                    userId,
                    claims.getStringClaim("phone"),
                    UserRole.valueOf(role),
                    kyc == null ? KycStatus.UNVERIFIED : KycStatus.valueOf(kyc));
        } catch (ParseException e) {
            throw new IllegalArgumentException("Unable to read JWT claims", e);
        }
    }

    public UUID subjectOf(SignedJWT jwt) {
        try {
            return UUID.fromString(jwt.getJWTClaimsSet().getSubject());
        } catch (ParseException e) {
            throw new IllegalArgumentException("Unable to read JWT subject", e);
        }
    }

    private String sign(JWTClaimsSet claims) {
        try {
            SignedJWT jwt = new SignedJWT(
                    new JWSHeader(JWSAlgorithm.HS256), claims);
            jwt.sign(new MACSigner(secret.getBytes()));
            return jwt.serialize();
        } catch (JOSEException e) {
            throw new IllegalStateException("JWT signing failed", e);
        }
    }
}