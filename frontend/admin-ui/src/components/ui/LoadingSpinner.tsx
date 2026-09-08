interface LoadingSpinnerProps {
  message?: string;
  className?: string;
}

export default function LoadingSpinner({ message = 'Loading...', className = '' }: LoadingSpinnerProps) {
  return (
    <div
      role="status"
      aria-label={message}
      aria-live="polite"
      className={`flex flex-col items-center justify-center py-space-2xl gap-space-md page-enter ${className}`}
    >
      <div className="relative w-10 h-10" aria-hidden="true">
        <div className="absolute inset-0 rounded-full border-2 border-surface-container-high" />
        <div className="absolute inset-0 rounded-full border-2 border-ashoka-blue border-t-transparent animate-spin" />
        <div className="absolute inset-2 rounded-full border border-saffron-accent/30 animate-pulse" />
      </div>
      <span className="font-body-sm text-body-sm text-text-muted">{message}</span>
    </div>
  );
}
