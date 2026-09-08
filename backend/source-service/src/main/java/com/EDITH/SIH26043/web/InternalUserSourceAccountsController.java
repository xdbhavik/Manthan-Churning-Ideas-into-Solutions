package com.EDITH.SIH26043.web;

import com.EDITH.SIH26043.internal.SourceAccountDetail;
import com.EDITH.SIH26043.service.SourceAccountLookupService;
import io.swagger.v3.oas.annotations.Hidden;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * Service-to-service endpoint consumed by portal-service to classify a caller as
 * a UNIVERSITY participant on first contact: the response lists every source
 * account a user owns, with the HEI institution name on those whose materialized
 * source is an {@code HEISource}. Never routed through the public gateway; only
 * reachable on the internal port.
 *
 * <p>Hidden from Swagger: it is not part of the public API contract.</p>
 */
@Hidden
@RestController
@RequestMapping("/internal/users")
public class InternalUserSourceAccountsController {

    private final SourceAccountLookupService sourceAccountLookupService;

    public InternalUserSourceAccountsController(SourceAccountLookupService sourceAccountLookupService) {
        this.sourceAccountLookupService = sourceAccountLookupService;
    }

    @GetMapping("/{userId}/source-accounts")
    public List<SourceAccountDetail> list(@PathVariable UUID userId) {
        return sourceAccountLookupService.listByOwner(userId);
    }
}
