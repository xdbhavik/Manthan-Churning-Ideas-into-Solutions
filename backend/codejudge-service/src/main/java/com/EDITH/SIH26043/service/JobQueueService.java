package com.EDITH.SIH26043.service;

import com.EDITH.SIH26043.config.CodeJudgeProperties;
import com.EDITH.SIH26043.entity.EvaluationJob;
import com.EDITH.SIH26043.enums.JobStatus;
import com.EDITH.SIH26043.exception.ApiException;
import com.EDITH.SIH26043.repository.EvaluationJobRepository;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * DB-backed {@code evaluation_job} queue. Rows are claimed atomically with the
 * optimistic {@code @Version}: {@link #claimNext} tries each QUEUED row in
 * priority/createdAt order and wins only the first {@code save} that does not
 * throw an optimistic-lock conflict, so multiple worker replicas can poll
 * safely. A stale CLAIMED row (dead worker, claim older than the timeout) is
 * requeued; a job that has been claimed {@code jobMaxAttempts} times without
 * completing is failed instead of looping forever.
 */
@Service
public class JobQueueService {

    private final EvaluationJobRepository jobRepository;
    private final CodeJudgeProperties props;

    public JobQueueService(EvaluationJobRepository jobRepository, CodeJudgeProperties props) {
        this.jobRepository = jobRepository;
        this.props = props;
    }

    /** Insert a QUEUED job for an evaluation (create path). */
    @Transactional
    public EvaluationJob enqueue(UUID evaluationId, int priority) {
        if (jobRepository.findByEvaluationId(evaluationId).isPresent()) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "A job already exists for evaluation " + evaluationId);
        }
        EvaluationJob job = new EvaluationJob();
        job.setEvaluationId(evaluationId);
        job.setPriority(priority);
        job.setStatus(JobStatus.QUEUED);
        job.setAttempts(0);
        return jobRepository.save(job);
    }

    /** Reset a FAILED job back to QUEUED (reviewer retry). Creates one if absent. */
    @Transactional
    public EvaluationJob retry(UUID evaluationId, int priority) {
        EvaluationJob job = jobRepository.findByEvaluationId(evaluationId).orElseGet(EvaluationJob::new);
        job.setEvaluationId(evaluationId);
        job.setPriority(priority);
        job.setStatus(JobStatus.QUEUED);
        job.setAttempts(0);
        job.setClaimOwner(null);
        job.setClaimedAt(null);
        job.setLastError(null);
        if (job.getJobId() == null) {
            job.setJobId(UUID.randomUUID());
        }
        return jobRepository.save(job);
    }

    /**
     * Atomically claim the next runnable job for {@code owner}. Returns null when
     * the queue is empty. Reclaims stale CLAIMED rows first, then walks QUEUED rows
     * newest-to-oldest of equal priority (repo orders by priority then createdAt
     * ascending, so FIFO).
     */
    @Transactional
    public EvaluationJob claimNext(String owner) {
        Instant now = Instant.now();
        reclaimStale(now);

        List<EvaluationJob> queued = jobRepository.findByStatusOrderByPriorityAscCreatedAtAsc(JobStatus.QUEUED);
        for (EvaluationJob job : queued) {
            if (job.getAttempts() >= props.getJobMaxAttempts()) {
                job.setStatus(JobStatus.FAILED);
                job.setLastError("Exhausted " + job.getAttempts() + " claim attempts");
                jobRepository.save(job);
                continue;
            }
            try {
                job.setStatus(JobStatus.CLAIMED);
                job.setClaimOwner(owner);
                job.setClaimedAt(now);
                job.setAttempts(job.getAttempts() + 1);
                return jobRepository.save(job);
            } catch (OptimisticLockingFailureException conflict) {
                // Another worker claimed this row concurrently — move to the next.
            }
        }
        return null;
    }

    /** Put a CLAIMED row (dead worker) back to QUEUED so it can be retried. */
    @Transactional
    public void reclaimStale(Instant now) {
        Instant threshold = now.minusSeconds(props.getJobClaimTimeoutSeconds());
        for (EvaluationJob job : jobRepository.findAll()) {
            if (job.getStatus() == JobStatus.CLAIMED
                    && job.getClaimedAt() != null
                    && job.getClaimedAt().isBefore(threshold)) {
                try {
                    job.setStatus(JobStatus.QUEUED);
                    job.setClaimOwner(null);
                    job.setClaimedAt(null);
                    jobRepository.save(job);
                } catch (OptimisticLockingFailureException conflict) {
                    // Someone else reclaimed it.
                }
            }
        }
    }

    @Transactional
    public void markDone(UUID evaluationId) {
        jobRepository.findByEvaluationId(evaluationId).ifPresent(job -> {
            job.setStatus(JobStatus.DONE);
            job.setClaimOwner(null);
            job.setClaimedAt(null);
            job.setLastError(null);
            jobRepository.save(job);
        });
    }

    @Transactional
    public void markFailed(UUID evaluationId, String error) {
        jobRepository.findByEvaluationId(evaluationId).ifPresent(job -> {
            job.setStatus(JobStatus.FAILED);
            job.setClaimOwner(null);
            job.setClaimedAt(null);
            job.setLastError(truncate(error, 2000));
            jobRepository.save(job);
        });
    }

    private static String truncate(String text, int max) {
        if (text == null) {
            return null;
        }
        return text.length() <= max ? text : text.substring(0, max);
    }
}
