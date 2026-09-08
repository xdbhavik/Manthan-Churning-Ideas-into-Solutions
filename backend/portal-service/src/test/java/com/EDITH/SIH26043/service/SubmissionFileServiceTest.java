package com.EDITH.SIH26043.service;

import com.EDITH.SIH26043.entity.Participant;
import com.EDITH.SIH26043.entity.Submission;
import com.EDITH.SIH26043.entity.SubmissionFile;
import com.EDITH.SIH26043.enums.KycStatus;
import com.EDITH.SIH26043.enums.ParticipantType;
import com.EDITH.SIH26043.enums.SubmissionStatus;
import com.EDITH.SIH26043.enums.UserRole;
import com.EDITH.SIH26043.exception.ApiException;
import com.EDITH.SIH26043.repository.ParticipantRepository;
import com.EDITH.SIH26043.repository.SubmissionFileRepository;
import com.EDITH.SIH26043.repository.SubmissionRepository;
import com.EDITH.SIH26043.repository.TeamMemberRepository;
import com.EDITH.SIH26043.security.AuthUser;
import com.EDITH.SIH26043.web.dto.FileItemView;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Submission artifacts. The bytes are written under the portal storage root with
 * a sanitized unique name; the DB row is the immutable metadata handle. Uploads
 * and deletes are only allowed while the owning submission is DRAFT or RETURNED,
 * and reads additionally admit the assigned reviewer plus REVIEWER/ADMIN roles
 * (evaluation-service never stores bytes — it downloads back through the portal).
 */
class SubmissionFileServiceTest {

    @TempDir
    Path tempDir;

    private final SubmissionFileRepository fileRepository = mock(SubmissionFileRepository.class);
    private final SubmissionRepository submissionRepository = mock(SubmissionRepository.class);
    private final ParticipantRepository participantRepository = mock(ParticipantRepository.class);
    private final TeamMemberRepository teamMemberRepository = mock(TeamMemberRepository.class);

    private SubmissionFileService service;

    @BeforeEach
    void setUp() {
        service = new SubmissionFileService(
                fileRepository, submissionRepository, participantRepository, teamMemberRepository,
                tempDir.toString());
    }

    private final UUID actorUserId = UUID.randomUUID();
    private final UUID actorParticipantId = UUID.randomUUID();
    private final UUID submissionId = UUID.randomUUID();
    private final UUID fileId = UUID.randomUUID();
    private final Participant actor = participant(actorParticipantId, "Aarav");
    private final AuthUser actorUser =
            new AuthUser(actorUserId, "9700000001", UserRole.SUBMITTER, KycStatus.UNVERIFIED);

    // ------------------------------------------------------------------ upload

    @Test
    void upload_StoresBytesAndAnImmutableMetadataRow() throws IOException {
        givenSubmission(submission(SubmissionStatus.DRAFT, actorParticipantId, null));
        givenActor();
        when(fileRepository.save(any(SubmissionFile.class))).thenAnswer(inv -> {
            SubmissionFile row = inv.getArgument(0);
            if (row.getFileId() == null) {
                row.setFileId(fileId);
            }
            return row;
        });

        MockMultipartFile multipart = new MockMultipartFile("file", "proposal.pdf",
                "application/pdf", "hello portal".getBytes(StandardCharsets.UTF_8));
        FileItemView view = service.upload(submissionId, multipart, actorUser);

        assertThat(view.originalName()).isEqualTo("proposal.pdf");
        assertThat(view.contentType()).isEqualTo("application/pdf");
        assertThat(view.sizeBytes()).isEqualTo(12);
        assertThat(view.sha256()).hasSize(64);

        ArgumentCaptor<SubmissionFile> saved = ArgumentCaptor.forClass(SubmissionFile.class);
        verify(fileRepository).save(saved.capture());
        SubmissionFile row = saved.getValue();
        assertThat(row.getUploadedBy()).isEqualTo(actorUserId);
        assertThat(row.getOriginalName()).isEqualTo("proposal.pdf");
        Path stored = Path.of(row.getStoragePath());
        assertThat(stored.toAbsolutePath().normalize().startsWith(tempDir.toAbsolutePath())).isTrue();
        assertThat(Files.exists(stored)).isTrue();
    }

    @Test
    void upload_IsRejectedWhileTheSubmissionIsUnderReview() {
        givenSubmission(submission(SubmissionStatus.UNDER_REVIEW, actorParticipantId, null));
        givenActor();

        MockMultipartFile multipart = new MockMultipartFile("file", "proposal.pdf",
                "application/pdf", new byte[]{1});

        assertThatThrownBy(() -> service.upload(submissionId, multipart, actorUser))
                .isInstanceOf(ApiException.class)
                .extracting(ex -> ((ApiException) ex).getStatus())
                .isEqualTo(HttpStatus.CONFLICT);
        verify(fileRepository, never()).save(any());
    }

    // ------------------------------------------------------------------ delete

    @Test
    void delete_RemovesTheRowAndTheBytesWhileDraft() throws IOException {
        Path stored = tempDir.resolve("kept.bin");
        Files.write(stored, new byte[]{1, 2, 3});
        givenSubmission(submission(SubmissionStatus.DRAFT, actorParticipantId, null));
        givenActor();
        when(fileRepository.findById(fileId)).thenReturn(Optional.of(fileRow(stored.toString())));

        service.delete(submissionId, fileId, actorUser);

        verify(fileRepository).delete(any(SubmissionFile.class));
        assertThat(Files.exists(stored)).isFalse();
    }

    @Test
    void delete_IsRejectedWhileTheSubmissionIsUnderReview() throws IOException {
        Path stored = tempDir.resolve("kept2.bin");
        Files.write(stored, new byte[]{1});
        givenSubmission(submission(SubmissionStatus.UNDER_REVIEW, actorParticipantId, null));
        givenActor();

        assertThatThrownBy(() -> service.delete(submissionId, fileId, actorUser))
                .isInstanceOf(ApiException.class)
                .extracting(ex -> ((ApiException) ex).getStatus())
                .isEqualTo(HttpStatus.CONFLICT);
        verify(fileRepository, never()).delete(any());
    }

    // -------------------------------------------------------------- download auth

    @Test
    void authorizeDownload_AllowsTheAssignedReviewer() {
        Submission submission = submission(SubmissionStatus.UNDER_REVIEW, actorParticipantId,
                actorUserId);
        givenSubmission(submission);
        SubmissionFile row = fileRow("ignored.bin");
        when(fileRepository.findById(fileId)).thenReturn(Optional.of(row));

        AuthUser evaluator = new AuthUser(actorUserId, "9700000001", UserRole.EVALUATOR, KycStatus.UNVERIFIED);
        SubmissionFile authorized = service.authorizeDownload(fileId, evaluator);

        assertThat(authorized).isSameAs(row);
    }

    @Test
    void authorizeDownload_AllowsReviewerAndAdminRoles() {
        givenSubmission(submission(SubmissionStatus.UNDER_REVIEW, actorParticipantId, null));
        SubmissionFile row = fileRow("ignored.bin");
        when(fileRepository.findById(fileId)).thenReturn(Optional.of(row));

        AuthUser reviewer = new AuthUser(UUID.randomUUID(), "9800000001", UserRole.REVIEWER, KycStatus.UNVERIFIED);
        assertThat(service.authorizeDownload(fileId, reviewer)).isSameAs(row);
    }

    @Test
    void authorizeDownload_ForbidsAnUnrelatedNonParticipant() {
        givenSubmission(submission(SubmissionStatus.UNDER_REVIEW, actorParticipantId, null));
        SubmissionFile row = fileRow("ignored.bin");
        when(fileRepository.findById(fileId)).thenReturn(Optional.of(row));

        AuthUser outsider = new AuthUser(UUID.randomUUID(), "9999999999", null, null);

        assertThatThrownBy(() -> service.authorizeDownload(fileId, outsider))
                .isInstanceOf(ApiException.class)
                .extracting(ex -> ((ApiException) ex).getStatus())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void authorizeDownload_ForbidsAStudentWhoIsNotOnTheSubmission() {
        givenSubmission(submission(SubmissionStatus.UNDER_REVIEW, actorParticipantId, null));
        when(participantRepository.findByUserId(actorUserId)).thenReturn(Optional.of(actor));
        SubmissionFile row = fileRow("ignored.bin");
        when(fileRepository.findById(fileId)).thenReturn(Optional.of(row));

        // A different participant — this actor is neither the submitter nor a member.
        Participant outsider = participant(UUID.randomUUID(), "Stranger");
        AuthUser strangerUser = new AuthUser(UUID.randomUUID(), "9700000002",
                UserRole.SUBMITTER, KycStatus.UNVERIFIED);
        when(participantRepository.findByUserId(strangerUser.getUserId())).thenReturn(Optional.of(outsider));

        assertThatThrownBy(() -> service.authorizeDownload(fileId, strangerUser))
                .isInstanceOf(ApiException.class)
                .extracting(ex -> ((ApiException) ex).getStatus())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }

    // ------------------------------------------------------------------ helpers

    private void givenSubmission(Submission submission) {
        when(submissionRepository.findById(submissionId)).thenReturn(Optional.of(submission));
    }

    private void givenActor() {
        when(participantRepository.findByUserId(actorUserId)).thenReturn(Optional.of(actor));
    }

    private Submission submission(SubmissionStatus status, UUID submitterId, UUID reviewerUserId) {
        Submission submission = new Submission();
        submission.setSubmissionId(submissionId);
        submission.setSubmitterParticipantId(submitterId);
        submission.setStatus(status);
        submission.setReviewerUserId(reviewerUserId);
        return submission;
    }

    private SubmissionFile fileRow(String storagePath) {
        SubmissionFile row = new SubmissionFile();
        row.setFileId(fileId);
        row.setSubmissionId(submissionId);
        row.setOriginalName("proposal.pdf");
        row.setContentType("application/pdf");
        row.setSizeBytes(3);
        row.setStoragePath(storagePath);
        row.setSha256("abc");
        return row;
    }

    private Participant participant(UUID id, String name) {
        Participant participant = new Participant();
        participant.setParticipantId(id);
        participant.setParticipantType(ParticipantType.STUDENT);
        participant.setFullName(name);
        return participant;
    }
}
