package com.EDITH.SIH26043.client;

import com.EDITH.SIH26043.exception.ApiException;
import com.EDITH.SIH26043.internal.SourceAccountResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClientException;

import java.util.UUID;

/**
 * Thin wrapper over {@link SourceAccountApi} that turns upstream failures into
 * domain errors problem intake understands:
 *
 * <ul>
 *   <li>upstream 404 (account no longer exists) → 404 ApiException;</li>
 *   <li>any other upstream error status → 502 (bad gateway);</li>
 *   <li>connect/timeout failure (source-service down) → 503.</li>
 * </ul>
 */
@Service
public class SourceAccountGateway {

    private final SourceAccountApi api;

    public SourceAccountGateway(SourceAccountApi api) {
        this.api = api;
    }

    public SourceAccountResponse fetch(UUID sourceAccountId) {
        try {
            return api.getSourceAccount(sourceAccountId);
        } catch (HttpStatusCodeException e) {
            if (e.getStatusCode().value() == 404) {
                throw new ApiException(HttpStatus.NOT_FOUND,
                        "Source account not found");
            }
            throw new ApiException(HttpStatus.BAD_GATEWAY,
                    "Source service error (" + e.getStatusCode().value()
                            + ") while fetching source account " + sourceAccountId);
        } catch (RestClientException e) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Source service unreachable; cannot verify source account "
                            + sourceAccountId);
        }
    }
}
