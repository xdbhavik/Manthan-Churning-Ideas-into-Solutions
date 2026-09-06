package com.EDITH.SIH26043.client;

import com.EDITH.SIH26043.internal.SourceAccountResponse;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.service.annotation.GetExchange;
import org.springframework.web.service.annotation.HttpExchange;

import java.util.UUID;

/**
 * Declarative HTTP client for source-service's internal source-account endpoint.
 * Implemented as a {@code RestClient}-backed proxy (see {@link SourceAccountClientConfig}).
 *
 * <p>{@code GET /internal/source-accounts/{id}} is served by the monolith until
 * Step 5, then by source-service. It is intentionally NOT routed through the
 * public gateway.</p>
 */
@HttpExchange
public interface SourceAccountApi {

    @GetExchange("/internal/source-accounts/{id}")
    SourceAccountResponse getSourceAccount(@PathVariable("id") UUID id);
}
