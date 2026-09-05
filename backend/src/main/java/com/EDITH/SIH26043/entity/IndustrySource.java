package com.EDITH.SIH26043.entity;

import com.EDITH.SIH26043.enums.CompanySize;
import com.EDITH.SIH26043.enums.IndustryProblemType;
import com.EDITH.SIH26043.enums.IndustrySubtype;
import com.EDITH.SIH26043.enums.IpArrangement;
import com.EDITH.SIH26043.enums.TrlLevel;
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
 * Level-2 JOINED subclass: common fields for industry submissions.
 * Refs: 08-data-dictionary-industry.md (IndustrySource).
 */
@Entity
@Table(name = "industry_source")
@PrimaryKeyJoinColumn(name = "source_id")
@Getter
@Setter
public class IndustrySource extends ProblemSource {

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "industry_subtype", nullable = false, columnDefinition = "industry_subtype")
    private IndustrySubtype industrySubtype;

    @Column(name = "company_name", nullable = false, length = 255)
    private String companyName;

    @Column(name = "cin_registration_number", length = 25)
    private String cinRegistrationNumber;

    @Column(name = "industry_sector", length = 100)
    private String industrySector;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "company_size", columnDefinition = "company_size")
    private CompanySize companySize;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "problem_type", columnDefinition = "industry_problem_type")
    private IndustryProblemType problemType;

    @Column(name = "challenge_brief", columnDefinition = "text")
    private String challengeBrief;

    @Column(name = "current_state", columnDefinition = "text")
    private String currentState;

    @Column(name = "desired_state_success_metrics", columnDefinition = "text")
    private String desiredStateSuccessMetrics;

    @Column(name = "constraints", columnDefinition = "text")
    private String constraints;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "technology_readiness_level", columnDefinition = "trl_level")
    private TrlLevel technologyReadinessLevel;

    @Column(name = "data_available_for_solvers", columnDefinition = "text")
    private String dataAvailableForSolvers;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "ip_arrangement", columnDefinition = "ip_arrangement")
    private IpArrangement ipArrangement;

    @Column(name = "budget_prize_funding", precision = 15, scale = 2)
    private BigDecimal budgetPrizeFunding;

    @Column(name = "pilot_opportunity")
    private Boolean pilotOpportunity;

    @Column(name = "commercialization_pathway", columnDefinition = "text")
    private String commercializationPathway;

    @Column(name = "internal_champion_name", length = 100)
    private String internalChampionName;

    @Column(name = "internal_champion_designation", length = 100)
    private String internalChampionDesignation;

    @Column(name = "nda_required", nullable = false)
    private boolean ndaRequired = false;

    @Column(name = "previous_solutions_tried", columnDefinition = "text")
    private String previousSolutionsTried;
}