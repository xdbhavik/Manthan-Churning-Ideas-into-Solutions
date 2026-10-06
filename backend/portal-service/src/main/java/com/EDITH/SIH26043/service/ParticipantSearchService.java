package com.EDITH.SIH26043.service;

import com.EDITH.SIH26043.entity.Participant;
import com.EDITH.SIH26043.enums.ParticipantType;
import com.EDITH.SIH26043.exception.ApiException;
import com.EDITH.SIH26043.repository.ParticipantRepository;
import com.EDITH.SIH26043.web.dto.ParticipantBrief;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/** Name search across registered student teammates. */
@Service
public class ParticipantSearchService {

    private final ParticipantRepository participantRepository;

    public ParticipantSearchService(ParticipantRepository participantRepository) {
        this.participantRepository = participantRepository;
    }

    @Transactional(readOnly = true)
    public List<ParticipantBrief> searchStudents(Participant caller, String name) {
        String query = name == null ? "" : name.trim();
        if (query.length() < 2) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Enter at least 2 characters to search");
        }

        return participantRepository
                .findByParticipantTypeAndFullNameContainingIgnoreCaseOrderByFullNameAsc(
                        ParticipantType.STUDENT, query)
                .stream()
                .filter(candidate -> !candidate.getParticipantId().equals(caller.getParticipantId()))
                .map(candidate -> new ParticipantBrief(candidate.getParticipantId(), candidate.getFullName()))
                .toList();
    }
}
