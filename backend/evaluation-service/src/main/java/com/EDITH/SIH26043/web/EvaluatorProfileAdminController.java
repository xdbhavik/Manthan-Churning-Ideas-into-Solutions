package com.EDITH.SIH26043.web;

import com.EDITH.SIH26043.config.OpenApiConfig;
import com.EDITH.SIH26043.service.EvaluatorProfileAdminService;
import com.EDITH.SIH26043.web.dto.EvaluatorProfileRequest;
import com.EDITH.SIH26043.web.dto.EvaluatorProfileResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * ADMIN-only evaluator-profile management. A profile is created only after the
 * EVALUATOR user exists in source-service (that is the identity/phone record);
 * this endpoint supplies the pool + workload data routing needs.
 */
@Tag(name = OpenApiConfig.TAG_EVALUATION)
@RestController
@RequestMapping("/evaluation/evaluator-profiles")
@PreAuthorize("hasRole('ADMIN')")
public class EvaluatorProfileAdminController {

    private final EvaluatorProfileAdminService profileService;

    public EvaluatorProfileAdminController(EvaluatorProfileAdminService profileService) {
        this.profileService = profileService;
    }

    @Operation(
            summary = "🧑‍⚖️ Onboard an evaluator profile",
            description = """
                    🔒 **ADMIN only**
                    Binds a source-service `EVALUATOR` user (from `POST /users/evaluators`,
                    which returns its `userId`) to an evaluator profile in the evaluation
                    pool. `evaluatorType` decides which problems this evaluator is routed:
                    GOVT→GOVERNMENT, INDUSTRY→INDUSTRY, COMMUNITY→COMMUNITY, HEI→HEI,
                    CITIZEN→CITIZEN. Defaults: `maxWorkload=5`, `experienceYears=0`,
                    `active=true`. One profile per user.""")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "✅ Profile created",
                    content = @Content(schema = @Schema(implementation = EvaluatorProfileResponse.class))),
            @ApiResponse(responseCode = "400", description = "Validation failure"),
            @ApiResponse(responseCode = "403", description = "Not ADMIN"),
            @ApiResponse(responseCode = "409", description = "A profile already exists for this user")
    })
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public EvaluatorProfileResponse create(@Valid @RequestBody EvaluatorProfileRequest req) {
        return EvaluatorProfileResponse.from(profileService.create(req));
    }
}
