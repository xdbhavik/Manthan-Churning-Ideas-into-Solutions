package com.EDITH.SIH26043.entity;

import com.EDITH.SIH26043.enums.ShgBankLinkage;
import com.EDITH.SIH26043.enums.ShgFormingAgency;
import com.EDITH.SIH26043.enums.ShgProblemIssue;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.PrimaryKeyJoinColumn;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;

/**
 * Level-3 JOINED subclass: Self-Help Groups submitting livelihood/development needs.
 * Refs: 09-data-dictionary-community.md (SHGSource).
 */
@Entity
@Table(name = "shg_source")
@PrimaryKeyJoinColumn(name = "source_id")
@Getter
@Setter
public class SHGSource extends CommunitySource {

    @Column(name = "shg_name", nullable = false, length = 255)
    private String shgName;

    @Column(name = "shg_registration_number", length = 50)
    private String shgRegistrationNumber;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "forming_agency", columnDefinition = "shg_forming_agency")
    private ShgFormingAgency formingAgency;

    @Column(name = "member_count")
    private Integer memberCount;

    @Column(name = "member_demographics", columnDefinition = "text")
    private String memberDemographics;

    @Column(name = "savings_corpus", precision = 12, scale = 2)
    private BigDecimal savingsCorpus;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "bank_linkage_status", columnDefinition = "shg_bank_linkage")
    private ShgBankLinkage bankLinkageStatus;

    @Column(name = "village_name", length = 100)
    private String villageName;

    @Column(name = "gp_name", length = 100)
    private String gpName;

    @Column(name = "block_name", length = 100)
    private String blockName;

    @Column(name = "district_name", length = 100)
    private String districtName;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "problem_issue", columnDefinition = "shg_problem_issue")
    private ShgProblemIssue problemIssue;

    @Column(name = "current_activity", columnDefinition = "text")
    private String currentActivity;

    @Column(name = "proposed_activity", columnDefinition = "text")
    private String proposedActivity;

    @Column(name = "expected_investment_required", precision = 12, scale = 2)
    private BigDecimal expectedInvestmentRequired;

    @Column(name = "beneficiary_contribution_pct", precision = 5, scale = 2)
    private BigDecimal beneficiaryContributionPct;

    @Column(name = "market_linkage_needed")
    private Boolean marketLinkageNeeded;

    @Column(name = "training_required", columnDefinition = "text")
    private String trainingRequired;

    @Column(name = "vo_federation_support", length = 100)
    private String voFederationSupport;
}