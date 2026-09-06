package com.EDITH.SIH26043.web;

import com.EDITH.SIH26043.config.OpenApiConfig;
import com.EDITH.SIH26043.entity.SourceAccount;
import com.EDITH.SIH26043.entity.User;
import com.EDITH.SIH26043.enums.UserRole;
import com.EDITH.SIH26043.exception.ApiException;
import com.EDITH.SIH26043.repository.SourceAccountRepository;
import com.EDITH.SIH26043.web.dto.SourceAccountResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
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
@Tag(name = OpenApiConfig.TAG_SOURCE_ACCOUNTS)
@RestController
@RequestMapping("/source/accounts")
public class SourceAccountController {

    private final SourceAccountRepository sourceAccountRepository;

    public SourceAccountController(SourceAccountRepository sourceAccountRepository) {
        this.sourceAccountRepository = sourceAccountRepository;
    }

    @Operation(
            summary = "🏢 List my source accounts",
            description = """
                    Returns every verified **SourceAccount** the caller owns, newest first.  
                    👉 The returned `sourceAccountId` values are what you pass to `POST /problems`  
                    as the handle under which the submission is filed.

                    An account shows `canSubmit=true` only when it is both `ACTIVE` + `VERIFIED`.""")
    @ApiResponse(responseCode = "200", description = "Account listing (may be empty if no registrations approved yet)")
    @GetMapping
    public List<SourceAccountResponse> mine(@AuthenticationPrincipal User me) {
        return sourceAccountRepository.findByOwnerUserIdOrderByCreatedAtDesc(me.getUserId())
                .stream()
                .map(SourceAccountResponse::from)
                .toList();
    }

    @Operation(
            summary = "🔍 Get source account",
            description = "Owners see their own accounts; REVIEWER/ADMIN see any account.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Account details with status + verification state"),
            @ApiResponse(responseCode = "403", description = "Not your account (and you are not staff)"),
            @ApiResponse(responseCode = "404", description = "No such source account ID")
    })
    @GetMapping("/{id}")
    public SourceAccountResponse get(
            @Parameter(description = "SourceAccount UUID", required = true)
            @PathVariable UUID id,
            @AuthenticationPrincipal User me) {
        SourceAccount account = sourceAccountRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Source account not found"));
        boolean staff = me.getRole() == UserRole.REVIEWER || me.getRole() == UserRole.ADMIN;
        if (!staff && !account.getOwnerUserId().equals(me.getUserId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Not your source account");
        }
        return SourceAccountResponse.from(account);
    }
}
