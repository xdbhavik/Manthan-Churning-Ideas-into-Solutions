package com.EDITH.SIH26043.service.analysis;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The domain resolver's transport contract, exercised against a real (in-JVM)
 * HTTP endpoint so the whole recipe runs: request shape, {@code choices[0].message
 * .content} extraction, markdown-fence tolerance, and the parse rules.
 *
 * <p>Two distinctions carry the weight. First, everything ends in
 * {@code Optional.empty()} rather than an exception, so a broken model can only
 * ever cost this one access rule. Second, "no answer" and "an answer with no
 * domains" are <em>different</em> results: the first is present-but-empty, and the
 * caller needs to tell them apart to explain the 400 it raises.</p>
 */
class OpenAiCompatibleDomainResolutionClientTest {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private static final UUID HEALTHCARE = UUID.fromString("00000000-0000-4000-8000-000000000001");
    private static final UUID WATER = UUID.fromString("00000000-0000-4000-8000-000000000003");

    private final AtomicInteger requests = new AtomicInteger();
    private final AtomicReference<String> body = new AtomicReference<>("{}");
    private final AtomicInteger status = new AtomicInteger(200);
    private final AtomicReference<String> lastRequestBody = new AtomicReference<>();

    private HttpServer server;

    @AfterEach
    void stopServer() {
        if (server != null) {
            server.stop(0);
        }
    }

    // ------------------------------------------------------------------ happy path

    @Test
    void aWellFormedAnswerBecomesDomainIds() {
        serveCompletion("{\"domainIds\":[\"" + HEALTHCARE + "\"]}");

        Optional<List<String>> result = client("test-key").resolve(
                "Hand pumps dry", "No drinking water in summer.", List.of(), options());

        assertThat(result).isPresent();
        assertThat(result.get()).containsExactly(HEALTHCARE.toString());
    }

    @Test
    void anAnswerWithNoDomainsIsPresentButEmpty() {
        serveCompletion("{\"domainIds\":[]}");

        Optional<List<String>> result = client("test-key").resolve(
                "Vague idea", "Something about a thing.", List.of(), options());

        assertThat(result).as("the model replied — that is not the same as being unavailable")
                .isPresent();
        assertThat(result.get()).isEmpty();
    }

    @Test
    void markdownFencesAreTolerated() {
        serveCompletion("```json\n{\"domainIds\":[\"" + WATER + "\"]}\n```");

        Optional<List<String>> result = client("test-key").resolve(
                "Saline borewell", "Groundwater is brackish.", List.of(), options());

        assertThat(result).isPresent();
        assertThat(result.get()).containsExactly(WATER.toString());
    }

    /** Some models drop the wrapper object; a bare array is still usable. */
    @Test
    void aBareTopLevelArrayIsTolerated() {
        serveCompletion("[\"" + WATER + "\"]");

        Optional<List<String>> result = client("test-key").resolve(
                "Saline borewell", "Groundwater is brackish.", List.of(), options());

        assertThat(result).isPresent();
        assertThat(result.get()).containsExactly(WATER.toString());
    }

    @Test
    void blankEntriesInsideTheListAreDropped() {
        serveCompletion("{\"domainIds\":[\"" + WATER + "\",\"  \",null]}");

        Optional<List<String>> result = client("test-key").resolve(
                "Saline borewell", "Groundwater is brackish.", List.of(), options());

        assertThat(result).isPresent();
        assertThat(result.get()).containsExactly(WATER.toString());
    }

    // ------------------------------------------------------------------ unusable answers

    @Test
    void aMissingDomainIdsKeyIsUnusable() {
        serveCompletion("{\"domains\":[\"healthcare\"]}");

        assertThat(client("test-key").resolve("T", "D", List.of(), options())).isEmpty();
    }

    @Test
    void unparseableJsonIsUnusable() {
        serveCompletion("I could not classify this problem.");

        assertThat(client("test-key").resolve("T", "D", List.of(), options())).isEmpty();
    }

    @Test
    void anEmptyContentIsUnusable() {
        serveCompletion("");

        assertThat(client("test-key").resolve("T", "D", List.of(), options())).isEmpty();
    }

    // ------------------------------------------------------------------ transport

    @Test
    void anEndpointErrorIsRetriedThenDegrades() {
        serveStatus(503, "{\"error\":\"boom\"}");

        assertThat(clientWithRetries("test-key", 1).resolve("T", "D", List.of(), options()))
                .isEmpty();
        assertThat(requests).as("one initial attempt plus one retry").hasValue(2);
    }

    @Test
    void withoutAnApiKeyNothingIsSent() {
        OpenAiCompatibleDomainResolutionClient unconfigured = newClient("", 0);

        assertThat(unconfigured.configured()).isFalse();
        assertThat(unconfigured.resolve("T", "D", List.of(), options())).isEmpty();
        assertThat(requests).as("no key → no call at all").hasValue(0);
    }

    @Test
    void aConfiguredKeyIsReported() {
        assertThat(client("test-key").configured()).isTrue();
    }

    @Test
    void anEmptyTaxonomyNeverCallsTheModel() {
        // Nothing to choose from; asking would only invite an invented id.
        assertThat(client("test-key").resolve("T", "D", List.of(), List.of())).isEmpty();
        assertThat(requests).hasValue(0);
    }

    // ------------------------------------------------------------------ request shape

    @Test
    void theRequestCarriesTheModelTheTaxonomyAndTheSubmitterHint() {
        serveCompletion("{\"domainIds\":[\"" + HEALTHCARE + "\"]}");

        client("test-key").resolve("Hand pumps dry", "No drinking water in summer.",
                List.of("Telemedicine", "Water & Sanitation"), options());

        String sent = lastRequestBody.get();
        assertThat(sent).contains("\"model\":\"test-model\"");
        assertThat(sent).contains("\"stream\":false");
        assertThat(sent).contains("\"response_format\":{\"type\":\"json_object\"}");
        assertThat(sent).contains(HEALTHCARE.toString()).contains("Healthcare");
        assertThat(sent).contains(WATER.toString()).contains("Water & Sanitation");
        // The submitter's pick is context the model may disagree with, not a constraint.
        assertThat(sent).contains("Telemedicine").contains("not binding");
        assertThat(sent).contains("Hand pumps dry").contains("No drinking water in summer.");
    }

    // ------------------------------------------------------------------ fixtures

    private List<OpenAiCompatibleDomainResolutionClient.DomainOption> options() {
        return List.of(
                new OpenAiCompatibleDomainResolutionClient.DomainOption(
                        HEALTHCARE, "Healthcare", "Medical services and wellness."),
                new OpenAiCompatibleDomainResolutionClient.DomainOption(
                        WATER, "Water & Sanitation", "Drinking water and waste."));
    }

    /** A successful chat/completions answer whose assistant content is {@code content}. */
    private void serveCompletion(String content) {
        Map<String, Object> responseBody = Map.of("choices", List.of(Map.of(
                "message", Map.of("role", "assistant", "content", content),
                "finish_reason", "stop")));
        serveStatus(200, MAPPER.writeValueAsString(responseBody));
    }

    private void serveStatus(int statusCode, String responseBody) {
        status.set(statusCode);
        body.set(responseBody);
    }

    private OpenAiCompatibleDomainResolutionClient client(String apiKey) {
        return clientWithRetries(apiKey, 0);
    }

    private OpenAiCompatibleDomainResolutionClient clientWithRetries(String apiKey, int maxRetries) {
        return newClient(apiKey, maxRetries);
    }

    /** Starts the stub endpoint (once per test) and points the client at it. */
    private OpenAiCompatibleDomainResolutionClient newClient(String apiKey, int maxRetries) {
        if (server == null) {
            try {
                server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            } catch (IOException e) {
                throw new IllegalStateException("could not start the stub endpoint", e);
            }
            server.createContext("/", exchange -> {
                requests.incrementAndGet();
                lastRequestBody.set(new String(exchange.getRequestBody().readAllBytes(),
                        StandardCharsets.UTF_8));
                byte[] bytes = body.get().getBytes(StandardCharsets.UTF_8);
                exchange.getResponseHeaders().add("Content-Type", "application/json");
                exchange.sendResponseHeaders(status.get(), bytes.length);
                exchange.getResponseBody().write(bytes);
                exchange.close();
            });
            server.start();
        }
        return new OpenAiCompatibleDomainResolutionClient(
                apiKey,
                "http://127.0.0.1:" + server.getAddress().getPort() + "/v1",
                "test-model",
                4096,
                5,
                maxRetries,
                0.2,
                true,
                MAPPER);
    }
}
