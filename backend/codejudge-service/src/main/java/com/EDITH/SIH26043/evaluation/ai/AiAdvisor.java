package com.EDITH.SIH26043.evaluation.ai;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Advisory AI assessment against an OpenAI-compatible endpoint (chat/completions).
 *
 * <p>CodeJudge treats the AI as an <em>assessor, not a scorer</em>: it returns
 * qualitative strengths/weaknesses/suggestions that a human reviewer may read in
 * the report, and its output never flows into {@code final_score} (which comes
 * only from the deterministic rubric). When no API key is configured — the
 * default deployment — {@link #assess} returns empty and the pipeline records an
 * {@code UNAVAILABLE} row and continues on deterministic evidence.</p>
 */
@Component
public class AiAdvisor {

    private static final Logger log = LoggerFactory.getLogger(AiAdvisor.class);

    private static final String SYSTEM_PROMPT = """
            You are a code reviewer advising human evaluators of a government
            innovation-hackathon project. You are shown deterministic repository
            evidence (presence signals, category scores, security findings).
            Respond with ONLY a valid JSON object, no prose and no markdown fences,
            with exactly these keys:
            {"strengths":["..."],"weaknesses":["..."],"improvementSuggestions":["..."],"note":"..."}
            Do NOT assign a numeric score, rank, or verdict — the final mark is the
            deterministic engine's job. If you cannot assess, set note accordingly.""";
    private static final List<String> REQUIRED_KEYS = List.of("strengths", "weaknesses");

    private final String apiKey;
    private final String baseUrl;
    private final String model;
    private final int maxTokens;
    private final int timeoutSeconds;
    private final double temperature;
    private final ObjectMapper objectMapper;

    private volatile RestClient restClient;

    public AiAdvisor(@Value("${app.llm.openai.api-key:}") String apiKey,
                     @Value("${app.llm.openai.base-url:http://localhost:20128/v1}") String baseUrl,
                     @Value("${app.llm.openai.model:agentrouter/deepseek-v4-flash}") String model,
                     @Value("${app.llm.openai.max-tokens:4096}") int maxTokens,
                     @Value("${app.llm.openai.timeout-seconds:60}") int timeoutSeconds,
                     @Value("${app.llm.openai.temperature:0.2}") double temperature,
                     ObjectMapper objectMapper) {
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.baseUrl = baseUrl == null ? "" : baseUrl.trim();
        this.model = model;
        this.maxTokens = maxTokens;
        this.timeoutSeconds = timeoutSeconds;
        this.temperature = temperature;
        this.objectMapper = objectMapper;
    }

    public String model() {
        return model;
    }

    public boolean configured() {
        return !apiKey.isEmpty();
    }

    public Optional<Map<String, Object>> assess(String evidenceSummary) {
        if (!configured()) {
            return Optional.empty();
        }
        try {
            Map<String, Object> parsed = callOnce(evidenceSummary);
            for (String key : REQUIRED_KEYS) {
                if (!parsed.containsKey(key)) {
                    return Optional.empty();
                }
            }
            return Optional.of(parsed);
        } catch (RuntimeException e) {
            log.warn("AI advisory call failed: {}", e.getMessage());
            return Optional.empty();
        }
    }

    private Map<String, Object> callOnce(String evidenceSummary) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", model);
        body.put("messages", List.of(
                Map.of("role", "system", "content", SYSTEM_PROMPT),
                Map.of("role", "user", "content", evidenceSummary)));
        body.put("temperature", temperature);
        body.put("max_tokens", maxTokens);
        body.put("stream", false);
        body.put("response_format", Map.of("type", "json_object"));

        String raw = restClient().post()
                .uri("/chat/completions")
                .contentType(MediaType.APPLICATION_JSON)
                .body(write(body))
                .retrieve()
                .body(String.class);
        if (raw == null || raw.isBlank()) {
            throw new IllegalStateException("empty chat/completions response");
        }
        String text = extractContent(raw);
        if (text == null || text.isBlank()) {
            throw new IllegalStateException("empty content in chat/completions response");
        }
        return parseJson(text);
    }

    private String extractContent(String raw) {
        try {
            JsonNode root = objectMapper.readTree(raw);
            JsonNode choices = root.path("choices");
            if (!choices.isArray() || choices.isEmpty()) {
                return null;
            }
            JsonNode message = choices.get(0).path("message");
            JsonNode content = message.path("content");
            return content.isTextual() ? content.asString() : null;
        } catch (Exception e) {
            return null;
        }
    }

    private Map<String, Object> parseJson(String text) {
        String json = text;
        if (json.startsWith("```")) {
            json = json.replaceFirst("^```(?:json)?\\s*", "");
            json = json.replaceFirst("\\s*```$", "");
        }
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {
            });
        } catch (Exception e) {
            throw new IllegalStateException("unparseable AI JSON: " + e.getMessage(), e);
        }
    }

    private String write(Map<String, Object> body) {
        try {
            return objectMapper.writeValueAsString(body);
        } catch (Exception e) {
            throw new IllegalStateException("cannot serialise AI request", e);
        }
    }

    private RestClient restClient() {
        RestClient current = restClient;
        if (current == null) {
            synchronized (this) {
                if (restClient == null) {
                    SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
                    factory.setConnectTimeout(Duration.ofSeconds(5));
                    factory.setReadTimeout(Duration.ofSeconds(timeoutSeconds));
                    restClient = RestClient.builder()
                            .baseUrl(baseUrl)
                            .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                            .requestFactory(factory)
                            .build();
                }
                current = restClient;
            }
        }
        return current;
    }
}
