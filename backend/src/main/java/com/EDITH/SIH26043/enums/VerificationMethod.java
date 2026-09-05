package com.EDITH.SIH26043.enums;

/**
 * Method used to verify a problem source's identity.
 * Refs: 05-data-dictionary-common.md (sec 8).
 */
public enum VerificationMethod {
    OFFICIAL_EMAIL,
    AUTHORIZATION_DOC,
    OTP,
    REGISTRATION_API,
    INSTITUTIONAL_EMAIL,
    MANUAL_REVIEW
}