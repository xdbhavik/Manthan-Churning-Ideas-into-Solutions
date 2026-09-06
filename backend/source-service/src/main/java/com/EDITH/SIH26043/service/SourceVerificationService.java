package com.EDITH.SIH26043.service;

import com.EDITH.SIH26043.entity.SourceVerification;
import com.EDITH.SIH26043.enums.VerificationResult;
import com.EDITH.SIH26043.exception.ApiException;
import com.EDITH.SIH26043.repository.ProblemSourceRepository;
import com.EDITH.SIH26043.repository.SourceVerificationRepository;
import com.EDITH.SIH26043.security.AuthUser;
import com.EDITH.SIH26043.web.dto.VerifySourceRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

/**
 * Records a source identity verification (doc 05 sec 8). On PASS, the source is
 * marked verified.
 *
 * <p>Step 4 retired the legacy side-effect of also advancing problem rows
 * (SOURCE_VERIFYING → SOURCE_VERIFIED): since the {@code source_account} spine
 * gates submission on an already VERIFIED account, a problem is never submitted
 * while its source is still awaiting verification, so there is nothing to
 * advance here. Problem status transitions now happen only via
 * {@code PATCH /problems/{id}/status} on problem-service.</p>
 */
@Service
public class SourceVerificationService {

    private final SourceVerificationRepository verificationRepository;
    private final ProblemSourceRepository sourceRepository;

    public SourceVerificationService(SourceVerificationRepository verificationRepository,
                                     ProblemSourceRepository sourceRepository) {
        this.verificationRepository = verificationRepository;
        this.sourceRepository = sourceRepository;
    }

    @Transactional
    public SourceVerification verify(UUID sourceId, VerifySourceRequest req, AuthUser reviewer, String ip) {
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
        }
        return v;
    }
}
