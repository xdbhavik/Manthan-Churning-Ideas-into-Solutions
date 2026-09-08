import { api } from '../lib/api';
import type { OtpResponse, VerifyOtpResponse } from '../types';

export async function sendOtp(phone: string): Promise<OtpResponse> {
  const { data } = await api.post<OtpResponse>('/auth/login', { phone });
  return data;
}

export async function verifyOtp(challengeId: string, otp: string): Promise<VerifyOtpResponse> {
  const { data } = await api.post<VerifyOtpResponse>('/auth/verify-otp', { challengeId, otp });
  return data;
}

export async function logout(): Promise<void> {
  try {
    await api.post('/auth/logout');
  } catch {
    // Ignore logout errors — we clear tokens regardless
  }
}
