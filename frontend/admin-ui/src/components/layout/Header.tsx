
interface HeaderProps {
  title: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-space-2xl py-space-md border-b border-slate-200 bg-[#f8f9fb] flex-shrink-0 relative overflow-hidden">
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" aria-hidden="true" />
      <div className="flex flex-col gap-space-2xs min-w-0">
        <h1 className="font-headline-md text-headline-md text-[#1f2d3a] tracking-tight">{title}</h1>
        {subtitle && (
          <p className="font-body-sm text-body-sm text-slate-500 truncate">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-space-md flex-shrink-0 ml-space-lg">
        <div className="hidden sm:flex items-center gap-space-xs rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 pulse-dot" aria-hidden="true" />
          <span className="font-label-sm text-[10px] text-emerald-700 tracking-label uppercase">Live</span>
        </div>

        <div
          className="flex items-center gap-space-xs px-space-sm py-space-2xs bg-[#e6f4eb] rounded border border-emerald-200 shadow-sm"
          role="status"
          aria-label="Logged in as Admin"
        >
          <span className="material-symbols-outlined text-emerald-700 text-[14px] filled" aria-hidden="true">
            admin_panel_settings
          </span>
          <span className="font-label-sm text-label-sm text-emerald-800 tracking-label uppercase">ADMIN</span>
        </div>
      </div>
    </header>
  );
}
