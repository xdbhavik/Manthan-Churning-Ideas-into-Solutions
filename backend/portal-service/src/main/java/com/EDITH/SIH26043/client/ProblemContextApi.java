package com.EDITH.SIH26043.client;

import com.EDITH.SIH26043.internal.ProblemContextResponse;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.service.annotation.GetExchange;
import org.springframework.web.service.annotation.HttpExchange;

import java.util.UUID;

@HttpExchange
public interface ProblemContextApi {
    @GetExchange("/internal/problems/{id}")
    ProblemContextResponse getProblem(@PathVariable("id") UUID problemId);
}
