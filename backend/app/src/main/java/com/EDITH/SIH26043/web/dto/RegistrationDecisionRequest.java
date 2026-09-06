package com.EDITH.SIH26043.web.dto;

/**
 * Reviewer decision payload (approve/reject/request-action). Optional for
 * approve; enforced non-blank in the service for reject and request-action.
 */
public record RegistrationDecisionRequest(String comment) {
}
