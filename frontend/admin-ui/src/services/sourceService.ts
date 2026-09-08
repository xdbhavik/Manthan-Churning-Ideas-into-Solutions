import { api } from '../lib/api';
import type { SourceAccountResponse, SourceVerificationResponse } from '../types';

export type VerificationMethod =
  | 'OFFICIAL_EMAIL'
  | 'AUTHORIZATION_DOC'
  | 'OTP'
  | 'REGISTRATION_API'
  | 'INSTITUTIONAL_EMAIL'
  | 'MANUAL_REVIEW';

export type VerificationResult = 'PASS' | 'FAIL' | 'NEEDS_REVIEW';

/** POST /sources/{id}/verify */
export async function verifySource(
  sourceAccountId: string,
  method: VerificationMethod,
  result: VerificationResult,
  notes?: string,
  evidenceUrl?: string
): Promise<SourceVerificationResponse> {
  const body: Record<string, string> = { method, result };
  if (notes) body.notes = notes;
  if (evidenceUrl) body.evidenceUrl = evidenceUrl;
  const { data } = await api.post<SourceVerificationResponse>(`/sources/${sourceAccountId}/verify`, body);
  return data;
}

/** GET /source/accounts/{id} */
export async function getSourceAccount(id: string): Promise<SourceAccountResponse> {
  const { data } = await api.get<SourceAccountResponse>(`/source/accounts/${id}`);
  return data;
}
