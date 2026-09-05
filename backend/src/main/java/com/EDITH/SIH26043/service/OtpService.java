package com.EDITH.SIH26043.service;

import com.EDITH.SIH26043.entity.OtpChallenge;
import com.EDITH.SIH26043.exception.ApiException;
import com.EDITH.SIH26043.repository.OtpChallengeRepository;
import com.EDITH.SIH26043.security.HmacHasher;
import com.EDITH.SIH26043.web.dto.OtpResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.concurrent.CompletableFuture;

/**
 * Issues and verifies 6-digit OTP challenges with rate limits (5/phone/hour),
 * 3 verify attempts, 5-minute TTL, and only the HMAC hash stored (doc 05 sec 9/11).
 */
@Service
public class OtpService {

    private final OtpChallengeRepository otpRepository;
    private final HmacHasher hasher;
    private final long ttlMinutes;
    private final int maxAttempts;
    private final int maxRequestsPerPhonePerHour;
    private final boolean prod;
    private final String mockCode;
    private final SecureRandom random = new SecureRandom();

    public OtpService(OtpChallengeRepository otpRepository, HmacHasher hasher,
                      @Value("${app.otp.ttl-minutes}") long ttlMinutes,
                      @Value("${app.otp.max-attempts}") int maxAttempts,
                      @Value("${app.otp.max-requests-per-phone-per-hour}") int maxRequestsPerPhonePerHour,
                      @Value("${app.otp.mock-code:}") String mockCode,
                      @Value("${spring.profiles.active:}") String activeProfiles) {
        this.otpRepository = otpRepository;
        this.hasher = hasher;
        this.ttlMinutes = ttlMinutes;
        this.maxAttempts = maxAttempts;
        this.maxRequestsPerPhonePerHour = maxRequestsPerPhonePerHour;
        this.mockCode = mockCode;
        this.prod = activeProfiles != null && activeProfiles.contains("prod");
    }

    @Transactional
    public OtpResponse issue(String phone) {
        Instant windowStart = Instant.now().minus(1, ChronoUnit.HOURS);
        long recent = otpRepository.countByPhoneAndCreatedAtAfter(phone, windowStart);
        int remaining = (int) Math.max(0, maxRequestsPerPhonePerHour - recent);
        if (remaining == 0) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS,
                    "OTP rate limit reached for this phone (5/hour)");
        }

        String code = generateCode();
        OtpChallenge challenge = new OtpChallenge();
        challenge.setChallengeId(java.util.UUID.randomUUID());
        challenge.setPhone(phone);
        challenge.setOtpCodeHash(hasher.hmac(code));
        challenge.setExpiresAt(Instant.now().plus(ttlMinutes, ChronoUnit.MINUTES));
        challenge.setAttemptCount(0);
        challenge.setCreatedAt(Instant.now());
        otpRepository.save(challenge);

        // In non-prod, expose the code so the flow is demo-able without an SMS gateway.
        return new OtpResponse(challenge.getChallengeId(), challenge.getExpiresAt(),
                prod ? null : code, remaining);
    }

    @Transactional
    public String verifyAndGetPhone(java.util.UUID challengeId, String code) {
        OtpChallenge challenge = otpRepository.findById(challengeId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Unknown OTP challenge"));
        if (challenge.getConsumedAt() != null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "OTP already used");
        }
        if (challenge.getExpiresAt().isBefore(Instant.now())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "OTP expired");
        }
        if (challenge.getAttemptCount() >= maxAttempts) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "Too many wrong attempts");
        }
        challenge.setAttemptCount(challenge.getAttemptCount() + 1);
        String expected = challenge.getOtpCodeHash();
        String actual = hasher.hmac(code);
        if (!java.security.MessageDigest.isEqual(
                expected.getBytes(java.nio.charset.StandardCharsets.UTF_8),
                actual.getBytes(java.nio.charset.StandardCharsets.UTF_8))) {
            otpRepository.save(challenge);
            throw new ApiException(HttpStatus.BAD_REQUEST, "Incorrect OTP");
        }
        challenge.setConsumedAt(Instant.now());
        otpRepository.save(challenge);
        return challenge.getPhone();
    }

    /**
     * Non-prod mock: when app.otp.mock-code is set and the prod profile is NOT
     * active, every challenge gets that fixed code (e.g. 123456) so the flow can
     * be demoed/tested without reading the API response. Prod always gets a
     * cryptographically random 6-digit code.
     */
    private String generateCode() {
        if (!prod && mockCode != null && !mockCode.isBlank()) {
            return mockCode;
        }
        return String.format("%06d", random.nextInt(1_000_000));
    }

    /** Placeholder for a real SMS dispatch integration (Phase 2). */
    @Async
    public CompletableFuture<Void> sendSms(String phone, String code) {
        return CompletableFuture.completedFuture(null);
    }
}