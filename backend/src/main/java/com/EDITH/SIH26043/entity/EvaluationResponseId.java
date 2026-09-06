package com.EDITH.SIH26043.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;
import java.util.UUID;

/**
 * Composite key of {@link EvaluationResponse}.
 */
@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class EvaluationResponseId implements Serializable {

    @Column(name = "assignment_id")
    private UUID assignmentId;

    @Column(name = "criterion_id")
    private UUID criterionId;
}
