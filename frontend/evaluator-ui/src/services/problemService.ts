import { api } from '../lib/api';
import type { ProblemEvidenceResponse, ProblemResponse } from '../types';

/** Fetches problem info. May throw if problem-service is unavailable — callers must handle gracefully. */
export async function getProblem(problemId: string): Promise<ProblemResponse> {
  const { data } = await api.get<ProblemResponse>('/problems/' + problemId);
  return data;
}

export async function getProblemEvidence(problemId: string): Promise<ProblemEvidenceResponse[]> {
  const { data } = await api.get<ProblemEvidenceResponse[]>('/problems/' + problemId + '/evidence');
  return data || [];
}
