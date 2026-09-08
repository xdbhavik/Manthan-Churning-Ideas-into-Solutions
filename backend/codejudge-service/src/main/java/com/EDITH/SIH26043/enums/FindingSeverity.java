package com.EDITH.SIH26043.enums;

/**
 * Severity of a security or evaluation finding. {@code HIGH} findings drive
 * configurable point penalties; {@code CRITICAL} findings (e.g. a committed
 * secret) block the evaluation into a {@code BLOCKED} verdict when
 * {@code evaluation_policy} says so.
 */
public enum FindingSeverity {
    LOW,
    MEDIUM,
    HIGH,
    CRITICAL
}
