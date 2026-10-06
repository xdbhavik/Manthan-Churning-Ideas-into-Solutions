package com.EDITH.SIH26043.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

public record TeamCreateRequest(
        @NotBlank @Size(max = 150) String name,
        @Size(max = 20) List<UUID> inviteeParticipantIds
) { }
