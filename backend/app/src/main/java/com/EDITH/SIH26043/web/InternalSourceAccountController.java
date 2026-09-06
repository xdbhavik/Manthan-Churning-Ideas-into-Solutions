package com.EDITH.SIH26043.web;

import com.EDITH.SIH26043.internal.SourceAccountResponse;
import com.EDITH.SIH26043.service.SourceAccountLookupService;
import io.swagger.v3.oas.annotations.Hidden;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Service-to-service endpoint consumed by problem-service to authorize problem
 * submissions. Never routed through the public gateway; only reachable on the
 * internal port.
 *
 * <p>Hidden from Swagger: it is not part of the public API contract.</p>
 */
@Hidden
@RestController
@RequestMapping("/internal/source-accounts")
public class InternalSourceAccountController {

    private final SourceAccountLookupService sourceAccountLookupService;

    public InternalSourceAccountController(SourceAccountLookupService sourceAccountLookupService) {
        this.sourceAccountLookupService = sourceAccountLookupService;
    }

    @GetMapping("/{id}")
    public SourceAccountResponse get(@PathVariable UUID id) {
        return sourceAccountLookupService.assemble(id);
    }
}
