package com.EDITH.SIH26043.entity;

import com.EDITH.SIH26043.enums.NgoEngagementMethod;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.PrimaryKeyJoinColumn;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * Level-3 JOINED subclass: NGOs with field-validated community problems.
 * Refs: 09-data-dictionary-community.md (NGOSource).
 */
@Entity
@Table(name = "ngo_source")
@PrimaryKeyJoinColumn(name = "source_id")
@Getter
@Setter
public class NGOSource extends CommunitySource {

    @Column(name = "ngo_darpan_id", length = 20)
    private String ngoDarpanId;

    @Column(name = "fcra_registration", length = 50)
    private String fcraRegistration;

    @Column(name = "has_12a_status")
    private Boolean has12aStatus;

    @Column(name = "has_80g_status")
    private Boolean has80gStatus;

    @Column(name = "csr1_registration", length = 50)
    private String csr1Registration;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "community_engagement_method", columnDefinition = "ngo_engagement_method")
    private NgoEngagementMethod communityEngagementMethod;

    @Column(name = "baseline_data", columnDefinition = "text")
    private String baselineData;

    @Column(name = "beneficiary_profile", columnDefinition = "text")
    private String beneficiaryProfile;

    @Column(name = "implementation_capacity", columnDefinition = "text")
    private String implementationCapacity;

    @Column(name = "community_consent_evidence", columnDefinition = "text")
    private String communityConsentEvidence;

    @Column(name = "previous_project_references", columnDefinition = "text")
    private String previousProjectReferences;

    @Column(name = "staff_count_field_presence", columnDefinition = "text")
    private String staffCountFieldPresence;
}