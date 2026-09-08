
interface Props {
  success?: { message: string; onDismiss: () => void } | null;
  error?: { message: string; onDismiss: () => void } | null;
}

export default function GlobalNotifications({ success, error }: Props) {
  return (
    <div className="fixed top-16 left-64 right-0 z-30 flex flex-col gap-1 pointer-events-none">
      {success && (
        <div className="flex items-center gap-3 px-5 py-3 bg-[#ECFDF5] border-b border-[#A7F3D0] text-[#065F46] text-[13px] font-medium pointer-events-auto">
          <span className="material-symbols-outlined text-[18px] shrink-0">check_circle</span>
          <span className="flex-1">{success.message}</span>
          <button type="button" onClick={success.onDismiss} className="p-0.5 rounded hover:bg-[#A7F3D0]/40">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 px-5 py-3 bg-[#FFF1F2] border-b border-[#FECDD3] text-[#BE123C] text-[13px] font-medium pointer-events-auto">
          <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
          <span className="flex-1">{error.message}</span>
          <button type="button" onClick={error.onDismiss} className="p-0.5 rounded hover:bg-[#FECDD3]/40">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}
    </div>
  );
}
