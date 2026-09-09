// Token keys — per-actor isolation like actor-core.js
// Admin session tokens use sessionStorage for strict terminal isolation.
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
  // Purge any legacy localStorage tokens if present
  if (typeof localStorage !== 'undefined' && localStorage.getItem(`${PREFIX}token`)) {
    localStorage.removeItem(`${PREFIX}token`);
  }
  return typeof sessionStorage !== 'undefined' ? (sessionStorage.getItem(`${PREFIX}token`) ?? '') : '';
}

export function getRefreshToken(): string {
  if (typeof localStorage !== 'undefined' && localStorage.getItem(`${PREFIX}refresh`)) {
    localStorage.removeItem(`${PREFIX}refresh`);
  }
  return typeof sessionStorage !== 'undefined' ? (sessionStorage.getItem(`${PREFIX}refresh`) ?? '') : '';
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
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem(`${PREFIX}token`, accessToken);
    sessionStorage.setItem(`${PREFIX}refresh`, refreshToken);
  }
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(`${PREFIX}token`);
    localStorage.removeItem(`${PREFIX}refresh`);
  }
}

export function setSession(accessToken: string, refreshToken: string, user: SessionUser): void {
  setTokens(accessToken, refreshToken);
  localStorage.setItem(`${PREFIX}user`, JSON.stringify(user));
}

export function clearTokens(): void {
<<<<<<< HEAD
  localStorage.removeItem(`${PREFIX}token`);
  localStorage.removeItem(`${PREFIX}refresh`);
  localStorage.removeItem(`${PREFIX}user`);
=======
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem(`${PREFIX}token`);
    sessionStorage.removeItem(`${PREFIX}refresh`);
  }
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(`${PREFIX}token`);
    localStorage.removeItem(`${PREFIX}refresh`);
  }
>>>>>>> 5ec91c3afb05afc3cbb385913e664d098a6c69a8
}

interface JwtPayload {
  sub?: string;
  role?: string;
  roles?: string[] | string;
  authorities?: string[] | string;
  exp?: number;
  iat?: number;
}

export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload) as JwtPayload;
  } catch {
    return null;
  }
}

export function getRole(): string | null {
  const token = getAccessToken();
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  if (!payload) return null;

  let role = payload.role;
  if (!role && payload.authorities) {
    const auth = Array.isArray(payload.authorities) ? payload.authorities[0] : payload.authorities;
    if (auth) role = auth.replace('ROLE_', '');
  }
  if (!role && payload.roles) {
    const r = Array.isArray(payload.roles) ? payload.roles[0] : payload.roles;
    if (r) role = r.replace('ROLE_', '');
  }
  return role ?? null;
}

export function isAuthenticated(): boolean {
  const token = getAccessToken();
  if (!token) return false;
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return false;
  return payload.exp * 1000 > Date.now();
}

export function isAdmin(): boolean {
  if (!isAuthenticated()) return false;
  return getRole() === 'ADMIN';
}
