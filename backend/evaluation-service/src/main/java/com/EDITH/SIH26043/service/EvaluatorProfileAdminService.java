package com.EDITH.SIH26043.service;

import com.EDITH.SIH26043.entity.EvaluatorProfile;
import com.EDITH.SIH26043.exception.ApiException;
import com.EDITH.SIH26043.repository.EvaluatorProfileRepository;
import com.EDITH.SIH26043.web.dto.EvaluatorProfileRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * ADMIN onboarding of an evaluator profile (doc plan §4.1). The source-service
 * {@code POST /users/evaluators} call creates the EVALUATOR identity and returns
 * its {@code userId}; this service binds that identity to a pool + workload
 * profile in {@code sih_eval} so routing has a candidate.
 */
@Service
public class EvaluatorProfileAdminService {

    private final EvaluatorProfileRepository profileRepository;

    public EvaluatorProfileAdminService(EvaluatorProfileRepository profileRepository) {
        this.profileRepository = profileRepository;
    }

    @Transactional
    public EvaluatorProfile create(EvaluatorProfileRequest req) {
        if (profileRepository.existsByUserId(req.userId())) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "An evaluator profile already exists for user " + req.userId()
                            + " (one profile per evaluator)");
        }

        EvaluatorProfile profile = new EvaluatorProfile();
        profile.setUserId(req.userId());
        profile.setEvaluatorType(req.evaluatorType());
        profile.setFullName(req.fullName());
        profile.setOrganization(req.organization());
        profile.setDesignation(req.designation());
        profile.setExperienceYears(req.experienceYears() == null ? 0 : req.experienceYears());
        profile.setMaxWorkload(req.maxWorkload() == null ? 5 : req.maxWorkload());
        // active defaults to true; region_states stays [] until domain/geography scope lands.
        // Reassign: save() on a new entity whose @Version is pre-set (1) goes through merge()
        // and returns a managed copy; the original stays transient with a null profileId.
        return profileRepository.save(profile);
    }
}
