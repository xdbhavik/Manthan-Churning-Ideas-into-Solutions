import React, { useState } from 'react';
import { Participant } from '../types';
import { SessionUser } from '../lib/auth';

interface ProfileModalProps {
  displayName: string;
  roleLabel: string;
  avatarText: string;
  participant: Participant | null;
  session: SessionUser | null;
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  displayName,
  roleLabel,
  avatarText,
  participant,
  session,
  isOpen,
  onClose,
  onLogout,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const participantId = participant?.participantId || session?.userId || '—';
  const userId = session?.userId || '—';

  return (
    <div className="fixed inset-0 bg-[#0A2540]/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-[#E5E7EB] flex flex-col overflow-hidden animate-scaleIn" onClick={(e) => e.stopPropagation()}>
        {/* Top static tricolor accent */}
        <div className="h-1 tricolor-stripe" />

        <div className="p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-[#0A2540]">badge</span>
              <h3 className="font-headline text-[16px] font-bold text-[#0A2540]">User Credentials</h3>
            </div>
            <button onClick={onClose} className="text-[#94A3B8] hover:text-[#0A2540] transition-colors cursor-pointer">
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#F7F8FC] border border-[#E5E7EB]">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0A2540] to-[#163B65] text-white flex items-center justify-center font-bold text-[20px] ring-2 ring-[#E5E7EB] shadow-xs">
              {avatarText}
            </div>
            <div>
              <div className="font-headline text-[18px] font-bold text-[#0A2540]">{displayName}</div>
              <div className="text-[12px] text-[#138808] font-semibold flex items-center gap-1 mt-0.5">
                <span className="material-symbols-outlined text-[15px]">verified</span>
                {roleLabel}
              </div>
            </div>
          </div>

          <div className="space-y-2.5 text-[13px]">
            <div className="flex items-center justify-between py-2 border-b border-[#F1F5F9]">
              <span className="text-[#94A3B8] font-medium">Participant ID</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-[12px] text-[#0A2540]">{participantId.slice(0, 13)}…</span>
                <button
                  onClick={() => handleCopy('pid', participantId)}
                  className="text-[#64748B] hover:text-[#0A2540] cursor-pointer"
                  title="Copy Participant ID"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[14px]">
                    {copiedKey === 'pid' ? 'check' : 'content_copy'}
                  </span>
                </button>
              </div>
            </div>
            <div className="flex justify-between py-2 border-b border-[#F1F5F9]">
              <span className="text-[#94A3B8] font-medium">Type</span>
              <span className="font-semibold text-[#1E293B]">{participant?.participantType || session?.role || '—'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[#F1F5F9]">
              <span className="text-[#94A3B8] font-medium">Institution</span>
              <span className="font-semibold text-[#1E293B] text-right max-w-[200px] truncate">{participant?.institutionName || '—'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[#F1F5F9]">
              <span className="text-[#94A3B8] font-medium">Phone</span>
              <span className="font-mono text-[#0A2540] font-semibold">+91 {session?.phone}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[#F1F5F9]">
              <span className="text-[#94A3B8] font-medium">Email</span>
              <span className="font-mono text-[#0A2540] text-right max-w-[200px] truncate">{participant?.email || session?.email || '—'}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-[#94A3B8] font-medium">User ID</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[11px] text-[#64748B]">{userId.slice(0, 13)}…</span>
                <button
                  onClick={() => handleCopy('uid', userId)}
                  className="text-[#64748B] hover:text-[#0A2540] cursor-pointer"
                  title="Copy User ID"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[14px]">
                    {copiedKey === 'uid' ? 'check' : 'content_copy'}
                  </span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-3 border-t border-[#F1F5F9]">
            <button onClick={onClose} className="px-4 py-2.5 rounded-xl bg-[#F1F5F9] hover:bg-[#E5E7EB] text-[#475569] font-bold text-[13px] transition-colors cursor-pointer" type="button">
              Close
            </button>
            <button onClick={onLogout} className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-[13px] transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs" type="button">
              <span className="material-symbols-outlined text-[16px]">logout</span>
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};