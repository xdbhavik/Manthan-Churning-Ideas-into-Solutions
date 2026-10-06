package com.EDITH.SIH26043.web;

import com.EDITH.SIH26043.service.SubmissionService;
import io.swagger.v3.oas.annotations.Hidden;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

/** Internal evaluator-service lookup for the full portal-owned submission context. */
@Hidden
@RestController
@RequestMapping("/internal/submissions")
public class InternalReviewContextController {
    private final SubmissionService submissionService;

    public InternalReviewContextController(SubmissionService submissionService) {
        this.submissionService = submissionService;
    }

    @GetMapping("/{submissionId}/review-context")
    public Map<String, Object> reviewContext(@PathVariable UUID submissionId) {
        return submissionService.reviewContext(submissionId);
    }
}
