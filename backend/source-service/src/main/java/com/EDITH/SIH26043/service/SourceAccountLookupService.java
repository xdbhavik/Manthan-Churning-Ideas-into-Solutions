package com.EDITH.SIH26043.service;

import com.EDITH.SIH26043.entity.HEISource;
import com.EDITH.SIH26043.entity.ProblemSource;
import com.EDITH.SIH26043.entity.SourceAccount;
import com.EDITH.SIH26043.exception.ApiException;
import com.EDITH.SIH26043.internal.SourceAccountDetail;
import com.EDITH.SIH26043.internal.SourceAccountResponse;
import com.EDITH.SIH26043.repository.ProblemSourceRepository;
import com.EDITH.SIH26043.repository.SourceAccountRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Assembles the service-to-service source-account snapshots served on the
 * {@code /internal/**} surface:
 *
 * <ul>
 *   <li>{@code GET /internal/source-accounts/{id}} — single-account
 *       {@link SourceAccountResponse} for problem-service submission authz;</li>
 *   <li>{@code GET /internal/users/{userId}/source-accounts} — every account a
 *       user owns as {@link SourceAccountDetail}, enriched with the HEI
 *       institution name for portal-service's UNIVERSITY classification.</li>
 * </ul>
 *
 * <p>Enum fields travel as {@code name()} strings.</p>
 */
@Service
public class SourceAccountLookupService {

    private final SourceAccountRepository sourceAccountRepository;
    private final ProblemSourceRepository problemSourceRepository;

    public SourceAccountLookupService(SourceAccountRepository sourceAccountRepository,
                                      ProblemSourceRepository problemSourceRepository) {
        this.sourceAccountRepository = sourceAccountRepository;
        this.problemSourceRepository = problemSourceRepository;
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

    /**
     * Every source account the user owns, newest first. portal-service calls this
     * to decide whether a caller is a UNIVERSITY participant: the first
     * ACTIVE+VERIFIED account whose materialized source is an {@code HEISource}
     * names the institution. Empty list when the user owns nothing.
     */
    @Transactional(readOnly = true)
    public List<SourceAccountDetail> listByOwner(UUID ownerUserId) {
        return sourceAccountRepository.findByOwnerUserIdOrderByCreatedAtDesc(ownerUserId).stream()
                .map(this::toDetail)
                .toList();
    }

    private SourceAccountDetail toDetail(SourceAccount account) {
        String institutionName = null;
        // JOINED inheritance: findById on the root returns the concrete subclass
        // instance (UniversitySource / ResearchLabSource both extend HEISource),
        // so instanceof picks up exactly the HEI sources that carry an institution.
        ProblemSource source = problemSourceRepository.findById(account.getSourceId())
                .orElse(null);
        if (source instanceof HEISource hei) {
            institutionName = hei.getInstitutionName();
        }
        return new SourceAccountDetail(
                account.getSourceAccountId(),
                account.getSourceId(),
                account.getSourceBucket() == null ? null : account.getSourceBucket().name(),
                account.getSourceType() == null ? null : account.getSourceType().name(),
                account.getStatus() == null ? null : account.getStatus().name(),
                account.getVerificationStatus() == null ? null : account.getVerificationStatus().name(),
                institutionName,
                account.getDisplayName(),
                account.canSubmit());
    }
}
