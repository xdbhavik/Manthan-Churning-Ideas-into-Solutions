import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface HeaderProps {
  displayName: string;
  roleLabel: string;
  avatarText: string;
  onOpenProfile: () => void;
  onOpenNotifications: () => void;
  notificationsCount: number;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  displayName,
  roleLabel,
  avatarText,
  onOpenProfile,
  onOpenNotifications,
  notificationsCount,
  onLogout,
}) => {
  const [avatarOpen, setAvatarOpen] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setAvatarOpen(false);
      }
    };
    if (avatarOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [avatarOpen]);

  return (
    <>
      {/* Top tricolor accent strip with continuous shimmer sweep */}
      <div className="fixed top-0 left-0 right-0 h-1 tricolor-stripe-animated z-[60]" />

      <header className="fixed top-1 left-0 right-0 h-16 bg-white z-50 flex items-center justify-between px-6 border-b border-[#E5E7EB] shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
        {/* Left Institutional Branding */}
        <div className="flex items-center gap-3.5">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="w-10 h-10 rounded-xl bg-[#0A2540] flex items-center justify-center shadow-sm"
          >
            <span className="material-symbols-outlined text-white text-[24px]">account_balance</span>
          </motion.div>
          <div className="flex flex-col">
            <span className="font-headline font-bold text-[#0A2540] tracking-tight leading-none text-[16px]">
              National Innovation Portal
            </span>
            <span className="text-[10px] text-[#64748B] tracking-wider uppercase leading-tight font-semibold mt-1">
              Government of India · Ministry of Education
            </span>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          {/* Notifications Bell */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            aria-label="Notifications"
            onClick={onOpenNotifications}
            className="relative p-2.5 rounded-xl text-[#64748B] hover:text-[#0A2540] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[22px]">notifications</span>
            {notificationsCount > 0 && (
              <span className="absolute top-2 right-2 min-w-[16px] h-4 px-1 rounded-full bg-[#FF9933] ring-2 ring-white text-white text-[9px] font-bold flex items-center justify-center">
                {notificationsCount > 9 ? '9+' : notificationsCount}
              </span>
            )}
          </motion.button>

          {/* User Avatar Dropdown */}
          <div ref={avatarRef} className="relative">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setAvatarOpen(!avatarOpen)}
              className="flex items-center gap-3 px-2.5 py-1.5 rounded-xl hover:bg-[#F1F5F9] transition-colors cursor-pointer"
              type="button"
            >
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-[13px] font-semibold text-[#1E293B] leading-none">{displayName}</span>
                <span className="text-[10px] text-[#138808] flex items-center justify-end gap-0.5 leading-tight mt-1 font-semibold">
                  <span className="material-symbols-outlined text-[12px]">verified</span>
                  {roleLabel}
                </span>
              </div>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#0A2540] to-[#163B65] flex items-center justify-center font-bold text-white text-[13px] ring-2 ring-[#E5E7EB] shadow-sm">
                {avatarText}
              </div>
              <span
                className={`material-symbols-outlined text-[16px] text-[#94A3B8] transition-transform duration-200 ${
                  avatarOpen ? 'rotate-180' : ''
                }`}
              >
                expand_more
              </span>
            </motion.button>

            {/* Dropdown Menu with spring animation */}
            <AnimatePresence>
              {avatarOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                  className="dropdown-menu absolute right-0 top-full mt-2 w-60 bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden z-50 shadow-2xl"
                >
                  {/* User info header */}
                  <div className="px-4 py-3.5 bg-[#F7F8FC] border-b border-[#E5E7EB]">
                    <div className="text-[13px] font-bold text-[#0A2540]">{displayName}</div>
                    <div className="text-[11px] text-[#138808] flex items-center gap-1 mt-0.5 font-semibold">
                      <span className="material-symbols-outlined text-[13px]">verified</span>
                      {roleLabel}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="p-1.5">
                    <button
                      onClick={() => {
                        setAvatarOpen(false);
                        onOpenProfile();
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl text-left text-[13px] font-medium text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0A2540] transition-colors flex items-center gap-2.5 cursor-pointer"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[19px] text-[#94A3B8]">person</span>
                      My Profile
                    </button>
                    <div className="mx-2 my-1 border-t border-[#F1F5F9]" />
                    <button
                      onClick={() => {
                        setAvatarOpen(false);
                        onLogout();
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl text-left text-[13px] font-medium text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2.5 cursor-pointer"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[19px] text-red-500">logout</span>
                      Sign Out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>
    </>
  );
};