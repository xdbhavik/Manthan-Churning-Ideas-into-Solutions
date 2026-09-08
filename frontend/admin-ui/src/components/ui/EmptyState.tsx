
interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  className?: string;
}

export default function EmptyState({
  icon = 'inbox',
  title,
  description,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-space-3xl gap-space-md text-center ${className}`}>
      {/* Formal icon container — square, minimal */}
      <div
        className="flex items-center justify-center w-12 h-12 rounded bg-surface-muted border border-border-hairline text-text-muted"
        aria-hidden="true"
      >
        <span className="material-symbols-outlined text-[22px]">{icon}</span>
      </div>
      <div className="flex flex-col gap-space-xs max-w-xs">
        <p className="font-headline-sm text-headline-sm text-text-primary tracking-tight">{title}</p>
        {description && (
          <p className="font-body-sm text-body-sm text-text-muted leading-relaxed">{description}</p>
        )}
      </div>
    </div>
  );
}
