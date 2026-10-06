package com.EDITH.SIH26043.client;

import com.EDITH.SIH26043.exception.ApiException;
import com.EDITH.SIH26043.internal.ProblemContextResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClientException;

import java.util.UUID;
import java.util.Map;

/**
 * Thin wrapper over {@link PortalApi} mapping upstream failures to domain errors.
 * Both operations are fired best-effort by their services (logged, never thrown
 * into a caller's transaction), so the wrapper only translates statuses for the
 * log line; the caller decides whether to propagate.
 */
@Service
public class PortalGateway {

    private static final Logger log = LoggerFactory.getLogger(PortalGateway.class);

    private final PortalApi api;

    public PortalGateway(PortalApi api) {
        this.api = api;
    }

    public void publish(UUID cycleId, ProblemContextResponse problem) {
        try {
            api.publishProblem(new PortalPublishRequest(cycleId, problem));
        } catch (HttpStatusCodeException e) {
            throw new ApiException(HttpStatus.BAD_GATEWAY,
                    "Portal publish failed (" + e.getStatusCode().value() + ") for cycle "
                            + cycleId + ": " + e.getResponseBodyAsString());
        } catch (RestClientException e) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Portal service unreachable; cannot publish cycle " + cycleId);
        }
    }

    public void notifyReviewResult(UUID submissionId, String decision, String comment) {
        try {
            api.notifyReviewResult(submissionId,
                    new PortalReviewDecisionRequest(decision, comment));
        } catch (HttpStatusCodeException e) {
            throw new ApiException(HttpStatus.BAD_GATEWAY,
                    "Portal review-result push failed (" + e.getStatusCode().value()
                            + ") for submission " + submissionId + ": "
                            + e.getResponseBodyAsString());
        } catch (RestClientException e) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Portal service unreachable; cannot notify review result for submission "
                            + submissionId);
        }
    }

    public Map<String, Object> reviewContext(UUID submissionId) {
        try {
            Map<String, Object> context = api.reviewContext(submissionId);
            return context == null ? Map.of() : context;
        } catch (RestClientException e) {
            log.warn("Could not load portal details for submission {}: {}", submissionId, e.getMessage());
            return Map.of();
        }
    }

    /** Best-effort copy for display in the student's accepted portal submission. */
    public void syncReviewScorecard(UUID submissionId, Map<String, Object> scorecard) {
        try {
            api.syncReviewScorecard(submissionId, scorecard);
        } catch (RestClientException e) {
            log.warn("Project scorecard saved but portal sync failed for submission {}: {}", submissionId, e.getMessage());
        }
    }
}
