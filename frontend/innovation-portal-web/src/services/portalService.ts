import { api, getErrorMessage } from './apiClient';
import { getAccessToken } from '../lib/auth';
import type {
  FileItem,
  Participant,
  ParticipantRegisterRequest,
  ParticipantSearchResult,
  PublishedProblem,
  Submission,
  SubmissionCreateRequest,
  SubmissionMetaRequest,
  TeamOverview,
  TeamInvitation,
} from '../types/dto';

/** GET /portal/me — current participant (404 STUDENT_NOT_REGISTERED → register). */
export async function me(): Promise<Participant> {
  const { data } = await api.get<Participant>('/portal/me');
  return data;
}

/** PATCH /portal/me — update current participant profile. */
export async function updateMe(body: import('../types/dto').ParticipantUpdateRequest): Promise<Participant> {
  const { data } = await api.patch<Participant>('/portal/me', body);
  return data;
}

/** POST /portal/participants — register as a STUDENT participant. */
export async function registerStudent(body: ParticipantRegisterRequest): Promise<Participant> {
  const { data } = await api.post<Participant>('/portal/participants', body);
  return data;
}

/** Search all registered students by name. */
export async function searchStudentParticipants(name: string): Promise<ParticipantSearchResult[]> {
  const { data } = await api.get<ParticipantSearchResult[]>('/portal/participants/search', {
    params: { name },
  });
  return data;
}

export async function getMyTeams(): Promise<TeamOverview[]> {
  const { data } = await api.get<TeamOverview[]>('/portal/teams');
  return data;
}

export async function getTeamInvitations(): Promise<TeamInvitation[]> {
  const { data } = await api.get<TeamInvitation[]>('/portal/teams/invitations');
  return data;
}

export async function createTeam(body: { name: string; inviteeParticipantIds: string[] }): Promise<TeamOverview> {
  const { data } = await api.post<TeamOverview>('/portal/teams', body);
  return data;
}

export async function respondToTeamInvitation(invitationId: string, accept: boolean): Promise<TeamInvitation> {
  const action = accept ? 'accept' : 'decline';
  const { data } = await api.post<TeamInvitation>(`/portal/teams/invitations/${invitationId}/${action}`);
  return data;
}

/** GET /portal/problems — published catalog (canSee-filtered, newest first). */
export async function getProblems(): Promise<PublishedProblem[]> {
  const { data } = await api.get<PublishedProblem[]>('/portal/problems');
  return data;
}

/** GET /portal/problems/{problemId} — full detail (404 if not visible). */
export async function getProblem(problemId: string): Promise<PublishedProblem> {
  const { data } = await api.get<PublishedProblem>(`/portal/problems/${problemId}`);
  return data;
}

/** GET /portal/submissions — my submissions (individual + team rows). */
export async function getMySubmissions(): Promise<Submission[]> {
  const { data } = await api.get<Submission[]>('/portal/submissions');
  return data;
}

/** POST /portal/submissions — create a DRAFT (optionally with a team). */
export async function createSubmission(body: SubmissionCreateRequest): Promise<Submission> {
  const { data } = await api.post<Submission>('/portal/submissions', body);
  return data;
}

/** GET /portal/submissions/{id} — submission detail + files. */
export async function getSubmission(submissionId: string): Promise<Submission> {
  const { data } = await api.get<Submission>(`/portal/submissions/${submissionId}`);
  return data;
}

/** PATCH /portal/submissions/{id} — edit meta while DRAFT or RETURNED. */
export async function updateSubmissionMeta(
  submissionId: string,
  body: SubmissionMetaRequest
): Promise<Submission> {
  const { data } = await api.patch<Submission>(`/portal/submissions/${submissionId}`, body);
  return data;
}

/** POST /portal/submissions/{id}/submit — advance to UNDER_REVIEW (new round). */
export async function submitSubmission(submissionId: string): Promise<Submission> {
  const { data } = await api.post<Submission>(`/portal/submissions/${submissionId}/submit`);
  return data;
}

/** GET /portal/submissions/{id}/files — file metadata. */
export async function listFiles(submissionId: string): Promise<FileItem[]> {
  const { data } = await api.get<FileItem[]>(`/portal/submissions/${submissionId}/files`);
  return data;
}

/** POST /portal/submissions/{id}/files — multipart upload, field name `file`. */
export async function uploadFile(submissionId: string, file: File): Promise<FileItem> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post<FileItem>(`/portal/submissions/${submissionId}/files`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

/** DELETE /portal/submissions/{id}/files/{fileId}. */
export async function deleteFile(submissionId: string, fileId: string): Promise<void> {
  await api.delete(`/portal/submissions/${submissionId}/files/${fileId}`);
}

/** GET /portal/files/{fileId}/download — stream bytes and trigger a browser save. */
export async function downloadFile(fileId: string, fileName: string): Promise<void> {
  try {
    const token = getAccessToken();
    const response = await api.get(`/portal/files/${fileId}/download`, {
      responseType: 'blob',
      headers: { Authorization: `Bearer ${token}` },
    });
    const url = URL.createObjectURL(response.data as Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    throw new Error(getErrorMessage(err));
  }
}
