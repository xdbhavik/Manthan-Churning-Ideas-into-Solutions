package com.EDITH.SIH26043.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/**
 * One row per issued OTP; only a salted hash is stored (doc 05, sec 9/11).
 */
@Entity
@Table(name = "otp_challenge")
@Getter
@Setter
public class OtpChallenge {

    @Id
    @Column(name = "challenge_id")
    private UUID challengeId;

    @Column(name = "phone", nullable = false, length = 15)
    private String phone;

    @Column(name = "otp_code_hash", nullable = false, length = 255)
    private String otpCodeHash;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "consumed_at")
    private Instant consumedAt;

    @Column(name = "attempt_count", nullable = false)
    private int attemptCount = 0;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (challengeId == null) {
            challengeId = UUID.randomUUID();
        }
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}