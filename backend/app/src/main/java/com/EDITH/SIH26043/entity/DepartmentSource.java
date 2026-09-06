package com.EDITH.SIH26043.entity;

import com.EDITH.SIH26043.enums.DepartmentProblemType;
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
 * Level-3 JOINED subclass: submissions from ministries / line departments.
 * Refs: 06-data-dictionary-government.md (DepartmentSource).
 */
@Entity
@Table(name = "department_source")
@PrimaryKeyJoinColumn(name = "source_id")
@Getter
@Setter
public class DepartmentSource extends GovernmentSource {

    @Column(name = "department_full_name", nullable = false, length = 255)
    private String departmentFullName;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "problem_type", columnDefinition = "department_problem_type")
    private DepartmentProblemType problemType;

    @Column(name = "scope_of_work", columnDefinition = "text")
    private String scopeOfWork;

    @Column(name = "target_beneficiaries_desc", columnDefinition = "text")
    private String targetBeneficiariesDesc;

    @Column(name = "geographic_coverage", columnDefinition = "text")
    private String geographicCoverage;

    @Column(name = "budget_range_min", precision = 15, scale = 2)
    private BigDecimal budgetRangeMin;

    @Column(name = "budget_range_max", precision = 15, scale = 2)
    private BigDecimal budgetRangeMax;

    @Column(name = "timeline_deadline")
    private LocalDate timelineDeadline;

    @Column(name = "expected_deliverables", columnDefinition = "text")
    private String expectedDeliverables;

    @Column(name = "technical_requirements", columnDefinition = "text")
    private String technicalRequirements;

    @Column(name = "compliance_requirements", columnDefinition = "text")
    private String complianceRequirements;

    @Column(name = "evaluation_criteria", columnDefinition = "text")
    private String evaluationCriteria;

    @Column(name = "data_resources_available", columnDefinition = "text")
    private String dataResourcesAvailable;

    @Column(name = "nodal_officer_name", length = 100)
    private String nodalOfficerName;

    @Column(name = "nodal_officer_designation", length = 100)
    private String nodalOfficerDesignation;

    @Column(name = "nodal_officer_phone", length = 15)
    private String nodalOfficerPhone;

    @Column(name = "previous_attempts_summary", columnDefinition = "text")
    private String previousAttemptsSummary;

    @Column(name = "stakeholders_involved", columnDefinition = "text")
    private String stakeholdersInvolved;
}
