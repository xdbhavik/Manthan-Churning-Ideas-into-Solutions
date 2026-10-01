import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { AUTH_EXPIRED_EVENT } from '../../services/apiClient';
import * as authService from '../../services/authService';
import { clearTokens, getRefreshToken, getRole, getSessionUser, isAuthenticated, setTokens } from '../../lib/auth';
import type { SessionUser, VerifyOtpResponse } from '../../lib/auth';

export interface AuthContextValue {
  authed: boolean;
  user: SessionUser | null;
  role: string | null;
  login: (phone: string, email?: string) => Promise<{ challengeId: string }>;
  verifyOtp: (challengeId: string, code: string) => Promise<VerifyOtpResponse>;
  completeLogin: (res: VerifyOtpResponse) => void;
  register: (fullName: string, email: string, phone: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState<boolean>(() => isAuthenticated());
  const [user, setUser] = useState<SessionUser | null>(() => (isAuthenticated() ? getSessionUser() : null));
  const [role, setRole] = useState<string | null>(() => (isAuthenticated() ? getRole() : null));

  const login = useCallback(async (phone: string, email?: string) => {
    const res = await authService.login({ phone, email });
    return { challengeId: res.challengeId };
  }, []);

  const verifyOtp = useCallback(async (challengeId: string, code: string) => {
    const res = await authService.verifyOtp({ challengeId, code });
    // Tokens are now set by the caller (LoginPage) to allow intermediate API calls (like portal.me for KYC)
    // before triggering the global React auth state update and layout redirects.
    return res;
  }, []);

  const completeLogin = useCallback((res: VerifyOtpResponse) => {
    setTokens(res.accessToken, res.refreshToken);
    setAuthed(true);
    setUser(res.user);
    setRole(res.user.role);
  }, []);

  const register = useCallback(async (_fullName: string, email: string, phone: string) => {
    await authService.registerUser({ phone, email });
    // Challenge ID will be set by login flow
  }, []);

  const logout = useCallback(() => {
    const refresh = getRefreshToken();
    if (refresh) authService.logout(refresh).catch(() => undefined);
    clearTokens();
    setAuthed(false);
    setUser(null);
    setRole(null);
  }, []);

  useEffect(() => {
    const onExpired = () => {
      clearTokens();
      setAuthed(false);
      setUser(null);
      setRole(null);
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, []);

  const value = useMemo(
    () => ({ authed, user, role, login, verifyOtp, completeLogin, register, logout }),
    [authed, user, role, login, verifyOtp, completeLogin, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}