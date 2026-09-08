package com.EDITH.SIH26043.evaluation.evidence;

import com.EDITH.SIH26043.enums.FindingSeverity;

/**
 * One raw secret-scan hit before it is materialised into a
 * {@code security_finding} row (the stage attaches the evaluation id).
 */
public record SecretHit(FindingSeverity severity, String type, String file, Integer line, String message) {
}
