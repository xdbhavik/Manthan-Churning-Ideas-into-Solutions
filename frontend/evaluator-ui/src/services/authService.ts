import { api } from '../lib/api';
import type { OtpResponse, VerifyOtpResponse } from '../types';

export async function sendOtp(phone: string): Promise<OtpResponse> {
  const { data } = await api.post<OtpResponse>('/auth/login', { phone });
  return data;
}

export async function verifyOtp(challengeId: string, otp: string): Promise<VerifyOtpResponse> {
  // Backend Spring Boot DTO expects { challengeId: UUID, code: String }
  // We send both 'code' and 'otp' for maximum backward/forward compatibility
  const { data } = await api.post<VerifyOtpResponse>('/auth/verify-otp', {
    challengeId,
    code: otp,
    otp,
  });
  return data;
}

export async function logout(): Promise<void> {
  try {
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      await api.post('/auth/logout', { refreshToken });
    }
  } catch {
    // Ignore logout errors — we clear tokens regardless
  }
}
