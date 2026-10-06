package com.EDITH.SIH26043.service;

import com.EDITH.SIH26043.web.dto.RouteOutcomeResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.UUID;

/** ADMIN-only bulk handoff for pending submitted government problems. */
@Service
public class GovernmentAssignmentAdminService {

    private final EvaluationIntakeService intakeService;
    private final EvaluationRoutingService routingService;

    public GovernmentAssignmentAdminService(EvaluationIntakeService intakeService,
                                            EvaluationRoutingService routingService) {
        this.intakeService = intakeService;
        this.routingService = routingService;
    }

    @Transactional
    public List<RouteOutcomeResponse> assign(List<ProblemSubmitter> problems,
                                             UUID evaluatorUserId,
                                             UUID actorUserId,
                                             String ipAddress) {
        if (problems == null || problems.isEmpty() || problems.size() > 100) {
            throw new IllegalArgumentException("Supply between 1 and 100 government problems");
        }
        if (new HashSet<>(problems.stream().map(ProblemSubmitter::problemId).toList()).size()
                != problems.size()) {
            throw new IllegalArgumentException("Duplicate problem IDs are not allowed");
        }
        return problems.stream().map(problem -> {
            UUID cycleId = intakeService.startGovernmentSubmission(
                    problem.problemId(), problem.submitterUserId());
            return routingService.routeGovernmentProblemTo(
                    problem.problemId(), evaluatorUserId, actorUserId, ipAddress);
        }).toList();
    }

    public record ProblemSubmitter(UUID problemId, UUID submitterUserId) { }
}
