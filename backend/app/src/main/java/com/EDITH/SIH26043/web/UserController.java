package com.EDITH.SIH26043.web;

import com.EDITH.SIH26043.config.OpenApiConfig;
import com.EDITH.SIH26043.entity.User;
import com.EDITH.SIH26043.enums.UserRole;
import com.EDITH.SIH26043.service.UserAdminService;
import com.EDITH.SIH26043.web.dto.UserResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.NotNull;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/** Admin-only user management (doc 11 sec 1). */
@Tag(name = OpenApiConfig.TAG_USERS)
@RestController
@RequestMapping("/users")
public class UserController {

    private final UserAdminService userAdminService;

    public UserController(UserAdminService userAdminService) {
        this.userAdminService = userAdminService;
    }

    public record RolePatchRequest(@NotNull UserRole role) {
    }

    @Operation(
            summary = "👤 Get user by ID",
            description = "🔒 **ADMIN only** — look up any user record. Useful for support & onboarding.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "User profile"),
            @ApiResponse(responseCode = "403", description = "Not ADMIN"),
            @ApiResponse(responseCode = "404", description = "User not found")
    })
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public UserResponse get(
            @Parameter(description = "User UUID", required = true)
            @PathVariable UUID id) {
        return UserResponse.from(userAdminService.get(id));
    }

    @Operation(
            summary = "🛡️ Change user role",
            description = """
                    🔒 **ADMIN only**
                    Promote or demote a user between `SUBMITTER` → `REVIEWER` → `ADMIN`.  
                    ⚠️ Powerful: REVIEWER can approve registrations & change problem status.  
                    ADMIN can do *everything* — grant sparingly.""")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Role updated"),
            @ApiResponse(responseCode = "400", description = "Invalid role value"),
            @ApiResponse(responseCode = "403", description = "Not ADMIN"),
            @ApiResponse(responseCode = "404", description = "User not found")
    })
    @PatchMapping("/{id}/role")
    @PreAuthorize("hasRole('ADMIN')")
    public UserResponse changeRole(
            @Parameter(description = "User UUID", required = true) @PathVariable UUID id,
            @RequestBody RolePatchRequest req) {
        return UserResponse.from(userAdminService.changeRole(id, req.role()));
    }
}