package com.EDITH.SIH26043.web.dto;

import java.time.Instant;
import java.util.UUID;

public record TeamInvitationView(
        UUID invitationId,
        UUID teamId,
        String teamName,
        UUID problemId,
        String problemTitle,
        String inviterName,
        String inviteeName,
        String status,
        String direction,
        Instant createdAt,
        Instant respondedAt
) { }
