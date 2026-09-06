package com.EDITH.SIH26043.service.analysis;

import java.util.Optional;

/**
 * Provider abstraction over the LLM analysis call. Implementations may return
 * {@link Optional#empty()} when the model is unreachable or the response cannot
 * be parsed — the caller then falls back to {@link HeuristicAnalysisFallback}.
 * Swappable so OpenAI/Local models can be substituted later without touching
 * the pipeline.
 */
public interface ProblemAnalysisClient {

    Optional<AnalysisResult> analyze(ProblemContext context);
}
