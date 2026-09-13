import { api } from '../lib/api';
import type {
  EvaluationCriteria,
  EvaluationCycle,
  EvaluationStatus,
  PageResponse,
  ProjectReview,
  ProjectReviewDecisionRequest,
} from '../types';

/** GET /evaluation/me/project-reviews — EVALUATOR review queue. */
export async function getMyProjectReviews(
  status?: 'ASSIGNED' | 'ACCEPTED' | 'RETURNED'
): Promise<ProjectReview[]> {
  const params: Record<string, string> = {};
  if (status) params['status'] = status;
  const { data } = await api.get<ProjectReview[]>('/evaluation/me/project-reviews', { params });
  return data;
}

/** GET /evaluation/me/project-reviews/{id}. */
export async function getProjectReview(reviewId: string): Promise<ProjectReview> {
  const { data } = await api.get<ProjectReview>(`/evaluation/me/project-reviews/${reviewId}`);
  return data;
}

/** POST /evaluation/me/project-reviews/{id}/decision. */
export async function submitProjectReviewDecision(
  reviewId: string,
  body: ProjectReviewDecisionRequest
): Promise<ProjectReview> {
  const { data } = await api.post<ProjectReview>(
    `/evaluation/me/project-reviews/${reviewId}/decision`,
    body
  );
  return data;
}

/** GET /evaluation/me/criteria — rubric weights for the current evaluator. */
export async function getMyCriteria(): Promise<EvaluationCriteria[]> {
  const { data } = await api.get<EvaluationCriteria[]>('/evaluation/me/criteria');
  return data;
}

/** GET /evaluation/queue — paged evaluation cycle queue (ADMIN). */
export async function getEvaluationQueue(
  page = 0,
  size = 20,
  status?: EvaluationStatus
): Promise<PageResponse<EvaluationCycle>> {
  const params: Record<string, unknown> = { page, size };
  if (status) params['status'] = status;
  const { data } = await api.get<PageResponse<EvaluationCycle>>('/evaluation/queue', { params });
  return data;
}

/** GET /evaluation/cycles/{cycleId}. */
export async function getCycle(cycleId: string): Promise<EvaluationCycle> {
  const { data } = await api.get<EvaluationCycle>(`/evaluation/cycles/${cycleId}`);
  return data;
}

/** POST /evaluation/cycles/{cycleId}/publish-to-portal — manual publish retry (ADMIN/REVIEWER). */
export async function publishToPortal(cycleId: string): Promise<EvaluationCycle> {
  const { data } = await api.post<EvaluationCycle>(
    `/evaluation/cycles/${cycleId}/publish-to-portal`
  );
  return data;
}