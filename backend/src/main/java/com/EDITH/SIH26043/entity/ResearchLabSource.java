package com.EDITH.SIH26043.entity;

import com.EDITH.SIH26043.enums.LabCollabSought;
import com.EDITH.SIH26043.enums.ResearchFundingStatus;
import com.EDITH.SIH26043.enums.TrlLevel;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.PrimaryKeyJoinColumn;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * Level-3 JOINED subclass: research institutions and laboratories.
 * Refs: 10-data-dictionary-hei.md (ResearchLabSource).
 */
@Entity
@Table(name = "research_lab_source")
@PrimaryKeyJoinColumn(name = "source_id")
@Getter
@Setter
public class ResearchLabSource extends HEISource {

    @Column(name = "lab_name", length = 100)
    private String labName;

    @Column(name = "scientist_researcher_name", length = 100)
    private String scientistResearcherName;

    @Column(name = "researcher_designation", length = 100)
    private String researcherDesignation;

    @Column(name = "research_area", length = 100)
    private String researchArea;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "trl_current", columnDefinition = "trl_level")
    private TrlLevel trlCurrent;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "collaboration_sought", columnDefinition = "lab_collab_sought")
    private LabCollabSought collaborationSought;

    @Column(name = "equipment_facilities_available", columnDefinition = "text")
    private String equipmentFacilitiesAvailable;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "funding_status", columnDefinition = "research_funding_status")
    private ResearchFundingStatus fundingStatus;

    @Column(name = "patent_ip_potential", columnDefinition = "text")
    private String patentIpPotential;

    @Column(name = "publication_plan", columnDefinition = "text")
    private String publicationPlan;

    @Column(name = "ongoing_projects", columnDefinition = "text")
    private String ongoingProjects;
}