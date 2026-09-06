package com.EDITH.SIH26043.security;

import com.EDITH.SIH26043.enums.KycStatus;
import com.EDITH.SIH26043.enums.UserRole;

import java.util.UUID;

/**
 * Lightweight, claim-derived caller identity used as the Spring Security
 * principal and the {@code @AuthenticationPrincipal} across controllers.
 *
 * <p>Unlike the JPA {@code User} entity it carries no repository identity: it is
 * built entirely from JWT claims ({@code sub}, {@code role}, {@code phone},
 * {@code kyc}), so any service can identify the caller without touching the
 * {@code users} table. This is what lets services that do not own the users
 * table (problem-service, evaluation-service) authenticate requests.</p>
 */
public final class AuthUser {

    private final UUID userId;
    private final String phone;
    private final UserRole role;
    private final KycStatus kycStatus;

    public AuthUser(UUID userId, String phone, UserRole role, KycStatus kycStatus) {
        this.userId = userId;
        this.phone = phone;
        this.role = role;
        this.kycStatus = kycStatus;
    }

    public UUID getUserId() {
        return userId;
    }

    public String getPhone() {
        return phone;
    }

    public UserRole getRole() {
        return role;
    }

    public KycStatus getKycStatus() {
        return kycStatus;
    }
}
