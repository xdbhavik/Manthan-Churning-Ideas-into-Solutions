package com.EDITH.SIH26043.web.dto;

import com.EDITH.SIH26043.entity.User;
import com.EDITH.SIH26043.enums.KycStatus;
import com.EDITH.SIH26043.enums.UserRole;

import java.time.Instant;
import java.util.UUID;

public record UserResponse(
        UUID userId,
        String phone,
        String email,
        UserRole role,
        KycStatus kycStatus,
        UUID linkedSourceId,
        Instant createdAt
) {

    public static UserResponse from(User u) {
        return new UserResponse(u.getUserId(), u.getPhone(), u.getEmail(),
                u.getRole(), u.getKycStatus(), u.getLinkedSourceId(), u.getCreatedAt());
    }
}