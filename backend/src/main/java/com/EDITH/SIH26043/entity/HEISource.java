package com.EDITH.SIH26043.entity;

import com.EDITH.SIH26043.enums.HeiInstitutionType;
import com.EDITH.SIH26043.enums.HeiSubtype;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.PrimaryKeyJoinColumn;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * Level-2 JOINED subclass: common fields for Higher Education Institution submissions.
 * Refs: 10-data-dictionary-hei.md (HEISource).
 */
@Entity
@Table(name = "hei_source")
@PrimaryKeyJoinColumn(name = "source_id")
@Getter
@Setter
public class HEISource extends ProblemSource {

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "hei_subtype", nullable = false, columnDefinition = "hei_subtype")
    private HeiSubtype heiSubtype;

    @Column(name = "institution_name", nullable = false, length = 255)
    private String institutionName;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "institution_type", columnDefinition = "hei_institution_type")
    private HeiInstitutionType institutionType;

    @Column(name = "naac_grade", length = 10)
    private String naacGrade;

    @Column(name = "nirf_rank")
    private Integer nirfRank;

    @Column(name = "ugc_aicte_affiliation", length = 100)
    private String ugcAicteAffiliation;

    @Column(name = "department_centre_name", length = 100)
    private String departmentCentreName;
}