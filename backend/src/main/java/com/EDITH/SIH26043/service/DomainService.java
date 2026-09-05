package com.EDITH.SIH26043.service;

import com.EDITH.SIH26043.entity.Domain;
import com.EDITH.SIH26043.repository.DomainRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Read-only taxonomy access for the public /domains endpoint.
 */
@Service
public class DomainService {

    private final DomainRepository domainRepository;

    public DomainService(DomainRepository domainRepository) {
        this.domainRepository = domainRepository;
    }

    @Transactional(readOnly = true)
    public List<Domain> rootsWithChildren() {
        return buildTree(domainRepository.findByParentDomainIsNull());
    }

    private List<Domain> buildTree(List<Domain> roots) {
        for (Domain d : roots) {
            d.setChildren(domainRepository.findByParentDomainDomainId(d.getDomainId()));
            for (Domain child : d.getChildren()) {
                child.setChildren(domainRepository.findByParentDomainDomainId(child.getDomainId()));
            }
        }
        return roots;
    }
}