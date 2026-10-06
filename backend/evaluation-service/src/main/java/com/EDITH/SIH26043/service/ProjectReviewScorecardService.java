package com.EDITH.SIH26043.service;

import com.EDITH.SIH26043.client.PortalGateway;
import com.EDITH.SIH26043.entity.EvaluationCriterion;
import com.EDITH.SIH26043.entity.EvaluatorProfile;
import com.EDITH.SIH26043.entity.ProjectReview;
import com.EDITH.SIH26043.entity.ProjectReviewScorecard;
import com.EDITH.SIH26043.exception.ApiException;
import com.EDITH.SIH26043.repository.EvaluationCriterionRepository;
import com.EDITH.SIH26043.repository.EvaluatorProfileRepository;
import com.EDITH.SIH26043.repository.ProjectReviewRepository;
import com.EDITH.SIH26043.repository.ProjectReviewScorecardRepository;
import com.EDITH.SIH26043.web.dto.ProjectReviewScorecardRequest;
import com.EDITH.SIH26043.web.dto.ProjectReviewScorecardView;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Scorecards for submitted portal projects; intentionally independent of evaluation cycles. */
@Service
public class ProjectReviewScorecardService {
    private final ProjectReviewRepository reviewRepository;
    private final ProjectReviewScorecardRepository scorecardRepository;
    private final EvaluatorProfileRepository profileRepository;
    private final EvaluationCriterionRepository criterionRepository;
    private final PortalGateway portalGateway;

    public ProjectReviewScorecardService(ProjectReviewRepository reviewRepository,
                                         ProjectReviewScorecardRepository scorecardRepository,
                                         EvaluatorProfileRepository profileRepository,
                                         EvaluationCriterionRepository criterionRepository,
                                         PortalGateway portalGateway) {
        this.reviewRepository = reviewRepository;
        this.scorecardRepository = scorecardRepository;
        this.profileRepository = profileRepository;
        this.criterionRepository = criterionRepository;
        this.portalGateway = portalGateway;
    }

    @Transactional(readOnly = true)
    public ProjectReviewScorecardView get(UUID userId, UUID reviewId) {
        EvaluatorProfile profile = requireProfile(userId);
        requireOwnReview(profile, reviewId);
        List<EvaluationCriterion> criteria = activeCriteria(profile);
        ProjectReviewScorecard saved = scorecardRepository.findById(reviewId).orElse(null);
        if (saved != null && "SUBMITTED".equals(saved.getStatus())) {
            syncPortal(reviewRepository.findById(reviewId).orElseThrow(), toView(criteria, saved));
        }
        return toView(criteria, saved);
    }

    @Transactional
    public ProjectReviewScorecardView save(UUID userId, UUID reviewId, ProjectReviewScorecardRequest request) {
        EvaluatorProfile profile = requireProfile(userId);
        requireOwnReview(profile, reviewId);
        List<EvaluationCriterion> criteria = activeCriteria(profile);
        if (criteria.isEmpty()) {
            throw new ApiException(HttpStatus.CONFLICT, "No active scoring criteria are configured for your evaluator pool");
        }
        ProjectReviewScorecard scorecard = scorecardRepository.findById(reviewId).orElseGet(() -> {
            ProjectReviewScorecard fresh = new ProjectReviewScorecard();
            fresh.setProjectReviewId(reviewId);
            fresh.setCreatedAt(Instant.now());
            return fresh;
        });
        if ("SUBMITTED".equals(scorecard.getStatus())) {
            throw new ApiException(HttpStatus.CONFLICT, "This project scorecard has already been submitted");
        }

        Map<String, ProjectReviewScorecardRequest.CriterionScore> submittedScores =
                request.criteriaScores() == null ? Map.of() : request.criteriaScores();
        Map<String, EvaluationCriterion> byKey = new LinkedHashMap<>();
        criteria.forEach(criterion -> byKey.put(criterion.getCriterionKey(), criterion));
        for (String key : submittedScores.keySet()) {
            if (!byKey.containsKey(key)) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Unknown criterion: " + key);
            }
        }

        int total = 0;
        int maximum = 0;
        Map<String, Object> storedScores = new LinkedHashMap<>();
        for (EvaluationCriterion criterion : criteria) {
            maximum += criterion.getMaxScore();
            ProjectReviewScorecardRequest.CriterionScore response = submittedScores.get(criterion.getCriterionKey());
            if (request.submit() && (response == null || response.score() == null)) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "A score is required for " + criterion.getCriterionLabel());
            }
            if (response != null && response.score() != null) {
                if (response.score() < 0 || response.score() > criterion.getMaxScore()) {
                    throw new ApiException(HttpStatus.BAD_REQUEST,
                            criterion.getCriterionLabel() + " score must be between 0 and " + criterion.getMaxScore());
                }
                total += response.score();
            }
            Map<String, Object> item = new LinkedHashMap<>();
            if (response != null) {
                item.put("score", response.score());
                item.put("comment", response.comment());
            }
            storedScores.put(criterion.getCriterionKey(), item);
        }
        String remarks = request.overallRemarks() == null ? "" : request.overallRemarks().trim();
        if (remarks.length() > 5000) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Overall remarks cannot exceed 5000 characters");
        }
        if (request.submit() && remarks.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Overall remarks are required to submit the scorecard");
        }

        scorecard.setCriteriaScores(storedScores);
        scorecard.setOverallRemarks(remarks);
        scorecard.setTotalScore(total);
        scorecard.setMaxScore(maximum);
        scorecard.setStatus(request.submit() ? "SUBMITTED" : "DRAFT");
        scorecard.setSubmittedAt(request.submit() ? Instant.now() : null);
        ProjectReviewScorecardView view = toView(criteria, scorecardRepository.save(scorecard));
        if (request.submit()) {
            syncPortal(requireOwnReview(profile, reviewId), view);
        }
        return view;
    }

    private void syncPortal(ProjectReview review, ProjectReviewScorecardView view) {
        Map<String, Object> snapshot = new LinkedHashMap<>();
        snapshot.put("status", view.status());
        snapshot.put("criteria", view.criteria().stream().map(criterion -> {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("key", criterion.key());
            item.put("label", criterion.label());
            item.put("description", criterion.description());
            item.put("maxScore", criterion.maxScore());
            item.put("sortOrder", criterion.sortOrder());
            return item;
        }).toList());
        Map<String, Object> scores = new LinkedHashMap<>();
        view.criteriaScores().forEach((key, value) -> {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("score", value.score());
            item.put("comment", value.comment());
            scores.put(key, item);
        });
        snapshot.put("criteriaScores", scores);
        snapshot.put("overallRemarks", view.overallRemarks());
        snapshot.put("totalScore", view.totalScore());
        snapshot.put("maxScore", view.maxScore());
        snapshot.put("submittedAt", view.submittedAt());
        portalGateway.syncReviewScorecard(review.getSubmissionId(), snapshot);
    }

    private EvaluatorProfile requireProfile(UUID userId) {
        return profileRepository.findByUserId(userId).stream().findFirst()
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Evaluator profile not found"));
    }

    private ProjectReview requireOwnReview(EvaluatorProfile profile, UUID reviewId) {
        ProjectReview review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Project review not found"));
        if (!profile.getProfileId().equals(review.getEvaluatorProfileId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Project review belongs to another evaluator");
        }
        return review;
    }

    private List<EvaluationCriterion> activeCriteria(EvaluatorProfile profile) {
        return criterionRepository.findByEvaluatorTypeAndActiveIsTrueOrderBySortOrderAsc(profile.getEvaluatorType());
    }

    private ProjectReviewScorecardView toView(List<EvaluationCriterion> criteria, ProjectReviewScorecard saved) {
        List<ProjectReviewScorecardView.Criterion> criterionViews = criteria.stream()
                .map(c -> new ProjectReviewScorecardView.Criterion(c.getCriterionKey(), c.getCriterionLabel(),
                        c.getDescription(), c.getMaxScore(), c.getSortOrder()))
                .toList();
        Map<String, ProjectReviewScorecardRequest.CriterionScore> scores = new LinkedHashMap<>();
        if (saved != null && saved.getCriteriaScores() != null) {
            saved.getCriteriaScores().forEach((key, raw) -> {
                if (raw instanceof Map<?, ?> value) {
                    Object rawScore = value.get("score");
                    Integer score = rawScore instanceof Number number ? number.intValue() : null;
                    Object rawComment = value.get("comment");
                    scores.put(key, new ProjectReviewScorecardRequest.CriterionScore(score,
                            rawComment == null ? null : String.valueOf(rawComment)));
                }
            });
        }
        return new ProjectReviewScorecardView(criterionViews,
                saved == null ? "NOT_STARTED" : saved.getStatus(), scores,
                saved == null ? null : saved.getOverallRemarks(),
                saved == null ? 0 : saved.getTotalScore(),
                saved == null ? criterionViews.stream().mapToInt(ProjectReviewScorecardView.Criterion::maxScore).sum() : saved.getMaxScore(),
                saved == null ? null : saved.getUpdatedAt(),
                saved == null ? null : saved.getSubmittedAt());
    }
}
