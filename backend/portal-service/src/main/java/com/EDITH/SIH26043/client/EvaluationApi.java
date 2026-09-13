package com.EDITH.SIH26043.client;

import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.service.annotation.HttpExchange;
import org.springframework.web.service.annotation.PostExchange;

/**
 * Declarative HTTP client for evaluation-service's internal project-review
 * surface. Implemented as a {@code RestClient}-backed proxy (see
 * {@link EvaluationClientConfig}).
 *
 * <p>{@code POST /internal/project-reviews} opens a review work item assigned to
 * the evaluator who scored the problem's evaluation cycle. The endpoint is NOT
 * routed through the public gateway.</p>
 */
@HttpExchange
public interface EvaluationApi {

    @PostExchange("/internal/project-reviews")
    ProjectReviewCreateResponse createProjectReview(
            @RequestBody ProjectReviewCreateRequest request);
}
