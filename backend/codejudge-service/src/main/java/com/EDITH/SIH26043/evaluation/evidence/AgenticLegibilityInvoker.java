package com.EDITH.SIH26043.evaluation.evidence;

import com.EDITH.SIH26043.config.CodeJudgeProperties;
import org.springframework.stereotype.Component;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * Runs the external Python {@code agentic-legibility} scanner over a workspace.
 *
 * <p>The scanner is stdlib-only and never executes student code — it reads the
 * read-only clone and prints a JSON report whose top-level {@code categories}
 * object carries the per-category signal maps. It is version-agnostic: CodeJudge
 * only stores the raw signals and the deterministic rubric derives scores.</p>
 *
 * <p>When Python or the analyzer is missing (e.g. an IDE run on a host without
 * Python) the result is {@link AnalyzerResult#unavailable}; the caller falls back
 * to the built-in static heuristics so the pipeline always finishes.</p>
 */
@Component
public class AgenticLegibilityInvoker {

    private static final int MAX_OUTPUT_BYTES = 4 * 1024 * 1024;

    private final CodeJudgeProperties props;
    private final ObjectMapper objectMapper;

    public AgenticLegibilityInvoker(CodeJudgeProperties props, ObjectMapper objectMapper) {
        this.props = props;
        this.objectMapper = objectMapper;
    }

    public AnalyzerResult run(Path workspace) {
        Path script = Paths.get(props.getAnalyzerDir()).resolve("agentic_legibility_score.py");
        if (!Files.isRegularFile(script)) {
            return AnalyzerResult.unavailable("analyzer script not found: " + script);
        }
        ProcessBuilder pb = new ProcessBuilder("python3", script.toString(), workspace.toString());
        pb.redirectErrorStream(true);
        try {
            Process process = pb.start();
            boolean finished = process.waitFor(props.getAnalyzerTimeoutSeconds(), TimeUnit.SECONDS);
            if (!finished) {
                process.destroyForcibly();
                return AnalyzerResult.unavailable("analyzer timed out after "
                        + props.getAnalyzerTimeoutSeconds() + "s");
            }
            byte[] out = process.getInputStream().readAllBytes();
            if (out.length > MAX_OUTPUT_BYTES) {
                out = java.util.Arrays.copyOf(out, MAX_OUTPUT_BYTES);
            }
            if (process.exitValue() != 0) {
                return AnalyzerResult.unavailable("analyzer exited " + process.exitValue()
                        + ": " + tail(out));
            }
            return parse(out);
        } catch (IOException e) {
            return AnalyzerResult.unavailable("python3 unavailable: " + e.getMessage());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return AnalyzerResult.unavailable("analyzer interrupted");
        }
    }

    private AnalyzerResult parse(byte[] out) {
        try {
            JsonNode root = objectMapper.readTree(new String(out, StandardCharsets.UTF_8));
            JsonNode categories = root.path("categories");
            if (!categories.isObject()) {
                return AnalyzerResult.unavailable("analyzer JSON has no categories object");
            }
            Map<String, Object> signalsByCategory = new LinkedHashMap<>();
            categories.properties().forEach(entry ->
                    signalsByCategory.put(entry.getKey(),
                            objectMapper.convertValue(entry.getValue(), new TypeReference<>() {
                            })));
            return AnalyzerResult.available(signalsByCategory);
        } catch (RuntimeException e) {
            // Jackson 3 throws unchecked JacksonException for malformed input.
            return AnalyzerResult.unavailable("analyzer JSON unparseable: " + e.getMessage());
        }
    }

    private static String tail(byte[] out) {
        String text = new String(out, StandardCharsets.UTF_8);
        return text.length() <= 300 ? text : text.substring(text.length() - 300);
    }
}
