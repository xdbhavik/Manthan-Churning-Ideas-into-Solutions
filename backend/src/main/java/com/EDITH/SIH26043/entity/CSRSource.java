package com.EDITH.SIH26043.entity;

import com.EDITH.SIH26043.enums.CsrImplPartnerPref;
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
 * Level-3 JOINED subclass: Corporate Social Responsibility programs.
 * Refs: 08-data-dictionary-industry.md (CSRSource).
 */
@Entity
@Table(name = "csr_source")
@PrimaryKeyJoinColumn(name = "source_id")
@Getter
@Setter
public class CSRSource extends IndustrySource {

    @Column(name = "csr_policy_reference", length = 100)
    private String csrPolicyReference;

    @Column(name = "schedule_vii_alignment", length = 100)
    private String scheduleViiAlignment;

    @Column(name = "problem_project_description", columnDefinition = "text")
    private String problemProjectDescription;

    @Column(name = "target_geography", columnDefinition = "text")
    private String targetGeography;

    @Column(name = "target_beneficiaries")
    private Integer targetBeneficiaries;

    @Column(name = "budget_allocation", precision = 15, scale = 2)
    private BigDecimal budgetAllocation;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "implementation_partner_pref", columnDefinition = "csr_impl_partner_pref")
    private CsrImplPartnerPref implementationPartnerPref;

    @Column(name = "monitoring_evaluation_requirements", columnDefinition = "text")
    private String monitoringEvaluationRequirements;

    @Column(name = "previous_csr_projects", columnDefinition = "text")
    private String previousCsrProjects;

    @Column(name = "csr1_registration", length = 50)
    private String csr1Registration;

    @Column(name = "compliance_documents", columnDefinition = "text")
    private String complianceDocuments;
}