import { api, getAccessToken } from '../lib/api';
import type {
  AssignmentResponse,
  AssignmentStatus,
  DeclineAssignmentRequest,
  EvaluationCriteria,
  EvaluatorProfileResponse,
  ProjectReviewDecisionRequest,
  ProjectReviewResponse,
  ScorecardSubmitRequest,
} from '../types';

export async function getMyProfile(): Promise<EvaluatorProfileResponse> {
  const { data } = await api.get<EvaluatorProfileResponse>('/evaluation/me/profile');
  return data;
}

export async function getMyCriteria(): Promise<EvaluationCriteria[]> {
  const { data } = await api.get<EvaluationCriteria[]>('/evaluation/me/criteria');
  return data;
}

export async function getMyAssignments(status?: AssignmentStatus): Promise<AssignmentResponse[]> {
  const params: Record<string, string> = {};
  if (status) params['status'] = status;
  const { data } = await api.get<AssignmentResponse[]>('/evaluation/me/assignments', { params });
  return data;
}

export async function getAssignment(assignmentId: string): Promise<AssignmentResponse> {
  const { data } = await api.get<AssignmentResponse>('/evaluation/me/assignments/' + assignmentId);
  return data;
}

export async function acceptAssignment(assignmentId: string): Promise<AssignmentResponse> {
  const { data } = await api.post<AssignmentResponse>('/evaluation/me/assignments/' + assignmentId + '/accept');
  return data;
}

export async function declineAssignment(assignmentId: string, body: DeclineAssignmentRequest): Promise<AssignmentResponse> {
  const { data } = await api.post<AssignmentResponse>('/evaluation/me/assignments/' + assignmentId + '/decline', body);
  return data;
}

export async function submitScorecard(assignmentId: string, body: ScorecardSubmitRequest): Promise<AssignmentResponse> {
  const { data } = await api.post<AssignmentResponse>('/evaluation/me/assignments/' + assignmentId + '/scorecard', body);
  return data;
}

export async function getMyProjectReviews(status?: 'ASSIGNED' | 'ACCEPTED' | 'RETURNED'): Promise<ProjectReviewResponse[]> {
  const params: Record<string, string> = {};
  if (status) params['status'] = status;
  const { data } = await api.get<ProjectReviewResponse[]>('/evaluation/me/project-reviews', { params });
  return data;
}

export async function getProjectReview(reviewId: string): Promise<ProjectReviewResponse> {
  const { data } = await api.get<ProjectReviewResponse>('/evaluation/me/project-reviews/' + reviewId);
  return data;
}

export async function submitProjectReviewDecision(reviewId: string, body: ProjectReviewDecisionRequest): Promise<ProjectReviewResponse> {
  const { data } = await api.post<ProjectReviewResponse>('/evaluation/me/project-reviews/' + reviewId + '/decision', body);
  return data;
}

/** Returns a URL that can be used in an <a href> with the JWT attached via query param fallback,
 *  but for actual download, uses axios to get the blob and triggers browser download */
export async function downloadFile(fileId: string, fileName: string): Promise<void> {
  const token = getAccessToken();
  const response = await api.get('/portal/files/' + fileId + '/download', {
    responseType: 'blob',
    headers: { Authorization: 'Bearer ' + token },
  });
  const url = URL.createObjectURL(response.data as Blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
