package com.EDITH.SIH26043.service;

import com.EDITH.SIH26043.entity.RegistrationStatusHistory;
import com.EDITH.SIH26043.entity.SourceRegistration;
import com.EDITH.SIH26043.entity.User;
import com.EDITH.SIH26043.enums.RegistrationStatus;
import com.EDITH.SIH26043.enums.SubEntityType;
import com.EDITH.SIH26043.enums.UserRole;
import com.EDITH.SIH26043.exception.ApiException;
import com.EDITH.SIH26043.repository.RegistrationStatusHistoryRepository;
import com.EDITH.SIH26043.repository.SourceRegistrationRepository;
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

    public RegistrationService(SourceRegistrationRepository registrationRepository,
                               RegistrationStatusHistoryRepository historyRepository,
                               SourceTypeCatalog catalog) {
        this.registrationRepository = registrationRepository;
        this.historyRepository = historyRepository;
        this.catalog = catalog;
    }

    @Transactional
    public SourceRegistration create(SubEntityType sourceType, Map<String, Object> payload, User owner) {
        SourceRegistration reg = new SourceRegistration();
        reg.setSourceType(sourceType);
        reg.setSourceBucket(catalog.bucketOf(sourceType));
        reg.setSourcePayload(payload == null ? new HashMap<>() : new HashMap<>(payload));
        reg.setSubmittedByUserId(owner.getUserId());
        reg.setStatus(RegistrationStatus.DRAFT);
        SourceRegistration saved = registrationRepository.save(reg);

        historyRepository.save(entry(saved, null, RegistrationStatus.DRAFT,
                owner.getUserId(), "Draft created"));
        return saved;
    }

    @Transactional
    public SourceRegistration update(UUID registrationId, Map<String, Object> payload, User owner) {
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
    public SourceRegistration submit(UUID registrationId, User owner) {
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
    public List<SourceRegistration> mine(User owner) {
        return registrationRepository.findBySubmittedByUserIdOrderByCreatedAtDesc(owner.getUserId());
    }

    @Transactional(readOnly = true)
    public SourceRegistration get(UUID registrationId, User viewer) {
        SourceRegistration reg = load(registrationId);
        requireVisibleTo(reg, viewer);
        return reg;
    }

    @Transactional(readOnly = true)
    public List<RegistrationStatusHistory> history(UUID registrationId, User viewer) {
        SourceRegistration reg = load(registrationId);
        requireVisibleTo(reg, viewer);
        return historyRepository.findByRegistrationIdOrderByChangedAtAsc(registrationId);
    }

    /** Owner sees own rows; REVIEWER/ADMIN see everything (reviewer queue). */
    private void requireVisibleTo(SourceRegistration reg, User viewer) {
        boolean staff = viewer.getRole() == UserRole.REVIEWER || viewer.getRole() == UserRole.ADMIN;
        if (!staff && !reg.getSubmittedByUserId().equals(viewer.getUserId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Not your registration");
        }
    }

    private SourceRegistration owned(UUID registrationId, User owner) {
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
