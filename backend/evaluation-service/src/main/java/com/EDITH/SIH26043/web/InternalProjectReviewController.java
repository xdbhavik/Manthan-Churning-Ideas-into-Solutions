package com.EDITH.SIH26043.web;

import com.EDITH.SIH26043.service.ProjectReviewService;
import com.EDITH.SIH26043.web.dto.ProjectReviewCreateRequest;
import com.EDITH.SIH26043.web.dto.ProjectReviewCreateResponse;
import io.swagger.v3.oas.annotations.Hidden;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Service-to-service intake for portal-service: opens a project review for a
 * submitted project, assigned to the evaluator who scored the problem. Never
 * routed through the public gateway; only reachable on the internal port.
 */
@Hidden
@RestController
@RequestMapping("/internal/project-reviews")
public class InternalProjectReviewController {

    private final ProjectReviewService projectReviewService;

    public InternalProjectReviewController(ProjectReviewService projectReviewService) {
        this.projectReviewService = projectReviewService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProjectReviewCreateResponse create(@Valid @RequestBody ProjectReviewCreateRequest request) {
        return projectReviewService.createInternal(request);
    }
}
