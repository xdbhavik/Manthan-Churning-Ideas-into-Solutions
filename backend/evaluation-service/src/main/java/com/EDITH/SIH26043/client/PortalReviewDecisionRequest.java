package com.EDITH.SIH26043.client;

/**
 * Body evaluation-service sends portal-service when an evaluator decides a
 * project review. Mirrors portal-service's internal review-result intake
 * ({@code decision} ∈ {@code ACCEPTED | RETURNED}).
 */
public record PortalReviewDecisionRequest(
        String decision,
        String comment
) {
}
