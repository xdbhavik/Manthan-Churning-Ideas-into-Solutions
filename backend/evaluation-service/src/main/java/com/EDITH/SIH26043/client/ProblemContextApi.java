package com.EDITH.SIH26043.client;

import com.EDITH.SIH26043.internal.ProblemContextResponse;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.service.annotation.GetExchange;
import org.springframework.web.service.annotation.HttpExchange;

import java.util.UUID;

/**
 * Declarative HTTP client for problem-service's internal context endpoint.
 * Implemented as a {@code RestClient}-backed proxy (see {@link ProblemClientConfig}).
 *
 * <p>{@code GET /internal/problems/{id}} is served by problem-service and is
 * intentionally NOT routed through the public gateway.</p>
 */
@HttpExchange
public interface ProblemContextApi {

    @GetExchange("/internal/problems/{id}")
    ProblemContextResponse getProblem(@PathVariable("id") UUID id);
}
