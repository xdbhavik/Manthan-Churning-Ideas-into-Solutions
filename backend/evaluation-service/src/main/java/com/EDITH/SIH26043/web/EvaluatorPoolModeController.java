package com.EDITH.SIH26043.web;

import com.EDITH.SIH26043.config.OpenApiConfig;
import com.EDITH.SIH26043.enums.EvaluatorType;
import com.EDITH.SIH26043.security.AuthUser;
import com.EDITH.SIH26043.service.EvaluatorPoolModeService;
import com.EDITH.SIH26043.web.dto.PoolModeResponse;
import com.EDITH.SIH26043.web.dto.PoolModeUpdateRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * The per-pool MANUAL/AUTO switch.
 *
 * <p>Five independent switches — one per {@link EvaluatorType} — because each
 * department decides for itself whether its own evaluators score a problem or
 * the AI does. The evaluator of a pool controls that pool's switch and nobody
 * else's; ADMIN is the override. That finer check lives in
 * {@code EvaluatorPoolModeService.requireCanControl}, since a {@code @PreAuthorize}
 * expression cannot see which pool the caller evaluates for.</p>
 */
@Tag(name = OpenApiConfig.TAG_EVALUATION)
@RestController
@RequestMapping("/evaluation/pool-modes")
@PreAuthorize("hasAnyRole('EVALUATOR','ADMIN')")
public class EvaluatorPoolModeController {

    private final EvaluatorPoolModeService poolModeService;

    public EvaluatorPoolModeController(EvaluatorPoolModeService poolModeService) {
        this.poolModeService = poolModeService;
    }

    @Operation(
            summary = "🔀 Read the five MANUAL/AUTO switches",
            description = """
                    🔒 **EVALUATOR or ADMIN**
                    All five pools in a fixed order, each with its current mode and two hints
                    that make flipping it an informed decision: `aiScoringAvailable` (is a model
                    configured and is auto-scoring enabled) and `activeHumanEvaluators` (how many
                    people that pool could route to). A pool with no stored row reads as MANUAL,
                    so the default behaviour is unchanged until someone flips a switch. `note`
                    spells out what the current combination means — including the case where an
                    AUTO pool will quietly degrade to a human because the model is unavailable.""")
    @GetMapping
    public List<PoolModeResponse> modes() {
        return poolModeService.modes();
    }

    @Operation(
            summary = "🔀 Flip one pool's switch",
            description = """
                    🔒 **EVALUATOR of that pool, or ADMIN**
                    Turns AI scoring for one department on (`AUTO`) or off (`MANUAL`). The switch
                    is per pool — `GOVERNMENT`, `INDUSTRY`, `HEI`, `CITIZEN`, `COMMUNITY` are
                    independent, and an evaluator may only change their own pool's. Set to AUTO,
                    the next analyze/routing pass has that pool's criteria scored and submitted by
                    the pool's system AI evaluator, with no human in the loop; if the model is
                    unreachable that run degrades that pool back to a human and audits why. The
                    change is audited (`EVALUATION_MODE_CHANGED`).""")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "✅ Switch updated",
                    content = @Content(schema = @Schema(implementation = PoolModeResponse.class))),
            @ApiResponse(responseCode = "400", description = "Unknown pool or missing mode"),
            @ApiResponse(responseCode = "403",
                    description = "Not an ADMIN, and not the evaluator who owns this pool")
    })
    @PutMapping("/{pool}")
    public PoolModeResponse setMode(@PathVariable EvaluatorType pool,
                                    @Valid @RequestBody PoolModeUpdateRequest body,
                                    @AuthenticationPrincipal AuthUser me,
                                    HttpServletRequest http) {
        return poolModeService.setMode(pool, body.mode(), me.getUserId(), me.getRole(),
                clientIp(http));
    }

    private String clientIp(HttpServletRequest http) {
        String xff = http.getHeader("X-Forwarded-For");
        return xff != null ? xff.split(",")[0].trim() : http.getRemoteAddr();
    }
}
