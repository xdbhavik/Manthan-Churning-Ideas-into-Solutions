package com.EDITH.SIH26043.entity;

import com.EDITH.SIH26043.enums.CitizenSubtype;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.PrimaryKeyJoinColumn;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * Level-2 JOINED subclass: common fields for citizen submissions.
 * Refs: 07-data-dictionary-citizen.md (CitizenSource).
 */
@Entity
@Table(name = "citizen_source")
@PrimaryKeyJoinColumn(name = "source_id")
@Getter
@Setter
public class CitizenSource extends ProblemSource {

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "citizen_subtype", nullable = false, columnDefinition = "citizen_subtype")
    private CitizenSubtype citizenSubtype;

    @Column(name = "is_anonymous", nullable = false)
    private boolean anonymous = false;

    @Column(name = "preferred_language", nullable = false, length = 10)
    private String preferredLanguage = "en";

    @Column(name = "willing_to_validate_solution", nullable = false)
    private boolean willingToValidateSolution = true;
}