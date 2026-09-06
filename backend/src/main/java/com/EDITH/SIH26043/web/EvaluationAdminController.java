package com.EDITH.SIH26043.web;

import com.EDITH.SIH26043.config.OpenApiConfig;
import com.EDITH.SIH26043.entity.EvaluationCycle;
import com.EDITH.SIH26043.entity.EvaluationStatusHistory;
import com.EDITH.SIH26043.entity.User;
import com.EDITH.SIH26043.enums.EvaluationStatus;
import com.EDITH.SIH26043.exception.ApiException;
import com.EDITH.SIH26043.repository.EvaluationCycleRepository;
import com.EDITH.SIH26043.repository.EvaluationStatusHistoryRepository;
import com.EDITH.SIH26043.service.EvaluationIntakeService;
import com.EDITH.SIH26043.service.ProblemAnalysisService;
import com.EDITH.SIH26043.web.dto.EvaluationCycleResponse;
import com.EDITH.SIH26043.web.dto.EvaluationStatusHistoryResponse;
import com.EDITH.SIH26043.web.dto.ProblemAnalysisResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * ADMIN/REVIEWER evaluation-pipeline endpoints. Each step endpoint (analyze,
 * route, aggregate, prioritize, complete) is added by its owning service; this
 * controller owns intake (start) plus the read model (cycle, history, queue).
 */
@Tag(name = OpenApiConfig.TAG_EVALUATION)
@RestController
@RequestMapping("/evaluation")
@PreAuthorize("hasRole('ADMIN') or hasRole('REVIEWER')")
public class EvaluationAdminController {

    private final EvaluationIntakeService intakeService;
    private final ProblemAnalysisService analysisService;
    private final EvaluationCycleRepository cycleRepository;
    private final EvaluationStatusHistoryRepository historyRepository;

    public EvaluationAdminController(EvaluationIntakeService intakeService,
                                     ProblemAnalysisService analysisService,
                                     EvaluationCycleRepository cycleRepository,
                                     EvaluationStatusHistoryRepository historyRepository) {
        this.intakeService = intakeService;
        this.analysisService = analysisService;
        this.cycleRepository = cycleRepository;
        this.historyRepository = historyRepository;
    }

    @Operation(
            summary = "▶️ Start an evaluation cycle",
            description = """
                    Validates the problem is REGISTERED and unclaimed, opens a single
                    evaluation cycle in RECEIVED, and appends the initial history + audit row.
                    The pipeline steps (analyze/route/...) are then invoked explicitly.""")
    @ResponseStatus(HttpStatus.CREATED)
    @PostMapping("/problems/{problemId}/start")
    public EvaluationCycleResponse start(@PathVariable UUID problemId,
                                         @AuthenticationPrincipal User me,
                                         HttpServletRequest http) {
        EvaluationCycle cycle = intakeService.start(problemId, me.getUserId(), clientIp(http));
        return EvaluationCycleResponse.from(cycle);
    }

    @Operation(
            summary = "🤖 Run AI problem analysis",
            description = """
                    Builds the problem context (location, domains, evidence count) and asks
                    Claude for a structured problem profile. When the model is unreachable or
                    returns unusable JSON, a deterministic heuristic profile is stored instead,
                    so the pipeline never blocks on the network. The profile is advisory: it
                    never contributes to the evaluation score. Idempotent — re-running replaces
                    the existing profile. Advances the cycle to ROUTING.""")
    @PostMapping("/cycles/{cycleId}/analyze")
    public ProblemAnalysisResponse analyze(@PathVariable UUID cycleId,
                                           @AuthenticationPrincipal User me,
                                           HttpServletRequest http) {
        return ProblemAnalysisResponse.from(
                analysisService.analyze(cycleId, me.getUserId(), clientIp(http)));
    }

    @Operation(summary = "🔎 Cycle detail", description = "Current state of an evaluation cycle.")
    @GetMapping("/cycles/{cycleId}")
    public EvaluationCycleResponse get(@PathVariable UUID cycleId) {
        return EvaluationCycleResponse.from(requireCycle(cycleId));
    }

    @Operation(summary = "🕓 Cycle status history", description = "Append-only lifecycle trail of the cycle.")
    @GetMapping("/cycles/{cycleId}/history")
    public List<EvaluationStatusHistoryResponse> history(@PathVariable UUID cycleId) {
        // 404 when the cycle does not exist.
        requireCycle(cycleId);
        return historyRepository.findByCycleIdOrderByChangedAtAsc(cycleId).stream()
                .map(EvaluationStatusHistoryResponse::from)
                .toList();
    }

    @Operation(summary = "📥 Evaluation queue",
            description = "Paged list of evaluation cycles, optionally filtered by status (FIFO by startedAt).")
    @GetMapping("/queue")
    public Page<EvaluationCycleResponse> queue(
            @RequestParam(value = "status", required = false) EvaluationStatus status,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, Math.min(size, 100),
                Sort.by(Sort.Direction.ASC, "startedAt"));
        Page<EvaluationCycle> result = status == null
                ? cycleRepository.findAll(pageable)
                : cycleRepository.findByStatus(status, pageable);
        return result.map(EvaluationCycleResponse::from);
    }

    private EvaluationCycle requireCycle(UUID cycleId) {
        return cycleRepository.findById(cycleId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,
                        "Evaluation cycle " + cycleId + " not found"));
    }

    private String clientIp(HttpServletRequest http) {
        String xff = http.getHeader("X-Forwarded-For");
        return xff != null ? xff.split(",")[0].trim() : http.getRemoteAddr();
    }
}
