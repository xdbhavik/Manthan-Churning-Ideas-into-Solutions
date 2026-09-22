import { api } from './apiClient';
import type { OtpRequest, OtpResponse, RefreshRequest, VerifyOtpRequest, VerifyOtpResponse, ParticipantRegisterRequest, Participant } from '../types/dto';

/** POST /auth/login — issue OTP. 404 if phone unknown (caller should register). */
export async function login(body: OtpRequest): Promise<OtpResponse> {
  const { data } = await api.post<OtpResponse>('/auth/login', body);
  return data;
}

/** POST /auth/register — create source user + issue OTP. */
export async function registerUser(body: OtpRequest): Promise<OtpResponse> {
  const { data } = await api.post<OtpResponse>('/auth/register', body);
  return data;
}

/** POST /auth/verify-otp — returns JWT pair + user. */
export async function verifyOtp(body: VerifyOtpRequest): Promise<VerifyOtpResponse> {
  const { data } = await api.post<VerifyOtpResponse>('/auth/verify-otp', body);
  return data;
}

/** POST /auth/logout — revoke the refresh token. */
export async function logout(refreshToken: string): Promise<void> {
  const body: RefreshRequest = { refreshToken };
  await api.post('/auth/logout', body);
}

/** POST /portal/participants — register as a STUDENT participant. */
export async function registerParticipant(body: ParticipantRegisterRequest): Promise<Participant> {
  const { data } = await api.post<Participant>('/portal/participants', body);
  return data;
}
