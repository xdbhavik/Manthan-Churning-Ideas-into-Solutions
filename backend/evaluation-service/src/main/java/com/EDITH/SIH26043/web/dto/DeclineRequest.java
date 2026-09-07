package com.EDITH.SIH26043.web.dto;

import jakarta.validation.constraints.Size;

/**
 * Optional body of a decline. The reason is stored on the assignment's
 * {@code feedback} so the audit trail explains why the problem went back into
 * the routing queue.
 */
public record DeclineRequest(
        @Size(max = 1000)
        String reason
) {
}
