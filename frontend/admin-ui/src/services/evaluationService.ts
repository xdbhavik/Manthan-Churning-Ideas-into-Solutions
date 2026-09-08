import { api } from '../lib/api';
import type {
  EvaluationCycleResponse,
  EvaluationStatus,
  EvaluationStatusHistoryResponse,
  PageResponse,
  ProblemAnalysisResponse,
} from '../types';

/** GET /evaluation/queue?status=&page=&size= */
export async function getEvaluationQueue(
  page = 0,
  size = 20,
  status?: EvaluationStatus
): Promise<PageResponse<EvaluationCycleResponse>> {
  const params: Record<string, unknown> = { page, size };
  if (status) params.status = status;
  const { data } = await api.get<PageResponse<EvaluationCycleResponse>>('/evaluation/queue', { params });
  return data;
}

/** POST /evaluation/problems/{problemId}/start */
export async function startEvaluation(problemId: string): Promise<EvaluationCycleResponse> {
  const { data } = await api.post<EvaluationCycleResponse>(`/evaluation/problems/${problemId}/start`);
  return data;
}

/** POST /evaluation/cycles/{cycleId}/analyze */
export async function analyzeEvaluation(cycleId: string): Promise<ProblemAnalysisResponse> {
  const { data } = await api.post<ProblemAnalysisResponse>(`/evaluation/cycles/${cycleId}/analyze`);
  return data;
}

/** GET /evaluation/cycles/{cycleId} */
export async function getCycle(cycleId: string): Promise<EvaluationCycleResponse> {
  const { data } = await api.get<EvaluationCycleResponse>(`/evaluation/cycles/${cycleId}`);
  return data;
}

/** GET /evaluation/cycles/{cycleId}/history */
export async function getCycleHistory(cycleId: string): Promise<EvaluationStatusHistoryResponse[]> {
  const { data } = await api.get<EvaluationStatusHistoryResponse[]>(
    `/evaluation/cycles/${cycleId}/history`
  );
  return data;
}
