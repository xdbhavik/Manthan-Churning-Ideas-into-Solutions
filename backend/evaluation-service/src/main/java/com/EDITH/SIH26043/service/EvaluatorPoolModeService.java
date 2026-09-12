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
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * The per-pool MANUAL/AUTO switch: who may read it, who may flip it, and what
 * "AUTO" currently means for that pool.
 *
 * <p>The five switches are independent by construction — the table's primary key
 * <em>is</em> the pool — and a pool with no row reads as {@code MANUAL}, so the
 * feature is opt-in per pool.</p>
 *
 * <p><b>Ownership.</b> The owner's rule is "the evaluator of a department controls
 * that department's switch": an {@code EVALUATOR} may flip only the pool of their
 * own {@code evaluator_profile}, and {@code ADMIN} is the override. There is
 * deliberately no role that can flip all five <em>as a pool evaluator</em> — that
 * is what the ADMIN override is for, and it is audited like any other change.</p>
 */
@Service
public class EvaluatorPoolModeService {

    private static final Logger log = LoggerFactory.getLogger(EvaluatorPoolModeService.class);

    private final EvaluatorPoolModeRepository modeRepository;
    private final EvaluatorProfileRepository profileRepository;
    private final AutoEvaluationService autoEvaluationService;
    private final AuditService auditService;

    public EvaluatorPoolModeService(EvaluatorPoolModeRepository modeRepository,
                                    EvaluatorProfileRepository profileRepository,
                                    AutoEvaluationService autoEvaluationService,
                                    AuditService auditService) {
        this.modeRepository = modeRepository;
        this.profileRepository = profileRepository;
        this.autoEvaluationService = autoEvaluationService;
        this.auditService = auditService;
    }

    // ------------------------------------------------------------------- reads

    /**
     * All five switches, in {@link EvaluatorType} order. A pool without a stored
     * row is reported as MANUAL rather than omitted.
     */
    @Transactional(readOnly = true)
    public List<PoolModeResponse> modes() {
        Map<EvaluatorType, EvaluatorPoolMode> rows = new EnumMap<>(EvaluatorType.class);
        for (EvaluatorPoolMode row : modeRepository.findAll()) {
            rows.put(row.getEvaluatorType(), row);
        }
        boolean aiAvailable = autoEvaluationService.available();

        List<PoolModeResponse> result = new ArrayList<>(EvaluatorType.values().length);
        for (EvaluatorType pool : EvaluatorType.values()) {
            EvaluatorPoolMode row = rows.get(pool);
            EvaluationMode mode = row == null ? EvaluationMode.MANUAL : row.getMode();
            int humans = activeHumanEvaluators(pool);
            result.add(PoolModeResponse.of(pool, mode, row, aiAvailable, humans,
                    note(mode, aiAvailable, humans)));
        }
        return result;
    }

    /**
     * The effective mode of one pool. A missing row — a deployment that never
     * touched the table, or a pool added later — is MANUAL, never AUTO: the safe
     * default is that a human does the work.
     */
    @Transactional(readOnly = true)
    public EvaluationMode modeOf(EvaluatorType pool) {
        return modeRepository.findByEvaluatorType(pool)
                .map(EvaluatorPoolMode::getMode)
                .orElse(EvaluationMode.MANUAL);
    }

    // ------------------------------------------------------------------- write

    /**
     * Flips one pool's switch.
     *
     * @param actorRole the caller's role, straight from the JWT — ADMIN bypasses
     *                  the pool-ownership check, everybody else must own the pool
     * @throws ApiException 403 when the caller may not control this pool
     */
    @Transactional
    public PoolModeResponse setMode(EvaluatorType pool, EvaluationMode mode, UUID actorUserId,
                                    UserRole actorRole, String ipAddress) {
        requireCanControl(pool, actorUserId, actorRole);

        EvaluatorPoolMode previous = modeRepository.findByEvaluatorType(pool).orElse(null);
        EvaluationMode before = previous == null ? EvaluationMode.MANUAL : previous.getMode();

        EvaluatorPoolMode row = previous == null ? new EvaluatorPoolMode() : previous;
        row.setEvaluatorType(pool);
        row.setMode(mode);
        row.setUpdatedByUserId(actorUserId);
        row = modeRepository.save(row);

        Map<String, Object> after = new HashMap<>();
        after.put("evaluatorType", pool.name());
        after.put("mode", mode.name());
        after.put("changedByUserId", actorUserId);
        after.put("changedByRole", actorRole == null ? null : actorRole.name());
        auditService.record("EVALUATION_POOL_MODE", poolIdFor(pool), AuditAction.EVALUATION_MODE_CHANGED,
                actorUserId, Map.of("mode", before.name()), after, ipAddress);
        log.info("Pool {} evaluation mode {} -> {} by {}", pool, before, mode, actorUserId);

        boolean aiAvailable = autoEvaluationService.available();
        int humans = activeHumanEvaluators(pool);
        return PoolModeResponse.of(pool, mode, row, aiAvailable, humans, note(mode, aiAvailable, humans));
    }

    // ------------------------------------------------------------------ helpers

    /**
     * ADMIN may control any pool; an EVALUATOR only the pool they evaluate for.
     *
     * <p>A user with the EVALUATOR role but no profile cannot be verified as the
     * owner of anything, so they are refused here with the fix in the message —
     * the same onboarding gap {@code EvaluatorAssignmentService.myProfile} reports.</p>
     */
    private void requireCanControl(EvaluatorType pool, UUID actorUserId, UserRole actorRole) {
        if (actorRole == UserRole.ADMIN) {
            return;
        }
        EvaluatorProfile mine = profileRepository.findByUserId(actorUserId).stream()
                .findFirst()
                .orElse(null);
        if (mine == null) {
            throw new ApiException(HttpStatus.FORBIDDEN,
                    "The " + pool + " switch can only be changed by its own evaluator or an ADMIN, "
                            + "and you have no evaluator profile yet"
                            + " (an ADMIN must onboard you via POST /evaluation/evaluator-profiles)");
        }
        if (mine.getEvaluatorType() != pool) {
            throw new ApiException(HttpStatus.FORBIDDEN,
                    "The " + pool + " switch is owned by the " + pool + " evaluator; you evaluate for "
                            + mine.getEvaluatorType());
        }
    }

    /** Active human profiles of the pool — system AI profiles are not people. */
    private int activeHumanEvaluators(EvaluatorType pool) {
        return (int) profileRepository.findByEvaluatorTypeAndActiveIsTrue(pool).stream()
                .filter(p -> !p.isSystem())
                .count();
    }

    private static String note(EvaluationMode mode, boolean aiAvailable, int humans) {
        if (mode == EvaluationMode.AUTO) {
            return aiAvailable
                    ? "AI will score this pool's criteria on its own; " + humans
                            + " human evaluator(s) remain configured."
                    : "AI scoring is unavailable right now (no API key configured or auto-scoring "
                            + "disabled), so this pool will degrade to a human evaluator.";
        }
        return humans == 0
                ? "No active human evaluator for this pool — problems may stay unrouted."
                : "Problems go to the least-loaded of " + humans + " active human evaluator(s).";
    }

    /**
     * The audit subject for a switch change. A mode row is pool-scoped, not tied
     * to a problem, so the audit entity id is a stable per-pool UUID.
     */
    private static UUID poolIdFor(EvaluatorType pool) {
        return UUID.nameUUIDFromBytes(
                ("evaluator-pool-mode:" + pool.name()).getBytes(StandardCharsets.UTF_8));
    }
}
