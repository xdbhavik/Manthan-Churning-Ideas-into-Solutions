package com.EDITH.SIH26043.web;

import com.EDITH.SIH26043.config.OpenApiConfig;
import com.EDITH.SIH26043.service.AuthService;
import com.EDITH.SIH26043.web.dto.OtpRequest;
import com.EDITH.SIH26043.web.dto.OtpResponse;
import com.EDITH.SIH26043.web.dto.RefreshRequest;
import com.EDITH.SIH26043.web.dto.VerifyOtpRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = OpenApiConfig.TAG_AUTH)
@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @Operation(
            summary = "📝 Register a new user",
            description = """
                    Creates a new SUBMITTER user and immediately issues an OTP challenge  
                    (6-digit code, 5-min TTL). In local/dev the mock code is returned in the  
                    body so you don't need an SMS gateway.

                    Rate limit: 5 OTP challenges / phone / hour.""")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "✅ OTP challenge created",
                    content = @Content(schema = @Schema(implementation = OtpResponse.class))),
            @ApiResponse(responseCode = "409", description = "Phone number already registered — use /auth/login"),
            @ApiResponse(responseCode = "429", description = "Too many OTP requests for this phone")
    })
    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public OtpResponse register(@Valid @RequestBody OtpRequest req) {
        return authService.register(req);
    }

    @Operation(
            summary = "🔑 Issue login OTP",
            description = "Starts a login flow for an **existing** phone number. Same TTL and rate limits as /register.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "✅ OTP challenge issued"),
            @ApiResponse(responseCode = "404", description = "Phone not registered — register first"),
            @ApiResponse(responseCode = "429", description = "Rate limited")
    })
    @PostMapping("/login")
    public OtpResponse login(@Valid @RequestBody OtpRequest req) {
        return authService.login(req);
    }

    @Operation(
            summary = "✅ Verify OTP → mint JWT pair",
            description = """
                    Presents the challengeId + 6-digit code. On success: mints a  
                    15-minute **access token** (JWT, HS256) and a 7-day rotating  
                    **refresh token** (UUID stored server-side).

                    👉 Copy `accessToken` → click the green **Authorize** button at the top-right  
                    and paste it to unlock all protected endpoints in one click.""")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "✅ Authenticated — JWT pair returned"),
            @ApiResponse(responseCode = "400", description = "Wrong code / expired / already consumed / too many attempts"),
            @ApiResponse(responseCode = "401", description = "No user record for the verified phone")
    })
    @PostMapping("/verify-otp")
    public VerifyOtpRequest.VerifyOtpResponse verifyOtp(@Valid @RequestBody VerifyOtpRequest req) {
        return authService.verifyOtp(req);
    }

    @Operation(
            summary = "🔄 Rotate refresh token",
            description = """
                    Submits a valid (unexpired, non-revoked) refresh token.  
                    ⚠️ **Rotation**: the old refresh token is revoked immediately and a  
                    brand new pair is returned. Re-using an old token always fails.""")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "✅ New token pair minted"),
            @ApiResponse(responseCode = "401", description = "Unknown / expired / revoked refresh token")
    })
    @PostMapping("/refresh")
    public RefreshRequest.RefreshResponse refresh(@Valid @RequestBody RefreshRequest req) {
        return authService.refresh(req);
    }

    @Operation(
            summary = "🚪 Revoke refresh token (logout)",
            description = "Revokes the supplied refresh token. Access token still works until its 15-min TTL expires.")
    @ApiResponse(responseCode = "204", description = "✅ Token revoked (no body)")
    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(@Valid @RequestBody RefreshRequest req) {
        authService.logout(req);
    }
}