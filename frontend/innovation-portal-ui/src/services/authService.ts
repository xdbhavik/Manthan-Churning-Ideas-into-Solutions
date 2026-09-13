import { api } from '../lib/api';
import type { OtpResponse, VerifyOtpResponse } from '../types';

/** POST /auth/login — returns challengeId + devOtp. If 404, the caller should register. */
export async function login(phone: string, email?: string): Promise<OtpResponse> {
  const { data } = await api.post<OtpResponse>('/auth/login', { phone, email: email ?? null });
  return data;
}

/** POST /auth/register — create the source user + return challengeId + devOtp. */
export async function registerUser(phone: string, email?: string): Promise<OtpResponse> {
  const { data } = await api.post<OtpResponse>('/auth/register', { phone, email: email ?? null });
  return data;
}

/** POST /auth/verify-otp — returns JWT pair + user. */
export async function verifyOtp(challengeId: string, code: string): Promise<VerifyOtpResponse> {
  const { data } = await api.post<VerifyOtpResponse>('/auth/verify-otp', { challengeId, code });
  return data;
}

/** POST /auth/logout — revokes the refresh token. */
export async function logout(refreshToken: string): Promise<void> {
  await api.post('/auth/logout', { refreshToken });
}