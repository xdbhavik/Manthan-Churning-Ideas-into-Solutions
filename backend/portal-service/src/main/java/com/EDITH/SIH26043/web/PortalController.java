package com.EDITH.SIH26043.web;

import com.EDITH.SIH26043.config.OpenApiConfig;
import com.EDITH.SIH26043.entity.Participant;
import com.EDITH.SIH26043.entity.SubmissionFile;
import com.EDITH.SIH26043.exception.ApiException;
import com.EDITH.SIH26043.security.AuthUser;
import com.EDITH.SIH26043.service.ParticipantService;
import com.EDITH.SIH26043.service.ParticipantSearchService;
import com.EDITH.SIH26043.service.PublishedProblemService;
import com.EDITH.SIH26043.service.SubmissionFileService;
import com.EDITH.SIH26043.service.SubmissionService;
import com.EDITH.SIH26043.web.dto.FileItemView;
import com.EDITH.SIH26043.web.dto.ParticipantRegisterRequest;
import com.EDITH.SIH26043.web.dto.ParticipantResponse;
import com.EDITH.SIH26043.web.dto.ParticipantBrief;
import com.EDITH.SIH26043.web.dto.PublishedProblemDetail;
import com.EDITH.SIH26043.web.dto.PublishedProblemSummary;
import com.EDITH.SIH26043.web.dto.SubmissionCreateRequest;
import com.EDITH.SIH26043.web.dto.SubmissionMetaRequest;
import com.EDITH.SIH26043.web.dto.SubmissionView;
import com.EDITH.SIH26043.web.dto.MentorAssignmentRequest;
import com.EDITH.SIH26043.web.dto.SourceAcceptedSolutionView;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.core.io.InputStreamResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.util.List;
import java.util.UUID;

/**
 * 🔒 Public portal surface used by the portal UI. Every read/write resolves the
 * caller to a {@link Participant} via {@link ParticipantService#me(AuthUser)},
 * which auto-binds HEI university accounts on first contact (no second
 * registration) and rejects callers who own neither a profile nor an HEI account
 * with {@code 404 STUDENT_NOT_REGISTERED}.
 */
@Tag(name = OpenApiConfig.TAG_PORTAL)
@RestController
@RequestMapping("/portal")
public class PortalController {

    private final ParticipantService participantService;
    private final ParticipantSearchService participantSearchService;
    private final PublishedProblemService publishedProblemService;
    private final SubmissionService submissionService;
    private final SubmissionFileService submissionFileService;

    public PortalController(ParticipantService participantService,
                            ParticipantSearchService participantSearchService,
                            PublishedProblemService publishedProblemService,
                            SubmissionService submissionService,
                            SubmissionFileService submissionFileService) {
        this.participantService = participantService;
        this.participantSearchService = participantSearchService;
        this.publishedProblemService = publishedProblemService;
        this.submissionService = submissionService;
        this.submissionFileService = submissionFileService;
    }

    // ------------------------------------------------------------ participants

    @Operation(summary = "👤 My portal profile",
            description = "Returns the caller's participant profile. On first contact " +
                    "this auto-creates a UNIVERSITY participant when the caller owns an " +
                    "ACTIVE + VERIFIED HEI source account; callers with neither a profile " +
                    "nor an HEI account get 404 STUDENT_NOT_REGISTERED.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Profile (auto-bound if university)"),
            @ApiResponse(responseCode = "404", description = "STUDENT_NOT_REGISTERED — call POST /portal/participants")
    })
    @GetMapping("/me")
    public ParticipantResponse me(@AuthenticationPrincipal AuthUser me) {
        return toResponse(participantService.me(me));
    }

    @Operation(summary = "✏️ Update my profile",
            description = "Updates the caller's participant profile (name, email, phone).")
    @PatchMapping("/me")
    public ParticipantResponse updateMe(@AuthenticationPrincipal AuthUser me,
                                        @Valid @RequestBody com.EDITH.SIH26043.web.dto.ParticipantUpdateRequest request) {
        return toResponse(participantService.updateMe(me, request));
    }

    @Operation(summary = "🧑‍🎓 Register as a STUDENT",
            description = "STUDENT self-registration. Rejected with 409 when the caller " +
                    "already has a participant profile or owns a verified HEI source " +
                    "account (HEI owners are auto-bound as UNIVERSITY and stay that kind).")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Participant created"),
            @ApiResponse(responseCode = "409", description = "Already a participant / owns an HEI account")
    })
    @PostMapping("/participants")
    @ResponseStatus(HttpStatus.CREATED)
    @Tag(name = OpenApiConfig.TAG_PARTICIPANT)
    public ParticipantResponse registerStudent(@AuthenticationPrincipal AuthUser me,
                                               @Valid @RequestBody ParticipantRegisterRequest request) {
        return toResponse(participantService.registerStudent(me, request));
    }

    @Operation(summary = "🔎 Search registered student teammates",
            description = "Searches all registered student participants by name. Only minimal participant details are returned.")
    @GetMapping("/participants/search")
    @Tag(name = OpenApiConfig.TAG_PARTICIPANT)
    public List<ParticipantBrief> searchStudentParticipants(@AuthenticationPrincipal AuthUser me,
                                                            @RequestParam String name) {
        return participantSearchService.searchStudents(participantService.me(me), name);
    }

    // ------------------------------------------------------------------ catalog

    @Operation(summary = "📋 Published problem list",
            description = "Every published (fully-evaluated) problem the caller may see, " +
                    "newest first. Rows the caller's participant kind cannot see under the " +
                    "problem access rule are filtered out (never leaked).")
    @GetMapping("/problems")
    public List<PublishedProblemSummary> problems(@AuthenticationPrincipal AuthUser me) {
        return publishedProblemService.list(participantService.me(me));
    }

    @Operation(summary = "🔎 Published problem detail",
            description = "One published problem if (and only if) the caller may see it. " +
                    "Invisible or missing rows answer 404 so restricted statements never leak.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Problem detail"),
            @ApiResponse(responseCode = "404", description = "Not found or not visible to this participant")
    })
    @GetMapping("/problems/{problemId}")
    public PublishedProblemDetail problem(@AuthenticationPrincipal AuthUser me,
                                          @PathVariable UUID problemId) {
        return publishedProblemService.detail(participantService.me(me), problemId);
    }

    // -------------------------------------------------------------- submissions

    @Operation(summary = "📝 My submissions",
            description = "Every submission the caller may act on — their own individual " +
                    "submissions plus any belonging to teams they belong to, newest first.")
    @GetMapping("/submissions")
    public List<SubmissionView> mySubmissions(@AuthenticationPrincipal AuthUser me) {
        return submissionService.mine(participantService.me(me));
    }

    @Operation(summary = "Accepted solutions for my submitted problem statements",
            description = "Returns accepted student solutions only for problem statements filed by the authenticated source submitter.")
    @GetMapping("/source/accepted-solutions")
    public List<SourceAcceptedSolutionView> sourceAcceptedSolutions(
            @AuthenticationPrincipal AuthUser me,
            @RequestParam(required = false) UUID problemId) {
        return submissionService.acceptedSolutionsForSource(me.getUserId(), problemId);
    }

    @Operation(summary = "Assign a mentor to an accepted solution",
            description = "Only the original problem statement submitter may assign or update this mentor.")
    @PutMapping("/source/accepted-solutions/{submissionId}/mentor")
    public SubmissionView assignMentor(@AuthenticationPrincipal AuthUser me,
                                       @PathVariable UUID submissionId,
                                       @Valid @RequestBody MentorAssignmentRequest request) {
        return submissionService.assignMentor(me.getUserId(), submissionId, request);
    }

    @Operation(summary = "🆕 Create a submission (draft)",
            description = "Opens a DRAFT submission for a visible problem. Pass " +
                    "teamId to create a team submission. The caller must already be a " +
                    "member (team invitations add students only after acceptance). " +
                    "An individual may have only one active (DRAFT/SUBMITTED/UNDER_REVIEW) " +
                    "submission per problem. For a repo-backed submission pass " +
                    "githubUrl + commitSha; the commit may be pinned later, but it is " +
                    "required by the time the submission is submitted.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Draft created"),
            @ApiResponse(responseCode = "403", description = "Problem (or a member) not visible"),
            @ApiResponse(responseCode = "409", description = "Active submission already exists")
    })
    @PostMapping("/submissions")
    @ResponseStatus(HttpStatus.CREATED)
    @Tag(name = OpenApiConfig.TAG_SUBMISSION)
    public SubmissionView createSubmission(@AuthenticationPrincipal AuthUser me,
                                           @Valid @RequestBody SubmissionCreateRequest request) {
        return submissionService.create(participantService.me(me), request);
    }

    @Operation(summary = "🔎 Submission detail",
            description = "One submission the caller may act on (submitter or team member).")
    @GetMapping("/submissions/{submissionId}")
    @Tag(name = OpenApiConfig.TAG_SUBMISSION)
    public SubmissionView submission(@AuthenticationPrincipal AuthUser me,
                                     @PathVariable UUID submissionId) {
        return submissionService.detail(submissionId, participantService.me(me));
    }

    @Operation(summary = "✏️ Edit submission meta",
            description = "Updates title/summary/GitHub/commit/branch/links while the " +
                    "submission is DRAFT or RETURNED (null fields are left unchanged).")
    @PatchMapping("/submissions/{submissionId}")
    @Tag(name = OpenApiConfig.TAG_SUBMISSION)
    public SubmissionView updateMeta(@AuthenticationPrincipal AuthUser me,
                                     @PathVariable UUID submissionId,
                                     @Valid @RequestBody SubmissionMetaRequest request) {
        return submissionService.updateMeta(submissionId, participantService.me(me), request);
    }

    @Operation(summary = "🚀 Submit for review",
            description = "Advances a DRAFT or RETURNED submission: snapshots the current " +
                    "files, asks evaluation-service to open a project review assigned to the " +
                    "evaluator who scored the problem, then lands on UNDER_REVIEW with that " +
                    "reviewer stored. A failed evaluation push rolls back — no SUBMITTED row " +
                    "without a review persists. A GitHub-backed submission must pin a " +
                    "commitSha (7-64 chars): CodeJudge will not judge a moving branch HEAD. " +
                    "The automated CodeJudge run is then queued best-effort — its outcome " +
                    "informs the reviewer and never blocks or rolls back the submit.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Under review"),
            @ApiResponse(responseCode = "400", description = "No artifact (title/summary/file/link) yet, or a GitHub submission with no commitSha"),
            @ApiResponse(responseCode = "502", description = "Evaluation service unreachable / rejected"),
            @ApiResponse(responseCode = "409", description = "Problem not yet evaluated to completion")
    })
    @PostMapping("/submissions/{submissionId}/submit")
    @Tag(name = OpenApiConfig.TAG_SUBMISSION)
    public SubmissionView submit(@AuthenticationPrincipal AuthUser me,
                                 @PathVariable UUID submissionId) {
        return submissionService.submit(submissionId, participantService.me(me));
    }

    // -------------------------------------------------------------------- files

    @Operation(summary = "📎 List submission files",
            description = "File metadata for a submission the caller may read " +
                    "(submitter/team member, the assigned reviewer, or REVIEWER/ADMIN).")
    @GetMapping("/submissions/{submissionId}/files")
    @Tag(name = OpenApiConfig.TAG_SUBMISSION)
    public List<FileItemView> listFiles(@AuthenticationPrincipal AuthUser me,
                                        @PathVariable UUID submissionId) {
        return submissionFileService.list(submissionId, me);
    }

    @Operation(summary = "📤 Upload a submission file",
            description = "Stores bytes (sha-256 + sanitized name) under the portal-files " +
                    "volume and records metadata. Only while the submission is DRAFT or " +
                    "RETURNED, and only by the submitter or a team member. 50 MB cap.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "File stored"),
            @ApiResponse(responseCode = "409", description = "Submission not DRAFT/RETURNED"),
            @ApiResponse(responseCode = "403", description = "Not the submitter/team member")
    })
    @PostMapping("/submissions/{submissionId}/files")
    @ResponseStatus(HttpStatus.CREATED)
    @Tag(name = OpenApiConfig.TAG_SUBMISSION)
    public FileItemView uploadFile(@AuthenticationPrincipal AuthUser me,
                                   @PathVariable UUID submissionId,
                                   @RequestParam("file") MultipartFile file) {
        return submissionFileService.upload(submissionId, file, me);
    }

    @Operation(summary = "🗑️ Delete a submission file",
            description = "Removes the stored bytes and metadata row. Only while the " +
                    "submission is DRAFT or RETURNED, and only by the submitter or a team member.")
    @DeleteMapping("/submissions/{submissionId}/files/{fileId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Tag(name = OpenApiConfig.TAG_SUBMISSION)
    public void deleteFile(@AuthenticationPrincipal AuthUser me,
                           @PathVariable UUID submissionId,
                           @PathVariable UUID fileId) {
        submissionFileService.delete(submissionId, fileId, me);
    }

    @Operation(summary = "⬇️ Download a submission file",
            description = "Streams the stored bytes back. Authorized for the submitter/team " +
                    "member, the assigned reviewer, or REVIEWER/ADMIN. The evaluator console " +
                    "downloads project artifacts through this URL with its own JWT.")
    @GetMapping("/files/{fileId}/download")
    @Tag(name = OpenApiConfig.TAG_SUBMISSION)
    public ResponseEntity<Resource> downloadFile(@AuthenticationPrincipal AuthUser me,
                                                 @PathVariable UUID fileId) {
        SubmissionFile row = submissionFileService.authorizeDownload(fileId, me);
        try {
            InputStream in = Files.newInputStream(submissionFileService.open(row));
            MediaType mediaType = parseMediaType(row.getContentType());
            return ResponseEntity.ok()
                    .contentType(mediaType)
                    .contentLength(row.getSizeBytes())
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename=\"" + sanitizeAscii(row.getOriginalName()) + "\"")
                    .body(new InputStreamResource(in));
        } catch (IOException e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "File read failed");
        }
    }

    // ------------------------------------------------------------------ helpers

    private ParticipantResponse toResponse(Participant p) {
        return new ParticipantResponse(
                p.getParticipantId(),
                p.getParticipantType() == null ? null : p.getParticipantType().name(),
                p.getFullName(),
                p.getEmail(),
                p.getPhone(),
                p.getInstitutionName(),
                p.getSourceAccountId());
    }

    private static MediaType parseMediaType(String contentType) {
        if (contentType == null || contentType.isBlank()) {
            return MediaType.APPLICATION_OCTET_STREAM;
        }
        try {
            return MediaType.parseMediaType(contentType);
        } catch (IllegalArgumentException e) {
            return MediaType.APPLICATION_OCTET_STREAM;
        }
    }

    private static String sanitizeAscii(String name) {
        String safe = (name == null) ? "file" : name;
        return safe.replaceAll("[^\\x20-\\x7E]", "_").replace("\"", "'");
    }
}
