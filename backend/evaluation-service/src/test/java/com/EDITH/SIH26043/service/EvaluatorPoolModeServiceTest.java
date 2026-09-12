package com.EDITH.SIH26043.service;

import com.EDITH.SIH26043.entity.EvaluatorPoolMode;
import com.EDITH.SIH26043.entity.EvaluatorProfile;
import com.EDITH.SIH26043.enums.AuditAction;
import com.EDITH.SIH26043.enums.EvaluationMode;
import com.EDITH.SIH26043.enums.EvaluatorType;
import com.EDITH.SIH26043.enums.UserRole;
import com.EDITH.SIH26043.exception.ApiException;
import com.EDITH.SIH26043.repository.EvaluatorPoolModeRepository;
import com.EDITH.SIH26043.repository.EvaluatorProfileRepository;
import com.EDITH.SIH26043.web.dto.PoolModeResponse;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * The per-pool MANUAL/AUTO switch. Two rules carry the weight: a pool with no
 * stored row must read as MANUAL (so the feature is opt-in and today's behaviour
 * is the default), and the evaluator of a department — and only that evaluator,
 * or an ADMIN — may flip that department's switch.
 */
class EvaluatorPoolModeServiceTest {

    private final EvaluatorPoolModeRepository modeRepository = mock(EvaluatorPoolModeRepository.class);
    private final EvaluatorProfileRepository profileRepository = mock(EvaluatorProfileRepository.class);
    private final AutoEvaluationService autoEvaluationService = mock(AutoEvaluationService.class);
    private final AuditService auditService = mock(AuditService.class);

    private final EvaluatorPoolModeService service = new EvaluatorPoolModeService(
            modeRepository, profileRepository, autoEvaluationService, auditService);

    private final UUID actor = UUID.randomUUID();

    @Test
    void aPoolWithNoStoredRowReadsAsManual() {
        when(modeRepository.findAll()).thenReturn(List.of());
        when(autoEvaluationService.available()).thenReturn(true);

        List<PoolModeResponse> modes = service.modes();

        assertThat(modes).hasSize(EvaluatorType.values().length);
        assertThat(modes).extracting(PoolModeResponse::mode).containsOnly("MANUAL");
        assertThat(modes).extracting(PoolModeResponse::updatedByUserId).containsOnlyNulls();
        assertThat(modes.getFirst().note()).contains("No active human evaluator");
        // The switch has never been touched, so there is nothing to attribute.
        assertThat(modes.getFirst().updatedAt()).isNull();
    }

    @Test
    void theHumanCountExcludesSystemAiProfiles() {
        when(modeRepository.findAll()).thenReturn(List.of());
        when(profileRepository.findByEvaluatorTypeAndActiveIsTrue(EvaluatorType.GOVERNMENT))
                .thenReturn(List.of(profile(EvaluatorType.GOVERNMENT, false), systemProfile()));

        List<PoolModeResponse> modes = service.modes();

        assertThat(pool(modes, EvaluatorType.GOVERNMENT).activeHumanEvaluators()).isEqualTo(1);
    }

    @Test
    void anAutoPoolWithNoModelConfiguredSaysItWillDegrade() {
        EvaluatorPoolMode row = new EvaluatorPoolMode();
        row.setEvaluatorType(EvaluatorType.HEI);
        row.setMode(EvaluationMode.AUTO);
        when(modeRepository.findAll()).thenReturn(List.of(row));
        when(autoEvaluationService.available()).thenReturn(false);
        when(profileRepository.findByEvaluatorTypeAndActiveIsTrue(EvaluatorType.HEI))
                .thenReturn(List.of(profile(EvaluatorType.HEI, false)));

        PoolModeResponse hei = pool(service.modes(), EvaluatorType.HEI);

        assertThat(hei.mode()).isEqualTo("AUTO");
        assertThat(hei.aiScoringAvailable()).isFalse();
        assertThat(hei.note()).contains("degrade to a human evaluator");
    }

    @Test
    void modeOfFallsBackToManualWhenThereIsNoRow() {
        when(modeRepository.findByEvaluatorType(EvaluatorType.CITIZEN)).thenReturn(Optional.empty());

        assertThat(service.modeOf(EvaluatorType.CITIZEN)).isEqualTo(EvaluationMode.MANUAL);
    }

    @Test
    void anEvaluatorFlipsTheirOwnPoolsSwitch() {
        when(profileRepository.findByUserId(actor))
                .thenReturn(List.of(profile(EvaluatorType.GOVERNMENT, false)));
        when(modeRepository.findByEvaluatorType(EvaluatorType.GOVERNMENT))
                .thenReturn(Optional.empty());
        when(modeRepository.save(any(EvaluatorPoolMode.class))).thenAnswer(inv -> inv.getArgument(0));
        when(autoEvaluationService.available()).thenReturn(true);

        PoolModeResponse response = service.setMode(EvaluatorType.GOVERNMENT, EvaluationMode.AUTO,
                actor, UserRole.EVALUATOR, "127.0.0.1");

        assertThat(response.mode()).isEqualTo("AUTO");
        assertThat(response.updatedByUserId()).isEqualTo(actor);

        ArgumentCaptor<EvaluatorPoolMode> saved = ArgumentCaptor.forClass(EvaluatorPoolMode.class);
        verify(modeRepository).save(saved.capture());
        assertThat(saved.getValue().getEvaluatorType()).isEqualTo(EvaluatorType.GOVERNMENT);
        assertThat(saved.getValue().getMode()).isEqualTo(EvaluationMode.AUTO);
        assertThat(saved.getValue().getUpdatedByUserId()).isEqualTo(actor);

        // The change is audited with the previous value, so a flip is reconstructable.
        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> before = ArgumentCaptor.forClass(Map.class);
        verify(auditService).record(eq("EVALUATION_POOL_MODE"), any(),
                eq(AuditAction.EVALUATION_MODE_CHANGED), eq(actor), before.capture(), anyMap(),
                eq("127.0.0.1"));
        assertThat(before.getValue()).containsEntry("mode", "MANUAL");
    }

    @Test
    void flippingAPoolThatAlreadyHasARowUpdatesItInPlace() {
        EvaluatorPoolMode row = new EvaluatorPoolMode();
        row.setEvaluatorType(EvaluatorType.GOVERNMENT);
        row.setMode(EvaluationMode.MANUAL);
        row.setUpdatedByUserId(UUID.randomUUID());
        when(profileRepository.findByUserId(actor))
                .thenReturn(List.of(profile(EvaluatorType.GOVERNMENT, false)));
        when(modeRepository.findByEvaluatorType(EvaluatorType.GOVERNMENT))
                .thenReturn(Optional.of(row));
        when(modeRepository.save(any(EvaluatorPoolMode.class))).thenAnswer(inv -> inv.getArgument(0));
        when(autoEvaluationService.available()).thenReturn(true);

        service.setMode(EvaluatorType.GOVERNMENT, EvaluationMode.AUTO, actor,
                UserRole.EVALUATOR, "127.0.0.1");

        assertThat(row.getMode()).isEqualTo(EvaluationMode.AUTO);
        assertThat(row.getUpdatedByUserId()).isEqualTo(actor);
        verify(modeRepository).save(row); // the same managed row, not a second one
    }

    @Test
    void anEvaluatorCannotFlipAnotherDepartmentsSwitch() {
        when(profileRepository.findByUserId(actor))
                .thenReturn(List.of(profile(EvaluatorType.GOVERNMENT, false)));

        assertThatThrownBy(() -> service.setMode(EvaluatorType.HEI, EvaluationMode.AUTO, actor,
                UserRole.EVALUATOR, "127.0.0.1"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> {
                    assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
                    assertThat(ex.getMessage()).contains("you evaluate for GOVERNMENT");
                });

        verify(modeRepository, never()).save(any());
    }

    @Test
    void anEvaluatorWithoutAProfileIsRefusedWithTheFix() {
        when(profileRepository.findByUserId(actor)).thenReturn(List.of());

        assertThatThrownBy(() -> service.setMode(EvaluatorType.HEI, EvaluationMode.AUTO, actor,
                UserRole.EVALUATOR, "127.0.0.1"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> {
                    assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
                    assertThat(ex.getMessage()).contains("evaluator-profiles");
                });
    }

    @Test
    void adminMayFlipAnyDepartmentsSwitch() {
        when(modeRepository.findByEvaluatorType(EvaluatorType.CITIZEN)).thenReturn(Optional.empty());
        when(modeRepository.save(any(EvaluatorPoolMode.class))).thenAnswer(inv -> inv.getArgument(0));
        when(autoEvaluationService.available()).thenReturn(true);

        PoolModeResponse response = service.setMode(EvaluatorType.CITIZEN, EvaluationMode.AUTO,
                actor, UserRole.ADMIN, "127.0.0.1");

        assertThat(response.mode()).isEqualTo("AUTO");
        // The ADMIN override needs no evaluator profile of its own.
        verify(profileRepository, never()).findByUserId(any());
    }

    // ------------------------------------------------------------------ fixtures

    private PoolModeResponse pool(List<PoolModeResponse> modes, EvaluatorType type) {
        return modes.stream().filter(m -> m.evaluatorType().equals(type.name()))
                .findFirst()
                .orElseThrow(() -> new AssertionError("no switch reported for " + type));
    }

    private EvaluatorProfile profile(EvaluatorType type, boolean system) {
        EvaluatorProfile profile = new EvaluatorProfile();
        profile.setProfileId(UUID.randomUUID());
        profile.setUserId(UUID.randomUUID());
        profile.setEvaluatorType(type);
        profile.setFullName("Evaluator " + type);
        profile.setMaxWorkload(5);
        profile.setActive(true);
        profile.setSystem(system);
        return profile;
    }

    private EvaluatorProfile systemProfile() {
        EvaluatorProfile profile = profile(EvaluatorType.GOVERNMENT, true);
        profile.setFullName("AI Evaluator — GOVERNMENT");
        profile.setMaxWorkload(100000);
        return profile;
    }
}
