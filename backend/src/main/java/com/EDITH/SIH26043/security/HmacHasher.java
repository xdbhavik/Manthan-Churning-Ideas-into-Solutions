package com.EDITH.SIH26043.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;

/**
 * HMAC-SHA-256 helper used for OTP hashes and idempotency-key request hashes.
 * The server-side secret ("pepper") prevents offline brute-force of the 6-digit code.
 */
@Component
public class HmacHasher {

    private final byte[] keyBytes;

    public HmacHasher(@Value("${app.identity-pepper:}") String pepper) {
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