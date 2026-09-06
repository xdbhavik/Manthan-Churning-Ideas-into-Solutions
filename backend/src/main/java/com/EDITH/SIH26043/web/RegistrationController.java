package com.EDITH.SIH26043.web;

import com.EDITH.SIH26043.entity.SourceRegistration;
import com.EDITH.SIH26043.entity.User;
import com.EDITH.SIH26043.service.RegistrationService;
import com.EDITH.SIH26043.service.SourceTypeCatalog;
import com.EDITH.SIH26043.web.dto.RegistrationCreateRequest;
import com.EDITH.SIH26043.web.dto.RegistrationHistoryResponse;
import com.EDITH.SIH26043.web.dto.RegistrationResponse;
import com.EDITH.SIH26043.web.dto.RegistrationStatusResponse;
import com.EDITH.SIH26043.web.dto.RegistrationUpdateRequest;
import com.EDITH.SIH26043.web.dto.SourceTypesResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * Source-side registration APIs. /source-types is public (wizard step 1);
 * POST /registration and GET /registration/{id}/status are public (new users
 * have no token yet). All other endpoints require authentication and are
 * owner-scoped in the service layer.
 */
@RestController
@RequestMapping("/registration")
public class RegistrationController {

    private final RegistrationService registrationService;
    private final SourceTypeCatalog sourceTypeCatalog;

    public RegistrationController(RegistrationService registrationService,
                                  SourceTypeCatalog sourceTypeCatalog) {
        this.registrationService = registrationService;
        this.sourceTypeCatalog = sourceTypeCatalog;
    }

    @GetMapping("/source-types")
    public SourceTypesResponse sourceTypes() {
        return SourceTypesResponse.from(sourceTypeCatalog.catalog());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public RegistrationResponse create(@Valid @RequestBody RegistrationCreateRequest req) {
        SourceRegistration created = registrationService.create(req);
        return RegistrationResponse.from(created);
    }

    /**
     * Public status check: applicants can poll their registration status
     * without logging in. Returns a lightweight view (id, status, comments).
     */
    @GetMapping("/{id}/status")
    public RegistrationStatusResponse status(@PathVariable UUID id) {
        SourceRegistration reg = registrationService.getStatus(id);
        return RegistrationStatusResponse.from(reg);
    }

    @GetMapping("/mine")
    public List<RegistrationResponse> mine(@AuthenticationPrincipal User me) {
        return registrationService.mine(me).stream()
                .map(RegistrationResponse::from)
                .toList();
    }

    @GetMapping("/{id}")
    public RegistrationResponse get(@PathVariable UUID id, @AuthenticationPrincipal User me) {
        return RegistrationResponse.from(registrationService.get(id, me));
    }

    @PatchMapping("/{id}")
    public RegistrationResponse update(@PathVariable UUID id,
                                       @Valid @RequestBody RegistrationUpdateRequest req,
                                       @AuthenticationPrincipal User me) {
        return RegistrationResponse.from(registrationService.update(id, req.source(), me));
    }

    @PostMapping("/{id}/submit")
    public RegistrationResponse submit(@PathVariable UUID id, @AuthenticationPrincipal User me) {
        return RegistrationResponse.from(registrationService.submit(id, me));
    }

    @GetMapping("/{id}/history")
    public List<RegistrationHistoryResponse> history(@PathVariable UUID id,
                                                     @AuthenticationPrincipal User me) {
        return RegistrationHistoryResponse.from(registrationService.history(id, me));
    }
}
