package com.EDITH.SIH26043.entity;

import com.EDITH.SIH26043.enums.UlbFrequency;
import com.EDITH.SIH26043.enums.UlbProblemCategory;
import com.EDITH.SIH26043.enums.UlbSeverity;
import com.EDITH.SIH26043.enums.UlbType;
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
 * Level-3 JOINED subclass: submissions from Urban Local Bodies.
 * Refs: 06-data-dictionary-government.md (ULBSource).
 */
@Entity
@Table(name = "ulb_source")
@PrimaryKeyJoinColumn(name = "source_id")
@Getter
@Setter
public class ULBSource extends GovernmentSource {

    @Column(name = "ulb_name", nullable = false, length = 255)
    private String ulbName;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "ulb_type", columnDefinition = "ulb_type")
    private UlbType ulbType;

    @Column(name = "ulb_code", length = 50)
    private String ulbCode;

    @Column(name = "ward_number", length = 20)
    private String wardNumber;

    @Column(name = "ward_name", length = 100)
    private String wardName;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "problem_category", columnDefinition = "ulb_problem_category")
    private UlbProblemCategory problemCategory;

    @Column(name = "street_area_landmark", length = 255)
    private String streetAreaLandmark;

    @Column(name = "property_id", length = 50)
    private String propertyId;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "severity", columnDefinition = "ulb_severity")
    private UlbSeverity severity;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "frequency", columnDefinition = "ulb_frequency")
    private UlbFrequency frequency;

    @Column(name = "affected_area_sqm", precision = 10, scale = 2)
    private BigDecimal affectedAreaSqm;

    @Column(name = "affected_households")
    private Integer affectedHouseholds;

    @Column(name = "existing_complaint_reference", length = 100)
    private String existingComplaintReference;

    @Column(name = "budget_head", length = 100)
    private String budgetHead;

    @Column(name = "relevant_municipal_dept", length = 100)
    private String relevantMunicipalDept;

    @Column(name = "ward_councillor_name", length = 100)
    private String wardCouncillorName;

    @Column(name = "ward_councillor_phone", length = 15)
    private String wardCouncillorPhone;

    @Column(name = "municipal_commissioner_name", length = 100)
    private String municipalCommissionerName;

    @Column(name = "municipal_commissioner_phone", length = 15)
    private String municipalCommissionerPhone;
}