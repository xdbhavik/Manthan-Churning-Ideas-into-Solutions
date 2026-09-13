import { api } from '../lib/api';
import { getRefreshToken } from '../lib/auth';
import type { OtpResponse, VerifyOtpResponse } from '../types';

export async function sendOtp(phone: string, email?: string): Promise<OtpResponse> {
  const { data } = await api.post<OtpResponse>('/auth/login', {
    phone,
    email: email?.trim() || undefined,
  });
  return data;
}

export async function register(phone: string, email?: string): Promise<OtpResponse> {
  const { data } = await api.post<OtpResponse>('/auth/register', {
    phone,
    email: email?.trim() || undefined,
  });
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

export async function refreshToken(token: string): Promise<VerifyOtpResponse> {
  const { data } = await api.post<VerifyOtpResponse>('/auth/refresh', { refreshToken: token });
  return data;
}

export async function logout(): Promise<void> {
  try {
    const rf = getRefreshToken();
    if (rf) {
      await api.post('/auth/logout', { refreshToken: rf });
    }
  } catch {
    // Ignore logout errors — we clear tokens regardless
  }
}
