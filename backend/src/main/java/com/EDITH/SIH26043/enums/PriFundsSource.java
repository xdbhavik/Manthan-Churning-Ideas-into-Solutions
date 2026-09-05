package com.EDITH.SIH26043.enums;

/**
 * Source of PRI funding for the problem.
 * Refs: 06-data-dictionary-government.md (PRISource.funds_source).
 *
 * <p>Mapped via native enum binding. The database value {@code 15TH_FC} was
 * renamed to {@code FIFTEEN_FC} in V7 because a Java enum constant cannot
 * begin with a digit (kept identical semantics).</p>
 */
public enum PriFundsSource {
    FIFTEEN_FC,
    SFC,
    OWN,
    OTHER
}