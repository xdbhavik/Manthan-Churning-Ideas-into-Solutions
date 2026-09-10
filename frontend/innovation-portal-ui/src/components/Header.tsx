import React from 'react';

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
  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-[#0f2a4a] z-50 flex items-center justify-between px-6 shadow-[0_1px_8px_rgba(0,0,0,0.06)]">
      {/* Left Branding */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center shadow-[0_1px_3px_rgba(15,42,74,0.08)]">
          <span className="material-symbols-outlined text-[#00152f] text-[22px]">account_balance</span>
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-white tracking-tight leading-none text-[15px]">
              SIH Innovation Portal
            </span>
            <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-[#795900] text-white font-semibold tracking-wide">
              SIH26043
            </span>
          </div>
          <span className="text-[10px] text-[#7a92b7] tracking-wider uppercase leading-tight font-medium mt-0.5">
            Govt of India • MoE & AICTE MIC
          </span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Microservice Gateway Pulse */}
        <div className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00152f] border border-[#1e3a5f]">
          <span className="inline-block w-2 h-2 rounded-full bg-[#ffc641] animate-pulse"></span>
          <span className="font-mono text-[11px] text-[#dce9ff]">Gateway :8090 Active</span>
        </div>

        {/* Notifications Bell */}
        <button
          aria-label="Notifications"
          onClick={onOpenNotifications}
          className="relative p-1.5 rounded-lg text-[#7a92b7] hover:text-white hover:bg-[#00152f] transition-colors"
          type="button"
        >
          <span className="material-symbols-outlined text-[20px]">notifications</span>
          {notificationsCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#ffc641] ring-2 ring-[#0f2a4a]"></span>
          )}
        </button>

        {/* User Identity & Profile */}
        <div
          onClick={onOpenProfile}
          className="flex items-center gap-2.5 pl-1 cursor-pointer hover:opacity-90 transition-opacity"
        >
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-[13px] font-semibold text-white leading-none">{displayName}</span>
            <span className="text-[10px] text-[#ffdfa0] flex items-center justify-end gap-0.5 leading-tight mt-0.5">
              <span className="material-symbols-outlined text-[12px]">verified</span>
              {roleLabel}
            </span>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#00152f] border border-[#304869] flex items-center justify-center font-semibold text-white text-[12px]">
            {avatarText}
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={onLogout}
          aria-label="Sign out"
          title="Sign out"
          className="p-1.5 rounded-lg text-[#7a92b7] hover:text-[#ffdfa0] hover:bg-[#00152f] transition-colors"
          type="button"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
        </button>
      </div>
    </header>
  );
};