package com.EDITH.SIH26043.web.dto;

import java.util.List;
import java.util.UUID;

/**
 * A submission's team (null on individual submissions).
 */
public record TeamView(
        UUID teamId,
        String name,
        List<ParticipantBrief> members
) {
}
