interface ErrorAlertProps {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export default function ErrorAlert({ message, onRetry, onDismiss, className = '' }: ErrorAlertProps) {
  return (
    <div
      className={`flex items-start gap-space-md p-space-md bg-red-50 border border-red-200 rounded-lg alert-enter ${className}`}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <span className="material-symbols-outlined text-error text-headline-sm mt-space-2xs flex-shrink-0" aria-hidden="true">
        error
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-label-md text-label-md text-red-700">{message}</p>
        <div className="flex gap-space-md items-center mt-space-xs">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="font-label-sm text-label-sm text-ashoka-blue hover:underline cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ashoka-blue rounded"
            >
              Try again
            </button>
          )}
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="font-label-sm text-label-sm text-text-muted hover:underline cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ashoka-blue rounded"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
