import { useEffect, useRef, useState } from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** If set, user must type this exact string to enable confirm button */
  requiredTyping?: string;
  danger?: boolean;
  isDanger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  description,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  requiredTyping,
  danger,
  isDanger,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const [typed, setTyped] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFocusRef = useRef<HTMLButtonElement | HTMLInputElement | null>(null);

  const displayMessage = message || description || '';
  const isDangerous = isDanger || danger || false;

  useEffect(() => {
    if (isOpen) {
      // Defer focus slightly so dialog has rendered
      setTimeout(() => {
        firstFocusRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Focus trap: keep Tab/Shift+Tab within the dialog
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onCancel();
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;

      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      const elements = Array.from(focusable);
      if (elements.length === 0) return;

      const first = elements[0];
      const last = elements[elements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const canConfirm = requiredTyping ? typed === requiredTyping : true;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-gutter-mobile"
      aria-modal="true"
      role="dialog"
      aria-labelledby="confirm-modal-title"
      aria-describedby={displayMessage ? 'confirm-modal-desc' : undefined}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm modal-backdrop"
        onClick={onCancel}
        aria-hidden="true"
      />
      {/* Dialog */}
      <div
        ref={dialogRef}
        className="relative w-full max-w-sm bg-surface-crisp rounded-lg shadow-xl border border-border-hairline p-space-xl flex flex-col gap-space-lg overflow-hidden modal-enter"
      >
        {/* Top accent bar */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-ashoka-blue" aria-hidden="true" />
        {/* Icon + title */}
        <div className="flex items-start gap-space-md">
          <div
            aria-hidden="true"
            className={`flex-shrink-0 flex items-center justify-center w-9 h-9 rounded border ${
              isDangerous ? 'bg-red-50 border-red-200 text-error' : 'bg-surface-muted border-border-hairline text-text-secondary'
            }`}
          >
            <span className="material-symbols-outlined text-headline-sm">
              {isDangerous ? 'warning' : 'help'}
            </span>
          </div>
          <div className="flex flex-col gap-space-xs">
            <h2 id="confirm-modal-title" className="font-headline-sm text-headline-sm text-text-primary">{title}</h2>
            {displayMessage && (
              <p id="confirm-modal-desc" className="font-body-sm text-body-sm text-text-secondary leading-relaxed">{displayMessage}</p>
            )}
          </div>
        </div>

        {/* Required typing */}
        {requiredTyping && (
          <div className="flex flex-col gap-space-xs">
            <label className="font-label-md text-label-md text-text-primary" htmlFor="confirm-type-input">
              Type <span className="font-mono-code text-saffron-accent">{requiredTyping}</span> to confirm:
            </label>
            <input
              ref={firstFocusRef as React.RefObject<HTMLInputElement>}
              id="confirm-type-input"
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              className="w-full h-10 px-space-md rounded-lg border border-border-strong font-mono-code text-body-md text-text-primary bg-surface-crisp focus:outline-none focus-visible:ring-2 focus-visible:ring-ashoka-blue focus-visible:ring-offset-1"
              placeholder={requiredTyping}
              autoComplete="off"
              aria-describedby="confirm-type-hint"
            />
            <span id="confirm-type-hint" className="sr-only">Type {requiredTyping} exactly to enable the confirm button</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-space-sm justify-end">
          <button
            id="modal-cancel-btn"
            ref={!requiredTyping ? (firstFocusRef as React.RefObject<HTMLButtonElement>) : undefined}
            type="button"
            onClick={() => { setTyped(''); onCancel(); }}
            className="px-space-lg h-9 min-w-[6rem] rounded font-label-lg text-label-lg border border-border-strong text-text-secondary hover:bg-surface-muted transition-standard pressable cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ashoka-blue"
          >
            {cancelLabel}
          </button>
          <button
            id="modal-confirm-btn"
            type="button"
            onClick={() => { setTyped(''); onConfirm(); }}
            disabled={!canConfirm}
            aria-disabled={!canConfirm}
            className={`px-space-lg h-9 min-w-[6rem] rounded font-label-lg text-label-lg transition-standard pressable cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
              isDangerous
                ? 'bg-error text-on-error hover:bg-red-700 disabled:opacity-40 focus-visible:outline-red-700'
                : 'bg-ashoka-blue text-on-primary hover:bg-institutional-navy disabled:opacity-40 focus-visible:outline-ashoka-blue'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
