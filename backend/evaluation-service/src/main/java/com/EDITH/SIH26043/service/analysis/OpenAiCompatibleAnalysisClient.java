package com.EDITH.SIH26043.service.analysis;

import com.EDITH.SIH26043.enums.AnalysisStatus;
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
 * Real LLM call against an OpenAI-compatible endpoint (chat/completions) — the
 * project's Anthropic call was swapped out for a local model served by an
 * OpenAI-compatible router (base URL {@code …/v1}, model id, Bearer API key).
 * Produces the structured problem profile (§13.3/§13.4) as strict JSON.
 *
 * <p>Never throws to the pipeline: any failure (missing key, HTTP error,
 * non-JSON output, missing required keys) is retried {@code maxRetries} times
 * and then reported as {@link Optional#empty()} so the caller falls back to
 * {@link HeuristicAnalysisFallback}.</p>
 */
@Service
public class OpenAiCompatibleAnalysisClient implements ProblemAnalysisClient {

    private static final Logger log = LoggerFactory.getLogger(OpenAiCompatibleAnalysisClient.class);

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
    private final String baseUrl;
    private final String model;
    private final long maxTokens;
    private final int timeoutSeconds;
    private final int maxRetries;
    private final double temperature;
    private final boolean jsonResponseFormat;
    private final ObjectMapper objectMapper;

    private volatile RestClient restClient;

    public OpenAiCompatibleAnalysisClient(
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
    public Optional<AnalysisResult> analyze(ProblemContext context) {
        if (apiKey.isEmpty()) {
            log.info("No app.llm.openai.api-key configured; skipping LLM analysis");
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
                lastError = new IllegalStateException("LLM response missing required keys");
            } catch (RuntimeException e) {
                lastError = e;
                log.warn("LLM analysis attempt {}/{} failed: {}", attempt, attempts, e.getMessage());
            }
        }
        log.error("LLM analysis failed after {} attempts", attempts, lastError);
        return Optional.empty();
    }

    private Optional<AnalysisResult> callOnce(String payload) {
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
                "openai-compatible",
                model,
                AnalysisStatus.SUCCESS,
                parsed,
                null);
        return Optional.of(result);
    }

    /**
     * Pulls {@code choices[0].message.content} out of a chat/completions response.
     * Never throws — a missing/wrong-shaped field yields empty (caller retries/falls back).
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
            String text = content.isTextual() ? content.asText() : null;
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

    private String toJson(ProblemContext context) {
        try {
            return objectMapper.writeValueAsString(context);
        } catch (Exception e) {
            // Context is a simple record; serialization cannot realistically fail.
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

    private static String str(Object value) {
        return value == null ? null : String.valueOf(value);
    }
}
