package com.EDITH.SIH26043.service;

import com.EDITH.SIH26043.client.SourceAccountsGateway;
import com.EDITH.SIH26043.entity.Participant;
import com.EDITH.SIH26043.entity.PublishedProblem;
import com.EDITH.SIH26043.enums.ParticipantType;
import com.EDITH.SIH26043.enums.ProblemAccessRule;
import com.EDITH.SIH26043.exception.ApiException;
import com.EDITH.SIH26043.internal.ProblemContextResponse;
import com.EDITH.SIH26043.repository.ParticipantRepository;
import com.EDITH.SIH26043.repository.PublishedProblemRepository;
import com.EDITH.SIH26043.web.dto.PublishedProblemDetail;
import com.EDITH.SIH26043.web.dto.PublishedProblemSummary;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * The published catalog: intake is an idempotent upsert keyed on the upstream
 * problem id, and the read side re-checks the participant access rule on every
 * row so a restricted statement never leaks to a viewer who must not see it.
 */
class PublishedProblemServiceTest {

    private final PublishedProblemRepository problemRepository = mock(PublishedProblemRepository.class);
    private final ParticipantRepository participantRepository = mock(ParticipantRepository.class);
    private final SourceAccountsGateway sourceAccountsGateway = mock(SourceAccountsGateway.class);

    /** Real participant service: canSee is pure and is exactly what we assert on. */
    private final PublishedProblemService service = new PublishedProblemService(
            problemRepository,
            new ParticipantService(participantRepository, sourceAccountsGateway));

    private final UUID problemId = UUID.randomUUID();
    private final UUID cycleId = UUID.randomUUID();

    // ------------------------------------------------------------------ upsert

    @Test
    void upsert_CreatesACatalogRowFromTheSnapshot_DefaultingToOpenToAll() {
        when(problemRepository.findById(problemId)).thenReturn(Optional.empty());
        when(problemRepository.save(any(PublishedProblem.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        PublishedProblem saved = service.upsert(cycleId, snapshot(problemId, null, null));

        assertThat(saved.getProblemId()).isEqualTo(problemId);
        assertThat(saved.getCycleId()).isEqualTo(cycleId);
        assertThat(saved.getTitle()).isEqualTo("Irregular drinking water supply");
        assertThat(saved.getAccessRule()).isEqualTo(ProblemAccessRule.OPEN_TO_ALL);
        assertThat(saved.getAccessUniversities()).isEmpty();
        assertThat(saved.getDomains()).containsExactly("water");
    }

    @Test
    void upsert_CopiesTheAccessRuleAndSelectedUniversitySnapshot() {
        when(problemRepository.findById(problemId)).thenReturn(Optional.empty());
        when(problemRepository.save(any(PublishedProblem.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        PublishedProblem saved = service.upsert(cycleId,
                snapshot(problemId, "SELECTED_UNIVERSITIES", List.of("IIT Madras")));

        assertThat(saved.getAccessRule()).isEqualTo(ProblemAccessRule.SELECTED_UNIVERSITIES);
        assertThat(saved.getAccessUniversities()).containsExactly("IIT Madras");
    }

    /**
     * The automatic rule publishes the audience the server resolved into the same
     * snapshot column. This also guards the {@code enumOf} fallback: a rule name the
     * portal does not know silently becomes OPEN_TO_ALL, which would leak a
     * restricted problem to everyone.
     */
    @Test
    void upsert_CopiesTheAutoSelectedRuleAndItsResolvedSnapshot() {
        when(problemRepository.findById(problemId)).thenReturn(Optional.empty());
        when(problemRepository.save(any(PublishedProblem.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        PublishedProblem saved = service.upsert(cycleId, snapshot(problemId,
                "AUTO_SELECTED_UNIVERSITIES", List.of("IIT Delhi", "IIT Madras")));

        assertThat(saved.getAccessRule()).isEqualTo(ProblemAccessRule.AUTO_SELECTED_UNIVERSITIES);
        assertThat(saved.getAccessUniversities()).containsExactly("IIT Delhi", "IIT Madras");
    }

    @Test
    void upsert_RefreshesAnExistingRowOnRePublish() {
        PublishedProblem existing = problem(ProblemAccessRule.UNIVERSITY_ONLY);
        existing.setTitle("Old title");
        when(problemRepository.findById(problemId)).thenReturn(Optional.of(existing));
        when(problemRepository.save(any(PublishedProblem.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        PublishedProblem refreshed = service.upsert(cycleId, snapshot(problemId, null, null));

        assertThat(refreshed).isSameAs(existing);
        assertThat(refreshed.getTitle()).isEqualTo("Irregular drinking water supply");
        assertThat(refreshed.getAccessRule()).isEqualTo(ProblemAccessRule.OPEN_TO_ALL);
    }

    // ----------------------------------------------------------- browse filtering

    @Test
    void list_HidesRestrictedProblemsFromAStudentViewer() {
        PublishedProblem open = problem(ProblemAccessRule.OPEN_TO_ALL);
        open.setProblemId(UUID.randomUUID());
        PublishedProblem universityOnly = problem(ProblemAccessRule.UNIVERSITY_ONLY);
        universityOnly.setProblemId(UUID.randomUUID());
        PublishedProblem selectedOther = problem(ProblemAccessRule.SELECTED_UNIVERSITIES);
        selectedOther.setProblemId(UUID.randomUUID());
        selectedOther.setAccessUniversities(List.of("IIT Bombay"));
        when(problemRepository.findAllByOrderByPublishedAtDesc())
                .thenReturn(List.of(open, universityOnly, selectedOther));

        List<PublishedProblemSummary> visible = service.list(student());

        assertThat(visible).extracting(PublishedProblemSummary::problemId)
                .containsExactly(open.getProblemId());
    }

    @Test
    void list_AUniversityViewerSeesRestrictedAndSelectedRowsNamingIt() {
        Participant university = university("IIT Madras");
        PublishedProblem open = problem(ProblemAccessRule.OPEN_TO_ALL);
        open.setProblemId(UUID.randomUUID());
        PublishedProblem selectedMine = problem(ProblemAccessRule.SELECTED_UNIVERSITIES);
        selectedMine.setProblemId(UUID.randomUUID());
        selectedMine.setAccessUniversities(List.of("IIT Madras"));
        PublishedProblem selectedOther = problem(ProblemAccessRule.SELECTED_UNIVERSITIES);
        selectedOther.setProblemId(UUID.randomUUID());
        selectedOther.setAccessUniversities(List.of("IIT Bombay"));
        when(problemRepository.findAllByOrderByPublishedAtDesc())
                .thenReturn(List.of(open, selectedMine, selectedOther));

        List<PublishedProblemSummary> visible = service.list(university);

        assertThat(visible).extracting(PublishedProblemSummary::problemId)
                .containsExactly(open.getProblemId(), selectedMine.getProblemId());
    }

    /** An automatically-routed problem is visible exactly like a hand-picked one. */
    @Test
    void list_AnAutomaticProblemFollowsTheSameVisibilityAsASelectedOne() {
        PublishedProblem autoMine = problem(ProblemAccessRule.AUTO_SELECTED_UNIVERSITIES);
        autoMine.setProblemId(UUID.randomUUID());
        autoMine.setAccessUniversities(List.of("IIT Madras"));
        PublishedProblem autoOther = problem(ProblemAccessRule.AUTO_SELECTED_UNIVERSITIES);
        autoOther.setProblemId(UUID.randomUUID());
        autoOther.setAccessUniversities(List.of("IIT Bombay"));
        when(problemRepository.findAllByOrderByPublishedAtDesc())
                .thenReturn(List.of(autoMine, autoOther));

        assertThat(service.list(student())).isEmpty();
        assertThat(service.list(university("IIT Madras")))
                .extracting(PublishedProblemSummary::problemId)
                .containsExactly(autoMine.getProblemId());
    }

    @Test
    void detail_ReturnsAProblemOnlyWhenTheViewerMaySeeIt() {
        PublishedProblem open = problem(ProblemAccessRule.OPEN_TO_ALL);
        when(problemRepository.findById(problemId)).thenReturn(Optional.of(open));

        PublishedProblemDetail detail = service.detail(student(), problemId);

        assertThat(detail.problemId()).isEqualTo(problemId);
        assertThat(detail.accessRule()).isEqualTo(ProblemAccessRule.OPEN_TO_ALL.name());
    }

    @Test
    void detail_AHiddenProblemIsTreatedAsMissing() {
        PublishedProblem restricted = problem(ProblemAccessRule.UNIVERSITY_ONLY);
        when(problemRepository.findById(problemId)).thenReturn(Optional.of(restricted));

        assertThatThrownBy(() -> service.detail(student(), problemId))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> {
                    assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND);
                    assertThat(ex.getMessage()).contains("not visible");
                });
    }

    // ------------------------------------------------------------------ fixtures

    private Participant student() {
        Participant participant = new Participant();
        participant.setParticipantId(UUID.randomUUID());
        participant.setParticipantType(ParticipantType.STUDENT);
        return participant;
    }

    private Participant university(String institutionName) {
        Participant participant = new Participant();
        participant.setParticipantId(UUID.randomUUID());
        participant.setParticipantType(ParticipantType.UNIVERSITY);
        participant.setInstitutionName(institutionName);
        return participant;
    }

    private PublishedProblem problem(ProblemAccessRule rule) {
        PublishedProblem problem = new PublishedProblem();
        problem.setProblemId(problemId);
        problem.setTitle("Irregular drinking water supply");
        problem.setAccessRule(rule);
        return problem;
    }

    private ProblemContextResponse snapshot(UUID id, String accessRule,
                                            List<String> accessUniversities) {
        return new ProblemContextResponse(
                id, "EVALUATION_COMPLETED", "Irregular drinking water supply",
                "Hand pumps dry during summer.", "GOVT", null, null, null, null,
                "Continuous supply in the dry season", null, "Village X",
                List.of("water"), 3, accessRule, accessUniversities);
    }
}
