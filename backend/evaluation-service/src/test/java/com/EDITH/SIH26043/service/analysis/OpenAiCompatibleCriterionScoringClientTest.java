package com.EDITH.SIH26043.service.analysis;

import com.EDITH.SIH26043.enums.EvaluatorType;
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
 * The AI scorer's transport contract, exercised against a real (in-JVM) HTTP
 * endpoint so the whole recipe runs: request shape, {@code choices[0].message
 * .content} extraction, markdown-fence tolerance, and the parse rules.
 *
 * <p>The rule with the most weight here is that a bad answer is <em>rejected</em>,
 * never repaired: a score outside 1..10 or a non-numeric one invalidates the whole
 * response, because silently clamping it would be fabricating a score the model
 * never gave. Everything ends in {@code Optional.empty()} — never an exception —
 * so a broken model can only ever cost one pool its automation, not the cycle.</p>
 */
class OpenAiCompatibleCriterionScoringClientTest {

    private static final ObjectMapper MAPPER = new ObjectMapper();

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
    void aWellFormedAnswerBecomesAScorecard() {
        serveCompletion("""
                {"scores":{"impact":{"score":8,"comment":"wide reach"},
                           "feasibility":{"score":4,"comment":"needs a pilot"}},
                 "feedback":"Well-evidenced problem",
                 "recommendation":"SHORTLIST"}""");

        Optional<CriterionScoringResult> result = client("test-key").score(request());

        assertThat(result).isPresent();
        assertThat(result.get().scoresByKey())
                .containsEntry("impact", 8)
                .containsEntry("feasibility", 4);
        assertThat(result.get().commentsByKey()).containsEntry("impact", "wide reach");
        assertThat(result.get().feedback()).isEqualTo("Well-evidenced problem");
        assertThat(result.get().recommendation()).isEqualTo("SHORTLIST");
        assertThat(result.get().provider()).isEqualTo("openai-compatible");
        assertThat(result.get().model()).isEqualTo("test-model");
    }

    @Test
    void theRequestCarriesThePoolCriteriaAndTheJsonResponseFormat() {
        serveCompletion("""
                {"scores":{"impact":{"score":8},"feasibility":{"score":4}}}""");

        client("test-key").score(request());

        assertThat(requests).hasValue(1);
        String sent = lastRequestBody.get();
        assertThat(sent).contains("\"model\":\"test-model\"");
        assertThat(sent).contains("\"stream\":false");
        assertThat(sent).contains("\"response_format\":{\"type\":\"json_object\"}");
        // The problem + criteria travel as a JSON string inside messages[1].content, so
        // their own quotes arrive escaped; unescape before asserting on that shape.
        assertThat(sent.replace("\\\"", "\""))
                .contains("\"criterionKey\":\"impact\"")
                .contains("\"pool\":\"GOVERNMENT\"")
                .contains("\"maxScore\":10");
    }

    @Test
    void aMarkdownFencedAnswerIsTolerated() {
        serveCompletion("```json\n{\"scores\":{\"impact\":{\"score\":7},"
                + "\"feasibility\":{\"score\":3}}}\n```");

        Optional<CriterionScoringResult> result = client("test-key").score(request());

        assertThat(result).isPresent();
        assertThat(result.get().scoresByKey()).containsEntry("impact", 7);
    }

    @Test
    void aNumericStringScoreIsAccepted() {
        serveCompletion("{\"scores\":{\"impact\":{\"score\":\"9\"},\"feasibility\":{\"score\":4}}}");

        Optional<CriterionScoringResult> result = client("test-key").score(request());

        assertThat(result).isPresent();
        assertThat(result.get().scoresByKey()).containsEntry("impact", 9);
    }

    @Test
    void aHallucinatedCriterionIsDropped() {
        // An extra key the pool never asked for is ignored; a genuinely missing one is
        // the caller's business (it requires the full catalog), not the transport's.
        serveCompletion("""
                {"scores":{"impact":{"score":8},"made_up_criterion":{"score":10}}}""");

        Optional<CriterionScoringResult> result = client("test-key").score(request());

        assertThat(result).isPresent();
        assertThat(result.get().scoresByKey()).containsOnlyKeys("impact");
    }

    // ------------------------------------------------------------------ rejections

    @Test
    void aScoreOutsideOneToTenInvalidatesTheWholeAnswer() {
        serveCompletion("""
                {"scores":{"impact":{"score":42},"feasibility":{"score":4}}}""");

        assertThat(client("test-key").score(request())).isEmpty();
    }

    @Test
    void aNonNumericScoreInvalidatesTheWholeAnswer() {
        serveCompletion("""
                {"scores":{"impact":{"score":"very high"},"feasibility":{"score":4}}}""");

        assertThat(client("test-key").score(request())).isEmpty();
    }

    @Test
    void anEmptyContentIsNotAScorecard() {
        serveCompletion("");

        assertThat(client("test-key").score(request())).isEmpty();
    }

    @Test
    void unparseableJsonIsNotAScorecard() {
        serveCompletion("I could not score this problem.");

        assertThat(client("test-key").score(request())).isEmpty();
    }

    @Test
    void anAnswerWithNoScoresIsNotAScorecard() {
        serveCompletion("{\"feedback\":\"Nice problem\"}");

        assertThat(client("test-key").score(request())).isEmpty();
    }

    // ------------------------------------------------------------------ transport

    @Test
    void anEndpointErrorIsRetriedThenDegrades() {
        serveStatus(503, "{\"error\":\"boom\"}");

        assertThat(clientWithRetries("test-key", 1).score(request())).isEmpty();
        assertThat(requests).as("one initial attempt plus one retry").hasValue(2);
    }

    @Test
    void withoutAnApiKeyNothingIsSent() {
        OpenAiCompatibleCriterionScoringClient unconfigured = newClient("", 0);

        assertThat(unconfigured.configured()).isFalse();
        assertThat(unconfigured.score(request())).isEmpty();
        assertThat(requests).as("no key → no call at all").hasValue(0);
    }

    @Test
    void aConfiguredKeyIsReported() {
        assertThat(client("test-key").configured()).isTrue();
    }

    // ------------------------------------------------------------------ fixtures

    private CriterionScoringRequest request() {
        return new CriterionScoringRequest(
                EvaluatorType.GOVERNMENT,
                new ProblemContext(UUID.randomUUID(), "Irregular drinking water supply",
                        "Hand pumps dry during summer.", "GOVT", null, null, null, null, null,
                        null, null, List.of(), 0),
                List.of(
                        new CriterionScoringRequest.CriterionSpec("impact", "Impact", "Reach of the problem", 10),
                        new CriterionScoringRequest.CriterionSpec("feasibility", "Feasibility", "Can it be built", 5)),
                null);
    }

    /** A successful chat/completions answer whose assistant content is {@code content}. */
    private void serveCompletion(String content) {
        Map<String, Object> body = Map.of("choices", List.of(Map.of(
                "message", Map.of("role", "assistant", "content", content),
                "finish_reason", "stop")));
        serveStatus(200, MAPPER.writeValueAsString(body));
    }

    private void serveStatus(int statusCode, String responseBody) {
        status.set(statusCode);
        body.set(responseBody);
    }

    private OpenAiCompatibleCriterionScoringClient client(String apiKey) {
        return clientWithRetries(apiKey, 0);
    }

    private OpenAiCompatibleCriterionScoringClient clientWithRetries(String apiKey, int maxRetries) {
        return newClient(apiKey, maxRetries);
    }

    /** Starts the stub endpoint (once per test) and points the client at it. */
    private OpenAiCompatibleCriterionScoringClient newClient(String apiKey, int maxRetries) {
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
        return new OpenAiCompatibleCriterionScoringClient(
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
