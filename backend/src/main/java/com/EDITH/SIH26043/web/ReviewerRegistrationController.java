package com.EDITH.SIH26043.web;

import com.EDITH.SIH26043.entity.SourceRegistration;
import com.EDITH.SIH26043.entity.User;
import com.EDITH.SIH26043.enums.RegistrationStatus;
import com.EDITH.SIH26043.service.RegistrationReviewService;
import com.EDITH.SIH26043.web.dto.RegistrationDecisionRequest;
import com.EDITH.SIH26043.web.dto.RegistrationResponse;
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
@RestController
@RequestMapping("/reviewer/registrations")
@PreAuthorize("hasRole('REVIEWER') or hasRole('ADMIN')")
public class ReviewerRegistrationController {

    private final RegistrationReviewService reviewService;

    public ReviewerRegistrationController(RegistrationReviewService reviewService) {
        this.reviewService = reviewService;
    }

    /** Reviewer queue; optional status filter (default: all open items). */
    @GetMapping
    public List<RegistrationResponse> queue(
            @RequestParam(value = "status", required = false) RegistrationStatus status) {
        return reviewService.queue(status).stream()
                .map(RegistrationResponse::from)
                .toList();
    }

    @PostMapping("/{id}/assign")
    public RegistrationResponse assign(@PathVariable UUID id, @AuthenticationPrincipal User me) {
        return RegistrationResponse.from(reviewService.assign(id, me));
    }

    @PostMapping("/{id}/approve")
    public RegistrationResponse approve(@PathVariable UUID id,
                                        @RequestBody(required = false) RegistrationDecisionRequest req,
                                        @AuthenticationPrincipal User me) {
        String comment = req == null ? null : req.comment();
        return RegistrationResponse.from(reviewService.approve(id, me, comment));
    }

    @PostMapping("/{id}/reject")
    public RegistrationResponse reject(@PathVariable UUID id,
                                       @RequestBody RegistrationDecisionRequest req,
                                       @AuthenticationPrincipal User me) {
        return RegistrationResponse.from(reviewService.reject(id, me, req.comment()));
    }

    @PostMapping("/{id}/request-action")
    public RegistrationResponse requestAction(@PathVariable UUID id,
                                              @RequestBody RegistrationDecisionRequest req,
                                              @AuthenticationPrincipal User me) {
        return RegistrationResponse.from(reviewService.requestAction(id, me, req.comment()));
    }
}
