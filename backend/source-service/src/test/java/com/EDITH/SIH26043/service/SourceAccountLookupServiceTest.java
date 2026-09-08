package com.EDITH.SIH26043.service;

import com.EDITH.SIH26043.entity.HEISource;
import com.EDITH.SIH26043.entity.ProblemSource;
import com.EDITH.SIH26043.entity.SourceAccount;
import com.EDITH.SIH26043.enums.AccountVerificationStatus;
import com.EDITH.SIH26043.enums.SourceAccountStatus;
import com.EDITH.SIH26043.enums.SourceBucket;
import com.EDITH.SIH26043.internal.SourceAccountDetail;
import com.EDITH.SIH26043.repository.ProblemSourceRepository;
import com.EDITH.SIH26043.repository.SourceAccountRepository;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * The internal source-account snapshot consumed by portal-service. Its one
 * portal-critical job is enriching HEI accounts with the institution name so a
 * caller who owns a University/Research-Lab source can be auto-bound as a
 * UNIVERSITY participant (and matched against SELECTED_UNIVERSITIES problems).
 */
class SourceAccountLookupServiceTest {

    private final SourceAccountRepository sourceAccountRepository = mock(SourceAccountRepository.class);
    private final ProblemSourceRepository problemSourceRepository = mock(ProblemSourceRepository.class);

    private final SourceAccountLookupService service = new SourceAccountLookupService(
            sourceAccountRepository, problemSourceRepository);

    private final UUID ownerUserId = UUID.randomUUID();

    @Test
    void listByOwner_CopiesTheInstitutionNameOnlyForHeiAccounts() {
        UUID heiSourceId = UUID.randomUUID();
        UUID govtSourceId = UUID.randomUUID();
        SourceAccount hei = account(UUID.randomUUID(), heiSourceId, SourceBucket.HEI,
                SourceAccountStatus.ACTIVE, AccountVerificationStatus.VERIFIED);
        SourceAccount govt = account(UUID.randomUUID(), govtSourceId, SourceBucket.GOVT,
                SourceAccountStatus.ACTIVE, AccountVerificationStatus.VERIFIED);
        when(sourceAccountRepository.findByOwnerUserIdOrderByCreatedAtDesc(ownerUserId))
                .thenReturn(List.of(hei, govt));

        HEISource heiSource = new HEISource();
        heiSource.setSourceId(heiSourceId);
        heiSource.setInstitutionName("IIT Madras");
        ProblemSource govtSource = new ProblemSource();
        govtSource.setSourceId(govtSourceId);
        when(problemSourceRepository.findById(heiSourceId)).thenReturn(Optional.of(heiSource));
        when(problemSourceRepository.findById(govtSourceId)).thenReturn(Optional.of(govtSource));

        List<SourceAccountDetail> details = service.listByOwner(ownerUserId);

        assertThat(details).hasSize(2);
        assertThat(details.getFirst().institutionName()).isEqualTo("IIT Madras");
        assertThat(details.getFirst().sourceBucket()).isEqualTo("HEI");
        assertThat(details.getFirst().canSubmit()).isTrue();
        assertThat(details.get(1).institutionName()).isNull();
        assertThat(details.get(1).sourceBucket()).isEqualTo("GOVT");
    }

    @Test
    void listByOwner_SurvivesAMissingMaterializedSourceRow() {
        SourceAccount orphan = account(UUID.randomUUID(), UUID.randomUUID(), SourceBucket.HEI,
                SourceAccountStatus.ACTIVE, AccountVerificationStatus.VERIFIED);
        when(sourceAccountRepository.findByOwnerUserIdOrderByCreatedAtDesc(ownerUserId))
                .thenReturn(List.of(orphan));
        when(problemSourceRepository.findById(orphan.getSourceId())).thenReturn(Optional.empty());

        List<SourceAccountDetail> details = service.listByOwner(ownerUserId);

        assertThat(details).hasSize(1);
        assertThat(details.getFirst().institutionName()).isNull();
        assertThat(details.getFirst().canSubmit()).isTrue();
    }

    @Test
    void listByOwner_ReflectsTheAccountsSubmitReadiness() {
        SourceAccount pending = account(UUID.randomUUID(), UUID.randomUUID(), SourceBucket.HEI,
                SourceAccountStatus.PENDING, AccountVerificationStatus.UNVERIFIED);
        when(sourceAccountRepository.findByOwnerUserIdOrderByCreatedAtDesc(ownerUserId))
                .thenReturn(List.of(pending));

        List<SourceAccountDetail> details = service.listByOwner(ownerUserId);

        assertThat(details.getFirst().canSubmit()).isFalse();
    }

    @Test
    void listByOwner_ReturnsAnEmptyListForAUserWithNoAccounts() {
        when(sourceAccountRepository.findByOwnerUserIdOrderByCreatedAtDesc(ownerUserId))
                .thenReturn(List.of());

        assertThat(service.listByOwner(ownerUserId)).isEmpty();
    }

    // ------------------------------------------------------------------ fixtures

    private SourceAccount account(UUID accountId, UUID sourceId, SourceBucket bucket,
                                  SourceAccountStatus status,
                                  AccountVerificationStatus verification) {
        SourceAccount account = new SourceAccount();
        account.setSourceAccountId(accountId);
        account.setOwnerUserId(ownerUserId);
        account.setSourceId(sourceId);
        account.setSourceBucket(bucket);
        account.setDisplayName("Materialized source");
        account.setStatus(status);
        account.setVerificationStatus(verification);
        return account;
    }
}
