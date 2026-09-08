
interface HeaderProps {
  title: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-space-2xl py-space-md border-b border-border-hairline bg-surface-crisp flex-shrink-0 relative overflow-hidden">
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-ashoka-blue/30 to-transparent" aria-hidden="true" />
      <div className="flex flex-col gap-space-2xs min-w-0">
        <h1 className="font-headline-md text-headline-md text-text-primary tracking-tight">{title}</h1>
        {subtitle && (
          <p className="font-body-sm text-body-sm text-text-muted truncate">{subtitle}</p>
        )}
      </div>

      {/* Admin role indicator — right side */}
      <div className="flex items-center gap-space-md flex-shrink-0 ml-space-lg">
        {/* Live indicator */}
        <div className="hidden sm:flex items-center gap-space-xs">
           <span className="inline-block w-1.5 h-1.5 rounded-full bg-gov-emerald pulse-dot" aria-hidden="true" />
          <span className="font-label-sm text-label-sm text-text-muted tracking-label uppercase text-[10px]">
            Live
          </span>
        </div>

        {/* Admin badge */}
        <div
           className="flex items-center gap-space-xs px-space-sm py-space-2xs bg-primary-container rounded border border-primary-container shadow-sm"
          role="status"
          aria-label="Logged in as Admin"
        >
          <span className="material-symbols-outlined text-on-primary text-[14px] filled" aria-hidden="true">
            admin_panel_settings
          </span>
          <span className="font-label-sm text-label-sm text-on-primary tracking-label uppercase">ADMIN</span>
        </div>
      </div>
    </header>
  );
}
