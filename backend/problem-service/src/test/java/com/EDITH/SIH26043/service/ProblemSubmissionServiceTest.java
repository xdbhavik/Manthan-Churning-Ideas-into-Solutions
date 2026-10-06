package com.EDITH.SIH26043.service;

import com.EDITH.SIH26043.enums.KycStatus;
import com.EDITH.SIH26043.client.GovernmentSubmissionGateway;
import com.EDITH.SIH26043.enums.ProblemAccessRule;
import com.EDITH.SIH26043.enums.SourceBucket;
import com.EDITH.SIH26043.entity.Problem;
import com.EDITH.SIH26043.enums.Urgency;
import com.EDITH.SIH26043.enums.UserRole;
import com.EDITH.SIH26043.exception.ApiException;
import com.EDITH.SIH26043.security.AuthUser;
import com.EDITH.SIH26043.web.dto.ProblemSubmitRequest;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * The submission orchestrator's one real responsibility: an
 * {@code AUTO_SELECTED_UNIVERSITIES} submission must be resolved into concrete
 * university names <em>before</em> the write transaction opens, and the engine
 * must be handed those names — never the ones in the request body.
 *
 * <p>Everything else must not pay for that: the three ordinary rules never reach
 * the model at all, which is what keeps a model outage from affecting them.</p>
 */
class ProblemSubmissionServiceTest {

    private final ProblemCollectionEngine engine = mock(ProblemCollectionEngine.class);
    private final AutoUniversitySelectionService autoSelection =
            mock(AutoUniversitySelectionService.class);
    private final GovernmentSubmissionGateway governmentSubmissionGateway = mock(GovernmentSubmissionGateway.class);

    private final ProblemSubmissionService service =
            new ProblemSubmissionService(engine, autoSelection, governmentSubmissionGateway);

    private final AuthUser me = new AuthUser(UUID.randomUUID(), "9900000001",
            UserRole.SUBMITTER, KycStatus.UNVERIFIED);
    private final UUID sourceAccountId = UUID.randomUUID();
    private final UUID hint = UUID.randomUUID();

    // ------------------------------------------------------------------ the ordinary rules

    @Test
    void anOpenToAllSubmissionNeverTouchesTheModel() {
        ProblemSubmitRequest req = request(ProblemAccessRule.OPEN_TO_ALL, null);

        service.submit(req, me, "10.0.0.1");

        verify(engine).receiveSubmission(req, me, "10.0.0.1", null);
        verifyNoInteractions(autoSelection);
    }

    /** Old clients omit the rule entirely; they must keep working untouched. */
    @Test
    void anAbsentRuleNeverTouchesTheModel() {
        ProblemSubmitRequest req = request(null, null);

        service.submit(req, me, "10.0.0.1");

        verify(engine).receiveSubmission(req, me, "10.0.0.1", null);
        verifyNoInteractions(autoSelection);
    }

    @Test
    void governmentProblemIsSentForDirectEvaluatorAssignment() {
        ProblemSubmitRequest req = request(null, null);
        Problem created = new Problem();
        created.setProblemId(UUID.randomUUID());
        created.setSourceBucket(SourceBucket.GOVT);
        when(engine.receiveSubmission(req, me, "10.0.0.1", null)).thenReturn(created);

        service.submit(req, me, "10.0.0.1");

        verify(governmentSubmissionGateway).assign(created.getProblemId(), me.getUserId());
    }

    @Test
    void aSelectedUniversitiesSubmissionNeverTouchesTheModel() {
        ProblemSubmitRequest req =
                request(ProblemAccessRule.SELECTED_UNIVERSITIES, List.of("IIT Madras"));

        service.submit(req, me, "10.0.0.1");

        verify(engine).receiveSubmission(req, me, "10.0.0.1", null);
        verifyNoInteractions(autoSelection);
    }

    // ------------------------------------------------------------------ the automatic rule

    @Test
    void anAutomaticSubmissionResolvesThenDelegates() {
        ProblemSubmitRequest req = request(ProblemAccessRule.AUTO_SELECTED_UNIVERSITIES, null);
        when(autoSelection.resolve(req.title(), req.description(), req.domainIds()))
                .thenReturn(List.of("IIT Delhi", "IIT Madras"));

        service.submit(req, me, "10.0.0.1");

        verify(autoSelection).resolve(req.title(), req.description(), req.domainIds());
        verify(engine).receiveSubmission(req, me, "10.0.0.1",
                List.of("IIT Delhi", "IIT Madras"));
    }

    /**
     * A caller cannot name its own audience for an automatic rule: whatever it put
     * in {@code accessUniversities} is discarded in favour of the resolved list.
     */
    @Test
    void theEngineGetsTheResolvedNamesNotTheSubmittedOnes() {
        ProblemSubmitRequest req = request(ProblemAccessRule.AUTO_SELECTED_UNIVERSITIES,
                List.of("Smuggled University"));
        when(autoSelection.resolve(req.title(), req.description(), req.domainIds()))
                .thenReturn(List.of("IIT Madras"));

        service.submit(req, me, "10.0.0.1");

        verify(engine).receiveSubmission(req, me, "10.0.0.1", List.of("IIT Madras"));
        verify(engine, never()).receiveSubmission(req, me, "10.0.0.1",
                List.of("Smuggled University"));
    }

    @Test
    void theSubmitterDomainsArePassedThroughToTheResolver() {
        ProblemSubmitRequest req = request(ProblemAccessRule.AUTO_SELECTED_UNIVERSITIES, null,
                List.of(hint));
        when(autoSelection.resolve(req.title(), req.description(), List.of(hint)))
                .thenReturn(List.of("IIT Madras"));

        service.submit(req, me, "10.0.0.1");

        verify(autoSelection).resolve(req.title(), req.description(), List.of(hint));
    }

    /** A resolution failure must abort the submission, not fall through to a write. */
    @Test
    void aResolutionFailurePropagatesAndNothingIsWritten() {
        ProblemSubmitRequest req = request(ProblemAccessRule.AUTO_SELECTED_UNIVERSITIES, null);
        when(autoSelection.resolve(req.title(), req.description(), req.domainIds()))
                .thenThrow(new ApiException(HttpStatus.BAD_REQUEST,
                        "AI university selection is unavailable right now."));

        assertThatThrownBy(() -> service.submit(req, me, "10.0.0.1"))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("AI university selection is unavailable");

        verifyNoInteractions(engine);
    }

    // ------------------------------------------------------------------ fixtures

    private ProblemSubmitRequest request(ProblemAccessRule rule, List<String> universities) {
        return request(rule, universities, null);
    }

    private ProblemSubmitRequest request(ProblemAccessRule rule, List<String> universities,
                                         List<UUID> domainIds) {
        return new ProblemSubmitRequest(
                "Borewell dry for three weeks",
                "Ward 7 has had no piped supply since the borewell failed.",
                Urgency.IMMEDIATE, null, null, null, null,
                sourceAccountId,
                new ProblemSubmitRequest.LocationRequest("Rajasthan", "Jaipur", null, null,
                        "302001", 26.9124, 75.7873, null, null),
                domainIds, null,
                rule, universities);
    }
}
