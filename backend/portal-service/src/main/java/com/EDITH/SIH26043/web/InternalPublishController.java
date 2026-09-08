package com.EDITH.SIH26043.web;

import com.EDITH.SIH26043.service.PublishedProblemService;
import com.EDITH.SIH26043.web.dto.PublishedProblemPushRequest;
import io.swagger.v3.oas.annotations.Hidden;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Service-to-service intake for evaluation-service: publishes a fully-evaluated
 * problem to the portal catalog at {@code EVALUATION_COMPLETED} (and on manual
 * admin retry). Never routed through the public gateway; only reachable on the
 * internal port. Idempotent on the upstream {@code problemId} — a repeat push for
 * an already-published problem refreshes the catalog row and answers {@code 200}
 * instead of {@code 201}.
 */
@Hidden
@RestController
@RequestMapping("/internal/published-problems")
public class InternalPublishController {

    private final PublishedProblemService publishedProblemService;

    public InternalPublishController(PublishedProblemService publishedProblemService) {
        this.publishedProblemService = publishedProblemService;
    }

    @PostMapping
    public ResponseEntity<Void> publish(@Valid @RequestBody PublishedProblemPushRequest request) {
        boolean created = !publishedProblemService.exists(request.problem().problemId());
        publishedProblemService.upsert(request.cycleId(), request.problem());
        return ResponseEntity
                .status(created ? HttpStatus.CREATED : HttpStatus.OK)
                .build();
    }
}
