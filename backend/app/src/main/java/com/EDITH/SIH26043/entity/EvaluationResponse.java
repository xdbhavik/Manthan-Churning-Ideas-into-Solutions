package com.EDITH.SIH26043.entity;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * One per-criterion score submitted by an evaluator (normalized rows, not JSONB,
 * so "all criteria answered" is a count query and aggregation is a clean group-by).
 */
@Entity
@Table(name = "evaluation_response")
@Getter
@Setter
public class EvaluationResponse {

    @EmbeddedId
    private EvaluationResponseId id;

    /**
     * 1..10 (CHECK-constrained). Stored as SMALLINT — the explicit JDBC type
     * keeps {@code ddl-auto: validate} happy while the field stays an Integer
     * so aggregation code isn't juggling Shorts.
     */
    @JdbcTypeCode(SqlTypes.SMALLINT)
    @Column(name = "score", nullable = false)
    private Integer score;

    @Column(name = "comment", columnDefinition = "text")
    private String comment;
}
