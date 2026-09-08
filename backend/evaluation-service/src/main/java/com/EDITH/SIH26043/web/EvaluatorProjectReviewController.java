package com.EDITH.SIH26043.web;

import com.EDITH.SIH26043.config.OpenApiConfig;
import com.EDITH.SIH26043.enums.ProjectReviewStatus;
import com.EDITH.SIH26043.security.AuthUser;
import com.EDITH.SIH26043.service.ProjectReviewService;
import com.EDITH.SIH26043.web.dto.ProjectReviewDecisionRequest;
import com.EDITH.SIH26043.web.dto.ProjectReviewDetailView;
import com.EDITH.SIH26043.web.dto.ProjectReviewListItem;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * The evaluator's project-review dashboard. Students submit projects on the
 * portal; each becomes a {@code project_review} assigned to the SAME evaluator
 * who scored the problem's cycle, so this is where that evaluator ACCEPTs or
 * RETURNs the submitted solution.
 */
@Tag(name = OpenApiConfig.TAG_EVALUATOR)
@RestController
@RequestMapping("/evaluation/me/project-reviews")
@PreAuthorize("hasRole('EVALUATOR')")
public class EvaluatorProjectReviewController {

    private final ProjectReviewService service;

    public EvaluatorProjectReviewController(ProjectReviewService service) {
        this.service = service;
    }

    @Operation(summary = "🗂️ My project-review queue",
            description = """
                    Submitted projects waiting on the caller's ACCEPT/RETURN decision,
                    newest first, optionally filtered by status (ASSIGNED, ACCEPTED,
                    RETURNED). Assigned to the same evaluator who scored the problem.""")
    @GetMapping
    public List<ProjectReviewListItem> list(
            @AuthenticationPrincipal AuthUser me,
            @RequestParam(value = "status", required = false) ProjectReviewStatus status) {
        return service.myReviews(me.getUserId(), status);
    }

    @Operation(summary = "🔎 Project review detail",
            description = """
                    The submitted solution plus its problem/summary and the file metadata.
                    Each file carries a gateway-relative contentUrl back to
                    portal-service ({@code /portal/files/{fileId}/download}) that streams the
                    bytes when the caller's JWT is attached — the evaluation service never
                    stores file bytes.""")
    @GetMapping("/{projectReviewId}")
    public ProjectReviewDetailView detail(@AuthenticationPrincipal AuthUser me,
                                          @PathVariable UUID projectReviewId) {
        return service.detail(me.getUserId(), projectReviewId);
    }

    @Operation(summary = "⚖️ Decide a project review",
            description = """
                    ASSIGNED → ACCEPTED | RETURNED. The decision is stored here and pushed
                    back to portal-service, which advances the student's submission to the
                    matching terminal state (RETURNED submissions can be edited and
                    resubmitted — that opens a fresh round for the same evaluator).""")
    @PostMapping("/{projectReviewId}/decision")
    public ProjectReviewDetailView decide(@AuthenticationPrincipal AuthUser me,
                                          @PathVariable UUID projectReviewId,
                                          @Valid @RequestBody ProjectReviewDecisionRequest body) {
        return service.decide(me.getUserId(), projectReviewId,
                body.decision(), body.comment());
    }
}
