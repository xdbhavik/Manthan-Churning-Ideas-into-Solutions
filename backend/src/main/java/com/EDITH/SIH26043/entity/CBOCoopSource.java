package com.EDITH.SIH26043.entity;

import com.EDITH.SIH26043.enums.CboExternalSupport;
import com.EDITH.SIH26043.enums.CboMembershipType;
import com.EDITH.SIH26043.enums.CboOrgType;
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
 * Level-3 JOINED subclass: Community-Based Organizations and Cooperatives.
 * Refs: 09-data-dictionary-community.md (CBOCoopSource).
 */
@Entity
@Table(name = "cbo_coop_source")
@PrimaryKeyJoinColumn(name = "source_id")
@Getter
@Setter
public class CBOCoopSource extends CommunitySource {

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "org_type", nullable = false, columnDefinition = "cbo_org_type")
    private CboOrgType orgType;

    @Column(name = "membership_count")
    private Integer membershipCount;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "membership_type", columnDefinition = "cbo_membership_type")
    private CboMembershipType membershipType;

    @Column(name = "geographic_coverage", columnDefinition = "text")
    private String geographicCoverage;

    @Column(name = "sector", length = 100)
    private String sector;

    @Column(name = "governance_structure", columnDefinition = "text")
    private String governanceStructure;

    @Column(name = "annual_turnover", precision = 15, scale = 2)
    private BigDecimal annualTurnover;

    @Column(name = "existing_assets_infrastructure", columnDefinition = "text")
    private String existingAssetsInfrastructure;

    @Column(name = "proposed_solution", columnDefinition = "text")
    private String proposedSolution;

    @Column(name = "equity_contribution", precision = 12, scale = 2)
    private BigDecimal equityContribution;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "external_support_needed", columnDefinition = "cbo_external_support")
    private CboExternalSupport externalSupportNeeded;
}