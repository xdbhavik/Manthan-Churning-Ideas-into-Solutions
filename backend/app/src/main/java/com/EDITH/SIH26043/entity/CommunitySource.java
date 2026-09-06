package com.EDITH.SIH26043.entity;

import com.EDITH.SIH26043.enums.CommunityRegistrationType;
import com.EDITH.SIH26043.enums.CommunitySubtype;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.PrimaryKeyJoinColumn;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Level-2 JOINED subclass: common fields for community submissions.
 * Refs: 09-data-dictionary-community.md (CommunitySource).
 */
@Entity
@Table(name = "community_source")
@PrimaryKeyJoinColumn(name = "source_id")
@Getter
@Setter
public class CommunitySource extends ProblemSource {

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "community_subtype", nullable = false, columnDefinition = "community_subtype")
    private CommunitySubtype communitySubtype;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "registration_type", columnDefinition = "community_registration_type")
    private CommunityRegistrationType registrationType;

    @Column(name = "registration_date")
    private LocalDate registrationDate;

    @Column(name = "years_of_operation")
    private Integer yearsOfOperation;

    @Column(name = "geographic_focus", columnDefinition = "text")
    private String geographicFocus;

    @Column(name = "sectoral_expertise", columnDefinition = "text")
    private String sectoralExpertise;

    @Column(name = "problem_statement", columnDefinition = "text")
    private String problemStatement;

    @Column(name = "proposed_intervention", columnDefinition = "text")
    private String proposedIntervention;

    @Column(name = "budget_estimate", precision = 15, scale = 2)
    private BigDecimal budgetEstimate;

    @Column(name = "monitoring_plan", columnDefinition = "text")
    private String monitoringPlan;
}