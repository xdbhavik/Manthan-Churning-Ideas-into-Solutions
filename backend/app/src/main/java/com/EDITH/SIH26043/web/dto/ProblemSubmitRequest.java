package com.EDITH.SIH26043.web.dto;

import com.EDITH.SIH26043.enums.Severity;
import com.EDITH.SIH26043.enums.Urgency;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * POST /problems payload.
 *
 * <p>{@code sourceAccountId} identifies the caller's own verified source account
 * (see GET /source/accounts). Bucket and sub-entity type are read from that
 * account server-side rather than accepted from the client, so a submitter
 * cannot declare itself a ULB in the request body.</p>
 */
public record ProblemSubmitRequest(
        @NotBlank String title,
        @NotBlank String description,
        @NotNull Urgency urgency,
        Severity severity,
        Integer affectedPopulation,
        String expectedOutcome,
        String existingIntervention,
        @NotNull UUID sourceAccountId,
        @Valid @NotNull LocationRequest location,
        List<UUID> domainIds,
        List<EvidenceRequest> evidence
) {

    public record LocationRequest(
            @NotBlank String state,
            @NotBlank String district,
            String blockTehsil,
            String villageWard,
            String pincode,
            @NotNull Double latitude,
            @NotNull Double longitude,
            String landmark,
            String lgdCode
    ) {
    }

    public record EvidenceRequest(
            @NotNull com.EDITH.SIH26043.enums.EvidenceType evidenceType,
            @NotBlank String fileUrl,
            @NotBlank String fileHash,
            Map<String, Object> metadata,
            java.time.Instant capturedAt
    ) {
    }
}
