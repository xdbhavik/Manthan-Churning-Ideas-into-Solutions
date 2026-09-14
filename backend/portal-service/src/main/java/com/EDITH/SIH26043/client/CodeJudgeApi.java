package com.EDITH.SIH26043.client;

import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.service.annotation.HttpExchange;
import org.springframework.web.service.annotation.PostExchange;

/**
 * Declarative HTTP client for codejudge-service's internal hand-off surface.
 * Implemented as a {@code RestClient}-backed proxy (see {@link CodeJudgeClientConfig}).
 *
 * <p>{@code POST /internal/codejudge/evaluations} queues an automated evaluation of
 * a student's pinned repository commit. The endpoint is NOT routed through the
 * public gateway, and the body carries the owner (see
 * {@link CodeJudgeInternalCreateRequest}).</p>
 */
@HttpExchange
public interface CodeJudgeApi {

    @PostExchange("/internal/codejudge/evaluations")
    CodeJudgeEvaluationResponse queueEvaluation(@RequestBody CodeJudgeInternalCreateRequest request);
}
