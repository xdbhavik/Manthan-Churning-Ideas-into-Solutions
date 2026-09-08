package com.EDITH.SIH26043.web;

import com.EDITH.SIH26043.service.SubmissionService;
import com.EDITH.SIH26043.web.dto.ReviewResultPushRequest;
import com.EDITH.SIH26043.web.dto.SubmissionView;
import io.swagger.v3.oas.annotations.Hidden;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Service-to-service intake for evaluation-service's project-review decision.
 * When an evaluator ACCEPTs or RETURNs a project review in evaluation-service,
 * that service notifies this endpoint and the portal submission advances to the
 * matching terminal state ({@code ACCEPTED} / {@code RETURNED}). A repeated push
 * for an already-decided submission is answered idempotently.
 */
@Hidden
@RestController
@RequestMapping("/internal/submissions")
public class InternalReviewResultController {

    private final SubmissionService submissionService;

    public InternalReviewResultController(SubmissionService submissionService) {
        this.submissionService = submissionService;
    }

    @PostMapping("/{submissionId}/review-result")
    public SubmissionView reviewResult(@PathVariable UUID submissionId,
                                       @Valid @RequestBody ReviewResultPushRequest request) {
        return submissionService.acceptReviewResult(submissionId, request);
    }
}
