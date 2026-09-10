import React from 'react';
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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#00152f]/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#e2e8f0] flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between pb-3 border-b border-[#f1f5f9]">
          <h3 className="font-headline text-[16px] font-bold text-[#0b1c30]">User Credentials</h3>
          <button onClick={onClose} className="text-[#74777f]">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="flex items-center gap-4 p-4 rounded-xl bg-[#eff4ff] border border-[#dce9ff]">
          <div className="w-14 h-14 rounded-full bg-[#00152f] text-white flex items-center justify-center font-bold text-[20px]">{avatarText}</div>
          <div>
            <div className="font-headline text-[18px] font-bold text-[#0b1c30]">{displayName}</div>
            <div className="text-[12px] text-[#795900] font-semibold flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px]">verified</span>
              {roleLabel}
            </div>
          </div>
        </div>

        <div className="space-y-3 text-[13px]">
          <div className="flex justify-between py-2 border-b border-[#f1f5f9]">
            <span className="text-[#74777f]">Type</span>
            <span className="font-semibold text-[#0b1c30]">{participant?.participantType || session?.role || '—'}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-[#f1f5f9]">
            <span className="text-[#74777f]">Institution</span>
            <span className="font-semibold text-[#0b1c30]">{participant?.institutionName || '—'}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-[#f1f5f9]">
            <span className="text-[#74777f]">Phone</span>
            <span className="font-mono text-[#00152f]">+91 {session?.phone}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-[#f1f5f9]">
            <span className="text-[#74777f]">Email</span>
            <span className="font-mono text-[#00152f]">{participant?.email || session?.email || '—'}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-[#74777f]">User ID</span>
            <span className="font-mono text-[11px] text-[#00152f]">{session?.userId || '—'}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-3 border-t border-[#f1f5f9]">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-[#eff4ff] hover:bg-[#dce9ff] text-[#0b1c30] font-semibold text-[13px] transition-colors border border-[#dce9ff]" type="button">
            Close
          </button>
          <button onClick={onLogout} className="flex-1 py-2 rounded-lg bg-[#ba1a1a] hover:bg-[#93000a] text-white font-semibold text-[13px] transition-colors flex items-center justify-center gap-1.5" type="button">
            <span className="material-symbols-outlined text-[16px]">logout</span>
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};