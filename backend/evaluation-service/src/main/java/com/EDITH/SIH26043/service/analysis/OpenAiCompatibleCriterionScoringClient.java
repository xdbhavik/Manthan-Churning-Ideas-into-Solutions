package com.EDITH.SIH26043.service.analysis;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Real LLM scoring call against the same OpenAI-compatible endpoint the analysis
 * step uses ({@code chat/completions}, {@code app.llm.openai.*}, Bearer key).
 *
 * <p>This is the sibling of {@link OpenAiCompatibleAnalysisClient}, not a
 * variant of it: that client's prompt forbids scoring outright, so the scoring
 * contract lives here with its own system prompt. The transport recipe —
 * lazy {@link RestClient}, retry loop, markdown-fence strip, {@code stream:false},
 * optional {@code response_format}, reasoning-model empty-content handling — is
 * deliberately identical so the two behave the same way in deployment.</p>
 *
 * <p>Never throws to the pipeline. Every failure (missing key, HTTP error,
 * unparseable body, a criterion scored outside 1..10) is retried
 * {@code maxRetries} times and then reported as {@link Optional#empty()} so the
 * caller degrades that pool to MANUAL instead of blocking the cycle.</p>
 */
@Service
public class OpenAiCompatibleCriterionScoringClient implements CriterionScoringClient {

    private static final Logger log =
            LoggerFactory.getLogger(OpenAiCompatibleCriterionScoringClient.class);

    /** Mirrors the CHECK constraint on {@code evaluation_response.score}. */
    private static final int MIN_SCORE = 1;
    private static final int MAX_SCORE = 10;

    /** Mirrors the column widths on {@code evaluation_assignment}. */
    private static final int RECOMMENDATION_MAX = 255;
    private static final int FEEDBACK_MAX = 4000;

    private static final String SYSTEM_PROMPT = """
            You are an expert evaluator on a government problem-evaluation panel. Score the given
            problem against EVERY criterion supplied, and return ONLY a valid JSON object with
            exactly these keys (no prose, no markdown fences):
            {"scores":{"<criterionKey>":{"score":<integer>,"comment":"<one or two sentences>"}},
             "feedback":"<two or three sentences>","recommendation":"<short verdict>"}
            Rules:
            - Include every criterionKey from the request exactly once. Never add keys of your own.
            - Every score is an integer from 1 to 10 and must not exceed that criterion's maxScore.
            - Judge only from the evidence in the problem context and the advisory analysis. When
              the evidence is thin, score conservatively and say so in that criterion's comment.
            - Calibrate: 1 = absent or very weak, 5 = adequate, 10 = exceptional. Do not give every
              criterion the same score, and do not inflate.
            - "feedback" is your overall assessment of the problem; "recommendation" is a short
              verdict such as "Prioritize for pilot".
            Adopt the perspective of the pool named in the request — its criteria are the lens.""";

    private final String apiKey;
    private final String baseUrl;
    private final String model;
    private final long maxTokens;
    private final int timeoutSeconds;
    private final int maxRetries;
    private final double temperature;
    private final boolean jsonResponseFormat;
    private final ObjectMapper objectMapper;

    private volatile RestClient restClient;

    public OpenAiCompatibleCriterionScoringClient(
            @Value("${app.llm.openai.api-key:}") String apiKey,
            @Value("${app.llm.openai.base-url:http://localhost:20128/v1}") String baseUrl,
            @Value("${app.llm.openai.model:agentrouter/deepseek-v4-flash}") String model,
            @Value("${app.llm.openai.max-tokens:4096}") long maxTokens,
            @Value("${app.llm.openai.timeout-seconds:60}") int timeoutSeconds,
            @Value("${app.llm.openai.max-retries:1}") int maxRetries,
            @Value("${app.llm.openai.temperature:0.2}") double temperature,
            @Value("${app.llm.openai.json-response-format:true}") boolean jsonResponseFormat,
            ObjectMapper objectMapper) {
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.baseUrl = baseUrl == null ? "" : baseUrl.trim();
        this.model = model;
        this.maxTokens = maxTokens;
        this.timeoutSeconds = timeoutSeconds;
        this.maxRetries = maxRetries;
        this.temperature = temperature;
        this.jsonResponseFormat = jsonResponseFormat;
        this.objectMapper = objectMapper;
    }

    @Override
    public boolean configured() {
        return !apiKey.isEmpty();
    }

    @Override
    public Optional<CriterionScoringResult> score(CriterionScoringRequest request) {
        if (apiKey.isEmpty()) {
            log.info("No app.llm.openai.api-key configured; skipping AI scoring for pool {}",
                    request.pool());
            return Optional.empty();
        }
        String payload = toJson(request);
        int attempts = Math.max(1, maxRetries + 1);
        RuntimeException lastError = null;
        for (int attempt = 1; attempt <= attempts; attempt++) {
            try {
                Optional<CriterionScoringResult> result = callOnce(payload, request);
                if (result.isPresent()) {
                    return result;
                }
                lastError = new IllegalStateException("LLM response unusable for scoring");
            } catch (RuntimeException e) {
                lastError = e;
                log.warn("LLM scoring attempt {}/{} for pool {} failed: {}",
                        attempt, attempts, request.pool(), e.getMessage());
            }
        }
        log.error("LLM scoring failed for pool {} after {} attempts", request.pool(), attempts,
                lastError);
        return Optional.empty();
    }

    private Optional<CriterionScoringResult> callOnce(String payload,
                                                      CriterionScoringRequest request) {
        Map<String, Object> requestBody = new LinkedHashMap<>();
        requestBody.put("model", model);
        requestBody.put("messages", List.of(
                Map.of("role", "system", "content", SYSTEM_PROMPT),
                Map.of("role", "user", "content", payload)));
        requestBody.put("temperature", temperature);
        requestBody.put("max_tokens", maxTokens);
        // Explicit: some routers (incl. the local one) stream Server-Sent Events by
        // default, which this single-shot parser cannot read.
        requestBody.put("stream", false);
        if (jsonResponseFormat) {
            requestBody.put("response_format", Map.of("type", "json_object"));
        }

        String raw;
        try {
            raw = restClient().post()
                    .uri("/chat/completions")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(objectMapper.writeValueAsString(requestBody))
                    .retrieve()
                    .body(String.class);
        } catch (Exception e) {
            throw new IllegalStateException("OpenAI-compatible request failed: " + e.getMessage(), e);
        }
        if (raw == null || raw.isBlank()) {
            return Optional.empty();
        }

        String text = extractContent(raw);
        if (text == null || text.isBlank()) {
            return Optional.empty();
        }

        Map<String, Object> parsed = parseStrict(text);
        Object rawScores = parsed.get("scores");
        if (!(rawScores instanceof Map<?, ?> scores) || scores.isEmpty()) {
            return Optional.empty();
        }

        // Only keys this pool actually asked for survive: a hallucinated extra key
        // is dropped here, and a genuinely missing one is caught by the caller
        // (which requires the full catalog) — either way no partial scorecard is
        // ever persisted.
        Map<String, Integer> scoresByKey = new LinkedHashMap<>();
        Map<String, String> commentsByKey = new LinkedHashMap<>();
        for (CriterionScoringRequest.CriterionSpec criterion : request.criteria()) {
            Object entry = scores.get(criterion.criterionKey());
            if (!(entry instanceof Map<?, ?> map)) {
                continue;
            }
            Integer score = asScore(map.get("score"));
            if (score == null) {
                // Out-of-range or non-numeric for ANY requested criterion invalidates
                // the whole answer: a silently clamped score would be a fabricated one.
                log.warn("Pool {}: criterion '{}' scored {}, outside {}..{} (or not a number)",
                        request.pool(), criterion.criterionKey(), map.get("score"),
                        MIN_SCORE, MAX_SCORE);
                return Optional.empty();
            }
            scoresByKey.put(criterion.criterionKey(), score);
            Object comment = map.get("comment");
            if (comment != null) {
                commentsByKey.put(criterion.criterionKey(), String.valueOf(comment));
            }
        }
        if (scoresByKey.isEmpty()) {
            return Optional.empty();
        }

        return Optional.of(new CriterionScoringResult(
                scoresByKey,
                commentsByKey,
                truncate(str(parsed.get("feedback")), FEEDBACK_MAX),
                truncate(str(parsed.get("recommendation")), RECOMMENDATION_MAX),
                "openai-compatible",
                model));
    }

    /**
     * Pulls {@code choices[0].message.content} out of a chat/completions response.
     * Never throws — a missing/wrong-shaped field yields null (caller retries/degrades).
     *
     * <p>Reasoning models spend the {@code max_tokens} budget on {@code reasoning_content}
     * first, so a truncated answer arrives as an empty {@code content} with
     * {@code finish_reason=length}. Log that distinctly — it means "raise max-tokens",
     * not "the endpoint is down".</p>
     */
    private String extractContent(String raw) {
        try {
            JsonNode root = objectMapper.readTree(raw);
            JsonNode choices = root.path("choices");
            if (!choices.isArray() || choices.isEmpty()) {
                return null;
            }
            JsonNode choice = choices.get(0);
            JsonNode message = choice.path("message");
            if (!message.isObject()) {
                return null;
            }
            JsonNode content = message.path("content");
            String text = content.isTextual() ? content.asString() : null;
            if (text == null || text.isBlank()) {
                log.warn("LLM returned empty content (finish_reason={}); consider raising app.llm.openai.max-tokens",
                        choice.path("finish_reason").asString(""));
                return null;
            }
            return text;
        } catch (Exception e) {
            return null;
        }
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
            throw new IllegalStateException("Unparseable LLM JSON response: " + e.getMessage(), e);
        }
    }

    private String toJson(CriterionScoringRequest request) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("pool", request.pool() == null ? null : request.pool().name());
        payload.put("problem", request.problem());
        payload.put("advisoryAnalysis", request.advisory());
        List<Map<String, Object>> criteria = new ArrayList<>();
        for (CriterionScoringRequest.CriterionSpec criterion : request.criteria()) {
            Map<String, Object> spec = new LinkedHashMap<>();
            spec.put("criterionKey", criterion.criterionKey());
            spec.put("label", criterion.criterionLabel());
            spec.put("description", criterion.description());
            spec.put("maxScore", criterion.maxScore());
            criteria.add(spec);
        }
        payload.put("criteria", criteria);
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (Exception e) {
            // Every component is a simple record/collection; this cannot realistically fail.
            return "{}";
        }
    }

    private RestClient restClient() {
        RestClient current = restClient;
        if (current == null) {
            synchronized (this) {
                if (restClient == null) {
                    SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
                    requestFactory.setConnectTimeout(Duration.ofSeconds(5));
                    requestFactory.setReadTimeout(Duration.ofSeconds(timeoutSeconds));
                    restClient = RestClient.builder()
                            .baseUrl(baseUrl)
                            .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                            .requestFactory(requestFactory)
                            .build();
                }
                current = restClient;
            }
        }
        return current;
    }

    /** A strict 1..10 integer, or null when the value is anything else. */
    private static Integer asScore(Object value) {
        Integer score = null;
        if (value instanceof Number n) {
            score = n.intValue();
        } else if (value instanceof String s && !s.isBlank()) {
            try {
                score = Integer.valueOf(s.trim());
            } catch (NumberFormatException e) {
                return null;
            }
        }
        if (score == null || score < MIN_SCORE || score > MAX_SCORE) {
            return null;
        }
        return score;
    }

    private static String truncate(String value, int max) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.length() <= max ? trimmed : trimmed.substring(0, max);
    }

    private static String str(Object value) {
        return value == null ? null : String.valueOf(value);
    }
}
