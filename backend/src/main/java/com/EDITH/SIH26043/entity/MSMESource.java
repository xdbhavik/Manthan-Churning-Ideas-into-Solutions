package com.EDITH.SIH26043.entity;

import com.EDITH.SIH26043.enums.MsmeEnterpriseType;
import com.EDITH.SIH26043.enums.MsmeExpectedSupport;
import com.EDITH.SIH26043.enums.MsmeProblemCategory;
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
 * Level-3 JOINED subclass: Micro, Small & Medium Enterprises.
 * Refs: 08-data-dictionary-industry.md (MSMESource).
 */
@Entity
@Table(name = "msme_source")
@PrimaryKeyJoinColumn(name = "source_id")
@Getter
@Setter
public class MSMESource extends IndustrySource {

    @Column(name = "udyam_registration_number", nullable = false, length = 20)
    private String udyamRegistrationNumber;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "enterprise_type", columnDefinition = "msme_enterprise_type")
    private MsmeEnterpriseType enterpriseType;

    @Column(name = "product_service_category", length = 100)
    private String productServiceCategory;

    @Column(name = "nic_code", length = 10)
    private String nicCode;

    @Column(name = "annual_turnover", precision = 15, scale = 2)
    private BigDecimal annualTurnover;

    @Column(name = "employment_count")
    private Integer employmentCount;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "problem_category", columnDefinition = "msme_problem_category")
    private MsmeProblemCategory problemCategory;

    @Column(name = "specific_challenge", columnDefinition = "text")
    private String specificChallenge;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "expected_support", columnDefinition = "msme_expected_support")
    private MsmeExpectedSupport expectedSupport;

    @Column(name = "district_industry_centre", length = 100)
    private String districtIndustryCentre;
}