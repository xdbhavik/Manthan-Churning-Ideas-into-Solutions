package com.EDITH.SIH26043.service;

import com.EDITH.SIH26043.entity.Domain;
import com.EDITH.SIH26043.entity.University;
import com.EDITH.SIH26043.entity.UniversityDomain;
import com.EDITH.SIH26043.exception.ApiException;
import com.EDITH.SIH26043.repository.DomainRepository;
import com.EDITH.SIH26043.repository.UniversityDomainRepository;
import com.EDITH.SIH26043.repository.UniversityRepository;
import com.EDITH.SIH26043.service.analysis.OpenAiCompatibleDomainResolutionClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Resolves the audience for a {@code AUTO_SELECTED_UNIVERSITIES} submission: the
 * AI names the problem's domains, and the university match itself is a plain set
 * intersection over the seeded catalog. The model never sees or names a
 * university.
 *
 * <p><strong>Fail closed.</strong> Every way this can go wrong — no model
 * configured, an unusable answer, an answer that names no known domain, or a
 * domain no active university covers — is a {@code 400} asking the submitter to
 * pick universities manually. It never widens the audience and never falls back
 * to the submitter's own {@code domainIds}, because a silent audience change is
 * exactly what this rule exists to avoid.</p>
 *
 * <p>Deliberately <em>not</em> transactional, and never called from inside the
 * submission transaction: it makes a network call to the model that can take up
 * to a minute, and holding a pooled DB connection for that long would starve
 * concurrent submissions.</p>
 */
@Service
public class AutoUniversitySelectionService {

    private static final Logger log =
            LoggerFactory.getLogger(AutoUniversitySelectionService.class);

    private final DomainRepository domainRepository;
    private final UniversityDomainRepository universityDomainRepository;
    private final UniversityRepository universityRepository;
    private final OpenAiCompatibleDomainResolutionClient domainResolutionClient;

    public AutoUniversitySelectionService(DomainRepository domainRepository,
                                          UniversityDomainRepository universityDomainRepository,
                                          UniversityRepository universityRepository,
                                          OpenAiCompatibleDomainResolutionClient domainResolutionClient) {
        this.domainRepository = domainRepository;
        this.universityDomainRepository = universityDomainRepository;
        this.universityRepository = universityRepository;
        this.domainResolutionClient = domainResolutionClient;
    }

    /**
     * @param domainIds the submitter's own pick, used as non-binding context for
     *                  the model only — it neither constrains the answer nor
     *                  rescues a failure.
     * @return the non-empty list of university names to snapshot into
     *         {@code problem.access_universities}, ordered by name.
     * @throws ApiException 400 whenever the audience cannot be resolved.
     */
    public List<String> resolve(String title, String description, List<UUID> domainIds) {
        List<Domain> roots = domainRepository.findByParentDomainIsNull();
        if (roots.isEmpty()) {
            // Seed data is missing — a deployment fault, not a bad request. Still fail
            // closed: routing on an empty taxonomy could only produce a wrong audience.
            log.error("Domain taxonomy is empty; AUTO_SELECTED_UNIVERSITIES cannot be resolved");
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "AI university selection is not available (no domain taxonomy is "
                            + "configured). Choose another access rule and select the "
                            + "universities manually.");
        }

        List<OpenAiCompatibleDomainResolutionClient.DomainOption> options = roots.stream()
                .map(root -> new OpenAiCompatibleDomainResolutionClient.DomainOption(
                        root.getDomainId(), root.getDomainName(), root.getDescription()))
                .toList();

        Optional<List<String>> answer = domainResolutionClient.resolve(
                title, description, hintNames(domainIds), options);
        if (answer.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, unavailableMessage());
        }

        List<UUID> resolvedDomainIds = knownDomainIds(answer.get(), roots);
        if (resolvedDomainIds.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "AI university selection could not place this problem in a known domain. "
                            + "Choose another access rule and select the universities manually.");
        }

        List<String> names = matchingUniversityNames(resolvedDomainIds);
        if (names.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "AI university selection found no university for this problem's domain. "
                            + "Choose another access rule and select the universities manually.");
        }
        return names;
    }

    /**
     * The domains the submitter picked, as names, for the model's context only.
     * Unknown ids are simply omitted — validation of the persisted set happens
     * later, in the submission transaction.
     */
    private List<String> hintNames(List<UUID> domainIds) {
        if (domainIds == null || domainIds.isEmpty()) {
            return List.of();
        }
        return domainRepository.findAllById(domainIds).stream()
                .map(Domain::getDomainName)
                .toList();
    }

    /**
     * Keeps only ids that name a seeded root domain, de-duplicated and in the
     * model's own relevance order. An invented id is dropped rather than failed on,
     * matching how the scoring clients treat hallucinated criteria — a partly
     * usable answer still routes.
     */
    private List<UUID> knownDomainIds(List<String> rawIds, List<Domain> roots) {
        Map<UUID, Domain> byId = roots.stream()
                .collect(Collectors.toMap(Domain::getDomainId, Function.identity()));
        LinkedHashSet<UUID> known = new LinkedHashSet<>();
        for (String raw : rawIds) {
            UUID id = parseUuid(raw);
            if (id == null) {
                log.warn("Dropping non-UUID domain id from model output: {}", raw);
                continue;
            }
            if (!byId.containsKey(id)) {
                log.warn("Dropping domain id outside the seeded taxonomy: {}", id);
                continue;
            }
            known.add(id);
        }
        return new ArrayList<>(known);
    }

    /**
     * The deterministic half of the feature: intersect the resolved domains with
     * the catalog and return the active institutions' names, sorted so the
     * snapshot is stable regardless of row order.
     */
    private List<String> matchingUniversityNames(List<UUID> domainIds) {
        List<UniversityDomain> links = universityDomainRepository.findByIdDomainIdIn(domainIds);
        if (links.isEmpty()) {
            return List.of();
        }
        LinkedHashSet<UUID> universityIds = links.stream()
                .map(link -> link.getId().getUniversityId())
                .collect(Collectors.toCollection(LinkedHashSet::new));
        return universityRepository.findByUniversityIdInAndActiveIsTrue(universityIds).stream()
                .map(University::getName)
                .filter(name -> name != null && !name.isBlank())
                .sorted(Comparator.comparing(name -> name, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    private static UUID parseUuid(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return UUID.fromString(value.trim());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private static String unavailableMessage() {
        return "AI university selection is unavailable right now. "
                + "Choose another access rule and select the universities manually.";
    }
}
