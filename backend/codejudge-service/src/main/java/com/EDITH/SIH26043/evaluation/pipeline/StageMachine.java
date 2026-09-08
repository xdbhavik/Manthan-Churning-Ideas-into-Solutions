package com.EDITH.SIH26043.evaluation.pipeline;

import com.EDITH.SIH26043.entity.Evaluation;
import com.EDITH.SIH26043.entity.EvaluationStatusHistory;
import com.EDITH.SIH26043.enums.EvaluationStatus;
import com.EDITH.SIH26043.exception.ApiException;
import com.EDITH.SIH26043.repository.EvaluationRepository;
import com.EDITH.SIH26043.repository.EvaluationStatusHistoryRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

/**
 * Author of every {@code evaluation_status} transition. Each call loads the
 * evaluation inside its own transaction, writes an append-only
 * {@code evaluation_status_history} row and persists the new state — so a stage
 * crash can never leave a half-committed transition. {@code actor} is always
 * {@code MACHINE} for worker-driven stages.
 */
@Component
public class StageMachine {

    private static final String ACTOR_MACHINE = "MACHINE";

    private final EvaluationRepository evaluationRepository;
    private final EvaluationStatusHistoryRepository historyRepository;

    public StageMachine(EvaluationRepository evaluationRepository,
                        EvaluationStatusHistoryRepository historyRepository) {
        this.evaluationRepository = evaluationRepository;
        this.historyRepository = historyRepository;
    }

    /**
     * Move an evaluation to {@code to}. Idempotent: transitioning to the current
     * status is a no-op (a retried stage never double-logs). Sets {@code startedAt}
     * on the first forward move out of QUEUED/SUBMITTED and {@code completedAt}
     * when reaching COMPLETED.
     */
    @Transactional
    public Evaluation transition(UUID evaluationId, EvaluationStatus to, String note) {
        Evaluation evaluation = require(evaluationId);
        EvaluationStatus from = evaluation.getStatus();
        if (from == to) {
            return evaluation;
        }
        if (evaluation.getStartedAt() == null
                && from != EvaluationStatus.QUEUED
                && from != EvaluationStatus.SUBMITTED) {
            evaluation.setStartedAt(Instant.now());
        }
        if (to == EvaluationStatus.COMPLETED || to == EvaluationStatus.FAILED) {
            evaluation.setCompletedAt(Instant.now());
        }
        evaluation.setStatus(to);
        historyRepository.save(history(evaluation.getEvaluationId(), from, to, null));
        return evaluationRepository.save(evaluation);
    }

    /** Move to FAILED with a machine-readable + human note (any unrecoverable stage error). */
    @Transactional
    public Evaluation fail(UUID evaluationId, String reason) {
        Evaluation evaluation = require(evaluationId);
        EvaluationStatus from = evaluation.getStatus();
        if (from == EvaluationStatus.FAILED) {
            return evaluation;
        }
        if (evaluation.getStartedAt() == null) {
            evaluation.setStartedAt(Instant.now());
        }
        evaluation.setStatus(EvaluationStatus.FAILED);
        evaluation.setCompletedAt(Instant.now());
        historyRepository.save(history(evaluationId, from, EvaluationStatus.FAILED, reason));
        return evaluationRepository.save(evaluation);
    }

    private Evaluation require(UUID evaluationId) {
        return evaluationRepository.findById(evaluationId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,
                        "Evaluation " + evaluationId + " not found"));
    }

    private EvaluationStatusHistory history(UUID evaluationId,
                                            EvaluationStatus from,
                                            EvaluationStatus to,
                                            String note) {
        EvaluationStatusHistory row = new EvaluationStatusHistory();
        row.setEvaluationId(evaluationId);
        row.setFromStatus(from);
        row.setToStatus(to);
        row.setActor(ACTOR_MACHINE);
        row.setNote(note);
        return row;
    }
}
