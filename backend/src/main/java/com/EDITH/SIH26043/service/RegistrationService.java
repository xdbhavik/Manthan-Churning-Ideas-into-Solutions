package com.EDITH.SIH26043.service;

import com.EDITH.SIH26043.entity.RegistrationStatusHistory;
import com.EDITH.SIH26043.entity.SourceRegistration;
import com.EDITH.SIH26043.entity.User;
import com.EDITH.SIH26043.enums.KycStatus;
import com.EDITH.SIH26043.enums.RegistrationStatus;
import com.EDITH.SIH26043.enums.SubEntityType;
import com.EDITH.SIH26043.enums.UserRole;
import com.EDITH.SIH26043.exception.ApiException;
import com.EDITH.SIH26043.repository.RegistrationStatusHistoryRepository;
import com.EDITH.SIH26043.repository.SourceRegistrationRepository;
import com.EDITH.SIH26043.repository.UserRepository;
import com.EDITH.SIH26043.security.AuthUser;
import com.EDITH.SIH26043.web.dto.RegistrationCreateRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Source-side registration workflow: create/update drafts, submit for review,
 * resubmit after ACTION_REQUIRED, and read own registrations + status history.
 */
@Service
public class RegistrationService {

    private final SourceRegistrationRepository registrationRepository;
    private final RegistrationStatusHistoryRepository historyRepository;
    private final SourceTypeCatalog catalog;
    private final UserRepository userRepository;
    private final OtpService otpService;

    public RegistrationService(SourceRegistrationRepository registrationRepository,
                               RegistrationStatusHistoryRepository historyRepository,
                               SourceTypeCatalog catalog,
                               UserRepository userRepository,
                               OtpService otpService) {
        this.registrationRepository = registrationRepository;
        this.historyRepository = historyRepository;
        this.catalog = catalog;
        this.userRepository = userRepository;
        this.otpService = otpService;
    }

    /**
     * Public registration: creates the user account if needed, then creates
     * the registration and sends an OTP so the user can verify and login.
     */
    @Transactional
    public SourceRegistration create(RegistrationCreateRequest req) {
        User user = userRepository.findByPhone(req.account().phone())
                .orElseGet(() -> createUser(req.account()));

        Map<String, Object> payload = new HashMap<>(req.source());
        if (req.documents() != null && !req.documents().isEmpty()) {
            payload.put("documents", req.documents());
        }

        SourceRegistration reg = new SourceRegistration();
        reg.setSourceType(req.sourceType());
        reg.setSourceBucket(catalog.bucketOf(req.sourceType()));
        reg.setSourcePayload(payload);
        reg.setSubmittedByUserId(user.getUserId());
        reg.setStatus(RegistrationStatus.DRAFT);
        SourceRegistration saved = registrationRepository.save(reg);

        historyRepository.save(entry(saved, null, RegistrationStatus.DRAFT,
                user.getUserId(), "Draft created"));

        otpService.issue(req.account().phone());

        return saved;
    }

    private User createUser(RegistrationCreateRequest.AccountPayload account) {
        User user = new User();
        user.setUserId(UUID.randomUUID());
        user.setPhone(account.phone());
        user.setEmail(account.email());
        user.setRole(UserRole.SUBMITTER);
        user.setKycStatus(KycStatus.UNVERIFIED);
        user.setCreatedAt(Instant.now());
        return userRepository.save(user);
    }

    @Transactional
    public SourceRegistration update(UUID registrationId, Map<String, Object> payload, AuthUser owner) {
        SourceRegistration reg = owned(registrationId, owner);
        if (reg.getStatus() != RegistrationStatus.DRAFT
                && reg.getStatus() != RegistrationStatus.ACTION_REQUIRED) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Registration is " + reg.getStatus() + "; only DRAFT or ACTION_REQUIRED can be edited");
        }
        reg.setSourcePayload(payload == null ? new HashMap<>() : new HashMap<>(payload));
        return registrationRepository.save(reg);
    }

    /**
     * DRAFT -> SUBMITTED (first submission) or ACTION_REQUIRED -> UNDER_REVIEW
     * (resubmission after fixing what the reviewer flagged).
     */
    @Transactional
    public SourceRegistration submit(UUID registrationId, AuthUser owner) {
        SourceRegistration reg = owned(registrationId, owner);
        RegistrationStatus from = reg.getStatus();

        switch (from) {
            case DRAFT -> {
                catalog.validatePayload(reg.getSourceType(), reg.getSourcePayload());
                reg.setStatus(RegistrationStatus.SUBMITTED);
                reg.setSubmittedAt(Instant.now());
            }
            case ACTION_REQUIRED -> {
                catalog.validatePayload(reg.getSourceType(), reg.getSourcePayload());
                reg.setStatus(RegistrationStatus.UNDER_REVIEW);
                reg.setActionRequiredComment(null);
            }
            default -> throw new ApiException(HttpStatus.CONFLICT,
                    "Cannot submit a registration in status " + from);
        }

        SourceRegistration saved = registrationRepository.save(reg);
        historyRepository.save(entry(saved, from, saved.getStatus(), owner.getUserId(), null));
        return saved;
    }

    @Transactional(readOnly = true)
    public List<SourceRegistration> mine(AuthUser owner) {
        return registrationRepository.findBySubmittedByUserIdOrderByCreatedAtDesc(owner.getUserId());
    }

    @Transactional(readOnly = true)
    public SourceRegistration get(UUID registrationId, AuthUser viewer) {
        SourceRegistration reg = load(registrationId);
        requireVisibleTo(reg, viewer);
        return reg;
    }

    @Transactional(readOnly = true)
    public List<RegistrationStatusHistory> history(UUID registrationId, AuthUser viewer) {
        SourceRegistration reg = load(registrationId);
        requireVisibleTo(reg, viewer);
        return historyRepository.findByRegistrationIdOrderByChangedAtAsc(registrationId);
    }

    /** Public status lookup: no auth required. */
    @Transactional(readOnly = true)
    public SourceRegistration getStatus(UUID registrationId) {
        return load(registrationId);
    }

    /** Owner sees own rows; REVIEWER/ADMIN see everything (reviewer queue). */
    private void requireVisibleTo(SourceRegistration reg, AuthUser viewer) {
        boolean staff = viewer.getRole() == UserRole.REVIEWER || viewer.getRole() == UserRole.ADMIN;
        if (!staff && !reg.getSubmittedByUserId().equals(viewer.getUserId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Not your registration");
        }
    }

    private SourceRegistration owned(UUID registrationId, AuthUser owner) {
        SourceRegistration reg = load(registrationId);
        if (!reg.getSubmittedByUserId().equals(owner.getUserId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Not your registration");
        }
        return reg;
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
