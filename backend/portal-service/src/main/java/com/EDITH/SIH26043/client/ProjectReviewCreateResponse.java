package com.EDITH.SIH26043.client;

import java.util.UUID;

/**
 * Evaluation-service's acknowledgement after it opens a project review for a
 * submitted project. {@code reviewerUserId} is stored back on the portal
 * submission so file downloads and resubmits can be authorised against the
 * assigned reviewer.
 *
 * @param status one of the eval {@code ProjectReviewStatus} names, e.g. ASSIGNED
 */
public record ProjectReviewCreateResponse(
        UUID projectReviewId,
        UUID reviewerUserId,
        UUID evaluatorProfileId,
        String status) {
}
