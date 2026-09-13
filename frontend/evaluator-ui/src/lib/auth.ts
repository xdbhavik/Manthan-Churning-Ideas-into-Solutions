const PREFIX = 'sih_eval_';

export function getAccessToken(): string {
  return localStorage.getItem(PREFIX + 'token') ?? '';
}
export function getRefreshToken(): string {
  return localStorage.getItem(PREFIX + 'refresh') ?? '';
}
export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(PREFIX + 'token', accessToken);
  localStorage.setItem(PREFIX + 'refresh', refreshToken);
}
export function clearTokens(): void {
  localStorage.removeItem(PREFIX + 'token');
  localStorage.removeItem(PREFIX + 'refresh');
}

interface JwtPayload {
  sub?: string;
  role?: string;
  exp?: number;
  iat?: number;
  phone?: string;
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
export function getUserId(): string | null {
  const token = getAccessToken();
  if (!token) return null;
  return decodeJwtPayload(token)?.sub ?? null;
}
export function getPhone(): string | null {
  const token = getAccessToken();
  if (!token) return null;
  return decodeJwtPayload(token)?.phone ?? null;
}
export function isEvaluator(): boolean {
  const role = getRole();
  return role === 'EVALUATOR' || role === 'SUBMITTER' || role === 'ADMIN' || role === 'REVIEWER';
}
export function isAdmin(): boolean {
  const role = getRole();
  return role === 'ADMIN' || role === 'REVIEWER';
}
export function isAuthenticated(): boolean {
  const token = getAccessToken();
  if (!token) return false;
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return false;
  return payload.exp * 1000 > Date.now();
}
