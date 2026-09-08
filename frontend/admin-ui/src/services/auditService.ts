import { api } from '../lib/api';
import type { AuditLog } from '../types';

/** GET /audit/{problemId} — ordered oldest first */
export async function getAuditLog(problemId: string): Promise<AuditLog[]> {
  const { data } = await api.get<AuditLog[]>(`/audit/${problemId}`);
  return data;
}
