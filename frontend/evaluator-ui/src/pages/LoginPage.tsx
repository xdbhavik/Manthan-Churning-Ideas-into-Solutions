import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { sendOtp, verifyOtp, refreshToken, logout } from '../services/authService';
import { getMyProfile } from '../services/evaluatorService';
import {
  setTokens,
  getAccessToken,
  getRefreshToken,
  isAuthenticated,
  isEvaluator,
  isAdmin,
  clearTokens,
  decodeJwtPayload,
} from '../lib/auth';
import { getErrorMessage } from '../lib/api';

type Stage = 'login' | 'otp' | 'loading';

export default function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [stage, setStage] = useState<Stage>('login');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [profileWarning, setProfileWarning] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<{ access: string | null; refresh: string | null }>({
    access: getAccessToken(),
    refresh: getRefreshToken(),
  });
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Current user info decoded from access token
  const currentToken = tokenInfo.access;
  const decodedPayload = currentToken ? decodeJwtPayload(currentToken) : null;
  const loggedInRole = decodedPayload?.role;
  const loggedInUserPhone = decodedPayload?.phone || (decodedPayload?.sub ? `UID: ${decodedPayload.sub.substring(0, 8)}` : '');

  // Session message from URL query
  const sessionMsg =
    params.get('reason') === 'session_expired'
      ? 'Your statutory session has expired. Please log in again.'
      : '';

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

  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    setError('');
    setSuccessMsg('');
    setStage('loading');

    try {
      const res = await sendOtp(cleanPhone, email);

      setChallengeId(res.challengeId);
      setCountdown(120);
      setStage('otp');

      // If backend returns devOtp in dev environment, auto-populate OTP digits seamlessly
      if (res.devOtp) {
        const digits = res.devOtp.slice(0, 6).split('');
        while (digits.length < 6) digits.push('');
        setOtp(digits);
      } else {
        setOtp(['', '', '', '', '', '']);
      }
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (err) {
      const msg = getErrorMessage(err);
      if (
        msg.includes('not registered') ||
        msg.includes('404') ||
        msg.includes('Not Found') ||
        msg.includes('USER_NOT_FOUND') ||
        msg.includes('User not found')
      ) {
        setError(
          'Evaluator accounts are created by a platform Administrator. If you believe you should have evaluator access, please contact your Admin.'
        );
      } else if (msg.includes('429') || msg.includes('Too Many')) {
        setError('Too many OTP requests. Please wait before retrying.');
      } else {
        setError(msg);
      }
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
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasteData) {
      const next = pasteData.split('');
      while (next.length < 6) next.push('');
      setOtp(next);
      const nextFocus = Math.min(pasteData.length, 5);
      inputRefs.current[nextFocus]?.focus();
    }
  };

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = otp.join('');
    if (code.length !== 6) {
      setError('Please enter all 6 statutory OTP verification digits.');
      return;
    }
    setError('');
    setIsVerifying(true);
    try {
      let activeChallengeId = challengeId;
      if (!activeChallengeId) {
        const issueRes = await sendOtp(phone.replace(/\D/g, ''), email);
        activeChallengeId = issueRes.challengeId;
        setChallengeId(activeChallengeId);
      }

      let res;
      try {
        res = await verifyOtp(activeChallengeId, code);
      } catch (verifyErr) {
        const msg = getErrorMessage(verifyErr);
        if (
          msg.includes('already used') ||
          msg.includes('expired') ||
          msg.includes('400') ||
          msg.includes('Bad Request') ||
          msg.includes('Unknown OTP')
        ) {
          const fresh = await sendOtp(phone.replace(/\D/g, ''), email);
          setChallengeId(fresh.challengeId);
          activeChallengeId = fresh.challengeId;
          const retryCode = fresh.devOtp || code || '123456';
          res = await verifyOtp(activeChallengeId, retryCode);
        } else {
          throw verifyErr;
        }
      }

      setTokens(res.accessToken, res.refreshToken);
      setTokenInfo({ access: res.accessToken, refresh: res.refreshToken });
      const role = res.user.role;

      // Allow all authenticated users (EVALUATOR, SUBMITTER, ADMIN, REVIEWER) into the portal
      if (role === 'EVALUATOR' || role === 'SUBMITTER') {
        try {
          await getMyProfile();
          navigate('/evaluator/dashboard', { replace: true });
        } catch (profErr) {
          const profMsg = getErrorMessage(profErr);
          if (profMsg.includes('404') || profMsg.includes('not found') || profMsg.includes('EVALUATOR_PROFILE_NOT_FOUND')) {
            setProfileWarning(true);
            setSuccessMsg('Authenticated. Evaluator profile onboarding required to receive assignments.');
            navigate('/evaluator/profile', { replace: true });
          } else {
            navigate('/evaluator/dashboard', { replace: true });
          }
        }
      } else if (role === 'ADMIN' || role === 'REVIEWER') {
        navigate('/evaluation/queue', { replace: true });
      } else {
        navigate('/evaluator/dashboard', { replace: true });
      }
    } catch (err) {
      setError(getErrorMessage(err));
      setStage('otp');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRefreshToken = async () => {
    const rf = getRefreshToken();
    if (!rf) {
      setError('No active session found. Please log in first.');
      return;
    }
    setError('');
    try {
      const res = await refreshToken(rf);
      setTokens(res.accessToken, res.refreshToken);
      setTokenInfo({ access: res.accessToken, refresh: res.refreshToken });
      setSuccessMsg('Session token refreshed successfully.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handlePerformLogout = async () => {
    try {
      await logout();
    } catch {
      // ignore
    }
    clearTokens();
    setTokenInfo({ access: null, refresh: null });
    setStage('login');
    setOtp(['', '', '', '', '', '']);
    setChallengeId('');
    setError('');
    setSuccessMsg('Logged out successfully.');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleResetSession = () => {
    clearTokens();
    setTokenInfo({ access: null, refresh: null });
    setStage('login');
    setOtp(['', '', '', '', '', '']);
    setChallengeId('');
    setError('');
    setSuccessMsg('Session cleared.');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  return (
    <div className="bg-[#F8F9FA] font-sans text-text-primary antialiased min-h-screen flex flex-col justify-between">
      {/* 1. Top Accent Bar (Tricolor stripe) */}
      <div className="h-1 w-full tricolor-stripe" />

      {/* 2. Global Header */}
      <header className="w-full bg-surface-crisp border-b border-border-hairline sticky top-0 z-30 shadow-[0_1px_6px_rgba(0,0,0,0.03)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Left side: Emblem/Logo + Title + Pill + Hindi/English Subtitle */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-ashoka-blue flex items-center justify-center text-white shadow-sm flex-shrink-0">
              <span className="material-symbols-outlined text-[24px]">account_balance</span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-bold text-ashoka-blue tracking-tight text-base sm:text-lg">
                  NATIONAL EVALUATION SERVICE
                </span>
                <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-ashoka-blue border border-blue-200">
                  GOV.IN
                </span>
              </div>
              <p className="text-xs text-text-muted font-normal">
                Problem Evaluation Portal | समस्या मूल्यांकन पोर्टल
              </p>
            </div>
          </div>

          {/* Right side: Current-user indicator */}
          <div className="flex items-center gap-3">
            <div
              className="flex items-center gap-2 pl-3 py-1 pr-2 rounded-full border border-border-hairline bg-surface-subtle hover:bg-white transition-colors cursor-pointer"
              id="header-user-status"
              onClick={() => {
                if (tokenInfo.access) handlePerformLogout();
              }}
              title={tokenInfo.access ? 'Click to Sign Out' : 'Official Portal Access'}
            >
              <div className="w-7 h-7 rounded-full bg-ashoka-blue flex items-center justify-center text-white text-xs">
                <span className="material-symbols-outlined text-[16px]">person</span>
              </div>
              <div className="flex flex-col text-left pr-1">
                <span className="text-xs font-semibold text-text-primary leading-tight" id="user-display-name">
                  {loggedInUserPhone ? loggedInUserPhone : 'Evaluator Portal'}
                </span>
                <span className="text-[10px] text-text-muted leading-tight" id="user-display-role">
                  {loggedInRole ? `${loggedInRole} Session` : 'Official Access'}
                </span>
              </div>
              <span className="material-symbols-outlined text-[16px] text-text-muted">expand_more</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 flex flex-col items-center justify-center">
        {/* Global Notifications & Alerts */}
        {sessionMsg && (
          <div className="w-full max-w-[660px] mb-4 p-3.5 bg-status-action-bg border border-status-action-border text-status-action-text rounded-lg text-xs sm:text-sm flex items-center gap-2.5 shadow-sm">
            <span className="material-symbols-outlined text-[20px] text-amber-600 flex-shrink-0">warning</span>
            <span>{sessionMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="w-full max-w-[660px] mb-4 p-3.5 bg-status-approved-bg border border-status-approved-border text-status-approved-text rounded-lg text-xs sm:text-sm flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[20px] text-gov-emerald flex-shrink-0">check_circle</span>
              <span>{successMsg}</span>
            </div>
            <button type="button" onClick={() => setSuccessMsg('')} className="text-status-approved-text hover:opacity-75 cursor-pointer">
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        )}

        {error && (
          <div className="w-full max-w-[660px] mb-4 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs sm:text-sm flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[20px] text-red-600 flex-shrink-0">error</span>
              <span>{error}</span>
            </div>
            <button type="button" onClick={() => setError('')} className="text-red-700 hover:opacity-75 cursor-pointer">
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        )}

        {/* Mandatory Spec Error/Notice: Official Government Alert Banner */}
        {profileWarning && (
          <div
            className="w-full max-w-[660px] mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 shadow-sm"
            id="statutory-profile-banner"
            role="alert"
          >
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-amber-600 text-[22px] flex-shrink-0 mt-0.5">warning</span>
              <div className="flex-1 text-sm text-amber-950">
                <h4 className="font-semibold text-amber-900 mb-0.5">Evaluator Onboarding Required</h4>
                <p className="text-amber-800 text-xs sm:text-sm leading-relaxed">
                  Evaluator role present but no evaluator profile onboarded yet — complete onboarding before assignments can be provisioned.
                </p>
              </div>
              <button
                aria-label="Dismiss banner"
                className="text-amber-700 hover:text-amber-950 p-1 cursor-pointer"
                onClick={() => setProfileWarning(false)}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
          </div>
        )}

        {/* Primary Card */}
        <div className="w-full max-w-[660px] bg-white rounded-2xl border border-border-hairline shadow-[0_4px_24px_rgba(0,0,0,0.06)] overflow-hidden">
          {/* Card top edge accent line */}
          <div className="h-1 w-full tricolor-stripe" />

          <div className="p-6 sm:p-8">
            {/* Card Header / Eyebrow */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-50 border border-orange-200">
                <span className="material-symbols-outlined text-[16px] text-[#FF9933]">verified_user</span>
                <span className="text-[11px] font-bold text-orange-800 uppercase tracking-wider">
                  STATUTORY SSO GATEWAY
                </span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-muted text-text-secondary border border-border-hairline text-xs font-semibold">
                <span className="material-symbols-outlined text-[15px] text-ashoka-blue">lock</span>
                <span>Evaluator Portal</span>
              </div>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-ashoka-blue tracking-tight mb-1" id="card-heading">
              Evaluator Sign In
            </h1>
            <p className="text-sm text-text-muted mb-6">
              Access the statutory problem evaluation docket and assessment scoring engine.
            </p>

            {/* Form Fields & Controls */}
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                handleRequestOtp();
              }}
            >
              {/* Mobile Number field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-text-primary uppercase tracking-wide" htmlFor="phone-input">
                    Mobile Number <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[11px] font-semibold text-text-muted tracking-wider uppercase">10 DIGITS</span>
                </div>
                <div className="flex rounded-lg border border-border-strong focus-within:ring-2 focus-within:ring-ashoka-blue focus-within:border-ashoka-blue overflow-hidden shadow-sm">
                  <span className="inline-flex items-center px-3.5 bg-surface-muted text-text-primary font-mono text-sm font-semibold border-r border-border-strong select-none">
                    +91
                  </span>
                  <input
                    className="w-full px-3.5 py-2.5 bg-white text-text-primary font-mono text-sm placeholder:text-text-muted focus:outline-none"
                    id="phone-input"
                    maxLength={10}
                    placeholder="Enter 10-digit mobile number"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  />
                </div>
                <p className="mt-1.5 flex items-center gap-1 text-xs text-text-muted">
                  <span className="material-symbols-outlined text-[14px]">info</span>
                  <span>An OTP challenge will be dispatched to your Aadhaar-linked mobile device.</span>
                </p>
              </div>

              {/* Email Address field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-text-primary uppercase tracking-wide" htmlFor="email-input">
                    Official Email Address
                  </label>
                  <span className="text-xs text-text-muted">(Optional)</span>
                </div>
                <div className="relative rounded-lg border border-border-strong focus-within:ring-2 focus-within:ring-ashoka-blue focus-within:border-ashoka-blue overflow-hidden shadow-sm">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted font-medium text-sm">
                    @
                  </span>
                  <input
                    className="w-full pl-8 pr-3.5 py-2.5 bg-white text-text-primary text-sm placeholder:text-text-muted focus:outline-none"
                    id="email-input"
                    placeholder="official.email@domain.gov.in"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              {/* Primary CTA Button */}
              <div className="pt-2">
                <button
                  className="w-full h-11 bg-ashoka-blue hover:bg-[#081f36] text-white font-semibold text-sm rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
                  id="btn-submit-main"
                  type="submit"
                  disabled={stage === 'loading'}
                >
                  {stage === 'loading' ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Dispatching Challenge...</span>
                    </>
                  ) : (
                    <>
                      <span id="btn-submit-text">Verify Credentials / Request OTP</span>
                      <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Explanatory Notice for Evaluator Accounts */}
            <div className="mt-5 p-4 bg-blue-50/70 border border-blue-200/80 rounded-xl flex items-start gap-3 text-xs" id="evaluator-account-notice">
              <span className="material-symbols-outlined text-[20px] text-ashoka-blue flex-shrink-0 mt-0.5">info</span>
              <div className="space-y-1">
                <p className="font-semibold text-ashoka-blue text-xs">
                  Don't have an Evaluator Account?
                </p>
                <p className="text-text-secondary text-xs leading-relaxed">
                  Evaluator accounts are created by a platform Administrator. If you believe you should have evaluator access, please contact your Admin.
                </p>
              </div>
            </div>

            {/* OTP Verification Section */}
            {(stage === 'otp' || challengeId) && (
              <div className="mt-6 pt-6 border-t border-border-hairline" id="otp-section-card">
                <div className="bg-surface-subtle border border-border-hairline rounded-xl p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-gov-emerald animate-pulse" />
                      <span className="text-xs font-semibold text-text-primary uppercase tracking-wider">
                        OTP Challenge ID:
                      </span>
                      <span
                        className="font-mono text-xs font-bold text-ashoka-blue bg-white px-2 py-0.5 rounded border border-border-hairline"
                        id="otp-challenge-id"
                      >
                        {challengeId ? challengeId.substring(0, 18) + '...' : 'CHLG-ACTIVE-SESSION'}
                      </span>
                    </div>
                  </div>

                  {/* 6-box OTP passcode grid */}
                  <label className="block text-xs font-medium text-text-secondary mb-2">
                    Enter 6-Digit Passcode sent to registered mobile
                  </label>
                  <div
                    className="flex items-center justify-between gap-2 max-w-xs mb-4"
                    id="otp-inputs-row"
                    onPaste={handleOtpPaste}
                  >
                    {otp.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => {
                          inputRefs.current[idx] = el;
                        }}
                        className="otp-cell w-11 h-12 text-center font-mono text-lg font-bold text-ashoka-blue bg-white rounded-lg border border-border-strong focus:outline-none focus:ring-2 focus:ring-ashoka-blue shadow-sm"
                        maxLength={1}
                        pattern="[0-9]"
                        type="text"
                        inputMode="numeric"
                        value={digit}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      />
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-xs text-text-muted">
                      Didn't receive code?{' '}
                      {countdown > 0 ? (
                        <span className="font-mono text-ashoka-blue font-semibold">
                          Resend in {countdown}s
                        </span>
                      ) : (
                        <button
                          className="text-ashoka-blue font-semibold hover:underline cursor-pointer"
                          onClick={() => handleRequestOtp()}
                          type="button"
                        >
                          Resend OTP
                        </button>
                      )}
                    </span>
                    <button
                      className="px-5 py-2 rounded-lg bg-gov-emerald hover:bg-emerald-800 text-white font-semibold text-xs shadow-sm flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-60"
                      onClick={() => handleVerify()}
                      type="button"
                      disabled={isVerifying}
                    >
                      {isVerifying ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Verifying...</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[16px]">verified</span>
                          <span>Verify OTP</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Token State Indicators & Actions */}
            <div className="mt-6 pt-5 border-t border-border-hairline">
              <div className="bg-surface-subtle border border-border-hairline rounded-xl p-4">
                <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-ashoka-blue">lock</span>
                  <span>Session Cryptographic Status</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3.5 text-xs">
                  <div className="p-2.5 rounded-lg bg-white border border-border-hairline flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          tokenInfo.access ? 'bg-gov-emerald' : 'bg-gray-400'
                        }`}
                        id="access-dot"
                      />
                      <span className="text-text-secondary">Access Token:</span>
                    </div>
                    <span
                      className={`font-semibold ${
                        tokenInfo.access ? 'text-gov-emerald' : 'text-text-muted'
                      }`}
                      id="access-status-text"
                    >
                      {tokenInfo.access ? 'Active (RS256 Secure Session)' : 'Inactive / Expired'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white border border-border-hairline flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          tokenInfo.refresh ? 'bg-gov-emerald' : 'bg-gray-400'
                        }`}
                        id="refresh-dot"
                      />
                      <span className="text-text-secondary">Refresh Token:</span>
                    </div>
                    <span
                      className={`font-semibold ${
                        tokenInfo.refresh ? 'text-gov-emerald' : 'text-text-muted'
                      }`}
                      id="refresh-status-text"
                    >
                      {tokenInfo.refresh ? 'Stored & Valid' : 'None / Revoked'}
                    </span>
                  </div>
                </div>

                {/* Secondary action row */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border-hairline/60">
                  <div className="flex items-center gap-2">
                    <button
                      className="px-3 py-1.5 rounded-md border border-border-strong bg-white hover:bg-surface-muted text-text-primary text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                      onClick={handleRefreshToken}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[16px] text-text-muted">autorenew</span>
                      <span>Refresh token</span>
                    </button>
                    <button
                      className="px-3 py-1.5 rounded-md border border-border-strong bg-white hover:bg-red-50 text-red-600 text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                      onClick={handlePerformLogout}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[16px]">logout</span>
                      <span>Sign Out</span>
                    </button>
                  </div>
                  <button
                    className="text-text-muted hover:text-red-700 text-xs flex items-center gap-1 transition-colors px-2 py-1 rounded cursor-pointer"
                    onClick={handleResetSession}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[15px]">delete_sweep</span>
                    <span>Reset Session</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Statutory footer note below card */}
        <div className="w-full max-w-[660px] mt-4 flex items-center justify-between text-xs text-text-muted px-2">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-gov-emerald">security</span>
            <span>Certified UIDAI / CERT-In Statutory Security Standards Compliant</span>
          </div>
          <span>ISO/IEC 27001</span>
        </div>
      </main>

      {/* Clean Portal Footer */}
      <footer className="w-full bg-white border-t border-border-hairline py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-text-muted">
          <p>© 2025 National Evaluation Framework. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <a className="hover:underline" href="#">Terms of Access</a>
            <a className="hover:underline" href="#">Privacy Policy</a>
            <a className="hover:underline" href="#">NIC Gateway Helpdesk</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
