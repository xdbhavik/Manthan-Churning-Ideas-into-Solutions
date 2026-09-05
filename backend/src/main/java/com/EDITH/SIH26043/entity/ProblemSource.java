package com.EDITH.SIH26043.entity;

import com.EDITH.SIH26043.enums.SourceBucket;
import com.EDITH.SIH26043.enums.SubEntityType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Inheritance;
import jakarta.persistence.InheritanceType;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/**
 * Abstract base for all problem submitters (JOINED inheritance root).
 * Refs: 05-data-dictionary-common.md (sec 2 ProblemSource).
 *
 * <p>Bucket-specific subtypes are modelled as JOINED subclass tables
 * (e.g. {@link GovernmentSource} -> {@link DepartmentSource}).</p>
 */
@Entity
@Table(name = "problem_source")
@Inheritance(strategy = InheritanceType.JOINED)
@Getter
@Setter
public class ProblemSource {

    @Id
    @Column(name = "source_id")
    private UUID sourceId;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "bucket", nullable = false, columnDefinition = "source_bucket")
    private SourceBucket bucket;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "sub_entity_type", nullable = false, columnDefinition = "sub_entity_type")
    private SubEntityType subEntityType;

    @Column(name = "contact_person_name", length = 100)
    private String contactPersonName;

    @Column(name = "contact_email", length = 100)
    private String contactEmail;

    @Column(name = "contact_phone", length = 15)
    private String contactPhone;

    @Column(name = "organization_name", length = 255)
    private String organizationName;

    @Column(name = "registration_number", length = 50)
    private String registrationNumber;

    @Column(name = "is_verified_source", nullable = false)
    private boolean verifiedSource = false;

    @Column(name = "registered_at", nullable = false)
    private Instant registeredAt;

    /** Verification proof: API response payload, document URLs, etc. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "verification_credentials")
    private Map<String, Object> verificationCredentials;
}
