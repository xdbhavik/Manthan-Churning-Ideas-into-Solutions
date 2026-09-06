package com.EDITH.SIH26043.web.dto;

import com.EDITH.SIH26043.service.SourceTypeCatalog;

import java.util.List;

/** GET /registration/source-types payload. */
public record SourceTypesResponse(List<SourceTypeCatalog.BucketMeta> categories) {

    public static SourceTypesResponse from(List<SourceTypeCatalog.BucketMeta> catalog) {
        return new SourceTypesResponse(catalog);
    }
}
