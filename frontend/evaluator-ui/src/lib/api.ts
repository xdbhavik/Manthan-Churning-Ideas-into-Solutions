import axios, { AxiosError } from 'axios';
import type { AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from './auth';

const BASE_URL = (import.meta as unknown as { env: Record<string, string> }).env['VITE_API_BASE_URL'] ?? 'http://localhost:8080';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token) config.headers['Authorization'] = 'Bearer ' + token;
  return config;
});

let isRefreshing = false;
let pendingQueue: Array<{ resolve: (v: unknown) => void; reject: (e: unknown) => void; config: AxiosRequestConfig }> = [];

function processQueue(error: AxiosError | null) {
  pendingQueue.forEach(({ resolve, reject, config }) => {
    if (error) reject(error);
    else resolve(api(config));
  });
  pendingQueue = [];
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as AxiosRequestConfig & { _retry?: boolean };
    const isAuthRoute =
      original.url?.includes('/auth/login') ||
      original.url?.includes('/auth/verify-otp') ||
      original.url?.includes('/auth/refresh');

    if (error.response?.status !== 401 || original._retry || isAuthRoute) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push({ resolve, reject, config: original });
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = getRefreshToken();
      if (!refreshToken) throw new Error('No refresh token');
      const { data } = await axios.post<{ accessToken: string; refreshToken: string }>(
        BASE_URL + '/auth/refresh', { refreshToken }
      );
      setTokens(data.accessToken, data.refreshToken);
      api.defaults.headers.common['Authorization'] = 'Bearer ' + data.accessToken;
      processQueue(null);
      return api(original);
    } catch (refreshError) {
      processQueue(refreshError as AxiosError);
      clearTokens();
      window.location.replace('/login?reason=session_expired');
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as Record<string, unknown> | string | null;
    if (typeof data === 'string') return data;
    if (data && typeof data === 'object') {
      if (data['message']) return String(data['message']);
      if (data['error']) return String(data['error']);
    }
    return 'HTTP ' + (error.response?.status ?? 'error');
  }
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred';
}

export function getErrorStatus(error: unknown): number | null {
  if (axios.isAxiosError(error)) return error.response?.status ?? null;
  return null;
}
