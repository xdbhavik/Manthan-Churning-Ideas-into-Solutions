package com.EDITH.SIH26043.web;

import com.EDITH.SIH26043.entity.Domain;
import com.EDITH.SIH26043.service.DomainService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Public taxonomy listing (doc 11 sec 1). */
@RestController
@RequestMapping("/domains")
public class DomainController {

    private final DomainService domainService;

    public DomainController(DomainService domainService) {
        this.domainService = domainService;
    }

    @GetMapping
    public List<Domain> listRoots() {
        return domainService.rootsWithChildren();
    }
}