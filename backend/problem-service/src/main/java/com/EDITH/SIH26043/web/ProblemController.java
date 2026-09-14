package com.EDITH.SIH26043.web;

import com.EDITH.SIH26043.entity.Evidence;
import com.EDITH.SIH26043.entity.Problem;
import com.EDITH.SIH26043.enums.EvidenceType;
import com.EDITH.SIH26043.enums.ProblemStatus;
import com.EDITH.SIH26043.enums.UserRole;
import com.EDITH.SIH26043.exception.ApiException;
import com.EDITH.SIH26043.repository.ProblemRepository;
import com.EDITH.SIH26043.security.AuthUser;
import com.EDITH.SIH26043.service.EvidenceUploadService;
import com.EDITH.SIH26043.service.ProblemStatusService;
import com.EDITH.SIH26043.service.ProblemSubmissionService;
import com.EDITH.SIH26043.web.dto.ProblemResponse;
import com.EDITH.SIH26043.web.dto.ProblemSubmitRequest;
import com.EDITH.SIH26043.web.dto.StatusPatchRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import com.EDITH.SIH26043.entity.University;
import com.EDITH.SIH26043.repository.EvidenceRepository;
import com.EDITH.SIH26043.repository.UniversityRepository;
import org.springframework.web.multipart.MultipartFile;

import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/problems")
public class ProblemController {

    private final ProblemSubmissionService submissionService;
    private final ProblemStatusService statusService;
    private final ProblemRepository problemRepository;
    private final EvidenceUploadService evidenceUploadService;
    private final EvidenceRepository evidenceRepository;
    private final UniversityRepository universityRepository;

    public ProblemController(ProblemSubmissionService submissionService,
                             ProblemStatusService statusService,
                             ProblemRepository problemRepository,
                             EvidenceUploadService evidenceUploadService,
                             EvidenceRepository evidenceRepository,
                             UniversityRepository universityRepository) {
        this.submissionService = submissionService;
        this.statusService = statusService;
        this.problemRepository = problemRepository;
        this.evidenceUploadService = evidenceUploadService;
        this.evidenceRepository = evidenceRepository;
        this.universityRepository = universityRepository;
    }

    @GetMapping
    public List<ProblemResponse> list(@AuthenticationPrincipal AuthUser me) {
        List<Problem> list;
        if (me != null && me.getRole() == UserRole.SUBMITTER) {
            list = problemRepository.findBySubmittedByUserId(me.getUserId());
        } else {
            list = problemRepository.findAll();
        }
        return list.stream()
                .sorted(Comparator.comparing(Problem::getSubmittedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(ProblemResponse::from)
                .toList();
    }

    @GetMapping("/universities")
    public List<String> listUniversities() {
        return universityRepository.findAll().stream()
                .filter(University::isActive)
                .map(University::getName)
                .sorted()
                .toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProblemResponse submit(@Valid @RequestBody ProblemSubmitRequest req,
                                  @AuthenticationPrincipal AuthUser me,
                                  jakarta.servlet.http.HttpServletRequest http) {
        Problem created = submissionService.submit(req, me, clientIp(http));
        return ProblemResponse.from(created);
    }

    @GetMapping("/{id}")
    public ProblemResponse get(@PathVariable UUID id, @AuthenticationPrincipal AuthUser me) {
        Problem p = problemRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Problem not found"));
        if (me.getRole() == UserRole.SUBMITTER
                && !p.getSubmittedByUserId().equals(me.getUserId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Not your submission");
        }
        return ProblemResponse.from(p);
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('REVIEWER') or hasRole('ADMIN')")
    public ProblemResponse patchStatus(@PathVariable UUID id,
                                       @Valid @RequestBody StatusPatchRequest req,
                                       @AuthenticationPrincipal AuthUser me,
                                       jakarta.servlet.http.HttpServletRequest http) {
        Problem updated = statusService.transition(id, req.status(), me.getUserId(),
                req.expectedVersion(), clientIp(http));
        return ProblemResponse.from(updated);
    }

    @PostMapping("/{id}/evidence")
    public Evidence addEvidence(@PathVariable UUID id,
                                @RequestParam("file") MultipartFile file,
                                @RequestParam(value = "evidenceType", defaultValue = "DOCUMENT")
                                EvidenceType evidenceType,
                                @AuthenticationPrincipal AuthUser me,
                                jakarta.servlet.http.HttpServletRequest http) {
        Problem p = problemRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Problem not found"));
        if (me.getRole() == UserRole.SUBMITTER
                && !p.getSubmittedByUserId().equals(me.getUserId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Not your submission");
        }
        return evidenceUploadService.upload(id, file, evidenceType, me, clientIp(http));
    }

    @GetMapping("/{id}/evidence")
    public List<Evidence> getEvidence(@PathVariable UUID id, @AuthenticationPrincipal AuthUser me) {
        Problem p = problemRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Problem not found"));
        if (me != null && me.getRole() == UserRole.SUBMITTER
                && !p.getSubmittedByUserId().equals(me.getUserId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Not your submission");
        }
        return evidenceRepository.findByProblemId(id);
    }

    private String clientIp(jakarta.servlet.http.HttpServletRequest http) {
        String xff = http.getHeader("X-Forwarded-For");
        return xff != null ? xff.split(",")[0].trim() : http.getRemoteAddr();
    }
}