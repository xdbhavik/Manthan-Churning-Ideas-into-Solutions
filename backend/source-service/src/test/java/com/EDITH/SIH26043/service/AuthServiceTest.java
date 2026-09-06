package com.EDITH.SIH26043.service;

import com.EDITH.SIH26043.entity.User;
import com.EDITH.SIH26043.enums.KycStatus;
import com.EDITH.SIH26043.enums.UserRole;
import com.EDITH.SIH26043.exception.ApiException;
import com.EDITH.SIH26043.repository.RefreshTokenRepository;
import com.EDITH.SIH26043.repository.UserRepository;
import com.EDITH.SIH26043.security.JwtService;
import com.EDITH.SIH26043.web.dto.EvaluatorOnboardResponse;
import com.EDITH.SIH26043.web.dto.OtpRequest;
import com.EDITH.SIH26043.web.dto.OtpResponse;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Admin-issued EVALUATOR onboarding (POST /users/evaluators): the admin creates
 * the account directly with role EVALUATOR and an OTP challenge is minted for the
 * evaluator's first login; the evaluator never self-registers.
 */
class AuthServiceTest {

    private final UserRepository userRepository = mock(UserRepository.class);
    private final RefreshTokenRepository refreshTokenRepository = mock(RefreshTokenRepository.class);
    private final OtpService otpService = mock(OtpService.class);
    private final JwtService jwtService = mock(JwtService.class);
    private final AuthService authService =
            new AuthService(userRepository, refreshTokenRepository, otpService, jwtService, 7L);

    @Test
    void onboardEvaluator_createsEvaluatorUserAndMintsOtp() {
        OtpRequest req = new OtpRequest("9700000001", "eval1@sih.local");
        OtpResponse otp = new OtpResponse(UUID.randomUUID(), Instant.now(), "123456", 5);
        when(userRepository.existsByPhone("9700000001")).thenReturn(false);
        when(otpService.issue("9700000001")).thenReturn(otp);
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        EvaluatorOnboardResponse resp = authService.onboardEvaluator(req);

        assertThat(resp.phone()).isEqualTo("9700000001");
        assertThat(resp.role()).isEqualTo(UserRole.EVALUATOR);
        assertThat(resp.otp()).isSameAs(otp);

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        User saved = captor.getValue();
        assertThat(saved.getRole()).isEqualTo(UserRole.EVALUATOR);
        assertThat(saved.getKycStatus()).isEqualTo(KycStatus.UNVERIFIED);
        assertThat(saved.getPhone()).isEqualTo("9700000001");
    }

    @Test
    void onboardEvaluator_phoneAlreadyRegistered_throwsConflictAndIssuesNoOtp() {
        when(userRepository.existsByPhone("9700000001")).thenReturn(true);

        assertThatThrownBy(() -> authService.onboardEvaluator(new OtpRequest("9700000001", null)))
                .isInstanceOf(ApiException.class)
                .extracting(ex -> ((ApiException) ex).getStatus())
                .isEqualTo(HttpStatus.CONFLICT);

        verify(otpService, never()).issue(any());
    }
}
