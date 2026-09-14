package com.EDITH.SIH26043.client;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;

import java.util.Optional;
import java.util.UUID;

/**
 * Thin wrapper over {@link CodeJudgeApi}.
 *
 * <p><strong>Deliberately best-effort — the opposite of {@link EvaluationGateway}.</strong>
 * Opening the human project review is a precondition of a submission: if it fails the
 * submit is rolled back, because an UNDER_REVIEW submission with no reviewer would be a
 * lie. The CodeJudge hand-off is not a precondition. CodeJudge's verdict is advisory to
 * the human reviewer (it never accepts or returns a project), and its job queue retries
 * on its own. So a codejudge outage, a 4xx from a rejected payload, or a discovery miss
 * is logged and dropped — never propagated into the student's submit.</p>
 */
@Service
public class CodeJudgeGateway {

    private static final Logger log = LoggerFactory.getLogger(CodeJudgeGateway.class);

    private final CodeJudgeApi api;

    public CodeJudgeGateway(CodeJudgeApi api) {
        this.api = api;
    }

    /**
     * Queue an automated evaluation, returning the created evaluation when CodeJudge
     * accepted it and {@link Optional#empty()} when it did not. Never throws for an
     * upstream condition.
     *
     * @param ownerUserId the student the run belongs to; wrapped into the body because
     *                    the portal calls as a service, not as that student
     */
    public Optional<CodeJudgeEvaluationResponse> queueEvaluation(CodeJudgeEvaluationRequest request,
                                                                UUID ownerUserId) {
        try {
            return Optional.ofNullable(api.queueEvaluation(
                    new CodeJudgeInternalCreateRequest(ownerUserId, request)));
        } catch (RestClientException e) {
            log.warn("CodeJudge hand-off failed for submission {} ({}); "
                    + "the submission stays under human review",
                    request.portalSubmissionId(), e.getMessage());
            return Optional.empty();
        } catch (RuntimeException e) {
            // Belt-and-braces: nothing about an optional automated evaluation may
            // propagate into the caller's submit transaction.
            log.warn("Unexpected CodeJudge hand-off failure for submission {} ({}); "
                    + "the submission stays under human review",
                    request.portalSubmissionId(), e.toString());
            return Optional.empty();
        }
    }
}
