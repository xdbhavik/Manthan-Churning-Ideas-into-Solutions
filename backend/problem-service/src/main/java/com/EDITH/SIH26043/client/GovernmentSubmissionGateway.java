package com.EDITH.SIH26043.client;

import com.EDITH.SIH26043.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;

import java.util.UUID;

@Service
public class GovernmentSubmissionGateway {
    private final GovernmentSubmissionApi api;
    @Value("${app.internal.service-key:local-dev-internal-service-key}")
    private String serviceKey;

    public GovernmentSubmissionGateway(GovernmentSubmissionApi api) {
        this.api = api;
    }

    public void assign(UUID problemId, UUID submitterUserId) {
        try {
            api.assign(serviceKey,
                    new GovernmentSubmissionApi.GovernmentSubmissionRequest(problemId, submitterUserId));
        } catch (RestClientException e) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Problem saved, but routing to its evaluator pool failed; ask an ADMIN to retry routing");
        }
    }
}
