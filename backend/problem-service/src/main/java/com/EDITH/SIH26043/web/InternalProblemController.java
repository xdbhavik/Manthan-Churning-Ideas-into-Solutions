package com.EDITH.SIH26043.web;

import com.EDITH.SIH26043.internal.ProblemContextResponse;
import com.EDITH.SIH26043.service.ProblemContextService;
import io.swagger.v3.oas.annotations.Hidden;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Service-to-service endpoint consumed by evaluation-service. Never routed
 * through the public gateway; only reachable on the internal port.
 *
 * <p>Hidden from Swagger: it is not part of the public API contract.</p>
 */
@Hidden
@RestController
@RequestMapping("/internal/problems")
public class InternalProblemController {

    private final ProblemContextService problemContextService;

    public InternalProblemController(ProblemContextService problemContextService) {
        this.problemContextService = problemContextService;
    }

    @GetMapping("/{id}")
    public ProblemContextResponse get(@PathVariable UUID id) {
        return problemContextService.assemble(id);
    }
}
