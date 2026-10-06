package com.EDITH.SIH26043.service;

import com.EDITH.SIH26043.entity.Participant;
import com.EDITH.SIH26043.enums.ParticipantType;
import com.EDITH.SIH26043.exception.ApiException;
import com.EDITH.SIH26043.repository.ParticipantRepository;
import com.EDITH.SIH26043.web.dto.ParticipantBrief;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ParticipantSearchServiceTest {

    private final ParticipantRepository participantRepository = mock(ParticipantRepository.class);
    private final ParticipantSearchService service = new ParticipantSearchService(participantRepository);

    @Test
    void searchStudentsRejectsQueriesShorterThanTwoCharacters() {
        Participant caller = participant("Caller");

        assertThatThrownBy(() -> service.searchStudents(caller, "a"))
                .isInstanceOf(ApiException.class)
                .satisfies(error -> assertThat(((ApiException) error).getStatus())
                        .isEqualTo(HttpStatus.BAD_REQUEST));

        verify(participantRepository, never())
                .findByParticipantTypeAndFullNameContainingIgnoreCaseOrderByFullNameAsc(
                        any(), any());
    }

    @Test
    void searchStudentsReturnsEveryNameMatchExceptTheCaller() {
        UUID callerId = UUID.randomUUID();
        Participant caller = participant(callerId, "Current Student");
        Participant match = participant(UUID.randomUUID(), "Ananya Rao");
        Participant secondMatch = participant(UUID.randomUUID(), "Anant Kumar");
        when(participantRepository
                .findByParticipantTypeAndFullNameContainingIgnoreCaseOrderByFullNameAsc(
                        ParticipantType.STUDENT, "an"))
                .thenReturn(List.of(caller, match, secondMatch));

        List<ParticipantBrief> results = service.searchStudents(caller, "  an ");

        assertThat(results).containsExactly(
                new ParticipantBrief(match.getParticipantId(), "Ananya Rao"),
                new ParticipantBrief(secondMatch.getParticipantId(), "Anant Kumar"));
        verify(participantRepository)
                .findByParticipantTypeAndFullNameContainingIgnoreCaseOrderByFullNameAsc(
                        ParticipantType.STUDENT, "an");
    }

    private static Participant participant(String name) {
        return participant(UUID.randomUUID(), name);
    }

    private static Participant participant(UUID id, String name) {
        Participant participant = new Participant();
        participant.setParticipantId(id);
        participant.setParticipantType(ParticipantType.STUDENT);
        participant.setFullName(name);
        return participant;
    }
}
