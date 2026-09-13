import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Participant } from '../types';
import { SessionUser } from '../lib/auth';

interface ProfileViewProps {
  displayName: string;
  roleLabel: string;
  avatarText: string;
  participant: Participant | null;
  session: SessionUser | null;
  onLogout: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  displayName,
  roleLabel,
  avatarText,
  participant,
  session,
  onLogout,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(key);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const participantId = participant?.participantId || session?.userId || '—';
  const participantType = participant?.participantType || session?.role || 'STUDENT';
  const email = participant?.email || session?.email || '—';
  const phone = session?.phone || participant?.phone || '—';
  const institution = participant?.institutionName || 'Central Innovation Repository';
  const userId = session?.userId || '—';

  return (
    <div className="flex flex-col w-full pb-16 page-enter">
      {/* ── Page Title Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-headline text-[26px] font-bold text-[#0A2540] tracking-tight">
            My Profile & Credentials
          </h1>
          <p className="text-[14px] text-[#64748B] mt-1 leading-relaxed">
            Verified participant identity and access credentials on the National Innovation Portal.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-bold text-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Active Session
          </span>
        </div>
      </div>

      {/* ── Profile Hero Summary Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="hero-gradient rounded-3xl p-7 sm:p-9 mb-8 relative overflow-hidden shadow-lg border border-[#0A2540]/20"
      >
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Avatar with institutional ring */}
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-md text-white flex items-center justify-center font-headline font-bold text-[28px] border-2 border-white/30 shadow-md">
                {avatarText}
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#138808] border-2 border-[#0A2540] flex items-center justify-center text-white shadow-xs">
                <span className="material-symbols-outlined text-[14px]">verified</span>
              </div>
            </div>

            {/* Identity details */}
            <div className="flex flex-col">
              <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                <h2 className="font-headline text-[24px] sm:text-[28px] font-bold text-white tracking-tight leading-none">
                  {displayName}
                </h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/15 backdrop-blur-sm text-white/90 text-[11px] font-bold border border-white/20">
                  <span className="material-symbols-outlined text-[13px] text-emerald-300">verified_user</span>
                  {roleLabel}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-[13px] text-white/75">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px] text-[#FFAE5C]">smartphone</span>
                  +91 {phone}
                </span>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px] text-[#34D399]">school</span>
                  {institution}
                </span>
              </div>
            </div>
          </div>

          <div className="shrink-0 flex items-center">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onLogout}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white text-[12px] font-bold border border-white/20 flex items-center gap-2 transition-all cursor-pointer shadow-sm"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px] text-red-300">logout</span>
              <span>Sign Out</span>
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* ── Structured Credentials Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Core Identity Records */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.45 }}
          className="lg:col-span-8 flex flex-col gap-6"
        >
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 sm:p-7 shadow-xs relative overflow-hidden">
            {/* Top static accent */}
            <div className="absolute top-0 left-0 right-0 h-[3px] tricolor-stripe" />

            <div className="flex items-center justify-between pb-4 border-b border-[#F1F5F9] mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#0A2540]/5 flex items-center justify-center text-[#0A2540]">
                  <span className="material-symbols-outlined text-[18px]">badge</span>
                </div>
                <h3 className="font-headline text-[17px] font-bold text-[#0A2540]">
                  Participant Information
                </h3>
              </div>
              <span className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">
                Official Record
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Participant ID */}
              <div className="p-4 rounded-xl bg-[#F7F8FC] border border-[#E5E7EB] flex flex-col justify-between gap-2 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-[#0A2540]">fingerprint</span>
                    Unique Participant ID
                  </span>
                  <button
                    onClick={() => handleCopy('participantId', participantId)}
                    className="text-[11px] font-bold text-[#0A2540] hover:text-[#FF9933] flex items-center gap-1 transition-colors cursor-pointer"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      {copiedField === 'participantId' ? 'check' : 'content_copy'}
                    </span>
                    {copiedField === 'participantId' ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <span className="font-mono font-bold text-[14px] text-[#0A2540] break-all">
                  {participantId}
                </span>
              </div>

              {/* Classification */}
              <div className="p-4 rounded-xl bg-[#F7F8FC] border border-[#E5E7EB] flex flex-col justify-between gap-1.5">
                <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-[#0A2540]">category</span>
                  Classification
                </span>
                <span className="inline-flex items-center gap-1.5 font-bold text-[13px] text-[#0A2540]">
                  <span className="w-2 h-2 rounded-full bg-[#FF9933]" />
                  {participantType}
                </span>
              </div>

              {/* Verified Phone */}
              <div className="p-4 rounded-xl bg-[#F7F8FC] border border-[#E5E7EB] flex flex-col justify-between gap-1.5">
                <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-[#0A2540]">phone_iphone</span>
                  Mobile Telephony
                </span>
                <span className="font-mono font-bold text-[13px] text-[#0A2540]">
                  +91 {phone}
                </span>
              </div>

              {/* Email */}
              <div className="p-4 rounded-xl bg-[#F7F8FC] border border-[#E5E7EB] flex flex-col justify-between gap-1.5 sm:col-span-2">
                <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-[#0A2540]">mail</span>
                  Registered Email Address
                </span>
                <span className="font-mono font-semibold text-[13px] text-[#0A2540] break-all">
                  {email}
                </span>
              </div>

              {/* Institution / Panel */}
              <div className="p-4 rounded-xl bg-[#F7F8FC] border border-[#E5E7EB] flex flex-col justify-between gap-1.5 sm:col-span-2">
                <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-[#0A2540]">account_balance</span>
                  Institution / Nodal Panel
                </span>
                <span className="font-semibold text-[14px] text-[#1E293B]">
                  {institution}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right Column: Governance & Security Credentials */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.45 }}
          className="lg:col-span-4 flex flex-col gap-6"
        >
          {/* Security Tier Card */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-xs relative overflow-hidden">
            <div className="flex items-center gap-2.5 pb-4 border-b border-[#F1F5F9] mb-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">security</span>
              </div>
              <h3 className="font-headline text-[16px] font-bold text-[#0A2540]">
                Security & Tier
              </h3>
            </div>

            <div className="flex flex-col gap-3 text-[12px]">
              <div className="flex items-center justify-between py-2 border-b border-[#F1F5F9]">
                <span className="text-[#64748B] font-medium">Authentication</span>
                <span className="font-bold text-[#0A2540]">OTP Verified</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[#F1F5F9]">
                <span className="text-[#64748B] font-medium">Access Scope</span>
                <span className="font-bold text-[#0A2540]">{roleLabel}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[#F1F5F9]">
                <span className="text-[#64748B] font-medium">Verification State</span>
                <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                  <span className="material-symbols-outlined text-[14px]">check_circle</span>
                  Verified
                </span>
              </div>
              <div className="flex flex-col gap-1.5 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-[#64748B] font-medium">Auth User UUID</span>
                  <button
                    onClick={() => handleCopy('userId', userId)}
                    className="text-[11px] font-bold text-[#0A2540] hover:text-[#FF9933] flex items-center gap-1 transition-colors cursor-pointer"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[13px]">
                      {copiedField === 'userId' ? 'check' : 'content_copy'}
                    </span>
                    {copiedField === 'userId' ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <span className="font-mono text-[11px] text-[#64748B] bg-[#F7F8FC] p-2 rounded-lg border border-[#E5E7EB] break-all">
                  {userId}
                </span>
              </div>
            </div>
          </div>

          {/* Institutional Compliance Notice */}
          <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-[13px]">
              <span className="material-symbols-outlined text-[18px] text-amber-700">policy</span>
              Government Compliance
            </div>
            <p className="text-[12px] text-amber-900/80 leading-relaxed font-medium">
              Profile details are synced securely with the Central Identity Directory. For updates to registered institution or phone number, reach out to your nodal supervisor.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
