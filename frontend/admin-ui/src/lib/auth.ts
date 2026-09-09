// Token keys — per-actor isolation like actor-core.js
const PREFIX = 'sih_admin_';

export interface SessionUser {
  userId: string;
  phone: string;
  email?: string | null;
  role: string;
  kycStatus?: string;
  linkedSourceId?: string | null;
  createdAt?: string;
}

export function getAccessToken(): string {
  return localStorage.getItem(`${PREFIX}token`) ?? '';
}

export function getRefreshToken(): string {
  return localStorage.getItem(`${PREFIX}refresh`) ?? '';
}

export function getSessionUser(): SessionUser | null {
  const raw = localStorage.getItem(`${PREFIX}user`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(`${PREFIX}token`, accessToken);
  localStorage.setItem(`${PREFIX}refresh`, refreshToken);
}

export function setSession(accessToken: string, refreshToken: string, user: SessionUser): void {
  setTokens(accessToken, refreshToken);
  localStorage.setItem(`${PREFIX}user`, JSON.stringify(user));
}

export function clearTokens(): void {
  localStorage.removeItem(`${PREFIX}token`);
  localStorage.removeItem(`${PREFIX}refresh`);
  localStorage.removeItem(`${PREFIX}user`);
}

interface JwtPayload {
  sub?: string;
  role?: string;
  exp?: number;
  iat?: number;
}

export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(payload) as JwtPayload;
  } catch {
    return null;
  }
}

export function getRole(): string | null {
  const token = getAccessToken();
  if (!token) return null;
  return decodeJwtPayload(token)?.role ?? null;
}

export function isAdmin(): boolean {
  return getRole() === 'ADMIN';
}

export function isAuthenticated(): boolean {
  const token = getAccessToken();
  if (!token) return false;
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return false;
  return payload.exp * 1000 > Date.now();
}
