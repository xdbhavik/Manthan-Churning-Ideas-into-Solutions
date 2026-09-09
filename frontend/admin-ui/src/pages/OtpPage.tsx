import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { verifyOtp } from '../services/authService';
import { setSession } from '../lib/auth';
import { getErrorMessage } from '../lib/api';

interface LocationState {
  phone: string;
  challengeId: string;
  devOtp: string | null;
}

export default function OtpPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;

  const initialDigits = state?.devOtp && state.devOtp.length === 6
    ? state.devOtp.split('')
    : ['', '', '', '', '', ''];
  const [digits, setDigits] = useState<string[]>(initialDigits);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (!state?.challengeId) navigate('/login', { replace: true });
  }, [state, navigate]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  function handleDigitChange(index: number, value: string) {
    const clean = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = clean;
    setDigits(next);
    if (clean && index < 5) inputRefs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) setDigits(pasted.split(''));
    e.preventDefault();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const code = digits.join('');
    if (code.length !== 6) { setError('Please enter all 6 digits.'); return; }
    if (!state?.challengeId) return;

    setLoading(true);
    setError(null);
    try {
      const res = await verifyOtp(state.challengeId, code);
      setSession(res.accessToken, res.refreshToken, res.user);
      if (res.user.role !== 'ADMIN') {
        navigate('/unauthorized', { replace: true });
      } else {
        navigate('/users', { replace: true });
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="w-full min-h-screen flex items-center justify-center p-gutter-mobile bg-[#f5f7f9] selection:bg-slate-200">
      <div className="w-full max-w-md flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500">

        <div className="flex flex-col items-center mb-space-2xl text-center">
          <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-[#edf3ee] border border-emerald-200 shadow-sm mb-space-md">
            <span className="material-symbols-outlined text-emerald-700 text-[26px]">key</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-[#1f2d3a] tracking-tight">
            Identity Verification
          </h1>
          <div className="flex items-center gap-space-xs mt-space-sm text-slate-500">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(22,163,74,0.4)]" aria-hidden="true" />
            <span className="font-mono-code text-[11px] uppercase tracking-[0.2em]">
              OTP Challenge · Phase 2
            </span>
          </div>
        </div>

        <div className="w-full bg-white border border-slate-200 rounded-xl shadow-[0_10px_25px_rgba(15,23,42,0.04)] overflow-hidden surface-lift">
          <div className="p-space-2xl flex flex-col items-center">
            
            <div className="text-center mb-space-xl">
              <p className="font-body-md text-body-md text-text-secondary leading-relaxed">
                A 6-digit cryptographic token was dispatched to <br />
                <span className="font-mono-code text-text-primary bg-surface-muted px-1.5 py-0.5 rounded border border-border-hairline inline-block mt-1">
                  +91 {state?.phone}
                </span>
              </p>
            </div>

            {/* Dev OTP Hint */}
            {state?.devOtp && (
              <div className="mb-space-xl flex items-center gap-space-sm p-space-sm px-space-md bg-amber-50/50 border border-amber-200/50 rounded-full animate-in slide-in-from-top-2">
                <span className="material-symbols-outlined text-amber-600 text-[16px]" aria-hidden="true">developer_mode</span>
                <span className="font-mono-code text-[11px] uppercase tracking-wider text-amber-800">
                  Dev Token: <span className="font-bold">{state.devOtp}</span>
                </span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} id="otp-form" className="w-full" noValidate>
              <fieldset className="mb-space-xl w-full">
                <legend className="sr-only">Enter 6-digit verification token</legend>
                <div className="flex gap-space-sm justify-center" onPaste={handlePaste}>
                  {digits.map((digit, i) => (
                    <input
                      key={i}
                      id={`otp-digit-${i}`}
                      ref={(el) => { inputRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleDigitChange(i, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(i, e)}
                      aria-label={`Digit ${i + 1} of 6`}
                      aria-required="true"
                      className={`w-12 h-14 sm:w-14 sm:h-16 text-center font-mono-code text-headline-sm bg-surface-muted/30 border rounded-lg transition-all duration-200 focus:outline-none focus:bg-surface-crisp ${
                        error
                          ? 'border-red-300 ring-2 ring-red-500/20 text-red-700'
                          : 'border-border-strong text-text-primary focus:border-ashoka-blue focus:ring-4 focus:ring-ashoka-blue/10'
                      }`}
                    />
                  ))}
                </div>
              </fieldset>

              {/* Inline Error */}
              {error && (
                <div
                  id="otp-error"
                  role="alert"
                  aria-live="assertive"
                  className="flex items-center justify-center gap-space-xs mb-space-lg text-red-600 animate-in slide-in-from-top-1"
                >
                  <span className="material-symbols-outlined text-[14px]" aria-hidden="true">error</span>
                  <span className="font-body-sm text-[12px]">{error}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                id="btn-verify"
                type="submit"
                disabled={loading || digits.join('').length < 6}
                aria-busy={loading}
                className="group relative w-full h-12 bg-[#1e2d3d] text-white rounded-lg font-label-lg text-label-lg flex items-center justify-center gap-space-sm hover:bg-[#172734] transition-all duration-300 shadow-md cursor-pointer pressable disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
              >
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:animate-[shimmer_1.5s_infinite]" />
                
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" />
                    <span>Verifying Token...</span>
                  </>
                ) : (
                  <>
                    <span>Authenticate</span>
                    <span className="material-symbols-outlined text-[18px] transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true">lock_open</span>
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="bg-surface-subtle/50 px-space-2xl py-space-md border-t border-border-hairline text-center">
            <button
              type="button"
              onClick={() => navigate('/login', { replace: true })}
              className="font-label-sm text-[11px] uppercase tracking-wider text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            >
              Cancel Authentication
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
