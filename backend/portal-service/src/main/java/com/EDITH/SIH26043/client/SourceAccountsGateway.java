package com.EDITH.SIH26043.client;

import com.EDITH.SIH26043.exception.ApiException;
import com.EDITH.SIH26043.internal.SourceAccountDetail;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClientException;

import java.util.List;
import java.util.UUID;

/**
 * Thin wrapper over {@link SourceAccountsApi} that turns upstream failures into
 * domain errors portal callers understand:
 *
 * <ul>
 *   <li>upstream 404 (user has no source accounts / user gone) → empty list;</li>
 *   <li>any other upstream error status → 502 (bad gateway);</li>
 *   <li>connect/timeout failure (source-service down) → 503.</li>
 * </ul>
 */
@Service
public class SourceAccountsGateway {

    private final SourceAccountsApi api;

    public SourceAccountsGateway(SourceAccountsApi api) {
        this.api = api;
    }

    public List<SourceAccountDetail> listByOwner(UUID userId) {
        try {
            return api.listByOwner(userId);
        } catch (HttpStatusCodeException e) {
            if (e.getStatusCode().value() == 404) {
                return List.of();
            }
            throw new ApiException(HttpStatus.BAD_GATEWAY,
                    "Source service error (" + e.getStatusCode().value()
                            + ") while listing accounts for user " + userId);
        } catch (RestClientException e) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Source service unreachable; cannot classify user " + userId);
        }
    }
}
