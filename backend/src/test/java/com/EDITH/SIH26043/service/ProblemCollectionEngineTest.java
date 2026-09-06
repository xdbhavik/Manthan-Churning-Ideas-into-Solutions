package com.EDITH.SIH26043.service;

import com.EDITH.SIH26043.entity.Problem;
import com.EDITH.SIH26043.entity.SourceAccount;
import com.EDITH.SIH26043.enums.AccountVerificationStatus;
import com.EDITH.SIH26043.enums.KycStatus;
import com.EDITH.SIH26043.enums.SourceAccountStatus;
import com.EDITH.SIH26043.enums.SourceBucket;
import com.EDITH.SIH26043.enums.SubEntityType;
import com.EDITH.SIH26043.enums.Urgency;
import com.EDITH.SIH26043.enums.UserRole;
import com.EDITH.SIH26043.exception.ApiException;
import com.EDITH.SIH26043.repository.DomainRepository;
import com.EDITH.SIH26043.repository.EvidenceRepository;
import com.EDITH.SIH26043.repository.LocationRepository;
import com.EDITH.SIH26043.repository.ProblemDomainRepository;
import com.EDITH.SIH26043.repository.ProblemRepository;
import com.EDITH.SIH26043.repository.SourceAccountRepository;
import com.EDITH.SIH26043.security.AuthUser;
import com.EDITH.SIH26043.web.dto.ProblemSubmitRequest;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * The source-verification gate on POST /problems: a problem may only be filed
 * through an ACTIVE + VERIFIED account the caller owns, and its bucket and
 * sub-entity type come from that account rather than from the request body.
 */
class ProblemCollectionEngineTest {

    private final ProblemRepository problemRepository = mock(ProblemRepository.class);
    private final SourceAccountRepository sourceAccountRepository = mock(SourceAccountRepository.class);
    private final LocationRepository locationRepository = mock(LocationRepository.class);
    private final ProblemDomainRepository problemDomainRepository = mock(ProblemDomainRepository.class);
    private final DomainRepository domainRepository = mock(DomainRepository.class);
    private final EvidenceRepository evidenceRepository = mock(EvidenceRepository.class);
    private final AuditService auditService = mock(AuditService.class);

    private final ProblemCollectionEngine engine = new ProblemCollectionEngine(
            problemRepository, sourceAccountRepository, locationRepository,
            problemDomainRepository, domainRepository, evidenceRepository, auditService);

    @Test
    void unknownAccountIsNotFound() {
        AuthUser me = user();
        UUID missing = UUID.randomUUID();
        when(sourceAccountRepository.findById(missing)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> engine.receiveSubmission(request(missing), me, "127.0.0.1"))
                .isInstanceOf(ApiException.class)
                .extracting(ex -> ((ApiException) ex).getStatus())
                .isEqualTo(HttpStatus.NOT_FOUND);

        verifyNoInteractions(problemRepository);
    }

    @Test
    void anotherUsersAccountIsForbidden() {
        AuthUser me = user();
        SourceAccount other = account(UUID.randomUUID(),
                SourceAccountStatus.ACTIVE, AccountVerificationStatus.VERIFIED);
        when(sourceAccountRepository.findById(other.getSourceAccountId())).thenReturn(Optional.of(other));

        assertThatThrownBy(() -> engine.receiveSubmission(
                request(other.getSourceAccountId()), me, "127.0.0.1"))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("SOURCE_NOT_OWNED");

        verifyNoInteractions(problemRepository);
    }

    @Test
    void unverifiedAccountCannotSubmit() {
        AuthUser me = user();
        SourceAccount pending = account(me.getUserId(),
                SourceAccountStatus.PENDING, AccountVerificationStatus.UNVERIFIED);
        when(sourceAccountRepository.findById(pending.getSourceAccountId())).thenReturn(Optional.of(pending));

        assertThatThrownBy(() -> engine.receiveSubmission(
                request(pending.getSourceAccountId()), me, "127.0.0.1"))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("SOURCE_NOT_VERIFIED")
                .extracting(ex -> ((ApiException) ex).getStatus())
                .isEqualTo(HttpStatus.FORBIDDEN);

        verifyNoInteractions(problemRepository);
    }

    /** Verification alone is not enough; a suspended account is still barred. */
    @Test
    void suspendedAccountCannotSubmit() {
        AuthUser me = user();
        SourceAccount suspended = account(me.getUserId(),
                SourceAccountStatus.SUSPENDED, AccountVerificationStatus.VERIFIED);
        when(sourceAccountRepository.findById(suspended.getSourceAccountId())).thenReturn(Optional.of(suspended));

        assertThatThrownBy(() -> engine.receiveSubmission(
                request(suspended.getSourceAccountId()), me, "127.0.0.1"))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("SOURCE_NOT_VERIFIED");

        verifyNoInteractions(problemRepository);
    }

    @Test
    void verifiedAccountSuppliesBucketAndTypeAndSource() {
        AuthUser me = user();
        SourceAccount active = account(me.getUserId(),
                SourceAccountStatus.ACTIVE, AccountVerificationStatus.VERIFIED);
        when(sourceAccountRepository.findById(active.getSourceAccountId())).thenReturn(Optional.of(active));

        engine.receiveSubmission(request(active.getSourceAccountId()), me, "127.0.0.1");

        ArgumentCaptor<Problem> saved = ArgumentCaptor.forClass(Problem.class);
        verify(problemRepository).save(saved.capture());
        Problem p = saved.getValue();
        assertThat(p.getSourceBucket()).isEqualTo(SourceBucket.GOVT);
        assertThat(p.getSubEntityType()).isEqualTo(SubEntityType.DEPARTMENT);
        assertThat(p.getSourceId()).isEqualTo(active.getSourceId());
        assertThat(p.getSourceAccountId()).isEqualTo(active.getSourceAccountId());
        assertThat(p.getSubmittedByUserId()).isEqualTo(me.getUserId());
    }

    private AuthUser user() {
        return new AuthUser(UUID.randomUUID(), "9999999999",
                UserRole.SUBMITTER, KycStatus.UNVERIFIED);
    }

    private SourceAccount account(UUID ownerUserId, SourceAccountStatus status,
                                 AccountVerificationStatus verification) {
        SourceAccount a = new SourceAccount();
        a.setSourceAccountId(UUID.randomUUID());
        a.setOwnerUserId(ownerUserId);
        a.setSourceId(UUID.randomUUID());
        a.setSourceBucket(SourceBucket.GOVT);
        a.setSourceType(SubEntityType.DEPARTMENT);
        a.setStatus(status);
        a.setVerificationStatus(verification);
        return a;
    }

    private ProblemSubmitRequest request(UUID sourceAccountId) {
        return new ProblemSubmitRequest(
                "Borewell dry for three weeks",
                "Ward 7 has had no piped supply since the borewell failed.",
                Urgency.IMMEDIATE, null, null, null, null,
                sourceAccountId,
                new ProblemSubmitRequest.LocationRequest("Rajasthan", "Jaipur", null, null,
                        "302001", 26.9124, 75.7873, null, null),
                null, null);
    }
}
