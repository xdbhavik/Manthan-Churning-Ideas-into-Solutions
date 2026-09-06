package com.EDITH.SIH26043.service;

import com.EDITH.SIH26043.entity.RefreshToken;
import com.EDITH.SIH26043.entity.User;
import com.EDITH.SIH26043.enums.KycStatus;
import com.EDITH.SIH26043.enums.UserRole;
import com.EDITH.SIH26043.exception.ApiException;
import com.EDITH.SIH26043.repository.RefreshTokenRepository;
import com.EDITH.SIH26043.repository.UserRepository;
import com.EDITH.SIH26043.security.AuthUser;
import com.EDITH.SIH26043.security.JwtService;
import com.EDITH.SIH26043.web.dto.EvaluatorOnboardResponse;
import com.EDITH.SIH26043.web.dto.OtpRequest;
import com.EDITH.SIH26043.web.dto.OtpResponse;
import com.EDITH.SIH26043.web.dto.RefreshRequest;
import com.EDITH.SIH26043.web.dto.UserResponse;
import com.EDITH.SIH26043.web.dto.VerifyOtpRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

/**
 * OTP-based auth: register/login issue an OTP; verify-otp mints access+refresh
 * tokens; rotation on refresh; revocation on logout (doc 05 sec 11).
 */
@Service
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final OtpService otpService;
    private final JwtService jwtService;
    private final long refreshTokenTtlDays;

    public AuthService(UserRepository userRepository,
                       RefreshTokenRepository refreshTokenRepository,
                       OtpService otpService,
                       JwtService jwtService,
                       @Value("${app.refresh-token.ttl-days}") long refreshTokenTtlDays) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.otpService = otpService;
        this.jwtService = jwtService;
        this.refreshTokenTtlDays = refreshTokenTtlDays;
    }

    @Transactional
    public OtpResponse register(OtpRequest req) {
        createUser(req, UserRole.SUBMITTER);
        return otpService.issue(req.phone());
    }

    /**
     * Admin-issued evaluator account: creates an {@code EVALUATOR} user directly
     * (no self-registration) and mints the OTP challenge for the evaluator's first
     * login. The evaluator only ever calls /auth/login + /auth/verify-otp.
     */
    @Transactional
    public EvaluatorOnboardResponse onboardEvaluator(OtpRequest req) {
        User user = createUser(req, UserRole.EVALUATOR);
        OtpResponse otp = otpService.issue(req.phone());
        return new EvaluatorOnboardResponse(user.getUserId(), user.getPhone(), user.getRole(), otp);
    }

    /** Shared "phone not taken → new user row" path for public and admin onboarding. */
    private User createUser(OtpRequest req, UserRole role) {
        if (userRepository.existsByPhone(req.phone())) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Phone already registered — use PATCH /users/{id}/role to change an existing user's role");
        }
        User user = new User();
        user.setUserId(UUID.randomUUID());
        user.setPhone(req.phone());
        user.setEmail(req.email());
        user.setRole(role);
        user.setKycStatus(KycStatus.UNVERIFIED);
        user.setCreatedAt(Instant.now());
        return userRepository.save(user);
    }

    @Transactional
    public OtpResponse login(OtpRequest req) {
        userRepository.findByPhone(req.phone())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,
                        "Phone not registered (register first)"));
        return otpService.issue(req.phone());
    }

    @Transactional
    public VerifyOtpRequest.VerifyOtpResponse verifyOtp(VerifyOtpRequest req) {
        // Extract the phone from the verified challenge, then resolve the user.
        String phone = otpService.verifyAndGetPhone(req.challengeId(), req.code());

        User user = userRepository.findByPhone(phone)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED,
                        "No user for this phone"));
        String accessToken = jwtService.issueAccessToken(toAuthUser(user));
        RefreshToken refresh = new RefreshToken();
        refresh.setToken(UUID.randomUUID());
        refresh.setUserId(user.getUserId());
        refresh.setExpiresAt(Instant.now().plus(refreshTokenTtlDays, ChronoUnit.DAYS));
        refresh.setCreatedAt(Instant.now());
        refreshTokenRepository.save(refresh);

        return new VerifyOtpRequest.VerifyOtpResponse(
                accessToken,
                refresh.getToken(),
                UserResponse.from(user),
                refresh.getExpiresAt());
    }

    @Transactional
    public RefreshRequest.RefreshResponse refresh(RefreshRequest req) {
        RefreshToken token = refreshTokenRepository.findById(req.refreshToken())
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Unknown refresh token"));
        if (!token.isValid()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Refresh token expired or revoked");
        }
        User user = userRepository.findById(token.getUserId())
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "User no longer exists"));
        // Rotate: revoke old token, mint new pair.
        token.setRevokedAt(Instant.now());
        refreshTokenRepository.save(token);

        RefreshToken next = new RefreshToken();
        next.setToken(UUID.randomUUID());
        next.setUserId(user.getUserId());
        next.setExpiresAt(Instant.now().plus(refreshTokenTtlDays, ChronoUnit.DAYS));
        next.setCreatedAt(Instant.now());
        refreshTokenRepository.save(next);

        return new RefreshRequest.RefreshResponse(jwtService.issueAccessToken(toAuthUser(user)), next.getToken());
    }

    /** Snapshots the DB {@link User} into the claim-derived {@link AuthUser} used to mint tokens. */
    private AuthUser toAuthUser(User u) {
        return new AuthUser(u.getUserId(), u.getPhone(), u.getRole(), u.getKycStatus());
    }

    @Transactional
    public void logout(RefreshRequest req) {
        refreshTokenRepository.findById(req.refreshToken()).ifPresent(t -> {
            t.setRevokedAt(Instant.now());
            refreshTokenRepository.save(t);
        });
    }
}