import { api } from '../lib/api';
import type {
  CreateEvaluatorProfileRequest,
  EvaluationCycleResponse,
    EvaluationStatus,
  EvaluationStatusHistoryResponse,
  EvaluatorProfileResponse,
  PageResponse,
  RoutingResultResponse,
} from '../types';


export async function getEvaluationQueue(
  page = 0,
  size = 20,
  status?: EvaluationStatus
): Promise<PageResponse<EvaluationCycleResponse>> {
  const params: Record<string, unknown> = { page, size };
  if (status) params['status'] = status;
  const { data } = await api.get<PageResponse<EvaluationCycleResponse>>('/evaluation/queue', { params });
  return data;
}

export async function startEvaluation(problemId: string): Promise<EvaluationCycleResponse> {
  const { data } = await api.post<EvaluationCycleResponse>('/evaluation/problems/' + problemId + '/start');
  return data;
}

export async function analyzeEvaluation(cycleId: string): Promise<EvaluationCycleResponse> {
  const { data } = await api.post<EvaluationCycleResponse>('/evaluation/cycles/' + cycleId + '/analyze');
  return data;
}

export async function routeEvaluation(cycleId: string): Promise<RoutingResultResponse> {
  const { data } = await api.post<RoutingResultResponse>('/evaluation/cycles/' + cycleId + '/route');
  return data;
}

export async function publishToPortal(cycleId: string): Promise<EvaluationCycleResponse> {
  const { data } = await api.post<EvaluationCycleResponse>('/evaluation/cycles/' + cycleId + '/publish-to-portal');
  return data;
}

export async function getCycle(cycleId: string): Promise<EvaluationCycleResponse> {
  const { data } = await api.get<EvaluationCycleResponse>('/evaluation/cycles/' + cycleId);
  return data;
}

export async function getCycleHistory(cycleId: string): Promise<EvaluationStatusHistoryResponse[]> {
  const { data } = await api.get<EvaluationStatusHistoryResponse[]>('/evaluation/cycles/' + cycleId + '/history');
  return data;
}

export async function createEvaluatorProfile(body: CreateEvaluatorProfileRequest): Promise<EvaluatorProfileResponse> {
  const { data } = await api.post<EvaluatorProfileResponse>('/evaluation/evaluator-profiles', body);
  return data;
}
