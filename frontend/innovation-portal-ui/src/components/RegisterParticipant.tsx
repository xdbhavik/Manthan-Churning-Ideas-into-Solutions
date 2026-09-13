import React, { useState } from 'react';
import { registerStudent } from '../services/portalService';
import { getSessionUser } from '../lib/auth';
import { getErrorMessage } from '../lib/api';
<<<<<<< HEAD
import { triggerTricolorConfetti } from '../lib/confetti';
=======
>>>>>>> d732201aa7e34898c938c4647556e99cdd33643d

interface RegisterParticipantProps {
  onRegistered: () => void;
  onLogout: () => void;
}

export const RegisterParticipant: React.FC<RegisterParticipantProps> = ({
  onRegistered,
  onLogout,
}) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const session = getSessionUser();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError('Please provide your full name.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await registerStudent({ fullName: fullName.trim(), email: email.trim() || undefined });
<<<<<<< HEAD
      triggerTricolorConfetti('Student Profile Onboarding Completed');
=======
>>>>>>> d732201aa7e34898c938c4647556e99cdd33643d
      onRegistered();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
<<<<<<< HEAD
    <div className="min-h-screen bg-[#F7F8FC] flex flex-col">
      {/* Tricolor strip */}
      <div className="h-1 tricolor-stripe-animated" />

      {/* Mini header */}
      <div className="bg-white border-b border-[#E5E7EB] px-6 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#0A2540] flex items-center justify-center">
          <span className="material-symbols-outlined text-white text-[18px]">account_balance</span>
        </div>
        <div className="flex flex-col">
          <span className="font-headline text-[13px] font-bold text-[#0A2540] leading-none">National Innovation Portal</span>
          <span className="text-[9px] text-[#94A3B8] tracking-wider uppercase">Government of India · Ministry of Education</span>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md animate-scaleIn">
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[3px] tricolor-stripe" />
            <div className="mb-5">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-[11px] font-bold text-amber-700">
                <span className="material-symbols-outlined text-[15px]">person_add</span>
                STUDENT ONBOARDING
              </div>
              <h1 className="font-headline text-[20px] font-bold text-[#0A2540] mt-2">
                Complete your portal profile
              </h1>
              <p className="text-[13px] text-[#64748B] mt-1 leading-relaxed">
                Your account is authenticated but not yet registered as a student participant. Provide your
                details to start solving published problems.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">
                  Full Name *
                </label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                  className="w-full px-3 py-2.5 bg-[#F7F8FC] border border-[#E5E7EB] rounded-xl text-[#0A2540] text-[14px] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0A2540]/20 focus:border-[#0A2540] transition-all"
                  type="text"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">
                  Email (optional)
                </label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@university.ac.in"
                  className="w-full px-3 py-2.5 bg-[#F7F8FC] border border-[#E5E7EB] rounded-xl text-[#0A2540] text-[14px] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0A2540]/20 focus:border-[#0A2540] transition-all"
                  type="email"
                />
              </div>

              {session && (
                <div className="p-3 rounded-xl bg-[#F7F8FC] border border-[#E5E7EB] text-[12px] text-[#64748B] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-[#0A2540]">smartphone</span>
                  Signed in as +91 {session.phone}
                </div>
              )}

              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[12px]">
                  {error}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={onLogout}
                  className="px-4 py-2.5 rounded-xl bg-[#F1F5F9] hover:bg-[#E5E7EB] text-[#475569] font-semibold text-[13px] transition-colors"
                  type="button"
                >
                  Sign Out
                </button>
                <button
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl bg-[#0A2540] hover:bg-[#163B65] text-white font-semibold text-[14px] transition-colors shadow-sm disabled:opacity-60 flex items-center justify-center gap-2"
                  type="submit"
                >
                  {loading ? 'Registering…' : 'Register as Participant'}
                  {!loading && <span className="material-symbols-outlined text-[16px]">arrow_forward</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-4 text-[11px] text-[#94A3B8]">
        © 2026 Government of India · Ministry of Education · All Rights Reserved
      </div>
=======
    <div className="min-h-screen bg-[#f8f9ff] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xs border border-[#e2e8f0] p-6">
          <div className="mb-5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#ffdfa0]/60 border border-[#ffdfa0] text-[11px] font-bold text-[#795900]">
              <span className="material-symbols-outlined text-[15px]">person_add</span>
              STUDENT ONBOARDING
            </div>
            <h1 className="font-headline text-[20px] font-bold text-[#0b1c30] mt-2">
              Complete your portal profile
            </h1>
            <p className="text-[13px] text-[#43474e] mt-1 leading-relaxed">
              Your account is authenticated but not yet registered as a student participant. Provide your
              details to start solving published problems. (University / HEI accounts auto-bind and skip this
              step.)
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-[#74777f] uppercase tracking-wider">
                Full Name *
              </label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Priya Sharma"
                className="w-full px-3 py-2.5 bg-[#eff4ff] border border-[#dce9ff] rounded-lg text-[#0b1c30] text-[14px] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0f2a4a]"
                type="text"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-[#74777f] uppercase tracking-wider">
                Email (optional)
              </label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@university.ac.in"
                className="w-full px-3 py-2.5 bg-[#eff4ff] border border-[#dce9ff] rounded-lg text-[#0b1c30] text-[14px] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0f2a4a]"
                type="email"
              />
            </div>

            {session && (
              <div className="p-2.5 rounded-lg bg-[#f8f9ff] border border-[#e2e8f0] text-[12px] text-[#43474e] flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-[#00152f]">smartphone</span>
                Signed in as +91 {session.phone}
              </div>
            )}

            {error && (
              <div className="p-3 rounded-lg bg-[#ffdad6] border border-[#ffb4ab] text-[#93000a] text-[12px]">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={onLogout}
                className="px-4 py-2.5 rounded-lg bg-[#eff4ff] hover:bg-[#dce9ff] text-[#0b1c30] font-semibold text-[13px] transition-colors border border-[#dce9ff]"
                type="button"
              >
                Sign Out
              </button>
              <button
                disabled={loading}
                className="flex-1 py-2.5 rounded-lg bg-[#0f2a4a] hover:bg-[#00152f] text-white font-semibold text-[14px] transition-colors shadow-xs disabled:opacity-60"
                type="submit"
              >
                {loading ? 'Registering…' : 'Register as Participant'}
              </button>
            </div>
          </form>
        </div>
      </div>
>>>>>>> d732201aa7e34898c938c4647556e99cdd33643d
    </div>
  );
};