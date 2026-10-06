package com.EDITH.SIH26043.service;

import com.EDITH.SIH26043.entity.Participant;
import com.EDITH.SIH26043.entity.PublishedProblem;
import com.EDITH.SIH26043.enums.ProblemAccessRule;
import com.EDITH.SIH26043.enums.Severity;
import com.EDITH.SIH26043.enums.SourceBucket;
import com.EDITH.SIH26043.enums.SubEntityType;
import com.EDITH.SIH26043.enums.Urgency;
import com.EDITH.SIH26043.exception.ApiException;
import com.EDITH.SIH26043.internal.ProblemContextResponse;
import com.EDITH.SIH26043.repository.PublishedProblemRepository;
import com.EDITH.SIH26043.web.dto.PublishedProblemDetail;
import com.EDITH.SIH26043.web.dto.PublishedProblemSummary;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * The published-problem catalog: intake of evaluated problems from
 * evaluation-service (idempotent upsert on the upstream problem id) and the
 * visibility-filtered read side used by the portal controllers.
 */
@Service
public class PublishedProblemService {

    private final PublishedProblemRepository problemRepository;
    private final ParticipantService participantService;

    public PublishedProblemService(PublishedProblemRepository problemRepository,
                                   ParticipantService participantService) {
        this.problemRepository = problemRepository;
        this.participantService = participantService;
    }

    /**
     * Creates or refreshes the catalog row for one evaluated problem. Called by
     * evaluation-service at {@code EVALUATION_COMPLETED} (and by manual retry).
     *
     * @param cycleId  the evaluation-service cycle whose completion published this
     * @param snapshot the problem-context snapshot carrying the problem fields
     */
    @Transactional
    public PublishedProblem upsert(UUID cycleId, ProblemContextResponse snapshot) {
        PublishedProblem problem = problemRepository.findById(snapshot.problemId())
                .orElseGet(PublishedProblem::new);

        problem.setProblemId(snapshot.problemId());
        problem.setCycleId(cycleId);
        problem.setSubmittedByUserId(snapshot.submittedByUserId());
        problem.setTitle(snapshot.title());
        problem.setDescription(snapshot.description());
        problem.setExpectedOutcome(snapshot.expectedOutcome());
        problem.setSourceBucket(enumOf(SourceBucket.class, snapshot.sourceBucket()));
        problem.setSubEntityType(enumOf(SubEntityType.class, snapshot.subEntityType()));
        problem.setUrgency(enumOf(Urgency.class, snapshot.urgency()));
        problem.setSeverity(enumOf(Severity.class, snapshot.severity()));
        problem.setLocation(snapshot.location());
        problem.setDomains(snapshot.domains() == null ? List.of() : snapshot.domains());
        problem.setEvidenceCount(snapshot.evidenceCount());

        ProblemAccessRule rule = enumOf(ProblemAccessRule.class, snapshot.accessRule());
        problem.setAccessRule(rule == null ? ProblemAccessRule.OPEN_TO_ALL : rule);
        problem.setAccessUniversities(snapshot.accessUniversities() == null
                ? List.of() : snapshot.accessUniversities());

        return problemRepository.save(problem);
    }

    /** Every published problem the viewer may see, newest first. */
    @Transactional(readOnly = true)
    public List<PublishedProblemSummary> list(Participant viewer) {
        return problemRepository.findAllByOrderByPublishedAtDesc().stream()
                .filter(p -> participantService.canSee(viewer, p))
                .map(this::toSummary)
                .toList();
    }

    @Transactional(readOnly = true)
    public boolean exists(UUID problemId) {
        return problemRepository.existsById(problemId);
    }

    /** A single published problem if (and only if) the viewer may see it. */
    @Transactional(readOnly = true)
    public PublishedProblemDetail detail(Participant viewer, UUID problemId) {
        PublishedProblem problem = problemRepository.findById(problemId)
                .filter(p -> participantService.canSee(viewer, p))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,
                        "Published problem not found or not visible to this participant"));
        return toDetail(problem);
    }

    private PublishedProblemSummary toSummary(PublishedProblem p) {
        boolean isOpen = p.getAccessRule() == ProblemAccessRule.OPEN_TO_ALL;
        return new PublishedProblemSummary(
                p.getProblemId(),
                p.getTitle(),
                p.getExpectedOutcome(),
                p.getSourceBucket() == null ? null : p.getSourceBucket().name(),
                p.getSubEntityType() == null ? null : p.getSubEntityType().name(),
                p.getUrgency() == null ? null : p.getUrgency().name(),
                p.getSeverity() == null ? null : p.getSeverity().name(),
                p.getLocation(),
                p.getDomains(),
                p.getEvidenceCount(),
                p.getAccessRule() == null ? null : p.getAccessRule().name(),
                p.getPublishedAt(),
                isOpen ? p.getVelocityIndex() : null,
                isOpen ? p.getVelocityHistory() : null,
                p.getPrizePool(),
                isOpen ? p.getTeamsActive() : null);
    }

    private PublishedProblemDetail toDetail(PublishedProblem p) {
        boolean isOpen = p.getAccessRule() == ProblemAccessRule.OPEN_TO_ALL;
        return new PublishedProblemDetail(
                p.getProblemId(),
                p.getTitle(),
                p.getDescription(),
                p.getExpectedOutcome(),
                p.getSourceBucket() == null ? null : p.getSourceBucket().name(),
                p.getSubEntityType() == null ? null : p.getSubEntityType().name(),
                p.getUrgency() == null ? null : p.getUrgency().name(),
                p.getSeverity() == null ? null : p.getSeverity().name(),
                p.getLocation(),
                p.getDomains(),
                p.getEvidenceCount(),
                p.getAccessRule() == null ? null : p.getAccessRule().name(),
                p.getAccessUniversities(),
                p.getPublishedAt(),
                isOpen ? p.getVelocityIndex() : null,
                isOpen ? p.getVelocityHistory() : null,
                p.getPrizePool(),
                isOpen ? p.getTeamsActive() : null);
    }

    private static <E extends Enum<E>> E enumOf(Class<E> type, String name) {
        if (name == null || name.isBlank()) {
            return null;
        }
        try {
            return Enum.valueOf(type, name);
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }
}
