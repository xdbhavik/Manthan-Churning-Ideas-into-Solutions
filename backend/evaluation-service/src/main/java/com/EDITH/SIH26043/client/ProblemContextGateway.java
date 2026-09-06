package com.EDITH.SIH26043.client;

import com.EDITH.SIH26043.exception.ApiException;
import com.EDITH.SIH26043.internal.ProblemContextResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClientException;

import java.util.UUID;

/**
 * Thin wrapper over {@link ProblemContextApi} that turns upstream failures into
 * domain errors evaluation callers understand:
 *
 * <ul>
 *   <li>upstream 404 (problem no longer exists) → 404 ApiException;</li>
 *   <li>any other upstream error status → 502 (bad gateway);</li>
 *   <li>connect/timeout failure (problem-service down) → 503.</li>
 * </ul>
 */
@Service
public class ProblemContextGateway {

    private final ProblemContextApi api;

    public ProblemContextGateway(ProblemContextApi api) {
        this.api = api;
    }

    public ProblemContextResponse fetch(UUID problemId) {
        try {
            return api.getProblem(problemId);
        } catch (HttpStatusCodeException e) {
            if (e.getStatusCode().value() == 404) {
                throw new ApiException(HttpStatus.NOT_FOUND,
                        "Problem " + problemId + " not found");
            }
            throw new ApiException(HttpStatus.BAD_GATEWAY,
                    "Problem service error (" + e.getStatusCode().value()
                            + ") while fetching problem " + problemId);
        } catch (RestClientException e) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Problem service unreachable; cannot fetch problem " + problemId);
        }
    }
}
