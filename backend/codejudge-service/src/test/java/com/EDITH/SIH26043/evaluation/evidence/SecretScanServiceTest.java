package com.EDITH.SIH26043.evaluation.evidence;

import com.EDITH.SIH26043.config.CodeJudgeProperties;
import com.EDITH.SIH26043.enums.FindingSeverity;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The built-in secrets scan. It must find real committed credentials (a private
 * key is CRITICAL and blocks; a hard-coded secret is HIGH and penalises) without
 * crying wolf over the placeholders every sample config contains — a false
 * CRITICAL would block an honest team's submission.
 */
class SecretScanServiceTest {

    private final SecretScanService service = new SecretScanService(new CodeJudgeProperties());

    @Test
    void flagsACommittedPrivateKeyAsCritical(@TempDir Path repo) throws IOException {
        write(repo, "deploy/id_rsa", """
                -----BEGIN RSA PRIVATE KEY-----
                MIIEowIBAAKCAQEAxyzzy
                -----END RSA PRIVATE KEY-----
                """);

        List<SecretHit> hits = service.scan(repo);

        assertThat(hits).anySatisfy(hit -> {
            assertThat(hit.severity()).isEqualTo(FindingSeverity.CRITICAL);
            assertThat(hit.type()).isEqualTo("private-key");
            assertThat(hit.file()).isEqualTo("deploy/id_rsa");
            assertThat(hit.line()).isEqualTo(1);
        });
    }

    @Test
    void flagsAnAwsAccessKeyAsCritical(@TempDir Path repo) throws IOException {
        write(repo, "src/config.js", """
                const region = 'ap-south-1';
                const keyId = 'AKIAIOSFODNN7EXAMPLE';
                """);

        List<SecretHit> hits = service.scan(repo);

        assertThat(hits).anySatisfy(hit -> {
            assertThat(hit.severity()).isEqualTo(FindingSeverity.CRITICAL);
            assertThat(hit.type()).isEqualTo("aws-access-key");
            assertThat(hit.line()).isEqualTo(2);
        });
    }

    @Test
    void flagsAHardCodedSecretAssignmentAsHigh(@TempDir Path repo) throws IOException {
        write(repo, "app/settings.py", """
                DEBUG = True
                SECRET_KEY = "s3cr3t-live-value-9f2b81"
                """);

        List<SecretHit> hits = service.scan(repo);

        assertThat(hits).anySatisfy(hit -> {
            assertThat(hit.severity()).isEqualTo(FindingSeverity.HIGH);
            assertThat(hit.type()).isEqualTo("hardcoded-secret");
            assertThat(hit.file()).isEqualTo("app/settings.py");
        });
    }

    @Test
    void ignoresPlaceholdersAndEnvironmentIndirection(@TempDir Path repo) throws IOException {
        // Every one of these is what a *correct* repository looks like.
        write(repo, ".env.example", """
                API_KEY=your-api-key-here
                CLIENT_SECRET=xxxxxxxxxxxx
                """);
        write(repo, "src/config.ts", """
                const apiKey = process.env.API_KEY;
                const password = "${DB_PASSWORD}";
                const secret = "changeme";
                const token = "<your-token>";
                """);
        write(repo, "application.yaml", """
                app:
                  jwt:
                    secret: "${JWT_SECRET}"
                """);

        List<SecretHit> hits = service.scan(repo);

        assertThat(hits).isEmpty();
    }

    @Test
    void flagsACommittedEnvFileWithAssignments(@TempDir Path repo) throws IOException {
        write(repo, ".env", """
                # local overrides
                DB_HOST=db
                """);

        List<SecretHit> hits = service.scan(repo);

        assertThat(hits).anySatisfy(hit -> {
            assertThat(hit.severity()).isEqualTo(FindingSeverity.HIGH);
            assertThat(hit.type()).isEqualTo("env-file-committed");
            assertThat(hit.file()).isEqualTo(".env");
        });
    }

    @Test
    void skipsTheGitDirectoryAndBinaryAssets(@TempDir Path repo) throws IOException {
        // Packfiles and images are noise: scanning them yields garbage findings.
        write(repo, ".git/config", "SECRET_KEY = \"abcdef123456789\"");
        write(repo, "assets/logo.png", "SECRET_KEY = \"abcdef123456789\"");
        write(repo, "README.md", "# Project\n");

        List<SecretHit> hits = service.scan(repo);

        assertThat(hits).isEmpty();
    }

    @Test
    void returnsNoHitsForAMissingOrEmptyWorkspace(@TempDir Path repo) {
        assertThat(service.scan(repo)).isEmpty();
        assertThat(service.scan(repo.resolve("does-not-exist"))).isEmpty();
        assertThat(service.scan(null)).isEmpty();
    }

    @Test
    void respectsTheConfiguredPerFileSizeCap(@TempDir Path repo) throws IOException {
        CodeJudgeProperties tiny = new CodeJudgeProperties();
        tiny.setSecretScanMaxFileBytes(10);
        SecretScanService capped = new SecretScanService(tiny);
        write(repo, "big.py", "SECRET_KEY = \"s3cr3t-live-value-9f2b81\"\n");

        assertThat(capped.scan(repo)).isEmpty();
        // The same file is found once the cap allows reading it.
        assertThat(service.scan(repo)).isNotEmpty();
    }

    private static void write(Path root, String relative, String content) throws IOException {
        Path file = root.resolve(relative);
        Files.createDirectories(file.getParent());
        Files.writeString(file, content);
    }
}
