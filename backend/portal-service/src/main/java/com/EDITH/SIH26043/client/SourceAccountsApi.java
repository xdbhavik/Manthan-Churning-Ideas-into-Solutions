package com.EDITH.SIH26043.client;

import com.EDITH.SIH26043.internal.SourceAccountDetail;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.service.annotation.GetExchange;
import org.springframework.web.service.annotation.HttpExchange;

import java.util.List;
import java.util.UUID;

/**
 * Declarative HTTP client for source-service's internal
 * {@code GET /internal/users/{userId}/source-accounts} endpoint. Implemented as a
 * {@code RestClient}-backed proxy (see {@link SourceAccountsClientConfig}).
 *
 * <p>portal-service calls this on first contact to classify a caller as a
 * UNIVERSITY participant: the first ACTIVE+VERIFIED account whose materialized
 * source is an {@code HEISource} names the institution.</p>
 */
@HttpExchange
public interface SourceAccountsApi {

    @GetExchange("/internal/users/{userId}/source-accounts")
    List<SourceAccountDetail> listByOwner(@PathVariable("userId") UUID userId);
}
