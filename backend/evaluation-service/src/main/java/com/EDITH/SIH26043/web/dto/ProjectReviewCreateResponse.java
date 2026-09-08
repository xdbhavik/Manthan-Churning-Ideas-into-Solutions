package com.EDITH.SIH26043.web.dto;

import java.util.UUID;

/**
 * Acknowledgement portal-service receives when a project review is opened. The
 * {@code reviewerUserId} is the source-service user id portal persists on the
 * submission so file downloads can be authorized for that reviewer.
 */
public record ProjectReviewCreateResponse(
        UUID projectReviewId,
        UUID reviewerUserId,
        UUID evaluatorProfileId,
        String status
) {
}
