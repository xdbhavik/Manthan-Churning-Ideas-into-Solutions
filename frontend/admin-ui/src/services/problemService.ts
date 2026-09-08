import { api } from '../lib/api';
import type { ProblemResponse, ProblemStatus } from '../types';

/** GET /problems/{id} */
export async function getProblem(id: string): Promise<ProblemResponse> {
  const { data } = await api.get<ProblemResponse>(`/problems/${id}`);
  return data;
}

/** PATCH /problems/{id}/status — optimistic lock via expectedVersion */
export async function patchStatus(
  id: string,
  status: ProblemStatus,
  expectedVersion: number
): Promise<ProblemResponse> {
  const { data } = await api.patch<ProblemResponse>(`/problems/${id}/status`, {
    status,
    expectedVersion,
  });
  return data;
}
