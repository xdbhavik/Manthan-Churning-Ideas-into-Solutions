package com.EDITH.SIH26043.web;

import com.EDITH.SIH26043.config.OpenApiConfig;
import com.EDITH.SIH26043.entity.Domain;
import com.EDITH.SIH26043.service.DomainService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Public taxonomy listing (doc 11 sec 1). */
@Tag(name = OpenApiConfig.TAG_DOMAINS)
@RestController
@RequestMapping("/domains")
public class DomainController {

    private final DomainService domainService;

    public DomainController(DomainService domainService) {
        this.domainService = domainService;
    }

    @Operation(
            summary = "🗂️ Domain taxonomy (tree)",
            description = """
                    🌐 **Public** endpoint.
                    Returns the full hierarchical tree of problem domains seeded by Flyway V6.  
                    Roots → level-1 → level-2 children. Pass any domain's UUID to  
                    `POST /problems.domainIds[]` (first entry = primary domain).""")
    @ApiResponse(responseCode = "200", description = "Tree of domain entities (root level, children populated)")
    @GetMapping
    public List<Domain> listRoots() {
        return domainService.rootsWithChildren();
    }
}