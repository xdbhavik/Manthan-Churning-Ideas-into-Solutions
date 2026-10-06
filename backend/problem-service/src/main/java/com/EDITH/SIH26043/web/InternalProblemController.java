package com.EDITH.SIH26043.web;

import com.EDITH.SIH26043.internal.ProblemContextResponse;
import com.EDITH.SIH26043.service.ProblemContextService;
import com.EDITH.SIH26043.service.ProblemStatusService;
import com.EDITH.SIH26043.enums.ProblemStatus;
import io.swagger.v3.oas.annotations.Hidden;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.http.HttpStatus;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

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

    @Value("${app.internal.service-key:local-dev-internal-service-key}")
    private String serviceKey;

    private final ProblemContextService problemContextService;
    private final ProblemStatusService problemStatusService;

    public InternalProblemController(ProblemContextService problemContextService,
                                     ProblemStatusService problemStatusService) {
        this.problemContextService = problemContextService;
        this.problemStatusService = problemStatusService;
    }

    @GetMapping("/{id}")
    public ProblemContextResponse get(@PathVariable UUID id) {
        return problemContextService.assemble(id);
    }

    @PostMapping("/{id}/reject")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void reject(@PathVariable UUID id,
                       @RequestHeader(value = "X-Internal-Service-Key", required = false) String presentedKey,
                       @RequestBody ProblemRejectionRequest request) {
        if (presentedKey == null || !MessageDigest.isEqual(
                serviceKey.getBytes(StandardCharsets.UTF_8), presentedKey.getBytes(StandardCharsets.UTF_8))) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid internal service key");
        }
        ProblemContextResponse problem = problemContextService.assemble(id);
        if ("REJECTED".equals(problem.status())) {
            return;
        }
        problemStatusService.transition(id, ProblemStatus.REJECTED,
                request.evaluatorUserId(), null, "internal-evaluator");
    }

    public record ProblemRejectionRequest(UUID evaluatorUserId, String reason) { }
}
