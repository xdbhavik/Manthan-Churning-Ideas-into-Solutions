package com.EDITH.SIH26043.web;

import com.EDITH.SIH26043.config.OpenApiConfig;
import com.EDITH.SIH26043.entity.SourceVerification;
import com.EDITH.SIH26043.entity.User;
import com.EDITH.SIH26043.service.SourceVerificationService;
import com.EDITH.SIH26043.web.dto.VerifySourceRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/** Records source identity checks (REVIEWER only, doc 11 sec 1). */
@Tag(name = OpenApiConfig.TAG_VERIFICATION)
@RestController
@RequestMapping("/sources")
public class VerificationController {

    private final SourceVerificationService verificationService;

    public VerificationController(SourceVerificationService verificationService) {
        this.verificationService = verificationService;
    }

    @Operation(
            summary = "✅ Record a source verification check",
            description = """
                    🔒 **REVIEWER / ADMIN only**  
                    Appends one verification result (PASS / FAIL / NEEDS_REVIEW) to a source account  
                    together with the method used (OFFICIAL_EMAIL, AUTHORIZATION_DOC, OTP,  
                    REGISTRATION_API, INSTITUTIONAL_EMAIL, MANUAL_REVIEW) and an optional document ref.  

                    Client IP is stored for the immutable audit trail.""")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Verification record appended"),
            @ApiResponse(responseCode = "400", description = "Validation failed on request body"),
            @ApiResponse(responseCode = "403", description = "Insufficient role"),
            @ApiResponse(responseCode = "404", description = "Source account not found")
    })
    @PostMapping("/{id}/verify")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('REVIEWER') or hasRole('ADMIN')")
    public SourceVerification verify(
            @Parameter(description = "SourceAccount UUID", required = true) @PathVariable UUID id,
            @Valid @RequestBody VerifySourceRequest req,
            @AuthenticationPrincipal User me,
            jakarta.servlet.http.HttpServletRequest http) {
        return verificationService.verify(id, req, me, clientIp(http));
    }

    private String clientIp(jakarta.servlet.http.HttpServletRequest http) {
        String xff = http.getHeader("X-Forwarded-For");
        return xff != null ? xff.split(",")[0].trim() : http.getRemoteAddr();
    }
}