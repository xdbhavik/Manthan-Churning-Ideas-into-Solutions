import { api } from '../lib/api';
import type { OtpResponse, VerifyOtpResponse } from '../types';

/** POST /auth/login — returns challengeId + devOtp. If not found, fall back to register flow. */
export async function login(phone: string, email?: string): Promise<OtpResponse> {
  const trimmedPhone = phone.replace(/\D/g, '');

  try {
    const { data } = await api.post<OtpResponse>('/auth/login', { phone: trimmedPhone, email });
    return data;
  } catch (error: any) {
    if (error?.response?.status === 404) {
      const { data } = await api.post<OtpResponse>('/auth/register', { phone: trimmedPhone, email: email ?? null });
      return data;
    }
    throw error;
  }
}

/** POST /auth/verify-otp — returns JWT pair + user */
export async function verifyOtp(challengeId: string, code: string): Promise<VerifyOtpResponse> {
  const { data } = await api.post<VerifyOtpResponse>('/auth/verify-otp', { challengeId, code });
  return data;
}

/** POST /auth/refresh — rotates refresh token */
export async function refresh(refreshToken: string): Promise<VerifyOtpResponse> {
  const { data } = await api.post<VerifyOtpResponse>('/auth/refresh', { refreshToken });
  return data;
}

/** POST /auth/logout — revokes refresh token */
export async function logout(refreshToken: string): Promise<void> {
  await api.post('/auth/logout', { refreshToken });
}
