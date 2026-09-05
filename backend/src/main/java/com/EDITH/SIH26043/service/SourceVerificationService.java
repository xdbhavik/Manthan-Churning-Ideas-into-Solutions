package com.EDITH.SIH26043.service;

import com.EDITH.SIH26043.entity.SourceVerification;
import com.EDITH.SIH26043.entity.User;
import com.EDITH.SIH26043.enums.ProblemStatus;
import com.EDITH.SIH26043.enums.VerificationResult;
import com.EDITH.SIH26043.exception.ApiException;
import com.EDITH.SIH26043.repository.ProblemRepository;
import com.EDITH.SIH26043.repository.ProblemSourceRepository;
import com.EDITH.SIH26043.repository.SourceVerificationRepository;
import com.EDITH.SIH26043.web.dto.VerifySourceRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

/**
 * Records a source identity verification (doc 05 sec 8). On PASS, the source is
 * marked verified and any problem awaiting source verification advances.
 */
@Service
public class SourceVerificationService {

    private final SourceVerificationRepository verificationRepository;
    private final ProblemSourceRepository sourceRepository;
    private final ProblemRepository problemRepository;
    private final AuditService auditService;

    public SourceVerificationService(SourceVerificationRepository verificationRepository,
                                     ProblemSourceRepository sourceRepository,
                                     ProblemRepository problemRepository,
                                     AuditService auditService) {
        this.verificationRepository = verificationRepository;
        this.sourceRepository = sourceRepository;
        this.problemRepository = problemRepository;
        this.auditService = auditService;
    }

    @Transactional
    public SourceVerification verify(UUID sourceId, VerifySourceRequest req, User reviewer, String ip) {
        var source = sourceRepository.findById(sourceId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Source not found"));

        SourceVerification v = new SourceVerification();
        v.setVerificationId(UUID.randomUUID());
        v.setSourceId(sourceId);
        v.setVerificationMethod(req.method());
        v.setVerifiedByUserId(reviewer.getUserId());
        v.setResult(req.result());
        v.setNotes(req.notes());
        v.setEvidenceUrl(req.evidenceUrl());
        v.setVerifiedAt(Instant.now());
        verificationRepository.save(v);

        if (req.result() == VerificationResult.PASS) {
            source.setVerifiedSource(true);
            sourceRepository.save(source);
            // advance any problem that is waiting on source verification
            problemRepository.findAll().stream()
                    .filter(p -> p.getSourceId().equals(sourceId)
                            && p.getStatus() == ProblemStatus.SOURCE_VERIFYING)
                    .forEach(p -> {
                        p.setStatus(ProblemStatus.SOURCE_VERIFIED);
                        problemRepository.save(p);
                        auditService.record(p.getProblemId(),
                                com.EDITH.SIH26043.enums.AuditAction.SOURCE_VERIFIED,
                                reviewer.getUserId(), p, p, ip);
                    });
        }
        return v;
    }
}