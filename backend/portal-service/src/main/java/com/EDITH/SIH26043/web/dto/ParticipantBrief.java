package com.EDITH.SIH26043.web.dto;

import java.util.UUID;

/**
 * Minimal participant info embedded in a team view.
 */
public record ParticipantBrief(
        UUID participantId,
        String fullName
) {
}
