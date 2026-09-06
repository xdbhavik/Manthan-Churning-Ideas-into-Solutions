package com.EDITH.SIH26043.service;

import com.EDITH.SIH26043.entity.Evidence;
import com.EDITH.SIH26043.entity.Location;
import com.EDITH.SIH26043.entity.Problem;
import com.EDITH.SIH26043.entity.ProblemDomain;
import com.EDITH.SIH26043.entity.ProblemDomainId;
import com.EDITH.SIH26043.entity.SourceAccount;
import com.EDITH.SIH26043.enums.AuditAction;
import com.EDITH.SIH26043.enums.ProblemStatus;
import com.EDITH.SIH26043.exception.ApiException;
import com.EDITH.SIH26043.repository.DomainRepository;
import com.EDITH.SIH26043.repository.EvidenceRepository;
import com.EDITH.SIH26043.repository.LocationRepository;
import com.EDITH.SIH26043.repository.ProblemDomainRepository;
import com.EDITH.SIH26043.repository.ProblemRepository;
import com.EDITH.SIH26043.repository.SourceAccountRepository;
import com.EDITH.SIH26043.security.AuthUser;
import com.EDITH.SIH26043.web.dto.ProblemSubmitRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * ProblemCollectionEngine (doc 03): orchestrates submission intake, source
 * account authorization, normalization to Problem, evidence storage, and audit
 * logging.
 *
 * <p>It never creates a source. Sources are born in Module A (registration +
 * reviewer approval); this engine only attaches a problem to an account that
 * already passed through it.</p>
 */
@Service
public class ProblemCollectionEngine {

    private final ProblemRepository problemRepository;
    private final SourceAccountRepository sourceAccountRepository;
    private final LocationRepository locationRepository;
    private final ProblemDomainRepository problemDomainRepository;
    private final DomainRepository domainRepository;
    private final EvidenceRepository evidenceRepository;
    private final AuditService auditService;

    public ProblemCollectionEngine(ProblemRepository problemRepository,
                                   SourceAccountRepository sourceAccountRepository,
                                   LocationRepository locationRepository,
                                   ProblemDomainRepository problemDomainRepository,
                                   DomainRepository domainRepository,
                                   EvidenceRepository evidenceRepository,
                                   AuditService auditService) {
        this.problemRepository = problemRepository;
        this.sourceAccountRepository = sourceAccountRepository;
        this.locationRepository = locationRepository;
        this.problemDomainRepository = problemDomainRepository;
        this.domainRepository = domainRepository;
        this.evidenceRepository = evidenceRepository;
        this.auditService = auditService;
    }

    @Transactional
    public Problem receiveSubmission(ProblemSubmitRequest req, AuthUser submitter, String ip) {
        SourceAccount account = requireSubmittableAccount(req.sourceAccountId(), submitter);

        Location location = mapLocation(req.location());
        locationRepository.save(location);

        Problem problem = new Problem();
        problem.setProblemId(UUID.randomUUID());
        problem.setTitle(req.title());
        problem.setDescription(req.description());
        problem.setSourceBucket(account.getSourceBucket());
        problem.setSubEntityType(account.getSourceType());
        problem.setStatus(ProblemStatus.SUBMITTED);
        problem.setUrgency(req.urgency());
        problem.setSeverity(req.severity());
        problem.setSourceId(account.getSourceId());
        problem.setSourceAccountId(account.getSourceAccountId());
        problem.setLocationId(location.getLocationId());
        problem.setAffectedPopulation(req.affectedPopulation());
        problem.setExpectedOutcome(req.expectedOutcome());
        problem.setExistingIntervention(req.existingIntervention());
        problem.setSubmittedByUserId(submitter.getUserId());
        problem.setSubmittedAt(Instant.now());
        problem.setUpdatedAt(Instant.now());
        problemRepository.save(problem);

        if (req.domainIds() != null && !req.domainIds().isEmpty()) {
            attachDomains(problem.getProblemId(), req.domainIds());
        }

        if (req.evidence() != null) {
            req.evidence().forEach(e -> storeEvidence(problem, e, submitter));
        }

        auditService.record(problem.getProblemId(), AuditAction.CREATED,
                submitter.getUserId(), null, problem, ip);
        return problem;
    }

    /**
     * The Module A / Module B boundary. Source identity was settled at
     * registration time, so the only questions here are whether the caller owns
     * this account and whether it is still allowed to act. An unverified or
     * suspended account is a 403 SOURCE_NOT_VERIFIED -- never a silent downgrade
     * to an unverified submission.
     */
    private SourceAccount requireSubmittableAccount(UUID accountId, AuthUser submitter) {
        SourceAccount account = sourceAccountRepository.findById(accountId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Source account not found"));
        if (!account.getOwnerUserId().equals(submitter.getUserId())) {
            throw new ApiException(HttpStatus.FORBIDDEN,
                    "SOURCE_NOT_OWNED: this source account belongs to another user");
        }
        if (!account.canSubmit()) {
            throw new ApiException(HttpStatus.FORBIDDEN,
                    "SOURCE_NOT_VERIFIED: source account is " + account.getStatus()
                            + "/" + account.getVerificationStatus()
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

    private void attachDomains(UUID problemId, List<UUID> domainIds) {
        for (int i = 0; i < domainIds.size(); i++) {
            UUID domainId = domainIds.get(i);
            if (!domainRepository.existsById(domainId)) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Unknown domain " + domainId);
            }
            ProblemDomain pd = new ProblemDomain();
            pd.setId(new ProblemDomainId(problemId, domainId));
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
