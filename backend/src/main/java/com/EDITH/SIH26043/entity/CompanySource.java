package com.EDITH.SIH26043.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.PrimaryKeyJoinColumn;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

/**
 * Level-3 JOINED subclass: companies publishing challenges.
 * Refs: 08-data-dictionary-industry.md (CompanySource).
 */
@Entity
@Table(name = "company_source")
@PrimaryKeyJoinColumn(name = "source_id")
@Getter
@Setter
public class CompanySource extends IndustrySource {

    @Column(name = "parent_company_name", length = 255)
    private String parentCompanyName;

    @Column(name = "business_unit", length = 100)
    private String businessUnit;

    /** Annual turnover in Crores INR. */
    @Column(name = "annual_turnover_cr", precision = 10, scale = 2)
    private BigDecimal annualTurnoverCr;

    @Column(name = "employee_count")
    private Integer employeeCount;

    @Column(name = "website", length = 255)
    private String website;

    @Column(name = "is_public_sector")
    private Boolean publicSector;
}