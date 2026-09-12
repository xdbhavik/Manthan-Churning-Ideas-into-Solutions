package com.EDITH.SIH26043.service;

import com.EDITH.SIH26043.entity.Problem;
import com.EDITH.SIH26043.enums.ProblemAccessRule;
import com.EDITH.SIH26043.security.AuthUser;
import com.EDITH.SIH26043.web.dto.ProblemSubmitRequest;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Submission intake entry point. Its only job is to settle the audience for an
 * {@code AUTO_SELECTED_UNIVERSITIES} submission <em>before</em> the write
 * transaction opens, then delegate the actual persistence to
 * {@link ProblemCollectionEngine}.
 *
 * <p>This class exists because that resolution calls the model and can take up to
 * a minute: doing it inside {@code receiveSubmission} — which is
 * {@code @Transactional} against a pool of 10 — would pin a DB connection per
 * in-flight submission. Splitting it into a separate bean also means the engine's
 * proxy is a genuine cross-bean call, so {@code @Transactional} still applies
 * (self-invocation would silently bypass it).</p>
 *
 * <p>Deliberately <strong>not</strong> {@code @Transactional} itself.</p>
 */
@Service
public class ProblemSubmissionService {

    private final ProblemCollectionEngine engine;
    private final AutoUniversitySelectionService autoSelection;

    public ProblemSubmissionService(ProblemCollectionEngine engine,
                                    AutoUniversitySelectionService autoSelection) {
        this.engine = engine;
        this.autoSelection = autoSelection;
    }

    public Problem submit(ProblemSubmitRequest req, AuthUser submitter, String ip) {
        List<String> resolvedUniversities = null;
        if (ProblemCollectionEngine.effectiveAccessRule(req)
                == ProblemAccessRule.AUTO_SELECTED_UNIVERSITIES) {
            // Throws 400 if the audience cannot be resolved; nothing is written.
            resolvedUniversities = autoSelection.resolve(
                    req.title(), req.description(), req.domainIds());
        }
        return engine.receiveSubmission(req, submitter, ip, resolvedUniversities);
    }
}
