package com.EDITH.SIH26043.service;

import com.EDITH.SIH26043.entity.SourceAccount;
import com.EDITH.SIH26043.exception.ApiException;
import com.EDITH.SIH26043.internal.SourceAccountResponse;
import com.EDITH.SIH26043.repository.SourceAccountRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Assembles the service-to-service source-account snapshot served at
 * {@code GET /internal/source-accounts/{id}}.
 *
 * <p>The payload is what problem-service needs to authorize a submission:
 * ownership, status/verification (via {@code canSubmit}, mirroring
 * {@link SourceAccount#canSubmit()}) and the denormalized bucket/type/source the
 * problem row copies. Enum fields travel as {@code name()} strings.</p>
 */
@Service
public class SourceAccountLookupService {

    private final SourceAccountRepository sourceAccountRepository;

    public SourceAccountLookupService(SourceAccountRepository sourceAccountRepository) {
        this.sourceAccountRepository = sourceAccountRepository;
    }

    @Transactional(readOnly = true)
    public SourceAccountResponse assemble(UUID sourceAccountId) {
        SourceAccount account = sourceAccountRepository.findById(sourceAccountId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,
                        "Source account not found"));
        return new SourceAccountResponse(
                account.getSourceAccountId(),
                account.getOwnerUserId(),
                account.getSourceId(),
                account.getStatus() == null ? null : account.getStatus().name(),
                account.getVerificationStatus() == null ? null : account.getVerificationStatus().name(),
                account.getSourceBucket() == null ? null : account.getSourceBucket().name(),
                account.getSourceType() == null ? null : account.getSourceType().name(),
                account.getDisplayName(),
                account.canSubmit());
    }
}
