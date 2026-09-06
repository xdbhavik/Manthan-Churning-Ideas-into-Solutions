package com.EDITH.SIH26043.entity;

import com.EDITH.SIH26043.enums.GovSubtype;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.PrimaryKeyJoinColumn;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.Map;

/**
 * Level-2 JOINED subclass: common fields for all government submissions.
 * Refs: 06-data-dictionary-government.md (GovernmentSource).
 */
@Entity
@Table(name = "government_source")
@PrimaryKeyJoinColumn(name = "source_id")
@Getter
@Setter
public class GovernmentSource extends ProblemSource {

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "gov_subtype", nullable = false, columnDefinition = "gov_subtype")
    private GovSubtype govSubtype;

    @Column(name = "ministry_name", length = 255)
    private String ministryName;

    @Column(name = "department_name", length = 255)
    private String departmentName;

    /** Domain used for official-email verification, e.g. gov.in. */
    @Column(name = "official_email_domain", length = 100)
    private String officialEmailDomain;

    /** e.g. "Jal Jeevan Mission". */
    @Column(name = "scheme_mission_reference", length = 100)
    private String schemeMissionReference;

    @Column(name = "project_code", length = 100)
    private String projectCode;

    /** Sanction letter / office memo URL. */
    @Column(name = "authorization_document_url", length = 500)
    private String authorizationDocumentUrl;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "authorization_metadata")
    private Map<String, Object> authorizationMetadata;
}
