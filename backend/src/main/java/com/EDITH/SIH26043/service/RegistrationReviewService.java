package com.EDITH.SIH26043.service;

import com.EDITH.SIH26043.entity.ProblemSource;
import com.EDITH.SIH26043.entity.RegistrationStatusHistory;
import com.EDITH.SIH26043.entity.SourceAccount;
import com.EDITH.SIH26043.entity.SourceRegistration;
import com.EDITH.SIH26043.entity.User;
import com.EDITH.SIH26043.enums.AccountVerificationStatus;
import com.EDITH.SIH26043.enums.KycStatus;
import com.EDITH.SIH26043.enums.RegistrationStatus;
import com.EDITH.SIH26043.enums.SourceAccountStatus;
import com.EDITH.SIH26043.exception.ApiException;
import com.EDITH.SIH26043.repository.ProblemSourceRepository;
import com.EDITH.SIH26043.repository.RegistrationStatusHistoryRepository;
import com.EDITH.SIH26043.repository.SourceAccountRepository;
import com.EDITH.SIH26043.repository.SourceRegistrationRepository;
import com.EDITH.SIH26043.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.EnumSet;
import java.util.List;
import java.util.UUID;

/**
 * Reviewer-side workflow: queue, assignment and decisions. On APPROVE the
 * draft payload is materialized into a verified ProblemSource account, a
 * SourceAccount is opened as the submission handle, and the submitting user is
 * linked to it (kyc VERIFIED + linkedSourceId).
 */
@Service
public class RegistrationReviewService {

    /** Default reviewer queue: everything awaiting reviewer attention. */
    private static final EnumSet<RegistrationStatus> OPEN_STATUSES = EnumSet.of(
            RegistrationStatus.SUBMITTED,
            RegistrationStatus.UNDER_REVIEW,
            RegistrationStatus.ACTION_REQUIRED);

    private final SourceRegistrationRepository registrationRepository;
    private final RegistrationStatusHistoryRepository historyRepository;
    private final ProblemSourceRepository sourceRepository;
    private final SourceAccountRepository sourceAccountRepository;
    private final UserRepository userRepository;
    private final SourceMapper sourceMapper;
    private final SourceTypeCatalog sourceTypeCatalog;

    public RegistrationReviewService(SourceRegistrationRepository registrationRepository,
                                     RegistrationStatusHistoryRepository historyRepository,
                                     ProblemSourceRepository sourceRepository,
                                     SourceAccountRepository sourceAccountRepository,
                                     UserRepository userRepository,
                                     SourceMapper sourceMapper,
                                     SourceTypeCatalog sourceTypeCatalog) {
        this.registrationRepository = registrationRepository;
        this.historyRepository = historyRepository;
        this.sourceRepository = sourceRepository;
        this.sourceAccountRepository = sourceAccountRepository;
        this.userRepository = userRepository;
        this.sourceMapper = sourceMapper;
        this.sourceTypeCatalog = sourceTypeCatalog;
    }

    @Transactional(readOnly = true)
    public List<SourceRegistration> queue(RegistrationStatus status) {
        if (status == null) {
            return registrationRepository.findByStatusInOrderBySubmittedAtAsc(OPEN_STATUSES);
        }
        return registrationRepository.findByStatusOrderBySubmittedAtAsc(status);
    }

    @Transactional
    public SourceRegistration assign(UUID registrationId, User reviewer) {
        SourceRegistration reg = load(registrationId);
        if (reg.getStatus() != RegistrationStatus.SUBMITTED
                && reg.getStatus() != RegistrationStatus.UNDER_REVIEW) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Cannot assign a registration in status " + reg.getStatus());
        }
        RegistrationStatus from = reg.getStatus();
        reg.setAssignedReviewerId(reviewer.getUserId());
        reg.setStatus(RegistrationStatus.UNDER_REVIEW);
        SourceRegistration saved = registrationRepository.save(reg);

        historyRepository.save(entry(saved, from, RegistrationStatus.UNDER_REVIEW,
                reviewer.getUserId(), "Assigned to reviewer"));
        return saved;
    }

    /**
     * APPROVE: materializes the verified source account from the draft payload,
     * opens the SourceAccount that problems will be submitted under, links the
     * owner, and closes the registration. This is the only place a problem_source
     * row and a source_account row are created from a registration. Decisions are
     * allowed straight from SUBMITTED (the queue) or from an explicitly assigned
     * UNDER_REVIEW registration.
     */
    @Transactional
    public SourceRegistration approve(UUID registrationId, User reviewer, String comment) {
        SourceRegistration reg = load(registrationId);
        requireDecidable(reg, "approved");

        // Guard against 500s: the submit-time gate (SourceTypeCatalog.REQUIRED_FIELDS)
        // is thinner than the NOT NULL columns materialization needs. Older/incomplete
        // payloads in the queue fail here with a clean, actionable error instead of a
        // DataIntegrityViolationException deep inside the INSERT.
        List<String> missing = sourceTypeCatalog.missingRequired(
                reg.getSourceType(), reg.getSourcePayload());
        if (!missing.isEmpty()) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "Cannot approve " + reg.getSourceType() + " registration: source payload is missing "
                            + "field(s) required to materialize the source account: "
                            + String.join(", ", missing)
                            + ". Send it back as ACTION_REQUIRED so the owner can add them.");
        }

        ProblemSource source = sourceMapper.materialize(
                reg.getSourceType(), reg.getSourceBucket(), reg.getSourcePayload());
        source.setSourceId(UUID.randomUUID());
        source.setVerifiedSource(true);
        sourceRepository.save(source);

        sourceAccountRepository.save(openAccount(reg, source));

        RegistrationStatus from = reg.getStatus();
        reg.setSourceId(source.getSourceId());
        reg.setStatus(RegistrationStatus.APPROVED);
        reg.setReviewedAt(Instant.now());
        SourceRegistration saved = registrationRepository.save(reg);

        userRepository.findById(reg.getSubmittedByUserId()).ifPresent(owner -> {
            owner.setLinkedSourceId(source.getSourceId());
            owner.setKycStatus(KycStatus.VERIFIED);
            userRepository.save(owner);
        });

        historyRepository.save(entry(saved, from, RegistrationStatus.APPROVED,
                reviewer.getUserId(), comment));
        return saved;
    }

    /**
     * The submission handle: ACTIVE + VERIFIED from birth, because it only exists
     * once a reviewer has approved the registration behind it.
     */
    private SourceAccount openAccount(SourceRegistration reg, ProblemSource source) {
        SourceAccount account = new SourceAccount();
        account.setSourceAccountId(UUID.randomUUID());
        account.setOwnerUserId(reg.getSubmittedByUserId());
        account.setSourceId(source.getSourceId());
        account.setRegistrationId(reg.getRegistrationId());
        account.setSourceBucket(reg.getSourceBucket());
        account.setSourceType(reg.getSourceType());
        account.setDisplayName(source.getOrganizationName() != null
                ? source.getOrganizationName()
                : source.getContactPersonName());
        account.setStatus(SourceAccountStatus.ACTIVE);
        account.setVerificationStatus(AccountVerificationStatus.VERIFIED);
        account.setActivatedAt(Instant.now());
        return account;
    }

    @Transactional
    public SourceRegistration reject(UUID registrationId, User reviewer, String reason) {
        if (reason == null || reason.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Rejection reason is required");
        }
        SourceRegistration reg = load(registrationId);
        requireDecidable(reg, "rejected");

        RegistrationStatus from = reg.getStatus();
        reg.setStatus(RegistrationStatus.REJECTED);
        reg.setRejectionReason(reason);
        reg.setReviewedAt(Instant.now());
        SourceRegistration saved = registrationRepository.save(reg);

        historyRepository.save(entry(saved, from, RegistrationStatus.REJECTED,
                reviewer.getUserId(), reason));
        return saved;
    }

    /** ACTION_REQUIRED: sends the registration back to the owner for fixes. */
    @Transactional
    public SourceRegistration requestAction(UUID registrationId, User reviewer, String comment) {
        if (comment == null || comment.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "A comment describing the required action is mandatory");
        }
        SourceRegistration reg = load(registrationId);
        requireDecidable(reg, "sent back for action");

        RegistrationStatus from = reg.getStatus();
        reg.setStatus(RegistrationStatus.ACTION_REQUIRED);
        reg.setActionRequiredComment(comment);
        SourceRegistration saved = registrationRepository.save(reg);

        historyRepository.save(entry(saved, from, RegistrationStatus.ACTION_REQUIRED,
                reviewer.getUserId(), comment));
        return saved;
    }

    /** SUBMITTED (queue) and UNDER_REVIEW (assigned) are both decidable. */
    private void requireDecidable(SourceRegistration reg, String decision) {
        if (reg.getStatus() != RegistrationStatus.SUBMITTED
                && reg.getStatus() != RegistrationStatus.UNDER_REVIEW) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Registration in status " + reg.getStatus() + " cannot be " + decision
                            + " (must be SUBMITTED or UNDER_REVIEW)");
        }
    }

    private SourceRegistration load(UUID registrationId) {
        return registrationRepository.findById(registrationId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Registration not found"));
    }

    private RegistrationStatusHistory entry(SourceRegistration reg, RegistrationStatus from,
                                            RegistrationStatus to, UUID actor, String comment) {
        RegistrationStatusHistory h = new RegistrationStatusHistory();
        h.setRegistrationId(reg.getRegistrationId());
        h.setFromStatus(from);
        h.setToStatus(to);
        h.setChangedByUserId(actor);
        h.setComment(comment);
        return h;
    }
}
