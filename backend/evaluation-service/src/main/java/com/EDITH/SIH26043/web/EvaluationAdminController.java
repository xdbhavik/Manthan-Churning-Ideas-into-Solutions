package com.EDITH.SIH26043.web;

import com.EDITH.SIH26043.config.OpenApiConfig;
import com.EDITH.SIH26043.entity.EvaluationCycle;
import com.EDITH.SIH26043.entity.EvaluationStatusHistory;
import com.EDITH.SIH26043.enums.EvaluationStatus;
import com.EDITH.SIH26043.exception.ApiException;
import com.EDITH.SIH26043.repository.EvaluationCycleRepository;
import com.EDITH.SIH26043.repository.EvaluationStatusHistoryRepository;
import com.EDITH.SIH26043.security.AuthUser;
import com.EDITH.SIH26043.service.EvaluationCompletionService;
import com.EDITH.SIH26043.service.EvaluationIntakeService;
import com.EDITH.SIH26043.service.EvaluationRoutingService;
import com.EDITH.SIH26043.service.PortalPublishService;
import com.EDITH.SIH26043.service.PrioritizationService;
import com.EDITH.SIH26043.service.ProblemAnalysisService;
import com.EDITH.SIH26043.service.ScoreAggregationService;
import com.EDITH.SIH26043.web.dto.AggregationResponse;
import com.EDITH.SIH26043.web.dto.EvaluationCycleResponse;
import com.EDITH.SIH26043.web.dto.EvaluationStatusHistoryResponse;
import com.EDITH.SIH26043.web.dto.PrioritizationResponse;
import com.EDITH.SIH26043.web.dto.ProblemAnalysisResponse;
import com.EDITH.SIH26043.web.dto.RouteAllOutcomeResponse;
import com.EDITH.SIH26043.web.dto.RouteOutcomeResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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
import java.util.Map;
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

    private static final Logger log = LoggerFactory.getLogger(EvaluationAdminController.class);

    private final EvaluationIntakeService intakeService;
    private final ProblemAnalysisService analysisService;
    private final EvaluationRoutingService routingService;
    private final PortalPublishService portalPublishService;
    private final ScoreAggregationService aggregationService;
    private final PrioritizationService prioritizationService;
    private final EvaluationCompletionService completionService;
    private final EvaluationCycleRepository cycleRepository;
    private final EvaluationStatusHistoryRepository historyRepository;

    public EvaluationAdminController(EvaluationIntakeService intakeService,
                                     ProblemAnalysisService analysisService,
                                     EvaluationRoutingService routingService,
                                     PortalPublishService portalPublishService,
                                     ScoreAggregationService aggregationService,
                                     PrioritizationService prioritizationService,
                                     EvaluationCompletionService completionService,
                                     EvaluationCycleRepository cycleRepository,
                                     EvaluationStatusHistoryRepository historyRepository) {
        this.intakeService = intakeService;
        this.analysisService = analysisService;
        this.routingService = routingService;
        this.portalPublishService = portalPublishService;
        this.aggregationService = aggregationService;
        this.prioritizationService = prioritizationService;
        this.completionService = completionService;
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
                                         @AuthenticationPrincipal AuthUser me,
                                         HttpServletRequest http) {
        EvaluationCycle cycle = intakeService.start(problemId, me.getUserId(), clientIp(http));
        return EvaluationCycleResponse.from(cycle);
    }

    @Operation(
            summary = "🤖 Run AI problem analysis",
            description = """
                    Builds the problem context (location, domains, evidence count) and asks
                    the configured LLM (OpenAI-compatible local model) for a structured problem
                    profile. When the model is unreachable or
                    returns unusable JSON, a deterministic heuristic profile is stored instead,
                    so the pipeline never blocks on the network. The profile is advisory: it
                    never contributes to the evaluation score. Idempotent — re-running replaces
                    the existing profile. Advances the cycle to ROUTING and then runs the
                    five-pool routing pass: every pool gets an assignment, an AUTO pool is
                    scored and submitted by the AI, a MANUAL pool goes to its least-loaded
                    human evaluator. When every pool is on AUTO the cycle reaches
                    EVALUATION_COMPLETED here and the problem is published to the portal.""")
    @PostMapping("/cycles/{cycleId}/analyze")
    public ProblemAnalysisResponse analyze(@PathVariable UUID cycleId,
                                           @AuthenticationPrincipal AuthUser me,
                                           HttpServletRequest http) {
        ProblemAnalysisResponse response = ProblemAnalysisResponse.from(
                analysisService.analyze(cycleId, me.getUserId(), clientIp(http)));
        // Auto-route: analysis has just moved the cycle to ROUTING, so hand the problem to
        // all five pools now. This is a separate transaction from analysis, so a routing
        // no-op/failure cannot roll back the committed profile. Pools with nobody available
        // are skipped — retry via POST …/route (bucket pool) or …/route-pools (all pools).
        RouteAllOutcomeResponse routing =
                routingService.routeAllPools(cycleId, me.getUserId(), clientIp(http));
        // Publish gate: an all-AUTO pass scores and submits every scorecard inside routing,
        // so the cycle can already be EVALUATION_COMPLETED. Fire the portal publish after
        // that transaction committed (best effort) — a portal outage must not roll back the
        // scorecards; the ADMIN can retry via POST /evaluation/cycles/{cycleId}/publish-to-portal.
        if (passedAndCompleted(routing)) {
            publishQuietly(cycleId, "analyze");
            // Then fold the scorecards the pass just wrote into a result. Also best-effort
            // and also after the routing transaction committed.
            completionService.runBestEffort(cycleId, "analyze");
        }
        return response;
    }

    @Operation(
            summary = "📤 Route to the bucket's evaluator",
            description = """
                    Hands the problem to the least-loaded active evaluator of the pool that
                    matches its origin bucket (GOVT→GOVERNMENT, INDUSTRY→INDUSTRY, …). Exactly
                    one ASSIGNED assignment is created and the cycle moves ROUTING →
                    EVALUATION_IN_PROGRESS. Idempotent no-op when the cycle is not ROUTING.
                    Use this to retry when an earlier analyze auto-route found no candidate.""")
    @PostMapping("/cycles/{cycleId}/route")
    public RouteOutcomeResponse route(@PathVariable UUID cycleId,
                                      @AuthenticationPrincipal AuthUser me,
                                      HttpServletRequest http) {
        return routingService.route(cycleId, me.getUserId(), clientIp(http));
    }

    @Operation(
            summary = "📤 Route to all five pools",
            description = """
                    The five-pool repair pass: creates one assignment per evaluator pool that
                    does not already have one — an AUTO pool is scored and submitted by its
                    system AI evaluator, a MANUAL pool goes to its least-loaded human. Pools
                    that already hold an assignment are reported as skipped, so running this
                    twice is safe. Accepts a cycle in ROUTING or EVALUATION_IN_PROGRESS, which
                    is how a pool skipped for want of an evaluator gets filled in later. When
                    the pass completes the cycle (every pool on AUTO) the problem is published
                    to the portal.""")
    @PostMapping("/cycles/{cycleId}/route-pools")
    public RouteAllOutcomeResponse routePools(@PathVariable UUID cycleId,
                                              @AuthenticationPrincipal AuthUser me,
                                              HttpServletRequest http) {
        RouteAllOutcomeResponse outcome =
                routingService.routeAllPools(cycleId, me.getUserId(), clientIp(http));
        if (passedAndCompleted(outcome)) {
            publishQuietly(cycleId, "route-pools");
            completionService.runBestEffort(cycleId, "route-pools");
        }
        return outcome;
    }

    @Operation(
            summary = "🧮 Aggregate the pool scorecards",
            description = """
                    Folds the cycle's submitted scorecards into one result: each pool is
                    normalised to 0-100 against its own criteria maxima, weighted by
                    `weight_config` (equal weights when that configuration is missing or does
                    not sum to 1), and written to `evaluation_aggregation` together with a
                    per-pool snapshot. Sets the cycle's `final_score` and `impact_level` and
                    advances EVALUATION_COMPLETED -> SCORES_AGGREGATED. A pool that never
                    produced a scorecard is excluded and its weights are renormalised over
                    the pools that did, so a skipped pool cannot drag a good problem down.
                    When the present pools' scores spread beyond the configured threshold the
                    row is marked REVIEW_REQUIRED and a disagreement flag is audited — but
                    the pipeline does not stop; read the detail back from
                    `GET /evaluation/cycles/{cycleId}/aggregation`. Idempotent: re-running
                    upserts the same row. This normally runs by itself the moment a cycle
                    completes; call it to retry or to re-apply a changed weight config.""")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "✅ Aggregated",
                    content = @Content(schema = @Schema(implementation = AggregationResponse.class))),
            @ApiResponse(responseCode = "404", description = "Unknown cycle"),
            @ApiResponse(responseCode = "409",
                    description = "Cycle not completed, or no pool produced a scorecard")
    })
    @PostMapping("/cycles/{cycleId}/aggregate")
    public AggregationResponse aggregate(@PathVariable UUID cycleId,
                                         @AuthenticationPrincipal AuthUser me,
                                         HttpServletRequest http) {
        return aggregationService.aggregate(cycleId, me.getUserId(), clientIp(http));
    }

    @Operation(
            summary = "⭐ Prioritise the aggregated problem",
            description = """
                    Bands the aggregated score: `priority_score` is the same 0-100 number as
                    `final_score` (nothing else in the domain may influence a score), and
                    `priority_band` is its bucket — P1/P2/P3/P4 by descending threshold. The
                    cycle then advances SCORES_AGGREGATED -> PRIORITIZED -> PHASE_3_READY and
                    is handed to phase 3. Runs automatically right after aggregation; call it
                    to re-apply changed band thresholds (idempotent) or to finish a run that
                    stopped. A flagged disagreement does not block prioritisation.""")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "✅ Prioritised",
                    content = @Content(schema = @Schema(implementation = PrioritizationResponse.class))),
            @ApiResponse(responseCode = "404", description = "Unknown cycle"),
            @ApiResponse(responseCode = "409", description = "Cycle has not been aggregated")
    })
    @PostMapping("/cycles/{cycleId}/prioritize")
    public PrioritizationResponse prioritize(@PathVariable UUID cycleId,
                                             @AuthenticationPrincipal AuthUser me,
                                             HttpServletRequest http) {
        return prioritizationService.prioritize(cycleId, me.getUserId(), clientIp(http));
    }

    @Operation(
            summary = "📊 Read a cycle's aggregation",
            description = """
                    The stored aggregation without recomputing it, including the per-pool
                    snapshot (every pool appears, with `present` and a `reason` when it did
                    not score), the effective weights used, and the disagreement evidence.""")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "✅ Stored aggregation",
                    content = @Content(schema = @Schema(implementation = AggregationResponse.class))),
            @ApiResponse(responseCode = "404", description = "Unknown or not-yet-aggregated cycle")
    })
    @GetMapping("/cycles/{cycleId}/aggregation")
    public AggregationResponse aggregation(@PathVariable UUID cycleId) {
        return aggregationService.get(cycleId);
    }

    @Operation(
            summary = "🌐 Publish an evaluated problem to the portal",
            description = """
                    Manual retry of the automatic publish that fires at EVALUATION_COMPLETED.
                    Re-publishing is idempotent (portal upserts on the problem id). Use this
                    when the automatic push failed — e.g. portal-service was down when the
                    last scorecard was submitted.""")
    @PostMapping("/cycles/{cycleId}/publish-to-portal")
    public Map<String, Object> publishToPortal(@PathVariable UUID cycleId) {
        portalPublishService.publishCompletedCycle(cycleId);
        return Map.of("cycleId", cycleId, "published", true);
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

    /**
     * True when the routing pass actually ran (it reports one outcome per pool) and left
     * the cycle completed. The empty pool list matters: a pass that refused to run because
     * the cycle was already out of {@code ROUTING}/{@code EVALUATION_IN_PROGRESS} also
     * reports {@code EVALUATION_COMPLETED}, and publishing on that would append a
     * {@code PROBLEM_PUBLISHED} audit row for a request that routed nothing.
     */
    private boolean passedAndCompleted(RouteAllOutcomeResponse routing) {
        return !routing.pools().isEmpty()
                && EvaluationStatus.EVALUATION_COMPLETED.name().equals(routing.cycleStatus());
    }

    /**
     * Best-effort portal publish from an automatic step. The scorecards are already
     * committed, so a portal outage is logged and swallowed; the ADMIN retries via
     * {@code POST /evaluation/cycles/{cycleId}/publish-to-portal}.
     */
    private void publishQuietly(UUID cycleId, String origin) {
        try {
            portalPublishService.publishCompletedCycle(cycleId);
        } catch (ApiException e) {
            log.warn("Portal publish after {} skipped (cycle {}): {}", origin, cycleId, e.getMessage());
        }
    }

    private String clientIp(HttpServletRequest http) {
        String xff = http.getHeader("X-Forwarded-For");
        return xff != null ? xff.split(",")[0].trim() : http.getRemoteAddr();
    }
}
