package com.EDITH.SIH26043.service.analysis;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Asks an OpenAI-compatible endpoint which of the seeded problem domains a
 * submission belongs to. This is the only AI step behind
 * {@code AUTO_SELECTED_UNIVERSITIES}; the model never names a university — the
 * university match is a deterministic intersection done in Java.
 *
 * <p>Same contract as the evaluation-service clients: never throws to the
 * caller. A missing key, HTTP failure, non-JSON body or missing {@code domainIds}
 * is retried {@code maxRetries} times and then reported as {@link Optional#empty()}.
 * A <em>present but empty</em> list is a different answer — the model replied but
 * named no domain — and the caller distinguishes the two.</p>
 */
@Service
public class OpenAiCompatibleDomainResolutionClient {

    private static final Logger log =
            LoggerFactory.getLogger(OpenAiCompatibleDomainResolutionClient.class);

    private static final String SYSTEM_PROMPT = """
            You classify a government problem statement into a fixed domain taxonomy.
            Return ONLY a valid JSON object of exactly this shape (no prose, no markdown fences):
            {"domainIds":["<uuid>","<uuid>"]}
            - Every id MUST be copied verbatim from the allowed list below. Never invent an id.
            - Choose 1 to 3 ids, most relevant first. Choose more than one only when the problem
              genuinely spans several domains.
            - If the statement is too vague to classify, return {"domainIds":[]}.
            You are assisting human evaluators. You MUST NOT score, rank, or recommend anything.""";

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

    public OpenAiCompatibleDomainResolutionClient(
            @Value("${app.llm.openai.api-key:}") String apiKey,
            @Value("${app.llm.openai.base-url:http://localhost:20128/v1}") String baseUrl,
            @Value("${app.llm.openai.model:agentrouter/deepseek-v4-flash}") String model,
            @Value("${app.llm.openai.max-tokens:8192}") long maxTokens,
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

    /** One row of the allowed taxonomy, as shown to the model. */
    public record DomainOption(UUID domainId, String domainName, String description) {
    }

    /**
     * @return the ids the model chose (present but possibly empty), or
     *         {@link Optional#empty()} when no usable answer could be obtained.
     */
    public Optional<List<String>> resolve(String title,
                                          String description,
                                          List<String> suggestedDomainNames,
                                          List<DomainOption> options) {
        if (!configured()) {
            log.info("No app.llm.openai.api-key configured; cannot resolve problem domains");
            return Optional.empty();
        }
        if (options == null || options.isEmpty()) {
            log.warn("No domain taxonomy supplied; cannot resolve problem domains");
            return Optional.empty();
        }
        String userContent = buildUserContent(title, description, suggestedDomainNames, options);

        int attempts = Math.max(1, maxRetries + 1);
        RuntimeException lastError = null;
        for (int attempt = 1; attempt <= attempts; attempt++) {
            try {
                Optional<List<String>> result = callOnce(userContent);
                if (result.isPresent()) {
                    return result;
                }
                lastError = new IllegalStateException("LLM response missing domainIds");
            } catch (RuntimeException e) {
                lastError = e;
                log.warn("Domain resolution attempt {}/{} failed: {}", attempt, attempts,
                        e.getMessage());
            }
        }
        log.error("Domain resolution failed after {} attempts", attempts, lastError);
        return Optional.empty();
    }

    public boolean configured() {
        return !apiKey.isEmpty();
    }

    private Optional<List<String>> callOnce(String userContent) {
        Map<String, Object> requestBody = new LinkedHashMap<>();
        requestBody.put("model", model);
        requestBody.put("messages", List.of(
                Map.of("role", "system", "content", SYSTEM_PROMPT),
                Map.of("role", "user", "content", userContent)));
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
        return parseDomainIds(text);
    }

    /**
     * Pulls {@code choices[0].message.content} out of a chat/completions response.
     * Never throws — a missing/wrong-shaped field yields null (caller retries).
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
                log.warn("LLM returned empty content (finish_reason={}); consider raising "
                                + "app.llm.openai.max-tokens",
                        choice.path("finish_reason").asString(""));
                return null;
            }
            return text;
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Reads the id list out of the model's JSON. Tolerates markdown fences and a
     * bare top-level array (some models drop the wrapper object). Any other shape
     * is unusable → empty, so the caller retries rather than routing on garbage.
     */
    private Optional<List<String>> parseDomainIds(String text) {
        String json = text;
        if (json.startsWith("```")) {
            json = json.replaceFirst("^```(?:json)?\\s*", "");
            json = json.replaceFirst("\\s*```$", "");
        }
        try {
            JsonNode root = objectMapper.readTree(json);
            JsonNode ids = root.isArray() ? root : root.path("domainIds");
            if (!ids.isArray()) {
                return Optional.empty();
            }
            List<String> collected = new ArrayList<>();
            for (JsonNode node : ids) {
                if (node != null && node.isTextual() && !node.asText().isBlank()) {
                    collected.add(node.asText().trim());
                }
            }
            return Optional.of(collected);
        } catch (Exception e) {
            throw new IllegalStateException("Unparseable LLM JSON response: " + e.getMessage(), e);
        }
    }

    private String buildUserContent(String title,
                                    String description,
                                    List<String> suggestedDomainNames,
                                    List<DomainOption> options) {
        StringBuilder sb = new StringBuilder();
        sb.append("Allowed domains (id | name | what it covers):\n");
        for (DomainOption option : options) {
            sb.append("- ").append(option.domainId()).append(" | ")
                    .append(option.domainName()).append(" | ")
                    .append(option.description() == null ? "" : option.description())
                    .append('\n');
        }
        sb.append("\nProblem title: ").append(title == null ? "" : title).append('\n');
        sb.append("Problem description: ").append(description == null ? "" : description).append('\n');
        if (suggestedDomainNames != null && !suggestedDomainNames.isEmpty()) {
            // Context only: the submitter's own pick is not binding, and the model is
            // free to disagree with it.
            sb.append("The submitter suggested these domains: ")
                    .append(String.join(", ", suggestedDomainNames))
                    .append(" (not binding; use your own reading of the text)\n");
        }
        sb.append("\nReturn the JSON object with the 1-3 most relevant ids.");
        return sb.toString();
    }

    private RestClient restClient() {
        RestClient current = restClient;
        if (current == null) {
            synchronized (this) {
                if (restClient == null) {
                    SimpleClientHttpRequestFactory requestFactory =
                            new SimpleClientHttpRequestFactory();
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
}
