package com.EDITH.SIH26043.service.analysis;

import com.EDITH.SIH26043.enums.AnalysisStatus;
import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import com.anthropic.models.messages.Message;
import com.anthropic.models.messages.MessageCreateParams;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Real Anthropic Claude call via the official {@code anthropic-java} SDK.
 * Produces the structured problem profile (§13.3/§13.4) as strict JSON.
 *
 * <p>Never throws to the pipeline: any failure (missing key, SDK error,
 * non-JSON output, missing required keys) is retried {@code maxRetries} times
 * and then reported as {@link Optional#empty()} so the caller falls back to
 * {@link HeuristicAnalysisFallback}.</p>
 */
@Service
public class ClaudeProblemAnalysisClient implements ProblemAnalysisClient {

    private static final Logger log = LoggerFactory.getLogger(ClaudeProblemAnalysisClient.class);

    private static final List<String> REQUIRED_KEYS = List.of(
            "problemCategory", "domain", "sector", "impactAreas", "complexity",
            "potentialScale", "technologyRelevance", "socialImpact", "aiSummary");

    private static final String SYSTEM_PROMPT = """
            You are a government problem-analysis engine. Analyze the given problem and return
            ONLY a valid JSON object with exactly these keys (no prose, no markdown fences):
            {"problemCategory","domain","sector","impactAreas","complexity","potentialScale",
            "technologyRelevance","socialImpact","aiSummary"}
            - impactAreas is an array from this fixed vocabulary: HEALTH, LIVELIHOOD, EDUCATION,
              INFRASTRUCTURE, PUBLIC_SERVICE, ENVIRONMENT, SAFETY, DIGITAL, ECONOMIC, SOCIAL.
            - complexity, potentialScale, technologyRelevance and socialImpact each take one of
              LOW | MEDIUM | HIGH.
            - domain/sector should reuse the seeded domain taxonomy where possible.
            - aiSummary is a 2-3 sentence plain-text summary.
            You are assisting human evaluators. You MUST NOT score, rank, or recommend any
            evaluation score.""";

    private final String apiKey;
    private final String model;
    private final long maxTokens;
    private final int timeoutSeconds;
    private final int maxRetries;
    private final ObjectMapper objectMapper;

    private volatile AnthropicClient client;

    public ClaudeProblemAnalysisClient(
            @Value("${app.llm.anthropic.api-key:}") String apiKey,
            @Value("${app.llm.anthropic.model:claude-opus-5}") String model,
            @Value("${app.llm.anthropic.max-tokens:16000}") long maxTokens,
            @Value("${app.llm.anthropic.timeout-seconds:60}") int timeoutSeconds,
            @Value("${app.llm.anthropic.max-retries:1}") int maxRetries,
            ObjectMapper objectMapper) {
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.model = model;
        this.maxTokens = maxTokens;
        this.timeoutSeconds = timeoutSeconds;
        this.maxRetries = maxRetries;
        this.objectMapper = objectMapper;
    }

    @Override
    public Optional<AnalysisResult> analyze(ProblemContext context) {
        if (apiKey.isEmpty()) {
            log.info("No app.llm.anthropic.api-key configured; skipping Claude analysis");
            return Optional.empty();
        }
        String payload = toJson(context);
        int attempts = Math.max(1, maxRetries + 1);
        RuntimeException lastError = null;
        for (int attempt = 1; attempt <= attempts; attempt++) {
            try {
                Optional<AnalysisResult> result = callOnce(payload);
                if (result.isPresent()) {
                    return result;
                }
                lastError = new IllegalStateException("Claude response missing required keys");
            } catch (RuntimeException e) {
                lastError = e;
                log.warn("Claude analysis attempt {}/{} failed: {}", attempt, attempts, e.getMessage());
            }
        }
        log.error("Claude analysis failed after {} attempts", attempts, lastError);
        return Optional.empty();
    }

    private Optional<AnalysisResult> callOnce(String payload) {
        MessageCreateParams params = MessageCreateParams.builder()
                .model(model)
                .maxTokens(maxTokens)
                .system(SYSTEM_PROMPT)
                .addUserMessage(payload)
                .build();

        Message response = client().messages().create(params);

        String text = response.content().stream()
                .flatMap(block -> block.text().stream())
                .map(block -> block.text())
                .reduce("", (a, b) -> a + b)
                .trim();
        if (text.isEmpty()) {
            return Optional.empty();
        }

        Map<String, Object> parsed = parseStrict(text);
        for (String key : REQUIRED_KEYS) {
            if (!parsed.containsKey(key)) {
                return Optional.empty();
            }
        }

        List<String> impactAreas = new ArrayList<>();
        Object rawImpact = parsed.get("impactAreas");
        if (rawImpact instanceof List<?> list) {
            for (Object item : list) {
                if (item != null) {
                    impactAreas.add(String.valueOf(item));
                }
            }
        }

        AnalysisResult result = new AnalysisResult(
                str(parsed.get("problemCategory")),
                str(parsed.get("domain")),
                str(parsed.get("sector")),
                impactAreas,
                str(parsed.get("complexity")),
                str(parsed.get("potentialScale")),
                str(parsed.get("technologyRelevance")),
                str(parsed.get("socialImpact")),
                str(parsed.get("aiSummary")),
                "claude",
                model,
                AnalysisStatus.SUCCESS,
                parsed,
                null);
        return Optional.of(result);
    }

    private Map<String, Object> parseStrict(String text) {
        String json = text;
        if (json.startsWith("```")) {
            // Strip optional markdown fences the model may add despite the prompt.
            json = json.replaceFirst("^```(?:json)?\\s*", "");
            json = json.replaceFirst("\\s*```$", "");
        }
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {
            });
        } catch (Exception e) {
            throw new IllegalStateException("Unparseable Claude JSON response: " + e.getMessage(), e);
        }
    }

    private String toJson(ProblemContext context) {
        try {
            return objectMapper.writeValueAsString(context);
        } catch (Exception e) {
            // Context is a simple record; serialization cannot realistically fail.
            return "{}";
        }
    }

    private AnthropicClient client() {
        AnthropicClient current = client;
        if (current == null) {
            synchronized (this) {
                if (client == null) {
                    client = AnthropicOkHttpClient.builder()
                            .apiKey(apiKey)
                            .timeout(Duration.ofSeconds(timeoutSeconds))
                            .build();
                }
                current = client;
            }
        }
        return current;
    }

    private static String str(Object value) {
        return value == null ? null : String.valueOf(value);
    }
}
