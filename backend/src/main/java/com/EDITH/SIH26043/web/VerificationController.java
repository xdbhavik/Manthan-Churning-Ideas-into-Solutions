package com.EDITH.SIH26043.web;

import com.EDITH.SIH26043.entity.SourceVerification;
import com.EDITH.SIH26043.entity.User;
import com.EDITH.SIH26043.service.SourceVerificationService;
import com.EDITH.SIH26043.web.dto.VerifySourceRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/** Records source identity checks (REVIEWER only, doc 11 sec 1). */
@RestController
@RequestMapping("/sources")
public class VerificationController {

    private final SourceVerificationService verificationService;

    public VerificationController(SourceVerificationService verificationService) {
        this.verificationService = verificationService;
    }

    @PostMapping("/{id}/verify")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('REVIEWER') or hasRole('ADMIN')")
    public SourceVerification verify(@PathVariable UUID id,
                                     @Valid @RequestBody VerifySourceRequest req,
                                     @AuthenticationPrincipal User me,
                                     jakarta.servlet.http.HttpServletRequest http) {
        return verificationService.verify(id, req, me, clientIp(http));
    }

    private String clientIp(jakarta.servlet.http.HttpServletRequest http) {
        String xff = http.getHeader("X-Forwarded-For");
        return xff != null ? xff.split(",")[0].trim() : http.getRemoteAddr();
    }
}