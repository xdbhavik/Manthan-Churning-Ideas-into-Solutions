package com.EDITH.SIH26043.web;

import com.EDITH.SIH26043.config.OpenApiConfig;
import com.EDITH.SIH26043.entity.EvaluationCategory;
import com.EDITH.SIH26043.entity.EvaluationPolicy;
import com.EDITH.SIH26043.enums.JobStatus;
import com.EDITH.SIH26043.repository.EvaluationCategoryRepository;
import com.EDITH.SIH26043.repository.EvaluationJobRepository;
import com.EDITH.SIH26043.repository.EvaluationPolicyRepository;
import com.EDITH.SIH26043.service.EvaluationService;
import com.EDITH.SIH26043.web.dto.EvaluationCreateResponse;
import com.EDITH.SIH26043.web.dto.JobResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Admin surface: retry a failed run, start a fresh run, inspect the queue and
 * read the seeded scoring config. Weights live in the DB as data, so this
 * controller only reads them — changing a weight is a config/migration change
 * plus a new scoring version, never a code deploy. ADMIN-only: EVALUATORs drive
 * evaluations on the /codejudge/evaluations surface but do not manage the queue.
 */
@Tag(name = OpenApiConfig.TAG_ADMIN)
@RestController
@RequestMapping("/codejudge/admin")
@PreAuthorize("hasRole('ADMIN')")
public class CodeJudgeAdminController {

    private final EvaluationService evaluationService;
    private final EvaluationJobRepository jobRepository;
    private final EvaluationCategoryRepository categoryRepository;
    private final EvaluationPolicyRepository policyRepository;

    public CodeJudgeAdminController(EvaluationService evaluationService,
                                    EvaluationJobRepository jobRepository,
                                    EvaluationCategoryRepository categoryRepository,
                                    EvaluationPolicyRepository policyRepository) {
        this.evaluationService = evaluationService;
        this.jobRepository = jobRepository;
        this.categoryRepository = categoryRepository;
        this.policyRepository = policyRepository;
    }

    @Operation(summary = "♻️ Retry a FAILED evaluation",
            description = """
                    Re-queues the same evaluation for a fresh pipeline attempt (evidence rows are
                    replaced, not appended). 409 unless the evaluation is FAILED.""")
    @PostMapping("/evaluations/{evaluationId}/retry")
    public EvaluationCreateResponse retry(@PathVariable UUID evaluationId) {
        return EvaluationCreateResponse.from(evaluationService.retry(evaluationId));
    }

    @Operation(summary = "🔁 Re-evaluate (new run)",
            description = """
                    Opens a brand-new evaluation over the same pinned submission — used after a
                    scoring-config change. The previous run is left untouched so its report stays
                    truthful.""")
    @PostMapping("/evaluations/{evaluationId}/reevaluate")
    public EvaluationCreateResponse reevaluate(@PathVariable UUID evaluationId) {
        return EvaluationCreateResponse.from(evaluationService.reevaluate(evaluationId));
    }

    @Operation(summary = "📥 Queue visibility",
            description = "Job rows, optionally filtered by status (QUEUED/CLAIMED/DONE/FAILED).")
    @GetMapping("/jobs")
    public List<JobResponse> jobs(@RequestParam(value = "status", required = false) JobStatus status) {
        var jobs = status == null
                ? jobRepository.findAll()
                : jobRepository.findByStatusOrderByPriorityAscCreatedAtAsc(status);
        return jobs.stream().map(JobResponse::from).toList();
    }

    @Operation(summary = "⚖️ Scoring config",
            description = """
                    The seeded categories (weight = max score, summing to 100) and the policy
                    rules the deterministic engine applies. Read-only here: weights are data.""")
    @GetMapping("/scoring-config")
    public Map<String, Object> scoringConfig() {
        List<Map<String, Object>> categories = categoryRepository.findAll().stream()
                .map(CodeJudgeAdminController::categoryView)
                .toList();
        List<Map<String, Object>> policies = policyRepository.findAll().stream()
                .map(CodeJudgeAdminController::policyView)
                .toList();
        return Map.of("categories", categories, "policies", policies);
    }

    private static Map<String, Object> categoryView(EvaluationCategory c) {
        return Map.of(
                "categoryKey", c.getCategoryKey(),
                "name", c.getName(),
                "maxScore", c.getMaxScore(),
                "weight", c.getWeight(),
                "sortOrder", c.getSortOrder(),
                "active", c.isActive());
    }

    private static Map<String, Object> policyView(EvaluationPolicy p) {
        Map<String, Object> view = new java.util.LinkedHashMap<>();
        view.put("ruleKey", p.getRuleKey());
        view.put("severity", p.getSeverity() == null ? null : p.getSeverity().name());
        view.put("action", p.getAction());
        view.put("amount", p.getAmount());
        view.put("active", p.isActive());
        return view;
    }
}
