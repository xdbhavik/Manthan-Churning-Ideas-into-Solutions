package com.EDITH.SIH26043.service;

import com.EDITH.SIH26043.client.SourceAccountGateway;
import com.EDITH.SIH26043.entity.Domain;
import com.EDITH.SIH26043.entity.Problem;
import com.EDITH.SIH26043.entity.ProblemDomain;
import com.EDITH.SIH26043.enums.KycStatus;
import com.EDITH.SIH26043.enums.ProblemAccessRule;
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

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
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

        assertThatThrownBy(() -> engine.receiveSubmission(request(missing), me, "127.0.0.1", null))
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
                request(other.sourceAccountId()), me, "127.0.0.1", null))
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
                request(pending.sourceAccountId()), me, "127.0.0.1", null))
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
                request(suspended.sourceAccountId()), me, "127.0.0.1", null))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("SOURCE_NOT_VERIFIED");

        verifyNoInteractions(problemRepository);
    }

    @Test
    void verifiedAccountSuppliesBucketAndTypeAndSource() {
        AuthUser me = user();
        SourceAccountResponse active = account(me.getUserId(), "ACTIVE", "VERIFIED");
        when(sourceAccountGateway.fetch(active.sourceAccountId())).thenReturn(active);

        engine.receiveSubmission(request(active.sourceAccountId()), me, "127.0.0.1", null);

        ArgumentCaptor<Problem> saved = ArgumentCaptor.forClass(Problem.class);
        verify(problemRepository).save(saved.capture());
        Problem p = saved.getValue();
        assertThat(p.getSourceBucket()).isEqualTo(SourceBucket.GOVT);
        assertThat(p.getSubEntityType()).isEqualTo(SubEntityType.DEPARTMENT);
        assertThat(p.getSourceId()).isEqualTo(active.sourceId());
        assertThat(p.getSourceAccountId()).isEqualTo(active.sourceAccountId());
        assertThat(p.getSubmittedByUserId()).isEqualTo(me.getUserId());
    }

    /** Absent access rule defaults to OPEN_TO_ALL (old clients keep working). */
    @Test
    void accessRuleDefaultsToOpenToAll() {
        AuthUser me = user();
        SourceAccountResponse active = account(me.getUserId(), "ACTIVE", "VERIFIED");
        when(sourceAccountGateway.fetch(active.sourceAccountId())).thenReturn(active);

        engine.receiveSubmission(request(active.sourceAccountId()), me, "127.0.0.1", null);

        ArgumentCaptor<Problem> saved = ArgumentCaptor.forClass(Problem.class);
        verify(problemRepository).save(saved.capture());
        assertThat(saved.getValue().getAccessRule()).isEqualTo(ProblemAccessRule.OPEN_TO_ALL);
        assertThat(saved.getValue().getAccessUniversities()).isEmpty();
    }

    /** SELECTED_UNIVERSITIES persists the trimmed, de-duplicated name snapshot. */
    @Test
    void selectedUniversitiesPersistsNameSnapshot() {
        AuthUser me = user();
        SourceAccountResponse active = account(me.getUserId(), "ACTIVE", "VERIFIED");
        when(sourceAccountGateway.fetch(active.sourceAccountId())).thenReturn(active);

        engine.receiveSubmission(request(active.sourceAccountId(), ProblemAccessRule.SELECTED_UNIVERSITIES,
                List.of("IIT Bombay", "  IIT Delhi ", "IIT Bombay")), me, "127.0.0.1", null);

        ArgumentCaptor<Problem> saved = ArgumentCaptor.forClass(Problem.class);
        verify(problemRepository).save(saved.capture());
        Problem p = saved.getValue();
        assertThat(p.getAccessRule()).isEqualTo(ProblemAccessRule.SELECTED_UNIVERSITIES);
        assertThat(p.getAccessUniversities()).containsExactly("IIT Bombay", "IIT Delhi");
    }

    /** A SELECTED_UNIVERSITIES rule without any usable name is a 400. */
    @Test
    void selectedUniversitiesRequiresNames() {
        AuthUser me = user();
        SourceAccountResponse active = account(me.getUserId(), "ACTIVE", "VERIFIED");
        when(sourceAccountGateway.fetch(active.sourceAccountId())).thenReturn(active);

        assertThatThrownBy(() -> engine.receiveSubmission(
                request(active.sourceAccountId(), ProblemAccessRule.SELECTED_UNIVERSITIES,
                        java.util.Arrays.asList("  ", null)), me, "127.0.0.1", null))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("SELECTED_UNIVERSITIES requires a non-empty")
                .extracting(ex -> ((ApiException) ex).getStatus())
                .isEqualTo(HttpStatus.BAD_REQUEST);

        verifyNoInteractions(problemRepository);
    }

    /**
     * AUTO_SELECTED_UNIVERSITIES stores the names the server resolved — the same
     * snapshot shape SELECTED_UNIVERSITIES uses, so every downstream consumer reads
     * the audience the same way. Whatever the client put in the body is ignored.
     */
    @Test
    void autoSelectedUniversitiesPersistTheResolvedSnapshot() {
        AuthUser me = user();
        SourceAccountResponse active = account(me.getUserId(), "ACTIVE", "VERIFIED");
        when(sourceAccountGateway.fetch(active.sourceAccountId())).thenReturn(active);

        engine.receiveSubmission(request(active.sourceAccountId(),
                        ProblemAccessRule.AUTO_SELECTED_UNIVERSITIES, List.of("Smuggled University")),
                me, "127.0.0.1", List.of("IIT Delhi", "IIT Madras"));

        ArgumentCaptor<Problem> saved = ArgumentCaptor.forClass(Problem.class);
        verify(problemRepository).save(saved.capture());
        Problem p = saved.getValue();
        assertThat(p.getAccessRule()).isEqualTo(ProblemAccessRule.AUTO_SELECTED_UNIVERSITIES);
        assertThat(p.getAccessUniversities()).containsExactly("IIT Delhi", "IIT Madras");
    }

    /** Defensive: the resolver must supply the audience, and an empty one is a 400. */
    @Test
    void autoSelectedUniversitiesWithoutResolvedNamesIsA400() {
        AuthUser me = user();
        SourceAccountResponse active = account(me.getUserId(), "ACTIVE", "VERIFIED");
        when(sourceAccountGateway.fetch(active.sourceAccountId())).thenReturn(active);

        assertThatThrownBy(() -> engine.receiveSubmission(
                request(active.sourceAccountId(), ProblemAccessRule.AUTO_SELECTED_UNIVERSITIES,
                        List.of("Smuggled University")), me, "127.0.0.1", null))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("AUTO_SELECTED_UNIVERSITIES requires the audience")
                .extracting(ex -> ((ApiException) ex).getStatus())
                .isEqualTo(HttpStatus.BAD_REQUEST);

        verifyNoInteractions(problemRepository);
    }

    /** An unknown domain fails before the location is even built. */
    @Test
    void anUnknownDomainIsRejectedBeforeAnythingIsWritten() {
        AuthUser me = user();
        SourceAccountResponse active = account(me.getUserId(), "ACTIVE", "VERIFIED");
        when(sourceAccountGateway.fetch(active.sourceAccountId())).thenReturn(active);
        when(domainRepository.findAllById(any())).thenReturn(List.of());

        assertThatThrownBy(() -> engine.receiveSubmission(
                requestWithDomains(active.sourceAccountId(), List.of(UUID.randomUUID())),
                me, "127.0.0.1", null))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("Unknown domain")
                .extracting(ex -> ((ApiException) ex).getStatus())
                .isEqualTo(HttpStatus.BAD_REQUEST);

        verifyNoInteractions(locationRepository, problemRepository);
    }

    /** Repeats would collide on the problem_domain primary key. */
    @Test
    void aRepeatedDomainIsStoredOnce() {
        AuthUser me = user();
        SourceAccountResponse active = account(me.getUserId(), "ACTIVE", "VERIFIED");
        when(sourceAccountGateway.fetch(active.sourceAccountId())).thenReturn(active);
        UUID domainId = UUID.randomUUID();
        when(domainRepository.findAllById(any())).thenReturn(List.of(domain(domainId)));

        engine.receiveSubmission(
                requestWithDomains(active.sourceAccountId(), List.of(domainId, domainId)),
                me, "127.0.0.1", null);

        ArgumentCaptor<ProblemDomain> saved = ArgumentCaptor.forClass(ProblemDomain.class);
        verify(problemDomainRepository, times(1)).save(saved.capture());
        assertThat(saved.getValue().getId().getDomainId()).isEqualTo(domainId);
        assertThat(saved.getValue().isPrimary()).isTrue();
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
        return request(sourceAccountId, null, null);
    }

    private ProblemSubmitRequest request(UUID sourceAccountId, ProblemAccessRule accessRule,
                                         List<String> accessUniversities) {
        return new ProblemSubmitRequest(
                "Borewell dry for three weeks",
                "Ward 7 has had no piped supply since the borewell failed.",
                Urgency.IMMEDIATE, null, null, null, null,
                sourceAccountId,
                new ProblemSubmitRequest.LocationRequest("Rajasthan", "Jaipur", null, null,
                        "302001", 26.9124, 75.7873, null, null),
                null, null,
                accessRule, accessUniversities);
    }

    private ProblemSubmitRequest requestWithDomains(UUID sourceAccountId, List<UUID> domainIds) {
        return new ProblemSubmitRequest(
                "Borewell dry for three weeks",
                "Ward 7 has had no piped supply since the borewell failed.",
                Urgency.IMMEDIATE, null, null, null, null,
                sourceAccountId,
                new ProblemSubmitRequest.LocationRequest("Rajasthan", "Jaipur", null, null,
                        "302001", 26.9124, 75.7873, null, null),
                domainIds, null, null, null);
    }

    private static Domain domain(UUID domainId) {
        Domain d = new Domain();
        d.setDomainId(domainId);
        d.setDomainName("Seeded domain");
        return d;
    }
}
