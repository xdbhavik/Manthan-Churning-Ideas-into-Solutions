package com.EDITH.SIH26043.client;

import com.EDITH.SIH26043.internal.ProblemContextResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;

import java.util.UUID;

/**
 * Thin wrapper over {@link ProblemContextApi}.
 *
 * <p><strong>Deliberately tolerant — the opposite of evaluation-service's
 * gateway.</strong> There, the problem context is a precondition (intake validates
 * the problem is REGISTERED and refuses otherwise), so upstream failure must
 * surface as an error. Here the snapshot is an <em>enrichment</em>: CodeJudge
 * evaluates a repository against a commit and can finish perfectly well with only
 * the caller-supplied {@code problemTitle}. Turning problem-service into a hard
 * dependency would mean an unrelated outage blocks every student submission.</p>
 *
 * <p>So every failure — 404, 5xx, connect/timeout, discovery miss — is logged and
 * swallowed into {@code null}. Callers must treat {@code null} as "no snapshot
 * available" and carry on.</p>
 */
@Service
public class ProblemContextGateway {

    private static final Logger log = LoggerFactory.getLogger(ProblemContextGateway.class);

    private final ProblemContextApi api;

    public ProblemContextGateway(ProblemContextApi api) {
        this.api = api;
    }

    /**
     * Fetch the problem snapshot, or {@code null} when problem-service cannot
     * supply one. Never throws for an upstream condition.
     */
    public ProblemContextResponse fetch(UUID problemId) {
        if (problemId == null) {
            return null;
        }
        try {
            return api.getProblem(problemId);
        } catch (RestClientException e) {
            log.warn("Problem context unavailable for problem {} ({}); continuing without a snapshot",
                    problemId, e.getMessage());
            return null;
        } catch (RuntimeException e) {
            // Belt-and-braces: an unexpected failure here must never cost the caller
            // its submission — the snapshot is optional by contract.
            log.warn("Unexpected failure fetching problem context for problem {} ({}); "
                    + "continuing without a snapshot", problemId, e.toString());
            return null;
        }
    }
}
