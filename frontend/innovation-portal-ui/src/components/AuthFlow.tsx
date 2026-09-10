import React, { useState } from 'react';
import { login, registerUser, verifyOtp } from '../services/authService';
import { setSession } from '../lib/auth';
import { getErrorMessage } from '../lib/api';
import type { OtpResponse } from '../types';

interface AuthFlowProps {
  onSuccess: () => void;
}

export const AuthFlow: React.FC<AuthFlowProps> = ({ onSuccess }) => {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [challenge, setChallenge] = useState<OtpResponse | null>(null);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = phone.replace(/\D/g, '');
    if (trimmed.length < 10) {
      setError('Enter a valid 10-digit phone number.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      let resp: OtpResponse;
      try {
        resp = await login(trimmed);
      } catch (err: any) {
        if (err?.response?.status === 404) {
          resp = await registerUser(trimmed);
        } else {
          throw err;
        }
      }
      setChallenge(resp);
      setStep('otp');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challenge) return;
    setLoading(true);
    setError(null);
    try {
      const { accessToken, refreshToken, user } = await verifyOtp(challenge.challengeId, otp.trim());
      setSession(accessToken, refreshToken, user);
      onSuccess();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9ff] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-6 justify-center">
          <div className="w-11 h-11 rounded-lg bg-[#0f2a4a] flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-[26px]">account_balance</span>
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-[#0b1c30] tracking-tight text-[16px]">
              SIH Innovation Portal
            </span>
            <span className="font-mono text-[11px] text-[#795900] font-bold tracking-wide">SIH26043</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xs border border-[#e2e8f0] p-6">
          {step === 'phone' ? (
            <form onSubmit={handleRequestOtp} className="flex flex-col gap-4">
              <div>
                <h1 className="font-headline text-[20px] font-bold text-[#0b1c30]">Sign in with OTP</h1>
                <p className="text-[13px] text-[#43474e] mt-1">
                  Use your registered mobile number. A one-time passcode will be sent (dev mode returns it
                  instantly).
                </p>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-[#74777f] uppercase tracking-wider">
                  Mobile Number
                </label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2.5 bg-[#eff4ff] border border-[#dce9ff] rounded-lg text-[#0b1c30] text-[14px] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0f2a4a]"
                  type="tel"
                />
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-[#ffdad6] border border-[#ffb4ab] text-[#93000a] text-[12px]">
                  {error}
                </div>
              )}

              <button
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-[#0f2a4a] hover:bg-[#00152f] text-white font-semibold text-[14px] transition-colors shadow-xs disabled:opacity-60"
                type="submit"
              >
                {loading ? 'Requesting OTP…' : 'Send OTP'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
              <div>
                <h1 className="font-headline text-[20px] font-bold text-[#0b1c30]">Enter the OTP</h1>
                <p className="text-[13px] text-[#43474e] mt-1">
                  Passcode sent to <strong className="text-[#0b1c30]">+91 {phone.replace(/\D/g, '')}</strong>.
                </p>
                {challenge?.devOtp && (
                  <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#eff4ff] border border-[#dce9ff] text-[12px] text-[#00152f] font-mono">
                    Dev OTP: <strong>{challenge.devOtp}</strong>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-[#74777f] uppercase tracking-wider">
                  One-Time Passcode
                </label>
                <input
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="••••••"
                  className="w-full px-3 py-2.5 bg-[#eff4ff] border border-[#dce9ff] rounded-lg text-[#0b1c30] text-[16px] tracking-[0.3em] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0f2a4a]"
                  type="text"
                />
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-[#ffdad6] border border-[#ffb4ab] text-[#93000a] text-[12px]">
                  {error}
                </div>
              )}

              <button
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-[#0f2a4a] hover:bg-[#00152f] text-white font-semibold text-[14px] transition-colors shadow-xs disabled:opacity-60"
                type="submit"
              >
                {loading ? 'Verifying…' : 'Verify & Sign In'}
              </button>

              <button
                onClick={() => setStep('phone')}
                className="text-[12px] text-[#74777f] hover:text-[#0b1c30] font-semibold"
                type="button"
              >
                ← Use a different number
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-[11px] text-[#74777f] mt-4">
          Authentication is handled by the SIH26043 source-service. Your session is JWT-issued via the
          shared gateway.
        </p>
      </div>
    </div>
  );
};