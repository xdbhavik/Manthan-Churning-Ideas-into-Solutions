package com.EDITH.SIH26043.service;

import com.EDITH.SIH26043.client.SourceAccountsGateway;
import com.EDITH.SIH26043.entity.Participant;
import com.EDITH.SIH26043.entity.PublishedProblem;
import com.EDITH.SIH26043.enums.ParticipantType;
import com.EDITH.SIH26043.enums.ProblemAccessRule;
import com.EDITH.SIH26043.exception.ApiException;
import com.EDITH.SIH26043.internal.SourceAccountDetail;
import com.EDITH.SIH26043.repository.ParticipantRepository;
import com.EDITH.SIH26043.security.AuthUser;
import com.EDITH.SIH26043.web.dto.ParticipantRegisterRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Resolves the current caller to a portal {@link Participant}.
 *
 * <p>Universities need no second registration: on first contact, if the caller
 * owns an ACTIVE + VERIFIED HEI source account, a UNIVERSITY participant is
 * auto-created from it (institution snapshot + binding account id). A caller with
 * no HEI account and no participant profile is told to register as a STUDENT.</p>
 */
@Service
public class ParticipantService {

    private final ParticipantRepository participantRepository;
    private final SourceAccountsGateway sourceAccountsGateway;

    public ParticipantService(ParticipantRepository participantRepository,
                              SourceAccountsGateway sourceAccountsGateway) {
        this.participantRepository = participantRepository;
        this.sourceAccountsGateway = sourceAccountsGateway;
    }

    /**
     * The caller's participant profile, auto-creating a UNIVERSITY participant on
     * first contact when they own a usable HEI source account.
     *
     * @throws ApiException 404 {@code STUDENT_NOT_REGISTERED} when the caller owns
     *                      no HEI account and has no profile yet — they must
     *                      {@code POST /portal/participants} to register as a student.
     */
    @Transactional
    public Participant me(AuthUser caller) {
        Participant existing = participantRepository.findByUserId(caller.getUserId())
                .orElse(null);
        if (existing != null) {
            return existing;
        }

        SourceAccountDetail hei = firstUsableHeiAccount(caller.getUserId());
        if (hei != null) {
            Participant auto = new Participant();
            auto.setUserId(caller.getUserId());
            auto.setParticipantType(ParticipantType.UNIVERSITY);
            auto.setFullName(blankTo(hei.displayName(), caller.getPhone()));
            auto.setPhone(caller.getPhone());
            auto.setInstitutionName(hei.institutionName());
            auto.setSourceAccountId(hei.sourceAccountId());
            return participantRepository.save(auto);
        }

        throw new ApiException(HttpStatus.NOT_FOUND,
                "STUDENT_NOT_REGISTERED — register at POST /portal/participants "
                        + "to browse and solve OPEN_TO_ALL problems");
    }

    /**
     * STUDENT self-registration. Rejected when the caller already has a profile or
     * owns an HEI source account (HEI owners stay UNIVERSITY — no dual kind).
     */
    @Transactional
    public Participant registerStudent(AuthUser caller, ParticipantRegisterRequest request) {
        if (participantRepository.existsByUserId(caller.getUserId())) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "A portal participant already exists for this user");
        }
        if (firstUsableHeiAccount(caller.getUserId()) != null) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "HEI_ACCOUNT_REGISTERED_AS_UNIVERSITY — this user owns a verified "
                            + "university source account and is bound as a UNIVERSITY participant");
        }

        Participant student = new Participant();
        student.setUserId(caller.getUserId());
        student.setParticipantType(ParticipantType.STUDENT);
        student.setFullName(request.fullName().trim());
        student.setEmail(request.email());
        student.setPhone(blankTo(request.phone(), caller.getPhone()));
        return participantRepository.save(student);
    }

    /**
     * Access-rule predicate shared by browse/detail/submission-create/member-join:
     *
     * <ul>
     *   <li>STUDENT → only {@code OPEN_TO_ALL};</li>
     *   <li>UNIVERSITY → {@code OPEN_TO_ALL}, {@code UNIVERSITY_ONLY}, or a named
     *       snapshot ({@code SELECTED_UNIVERSITIES} /
     *       {@code AUTO_SELECTED_UNIVERSITIES}) that names this participant's
     *       institution (case/whitespace-insensitive).</li>
     * </ul>
     *
     * <p>The two named-snapshot rules are deliberately one branch: the automatic
     * rule persists the audience it resolved into the very same
     * {@code access_universities} column, so visibility cannot drift between
     * "the submitter picked these" and "the platform matched these".</p>
     */
    public boolean canSee(Participant participant, PublishedProblem problem) {
        ProblemAccessRule rule = problem.getAccessRule() == null
                ? ProblemAccessRule.OPEN_TO_ALL : problem.getAccessRule();
        return switch (participant.getParticipantType()) {
            case STUDENT -> rule == ProblemAccessRule.OPEN_TO_ALL;
            case UNIVERSITY -> switch (rule) {
                case OPEN_TO_ALL, UNIVERSITY_ONLY -> true;
                case SELECTED_UNIVERSITIES, AUTO_SELECTED_UNIVERSITIES -> {
                    String mine = normalize(participant.getInstitutionName());
                    yield !mine.isEmpty() && problem.getAccessUniversities().stream()
                            .map(ParticipantService::normalize)
                            .anyMatch(mine::equals);
                }
            };
        };
    }

    private SourceAccountDetail firstUsableHeiAccount(UUID userId) {
        List<SourceAccountDetail> accounts = sourceAccountsGateway.listByOwner(userId);
        return accounts.stream()
                .filter(SourceAccountDetail::canSubmit)
                .filter(a -> "HEI".equals(a.sourceBucket()))
                .findFirst()
                .orElse(null);
    }

    private static String blankTo(String value, String fallback) {
        return (value == null || value.isBlank()) ? fallback : value.trim();
    }

    static String normalize(String value) {
        if (value == null) {
            return "";
        }
        return value.trim().toLowerCase().replaceAll("\\s+", " ");
    }
}
