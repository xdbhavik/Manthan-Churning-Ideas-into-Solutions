
interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  children?: React.ReactNode;
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  onConfirm,
  onCancel,
  loading,
  children,
}: ConfirmDialogProps) {
  if (!open) return null;
  const confirmCls = variant === 'danger'
    ? 'bg-[#BE123C] hover:bg-[#9F1239] text-white'
    : 'bg-[#0A2540] hover:bg-[#1E3A8A] text-white';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md p-6 flex flex-col gap-4">
        <h2 className="text-[18px] font-bold text-[#0A2540]">{title}</h2>
        {description && <p className="text-[14px] text-[#475569]">{description}</p>}
        {children}
        <div className="flex items-center justify-end gap-2 mt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 rounded-lg border border-[#CBD5E1] text-[#0A2540] text-[13px] font-semibold hover:bg-[#F8FAFC] transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={'px-4 py-2 rounded-lg text-[13px] font-semibold transition-colors disabled:opacity-50 ' + confirmCls}
          >
            {loading ? 'Processing…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
