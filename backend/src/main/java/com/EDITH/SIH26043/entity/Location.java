package com.EDITH.SIH26043.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.Map;

/**
 * Geometric + administrative location.
 * Refs: 05-data-dictionary-common.md (sec 3).
 *
 * <p>PostGIS {@code geo_coordinates} is maintained by a DB trigger from
 * {@code latitude}/{@code longitude} (see V3 migration).</p>
 */
@Entity
@Table(name = "location")
@Getter
@Setter
public class Location {

    @Id
    @Column(name = "location_id")
    private java.util.UUID locationId;

    @Column(name = "country", nullable = false, length = 100)
    private String country = "India";

    @Column(name = "state", nullable = false, length = 100)
    private String state;

    @Column(name = "district", nullable = false, length = 100)
    private String district;

    @Column(name = "block_tehsil", length = 100)
    private String blockTehsil;

    @Column(name = "village_ward", length = 100)
    private String villageWard;

    @Column(name = "pincode", length = 10)
    private String pincode;

    @Column(name = "latitude", nullable = false, precision = 10, scale = 8)
    private BigDecimal latitude;

    @Column(name = "longitude", nullable = false, precision = 11, scale = 8)
    private BigDecimal longitude;

    @Column(name = "landmark", length = 255)
    private String landmark;

    /** For PRI/ULB area boundaries. */
    @Column(name = "boundary_geojson")
    private Map<String, Object> boundaryGeojson;

    @Column(name = "lgd_code", length = 20)
    private String lgdCode;

    @PrePersist
    void onCreate() {
        if (locationId == null) {
            locationId = java.util.UUID.randomUUID();
        }
    }
}