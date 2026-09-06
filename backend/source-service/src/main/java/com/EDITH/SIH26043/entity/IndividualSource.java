package com.EDITH.SIH26043.entity;

import com.EDITH.SIH26043.enums.IndividualFrequency;
import com.EDITH.SIH26043.enums.Severity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.PrimaryKeyJoinColumn;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDate;

/**
 * Level-3 JOINED subclass: submissions from individual citizens.
 * Refs: 07-data-dictionary-citizen.md (IndividualSource).
 */
@Entity
@Table(name = "individual_source")
@PrimaryKeyJoinColumn(name = "source_id")
@Getter
@Setter
public class IndividualSource extends CitizenSource {

    /** May be null when {@code isAnonymous == true}. */
    @Column(name = "citizen_name", length = 100)
    private String citizenName;

    @Column(name = "contact_number", nullable = false, length = 15)
    private String contactNumber;

    @Column(name = "email_id", length = 100)
    private String emailId;

    @Column(name = "aadhaar_hash", length = 64)
    private String aadhaarHash;

    @Column(name = "voter_id_hash", length = 64)
    private String voterIdHash;

    @Column(name = "date_of_observation")
    private LocalDate dateOfObservation;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "frequency", columnDefinition = "individual_frequency")
    private IndividualFrequency frequency;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "self_reported_severity", columnDefinition = "severity")
    private Severity selfReportedSeverity;

    @Column(name = "people_affected_estimate")
    private Integer peopleAffectedEstimate;

    @Column(name = "landmark_nearby", length = 255)
    private String landmarkNearby;

    @Column(name = "reported_elsewhere")
    private Boolean reportedElsewhere;

    @Column(name = "elsewhere_reference", length = 255)
    private String elsewhereReference;

    @Column(name = "desired_resolution", columnDefinition = "text")
    private String desiredResolution;

    @Column(name = "audio_description_available")
    private Boolean audioDescriptionAvailable;
}