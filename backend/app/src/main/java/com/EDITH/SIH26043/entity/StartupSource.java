package com.EDITH.SIH26043.entity;

import com.EDITH.SIH26043.enums.FundingRaised;
import com.EDITH.SIH26043.enums.StartupCollabSought;
import com.EDITH.SIH26043.enums.StartupStage;
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
 * Level-3 JOINED subclass: startups submitting problems or publishing challenges.
 * Refs: 08-data-dictionary-industry.md (StartupSource).
 */
@Entity
@Table(name = "startup_source")
@PrimaryKeyJoinColumn(name = "source_id")
@Getter
@Setter
public class StartupSource extends IndustrySource {

    @Column(name = "incorporation_date")
    private LocalDate incorporationDate;

    @Column(name = "founder_ceo_name", length = 100)
    private String founderCeoName;

    @Column(name = "founder_ceo_contact", length = 15)
    private String founderCeoContact;

    @Column(name = "sector_domain", length = 100)
    private String sectorDomain;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "stage", columnDefinition = "startup_stage")
    private StartupStage stage;

    @Column(name = "problem_they_face", columnDefinition = "text")
    private String problemTheyFace;

    @Column(name = "problem_they_want_to_publish", columnDefinition = "text")
    private String problemTheyWantToPublish;

    @Column(name = "team_size")
    private Integer teamSize;

    @Column(name = "team_composition", columnDefinition = "text")
    private String teamComposition;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "funding_raised", columnDefinition = "funding_raised")
    private FundingRaised fundingRaised;

    @Column(name = "udyam_registration", length = 20)
    private String udyamRegistration;

    @Column(name = "incubator_accelerator_affiliation", length = 255)
    private String incubatorAcceleratorAffiliation;

    @Column(name = "prototype_mvp_available")
    private Boolean prototypeMvpAvailable;

    @Column(name = "market_validation", columnDefinition = "text")
    private String marketValidation;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "collaboration_sought", columnDefinition = "startup_collab_sought")
    private StartupCollabSought collaborationSought;
}