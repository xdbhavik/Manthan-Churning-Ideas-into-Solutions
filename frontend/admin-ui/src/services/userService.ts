import { api } from '../lib/api';
import type { UserResponse } from '../types';

/** GET /users/{id} — ADMIN only */
export async function getUser(id: string): Promise<UserResponse> {
  const { data } = await api.get<UserResponse>(`/users/${id}`);
  return data;
}

/** PATCH /users/{id}/role — ADMIN only */
export async function changeRole(id: string, role: 'SUBMITTER' | 'REVIEWER' | 'ADMIN'): Promise<UserResponse> {
  const { data } = await api.patch<UserResponse>(`/users/${id}/role`, { role });
  return data;
}
