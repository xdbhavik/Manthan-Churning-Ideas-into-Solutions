package com.EDITH.SIH26043.service;

import com.EDITH.SIH26043.entity.Participant;
import com.EDITH.SIH26043.entity.Submission;
import com.EDITH.SIH26043.entity.SubmissionFile;
import com.EDITH.SIH26043.entity.PublishedProblem;
import com.EDITH.SIH26043.enums.SubmissionStatus;
import com.EDITH.SIH26043.exception.ApiException;
import com.EDITH.SIH26043.repository.ParticipantRepository;
import com.EDITH.SIH26043.repository.PublishedProblemRepository;
import com.EDITH.SIH26043.repository.SubmissionFileRepository;
import com.EDITH.SIH26043.repository.SubmissionRepository;
import com.EDITH.SIH26043.repository.TeamMemberRepository;
import com.EDITH.SIH26043.security.AuthUser;
import com.EDITH.SIH26043.web.dto.FileItemView;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;

/**
 * Multipart upload/download of submission artifacts (50 MB cap enforced by the
 * servlet multipart config). Bytes live under {@code app.portal.storage-dir};
 * the DB row stores immutable metadata + sha-256. Files may only be added or
 * removed while the owning submission is DRAFT or RETURNED, and only by the
 * submitter or a team member. Download additionally allows the assigned reviewer,
 * REVIEWER/ADMIN roles, and the original problem submitter for accepted solutions
 * (the eval side never stores bytes).
 */
@Service
public class SubmissionFileService {

    private final SubmissionFileRepository fileRepository;
    private final SubmissionRepository submissionRepository;
    private final ParticipantRepository participantRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final PublishedProblemRepository publishedProblemRepository;
    private final Path storageRoot;

    public SubmissionFileService(SubmissionFileRepository fileRepository,
                                 SubmissionRepository submissionRepository,
                                 ParticipantRepository participantRepository,
                                 TeamMemberRepository teamMemberRepository,
                                 PublishedProblemRepository publishedProblemRepository,
                                 @Value("${app.portal.storage-dir}") String storageDir) {
        this.fileRepository = fileRepository;
        this.submissionRepository = submissionRepository;
        this.participantRepository = participantRepository;
        this.teamMemberRepository = teamMemberRepository;
        this.publishedProblemRepository = publishedProblemRepository;
        this.storageRoot = Path.of(storageDir).toAbsolutePath().normalize();
    }

    @Transactional
    public FileItemView upload(UUID submissionId, MultipartFile file, AuthUser caller) {
        Submission submission = requireSubmission(submissionId);
        Participant actor = requireParticipant(caller);
        requireActor(submission, actor);
        requireEditable(submission);

        String sha256 = digest(file);
        String filename = UUID.randomUUID() + "-" + sanitize(file.getOriginalFilename());
        Path target = storageRoot.resolve(filename).normalize();
        if (!target.startsWith(storageRoot)) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Invalid filename: resolves outside the portal storage directory");
        }
        try {
            Files.createDirectories(storageRoot);
            try (var in = file.getInputStream()) {
                Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "File storage failed");
        }

        SubmissionFile row = new SubmissionFile();
        row.setSubmissionId(submissionId);
        row.setOriginalName(file.getOriginalFilename() == null ? "file" : file.getOriginalFilename());
        row.setContentType(file.getContentType());
        row.setSizeBytes(file.getSize());
        row.setStoragePath(target.toString());
        row.setSha256(sha256);
        row.setUploadedBy(caller.getUserId());
        fileRepository.save(row);
        return toView(row);
    }

    @Transactional(readOnly = true)
    public List<FileItemView> list(UUID submissionId, AuthUser caller) {
        Submission submission = requireSubmission(submissionId);
        requireReadAccess(submission, caller);
        return fileRepository.findBySubmissionIdOrderByUploadedAtAsc(submissionId).stream()
                .map(this::toView)
                .toList();
    }

    @Transactional
    public void delete(UUID submissionId, UUID fileId, AuthUser caller) {
        Submission submission = requireSubmission(submissionId);
        Participant actor = requireParticipant(caller);
        requireActor(submission, actor);
        requireEditable(submission);

        SubmissionFile row = fileRepository.findById(fileId)
                .filter(f -> f.getSubmissionId().equals(submissionId))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,
                        "File not found on this submission"));
        try {
            Files.deleteIfExists(resolve(row.getStoragePath()));
        } catch (IOException e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "File removal failed");
        }
        fileRepository.delete(row);
    }

    /** Authorizes a read (submitter/team member/reviewer/REVIEWER+ADMIN) and
     * resolves the stored bytes path. */
    @Transactional(readOnly = true)
    public SubmissionFile authorizeDownload(UUID fileId, AuthUser caller) {
        SubmissionFile row = fileRepository.findById(fileId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "File not found"));
        Submission submission = requireSubmission(row.getSubmissionId());
        requireReadAccess(submission, caller);
        return row;
    }

    /** Path of a stored file, guarded against path traversal. */
    public Path open(SubmissionFile file) {
        return resolve(file.getStoragePath());
    }

    private void requireReadAccess(Submission submission, AuthUser caller) {
        if (caller.getRole() != null) {
            String role = caller.getRole().name();
            if ("REVIEWER".equals(role) || "ADMIN".equals(role)) {
                return;
            }
        }
        if (submission.getReviewerUserId() != null
                && submission.getReviewerUserId().equals(caller.getUserId())) {
            return; // the assigned evaluator
        }
        if (submission.getStatus() == SubmissionStatus.ACCEPTED) {
            PublishedProblem problem = publishedProblemRepository.findById(submission.getProblemId()).orElse(null);
            if (problem != null && caller.getUserId().equals(problem.getSubmittedByUserId())) {
                return; // the original source submitter may view accepted solution artifacts
            }
        }
        Participant actor = participantRepository.findByUserId(caller.getUserId()).orElse(null);
        if (actor != null) {
            requireActor(submission, actor); // throws 403 when not a member/submitter
            return;
        }
        throw new ApiException(HttpStatus.FORBIDDEN,
                "No read access to this submission's files");
    }

    private Participant requireParticipant(AuthUser caller) {
        return participantRepository.findByUserId(caller.getUserId())
                .orElseThrow(() -> new ApiException(HttpStatus.FORBIDDEN,
                        "Only registered portal participants can upload files"));
    }

    private Submission requireSubmission(UUID submissionId) {
        return submissionRepository.findById(submissionId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,
                        "Submission not found"));
    }

    private void requireActor(Submission submission, Participant actor) {
        if (submission.getSubmitterParticipantId().equals(actor.getParticipantId())) {
            return;
        }
        if (submission.getTeamId() != null && teamMemberRepository
                .findByIdTeamId(submission.getTeamId()).stream()
                .anyMatch(m -> m.getId().getParticipantId().equals(actor.getParticipantId()))) {
            return;
        }
        throw new ApiException(HttpStatus.FORBIDDEN,
                "Only the submitter or a team member can act on this submission");
    }

    private void requireEditable(Submission submission) {
        if (submission.getStatus() != SubmissionStatus.DRAFT
                && submission.getStatus() != SubmissionStatus.RETURNED) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Files are frozen unless the submission is DRAFT or RETURNED");
        }
    }

    private Path resolve(String storedPath) {
        Path path = Path.of(storedPath).toAbsolutePath().normalize();
        if (!path.startsWith(storageRoot)) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Stored file path escapes the portal storage directory");
        }
        return path;
    }

    private String digest(MultipartFile file) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            try (var in = file.getInputStream()) {
                byte[] buf = new byte[8192];
                int n;
                while ((n = in.read(buf)) != -1) {
                    md.update(buf, 0, n);
                }
            }
            return HexFormat.of().formatHex(md.digest());
        } catch (IOException | NoSuchAlgorithmException e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "File hashing failed");
        }
    }

    private String sanitize(String name) {
        if (name == null || name.isBlank()) {
            return "file";
        }
        String stripped = name.replaceAll("^[./\\\\]+", "");
        String safe = stripped.replaceAll("[^a-zA-Z0-9._-]", "_");
        return safe.length() > 180 ? safe.substring(0, 180) : safe;
    }

    private FileItemView toView(SubmissionFile f) {
        return new FileItemView(f.getFileId(), f.getOriginalName(), f.getContentType(),
                f.getSizeBytes(), f.getSha256(), f.getUploadedAt());
    }
}
