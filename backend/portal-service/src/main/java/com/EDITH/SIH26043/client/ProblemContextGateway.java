package com.EDITH.SIH26043.client;

import com.EDITH.SIH26043.internal.ProblemContextResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;

import java.util.UUID;

@Service
public class ProblemContextGateway {
    private static final Logger log = LoggerFactory.getLogger(ProblemContextGateway.class);
    private final ProblemContextApi api;

    public ProblemContextGateway(ProblemContextApi api) {
        this.api = api;
    }

    /** Returns null on upstream failure; callers must fail closed for ownership checks. */
    public ProblemContextResponse fetch(UUID problemId) {
        try {
            return api.getProblem(problemId);
        } catch (RestClientException exception) {
            log.warn("Could not hydrate owner for published problem {}: {}", problemId, exception.getMessage());
            return null;
        }
    }
}
