package com.EDITH.SIH26043.service;

import com.EDITH.SIH26043.entity.EvaluatorProfile;
import com.EDITH.SIH26043.enums.EvaluatorType;
import com.EDITH.SIH26043.exception.ApiException;
import com.EDITH.SIH26043.repository.EvaluatorProfileRepository;
import com.EDITH.SIH26043.web.dto.EvaluatorProfileRequest;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * ADMIN onboarding of an evaluator profile (prerequisite for routing). One
 * profile per evaluator user; defaults fill workload / experience when omitted.
 */
class EvaluatorProfileAdminServiceTest {

    private final EvaluatorProfileRepository profileRepository = mock(EvaluatorProfileRepository.class);
    private final EvaluatorProfileAdminService service =
            new EvaluatorProfileAdminService(profileRepository);

    private final UUID userId = UUID.randomUUID();

    @Test
    void createBindsUserToPoolWithDefaultsWhenOptionalFieldsOmitted() {
        when(profileRepository.existsByUserId(userId)).thenReturn(false);
        when(profileRepository.save(any(EvaluatorProfile.class))).thenAnswer(inv -> inv.getArgument(0));

        EvaluatorProfile profile = service.create(
                new EvaluatorProfileRequest(userId, EvaluatorType.GOVERNMENT, "Gov Evaluator",
                        null, null, null, null));

        assertThat(profile.getUserId()).isEqualTo(userId);
        assertThat(profile.getEvaluatorType()).isEqualTo(EvaluatorType.GOVERNMENT);
        assertThat(profile.getFullName()).isEqualTo("Gov Evaluator");
        assertThat(profile.getMaxWorkload()).isEqualTo(5);
        assertThat(profile.getExperienceYears()).isEqualTo(0);
        assertThat(profile.isActive()).isTrue();
    }

    @Test
    void createHonoursExplicitWorkloadAndExperience() {
        when(profileRepository.existsByUserId(userId)).thenReturn(false);
        when(profileRepository.save(any(EvaluatorProfile.class))).thenAnswer(inv -> inv.getArgument(0));

        EvaluatorProfile profile = service.create(
                new EvaluatorProfileRequest(userId, EvaluatorType.INDUSTRY, "Industry Evaluator",
                        "ACME", "Lead", 8, 3));

        assertThat(profile.getOrganization()).isEqualTo("ACME");
        assertThat(profile.getDesignation()).isEqualTo("Lead");
        assertThat(profile.getExperienceYears()).isEqualTo(8);
        assertThat(profile.getMaxWorkload()).isEqualTo(3);
    }

    @Test
    void duplicateUserIdIsConflictAndNothingIsSaved() {
        when(profileRepository.existsByUserId(userId)).thenReturn(true);

        assertThatThrownBy(() -> service.create(
                new EvaluatorProfileRequest(userId, EvaluatorType.GOVERNMENT, "Second Profile",
                        null, null, null, null)))
                .isInstanceOf(ApiException.class)
                .extracting(ex -> ((ApiException) ex).getStatus())
                .isEqualTo(HttpStatus.CONFLICT);

        verify(profileRepository, never()).save(any());
    }
}
