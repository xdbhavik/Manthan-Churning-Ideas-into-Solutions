package com.EDITH.SIH26043.web;

import com.EDITH.SIH26043.entity.SourceAccount;
import com.EDITH.SIH26043.entity.User;
import com.EDITH.SIH26043.enums.UserRole;
import com.EDITH.SIH26043.exception.ApiException;
import com.EDITH.SIH26043.repository.SourceAccountRepository;
import com.EDITH.SIH26043.web.dto.SourceAccountResponse;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * Read-only view of the caller's source accounts. This is how a client learns
 * the {@code sourceAccountId} that POST /problems requires.
 */
@RestController
@RequestMapping("/source/accounts")
public class SourceAccountController {

    private final SourceAccountRepository sourceAccountRepository;

    public SourceAccountController(SourceAccountRepository sourceAccountRepository) {
        this.sourceAccountRepository = sourceAccountRepository;
    }

    @GetMapping
    public List<SourceAccountResponse> mine(@AuthenticationPrincipal User me) {
        return sourceAccountRepository.findByOwnerUserIdOrderByCreatedAtDesc(me.getUserId())
                .stream()
                .map(SourceAccountResponse::from)
                .toList();
    }

    @GetMapping("/{id}")
    public SourceAccountResponse get(@PathVariable UUID id, @AuthenticationPrincipal User me) {
        SourceAccount account = sourceAccountRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Source account not found"));
        boolean staff = me.getRole() == UserRole.REVIEWER || me.getRole() == UserRole.ADMIN;
        if (!staff && !account.getOwnerUserId().equals(me.getUserId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Not your source account");
        }
        return SourceAccountResponse.from(account);
    }
}
