package com.EDITH.SIH26043.repository;

import com.EDITH.SIH26043.entity.Location;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface LocationRepository extends JpaRepository<Location, UUID> {

    Optional<Location> findByLgdCode(String lgdCode);

    java.util.List<Location> findByStateAndDistrictAndBlockTehsil(String state, String district, String blockTehsil);
}