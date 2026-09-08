package com.EDITH.SIH26043.web;

import com.EDITH.SIH26043.service.EvaluationService;
import com.EDITH.SIH26043.web.dto.EvaluationCreateResponse;
import com.EDITH.SIH26043.web.dto.EvaluationSummaryResponse;
import com.EDITH.SIH26043.web.dto.InternalEvaluationCreateRequest;
import io.swagger.v3.oas.annotations.Hidden;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Service-to-service surface for portal-service / evaluation-service: queue an
 * evaluation on a student's behalf and read back the deterministic summary that a
 * human reviewer sees. Never routed through the public gateway.
 */
@Hidden
@RestController
@RequestMapping("/internal/codejudge/evaluations")
public class InternalCodeJudgeController {

    private final EvaluationService evaluationService;

    public InternalCodeJudgeController(EvaluationService evaluationService) {
        this.evaluationService = evaluationService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.ACCEPTED)
    public EvaluationCreateResponse create(@Valid @RequestBody InternalEvaluationCreateRequest request) {
        return EvaluationCreateResponse.from(
                evaluationService.create(request.submission(), request.ownerUserId()));
    }

    @GetMapping("/{evaluationId}/summary")
    public EvaluationSummaryResponse summary(@PathVariable UUID evaluationId) {
        return evaluationService.summary(evaluationId);
    }
}
