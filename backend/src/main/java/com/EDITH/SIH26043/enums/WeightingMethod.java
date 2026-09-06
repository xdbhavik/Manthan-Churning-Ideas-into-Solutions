package com.EDITH.SIH26043.enums;

/**
 * How per-type weights were combined during aggregation.
 * {@code CONFIGURED} = weight_config rows; {@code EQUAL} = fallback when the
 * configured weights are missing or do not sum to ~1.
 */
public enum WeightingMethod {
    CONFIGURED,
    EQUAL
}
