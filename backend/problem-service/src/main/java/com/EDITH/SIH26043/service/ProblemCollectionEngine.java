package com.EDITH.SIH26043.service;

import com.EDITH.SIH26043.client.SourceAccountGateway;
import com.EDITH.SIH26043.entity.Domain;
import com.EDITH.SIH26043.entity.Evidence;
import com.EDITH.SIH26043.entity.Location;
import com.EDITH.SIH26043.entity.Problem;
import com.EDITH.SIH26043.entity.ProblemDomain;
import com.EDITH.SIH26043.entity.ProblemDomainId;
import com.EDITH.SIH26043.enums.AuditAction;
import com.EDITH.SIH26043.enums.ProblemAccessRule;
import com.EDITH.SIH26043.enums.ProblemStatus;
import com.EDITH.SIH26043.enums.SourceBucket;
import com.EDITH.SIH26043.enums.SubEntityType;
import com.EDITH.SIH26043.exception.ApiException;
import com.EDITH.SIH26043.internal.SourceAccountResponse;
import com.EDITH.SIH26043.repository.DomainRepository;
import com.EDITH.SIH26043.repository.EvidenceRepository;
import com.EDITH.SIH26043.repository.LocationRepository;
import com.EDITH.SIH26043.repository.ProblemDomainRepository;
import com.EDITH.SIH26043.repository.ProblemRepository;
import com.EDITH.SIH26043.security.AuthUser;
import com.EDITH.SIH26043.web.dto.ProblemSubmitRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.UUID;

/**
 * ProblemCollectionEngine (doc 03): orchestrates submission intake, source
 * account authorization, normalization to Problem, evidence storage, and audit
 * logging.
 *
 * <p>It never creates a source. Sources are born in Module A (registration +
 * reviewer approval, source-service); this engine only attaches a problem to an
 * account that already passed through it, authorizing the submission against
 * source-service's {@code GET /internal/source-accounts/{id}}.</p>
 */
@Service
public class ProblemCollectionEngine {

    private final ProblemRepository problemRepository;
    private final SourceAccountGateway sourceAccountGateway;
    private final LocationRepository locationRepository;
    private final ProblemDomainRepository problemDomainRepository;
    private final DomainRepository domainRepository;
    private final EvidenceRepository evidenceRepository;
    private final AuditService auditService;

    public ProblemCollectionEngine(ProblemRepository problemRepository,
                                   SourceAccountGateway sourceAccountGateway,
                                   LocationRepository locationRepository,
                                   ProblemDomainRepository problemDomainRepository,
                                   DomainRepository domainRepository,
                                   EvidenceRepository evidenceRepository,
                                   AuditService auditService) {
        this.problemRepository = problemRepository;
        this.sourceAccountGateway = sourceAccountGateway;
        this.locationRepository = locationRepository;
        this.problemDomainRepository = problemDomainRepository;
        this.domainRepository = domainRepository;
        this.evidenceRepository = evidenceRepository;
        this.auditService = auditService;
    }

    /**
     * @param resolvedUniversityNames the audience already resolved by
     *        {@link AutoUniversitySelectionService} for an
     *        {@code AUTO_SELECTED_UNIVERSITIES} submission; {@code null} for every
     *        other rule. It is passed in rather than read from the request so a
     *        caller cannot name its own audience for an automatic rule.
     */
    @Transactional
    public Problem receiveSubmission(ProblemSubmitRequest req, AuthUser submitter, String ip,
                                     List<String> resolvedUniversityNames) {
        SourceAccountResponse account = requireSubmittableAccount(req.sourceAccountId(), submitter);
        List<UUID> domainIds = requireKnownDomains(req.domainIds());

        Location location = mapLocation(req.location());
        locationRepository.save(location);

        Problem problem = new Problem();
        problem.setProblemId(UUID.randomUUID());
        problem.setTitle(req.title());
        problem.setDescription(req.description());
        problem.setSourceBucket(SourceBucket.valueOf(account.sourceBucket()));
        problem.setSubEntityType(SubEntityType.valueOf(account.sourceType()));
        problem.setStatus(ProblemStatus.SUBMITTED);
        problem.setUrgency(req.urgency());
        problem.setSeverity(req.severity());
        problem.setSourceId(account.sourceId());
        problem.setSourceAccountId(account.sourceAccountId());
        problem.setLocationId(location.getLocationId());
        problem.setAffectedPopulation(req.affectedPopulation());
        problem.setExpectedOutcome(req.expectedOutcome());
        problem.setExistingIntervention(req.existingIntervention());
        problem.setSubmittedByUserId(submitter.getUserId());
        problem.setSubmittedAt(Instant.now());
        problem.setUpdatedAt(Instant.now());
        applyAccessRule(problem, req, resolvedUniversityNames);
        problemRepository.save(problem);

        if (!domainIds.isEmpty()) {
            attachDomains(problem.getProblemId(), domainIds);
        }

        if (req.evidence() != null) {
            req.evidence().forEach(e -> storeEvidence(problem, e, submitter));
        }

        auditService.record(problem.getProblemId(), AuditAction.CREATED,
                submitter.getUserId(), null, problem, ip);
        return problem;
    }

    /**
     * The one place the absent-rule default is defined, so the submission
     * orchestrator and this engine cannot disagree about which rule a request is
     * asking for.
     */
    public static ProblemAccessRule effectiveAccessRule(ProblemSubmitRequest req) {
        return req.accessRule() == null ? ProblemAccessRule.OPEN_TO_ALL : req.accessRule();
    }

    /**
     * Normalizes and stores the participation-scope. Absent rule defaults to
     * {@code OPEN_TO_ALL}. The two named-audience rules must always carry a
     * non-empty list — the evaluator reads that list to decide who the problem is
     * for, and an empty one would silently mean "nobody".
     *
     * <p>For {@code AUTO_SELECTED_UNIVERSITIES} the names come from the resolver,
     * not from the request body.</p>
     */
    private static void applyAccessRule(Problem problem, ProblemSubmitRequest req,
                                        List<String> resolvedUniversityNames) {
        ProblemAccessRule rule = effectiveAccessRule(req);
        problem.setAccessRule(rule);
        if (rule == ProblemAccessRule.SELECTED_UNIVERSITIES) {
            List<String> cleaned = cleanNames(req.accessUniversities());
            if (cleaned.isEmpty()) {
                throw new ApiException(HttpStatus.BAD_REQUEST,
                        "accessRule=SELECTED_UNIVERSITIES requires a non-empty "
                                + "accessUniversities list of university names");
            }
            problem.setAccessUniversities(cleaned);
        } else if (rule == ProblemAccessRule.AUTO_SELECTED_UNIVERSITIES) {
            List<String> cleaned = cleanNames(resolvedUniversityNames);
            if (cleaned.isEmpty()) {
                throw new ApiException(HttpStatus.BAD_REQUEST,
                        "accessRule=AUTO_SELECTED_UNIVERSITIES requires the audience to be "
                                + "resolved by the server; none was supplied");
            }
            problem.setAccessUniversities(cleaned);
        } else {
            problem.setAccessUniversities(List.of());
        }
    }

    private static List<String> cleanNames(List<String> names) {
        if (names == null) {
            return List.of();
        }
        LinkedHashSet<String> cleaned = new LinkedHashSet<>();
        for (String name : names) {
            if (name != null && !name.isBlank()) {
                cleaned.add(name.trim());
            }
        }
        return new ArrayList<>(cleaned);
    }

    /**
     * The Module A / Module B boundary. Source identity was settled at
     * registration time, so the only questions here are whether the caller owns
     * this account and whether it is still allowed to act. An unverified or
     * suspended account is a 403 SOURCE_NOT_VERIFIED -- never a silent downgrade
     * to an unverified submission.
     */
    private SourceAccountResponse requireSubmittableAccount(UUID accountId, AuthUser submitter) {
        SourceAccountResponse account = sourceAccountGateway.fetch(accountId);
        if (!account.ownerUserId().equals(submitter.getUserId())) {
            throw new ApiException(HttpStatus.FORBIDDEN,
                    "SOURCE_NOT_OWNED: this source account belongs to another user");
        }
        if (!account.canSubmit()) {
            throw new ApiException(HttpStatus.FORBIDDEN,
                    "SOURCE_NOT_VERIFIED: source account is " + account.status()
                            + "/" + account.verificationStatus()
                            + "; an approved registration is required before submitting problems");
        }
        return account;
    }

    private Location mapLocation(ProblemSubmitRequest.LocationRequest l) {
        Location loc = new Location();
        loc.setLocationId(UUID.randomUUID());
        loc.setState(l.state());
        loc.setDistrict(l.district());
        loc.setBlockTehsil(l.blockTehsil());
        loc.setVillageWard(l.villageWard());
        loc.setPincode(l.pincode());
        loc.setLatitude(BigDecimal.valueOf(l.latitude()));
        loc.setLongitude(BigDecimal.valueOf(l.longitude()));
        loc.setLandmark(l.landmark());
        loc.setLgdCode(l.lgdCode());
        return loc;
    }

    /**
     * Validates every requested domain in one query and de-duplicates the list,
     * before anything is written. Duplicates would otherwise collide on the
     * {@code problem_domain} primary key.
     */
    private List<UUID> requireKnownDomains(List<UUID> domainIds) {
        if (domainIds == null || domainIds.isEmpty()) {
            return List.of();
        }
        LinkedHashSet<UUID> unique = new LinkedHashSet<>();
        for (UUID domainId : domainIds) {
            if (domainId == null) {
                throw new ApiException(HttpStatus.BAD_REQUEST,
                        "domainIds must not contain a null entry");
            }
            unique.add(domainId);
        }
        List<UUID> ordered = new ArrayList<>(unique);
        List<UUID> known = domainRepository.findAllById(ordered).stream()
                .map(Domain::getDomainId)
                .toList();
        if (known.size() != ordered.size()) {
            List<UUID> missing = ordered.stream().filter(id -> !known.contains(id)).toList();
            throw new ApiException(HttpStatus.BAD_REQUEST, "Unknown domain(s): " + missing);
        }
        return ordered;
    }

    private void attachDomains(UUID problemId, List<UUID> domainIds) {
        for (int i = 0; i < domainIds.size(); i++) {
            ProblemDomain pd = new ProblemDomain();
            pd.setId(new ProblemDomainId(problemId, domainIds.get(i)));
            pd.setPrimary(i == 0);
            problemDomainRepository.save(pd);
        }
    }

    private void storeEvidence(Problem problem, ProblemSubmitRequest.EvidenceRequest e, AuthUser submitter) {
        if (evidenceRepository.existsByFileHash(e.fileHash())) {
            throw new ApiException(HttpStatus.CONFLICT, "Duplicate evidence: file_hash already on file");
        }
        Evidence evidence = new Evidence();
        evidence.setEvidenceId(UUID.randomUUID());
        evidence.setProblemId(problem.getProblemId());
        evidence.setEvidenceType(e.evidenceType());
        evidence.setFileUrl(e.fileUrl());
        evidence.setFileHash(e.fileHash());
        if (e.metadata() != null) {
            evidence.setMetadata(e.metadata());
        }
        evidence.setCapturedAt(e.capturedAt());
        evidence.setUploadedByUserId(submitter.getUserId());
        evidenceRepository.save(evidence);
    }
}
