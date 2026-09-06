package com.EDITH.SIH26043.service;

import com.EDITH.SIH26043.entity.Evidence;
import com.EDITH.SIH26043.entity.Problem;
import com.EDITH.SIH26043.enums.EvidenceType;
import com.EDITH.SIH26043.exception.ApiException;
import com.EDITH.SIH26043.repository.EvidenceRepository;
import com.EDITH.SIH26043.repository.ProblemRepository;
import com.EDITH.SIH26043.security.AuthUser;
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
import java.util.Map;
import java.util.UUID;

/**
 * Multipart evidence upload (50 MB cap enforced by servlet config).
 * The file hash double-checks duplicates (doc 05 sec 10).
 */
@Service
public class EvidenceUploadService {

    private final EvidenceRepository evidenceRepository;
    private final ProblemRepository problemRepository;
    private final AuditService auditService;
    private final Path storageRoot;

    public EvidenceUploadService(EvidenceRepository evidenceRepository,
                                 ProblemRepository problemRepository,
                                 AuditService auditService,
                                 @Value("${app.evidence.storage-dir}") String storageDir) {
        this.evidenceRepository = evidenceRepository;
        this.problemRepository = problemRepository;
        this.auditService = auditService;
        this.storageRoot = Path.of(storageDir).toAbsolutePath().normalize();
    }

    @Transactional
    public Evidence upload(UUID problemId, MultipartFile file, EvidenceType type, AuthUser uploader, String ip) {
        Problem problem = problemRepository.findById(problemId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Problem not found"));

        String sha256 = digest(file);
        if (evidenceRepository.existsByFileHash(sha256)) {
            throw new ApiException(HttpStatus.CONFLICT, "Duplicate evidence: identical file already exists");
        }

        String filename = UUID.randomUUID() + "-" + sanitize(file.getOriginalFilename());
        Path target = storageRoot.resolve(filename).normalize();
        if (!target.startsWith(storageRoot)) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Invalid filename: resolves outside the evidence storage directory.");
        }
        try {
            Files.createDirectories(storageRoot);
            try (var in = file.getInputStream()) {
                Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Evidence storage failed");
        }

        Evidence evidence = new Evidence();
        evidence.setEvidenceId(UUID.randomUUID());
        evidence.setProblemId(problemId);
        evidence.setEvidenceType(type);
        evidence.setFileUrl(target.toString());
        evidence.setFileHash(sha256);
        evidence.setMetadata(Map.of(
                "fileName", file.getOriginalFilename(),
                "mimeType", file.getContentType(),
                "fileSize", file.getSize()));
        evidence.setCapturedAt(Instant.now());
        evidence.setUploadedByUserId(uploader.getUserId());
        evidenceRepository.save(evidence);
        return evidence;
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
        if (name == null || name.isBlank()) return "file";
        // Strip any leading dot-dot / separators, then only keep safe characters.
        String stripped = name.replaceAll("^[./\\\\]+", "");
        String safe = stripped.replaceAll("[^a-zA-Z0-9._-]", "_");
        // Cap length so paths never exceed OS limits.
        return safe.length() > 180 ? safe.substring(0, 180) : safe;
    }
}