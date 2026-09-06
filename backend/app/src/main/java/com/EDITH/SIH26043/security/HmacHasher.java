package com.EDITH.SIH26043.security;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;

/**
 * HMAC-SHA-256 helper used for OTP hashes and idempotency-key request hashes.
 * The server-side secret ("pepper") prevents offline brute-force of the 6-digit code.
 *
 * <p>Dev convenience: when prod profile is NOT active and no pepper is configured,
 * a hardcoded dev fallback is used with a warning. Production enforces a real 16+ char secret.</p>
 */
@Component
public class HmacHasher {

    private static final Logger log = LoggerFactory.getLogger(HmacHasher.class);
    private static final String DEV_FALLBACK_PEPPER = "dev-fallback-pepper--change-me-in-prod!";

    private final byte[] keyBytes;

    public HmacHasher(@Value("${app.identity-pepper:}") String pepper,
                      @Value("${spring.profiles.active:}") String activeProfiles) {
        boolean prod = activeProfiles != null && activeProfiles.contains("prod");
        if (pepper == null || pepper.isBlank()) {
            if (prod) {
                throw new IllegalStateException(
                        "IDENTITY_PEPPER must be set in production (>= 16 chars). "
                        + "An empty pepper turns HMAC into a plain hash — 6-digit OTPs are "
                        + "brute-forceable in milliseconds without a pepper.");
            }
            log.warn("========================================");
            log.warn("⚠️  app.identity-pepper is NOT CONFIGURED.");
            log.warn("    Using INSECURE dev fallback pepper.");
            log.warn("    Set IDENTITY_PEPPER env var before production!");
            log.warn("========================================");
            pepper = DEV_FALLBACK_PEPPER;
        } else if (pepper.length() < 16) {
            if (prod) {
                throw new IllegalStateException(
                        "IDENTITY_PEPPER must be at least 16 characters in production. "
                        + "Got length: " + pepper.length());
            }
            log.warn("⚠️  app.identity-pepper is shorter than 16 chars (dev-only, OK for mock OTP). "
                    + "Prod requires 16+ chars.");
        }
        this.keyBytes = pepper.getBytes(StandardCharsets.UTF_8);
    }

    public String hmac(String value) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(keyBytes, "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("HMAC failed", e);
        }
    }
}