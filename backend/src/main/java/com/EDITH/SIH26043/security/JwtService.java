package com.EDITH.SIH26043.security;

import com.EDITH.SIH26043.entity.User;
import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jose.crypto.MACVerifier;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
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

    private final String secret;
    private final String issuer;
    private final long ttlMinutes;

    public JwtService(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.issuer}") String issuer,
            @Value("${app.jwt.access-token-ttl-minutes}") long ttlMinutes) {
        this.secret = secret;
        this.issuer = issuer;
        this.ttlMinutes = ttlMinutes;
    }

    public String issueAccessToken(User user) {
        Instant now = Instant.now();
        JWTClaimsSet claims = new JWTClaimsSet.Builder()
                .subject(user.getUserId().toString())
                .issuer(issuer)
                .issueTime(Date.from(now))
                .expirationTime(Date.from(now.plusSeconds(ttlMinutes * 60)))
                .claim("phone", user.getPhone())
                .claim("role", user.getRole().name())
                .claim("kyc", user.getKycStatus().name())
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