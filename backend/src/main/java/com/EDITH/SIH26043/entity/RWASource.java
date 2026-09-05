package com.EDITH.SIH26043.entity;

import com.EDITH.SIH26043.enums.RwaScope;
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
 * Level-3 JOINED subclass: submissions from Resident Welfare Associations.
 * Refs: 07-data-dictionary-citizen.md (RWASource).
 */
@Entity
@Table(name = "rwa_source")
@PrimaryKeyJoinColumn(name = "source_id")
@Getter
@Setter
public class RWASource extends CitizenSource {

    @Column(name = "rwa_name", nullable = false, length = 255)
    private String rwaName;

    @Column(name = "rwa_registration_number", length = 50)
    private String rwaRegistrationNumber;

    @Column(name = "colony_apartment_name", length = 255)
    private String colonyApartmentName;

    @Column(name = "representative_name", length = 100)
    private String representativeName;

    @Column(name = "representative_designation", length = 50)
    private String representativeDesignation;

    @Column(name = "residents_represented")
    private Integer residentsRepresented;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "scope", columnDefinition = "rwa_scope")
    private RwaScope scope;

    @Column(name = "resolution_passed")
    private Boolean resolutionPassed;

    @Column(name = "resolution_date")
    private LocalDate resolutionDate;

    @Column(name = "previous_communication_with_authorities", columnDefinition = "text")
    private String previousCommunicationWithAuthorities;
}