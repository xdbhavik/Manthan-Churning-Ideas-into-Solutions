package com.EDITH.SIH26043.evaluation.pipeline;

import com.EDITH.SIH26043.config.CodeJudgeProperties;
import com.EDITH.SIH26043.entity.ProjectSubmission;
import com.EDITH.SIH26043.entity.Evaluation;
import com.EDITH.SIH26043.enums.EvaluationStatus;
import com.EDITH.SIH26043.repository.EvaluationRepository;
import com.EDITH.SIH26043.repository.ProjectSubmissionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import java.util.stream.Stream;

/**
 * CLONING stage. Materialises the pinned submission into an isolated workspace:
 * <ul>
 *   <li>{@code http(s)://}, {@code ssh://} / {@code git@} URLs are fetched with
 *       {@code git clone} and the requested {@code commit_sha} is checked out and
 *       verified (a moving branch head must never silently change what ran);</li>
 *   <li>{@code file://…} / a plain local path pointing at a git checkout is cloned
 *       the same way (this is what an offline / compose e2e uses — no network);</li>
 *   <li>a plain local directory without {@code .git} is snapshotted by copy (the
 *       commit sha is then a caller-supplied label).</li>
 * </ul>
 * The workspace is wiped first so a retried pipeline never scans stale files. No
 * submitted code executes in this stage.
 */
@Component
public class CloneStage implements Stage {

    private static final Logger log = LoggerFactory.getLogger(CloneStage.class);

    private final CodeJudgeProperties props;
    private final StageMachine stageMachine;
    private final ProjectSubmissionRepository submissionRepository;
    private final EvaluationRepository evaluationRepository;

    public CloneStage(CodeJudgeProperties props,
                      StageMachine stageMachine,
                      ProjectSubmissionRepository submissionRepository,
                      EvaluationRepository evaluationRepository) {
        this.props = props;
        this.stageMachine = stageMachine;
        this.submissionRepository = submissionRepository;
        this.evaluationRepository = evaluationRepository;
    }

    @Override
    public EvaluationStatus status() {
        return EvaluationStatus.CLONING;
    }

    @Override
    @Transactional
    public void execute(EvaluationContext context) {
        stageMachine.transition(context.getEvaluationId(), status(), "Cloning submission repository");

        ProjectSubmission submission = submissionRepository.findById(context.getSubmissionId())
                .orElseThrow(() -> new IllegalStateException(
                        "Submission " + context.getSubmissionId() + " not found"));
        Path workspace = context.getWorkspaceDir();
        deleteRecursively(workspace);
        try {
            Files.createDirectories(workspace.getParent());
        } catch (IOException e) {
            throw new IllegalStateException("Cannot create workspaces dir: " + e.getMessage(), e);
        }

        String url = submission.getRepositoryUrl() == null ? "" : submission.getRepositoryUrl().trim();
        String commitSha = submission.getCommitSha() == null ? "" : submission.getCommitSha().trim();

        if (isRemote(url) || isFileUrl(url)) {
            cloneGit(url, workspace, commitSha);
        } else {
            snapshotDirectory(url, workspace);
            log.info("Submission {} cloned from local source dir {} (snapshot)", context.getSubmissionId(), url);
        }

        Evaluation evaluation = evaluationRepository.findById(context.getEvaluationId()).orElseThrow();
        var versions = evaluation.getToolVersions();
        versions.putIfAbsent("git", "cli");
        evaluationRepository.save(evaluation);
    }

    private void cloneGit(String url, Path workspace, String commitSha) {
        String target = isFileUrl(url) ? urlToPath(url) : url;
        List<String> cloneCmd = new ArrayList<>(List.of("git", "clone", "--quiet"));
        cloneCmd.add(target);
        cloneCmd.add(workspace.toString());
        run(null, cloneCmd, "git clone failed for " + url);

        if (!commitSha.isEmpty()) {
            String actual = run(workspace, List.of("git", "rev-parse", "HEAD"),
                    "git rev-parse HEAD failed").trim();
            if (!actual.startsWith(commitSha)) {
                // Try the exact commit (works when the clone carries the history).
                run(workspace, List.of("git", "checkout", "--quiet", commitSha),
                        "Commit " + commitSha + " not found in repository " + url);
            }
        }
    }

    private void snapshotDirectory(String source, Path workspace) {
        Path src = Paths.get(source);
        if (!Files.isDirectory(src)) {
            throw new IllegalStateException("Source is not a readable directory: " + source);
        }
        try (Stream<Path> stream = Files.walk(src)) {
            stream.filter(p -> !isDotGit(p)).forEach(p -> {
                try {
                    Path target = workspace.resolve(src.relativize(p).toString());
                    if (Files.isDirectory(p)) {
                        Files.createDirectories(target);
                    } else {
                        Files.copy(p, target, StandardCopyOption.REPLACE_EXISTING);
                    }
                } catch (IOException e) {
                    throw new WorkspaceCopyException(e);
                }
            });
        } catch (IOException e) {
            throw new IllegalStateException("Snapshot copy failed: " + e.getMessage(), e);
        }
    }

    private static boolean isDotGit(Path p) {
        for (int i = 0; i < p.getNameCount(); i++) {
            if (p.getName(i).toString().equals(".git")) {
                return true;
            }
        }
        return false;
    }

    private static boolean isRemote(String url) {
        String u = url.toLowerCase(Locale.ROOT);
        return u.startsWith("http://") || u.startsWith("https://")
                || u.startsWith("ssh://") || u.startsWith("git@");
    }

    private static boolean isFileUrl(String url) {
        return url.toLowerCase(Locale.ROOT).startsWith("file://");
    }

    private static String urlToPath(String url) {
        try {
            return Paths.get(URI.create(url)).toString();
        } catch (Exception e) {
            throw new IllegalStateException("Invalid file:// URL: " + url);
        }
    }

    private String run(Path dir, List<String> command, String errorPrefix) {
        ProcessBuilder pb = new ProcessBuilder(command);
        if (dir != null) {
            pb.directory(dir.toFile());
        }
        pb.redirectErrorStream(true);
        try {
            Process process = pb.start();
            boolean finished = process.waitFor(props.getCloneTimeoutSeconds(), TimeUnit.SECONDS);
            if (!finished) {
                process.destroyForcibly();
                throw new IllegalStateException(errorPrefix + " (timed out after "
                        + props.getCloneTimeoutSeconds() + "s)");
            }
            String out = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
            if (process.exitValue() != 0) {
                throw new IllegalStateException(errorPrefix + ": " + tail(out));
            }
            return out;
        } catch (IOException e) {
            throw new IllegalStateException(errorPrefix + " (git unavailable?): " + e.getMessage(), e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(errorPrefix + " (interrupted)");
        }
    }

    private static String tail(String text) {
        String t = text == null ? "" : text.trim();
        return t.length() <= 400 ? t : t.substring(t.length() - 400);
    }

    private static void deleteRecursively(Path dir) {
        if (dir == null || !Files.exists(dir)) {
            return;
        }
        try (Stream<Path> walk = Files.walk(dir)) {
            walk.sorted(java.util.Comparator.reverseOrder())
                    .forEach(p -> {
                        try {
                            Files.deleteIfExists(p);
                        } catch (IOException ignored) {
                            // best-effort cleanup
                        }
                    });
        } catch (IOException ignored) {
            // best-effort cleanup
        }
    }

    /** Checked-into-IOException wrapper so the stream lambda can abort the copy. */
    private static final class WorkspaceCopyException extends RuntimeException {
        private WorkspaceCopyException(IOException cause) {
            super(cause);
        }
    }
}
