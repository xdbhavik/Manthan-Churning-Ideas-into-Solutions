package com.EDITH.SIH26043.web;

import com.EDITH.SIH26043.config.OpenApiConfig;
import com.EDITH.SIH26043.entity.SourceRegistration;
import com.EDITH.SIH26043.enums.RegistrationStatus;
import com.EDITH.SIH26043.security.AuthUser;
import com.EDITH.SIH26043.service.RegistrationReviewService;
import com.EDITH.SIH26043.web.dto.RegistrationDecisionRequest;
import com.EDITH.SIH26043.web.dto.RegistrationResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * Reviewer queue and decisions (REVIEWER/ADMIN). Every decision appends a
 * registration_status_history row inside the service.
 */
@Tag(name = OpenApiConfig.TAG_REVIEWER)
@RestController
@RequestMapping("/reviewer/registrations")
@PreAuthorize("hasRole('REVIEWER') or hasRole('ADMIN')")
public class ReviewerRegistrationController {

    private final RegistrationReviewService reviewService;

    public ReviewerRegistrationController(RegistrationReviewService reviewService) {
        this.reviewService = reviewService;
    }

    @Operation(
            summary = "📥 Reviewer queue",
            description = """
                    🔒 **REVIEWER / ADMIN only**  
                    Default (no filter): every registration currently `SUBMITTED`, `UNDER_REVIEW`, or `ACTION_REQUIRED`,  
                    ordered by submission date (oldest first — FIFO triage).  
                    Pass `status` to view one bucket in isolation.""")
    @ApiResponse(responseCode = "200", description = "Queue listing (may be empty)")
    @GetMapping
    public List<RegistrationResponse> queue(
            @Parameter(description = "Optional: filter by one registration status")
            @RequestParam(value = "status", required = false) RegistrationStatus status) {
        return reviewService.queue(status).stream()
                .map(RegistrationResponse::from)
                .toList();
    }

    @Operation(
            summary = "👤 Assign to self",
            description = "Claims a registration for the logged-in reviewer; moves `SUBMITTED → UNDER_REVIEW`. Only callable on SUBMITTED or UNDER_REVIEW rows.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Assigned; history appended"),
            @ApiResponse(responseCode = "409", description = "Cannot assign from current status (not open)")
    })
    @PostMapping("/{id}/assign")
    public RegistrationResponse assign(
            @Parameter(description = "Registration UUID", required = true) @PathVariable UUID id,
            @AuthenticationPrincipal AuthUser me) {
        return RegistrationResponse.from(reviewService.assign(id, me));
    }

    @Operation(
            summary = "✅ Approve registration",
            description = """
                    Materializes the JSON payload into a **verified `ProblemSource`**,  
                    opens the `SourceAccount` submission handle (ACTIVE+VERIFIED from birth),  
                    marks the owner `kycStatus = VERIFIED`, and closes the registration.  

                    This is the **only** place `source_account` rows are created.""")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "✅ Approved — SourceAccount opened"),
            @ApiResponse(responseCode = "409", description = "Not decidable (must be SUBMITTED or UNDER_REVIEW)")
    })
    @PostMapping("/{id}/approve")
    public RegistrationResponse approve(
            @Parameter(description = "Registration UUID", required = true) @PathVariable UUID id,
            @RequestBody(required = false) RegistrationDecisionRequest req,
            @AuthenticationPrincipal AuthUser me) {
        String comment = req == null ? null : req.comment();
        return RegistrationResponse.from(reviewService.approve(id, me, comment));
    }

    @Operation(
            summary = "❌ Reject registration",
            description = "Permanently closes a registration as REJECTED. A non-blank `reason` is mandatory (shown to the submitter via /status).")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Rejected; history + reason appended"),
            @ApiResponse(responseCode = "400", description = "Rejection reason is blank or missing"),
            @ApiResponse(responseCode = "409", description = "Not decidable from current status")
    })
    @PostMapping("/{id}/reject")
    public RegistrationResponse reject(
            @Parameter(description = "Registration UUID", required = true) @PathVariable UUID id,
            @RequestBody RegistrationDecisionRequest req,
            @AuthenticationPrincipal AuthUser me) {
        return RegistrationResponse.from(reviewService.reject(id, me, req.comment()));
    }

    @Operation(
            summary = "↩️ Send back for action",
            description = "Flags missing/incorrect information and returns control to the submitter. Comment is required (describe what to fix). Submitter may re-edit then /submit again.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Status → ACTION_REQUIRED; submitter may re-edit and resubmit"),
            @ApiResponse(responseCode = "400", description = "Action comment is blank")
    })
    @PostMapping("/{id}/request-action")
    public RegistrationResponse requestAction(
            @Parameter(description = "Registration UUID", required = true) @PathVariable UUID id,
            @RequestBody RegistrationDecisionRequest req,
            @AuthenticationPrincipal AuthUser me) {
        return RegistrationResponse.from(reviewService.requestAction(id, me, req.comment()));
    }
}
