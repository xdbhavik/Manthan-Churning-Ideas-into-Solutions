package com.EDITH.SIH26043.enums;

/**
 * SHG bank linkage status.
 * Refs: 09-data-dictionary-community.md (SHGSource.bank_linkage_status).
 */
public enum ShgBankLinkage {
    SAVINGS_ONLY,
    LOAN_TAKEN,
    LOAN_REPAID,
    NO_ACCOUNT
}