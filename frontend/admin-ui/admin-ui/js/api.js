// ============================================================
// API Client – JWT auth, refresh, base URL configuration
// ============================================================
const API_BASE = '/api';

let accessToken = null;
let refreshToken = null;
let tokenExpiry = null;

export function setTokens(access, refresh) {
  accessToken = access;
  refreshToken = refresh;
  // Decode JWT to get expiry (simplified)
  try {
    const payload = JSON.parse(atob(access.split('.')[1]));
    tokenExpiry = payload.exp * 1000;
  } catch {
    tokenExpiry = Date.now() + 15 * 60 * 1000; // Default 15 min
  }
}

export function getAccessToken() {
  return accessToken;
}

export function clearTokens() {
  accessToken = null;
  refreshToken = null;
  tokenExpiry = null;
}

export function isAuthenticated() {
  return !!accessToken;
}

async function refreshAccessToken() {
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
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
  if (!accessToken) return;
  if (tokenExpiry && Date.now() > tokenExpiry - 60000) {
    await refreshAccessToken();
  }
}

export async function apiRequest(endpoint, options = {}) {
  await ensureAuth();
  const headers = {
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...options.headers,
  };
  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `API Error: ${res.status}`);
  }
  return res.json();
}

// Auth endpoints
export async function requestOtp(phone) {
  return apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ phone }),
  });
}

export async function verifyOtp(phone, otp) {
  return apiRequest('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ phone, otp }),
  });
}

export async function logout() {
  try {
    await apiRequest('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  } catch { /* ignore */ }
  clearTokens();
}
