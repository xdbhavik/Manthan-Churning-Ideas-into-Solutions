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
    const refreshed = await refreshAccessToken();
    if (!refreshed) {
      clearTokens();
    }
  }
}

// ============================================================
// Humanized Error Interceptor
// ============================================================
function humanizeApiError(status, errorBody) {
  // Try to extract a clean message from the error body
  let msg = '';
  if (typeof errorBody === 'string') {
    msg = errorBody;
  } else if (errorBody && typeof errorBody === 'object') {
    // Prioritize human-readable fields
    msg = errorBody.message || errorBody.error || errorBody.detail || errorBody.title || '';
    // If the extracted message is still JSON-like, clean it
    if (!msg && errorBody.errors && Array.isArray(errorBody.errors)) {
      msg = errorBody.errors.map(e => e.defaultMessage || e.message || e.field).filter(Boolean).join(', ');
    }
  }

  // Status-specific overrides for common API responses
  switch (status) {
    case 400:
      if (msg.toLowerCase().includes('phone already registered') || msg.toLowerCase().includes('already exists')) {
        return 'This phone number is already registered. Use the "Mutate Role" action on the existing user row to change their role.';
      }
      return msg || 'Invalid request. Please check your input and try again.';
    case 401:
      return 'Session expired or invalid. Please log in again.';
    case 403:
      return 'Administrative authorization required for this operation.';
    case 404:
      return msg || 'The requested resource was not found.';
    case 409:
      return msg || 'Action conflicted with current user state. Please refresh data and try again.';
    case 422:
      if (msg) {
        // Extract field names from validation errors
        return `Validation error: ${msg}`;
      }
      return 'Missing or invalid required fields. Please review your input.';
    case 429:
      return 'Too many requests. Please wait a moment before trying again.';
    case 500:
      return 'An internal server error occurred. Please try again later.';
    case 502:
    case 503:
    case 504:
      return 'The service is temporarily unavailable. Please try again in a few moments.';
    default:
      return msg || `Request failed (HTTP ${status}). Please try again.`;
  }
}

export async function apiRequest(endpoint, options = {}) {
  const isPublicAuth = endpoint.startsWith('/auth/login') ||
                       endpoint.startsWith('/auth/verify-otp') ||
                       endpoint.startsWith('/auth/refresh') ||
                       endpoint.startsWith('/auth/register');

  if (!isPublicAuth) {
    await ensureAuth();
  }

  const token = !isPublicAuth ? getAccessToken() : null;
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };
  const res = await fetch(`${getApiBase()}${endpoint}`, { ...options, headers });
  if (!res.ok) {
    let errorBody = null;
    try {
      errorBody = await res.json();
    } catch {
      errorBody = res.statusText;
    }
    const humanMsg = humanizeApiError(res.status, errorBody);
    const errObj = new Error(humanMsg);
    errObj.status = res.status;
    errObj.rawBody = errorBody;
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
  const res = await apiRequest('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ challengeId, code }),
  });
  if (res && res.accessToken) {
    setTokens(res.accessToken, res.refreshToken, res.user);
  }
  return res;
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

// ============================================================
// Reviewer & Registration Management
// ============================================================
export async function fetchRegistrations(status = null) {
  const query = status && status !== 'ALL' ? `?status=${encodeURIComponent(status)}` : '';
  return apiRequest(`/reviewer/registrations${query}`);
}

export async function assignRegistration(id) {
  return apiRequest(`/reviewer/registrations/${id}/assign`, {
    method: 'POST',
  });
}

export async function approveRegistration(id, comment = null) {
  return apiRequest(`/reviewer/registrations/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify({ comment: comment || 'Statutory review verified and approved by Administrator.' }),
  });
}

export async function rejectRegistration(id, comment) {
  return apiRequest(`/reviewer/registrations/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ comment }),
  });
}

export async function requestActionRegistration(id, comment) {
  return apiRequest(`/reviewer/registrations/${id}/request-action`, {
    method: 'POST',
    body: JSON.stringify({ comment }),
  });
}

// ============================================================
// Registration Detail & History
// ============================================================
export async function fetchRegistrationDetail(id) {
  try {
    return await apiRequest(`/registration/${id}`);
  } catch (err) {
    if (err.status === 404) {
      // Fallback: try reviewer endpoint
      try {
        return await apiRequest(`/reviewer/registrations/${id}`);
      } catch {
        return null;
      }
    }
    throw err;
  }
}

export async function fetchRegistrationHistory(id) {
  try {
    return await apiRequest(`/registration/${id}/history`);
  } catch (err) {
    if (err.status === 404) {
      return [];
    }
    throw err;
  }
}

// ============================================================
// Source Identity Verification
// ============================================================
export async function fetchSources() {
  try {
    return await apiRequest('/sources');
  } catch (err) {
    if (err.status === 404 || err.status === 405) {
      try {
        return await apiRequest('/source/accounts');
      } catch {
        return null;
      }
    }
    throw err;
  }
}

export async function verifySource(sourceId, method, result, notes, evidenceUrl) {
  return apiRequest(`/sources/${sourceId}/verify`, {
    method: 'POST',
    body: JSON.stringify({
      method,
      result,
      notes: notes || undefined,
      evidenceUrl: evidenceUrl || undefined,
    }),
  });
}

export async function fetchSourceVerificationHistory(sourceId) {
  try {
    return await apiRequest(`/sources/${sourceId}/verification-history`);
  } catch (err) {
    if (err.status === 404) {
      return [];
    }
    throw err;
  }
}

// ============================================================
// Problem Statements
// ============================================================
export async function fetchProblems() {
  return apiRequest('/problems');
}

export async function fetchProblem(id) {
  return apiRequest(`/problems/${id}`);
}

export async function updateProblemStatus(id, status, expectedVersion = 1) {
  return apiRequest(`/problems/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, expectedVersion }),
  });
}

export async function fetchEvidence(problemId) {
  return apiRequest(`/problems/${problemId}/evidence`);
}

// ============================================================
// Evaluation Cycles
// ============================================================
export async function fetchEvaluationQueue(status = null, page = 0, size = 20) {
  let query = `?page=${page}&size=${size}`;
  if (status && status !== 'ALL') {
    query += `&status=${encodeURIComponent(status)}`;
  }
  return apiRequest(`/evaluation/queue${query}`);
}

export async function fetchEvaluationCycle(cycleId) {
  return apiRequest(`/evaluation/cycles/${cycleId}`);
}

export async function fetchEvaluationAggregation(cycleId) {
  return apiRequest(`/evaluation/cycles/${cycleId}/aggregation`);
}

export async function fetchEvaluationHistory(cycleId) {
  return apiRequest(`/evaluation/cycles/${cycleId}/history`);
}

export async function publishCycleToPortal(cycleId) {
  return apiRequest(`/evaluation/cycles/${cycleId}/publish-to-portal`, {
    method: 'POST',
  });
}

export async function startEvaluation(problemId) {
  return apiRequest(`/evaluation/problems/${problemId}/start`, {
    method: 'POST',
  });
}

export async function runAiAnalysis(cycleId) {
  return apiRequest(`/evaluation/cycles/${cycleId}/analyze`, {
    method: 'POST',
  });
}

export async function routePools(cycleId) {
  return apiRequest(`/evaluation/cycles/${cycleId}/route-pools`, {
    method: 'POST',
  });
}

export async function aggregateScores(cycleId) {
  return apiRequest(`/evaluation/cycles/${cycleId}/aggregate`, {
    method: 'POST',
  });
}

export async function prioritizeScores(cycleId) {
  return apiRequest(`/evaluation/cycles/${cycleId}/prioritize`, {
    method: 'POST',
  });
}

// ============================================================
// Audit Ledger
// ============================================================
export async function fetchAuditByProblem(problemId) {
  return apiRequest(`/audit/${problemId}`);
}

// ============================================================
// User Administration & RBAC (Enterprise)
// ============================================================
export async function lookupUser(userId) {
  return apiRequest(`/users/${userId}`);
}

export async function changeUserRole(userId, role) {
  return apiRequest(`/users/${userId}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
}

export async function onboardEvaluator(phone) {
  const cleanPhone = phone.replace(/\D/g, '');
  return apiRequest('/users/evaluators', {
    method: 'POST',
    body: JSON.stringify({ phone: cleanPhone }),
  });
}

export async function registerNewUser(phone, name, email, password) {
  const cleanPhone = phone.replace(/\D/g, '');
  return apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      phone: cleanPhone,
      name: name || undefined,
      email: email || undefined,
      password: password || undefined,
    }),
  });
}

export async function fetchAllUsers() {
  // Try /users first, then /users/search as fallback
  try {
    return await apiRequest('/users');
  } catch (err) {
    if (err.status === 404 || err.status === 405) {
      try {
        return await apiRequest('/users/search');
      } catch {
        // Return null to signal endpoint not available
        return null;
      }
    }
    throw err;
  }
}

export async function searchUserByPhone(phone) {
  const cleanPhone = phone.replace(/\D/g, '');
  return apiRequest(`/users/search?phone=${encodeURIComponent(cleanPhone)}`);
}

export async function resetUserPassword(userId, newPassword) {
  // Try dedicated password-reset endpoint first, then fallback to credentials patch
  try {
    return await apiRequest(`/users/${userId}/password-reset`, {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    });
  } catch (err) {
    if (err.status === 404 || err.status === 405) {
      return await apiRequest(`/users/${userId}/credentials`, {
        method: 'PATCH',
        body: JSON.stringify({ newPassword }),
      });
    }
    throw err;
  }
}

export async function revokeUserSessions(userId) {
  try {
    return await apiRequest(`/users/${userId}/revoke-sessions`, {
      method: 'POST',
    });
  } catch (err) {
    if (err.status === 404 || err.status === 405) {
      return await apiRequest('/auth/revoke', {
        method: 'POST',
        body: JSON.stringify({ userId }),
      });
    }
    throw err;
  }
}

export async function createEvaluatorProfile(evaluatorType, maxWorkload = 5, experienceYears = 0) {
  return apiRequest('/evaluation/evaluator-profiles', {
    method: 'POST',
    body: JSON.stringify({
      evaluatorType,
      maxWorkload,
      experienceYears,
      active: true,
    }),
  });
}

export async function fetchSourceAccounts() {
  return apiRequest('/source/accounts');
}
