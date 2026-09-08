package com.EDITH.SIH26043.evaluation.evidence;

import com.EDITH.SIH26043.config.CodeJudgeProperties;
import com.EDITH.SIH26043.enums.FindingSeverity;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

/**
 * Built-in secrets scanner (the {@code securityengine} in the plan). It reads a
 * bounded number of text files in a workspace and flags:
 * <ul>
 *   <li>committed private keys — {@code CRITICAL} (blocks when the policy says so);</li>
 *   <li>AWS access keys / committed {@code .env} with live assignments — {@code HIGH};</li>
 *   <li>generic hard-coded {@code *key/*secret/*password = "…"} assignments whose
 *       value is not a placeholder or env reference — {@code HIGH}.</li>
 * </ul>
 * File-size and file-count caps (from {@link CodeJudgeProperties}) keep a hostile
 * or enormous repository from starving the worker. Scan results are raw
 * {@link SecretHit}s; the stage persists them as {@code security_finding} rows.
 */
@Component
public class SecretScanService {

    private static final int MAX_LINE_LENGTH = 500;

    private static final Pattern PRIVATE_KEY = Pattern.compile(
            "-----BEGIN (RSA |EC |DSA |OPENSSH |PGP |ENCRYPTED )?PRIVATE KEY-----");
    private static final Pattern AWS_ACCESS_KEY = Pattern.compile("AKIA[0-9A-Z]{16}");
    /**
     * A credential-looking name assigned a quoted literal. The surrounding
     * {@code [A-Za-z0-9_.-]*} matters: real code writes {@code SECRET_KEY},
     * {@code app.clientSecret} or {@code DB_PASSWORD}, not a bare {@code secret}.
     * Group 1 is the name, group 2 the value.
     */
    private static final Pattern ASSIGNMENT = Pattern.compile(
            "(?i)([A-Za-z0-9_.\\-]*(?:api[_-]?key|secret|password|passwd|access[_-]?key"
                    + "|private[_-]?key|token)[A-Za-z0-9_.\\-]*)\\s*[:=]\\s*['\"]([^'\"]{8,})['\"]");

    private static final Pattern PLACEHOLDER = Pattern.compile(
            "(?i)your[-_]?|xxxx+|example|<.*>|\\$\\{|\\$\\(|\\.\\.\\.|changeme|replace[-_ ]?me|process\\.env|getenv|system\\.getenv|\\{\\{|\\{%|placeholder");

    private final int maxFileBytes;
    private final int maxFiles;

    public SecretScanService(CodeJudgeProperties props) {
        this.maxFileBytes = props.getSecretScanMaxFileBytes();
        this.maxFiles = props.getSecretScanMaxFiles();
    }

    public List<SecretHit> scan(Path root) {
        List<SecretHit> hits = new ArrayList<>();
        if (root == null || !Files.isDirectory(root)) {
            return hits;
        }
        int[] scanned = {0};
        try (Stream<Path> stream = Files.walk(root)) {
            stream.filter(Files::isRegularFile)
                    .filter(p -> !isBinarySuffix(p.getFileName().toString()))
                    .filter(p -> !isGitDir(p))
                    .limit(maxFiles)
                    .forEach(file -> {
                        scanned[0]++;
                        scanFile(root, file, hits);
                    });
        } catch (IOException e) {
            // A hostile/racy workspace must not kill the scan; log nothing here.
        }
        if (scanned[0] == 0) {
            return hits;
        }
        // A committed .env carrying at least one assignment is itself a HIGH finding.
        Path env = root.resolve(".env");
        if (Files.isRegularFile(env) && hasAssignment(env)) {
            hits.add(new SecretHit(FindingSeverity.HIGH, "env-file-committed",
                    rel(root, env), null, "A .env file with assignments is committed to the repository"));
        }
        return hits;
    }

    private void scanFile(Path root, Path file, List<SecretHit> hits) {
        String rel = rel(root, file);
        List<String> lines;
        try {
            if (Files.size(file) > maxFileBytes) {
                return;
            }
            lines = Files.readAllLines(file, StandardCharsets.UTF_8);
        } catch (IOException | OutOfMemoryError e) {
            return;
        }
        for (int i = 0; i < lines.size(); i++) {
            String line = lines.get(i);
            if (line.length() > MAX_LINE_LENGTH) {
                line = line.substring(0, MAX_LINE_LENGTH);
            }
            String trimmed = line.trim();
            if (trimmed.isEmpty()) {
                continue;
            }
            int lineNo = i + 1;
            if (PRIVATE_KEY.matcher(trimmed).find()) {
                hits.add(new SecretHit(FindingSeverity.CRITICAL, "private-key", rel, lineNo,
                        "Committed private key material"));
            } else if (AWS_ACCESS_KEY.matcher(line).find()) {
                hits.add(new SecretHit(FindingSeverity.CRITICAL, "aws-access-key", rel, lineNo,
                        "Hard-coded AWS access key id"));
            } else {
                Matcher m = ASSIGNMENT.matcher(line);
                while (m.find()) {
                    String value = m.group(2);
                    if (value != null && !PLACEHOLDER.matcher(value).find()) {
                        hits.add(new SecretHit(FindingSeverity.HIGH, "hardcoded-secret", rel, lineNo,
                                "Hard-coded '" + m.group(1) + "' with a non-placeholder value"));
                    }
                }
            }
        }
    }

    private boolean hasAssignment(Path env) {
        try {
            if (Files.size(env) > maxFileBytes) {
                return false;
            }
            try (Stream<String> lines = Files.lines(env, StandardCharsets.UTF_8)) {
                return lines.limit(200).anyMatch(l -> l.trim().contains("=") && !l.trim().startsWith("#"));
            }
        } catch (IOException e) {
            return false;
        }
    }

    private static boolean isGitDir(Path p) {
        for (int i = 0; i < p.getNameCount(); i++) {
            if (p.getName(i).toString().equals(".git")) {
                return true;
            }
        }
        return false;
    }

    private static boolean isBinarySuffix(String name) {
        String n = name.toLowerCase(Locale.ROOT);
        return n.endsWith(".png") || n.endsWith(".jpg") || n.endsWith(".jpeg") || n.endsWith(".gif")
                || n.endsWith(".ico") || n.endsWith(".pdf") || n.endsWith(".zip") || n.endsWith(".gz")
                || n.endsWith(".jar") || n.endsWith(".class") || n.endsWith(".woff") || n.endsWith(".woff2")
                || n.endsWith(".ttf") || n.endsWith(".eot") || n.endsWith(".mp4") || n.endsWith(".mp3");
    }

    private static String rel(Path root, Path file) {
        try {
            return root.relativize(file).toString().replace('\\', '/');
        } catch (IllegalArgumentException e) {
            return file.getFileName().toString();
        }
    }
}
