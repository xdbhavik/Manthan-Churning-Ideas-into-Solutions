package com.EDITH.SIH26043.service;

import com.EDITH.SIH26043.client.SourceAccountGateway;
import com.EDITH.SIH26043.entity.Problem;
import com.EDITH.SIH26043.enums.KycStatus;
import com.EDITH.SIH26043.enums.SourceBucket;
import com.EDITH.SIH26043.enums.SubEntityType;
import com.EDITH.SIH26043.enums.Urgency;
import com.EDITH.SIH26043.enums.UserRole;
import com.EDITH.SIH26043.exception.ApiException;
import com.EDITH.SIH26043.internal.SourceAccountResponse;
import com.EDITH.SIH26043.repository.DomainRepository;
import com.EDITH.SIH26043.repository.EvidenceRepository;
import com.EDITH.SIH26043.repository.LocationRepository;
import com.EDITH.SIH26043.repository.ProblemDomainRepository;
import com.EDITH.SIH26043.repository.ProblemRepository;
import com.EDITH.SIH26043.security.AuthUser;
import com.EDITH.SIH26043.web.dto.ProblemSubmitRequest;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;

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
 *
 * <p>The account lives in source-service, so the gate is exercised through
 * {@link SourceAccountGateway} (an internal HTTP call) instead of a local
 * repository.</p>
 */
class ProblemCollectionEngineTest {

    private final ProblemRepository problemRepository = mock(ProblemRepository.class);
    private final SourceAccountGateway sourceAccountGateway = mock(SourceAccountGateway.class);
    private final LocationRepository locationRepository = mock(LocationRepository.class);
    private final ProblemDomainRepository problemDomainRepository = mock(ProblemDomainRepository.class);
    private final DomainRepository domainRepository = mock(DomainRepository.class);
    private final EvidenceRepository evidenceRepository = mock(EvidenceRepository.class);
    private final AuditService auditService = mock(AuditService.class);

    private final ProblemCollectionEngine engine = new ProblemCollectionEngine(
            problemRepository, sourceAccountGateway, locationRepository,
            problemDomainRepository, domainRepository, evidenceRepository, auditService);

    @Test
    void unknownAccountIsNotFound() {
        AuthUser me = user();
        UUID missing = UUID.randomUUID();
        when(sourceAccountGateway.fetch(missing)).thenThrow(new ApiException(HttpStatus.NOT_FOUND,
                "Source account not found"));

        assertThatThrownBy(() -> engine.receiveSubmission(request(missing), me, "127.0.0.1"))
                .isInstanceOf(ApiException.class)
                .extracting(ex -> ((ApiException) ex).getStatus())
                .isEqualTo(HttpStatus.NOT_FOUND);

        verifyNoInteractions(problemRepository);
    }

    @Test
    void anotherUsersAccountIsForbidden() {
        AuthUser me = user();
        SourceAccountResponse other = account(UUID.randomUUID(), "ACTIVE", "VERIFIED");
        when(sourceAccountGateway.fetch(other.sourceAccountId())).thenReturn(other);

        assertThatThrownBy(() -> engine.receiveSubmission(
                request(other.sourceAccountId()), me, "127.0.0.1"))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("SOURCE_NOT_OWNED");

        verifyNoInteractions(problemRepository);
    }

    @Test
    void unverifiedAccountCannotSubmit() {
        AuthUser me = user();
        SourceAccountResponse pending = account(me.getUserId(), "PENDING", "UNVERIFIED");
        when(sourceAccountGateway.fetch(pending.sourceAccountId())).thenReturn(pending);

        assertThatThrownBy(() -> engine.receiveSubmission(
                request(pending.sourceAccountId()), me, "127.0.0.1"))
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
        SourceAccountResponse suspended = account(me.getUserId(), "SUSPENDED", "VERIFIED");
        when(sourceAccountGateway.fetch(suspended.sourceAccountId())).thenReturn(suspended);

        assertThatThrownBy(() -> engine.receiveSubmission(
                request(suspended.sourceAccountId()), me, "127.0.0.1"))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("SOURCE_NOT_VERIFIED");

        verifyNoInteractions(problemRepository);
    }

    @Test
    void verifiedAccountSuppliesBucketAndTypeAndSource() {
        AuthUser me = user();
        SourceAccountResponse active = account(me.getUserId(), "ACTIVE", "VERIFIED");
        when(sourceAccountGateway.fetch(active.sourceAccountId())).thenReturn(active);

        engine.receiveSubmission(request(active.sourceAccountId()), me, "127.0.0.1");

        ArgumentCaptor<Problem> saved = ArgumentCaptor.forClass(Problem.class);
        verify(problemRepository).save(saved.capture());
        Problem p = saved.getValue();
        assertThat(p.getSourceBucket()).isEqualTo(SourceBucket.GOVT);
        assertThat(p.getSubEntityType()).isEqualTo(SubEntityType.DEPARTMENT);
        assertThat(p.getSourceId()).isEqualTo(active.sourceId());
        assertThat(p.getSourceAccountId()).isEqualTo(active.sourceAccountId());
        assertThat(p.getSubmittedByUserId()).isEqualTo(me.getUserId());
    }

    private AuthUser user() {
        return new AuthUser(UUID.randomUUID(), "9999999999",
                UserRole.SUBMITTER, KycStatus.UNVERIFIED);
    }

    private SourceAccountResponse account(UUID ownerUserId, String status, String verification) {
        boolean canSubmit = "ACTIVE".equals(status) && "VERIFIED".equals(verification);
        return new SourceAccountResponse(
                UUID.randomUUID(), ownerUserId, UUID.randomUUID(),
                status, verification, "GOVT", "DEPARTMENT", "Dept of Water", canSubmit);
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
