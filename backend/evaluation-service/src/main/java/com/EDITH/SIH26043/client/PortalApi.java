package com.EDITH.SIH26043.client;

import com.EDITH.SIH26043.internal.ProblemContextResponse;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.service.annotation.HttpExchange;
import org.springframework.web.service.annotation.PostExchange;

import java.util.UUID;

/**
 * Declarative HTTP client for portal-service's internal intake endpoints.
 * Implemented as a {@code RestClient}-backed proxy (see {@link PortalClientConfig}).
 *
 * <ul>
 *   <li>{@code POST /internal/published-problems} — publish an evaluated problem;</li>
 *   <li>{@code POST /internal/submissions/{submissionId}/review-result} — land an
 *       evaluator's ACCEPT/RETURN decision back on the portal submission.</li>
 * </ul>
 *
 * <p>Both are service-to-service only and are never routed through the public
 * gateway.</p>
 */
@HttpExchange
public interface PortalApi {

    @PostExchange("/internal/published-problems")
    void publishProblem(@RequestBody PortalPublishRequest request);

    @PostExchange("/internal/submissions/{submissionId}/review-result")
    void notifyReviewResult(@PathVariable("submissionId") UUID submissionId,
                            @RequestBody PortalReviewDecisionRequest request);
}
