package com.EDITH.SIH26043.web.dto;

import com.EDITH.SIH26043.entity.Problem;
import com.EDITH.SIH26043.enums.ProblemAccessRule;
import com.EDITH.SIH26043.enums.ProblemStatus;
import com.EDITH.SIH26043.enums.Severity;
import com.EDITH.SIH26043.enums.SourceBucket;
import com.EDITH.SIH26043.enums.SubEntityType;
import com.EDITH.SIH26043.enums.Urgency;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Canonical problem view used in API responses. */
public record ProblemResponse(
        UUID problemId,
        String title,
        String description,
        SourceBucket sourceBucket,
        SubEntityType subEntityType,
        ProblemStatus status,
        Urgency urgency,
        Severity severity,
        UUID sourceId,
        UUID sourceAccountId,
        UUID locationId,
        Integer affectedPopulation,
        String expectedOutcome,
        String existingIntervention,
        Instant submittedAt,
        Instant updatedAt,
        UUID submittedByUserId,
        ProblemAccessRule accessRule,
        List<String> accessUniversities,
        int version,
        Map<String, Object> metadata
) {

    public static ProblemResponse from(Problem p) {
        return new ProblemResponse(
                p.getProblemId(), p.getTitle(), p.getDescription(),
                p.getSourceBucket(), p.getSubEntityType(), p.getStatus(),
                p.getUrgency(), p.getSeverity(), p.getSourceId(), p.getSourceAccountId(),
                p.getLocationId(),
                p.getAffectedPopulation(), p.getExpectedOutcome(), p.getExistingIntervention(),
                p.getSubmittedAt(), p.getUpdatedAt(), p.getSubmittedByUserId(),
                p.getAccessRule() == null ? ProblemAccessRule.OPEN_TO_ALL : p.getAccessRule(),
                p.getAccessUniversities() == null ? List.of() : p.getAccessUniversities(),
                p.getVersion() == null ? 1 : p.getVersion(),
                p.getMetadata() == null ? Map.of() : p.getMetadata());
    }
}
