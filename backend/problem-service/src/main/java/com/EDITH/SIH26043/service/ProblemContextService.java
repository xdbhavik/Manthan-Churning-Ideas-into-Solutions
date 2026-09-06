package com.EDITH.SIH26043.service;

import com.EDITH.SIH26043.entity.Domain;
import com.EDITH.SIH26043.entity.Problem;
import com.EDITH.SIH26043.entity.ProblemDomain;
import com.EDITH.SIH26043.exception.ApiException;
import com.EDITH.SIH26043.internal.ProblemContextResponse;
import com.EDITH.SIH26043.repository.DomainRepository;
import com.EDITH.SIH26043.repository.EvidenceRepository;
import com.EDITH.SIH26043.repository.LocationRepository;
import com.EDITH.SIH26043.repository.ProblemDomainRepository;
import com.EDITH.SIH26043.repository.ProblemRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Assembles the service-to-service problem snapshot served at
 * {@code GET /internal/problems/{id}} (moved here with the problem aggregate in
 * Step 4; previously the monolith served it).
 *
 * <p>The payload is the evaluation pipeline's whole read model: status (intake
 * validates REGISTERED) plus the AI-analysis context (title/description/bucket,
 * formatted location, domain names, evidence count).</p>
 */
@Service
public class ProblemContextService {

    private final ProblemRepository problemRepository;
    private final LocationRepository locationRepository;
    private final ProblemDomainRepository problemDomainRepository;
    private final DomainRepository domainRepository;
    private final EvidenceRepository evidenceRepository;

    public ProblemContextService(ProblemRepository problemRepository,
                                 LocationRepository locationRepository,
                                 ProblemDomainRepository problemDomainRepository,
                                 DomainRepository domainRepository,
                                 EvidenceRepository evidenceRepository) {
        this.problemRepository = problemRepository;
        this.locationRepository = locationRepository;
        this.problemDomainRepository = problemDomainRepository;
        this.domainRepository = domainRepository;
        this.evidenceRepository = evidenceRepository;
    }

    @Transactional(readOnly = true)
    public ProblemContextResponse assemble(UUID problemId) {
        Problem problem = problemRepository.findById(problemId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,
                        "Problem " + problemId + " not found"));

        List<String> domains = new ArrayList<>();
        List<UUID> domainIds = problemDomainRepository.findByIdProblemId(problemId)
                .stream()
                .map(ProblemDomain::getId)
                .map(id -> id.getDomainId())
                .toList();
        if (!domainIds.isEmpty()) {
            for (Domain domain : domainRepository.findAllById(domainIds)) {
                domains.add(domain.getDomainName());
            }
        }

        String location = null;
        if (problem.getLocationId() != null) {
            location = locationRepository.findById(problem.getLocationId())
                    .map(l -> String.join(", ",
                            List.of(nvl(l.getState()), nvl(l.getDistrict()), nvl(l.getBlockTehsil()))
                                    .stream().filter(s -> !s.isEmpty()).toList()))
                    .orElse(null);
        }

        int evidenceCount = evidenceRepository.findByProblemId(problemId).size();

        return new ProblemContextResponse(
                problem.getProblemId(),
                problem.getStatus() == null ? null : problem.getStatus().name(),
                problem.getTitle(), problem.getDescription(),
                problem.getSourceBucket() == null ? null : problem.getSourceBucket().name(),
                problem.getSubEntityType() == null ? null : problem.getSubEntityType().name(),
                problem.getUrgency() == null ? null : problem.getUrgency().name(),
                problem.getSeverity() == null ? null : problem.getSeverity().name(),
                problem.getAffectedPopulation(), problem.getExpectedOutcome(),
                problem.getExistingIntervention(), location, domains, evidenceCount);
    }

    private static String nvl(String value) {
        return value == null ? "" : value;
    }
}
