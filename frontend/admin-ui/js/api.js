// ============================================================
// API Client – Gateway integration, JWT session, auth endpoints
// ============================================================
const TOKEN_KEY = 'sih_admin_access_token';
const REFRESH_KEY = 'sih_admin_refresh_token';
const USER_KEY = 'sih_admin_user';

export function getApiBase() {
  return localStorage.getItem('api_base_url') || 'http://localhost:8090';
}

export function setTokens(access, refresh, user = null) {
  if (access) sessionStorage.setItem(TOKEN_KEY, access);
  if (refresh) sessionStorage.setItem(REFRESH_KEY, String(refresh));
  if (user) sessionStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getAccessToken() {
  return sessionStorage.getItem(TOKEN_KEY) || null;
}

export function getRefreshToken() {
  return sessionStorage.getItem(REFRESH_KEY) || null;
}

export function getStoredUser() {
  try {
    const raw = sessionStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearTokens() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_KEY);
  sessionStorage.removeItem(USER_KEY);
  sessionStorage.removeItem('auth_phone');
  sessionStorage.removeItem('auth_challenge_id');
}

export function decodeJwtPayload(token) {
  try {
    const parts = (token || '').split('.');
    if (parts.length !== 3) return null;
    const payload = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

export function isAuthenticated() {
  const token = getAccessToken();
  if (!token) return false;
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return true;
  return payload.exp * 1000 > Date.now();
}

async function refreshAccessToken() {
  const rf = getRefreshToken();
  if (!rf) return false;
  try {
    const res = await fetch(`${getApiBase()}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: rf }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    setTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

async function ensureAuth() {
  const token = getAccessToken();
  if (!token) return;
  const payload = decodeJwtPayload(token);
  if (payload?.exp && Date.now() > payload.exp * 1000 - 60000) {
    await refreshAccessToken();
  }
}

export async function apiRequest(endpoint, options = {}) {
  await ensureAuth();
  const token = getAccessToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };
  const res = await fetch(`${getApiBase()}${endpoint}`, { ...options, headers });
  if (!res.ok) {
    let errorMsg = '';
    try {
      const err = await res.json();
      errorMsg = err.message || err.error || err.detail || JSON.stringify(err);
    } catch {
      errorMsg = res.statusText;
    }
    const errObj = new Error(errorMsg || `API Error: ${res.status}`);
    errObj.status = res.status;
    throw errObj;
  }
  if (res.status === 204) return null;
  return res.json().catch(() => ({}));
}

// Live Auth endpoints
export async function requestOtp(phone, email) {
  const cleanPhone = phone.replace(/\D/g, '');
  return apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ phone: cleanPhone, email: email || undefined }),
  });
}

export async function verifyOtp(challengeId, code) {
  return apiRequest('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ challengeId, code }),
  });
}

export async function logout() {
  const rf = getRefreshToken();
  if (rf) {
    try {
      await apiRequest('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: rf }),
      });
    } catch {
      // Ignore network errors during logout
    }
  }
  clearTokens();
}
