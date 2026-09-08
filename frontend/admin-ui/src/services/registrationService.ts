import { api } from '../lib/api';
import type { RegistrationResponse, RegistrationStatus } from '../types';

/** GET /reviewer/registrations?status= */
export async function getQueue(status?: RegistrationStatus): Promise<RegistrationResponse[]> {
  const params = status ? { status } : {};
  const { data } = await api.get<RegistrationResponse[]>('/reviewer/registrations', { params });
  return data;
}

/** GET /registration/{id} */
export async function getRegistration(id: string): Promise<RegistrationResponse> {
  const { data } = await api.get<RegistrationResponse>(`/registration/${id}`);
  return data;
}

/** POST /reviewer/registrations/{id}/assign */
export async function assign(id: string): Promise<RegistrationResponse> {
  const { data } = await api.post<RegistrationResponse>(`/reviewer/registrations/${id}/assign`);
  return data;
}

/** POST /reviewer/registrations/{id}/approve — comment optional */
export async function approve(id: string, comment?: string): Promise<RegistrationResponse> {
  const body = comment ? { comment } : undefined;
  const { data } = await api.post<RegistrationResponse>(`/reviewer/registrations/${id}/approve`, body);
  return data;
}

/** POST /reviewer/registrations/{id}/reject — comment mandatory */
export async function reject(id: string, comment: string): Promise<RegistrationResponse> {
  const { data } = await api.post<RegistrationResponse>(`/reviewer/registrations/${id}/reject`, { comment });
  return data;
}

/** POST /reviewer/registrations/{id}/request-action — comment mandatory */
export async function requestAction(id: string, comment: string): Promise<RegistrationResponse> {
  const { data } = await api.post<RegistrationResponse>(
    `/reviewer/registrations/${id}/request-action`,
    { comment }
  );
  return data;
}
