package com.EDITH.SIH26043.entity;

import com.EDITH.SIH26043.enums.StudentInvolvement;
import com.EDITH.SIH26043.enums.UniversityProblemType;
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
 * Level-3 JOINED subclass: universities submitting research/institutional problems.
 * Refs: 10-data-dictionary-hei.md (UniversitySource).
 */
@Entity
@Table(name = "university_source")
@PrimaryKeyJoinColumn(name = "source_id")
@Getter
@Setter
public class UniversitySource extends HEISource {

    @Column(name = "principal_investigator_name", length = 100)
    private String principalInvestigatorName;

    @Column(name = "pi_designation", length = 100)
    private String piDesignation;

    @Column(name = "pi_contact_email", length = 100)
    private String piContactEmail;

    @Column(name = "pi_contact_phone", length = 15)
    private String piContactPhone;

    /** JSON array of co-investigator names and designations. */
    @Column(name = "co_investigators", columnDefinition = "text")
    private String coInvestigators;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "problem_type", columnDefinition = "university_problem_type")
    private UniversityProblemType problemType;

    @Column(name = "research_gap_literature_context", columnDefinition = "text")
    private String researchGapLiteratureContext;

    @Column(name = "research_questions_objectives", columnDefinition = "text")
    private String researchQuestionsObjectives;

    @Column(name = "methodology_approach", columnDefinition = "text")
    private String methodologyApproach;

    @Column(name = "expected_outcomes", columnDefinition = "text")
    private String expectedOutcomes;

    @Column(name = "timeline_months")
    private Integer timelineMonths;

    @Column(name = "budget_requirement", precision = 15, scale = 2)
    private BigDecimal budgetRequirement;

    @Column(name = "existing_facilities_labs", columnDefinition = "text")
    private String existingFacilitiesLabs;

    @Column(name = "ethical_clearance_needed")
    private Boolean ethicalClearanceNeeded;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "student_involvement", columnDefinition = "student_involvement")
    private StudentInvolvement studentInvolvement;

    @Column(name = "industry_government_partner", columnDefinition = "text")
    private String industryGovernmentPartner;

    @Column(name = "previous_related_work", columnDefinition = "text")
    private String previousRelatedWork;
}