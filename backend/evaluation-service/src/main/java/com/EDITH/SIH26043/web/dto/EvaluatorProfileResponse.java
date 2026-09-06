package com.EDITH.SIH26043.web.dto;

import com.EDITH.SIH26043.entity.EvaluatorProfile;
import com.EDITH.SIH26043.enums.EvaluatorType;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Read model of an {@link EvaluatorProfile} — the pool membership, workload
 * limit and availability that routing consults when choosing who evaluates a
 * problem.
 */
public record EvaluatorProfileResponse(
        UUID profileId,
        UUID userId,
        EvaluatorType evaluatorType,
        String fullName,
        String organization,
        String designation,
        Integer experienceYears,
        List<String> regionStates,
        UUID affiliatedSourceId,
        Integer maxWorkload,
        boolean active,
        Instant createdAt,
        Instant updatedAt
) {

    public static EvaluatorProfileResponse from(EvaluatorProfile p) {
        return new EvaluatorProfileResponse(
                p.getProfileId(), p.getUserId(), p.getEvaluatorType(), p.getFullName(),
                p.getOrganization(), p.getDesignation(), p.getExperienceYears(),
                p.getRegionStates(), p.getAffiliatedSourceId(), p.getMaxWorkload(),
                p.isActive(), p.getCreatedAt(), p.getUpdatedAt());
    }
}
