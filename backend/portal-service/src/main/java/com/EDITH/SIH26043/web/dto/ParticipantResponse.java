package com.EDITH.SIH26043.web.dto;

import java.util.UUID;

/**
 * Portal participant profile. {@code institutionName} / {@code sourceAccountId}
 * are populated only for UNIVERSITY participants (the auto-bound HEI account).
 */
public record ParticipantResponse(
        UUID participantId,
        String participantType,
        String fullName,
        String email,
        String phone,
        String institutionName,
        UUID sourceAccountId
) {
}
