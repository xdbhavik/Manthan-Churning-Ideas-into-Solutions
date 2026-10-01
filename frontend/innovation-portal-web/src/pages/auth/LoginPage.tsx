import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../app/providers/AuthProvider';
import { useToast } from '../../app/providers/ToastProvider';
import { getErrorMessage } from '../../services/apiClient';
import * as authService from '../../services/authService';
import * as portal from '../../services/portalService';
import { setSession } from '../../lib/auth';
import { OtpInput } from '../../features/auth/OtpInput';
import type { OtpResponse } from '../../types/dto';

type Step = 'phone' | 'otp';

function secondsUntil(expiresAt: string): number {
  return Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get('redirect') ?? '/app/dashboard';
  const { verifyOtp, completeLogin } = useAuth();
  const toast = useToast();

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [challenge, setChallenge] = useState<OtpResponse | null>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [secondsLeft]);

  const startOtp = useCallback(
    async (registering: boolean) => {
      if (!phone.trim()) {
        setError('Enter your phone number.');
        return;
      }
      setLoading(true);
      setError(null);
      try {
        let res;
        try {
          res = registering
            ? await authService.registerUser({ phone: phone.trim(), email: email.trim() || null })
            : await authService.login({ phone: phone.trim(), email: email.trim() || null });
        } catch (e: any) {
          if (!registering && e?.response?.status === 404) {
            res = await authService.registerUser({ phone: phone.trim(), email: email.trim() || null });
            toast.notify('No existing account found. A new account has been created successfully.', 'success');
          } else {
            throw e;
          }
        }
        setChallenge(res);
        setSecondsLeft(secondsUntil(res.expiresAt));
        setStep('otp');
      } catch (e: any) {
        setError(getErrorMessage(e));
      } finally {
        setLoading(false);
      }
    },
    [phone, email, toast]
  );

  const verify = useCallback(async () => {
    if (!challenge || code.length < 6) {
      setError('Enter the 6-digit code.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await verifyOtp(challenge.challengeId, code);
      // Temporarily write session to local storage for portal.me() to have tokens for the API call
      setSession(res.accessToken, res.refreshToken, res.user);
      try {
        await portal.me();
        completeLogin(res);
        navigate(redirect, { replace: true });
      } catch (meErr: any) {
        if (meErr?.response?.status === 404) {
          completeLogin(res);
          navigate('/register', { replace: true });
        } else {
          completeLogin(res);
          navigate(redirect, { replace: true });
        }
      }
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [challenge, code, verifyOtp, completeLogin, navigate, redirect]);

  const resend = () => {
    startOtp(false);
  };

  return (
    <div className="bg-surface-card rounded-2xl p-space-xl shadow-sm max-w-lg w-full mx-auto my-12">
      <div className="flex items-center gap-2 mb-6">
        <img src="/logo.png" alt="Manthan" className="w-9 h-9" />
        <div>
          <div className="font-headline font-bold text-on-surface">Manthan</div>
          <div className="text-xs text-on-surface-variant-weak">Churning Ideas into Solutions</div>
        </div>
      </div>

      {step === 'phone' ? (
        <div>
          <h1 className="font-headline text-2xl font-bold text-on-surface">Sign in with OTP</h1>
          <p className="text-sm text-on-surface-variant-weak mt-1">We'll send a one-time passcode to your phone.</p>

          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-body mb-1.5">Phone number</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 9876543210"
                inputMode="tel"
                className="w-full px-3 py-2.5 rounded-lg border border-border-subtle bg-surface-card text-sm focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-body mb-1.5">
                Email <span className="text-on-surface-variant-weak font-normal">(optional)</span>
              </label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                inputMode="email"
                className="w-full px-3 py-2.5 rounded-lg border border-border-subtle bg-surface-card text-sm focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-state-returned-bg border border-state-returned-border px-3 py-2 text-sm text-state-returned-text">
                {error}
              </div>
            )}

            <button
              onClick={() => startOtp(false)}
              disabled={loading}
              className="btn-primary w-full text-sm font-bold py-2.5 disabled:opacity-60"
            >
              {loading ? 'Sending…' : 'Send code'}
            </button>
          </div>
        </div>
      ) : (
        <div>
          <h1 className="font-headline text-2xl font-bold text-on-surface">Enter code</h1>
          <p className="text-sm text-on-surface-variant-weak mt-1">
            We sent a 6-digit code to <span className="font-semibold text-body">{phone}</span>.
          </p>

          <div className="mt-6">
            <OtpInput value={code} onChange={setCode} disabled={loading} />
          </div>
          {error && (
            <div className="mt-3 rounded-lg bg-state-returned-bg border border-state-returned-border px-3 py-2 text-sm text-state-returned-text">
              {error}
            </div>
          )}

          <button
            onClick={verify}
            disabled={loading}
            className="btn-primary mt-4 w-full text-sm font-bold py-2.5 disabled:opacity-60"
          >
            {loading ? 'Verifying…' : 'Verify & sign in'}
          </button>

          <div className="mt-3 flex items-center justify-between text-sm">
            <button onClick={() => setStep('phone')} className="text-on-surface-variant-weak hover:text-on-surface">
              Change number
            </button>
            <button
              onClick={resend}
              disabled={secondsLeft > 0 || loading}
              className="text-primary hover:text-primary-container font-semibold disabled:opacity-40"
            >
              {secondsLeft > 0 ? `Resend in ${secondsLeft}s` : 'Resend code'}
            </button>
          </div>
        </div>
      )}

      <div className="mt-8 pt-6 border-t border-border-subtle text-xs text-on-surface-variant-weak">
        Secure OTP authentication
      </div>
    </div>
  );
}