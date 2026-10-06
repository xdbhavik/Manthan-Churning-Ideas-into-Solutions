package com.EDITH.SIH26043.web;

import com.EDITH.SIH26043.config.OpenApiConfig;
import com.EDITH.SIH26043.enums.EvaluationStatus;
import com.EDITH.SIH26043.security.AuthUser;
import com.EDITH.SIH26043.service.EvaluationService;
import com.EDITH.SIH26043.web.dto.EvaluationCreateRequest;
import com.EDITH.SIH26043.web.dto.EvaluationCreateResponse;
import com.EDITH.SIH26043.web.dto.EvaluationDetailResponse;
import com.EDITH.SIH26043.web.dto.EvaluationReportResponse;
import com.EDITH.SIH26043.web.dto.EvaluationScoreResponse;
import com.EDITH.SIH26043.web.dto.FindingResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * The authenticated evaluation surface. Create is fast and returns a QUEUED
 * evaluation; everything else is a read of what the deterministic pipeline
 * produced. Reads are ownership-scoped in the service (owner, or staff).
 */
@Tag(name = OpenApiConfig.TAG_EVALUATION)
@RestController
@RequestMapping("/codejudge/evaluations")
public class CodeJudgeController {

    private final EvaluationService evaluationService;

    public CodeJudgeController(EvaluationService evaluationService) {
        this.evaluationService = evaluationService;
    }

    @Operation(
            summary = "🚀 Submit a repository for evaluation",
            description = """
                    Registers the repository at an exact `commitSha` and queues an evaluation.
                    Returns immediately with `{evaluationId, status: QUEUED}` — the pipeline
                    (clone → scan → security → scoring → report) runs on the
                    worker, so a long evaluation never blocks the request. `commitSha` is
                    mandatory: a moving branch head must not change what was judged.""")
    @ResponseStatus(HttpStatus.ACCEPTED)
    @PostMapping
    public EvaluationCreateResponse create(@Valid @RequestBody EvaluationCreateRequest request,
                                           @AuthenticationPrincipal AuthUser me) {
        return EvaluationCreateResponse.from(evaluationService.create(request, me.getUserId()));
    }

    @Operation(summary = "🔎 Evaluation status + history",
            description = "Current state of an evaluation plus its append-only transition trail.")
    @GetMapping("/{evaluationId}")
    public EvaluationDetailResponse get(@PathVariable UUID evaluationId,
                                        @AuthenticationPrincipal AuthUser me) {
        return evaluationService.detail(evaluationId, me);
    }

    @Operation(summary = "📊 Category scores + total",
            description = """
                    The weighted total and every category's contribution. Categories this
                    deployment cannot measure (those needing a build/run sandbox or curated
                    requirements) are reported `NOT_EVALUATED` at 0 with a reason — never
                    guessed.""")
    @GetMapping("/{evaluationId}/score")
    public EvaluationScoreResponse score(@PathVariable UUID evaluationId,
                                         @AuthenticationPrincipal AuthUser me) {
        return evaluationService.score(evaluationId, me);
    }

    @Operation(summary = "🧾 Findings by severity",
            description = "Report findings ordered by severity, each with its evidence reference.")
    @GetMapping("/{evaluationId}/findings")
    public List<FindingResponse> findings(@PathVariable UUID evaluationId,
                                          @AuthenticationPrincipal AuthUser me) {
        return evaluationService.findings(evaluationId, me);
    }

    @Operation(summary = "📄 Full report",
            description = """
                    The generated report. Send `Accept: text/markdown` for the human-readable
                    rendering, otherwise the structured JSON is returned. 409 until the
                    evaluation has reached REPORT_GENERATION.""")
    @GetMapping(value = "/{evaluationId}/report",
            produces = {MediaType.APPLICATION_JSON_VALUE, "text/markdown"})
    public ResponseEntity<?> report(@PathVariable UUID evaluationId,
                                    @AuthenticationPrincipal AuthUser me,
                                    @RequestParam(value = "format", required = false) String format) {
        EvaluationReportResponse report = evaluationService.report(evaluationId, me);
        if ("markdown".equalsIgnoreCase(format) || "md".equalsIgnoreCase(format)) {
            return ResponseEntity.ok()
                    .contentType(MediaType.valueOf("text/markdown;charset=UTF-8"))
                    .body(report.reportMarkdown());
        }
        return ResponseEntity.ok(report);
    }

    @Operation(summary = "📋 List evaluations",
            description = """
                    Evaluations the caller may see — their own submissions, or all of them for
                    EVALUATOR/REVIEWER/ADMIN. Optionally filtered by status.""")
    @GetMapping
    public List<EvaluationDetailResponse> list(
            @RequestParam(value = "status", required = false) EvaluationStatus status,
            @AuthenticationPrincipal AuthUser me) {
        return evaluationService.list(me, status);
    }
}
