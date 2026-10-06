package com.EDITH.SIH26043.web.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record TeamOverview(
        UUID teamId,
        String name,
        UUID problemId,
        String problemTitle,
        String callerRole,
        Instant createdAt,
        List<ParticipantBrief> members
) { }
