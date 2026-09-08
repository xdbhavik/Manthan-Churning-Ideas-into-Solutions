import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { sendOtp, verifyOtp } from '../services/authService';
import { setTokens, isAuthenticated, isEvaluator, isAdmin } from '../lib/auth';
import { getErrorMessage } from '../lib/api';

type Stage = 'login' | 'otp' | 'loading';

export default function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [stage, setStage] = useState<Stage>('login');
  const [phone, setPhone] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [sessionMsg] = useState(params.get('reason') === 'session_expired' ? 'Your session has expired. Please log in again.' : '');
  const [countdown, setCountdown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated()) {
      if (isEvaluator()) navigate('/evaluator/dashboard', { replace: true });
      else if (isAdmin()) navigate('/evaluation/queue', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) { setError('Please enter a valid phone number'); return; }
    setError('');
    setStage('loading');
    try {
      const res = await sendOtp(phone.trim());
      setChallengeId(res.challengeId);
      setCountdown(120);
      setStage('otp');
      if (res.devOtp) {
        const digits = res.devOtp.slice(0, 6).split('');
        while (digits.length < 6) digits.push('');
        setOtp(digits);
      }
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (err) {
      const msg = getErrorMessage(err);
      setError(msg.includes('429') || msg.includes('Too Many') ? 'Too many OTP requests. Please wait a few minutes before trying again.' : msg);
      setStage('login');
    }
  };

  const handleOtpChange = (idx: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp];
    next[idx] = val.slice(-1);
    setOtp(next);
    if (val && idx < 5) inputRefs.current[idx + 1]?.focus();
  };

  const handleOtpKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) inputRefs.current[idx - 1]?.focus();
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length !== 6) { setError('Please enter all 6 OTP digits'); return; }
    setError('');
    setStage('loading');
    try {
      const res = await verifyOtp(challengeId, code);
      setTokens(res.accessToken, res.refreshToken);
      const role = res.user.role;
      if (role === 'EVALUATOR') navigate('/evaluator/dashboard', { replace: true });
      else if (role === 'ADMIN' || role === 'REVIEWER') navigate('/evaluation/queue', { replace: true });
      else {
        setError('This portal is for evaluators and administrators only. Your account role (' + role + ') does not have access.');
        setTokens('', '');
        setStage('login');
      }
    } catch (err) {
      setError(getErrorMessage(err));
      setStage('otp');
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9ff] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#0A2540] mb-3">
            <span className="material-symbols-outlined text-white text-[24px]">verified_user</span>
          </div>
          <h1 className="text-[22px] font-bold text-[#0A2540] tracking-tight">SIH26043 Evaluation Portal</h1>
          <p className="text-[13px] text-[#64748B] mt-1">Evaluator & Administrator Access</p>
        </div>

        {/* Session expired banner */}
        {sessionMsg && (
          <div className="mb-4 flex items-center gap-2 p-3 bg-[#FFFBEB] border border-[#FDE68A] rounded-lg text-[13px] text-[#92400E]">
            <span className="material-symbols-outlined text-[16px]">warning</span>
            {sessionMsg}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6">
          {stage === 'login' && (
            <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
              <div>
                <label className="block text-[13px] font-semibold text-[#0A2540] mb-1.5" htmlFor="phone-input">
                  Mobile Number
                </label>
                <input
                  id="phone-input"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 9999999999"
                  className="w-full border border-[#CBD5E1] rounded-lg px-3 py-2.5 text-[14px] text-[#0A2540] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#0A2540]/20 focus:border-[#0A2540]"
                  autoFocus
                />
              </div>
              {error && <p className="text-[13px] text-[#BE123C] bg-[#FFF1F2] border border-[#FECDD3] rounded-lg px-3 py-2">{error}</p>}
              <button
                type="submit"
                className="w-full py-2.5 bg-[#0A2540] text-white font-semibold rounded-lg hover:bg-[#1E3A8A] transition-colors text-[14px]"
              >
                Send OTP
              </button>
              <p className="text-[12px] text-[#64748B] text-center">
                OTP will be sent to your registered mobile number
              </p>
            </form>
          )}

          {stage === 'otp' && (
            <form onSubmit={handleVerify} className="flex flex-col gap-4">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[13px] text-[#64748B]">
                    Enter the 6-digit OTP sent to <strong className="text-[#0A2540]">{phone}</strong>
                  </p>
                </div>
                <div className="flex gap-2 justify-center">
                  {otp.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => { inputRefs.current[idx] = el; }}
                      id={'otp-input-' + idx}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className="w-11 h-12 text-center text-[18px] font-bold border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2540]/20 focus:border-[#0A2540] text-[#0A2540]"
                    />
                  ))}
                </div>
              </div>
              {error && <p className="text-[13px] text-[#BE123C] bg-[#FFF1F2] border border-[#FECDD3] rounded-lg px-3 py-2">{error}</p>}
              <button
                type="submit"
                className="w-full py-2.5 bg-[#0A2540] text-white font-semibold rounded-lg hover:bg-[#1E3A8A] transition-colors text-[14px]"
              >
                Verify OTP
              </button>
              <div className="flex items-center justify-between text-[12px] text-[#64748B]">
                <button type="button" onClick={() => setStage('login')} className="underline hover:text-[#0A2540]">
                  Change number
                </button>
                {countdown > 0 ? (
                  <span>Resend in {countdown}s</span>
                ) : (
                  <button type="button" onClick={handleSendOtp} className="underline hover:text-[#0A2540]">
                    Resend OTP
                  </button>
                )}
              </div>
            </form>
          )}

          {stage === 'loading' && (
            <div className="flex flex-col items-center py-8 gap-3">
              <svg className="animate-spin w-8 h-8 text-[#0A2540]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-[13px] text-[#64748B]">Processing…</p>
            </div>
          )}
        </div>

        <p className="text-center text-[11px] text-[#94A3B8] mt-4">
          SIH26043 — Smart India Hackathon 2026 · Statutory Evaluation Service
        </p>
      </div>
    </div>
  );
}
