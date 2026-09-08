package com.EDITH.SIH26043.evaluation.pipeline;

import com.EDITH.SIH26043.entity.EvaluationJob;
import com.EDITH.SIH26043.service.JobQueueService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.net.InetAddress;
import java.net.UnknownHostException;

/**
 * The orchestrator worker: polls the DB-backed job queue and runs the pipeline for
 * one claimed job per tick. Long evaluations therefore never run inside an HTTP
 * request. Multiple replicas are safe — claims are atomic — and each worker
 * identifies itself by {@code host:pid} so a stale claim is attributable.
 *
 * <p>The poll interval is {@code app.codejudge.poll-interval-ms}. Draining is
 * deliberately one-job-per-tick: it keeps a single worker's CPU/disk footprint
 * predictable, and the queue is emptied over successive ticks.</p>
 */
@Component
public class EvaluationWorker {

    private static final Logger log = LoggerFactory.getLogger(EvaluationWorker.class);

    private final JobQueueService jobQueueService;
    private final EvaluationPipeline pipeline;
    private final boolean enabled;
    private final String workerId;

    public EvaluationWorker(JobQueueService jobQueueService,
                            EvaluationPipeline pipeline,
                            @Value("${app.codejudge.worker-enabled:true}") boolean enabled) {
        this.jobQueueService = jobQueueService;
        this.pipeline = pipeline;
        this.enabled = enabled;
        this.workerId = buildWorkerId();
    }

    @Scheduled(fixedDelayString = "${app.codejudge.poll-interval-ms:3000}")
    public void poll() {
        if (!enabled) {
            return;
        }
        EvaluationJob job;
        try {
            job = jobQueueService.claimNext(workerId);
        } catch (RuntimeException e) {
            // A DB blip must not kill the scheduler thread.
            log.warn("Job claim failed: {}", e.getMessage());
            return;
        }
        if (job == null) {
            return;
        }
        log.info("Worker {} claimed job {} for evaluation {} (attempt {})",
                workerId, job.getJobId(), job.getEvaluationId(), job.getAttempts());
        // The pipeline never throws: it always reaches COMPLETED or FAILED.
        pipeline.run(job.getEvaluationId());
    }

    public String workerId() {
        return workerId;
    }

    private static String buildWorkerId() {
        String host;
        try {
            host = InetAddress.getLocalHost().getHostName();
        } catch (UnknownHostException e) {
            host = "unknown-host";
        }
        return host + ":" + ProcessHandle.current().pid();
    }
}
