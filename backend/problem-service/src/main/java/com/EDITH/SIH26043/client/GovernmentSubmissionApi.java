package com.EDITH.SIH26043.client;

import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.service.annotation.HttpExchange;
import org.springframework.web.service.annotation.PostExchange;

import java.util.UUID;

@HttpExchange
public interface GovernmentSubmissionApi {
    @PostExchange("/internal/problem-submissions")
    void assign(@RequestHeader("X-Internal-Service-Key") String serviceKey,
                @RequestBody GovernmentSubmissionRequest request);

    record GovernmentSubmissionRequest(UUID problemId, UUID submitterUserId) { }
}
