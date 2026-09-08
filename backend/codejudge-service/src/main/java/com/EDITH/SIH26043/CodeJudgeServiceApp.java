package com.EDITH.SIH26043;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Automated repository evaluation service. Owns the {@code sih_codejudge}
 * database and runs an async, deterministic evaluation pipeline over a
 * submitted project repository pinned to a commit:
 *
 * <pre>
 *   QUEUED -> CLONING -> SCANNING -> SCORING -> REPORT_GENERATION -> COMPLETED
 *                                              (any stage) -> FAILED
 * </pre>
 *
 * <p>The evidence collector for the static categories is the external Python
 * {@code agentic-legibility} scanner (kept as-is under this module), invoked
 * by a worker sub-process; its JSON signals feed a deterministic, config-seeded
 * {@link com.EDITH.SIH26043.evaluation.scoring.ScoringEngine}. AI/build/run
 * stages are intentionally not final authorities and are gated off until a
 * sandbox is configured.</p>
 */
@SpringBootApplication
@EnableScheduling
public class CodeJudgeServiceApp {

    public static void main(String[] args) {
        SpringApplication.run(CodeJudgeServiceApp.class, args);
    }
}
