package com.EDITH.SIH26043.service.analysis;

import com.EDITH.SIH26043.enums.AnalysisStatus;
import org.springframework.stereotype.Service;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Deterministic keyword/severity/urgency classifier used when the LLM is
 * unavailable (§13.5). Produces the same JSON shape as the Claude client so the
 * pipeline never blocks on the network. Status is {@code HEURISTIC_FALLBACK}.
 */
@Service
public class HeuristicAnalysisFallback {

    /** Keyword buckets matched against the concatenated problem text. */
    private static final List<String> WATER_KEYWORDS = List.of("water", "drinking water", "pipeline", "hand pump", "irrigation");
    private static final List<String> HEALTH_KEYWORDS = List.of("health", "hospital", "disease", "clinic", "sanitation", "sewage");
    private static final List<String> EDUCATION_KEYWORDS = List.of("school", "education", "teacher", "college", "digital literacy");
    private static final List<String> ROAD_KEYWORDS = List.of("road", "bridge", "transport", "pothole", "street light");
    private static final List<String> AGRICULTURE_KEYWORDS = List.of("farmer", "crop", "agriculture", "farming", "fertilizer");
    private static final List<String> DIGITAL_KEYWORDS = List.of("internet", "network", "app", "digital", "software", "portal", "data");

    private static final Map<String, String[]> IMPACT_VOCAB = Map.ofEntries(
            Map.entry("HEALTH", new String[]{"health", "disease", "hospital", "sanitation", "water", "sewage"}),
            Map.entry("LIVELIHOOD", new String[]{"farmer", "crop", "livelihood", "job", "wage", "fisher"}),
            Map.entry("EDUCATION", new String[]{"school", "education", "teacher", "college"}),
            Map.entry("INFRASTRUCTURE", new String[]{"road", "bridge", "pipeline", "building", "power", "street light"}),
            Map.entry("PUBLIC_SERVICE", new String[]{"service", "ration", "pension", "certificate", "complaint"}),
            Map.entry("ENVIRONMENT", new String[]{"pollution", "waste", "forest", "river", "climate", "air"}),
            Map.entry("SAFETY", new String[]{"crime", "safety", "accident", "flood", "disaster"}),
            Map.entry("DIGITAL", new String[]{"internet", "network", "app", "digital", "software", "portal"}),
            Map.entry("ECONOMIC", new String[]{"market", "price", "loan", "business", "economic"}),
            Map.entry("SOCIAL", new String[]{"women", "child", "disabled", "tribal", "caste", "social"})
    );

    public AnalysisResult analyze(ProblemContext context) {
        String haystack = textOf(context);
        String lower = haystack.toLowerCase(Locale.ROOT);

        Set<String> impactAreas = new LinkedHashSet<>();
        for (Map.Entry<String, String[]> entry : IMPACT_VOCAB.entrySet()) {
            for (String keyword : entry.getValue()) {
                if (lower.contains(keyword)) {
                    impactAreas.add(entry.getKey());
                    break;
                }
            }
        }
        if (impactAreas.isEmpty()) {
            impactAreas.add("SOCIAL");
        }

        String socialImpact = classifySocialImpact(context, lower);
        String complexity = classifyComplexity(context, lower);
        String potentialScale = classifyScale(context);
        String technologyRelevance = classifyTechnology(context, lower);

        String[] category = detectCategory(lower);
        String aiSummary = "Heuristic profile: %s (complexity %s, social impact %s, scale %s) for \"%s\"."
                .formatted(category[0], complexity, socialImpact, potentialScale, context.title());

        // HashMap, not Map.of: sourceBucket/severity/urgency are nullable on the
        // problem row and Map.of rejects null values.
        Map<String, Object> raw = new java.util.HashMap<>();
        raw.put("sourceBucket", context.sourceBucket());
        raw.put("severity", context.severity());
        raw.put("urgency", context.urgency());
        raw.put("evidenceCount", context.evidenceCount());

        return new AnalysisResult(
                category[0],
                category[1],
                category[2],
                List.copyOf(impactAreas),
                complexity,
                potentialScale,
                technologyRelevance,
                socialImpact,
                aiSummary,
                "heuristic",
                "heuristic",
                AnalysisStatus.HEURISTIC_FALLBACK,
                raw,
                "Claude analysis unavailable; deterministic fallback applied");
    }

    private String textOf(ProblemContext context) {
        return String.join(" ",
                nvl(context.title()),
                nvl(context.description()),
                nvl(context.expectedOutcome()),
                nvl(context.existingIntervention()),
                nvl(context.sourceBucket()),
                nvl(context.subEntityType()));
    }

    private static String[] detectCategory(String lower) {
        if (containsAny(lower, WATER_KEYWORDS)) {
            return new String[]{"WATER_SUPPLY", "Water & Sanitation", "WATER"};
        }
        if (containsAny(lower, HEALTH_KEYWORDS)) {
            return new String[]{"PUBLIC_HEALTH", "Health", "HEALTH"};
        }
        if (containsAny(lower, EDUCATION_KEYWORDS)) {
            return new String[]{"EDUCATION_ACCESS", "Education", "EDUCATION"};
        }
        if (containsAny(lower, ROAD_KEYWORDS)) {
            return new String[]{"TRANSPORT_INFRA", "Infrastructure", "TRANSPORT"};
        }
        if (containsAny(lower, AGRICULTURE_KEYWORDS)) {
            return new String[]{"AGRICULTURE_SUPPORT", "Agriculture", "AGRICULTURE"};
        }
        if (containsAny(lower, DIGITAL_KEYWORDS)) {
            return new String[]{"DIGITAL_SERVICES", "Digital & Governance", "DIGITAL"};
        }
        return new String[]{"GENERAL_PUBLIC_SERVICE", "Public Services", "PUBLIC_SERVICE"};
    }

    private static String classifySocialImpact(ProblemContext context, String lower) {
        String severity = nvl(context.severity()).toUpperCase(Locale.ROOT);
        if (severity.contains("CRITICAL") || lower.contains("death") || lower.contains("outbreak")
                || lower.contains("contaminated") || lower.contains("unsafe")) {
            return "HIGH";
        }
        if (severity.contains("HIGH") || severity.contains("MEDIUM") || lower.contains("shortage")
                || lower.contains("irregular") || lower.contains("delay")) {
            return "MEDIUM";
        }
        return "LOW";
    }

    private static String classifyComplexity(ProblemContext context, String lower) {
        String urgency = nvl(context.urgency()).toUpperCase(Locale.ROOT);
        if (urgency.contains("IMMEDIATE") || lower.contains("collapse") || lower.contains("outbreak")
                || lower.contains("contaminated")) {
            return "HIGH";
        }
        if (urgency.contains("SHORT_TERM")) {
            return "MEDIUM";
        }
        return "LOW";
    }

    private static String classifyScale(ProblemContext context) {
        Integer population = context.affectedPopulation();
        if (population == null) {
            return "MEDIUM";
        }
        if (population >= 10_000) {
            return "HIGH";
        }
        if (population >= 1_000) {
            return "MEDIUM";
        }
        return "LOW";
    }

    private static String classifyTechnology(ProblemContext context, String lower) {
        if (containsAny(lower, DIGITAL_KEYWORDS) || nvl(context.expectedOutcome()).toLowerCase(Locale.ROOT).contains("digital")) {
            return "HIGH";
        }
        if (lower.contains("manual") || lower.contains("offline") || lower.contains("repair")) {
            return "LOW";
        }
        return "MEDIUM";
    }

    private static boolean containsAny(String lower, List<String> keywords) {
        for (String keyword : keywords) {
            if (lower.contains(keyword)) {
                return true;
            }
        }
        return false;
    }

    private static String nvl(String value) {
        return value == null ? "" : value;
    }
}
