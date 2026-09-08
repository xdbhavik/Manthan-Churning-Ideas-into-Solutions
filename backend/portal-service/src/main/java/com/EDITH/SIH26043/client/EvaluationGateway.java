package com.EDITH.SIH26043.client;

import com.EDITH.SIH26043.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClientException;

/**
 * Thin wrapper over {@link EvaluationApi} for opening project reviews. Upstream
 * failures surface to the submission flow so it can roll back rather than persist
 * a SUBMITTED-without-review state:
 *
 * <ul>
 *   <li>upstream 409 (problem not evaluated — no scoring assignment to review)
 *       → 409 ApiException so the caller can report it;</li>
 *   <li>any other upstream error status → 502 (bad gateway);</li>
 *   <li>connect/timeout failure (evaluation-service down) → 503.</li>
 * </ul>
 */
@Service
public class EvaluationGateway {

    private final EvaluationApi api;

    public EvaluationGateway(EvaluationApi api) {
        this.api = api;
    }

    public ProjectReviewCreateResponse createProjectReview(ProjectReviewCreateRequest request) {
        try {
            return api.createProjectReview(request);
        } catch (HttpStatusCodeException e) {
            if (e.getStatusCode().value() == 409) {
                throw new ApiException(HttpStatus.CONFLICT,
                        "Problem has not been evaluated; cannot open a review");
            }
            throw new ApiException(HttpStatus.BAD_GATEWAY,
                    "Evaluation service error (" + e.getStatusCode().value()
                            + ") while opening project review for submission "
                            + request.submissionId());
        } catch (RestClientException e) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Evaluation service unreachable; cannot open project review for submission "
                            + request.submissionId());
        }
    }
}
