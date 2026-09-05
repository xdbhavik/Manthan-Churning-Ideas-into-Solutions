package com.EDITH.SIH26043.entity;

import com.EDITH.SIH26043.enums.FieldVerificationStatus;
import com.EDITH.SIH26043.enums.PriFundsSource;
import com.EDITH.SIH26043.enums.PriIdentifiedThrough;
import com.EDITH.SIH26043.enums.PriLevel;
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
 * Level-3 JOINED subclass: submissions from Panchayati Raj Institutions.
 * Refs: 06-data-dictionary-government.md (PRISource).
 */
@Entity
@Table(name = "pri_source")
@PrimaryKeyJoinColumn(name = "source_id")
@Getter
@Setter
public class PRISource extends GovernmentSource {

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "pri_level", nullable = false, columnDefinition = "pri_level")
    private PriLevel priLevel;

    @Column(name = "pri_name", nullable = false, length = 255)
    private String priName;

    @Column(name = "pri_code", length = 50)
    private String priCode;

    @Column(name = "gpdp_reference", length = 100)
    private String gpdpReference;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "identified_through", columnDefinition = "pri_identified_through")
    private PriIdentifiedThrough identifiedThrough;

    @Column(name = "sector_theme", length = 100)
    private String sectorTheme;

    @Column(name = "households_affected")
    private Integer householdsAffected;

    @Column(name = "population_affected_male")
    private Integer populationAffectedMale;

    @Column(name = "population_affected_female")
    private Integer populationAffectedFemale;

    @Column(name = "population_affected_other")
    private Integer populationAffectedOther;

    @Column(name = "village_ward_names", columnDefinition = "text")
    private String villageWardNames;

    @Column(name = "existing_infrastructure_status", columnDefinition = "text")
    private String existingInfrastructureStatus;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "funds_source", columnDefinition = "pri_funds_source")
    private PriFundsSource fundsSource;

    @Column(name = "funds_available", precision = 15, scale = 2)
    private BigDecimal fundsAvailable;

    @Column(name = "priority_ranking")
    private Integer priorityRanking;

    @Column(name = "sarpanch_name", length = 100)
    private String sarpanchName;

    @Column(name = "secretary_name", length = 100)
    private String secretaryName;

    @Column(name = "gram_sabha_resolution_no", length = 50)
    private String gramSabhaResolutionNo;

    @Column(name = "gram_sabha_resolution_date")
    private LocalDate gramSabhaResolutionDate;

    @Column(name = "related_schemes", columnDefinition = "text")
    private String relatedSchemes;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "field_verification_status", columnDefinition = "field_verification_status")
    private FieldVerificationStatus fieldVerificationStatus;
}