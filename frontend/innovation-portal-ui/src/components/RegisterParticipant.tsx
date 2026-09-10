import React, { useState } from 'react';
import { registerStudent } from '../services/portalService';
import { getSessionUser } from '../lib/auth';
import { getErrorMessage } from '../lib/api';

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
      onRegistered();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
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
    </div>
  );
};