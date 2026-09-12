package com.EDITH.SIH26043.service;

import com.EDITH.SIH26043.entity.Domain;
import com.EDITH.SIH26043.entity.University;
import com.EDITH.SIH26043.entity.UniversityDomain;
import com.EDITH.SIH26043.entity.UniversityDomainId;
import com.EDITH.SIH26043.exception.ApiException;
import com.EDITH.SIH26043.repository.DomainRepository;
import com.EDITH.SIH26043.repository.UniversityDomainRepository;
import com.EDITH.SIH26043.repository.UniversityRepository;
import com.EDITH.SIH26043.service.analysis.OpenAiCompatibleDomainResolutionClient;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * The audience resolver behind {@code AUTO_SELECTED_UNIVERSITIES}: the model only
 * proposes domains, and the university match is a deterministic intersection.
 *
 * <p>The load-bearing property is that every failure is a 400. Nothing here may
 * quietly fall back to the submitter's own {@code domainIds} or to an empty
 * snapshot — either would change who can see the problem without anyone asking,
 * which is the one thing an access rule must never do.</p>
 */
class AutoUniversitySelectionServiceTest {

    private static final UUID HEALTHCARE = UUID.fromString("00000000-0000-4000-8000-000000000001");
    private static final UUID WATER = UUID.fromString("00000000-0000-4000-8000-000000000003");
    private static final UUID IIT_MADRAS = UUID.fromString("30000000-0000-4000-8000-000000000001");
    private static final UUID IIT_DELHI = UUID.fromString("30000000-0000-4000-8000-000000000002");
    private static final UUID DORMANT = UUID.fromString("30000000-0000-4000-8000-0000000000FF");

    private final DomainRepository domainRepository = mock(DomainRepository.class);
    private final UniversityDomainRepository universityDomainRepository =
            mock(UniversityDomainRepository.class);
    private final UniversityRepository universityRepository = mock(UniversityRepository.class);
    private final OpenAiCompatibleDomainResolutionClient domainResolutionClient =
            mock(OpenAiCompatibleDomainResolutionClient.class);

    private final AutoUniversitySelectionService service = new AutoUniversitySelectionService(
            domainRepository, universityDomainRepository, universityRepository,
            domainResolutionClient);

    // ------------------------------------------------------------------ the happy path

    @Test
    void theResolvedDomainsAreIntersectedWithTheCatalog() {
        taxonomy();
        modelSays(HEALTHCARE);
        universityDomainRepositoryReturns(link(IIT_MADRAS, HEALTHCARE));
        activeUniversities(IIT_MADRAS, "IIT Madras");

        assertThat(service.resolve("Hand pumps dry", "No drinking water.", null))
                .containsExactly("IIT Madras");
    }

    @Test
    void everyDomainTheModelNamedIsMatched() {
        taxonomy();
        modelSays(WATER, HEALTHCARE);
        universityDomainRepositoryReturns(
                link(IIT_MADRAS, WATER), link(IIT_DELHI, HEALTHCARE));
        activeUniversities(IIT_DELHI, "IIT Delhi", IIT_MADRAS, "IIT Madras");

        assertThat(service.resolve("t", "d", null))
                .containsExactly("IIT Delhi", "IIT Madras");
    }

    /** The snapshot is stored on the problem, so its order must not depend on row order. */
    @Test
    void theSnapshotIsSortedRegardlessOfRepositoryOrder() {
        taxonomy();
        modelSays(WATER, HEALTHCARE);
        universityDomainRepositoryReturns(
                link(IIT_DELHI, HEALTHCARE), link(IIT_MADRAS, WATER));
        activeUniversities(IIT_MADRAS, "IIT Madras", IIT_DELHI, "IIT Delhi");

        assertThat(service.resolve("t", "d", null))
                .containsExactly("IIT Delhi", "IIT Madras");
    }

    /**
     * A model that names one real domain and one invented id is still usable; the
     * invented id is dropped exactly as the scoring client drops a hallucinated
     * criterion.
     */
    @Test
    void anInventedIdIsDroppedAndTheKnownOneStillRoutes() {
        taxonomy();
        modelSays(UUID.randomUUID().toString(), HEALTHCARE.toString());
        universityDomainRepositoryReturns(link(IIT_MADRAS, HEALTHCARE));
        activeUniversities(IIT_MADRAS, "IIT Madras");

        assertThat(service.resolve("t", "d", null)).containsExactly("IIT Madras");
    }

    @Test
    void aNonUuidIdIsDroppedRatherThanFatal() {
        taxonomy();
        modelSays("healthcare", HEALTHCARE.toString());
        universityDomainRepositoryReturns(link(IIT_MADRAS, HEALTHCARE));
        activeUniversities(IIT_MADRAS, "IIT Madras");

        assertThat(service.resolve("t", "d", null)).containsExactly("IIT Madras");
    }

    @Test
    void aDomainNamedTwiceIsMatchedOnce() {
        taxonomy();
        modelSays(HEALTHCARE, HEALTHCARE);
        universityDomainRepositoryReturns(link(IIT_MADRAS, HEALTHCARE));
        activeUniversities(IIT_MADRAS, "IIT Madras");

        assertThat(service.resolve("t", "d", null)).containsExactly("IIT Madras");
        verify(universityDomainRepository).findByIdDomainIdIn(List.of(HEALTHCARE));
    }

    @Test
    void anInactiveUniversityIsNeverRoutedTo() {
        taxonomy();
        modelSays(HEALTHCARE);
        universityDomainRepositoryReturns(
                link(IIT_MADRAS, HEALTHCARE), link(DORMANT, HEALTHCARE));
        // The repository applies the active filter, so only one row comes back.
        activeUniversities(IIT_MADRAS, "IIT Madras");

        assertThat(service.resolve("t", "d", null)).containsExactly("IIT Madras");
    }

    // ------------------------------------------------------------------ the submitter's hint

    @Test
    void theSubmitterHintIsPassedToTheModelAsContext() {
        taxonomy();
        UUID hint = UUID.randomUUID();
        when(domainRepository.findAllById(any())).thenReturn(List.of(domain(hint, "Telemedicine")));
        modelSays(HEALTHCARE);
        universityDomainRepositoryReturns(link(IIT_MADRAS, HEALTHCARE));
        activeUniversities(IIT_MADRAS, "IIT Madras");

        service.resolve("t", "d", List.of(hint));

        verify(domainResolutionClient).resolve("t", "d", List.of("Telemedicine"), expectedOptions());
    }

    @Test
    void noSubmitterHintSendsAnEmptyList() {
        taxonomy();
        modelSays(HEALTHCARE);
        universityDomainRepositoryReturns(link(IIT_MADRAS, HEALTHCARE));
        activeUniversities(IIT_MADRAS, "IIT Madras");

        service.resolve("t", "d", List.of());

        verify(domainResolutionClient).resolve("t", "d", List.of(), expectedOptions());
    }

    // ------------------------------------------------------------------ fail closed

    @Test
    void anUnavailableModelIsA400() {
        taxonomy();
        when(domainResolutionClient.resolve(any(), any(), any(), any()))
                .thenReturn(Optional.empty());

        assertBadRequest("AI university selection is unavailable", null);
        verifyNoInteractions(universityDomainRepository, universityRepository);
    }

    @Test
    void aModelAnswerNamingNoDomainIsA400() {
        taxonomy();
        when(domainResolutionClient.resolve(any(), any(), any(), any()))
                .thenReturn(Optional.of(List.of()));

        assertBadRequest("could not place this problem in a known domain", null);
        verifyNoInteractions(universityDomainRepository);
    }

    @Test
    void aModelAnswerOfOnlyInventedIdsIsA400() {
        taxonomy();
        modelSays(UUID.randomUUID().toString(), "healthcare");

        assertBadRequest("could not place this problem in a known domain", null);
        verifyNoInteractions(universityDomainRepository);
    }

    @Test
    void aDomainNoActiveUniversityCoversIsA400() {
        taxonomy();
        modelSays(HEALTHCARE);
        when(universityDomainRepository.findByIdDomainIdIn(any())).thenReturn(List.of());

        assertBadRequest("found no university for this problem's domain", null);
        verifyNoInteractions(universityRepository);
    }

    /** Matched on paper, but every candidate has been switched off. */
    @Test
    void aDomainWhoseOnlyUniversitiesAreInactiveIsA400() {
        taxonomy();
        modelSays(HEALTHCARE);
        universityDomainRepositoryReturns(link(DORMANT, HEALTHCARE));
        activeUniversities();

        assertBadRequest("found no university for this problem's domain", null);
    }

    @Test
    void aMissingTaxonomyIsA400AndNeverCallsTheModel() {
        when(domainRepository.findByParentDomainIsNull()).thenReturn(List.of());

        assertBadRequest("no domain taxonomy is configured", null);
        verifyNoInteractions(domainResolutionClient);
    }

    // ------------------------------------------------------------------ fixtures

    private void taxonomy() {
        when(domainRepository.findByParentDomainIsNull())
                .thenReturn(List.of(
                        domain(HEALTHCARE, "Healthcare", "Medical services."),
                        domain(WATER, "Water & Sanitation", "Drinking water.")));
    }

    /** Accepts UUIDs or raw strings so a test can hand the model a malformed id. */
    private void modelSays(Object... ids) {
        when(domainResolutionClient.resolve(any(), any(), any(), any()))
                .thenReturn(Optional.of(
                        java.util.Arrays.stream(ids).map(String::valueOf).toList()));
    }

    private void universityDomainRepositoryReturns(UniversityDomain... links) {
        when(universityDomainRepository.findByIdDomainIdIn(any())).thenReturn(List.of(links));
    }

    private void activeUniversities(Object... idsAndNames) {
        List<University> found = new ArrayList<>();
        for (int i = 0; i < idsAndNames.length; i += 2) {
            found.add(university((UUID) idsAndNames[i], (String) idsAndNames[i + 1]));
        }
        when(universityRepository.findByUniversityIdInAndActiveIsTrue(any())).thenReturn(found);
    }

    private List<OpenAiCompatibleDomainResolutionClient.DomainOption> expectedOptions() {
        return List.of(
                new OpenAiCompatibleDomainResolutionClient.DomainOption(
                        HEALTHCARE, "Healthcare", "Medical services."),
                new OpenAiCompatibleDomainResolutionClient.DomainOption(
                        WATER, "Water & Sanitation", "Drinking water."));
    }

    private void assertBadRequest(String messageFragment, List<UUID> domainIds) {
        assertThatThrownBy(() -> service.resolve("t", "d", domainIds))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining(messageFragment)
                .extracting(ex -> ((ApiException) ex).getStatus())
                .isEqualTo(HttpStatus.BAD_REQUEST);
    }

    private static Domain domain(UUID id, String name) {
        return domain(id, name, null);
    }

    private static Domain domain(UUID id, String name, String description) {
        Domain d = new Domain();
        d.setDomainId(id);
        d.setDomainName(name);
        d.setDescription(description);
        return d;
    }

    private static University university(UUID id, String name) {
        University u = new University();
        u.setUniversityId(id);
        u.setName(name);
        return u;
    }

    private static UniversityDomain link(UUID universityId, UUID domainId) {
        UniversityDomain link = new UniversityDomain();
        link.setId(new UniversityDomainId(universityId, domainId));
        return link;
    }
}
