package com.EDITH.SIH26043.web;

import com.EDITH.SIH26043.config.OpenApiConfig;
import com.EDITH.SIH26043.entity.User;
import com.EDITH.SIH26043.enums.UserRole;
import com.EDITH.SIH26043.service.AuthService;
import com.EDITH.SIH26043.service.UserAdminService;
import com.EDITH.SIH26043.web.dto.EvaluatorOnboardResponse;
import com.EDITH.SIH26043.web.dto.OtpRequest;
import com.EDITH.SIH26043.web.dto.UserResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/** Admin-only user management (doc 11 sec 1). */
@Tag(name = OpenApiConfig.TAG_USERS)
@RestController
@RequestMapping("/users")
public class UserController {

    private final UserAdminService userAdminService;
    private final AuthService authService;

    public UserController(UserAdminService userAdminService, AuthService authService) {
        this.userAdminService = userAdminService;
        this.authService = authService;
    }

    public record RolePatchRequest(@NotNull UserRole role) {
    }

    @Operation(
            summary = "📋 List all users (paged)",
            description = """
                    🔒 **ADMIN only** — returns a paginated list of all users, newest first.
                    Supports `?page=0&size=50` query params (defaults: page=0, size=100).""")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Paged user list"),
            @ApiResponse(responseCode = "403", description = "Not ADMIN")
    })
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public Page<UserResponse> listAll(
            @PageableDefault(size = 100) Pageable pageable) {
        return userAdminService.listAll(pageable).map(UserResponse::from);
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

    @Operation(
            summary = "🧑‍⚖️ Create an EVALUATOR account",
            description = """
                    🔒 **ADMIN only**
                    Creates an `EVALUATOR` user directly and mints an OTP challenge for the
                    evaluator's first login. The evaluator NEVER self-registers — they only
                    call `/auth/login` + `/auth/verify-otp` with the phone you onboard here.
                    In local/dev the mock OTP code is returned in the `devOtp` field.

                    Phone must not already be registered. To turn an existing user into an
                    evaluator, use `PATCH /users/{id}/role` instead.""")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "✅ EVALUATOR created + OTP challenge minted",
                    content = @Content(schema = @Schema(implementation = EvaluatorOnboardResponse.class))),
            @ApiResponse(responseCode = "400", description = "Invalid phone"),
            @ApiResponse(responseCode = "403", description = "Not ADMIN"),
            @ApiResponse(responseCode = "409", description = "Phone already registered"),
            @ApiResponse(responseCode = "429", description = "OTP rate limit reached for this phone")
    })
    @PostMapping("/evaluators")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public EvaluatorOnboardResponse createEvaluator(@Valid @RequestBody OtpRequest req) {
        return authService.onboardEvaluator(req);
    }

    @Operation(
            summary = "🔍 Search user by phone",
            description = "🔒 **ADMIN only** — look up a user by their registered phone number.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "User profile"),
            @ApiResponse(responseCode = "400", description = "Phone parameter missing"),
            @ApiResponse(responseCode = "403", description = "Not ADMIN"),
            @ApiResponse(responseCode = "404", description = "User not found")
    })
    @GetMapping("/search")
    @PreAuthorize("hasRole('ADMIN')")
    public UserResponse searchByPhone(@Parameter(description = "Phone number") @org.springframework.web.bind.annotation.RequestParam(required = false) String phone) {
        if (phone == null || phone.isBlank()) {
            throw new com.EDITH.SIH26043.exception.ApiException(HttpStatus.BAD_REQUEST, "Phone parameter is required");
        }
        return UserResponse.from(userAdminService.findByPhone(phone));
    }
}