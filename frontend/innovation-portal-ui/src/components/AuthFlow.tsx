import React, { useState } from 'react';
<<<<<<< HEAD
import { motion, AnimatePresence } from 'framer-motion';
=======
>>>>>>> d732201aa7e34898c938c4647556e99cdd33643d
import { login, registerUser, verifyOtp } from '../services/authService';
import { setSession } from '../lib/auth';
import { getErrorMessage } from '../lib/api';
import type { OtpResponse } from '../types';

interface AuthFlowProps {
  onSuccess: () => void;
}

<<<<<<< HEAD
const AshokaChakraWatermark: React.FC = () => (
  <svg
    viewBox="0 0 100 100"
    className="w-full h-full text-[#0A2540] pointer-events-none select-none opacity-[0.035]"
    fill="none"
    stroke="currentColor"
  >
    <circle cx="50" cy="50" r="47" strokeWidth="2" />
    <circle cx="50" cy="50" r="43" strokeWidth="0.8" />
    <circle cx="50" cy="50" r="14" strokeWidth="1.5" />
    <circle cx="50" cy="50" r="4.5" fill="currentColor" />
    {Array.from({ length: 24 }).map((_, i) => {
      const angle = (i * 15 * Math.PI) / 180;
      const x2 = 50 + 43 * Math.cos(angle);
      const y2 = 50 + 43 * Math.sin(angle);
      return (
        <line
          key={i}
          x1="50"
          y1="50"
          x2={x2}
          y2={y2}
          strokeWidth="1.2"
        />
      );
    })}
  </svg>
);

const pipelineSteps = [
  {
    step: '01',
    title: 'Citizen Grievance',
    subtitle: 'Grassroots civic issue intake',
    icon: 'campaign',
    badgeColor: 'bg-[#FF9933]/10 text-[#FF9933] border-[#FF9933]/20',
  },
  {
    step: '02',
    title: 'University Capstone',
    subtitle: 'NEP 2020 student R&D teams',
    icon: 'school',
    badgeColor: 'bg-[#0A2540]/10 text-[#0A2540] border-[#0A2540]/20',
  },
  {
    step: '03',
    title: 'Industry Review',
    subtitle: 'Nodal peer evaluation & score',
    icon: 'fact_check',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  {
    step: '04',
    title: 'CSR Funding',
    subtitle: 'Targeted civic deployment',
    icon: 'currency_rupee',
    badgeColor: 'bg-[#138808]/10 text-[#138808] border-[#138808]/20',
  },
];

=======
>>>>>>> d732201aa7e34898c938c4647556e99cdd33643d
export const AuthFlow: React.FC<AuthFlowProps> = ({ onSuccess }) => {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [challenge, setChallenge] = useState<OtpResponse | null>(null);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
<<<<<<< HEAD
  const [verifiedSuccess, setVerifiedSuccess] = useState(false);
=======
>>>>>>> d732201aa7e34898c938c4647556e99cdd33643d

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
<<<<<<< HEAD
      setVerifiedSuccess(true);
      // Soft theatrical stage reveal delay
      setTimeout(() => {
        onSuccess();
      }, 450);
    } catch (err) {
      setError(getErrorMessage(err));
=======
      onSuccess();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
>>>>>>> d732201aa7e34898c938c4647556e99cdd33643d
      setLoading(false);
    }
  };

  return (
<<<<<<< HEAD
    <div className="min-h-screen bg-[#F7F8FC] flex flex-col overflow-x-hidden relative">
      {/* Top tricolor accent strip with continuous shimmer sweep */}
      <div className="h-1 w-full tricolor-stripe-animated flex-shrink-0 z-30" />

      {/* Mini header */}
      <header className="bg-white/90 backdrop-blur-md border-b border-[#E5E7EB] px-6 sm:px-10 py-3.5 flex items-center justify-between shadow-xs z-30">
        <div className="flex items-center gap-3.5">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="w-10 h-10 rounded-xl bg-[#0A2540] flex items-center justify-center shadow-sm"
          >
            <span className="material-symbols-outlined text-white text-[22px]">account_balance</span>
          </motion.div>
          <div className="flex flex-col">
            <span className="font-headline font-bold text-[#0A2540] tracking-tight text-[15px] leading-none">
              National Innovation Portal
            </span>
            <span className="text-[10px] text-[#64748B] tracking-wider uppercase font-semibold mt-1">
              Government of India · Ministry of Education
            </span>
          </div>
        </div>

        {/* Institutional Trust Indicator */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F1F5F9] border border-[#E2E8F0] text-[11px] font-bold text-[#0A2540]">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Central Gateway Active</span>
          <span className="text-[#94A3B8]">·</span>
          <span className="text-[#64748B]">R&D Portal Node</span>
        </div>
      </header>

      {/* Main Container: Split Marketing + Auth */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-[calc(100vh-69px)] relative overflow-hidden">
        {/* Subtle ambient drifting tricolor orbs in background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            animate={{
              x: [0, 40, -25, 0],
              y: [0, -35, 25, 0],
              scale: [1, 1.12, 0.95, 1],
            }}
            transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-[#FF9933]/15 to-transparent blur-3xl"
          />
          <motion.div
            animate={{
              x: [0, -45, 30, 0],
              y: [0, 40, -25, 0],
              scale: [1, 1.15, 0.92, 1],
            }}
            transition={{ duration: 24, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -bottom-32 left-1/4 w-[500px] h-[500px] rounded-full bg-gradient-to-tl from-[#138808]/12 to-transparent blur-3xl"
          />
          <motion.div
            animate={{
              x: [0, 30, -30, 0],
              y: [0, 25, -30, 0],
            }}
            transition={{ duration: 28, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute top-1/3 right-10 w-[550px] h-[400px] rounded-full bg-[#0A2540]/5 blur-3xl"
          />
        </div>

        {/* ── LEFT COLUMN: Brand & Mission Panel (~58% width on desktop) ── */}
        <div className="lg:col-span-7 xl:col-span-7 flex flex-col justify-center px-6 sm:px-12 lg:px-16 py-10 lg:py-16 relative z-10 order-2 lg:order-1">
          {/* Faint Ashoka Chakra Watermark for Gravitas */}
          <div className="absolute right-0 bottom-0 w-[420px] h-[420px] translate-x-12 translate-y-12 pointer-events-none hidden lg:block">
            <AshokaChakraWatermark />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-2xl"
          >
            {/* Eyebrow badge */}
            <motion.div
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 backdrop-blur-sm border border-[#E2E8F0] text-[11px] font-bold text-[#0A2540] uppercase tracking-wider mb-5 shadow-2xs"
            >
              <span className="material-symbols-outlined text-[15px] text-[#FF9933]">verified</span>
              <span>National Civic Innovation Repository</span>
              <span className="text-[#CBD5E1]">·</span>
              <span className="text-[#138808]">NEP 2020 Framework</span>
            </motion.div>

            {/* Confident, authoritative headline */}
            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="font-headline text-[32px] sm:text-[42px] xl:text-[48px] font-bold text-[#0A2540] tracking-tight leading-[1.15] mb-4"
            >
              India's Unified <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-[#FF9933] via-[#0A2540] to-[#138808] bg-clip-text text-transparent">
                Civic Innovation
              </span> Pipeline
            </motion.h1>

            {/* Subheadline grounded in the real concept */}
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.45 }}
              className="text-[15px] sm:text-[16px] text-[#475569] leading-relaxed mb-8"
            >
              {step === 'otp'
                ? 'Almost there — verify your registered one-time passcode on the right to enter your command portal.'
                : 'Connecting grassroots citizen grievances with student engineering capstones under NEP 2020 — evaluated through multi-stage peer review and accelerated via CSR implementation grants.'}
            </motion.p>

            {/* 4-Step "How It Works" Visual Pipeline */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="flex flex-col gap-3 mb-10"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">
                  The End-to-End Innovation Pipeline
                </span>
                <span className="text-[11px] font-semibold text-[#138808]">
                  Transparent & Audited
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {pipelineSteps.map((p, idx) => (
                  <div
                    key={p.step}
                    className="bg-white/85 backdrop-blur-sm border border-[#E5E7EB] rounded-2xl p-3.5 flex flex-col justify-between shadow-2xs hover:border-[#0A2540]/30 hover:shadow-xs transition-all relative group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-[10px] font-bold text-[#94A3B8]">
                        {p.step}
                      </span>
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center border ${p.badgeColor}`}>
                        <span className="material-symbols-outlined text-[16px]">{p.icon}</span>
                      </div>
                    </div>
                    <div>
                      <div className="font-headline text-[13px] font-bold text-[#0A2540] leading-snug">
                        {p.title}
                      </div>
                      <div className="text-[11px] text-[#64748B] mt-0.5 leading-tight">
                        {p.subtitle}
                      </div>
                    </div>

                    {/* Step connector chevron indicator on non-last items */}
                    {idx < 3 && (
                      <div className="hidden sm:block absolute -right-2.5 top-1/2 -translate-y-1/2 z-10 text-[#CBD5E1]">
                        <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Institutional Trust Badges Row */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.45 }}
              className="pt-6 border-t border-[#E2E8F0]/70 flex flex-wrap items-center gap-y-3 gap-x-6 text-[12px] text-[#64748B] font-semibold"
            >
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[17px] text-[#0A2540]">account_balance</span>
                Government of India Initiative
              </span>
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[17px] text-[#FF9933]">menu_book</span>
                NEP 2020 Experiential Learning
              </span>
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[17px] text-[#138808]">verified_user</span>
                Audited Evaluation Architecture
              </span>
            </motion.div>
          </motion.div>
        </div>

        {/* ── RIGHT COLUMN: Auth Card (~42% width on desktop, top on mobile) ── */}
        <div className="lg:col-span-5 xl:col-span-5 flex items-center justify-center p-6 sm:p-10 relative z-20 order-1 lg:order-2">
          <motion.div
            animate={
              verifiedSuccess
                ? { scale: 0.94, opacity: 0, filter: 'blur(8px)', y: -20 }
                : { scale: 1, opacity: 1, filter: 'blur(0px)', y: 0 }
            }
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-md"
          >
            <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-xl border border-[#E5E7EB] overflow-hidden relative">
              {/* Card tricolor top accent (static non-flickering) */}
              <div className="h-1 tricolor-stripe" />

              <div className="p-7 sm:p-8">
                <AnimatePresence mode="wait">
                  {step === 'phone' ? (
                    <motion.form
                      key="phone-step"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.28, ease: 'easeOut' }}
                      onSubmit={handleRequestOtp}
                      className="flex flex-col gap-5"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F1F5F9] text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                            <span className="material-symbols-outlined text-[13px] text-[#0A2540]">verified_user</span>
                            Secure Authentication
                          </span>
                        </div>
                        <h1 className="font-headline text-[24px] font-bold text-[#0A2540] tracking-tight">
                          Sign in to your account
                        </h1>
                        <p className="text-[13px] text-[#64748B] mt-1.5 leading-relaxed">
                          Enter your registered mobile number to receive a secure one-time passcode.
                        </p>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                          Mobile Number
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[14px] text-[#94A3B8] font-bold">
                            +91
                          </span>
                          <input
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            inputMode="tel"
                            autoComplete="tel"
                            placeholder="98765 43210"
                            className="w-full pl-12 pr-4 py-3 bg-[#F7F8FC] border border-[#E5E7EB] rounded-xl text-[#1E293B] text-[15px] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0A2540]/20 focus:border-[#0A2540] transition-all font-semibold"
                            type="tel"
                          />
                        </div>
                      </div>

                      {error && (
                        <motion.div
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[12px] font-semibold flex items-center gap-2"
                        >
                          <span className="material-symbols-outlined text-[18px]">error</span>
                          <span>{error}</span>
                        </motion.div>
                      )}

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        disabled={loading}
                        className="btn-sheen w-full py-3.5 rounded-xl bg-[#0A2540] hover:bg-[#163B65] text-white font-bold text-[14px] transition-all shadow-md disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
                        type="submit"
                      >
                        {loading ? (
                          <>
                            <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                            <span>Requesting OTP…</span>
                          </>
                        ) : (
                          <>
                            <span>Send Passcode</span>
                            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                          </>
                        )}
                      </motion.button>
                    </motion.form>
                  ) : (
                    <motion.form
                      key="otp-step"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.28, ease: 'easeOut' }}
                      onSubmit={handleVerifyOtp}
                      className="flex flex-col gap-5"
                    >
                      <div>
                        <h1 className="font-headline text-[24px] font-bold text-[#0A2540] tracking-tight">
                          Enter Verification Code
                        </h1>
                        <p className="text-[13px] text-[#64748B] mt-1.5 leading-relaxed">
                          Passcode sent to <strong className="text-[#1E293B]">+91 {phone.replace(/\D/g, '')}</strong>
                        </p>
                        {challenge?.devOtp && (
                          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-[12px] text-emerald-800 font-mono">
                            <span className="material-symbols-outlined text-[15px] text-emerald-600">key</span>
                            Dev OTP: <strong>{challenge.devOtp}</strong>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                          One-Time Passcode
                        </label>
                        <input
                          value={otp}
                          onChange={(e) => setOtp(e.target.value)}
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          placeholder="••••••"
                          className="w-full px-4 py-3.5 bg-[#F7F8FC] border border-[#E5E7EB] rounded-xl text-[#1E293B] text-[20px] tracking-[0.35em] text-center focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0A2540]/20 focus:border-[#0A2540] transition-all font-mono font-bold"
                          type="text"
                        />
                      </div>

                      {error && (
                        <motion.div
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[12px] font-semibold flex items-center gap-2"
                        >
                          <span className="material-symbols-outlined text-[18px]">error</span>
                          <span>{error}</span>
                        </motion.div>
                      )}

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        disabled={loading || verifiedSuccess}
                        className="btn-sheen w-full py-3.5 rounded-xl bg-[#0A2540] hover:bg-[#163B65] text-white font-bold text-[14px] transition-all shadow-md disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
                        type="submit"
                      >
                        {loading ? (
                          <>
                            <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                            <span>Verifying Passcode…</span>
                          </>
                        ) : verifiedSuccess ? (
                          <>
                            <span className="material-symbols-outlined text-[18px] text-emerald-400">check_circle</span>
                            <span>Verified! Entering Portal…</span>
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-[18px]">verified</span>
                            <span>Verify & Enter Portal</span>
                          </>
                        )}
                      </motion.button>

                      <button
                        onClick={() => setStep('phone')}
                        className="text-[12px] text-[#64748B] hover:text-[#0A2540] font-bold flex items-center gap-1 justify-center transition-colors cursor-pointer"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[15px]">arrow_back</span>
                        Use a different number
                      </button>
                    </motion.form>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Footer */}
            <p className="text-center text-[11px] text-[#94A3B8] mt-6 leading-relaxed">
              © 2026 Government of India · Ministry of Education · All Rights Reserved
            </p>
          </motion.div>
        </div>
=======
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
>>>>>>> d732201aa7e34898c938c4647556e99cdd33643d
      </div>
    </div>
  );
};