package com.EDITH.SIH26043.web;

import com.EDITH.SIH26043.service.EvaluationIntakeService;
import com.EDITH.SIH26043.service.EvaluationRoutingService;
import com.EDITH.SIH26043.repository.EvaluationAssignmentRepository;
import com.EDITH.SIH26043.repository.EvaluatorProfileRepository;
import com.EDITH.SIH26043.entity.EvaluationAssignment;
import com.EDITH.SIH26043.entity.EvaluatorProfile;
import com.EDITH.SIH26043.enums.AssignmentStatus;
import com.EDITH.SIH26043.web.dto.RouteOutcomeResponse;
import io.swagger.v3.oas.annotations.Hidden;
import org.springframework.http.HttpStatus;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import org.springframework.web.server.ResponseStatusException;

/** Internal submission hook: open and route a submitted problem to its matching source pool. */
@Hidden
@RestController
@RequestMapping("/internal/problem-submissions")
public class InternalGovernmentSubmissionController {

    @Value("${app.internal.service-key:local-dev-internal-service-key}")
    private String serviceKey;

    private final EvaluationIntakeService intakeService;
    private final EvaluationRoutingService routingService;
    private final EvaluationAssignmentRepository assignmentRepository;
    private final EvaluatorProfileRepository profileRepository;

    public InternalGovernmentSubmissionController(EvaluationIntakeService intakeService,
                                                 EvaluationRoutingService routingService,
                                                 EvaluationAssignmentRepository assignmentRepository,
                                                 EvaluatorProfileRepository profileRepository) {
        this.intakeService = intakeService;
        this.routingService = routingService;
        this.assignmentRepository = assignmentRepository;
        this.profileRepository = profileRepository;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public RouteOutcomeResponse route(@RequestHeader(value = "X-Internal-Service-Key", required = false) String presentedKey,
                                      @RequestBody GovernmentSubmissionRequest request) {
        if (presentedKey == null || !MessageDigest.isEqual(
                serviceKey.getBytes(StandardCharsets.UTF_8), presentedKey.getBytes(StandardCharsets.UTF_8))) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid internal service key");
        }
        UUID cycleId = intakeService.startSubmittedProblem(
                request.problemId(), request.submitterUserId());
        var existing = assignmentRepository.findByCycleId(cycleId);
        if (!existing.isEmpty()) {
            EvaluationAssignment assignment = existing.getFirst();
            if (assignment.getStatus() == AssignmentStatus.REJECTED) {
                throw new IllegalStateException("This problem has already been rejected");
            }
            EvaluatorProfile profile = profileRepository.findById(assignment.getEvaluatorProfileId()).orElseThrow();
            return new RouteOutcomeResponse(true, assignment.getAssignmentId(), profile.getProfileId(),
                    profile.getEvaluatorType().name(), "Government evaluator already assigned");
        }
        RouteOutcomeResponse outcome = routingService.route(cycleId, request.submitterUserId(), "internal");
        if (!outcome.routed()) {
            throw new IllegalStateException("Problem was saved, but no active evaluator could be assigned to its source pool: "
                    + outcome.message());
        }
        return outcome;
    }

    public record GovernmentSubmissionRequest(UUID problemId, UUID submitterUserId) { }
}
