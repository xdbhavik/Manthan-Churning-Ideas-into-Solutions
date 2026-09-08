
interface ErrorPanelProps {
  status?: number | null;
  message: string;
  onRetry?: () => void;
  onBack?: () => void;
  compact?: boolean;
}

function getStatusLabel(status?: number | null): { title: string; icon: string } {
  switch (status) {
    case 401: return { title: 'Session Expired', icon: 'lock' };
    case 403: return { title: 'Access Denied', icon: 'block' };
    case 404: return { title: 'Not Found', icon: 'search_off' };
    case 409: return { title: 'Conflict', icon: 'warning' };
    case 400: return { title: 'Validation Error', icon: 'error' };
    case 502: return { title: 'Service Unavailable', icon: 'cloud_off' };
    default: return { title: 'Error', icon: 'error_outline' };
  }
}

export default function ErrorPanel({ status, message, onRetry, onBack, compact }: ErrorPanelProps) {
  const { title, icon } = getStatusLabel(status);
  if (compact) {
    return (
      <div className="flex items-start gap-2 p-3 bg-[#FFF1F2] border border-[#FECDD3] rounded-lg text-[13px]">
        <span className="material-symbols-outlined text-[#BE123C] text-[18px] shrink-0 mt-0.5">{icon}</span>
        <div className="flex-1">
          <span className="font-semibold text-[#BE123C]">{title}: </span>
          <span className="text-[#9F1239]">{message}</span>
          {onRetry && (
            <button type="button" onClick={onRetry} className="ml-2 underline text-[#BE123C] hover:text-[#9F1239]">Retry</button>
          )}
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="w-12 h-12 rounded-full bg-[#FFF1F2] border border-[#FECDD3] flex items-center justify-center mb-3">
        <span className="material-symbols-outlined text-[#BE123C] text-[24px]">{icon}</span>
      </div>
      <h3 className="text-[16px] font-semibold text-[#0A2540] mb-1">{title}</h3>
      <p className="text-[13px] text-[#64748B] max-w-sm mb-4">{message}</p>
      <div className="flex items-center gap-2">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="px-4 py-2 bg-[#0A2540] text-white text-[13px] font-semibold rounded-lg hover:bg-[#1E3A8A] transition-colors"
          >
            Try Again
          </button>
        )}
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 bg-white border border-[#CBD5E1] text-[#0A2540] text-[13px] font-semibold rounded-lg hover:bg-[#F8FAFC] transition-colors"
          >
            Go Back
          </button>
        )}
      </div>
    </div>
  );
}
