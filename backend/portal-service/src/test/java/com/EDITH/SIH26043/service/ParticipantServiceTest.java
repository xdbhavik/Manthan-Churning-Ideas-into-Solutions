package com.EDITH.SIH26043.service;

import com.EDITH.SIH26043.client.SourceAccountsGateway;
import com.EDITH.SIH26043.entity.Participant;
import com.EDITH.SIH26043.entity.PublishedProblem;
import com.EDITH.SIH26043.enums.KycStatus;
import com.EDITH.SIH26043.enums.ParticipantType;
import com.EDITH.SIH26043.enums.ProblemAccessRule;
import com.EDITH.SIH26043.enums.UserRole;
import com.EDITH.SIH26043.exception.ApiException;
import com.EDITH.SIH26043.internal.SourceAccountDetail;
import com.EDITH.SIH26043.repository.ParticipantRepository;
import com.EDITH.SIH26043.security.AuthUser;
import com.EDITH.SIH26043.web.dto.ParticipantRegisterRequest;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Portal identity. Two guarantees carry the weight here: universities that
 * already exist in source-service need no second registration (an ACTIVE+VERIFIED
 * HEI account auto-binds as a UNIVERSITY participant on first contact), and the
 * access-rule predicate keeps restricted problem statements away from STUDENT
 * participants (and from universities not named on a SELECTED or automatically
 * routed problem).
 */
class ParticipantServiceTest {

    private final ParticipantRepository participantRepository = mock(ParticipantRepository.class);
    private final SourceAccountsGateway sourceAccountsGateway = mock(SourceAccountsGateway.class);

    private final ParticipantService service =
            new ParticipantService(participantRepository, sourceAccountsGateway);

    private final UUID userId = UUID.randomUUID();
    private final AuthUser caller =
            new AuthUser(userId, "9700000001", UserRole.SUBMITTER, KycStatus.UNVERIFIED);

    // ------------------------------------------------------------ me (auto-bind)

    @Test
    void me_AutoBindsAUniversityParticipantFromAUsableHeiAccount() {
        when(participantRepository.findByUserId(userId)).thenReturn(Optional.empty());
        when(sourceAccountsGateway.listByOwner(userId)).thenReturn(List.of(
                heiAccount("IIT Madras", true)));
        when(participantRepository.save(any(Participant.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        Participant participant = service.me(caller);

        assertThat(participant.getParticipantType()).isEqualTo(ParticipantType.UNIVERSITY);
        assertThat(participant.getInstitutionName()).isEqualTo("IIT Madras");
        assertThat(participant.getSourceAccountId()).isEqualTo(heiAccountId);
        assertThat(participant.getUserId()).isEqualTo(userId);
        verify(participantRepository).save(any(Participant.class));
    }

    @Test
    void me_ReturnsTheExistingParticipantWithoutCallingSource() {
        Participant existing = student(userId);
        when(participantRepository.findByUserId(userId)).thenReturn(Optional.of(existing));

        Participant participant = service.me(caller);

        assertThat(participant).isSameAs(existing);
        verify(sourceAccountsGateway, never()).listByOwner(any());
    }

    @Test
    void me_TellsAUserWithNoHeiAccountToRegisterAsAStudent() {
        when(participantRepository.findByUserId(userId)).thenReturn(Optional.empty());
        when(sourceAccountsGateway.listByOwner(userId)).thenReturn(List.of());

        assertThatThrownBy(() -> service.me(caller))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> {
                    assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND);
                    assertThat(ex.getMessage()).contains("STUDENT_NOT_REGISTERED");
                });
    }

    @Test
    void me_DoesNotTreatNonSubmitOrNonHeiAccountsAsAUniversity() {
        // An unverified HEI account and a fully verified GOVT account are both
        // unusable for university auto-binding.
        when(participantRepository.findByUserId(userId)).thenReturn(Optional.empty());
        when(sourceAccountsGateway.listByOwner(userId)).thenReturn(List.of(
                heiAccount("IIT Madras", false),
                govtAccount(true)));

        assertThatThrownBy(() -> service.me(caller))
                .isInstanceOf(ApiException.class)
                .extracting(ex -> ((ApiException) ex).getStatus())
                .isEqualTo(HttpStatus.NOT_FOUND);
    }

    // ------------------------------------------------------------ registerStudent

    @Test
    void registerStudent_CreatesAStudentWhenTheCallerHasNoHeiAccount() {
        when(participantRepository.existsByUserId(userId)).thenReturn(false);
        when(sourceAccountsGateway.listByOwner(userId)).thenReturn(List.of());
        when(participantRepository.save(any(Participant.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        Participant participant = service.registerStudent(caller,
                new ParticipantRegisterRequest("  Aarav Sharma  ", "aarav@student.ac.in", null));

        assertThat(participant.getParticipantType()).isEqualTo(ParticipantType.STUDENT);
        assertThat(participant.getFullName()).isEqualTo("Aarav Sharma"); // trimmed
        assertThat(participant.getPhone()).isEqualTo("9700000001");      // falls back to claim
        assertThat(participant.getEmail()).isEqualTo("aarav@student.ac.in");
    }

    @Test
    void registerStudent_ConflictsWhenAParticipantAlreadyExists() {
        when(participantRepository.existsByUserId(userId)).thenReturn(true);

        assertThatThrownBy(() -> service.registerStudent(caller,
                new ParticipantRegisterRequest("Aarav", null, null)))
                .isInstanceOf(ApiException.class)
                .extracting(ex -> ((ApiException) ex).getStatus())
                .isEqualTo(HttpStatus.CONFLICT);
        verify(participantRepository, never()).save(any());
    }

    @Test
    void registerStudent_ConflictsWhenTheCallerOwnsAnHeiAccount() {
        when(participantRepository.existsByUserId(userId)).thenReturn(false);
        when(sourceAccountsGateway.listByOwner(userId)).thenReturn(List.of(
                heiAccount("IIT Madras", true)));

        assertThatThrownBy(() -> service.registerStudent(caller,
                new ParticipantRegisterRequest("Aarav", null, null)))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> {
                    assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.CONFLICT);
                    assertThat(ex.getMessage()).contains("HEI_ACCOUNT_REGISTERED_AS_UNIVERSITY");
                });
    }

    // ------------------------------------------------------------ canSee matrix

    @Test
    void canSee_AStudentOnlySeesOpenToAllProblems() {
        Participant student = student(userId);

        assertThat(service.canSee(student, problem(ProblemAccessRule.OPEN_TO_ALL, List.of()))).isTrue();
        assertThat(service.canSee(student, problem(ProblemAccessRule.UNIVERSITY_ONLY, List.of()))).isFalse();
        assertThat(service.canSee(student,
                problem(ProblemAccessRule.SELECTED_UNIVERSITIES, List.of("IIT Madras")))).isFalse();
    }

    @Test
    void canSee_ANullAccessRuleDefaultsToOpenToAll() {
        Participant student = student(userId);
        PublishedProblem problem = problem(ProblemAccessRule.OPEN_TO_ALL, List.of());
        problem.setAccessRule(null);

        assertThat(service.canSee(student, problem)).isTrue();
    }

    @Test
    void canSee_AUniversitySeesOpenAndUniversityOnlyAndSelectedNamingIt() {
        Participant university = university("IIT Madras");

        assertThat(service.canSee(university, problem(ProblemAccessRule.OPEN_TO_ALL, List.of()))).isTrue();
        assertThat(service.canSee(university, problem(ProblemAccessRule.UNIVERSITY_ONLY, List.of()))).isTrue();
        assertThat(service.canSee(university,
                problem(ProblemAccessRule.SELECTED_UNIVERSITIES, List.of("IIT Madras")))).isTrue();
    }

    @Test
    void canSee_SelectedUniversitiesMatchIsCaseAndWhitespaceInsensitive() {
        Participant university = university("  IIT  Madras ");

        assertThat(service.canSee(university,
                problem(ProblemAccessRule.SELECTED_UNIVERSITIES, List.of("iit madras")))).isTrue();
    }

    @Test
    void canSee_SelectedUniversitiesDoesNotMatchAnotherInstitution() {
        Participant university = university("IIT Bombay");

        assertThat(service.canSee(university,
                problem(ProblemAccessRule.SELECTED_UNIVERSITIES, List.of("IIT Madras")))).isFalse();
    }

    @Test
    void canSee_AUniversityWithNoInstitutionSnapshotCannotSeeSelectedProblems() {
        Participant university = university(null);

        assertThat(service.canSee(university,
                problem(ProblemAccessRule.SELECTED_UNIVERSITIES, List.of("IIT Madras")))).isFalse();
        assertThat(service.canSee(university, problem(ProblemAccessRule.UNIVERSITY_ONLY, List.of()))).isTrue();
    }

    // -------------------------------------------------- canSee: the automatic rule

    @Test
    void canSee_AStudentCannotSeeAnAutomaticProblem() {
        Participant student = student(userId);

        assertThat(service.canSee(student,
                problem(ProblemAccessRule.AUTO_SELECTED_UNIVERSITIES, List.of("IIT Madras"))))
                .isFalse();
    }

    @Test
    void canSee_AUniversityNamedInTheResolvedSnapshotSeesIt() {
        Participant university = university("IIT Madras");

        assertThat(service.canSee(university,
                problem(ProblemAccessRule.AUTO_SELECTED_UNIVERSITIES, List.of("IIT Madras"))))
                .isTrue();
        assertThat(service.canSee(university,
                problem(ProblemAccessRule.AUTO_SELECTED_UNIVERSITIES, List.of("IIT Bombay"))))
                .isFalse();
    }

    @Test
    void canSee_TheAutomaticRuleUsesTheSameNormalizationAsSelected() {
        Participant university = university("  IIT  Madras ");

        assertThat(service.canSee(university,
                problem(ProblemAccessRule.AUTO_SELECTED_UNIVERSITIES, List.of("iit madras"))))
                .isTrue();
    }

    /** A resolved-but-empty snapshot must never degrade into "visible to everyone". */
    @Test
    void canSee_AnAutomaticProblemWithNoResolvedNamesMatchesNobody() {
        Participant university = university("IIT Madras");

        assertThat(service.canSee(university,
                problem(ProblemAccessRule.AUTO_SELECTED_UNIVERSITIES, List.of()))).isFalse();
    }

    // ------------------------------------------------------------------ fixtures

    private final UUID heiAccountId = UUID.randomUUID();

    private SourceAccountDetail heiAccount(String institution, boolean canSubmit) {
        return new SourceAccountDetail(
                heiAccountId, UUID.randomUUID(), "HEI", "UNIVERSITY",
                canSubmit ? "ACTIVE" : "PENDING", canSubmit ? "VERIFIED" : "UNVERIFIED",
                institution, institution, canSubmit);
    }

    private SourceAccountDetail govtAccount(boolean canSubmit) {
        return new SourceAccountDetail(
                UUID.randomUUID(), UUID.randomUUID(), "GOVT", "GOVERNMENT",
                canSubmit ? "ACTIVE" : "PENDING", canSubmit ? "VERIFIED" : "UNVERIFIED",
                null, "Ministry of Water", canSubmit);
    }

    private Participant student(UUID id) {
        Participant participant = new Participant();
        participant.setParticipantId(UUID.randomUUID());
        participant.setUserId(id);
        participant.setParticipantType(ParticipantType.STUDENT);
        participant.setFullName("Aarav Sharma");
        return participant;
    }

    private Participant university(String institutionName) {
        Participant participant = new Participant();
        participant.setParticipantId(UUID.randomUUID());
        participant.setUserId(userId);
        participant.setParticipantType(ParticipantType.UNIVERSITY);
        participant.setInstitutionName(institutionName);
        return participant;
    }

    private PublishedProblem problem(ProblemAccessRule rule, List<String> universities) {
        PublishedProblem problem = new PublishedProblem();
        problem.setProblemId(UUID.randomUUID());
        problem.setAccessRule(rule);
        problem.setAccessUniversities(universities);
        return problem;
    }
}
