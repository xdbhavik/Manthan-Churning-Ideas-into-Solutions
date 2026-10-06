package com.EDITH.SIH26043.web;

import com.EDITH.SIH26043.config.OpenApiConfig;
import com.EDITH.SIH26043.security.AuthUser;
import com.EDITH.SIH26043.service.GovernmentAssignmentAdminService;
import com.EDITH.SIH26043.service.GovernmentAssignmentAdminService.ProblemSubmitter;
import com.EDITH.SIH26043.web.dto.RouteOutcomeResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/** ADMIN-only explicit assignment of submitted government work to a named evaluator. */
@Tag(name = OpenApiConfig.TAG_EVALUATION)
@RestController
@RequestMapping("/evaluation/admin/government-assignments")
@PreAuthorize("hasRole('ADMIN')")
public class GovernmentAssignmentAdminController {

    private final GovernmentAssignmentAdminService assignmentService;

    public GovernmentAssignmentAdminController(GovernmentAssignmentAdminService assignmentService) {
        this.assignmentService = assignmentService;
    }

    @Operation(summary = "Assign submitted government problems to a specific evaluator")
    @PostMapping("/reassign")
    public Map<String, Object> reassign(@RequestBody ReassignmentRequest request,
                                        @AuthenticationPrincipal AuthUser actor,
                                        HttpServletRequest http) {
        List<RouteOutcomeResponse> outcomes = assignmentService.assign(
                request.problems(), request.evaluatorUserId(), actor.getUserId(), clientIp(http));
        return Map.of("assignedCount", outcomes.stream().filter(RouteOutcomeResponse::routed).count(),
                "outcomes", outcomes);
    }

    private static String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        return forwarded == null || forwarded.isBlank()
                ? request.getRemoteAddr() : forwarded.split(",")[0].trim();
    }

    public record ReassignmentRequest(UUID evaluatorUserId, List<ProblemSubmitter> problems) { }
}
