package com.EDITH.SIH26043.service;

import com.EDITH.SIH26043.config.CodeJudgeProperties;
import com.EDITH.SIH26043.entity.EvaluationJob;
import com.EDITH.SIH26043.enums.JobStatus;
import com.EDITH.SIH26043.exception.ApiException;
import com.EDITH.SIH26043.repository.EvaluationJobRepository;
import org.junit.jupiter.api.Test;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * The DB-backed queue. Claims must be atomic (a lost optimistic-lock race moves on
 * to the next row instead of failing the worker), a dead worker's stale claim must
 * come back to QUEUED, and a job that keeps being claimed without finishing must
 * eventually FAIL rather than loop forever.
 */
class JobQueueServiceTest {

    private final EvaluationJobRepository jobRepository = mock(EvaluationJobRepository.class);
    private final CodeJudgeProperties props = new CodeJudgeProperties();
    private final JobQueueService service = new JobQueueService(jobRepository, props);

    private final UUID evaluationId = UUID.randomUUID();

    @Test
    void enqueueCreatesAQueuedJob() {
        when(jobRepository.findByEvaluationId(evaluationId)).thenReturn(Optional.empty());
        when(jobRepository.save(any(EvaluationJob.class))).thenAnswer(i -> i.getArgument(0));

        EvaluationJob job = service.enqueue(evaluationId, 5);

        assertThat(job.getEvaluationId()).isEqualTo(evaluationId);
        assertThat(job.getStatus()).isEqualTo(JobStatus.QUEUED);
        assertThat(job.getPriority()).isEqualTo(5);
        assertThat(job.getAttempts()).isZero();
    }

    @Test
    void enqueueRejectsASecondJobForTheSameEvaluation() {
        when(jobRepository.findByEvaluationId(evaluationId)).thenReturn(Optional.of(new EvaluationJob()));

        assertThatThrownBy(() -> service.enqueue(evaluationId, 5))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.CONFLICT));
        verify(jobRepository, never()).save(any());
    }

    @Test
    void claimNextMarksTheJobClaimedAndCountsTheAttempt() {
        EvaluationJob queued = job(JobStatus.QUEUED, 0);
        when(jobRepository.findAll()).thenReturn(List.of(queued));
        when(jobRepository.findByStatusOrderByPriorityAscCreatedAtAsc(JobStatus.QUEUED))
                .thenReturn(List.of(queued));
        when(jobRepository.save(any(EvaluationJob.class))).thenAnswer(i -> i.getArgument(0));

        EvaluationJob claimed = service.claimNext("worker-1");

        assertThat(claimed).isNotNull();
        assertThat(claimed.getStatus()).isEqualTo(JobStatus.CLAIMED);
        assertThat(claimed.getClaimOwner()).isEqualTo("worker-1");
        assertThat(claimed.getClaimedAt()).isNotNull();
        assertThat(claimed.getAttempts()).isEqualTo(1);
    }

    @Test
    void claimNextReturnsNullWhenTheQueueIsEmpty() {
        when(jobRepository.findAll()).thenReturn(List.of());
        when(jobRepository.findByStatusOrderByPriorityAscCreatedAtAsc(JobStatus.QUEUED))
                .thenReturn(List.of());

        assertThat(service.claimNext("worker-1")).isNull();
    }

    @Test
    void claimNextSkipsARowAnotherWorkerWonAndTakesTheNext() {
        EvaluationJob contended = job(JobStatus.QUEUED, 0);
        EvaluationJob free = job(JobStatus.QUEUED, 0);
        when(jobRepository.findAll()).thenReturn(List.of(contended, free));
        when(jobRepository.findByStatusOrderByPriorityAscCreatedAtAsc(JobStatus.QUEUED))
                .thenReturn(List.of(contended, free));
        when(jobRepository.save(contended)).thenThrow(new OptimisticLockingFailureException("lost race"));
        when(jobRepository.save(free)).thenAnswer(i -> i.getArgument(0));

        EvaluationJob claimed = service.claimNext("worker-2");

        assertThat(claimed).isSameAs(free);
        assertThat(claimed.getStatus()).isEqualTo(JobStatus.CLAIMED);
    }

    @Test
    void claimNextFailsAJobThatExhaustedItsAttemptsInsteadOfLoopingForever() {
        EvaluationJob exhausted = job(JobStatus.QUEUED, props.getJobMaxAttempts());
        when(jobRepository.findAll()).thenReturn(List.of(exhausted));
        when(jobRepository.findByStatusOrderByPriorityAscCreatedAtAsc(JobStatus.QUEUED))
                .thenReturn(List.of(exhausted));
        when(jobRepository.save(any(EvaluationJob.class))).thenAnswer(i -> i.getArgument(0));

        EvaluationJob claimed = service.claimNext("worker-1");

        assertThat(claimed).isNull();
        assertThat(exhausted.getStatus()).isEqualTo(JobStatus.FAILED);
        assertThat(exhausted.getLastError()).contains("attempts");
    }

    @Test
    void reclaimStaleReturnsADeadWorkersClaimToTheQueue() {
        EvaluationJob stale = job(JobStatus.CLAIMED, 1);
        stale.setClaimOwner("dead-worker");
        stale.setClaimedAt(Instant.now().minus(props.getJobClaimTimeoutSeconds() + 60, ChronoUnit.SECONDS));
        when(jobRepository.findAll()).thenReturn(List.of(stale));
        when(jobRepository.save(any(EvaluationJob.class))).thenAnswer(i -> i.getArgument(0));

        service.reclaimStale(Instant.now());

        assertThat(stale.getStatus()).isEqualTo(JobStatus.QUEUED);
        assertThat(stale.getClaimOwner()).isNull();
        assertThat(stale.getClaimedAt()).isNull();
    }

    @Test
    void reclaimStaleLeavesAFreshClaimAlone() {
        EvaluationJob fresh = job(JobStatus.CLAIMED, 1);
        fresh.setClaimOwner("live-worker");
        fresh.setClaimedAt(Instant.now());
        when(jobRepository.findAll()).thenReturn(List.of(fresh));

        service.reclaimStale(Instant.now());

        assertThat(fresh.getStatus()).isEqualTo(JobStatus.CLAIMED);
        verify(jobRepository, never()).save(any());
    }

    @Test
    void markDoneClearsTheClaim() {
        EvaluationJob claimed = job(JobStatus.CLAIMED, 1);
        claimed.setClaimOwner("worker-1");
        claimed.setClaimedAt(Instant.now());
        claimed.setLastError("previous attempt blew up");
        when(jobRepository.findByEvaluationId(evaluationId)).thenReturn(Optional.of(claimed));
        when(jobRepository.save(any(EvaluationJob.class))).thenAnswer(i -> i.getArgument(0));

        service.markDone(evaluationId);

        assertThat(claimed.getStatus()).isEqualTo(JobStatus.DONE);
        assertThat(claimed.getClaimOwner()).isNull();
        assertThat(claimed.getLastError()).isNull();
    }

    @Test
    void markFailedRecordsTheReason() {
        EvaluationJob claimed = job(JobStatus.CLAIMED, 1);
        when(jobRepository.findByEvaluationId(evaluationId)).thenReturn(Optional.of(claimed));
        when(jobRepository.save(any(EvaluationJob.class))).thenAnswer(i -> i.getArgument(0));

        service.markFailed(evaluationId, "CLONING: commit not found");

        assertThat(claimed.getStatus()).isEqualTo(JobStatus.FAILED);
        assertThat(claimed.getLastError()).isEqualTo("CLONING: commit not found");
    }

    @Test
    void retryResetsAFailedJobToQueuedWithFreshAttempts() {
        EvaluationJob failed = job(JobStatus.FAILED, 3);
        failed.setJobId(UUID.randomUUID());
        failed.setLastError("boom");
        when(jobRepository.findByEvaluationId(evaluationId)).thenReturn(Optional.of(failed));
        when(jobRepository.save(any(EvaluationJob.class))).thenAnswer(i -> i.getArgument(0));

        EvaluationJob retried = service.retry(evaluationId, 1);

        assertThat(retried.getStatus()).isEqualTo(JobStatus.QUEUED);
        assertThat(retried.getAttempts()).isZero();
        assertThat(retried.getLastError()).isNull();
        assertThat(retried.getPriority()).isEqualTo(1);
    }

    @Test
    void retryCreatesAJobWhenTheEvaluationHasNone() {
        when(jobRepository.findByEvaluationId(evaluationId)).thenReturn(Optional.empty());
        when(jobRepository.save(any(EvaluationJob.class))).thenAnswer(i -> i.getArgument(0));

        EvaluationJob created = service.retry(evaluationId, 5);

        assertThat(created.getJobId()).isNotNull();
        assertThat(created.getEvaluationId()).isEqualTo(evaluationId);
        assertThat(created.getStatus()).isEqualTo(JobStatus.QUEUED);
    }

    private EvaluationJob job(JobStatus status, int attempts) {
        EvaluationJob job = new EvaluationJob();
        job.setEvaluationId(evaluationId);
        job.setStatus(status);
        job.setAttempts(attempts);
        job.setPriority(5);
        return job;
    }
}
