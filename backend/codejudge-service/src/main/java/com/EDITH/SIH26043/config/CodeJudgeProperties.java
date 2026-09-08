package com.EDITH.SIH26043.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Binder for {@code app.codejudge.*} (see application.yaml). All values have
 * env-var-backed defaults so the module boots in a bare IDE run and inside
 * docker-compose alike.
 */
@Component
@ConfigurationProperties(prefix = "app.codejudge")
public class CodeJudgeProperties {

    /** Root of the Python agentic-legibility analyzer (module root). */
    private String analyzerDir = "/opt/codejudge-analyzer";

    /** Where a submission workspace is created under one sub-dir per evaluation. */
    private String workspacesDir = "./data/codejudge-workspaces";

    /** Worker poll interval for the DB-backed job queue (ms). */
    private long pollIntervalMs = 3000;

    /** Wall-clock cap for a git clone. */
    private long cloneTimeoutSeconds = 120;

    /** Wall-clock cap for the analyzer sub-process. */
    private long analyzerTimeoutSeconds = 180;

    /**
     * If true the pipeline MAY build/run/test untrusted code in a sandbox. In this
     * deployment it stays false — those stages are skipped and scored
     * NOT_EVALUATED, so no student code is ever executed.
     */
    private boolean sandboxEnabled = false;

    /** Secret scan: cap bytes read per file. */
    private int secretScanMaxFileBytes = 200_000;

    /** Secret scan: cap files scanned per evaluation. */
    private int secretScanMaxFiles = 4_000;

    /** Reclaim a CLAIMED job after this many seconds (dead-worker guard). */
    private long jobClaimTimeoutSeconds = 900;

    /** Give up a job after this many claim attempts. */
    private int jobMaxAttempts = 3;

    public String getAnalyzerDir() {
        return analyzerDir;
    }

    public void setAnalyzerDir(String analyzerDir) {
        this.analyzerDir = analyzerDir;
    }

    public String getWorkspacesDir() {
        return workspacesDir;
    }

    public void setWorkspacesDir(String workspacesDir) {
        this.workspacesDir = workspacesDir;
    }

    public long getPollIntervalMs() {
        return pollIntervalMs;
    }

    public void setPollIntervalMs(long pollIntervalMs) {
        this.pollIntervalMs = pollIntervalMs;
    }

    public long getCloneTimeoutSeconds() {
        return cloneTimeoutSeconds;
    }

    public void setCloneTimeoutSeconds(long cloneTimeoutSeconds) {
        this.cloneTimeoutSeconds = cloneTimeoutSeconds;
    }

    public long getAnalyzerTimeoutSeconds() {
        return analyzerTimeoutSeconds;
    }

    public void setAnalyzerTimeoutSeconds(long analyzerTimeoutSeconds) {
        this.analyzerTimeoutSeconds = analyzerTimeoutSeconds;
    }

    public boolean isSandboxEnabled() {
        return sandboxEnabled;
    }

    public void setSandboxEnabled(boolean sandboxEnabled) {
        this.sandboxEnabled = sandboxEnabled;
    }

    public int getSecretScanMaxFileBytes() {
        return secretScanMaxFileBytes;
    }

    public void setSecretScanMaxFileBytes(int secretScanMaxFileBytes) {
        this.secretScanMaxFileBytes = secretScanMaxFileBytes;
    }

    public int getSecretScanMaxFiles() {
        return secretScanMaxFiles;
    }

    public void setSecretScanMaxFiles(int secretScanMaxFiles) {
        this.secretScanMaxFiles = secretScanMaxFiles;
    }

    public long getJobClaimTimeoutSeconds() {
        return jobClaimTimeoutSeconds;
    }

    public void setJobClaimTimeoutSeconds(long jobClaimTimeoutSeconds) {
        this.jobClaimTimeoutSeconds = jobClaimTimeoutSeconds;
    }

    public int getJobMaxAttempts() {
        return jobMaxAttempts;
    }

    public void setJobMaxAttempts(int jobMaxAttempts) {
        this.jobMaxAttempts = jobMaxAttempts;
    }
}
