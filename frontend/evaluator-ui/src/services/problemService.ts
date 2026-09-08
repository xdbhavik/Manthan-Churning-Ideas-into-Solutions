import { api } from '../lib/api';
import type { ProblemResponse } from '../types';

/** Fetches problem info. May throw if problem-service is unavailable — callers must handle gracefully. */
export async function getProblem(problemId: string): Promise<ProblemResponse> {
  const { data } = await api.get<ProblemResponse>('/problems/' + problemId);
  return data;
}
