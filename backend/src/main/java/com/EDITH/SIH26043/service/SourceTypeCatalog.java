package com.EDITH.SIH26043.service;

import com.EDITH.SIH26043.enums.SourceBucket;
import com.EDITH.SIH26043.enums.SubEntityType;
import com.EDITH.SIH26043.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * Static registry of registrable source types: display metadata for
 * GET /registration/source-types plus the payload keys that must be present
 * before a registration can leave DRAFT.
 *
 * <p>Payload keys use entity property names (camelCase) so SourceMapper maps
 * them straight onto the JOINED subclass columns.</p>
 */
@Component
public class SourceTypeCatalog {

    public record SourceTypeMeta(SubEntityType code, String displayName, List<String> requiredFields) {}

    public record BucketMeta(SourceBucket code, String displayName, List<SourceTypeMeta> types) {}

    private static final Map<SubEntityType, List<String>> REQUIRED_FIELDS = Map.ofEntries(
            Map.entry(SubEntityType.DEPARTMENT, List.of("departmentFullName")),
            Map.entry(SubEntityType.PRI, List.of("priLevel", "priName")),
            Map.entry(SubEntityType.ULB, List.of("ulbName")),
            Map.entry(SubEntityType.INDIVIDUAL, List.of("contactNumber")),
            Map.entry(SubEntityType.RWA, List.of("rwaName")),
            Map.entry(SubEntityType.COMPANY, List.of("companyName")),
            Map.entry(SubEntityType.STARTUP, List.of("companyName")),
            Map.entry(SubEntityType.MSME, List.of("companyName", "udyamRegistrationNumber")),
            Map.entry(SubEntityType.CSR, List.of("companyName")),
            Map.entry(SubEntityType.NGO, List.of("organizationName")),
            Map.entry(SubEntityType.SHG, List.of("organizationName")),
            Map.entry(SubEntityType.CBO_COOP, List.of("organizationName")),
            Map.entry(SubEntityType.UNIVERSITY, List.of("institutionName")),
            Map.entry(SubEntityType.RESEARCH_LAB, List.of("institutionName"))
    );

    /** Public source-type catalog for the registration wizard. */
    public List<BucketMeta> catalog() {
        return List.of(
                new BucketMeta(SourceBucket.GOVT, "Government", List.of(
                        new SourceTypeMeta(SubEntityType.DEPARTMENT, "Government Department",
                                REQUIRED_FIELDS.get(SubEntityType.DEPARTMENT)),
                        new SourceTypeMeta(SubEntityType.PRI, "Panchayati Raj Institution",
                                REQUIRED_FIELDS.get(SubEntityType.PRI)),
                        new SourceTypeMeta(SubEntityType.ULB, "Urban Local Body",
                                REQUIRED_FIELDS.get(SubEntityType.ULB)))),
                new BucketMeta(SourceBucket.CITIZEN, "Citizen", List.of(
                        new SourceTypeMeta(SubEntityType.INDIVIDUAL, "Individual Citizen",
                                REQUIRED_FIELDS.get(SubEntityType.INDIVIDUAL)),
                        new SourceTypeMeta(SubEntityType.RWA, "Resident Welfare Association",
                                REQUIRED_FIELDS.get(SubEntityType.RWA)))),
                new BucketMeta(SourceBucket.INDUSTRY, "Industry", List.of(
                        new SourceTypeMeta(SubEntityType.COMPANY, "Company",
                                REQUIRED_FIELDS.get(SubEntityType.COMPANY)),
                        new SourceTypeMeta(SubEntityType.STARTUP, "Startup",
                                REQUIRED_FIELDS.get(SubEntityType.STARTUP)),
                        new SourceTypeMeta(SubEntityType.MSME, "MSME",
                                REQUIRED_FIELDS.get(SubEntityType.MSME)),
                        new SourceTypeMeta(SubEntityType.CSR, "CSR Organisation",
                                REQUIRED_FIELDS.get(SubEntityType.CSR)))),
                new BucketMeta(SourceBucket.COMMUNITY, "Community", List.of(
                        new SourceTypeMeta(SubEntityType.NGO, "NGO",
                                REQUIRED_FIELDS.get(SubEntityType.NGO)),
                        new SourceTypeMeta(SubEntityType.SHG, "Self-Help Group",
                                REQUIRED_FIELDS.get(SubEntityType.SHG)),
                        new SourceTypeMeta(SubEntityType.CBO_COOP, "CBO / Cooperative",
                                REQUIRED_FIELDS.get(SubEntityType.CBO_COOP)))),
                new BucketMeta(SourceBucket.HEI, "Higher Education / Research", List.of(
                        new SourceTypeMeta(SubEntityType.UNIVERSITY, "University",
                                REQUIRED_FIELDS.get(SubEntityType.UNIVERSITY)),
                        new SourceTypeMeta(SubEntityType.RESEARCH_LAB, "Research Lab",
                                REQUIRED_FIELDS.get(SubEntityType.RESEARCH_LAB))))
        );
    }

    /** Bucket for a sub-entity type; the single source of truth for the mapping. */
    public SourceBucket bucketOf(SubEntityType type) {
        return switch (type) {
            case DEPARTMENT, PRI, ULB -> SourceBucket.GOVT;
            case INDIVIDUAL, RWA -> SourceBucket.CITIZEN;
            case COMPANY, STARTUP, MSME, CSR -> SourceBucket.INDUSTRY;
            case NGO, SHG, CBO_COOP -> SourceBucket.COMMUNITY;
            case UNIVERSITY, RESEARCH_LAB -> SourceBucket.HEI;
        };
    }

    /** Rejects submit when any mandatory payload key is absent/blank. */
    public void validatePayload(SubEntityType type, Map<String, Object> payload) {
        List<String> missing = requiredFields(type).stream()
                .filter(field -> payload == null
                        || payload.get(field) == null
                        || String.valueOf(payload.get(field)).isBlank())
                .toList();
        if (!missing.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Missing required fields for " + type + ": " + String.join(", ", missing));
        }
    }

    private List<String> requiredFields(SubEntityType type) {
        List<String> fields = REQUIRED_FIELDS.get(type);
        if (fields == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Unknown source type " + type);
        }
        return fields;
    }
}
