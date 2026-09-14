package com.EDITH.SIH26043.client;

import java.util.UUID;

/**
 * The body codejudge-service's internal intake actually expects: the submission
 * payload plus the owner it belongs to.
 *
 * <p>A student calling CodeJudge's public route is identified by their own JWT, so
 * their payload needs no owner. The portal calls as a <em>service</em>, so the owner
 * has to travel in the body — this is that wrapper, mirroring CodeJudge's
 * {@code InternalEvaluationCreateRequest} field for field. Without it the receiver
 * rejects the hand-off with a 400 ({@code ownerUserId is required}), which the
 * best-effort gateway would swallow silently.</p>
 *
 * @param ownerUserId the submission's owner — the student's source-service user id,
 *                    which is exactly what CodeJudge scopes its own reads by
 */
public record CodeJudgeInternalCreateRequest(
        UUID ownerUserId,
        CodeJudgeEvaluationRequest submission) {
}
