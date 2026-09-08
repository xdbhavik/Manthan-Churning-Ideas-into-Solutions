package com.EDITH.SIH26043.web;

import com.EDITH.SIH26043.config.OpenApiConfig;
import com.EDITH.SIH26043.enums.AssignmentStatus;
import com.EDITH.SIH26043.enums.EvaluationStatus;
import com.EDITH.SIH26043.exception.ApiException;
import com.EDITH.SIH26043.security.AuthUser;
import com.EDITH.SIH26043.service.EvaluatorAssignmentService;
import com.EDITH.SIH26043.service.PortalPublishService;
import com.EDITH.SIH26043.web.dto.AssignmentDetailResponse;
import com.EDITH.SIH26043.web.dto.AssignmentOutcomeResponse;
import com.EDITH.SIH26043.web.dto.CriterionScoreResponse;
import com.EDITH.SIH26043.web.dto.DeclineRequest;
import com.EDITH.SIH26043.web.dto.EvaluatorProfileResponse;
import com.EDITH.SIH26043.web.dto.MyAssignmentResponse;
import com.EDITH.SIH26043.web.dto.ScoreSubmissionRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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
 * The evaluator's own dashboard. Everything here is implicitly scoped to the
 * caller: the JWT subject resolves to exactly one {@code evaluator_profile}, and
 * an {@code assignmentId} in the path is authorized against that profile (403
 * for someone else's work), so no endpoint takes an evaluator id.
 */
@Tag(name = OpenApiConfig.TAG_EVALUATOR)
@RestController
@RequestMapping("/evaluation/me")
@PreAuthorize("hasRole('EVALUATOR')")
public class EvaluatorController {

    private static final Logger log = LoggerFactory.getLogger(EvaluatorController.class);

    private final EvaluatorAssignmentService service;
    private final PortalPublishService portalPublishService;

    public EvaluatorController(EvaluatorAssignmentService service,
                               PortalPublishService portalPublishService) {
        this.service = service;
        this.portalPublishService = portalPublishService;
    }

    @Operation(summary = "🙋 My evaluator profile",
            description = """
                    The caller's evaluator profile: which pool they score for
                    (GOVERNMENT/INDUSTRY/…) and their max concurrent workload. 404 when the
                    user has the EVALUATOR role but an ADMIN has not onboarded a profile yet
                    (POST /evaluation/evaluator-profiles) — until then nothing can be routed
                    to them.""")
    @GetMapping("/profile")
    public EvaluatorProfileResponse profile(@AuthenticationPrincipal AuthUser me) {
        return EvaluatorProfileResponse.from(service.myProfile(me.getUserId()));
    }

    @Operation(summary = "📋 My scoring criteria",
            description = """
                    The active criteria of the caller's pool, in display order, with each
                    criterion's own maxScore. This is the blank scorecard — a submission must
                    cover every one of these exactly once.""")
    @GetMapping("/criteria")
    public List<CriterionScoreResponse> criteria(@AuthenticationPrincipal AuthUser me) {
        return service.myCriteria(me.getUserId());
    }

    @Operation(summary = "🗂️ My work queue",
            description = """
                    The caller's assignments, earliest deadline first, optionally filtered by
                    status (ASSIGNED, IN_PROGRESS, SUBMITTED, DECLINED, EXPIRED, REVIEWED).
                    Served entirely from this service's database, so the queue still lists
                    even when problem-service is down; open GET /assignments/{id} for the
                    problem itself.""")
    @GetMapping("/assignments")
    public List<MyAssignmentResponse> assignments(
            @AuthenticationPrincipal AuthUser me,
            @RequestParam(value = "status", required = false) AssignmentStatus status) {
        return service.myAssignments(me.getUserId(), status);
    }

    @Operation(summary = "🔎 Assignment detail (scoring screen)",
            description = """
                    Everything needed to score one assignment: the work item, the problem
                    fetched from problem-service, the advisory AI profile (context only — it
                    must never influence the score), and the criteria with any score already
                    entered. When problem-service is unreachable the criteria form is still
                    returned with problem = null.""")
    @GetMapping("/assignments/{assignmentId}")
    public AssignmentDetailResponse assignment(@AuthenticationPrincipal AuthUser me,
                                               @PathVariable UUID assignmentId) {
        return service.assignmentDetail(me.getUserId(), assignmentId);
    }

    @Operation(summary = "✅ Accept an assignment",
            description = """
                    ASSIGNED → IN_PROGRESS, claiming the work. Idempotent: accepting an
                    already accepted assignment is a no-op. Accepting after the deadline
                    marks the assignment EXPIRED and fails with 409.""")
    @PostMapping("/assignments/{assignmentId}/accept")
    public AssignmentOutcomeResponse accept(@AuthenticationPrincipal AuthUser me,
                                            @PathVariable UUID assignmentId,
                                            HttpServletRequest http) {
        return service.accept(me.getUserId(), assignmentId, clientIp(http));
    }

    @Operation(summary = "🚫 Decline an assignment",
            description = """
                    ASSIGNED/IN_PROGRESS → DECLINED, with an optional reason stored on the
                    assignment so the audit trail explains it (e.g. conflict of interest).
                    When this leaves the cycle with no open assignment, the cycle drops back
                    to ROUTING so an ADMIN can re-route it — the declining evaluator is then
                    skipped as a candidate.""")
    @PostMapping("/assignments/{assignmentId}/decline")
    public AssignmentOutcomeResponse decline(@AuthenticationPrincipal AuthUser me,
                                             @PathVariable UUID assignmentId,
                                             @RequestBody(required = false) @Valid DeclineRequest body,
                                             HttpServletRequest http) {
        return service.decline(me.getUserId(), assignmentId,
                body == null ? null : body.reason(), clientIp(http));
    }

    @Operation(summary = "🧮 Submit my scorecard",
            description = """
                    Stores one score per criterion and closes the assignment (SUBMITTED).
                    All-or-nothing: every active criterion of the pool must appear exactly
                    once (identified by criterionId or criterionKey) and no score may exceed
                    that criterion's maxScore, so aggregation never averages a half-filled
                    form. When it was the cycle's last open assignment the cycle advances to
                    EVALUATION_COMPLETED. Submitting past the deadline marks the assignment
                    EXPIRED and fails with 409.""")
    @PostMapping("/assignments/{assignmentId}/submit")
    public AssignmentOutcomeResponse submit(@AuthenticationPrincipal AuthUser me,
                                            @PathVariable UUID assignmentId,
                                            @Valid @RequestBody ScoreSubmissionRequest body,
                                            HttpServletRequest http) {
        AssignmentOutcomeResponse outcome = service.submit(me.getUserId(), assignmentId, body, clientIp(http));
        // Publish gate: the last scorecard just flipped the cycle to EVALUATION_COMPLETED.
        // Fire the portal publish AFTER the scoring transaction committed (best effort),
        // so a portal outage can never roll the scorecard back — the ADMIN can retry
        // via POST /evaluation/cycles/{cycleId}/publish-to-portal.
        if (outcome.cycleStatus() == EvaluationStatus.EVALUATION_COMPLETED) {
            try {
                portalPublishService.publishCompletedCycleByAssignment(assignmentId);
            } catch (ApiException e) {
                log.warn("Problem publish after submit skipped (assignment {}): {}",
                        assignmentId, e.getMessage());
            }
        }
        return outcome;
    }

    private String clientIp(HttpServletRequest http) {
        String xff = http.getHeader("X-Forwarded-For");
        return xff != null ? xff.split(",")[0].trim() : http.getRemoteAddr();
    }
}
