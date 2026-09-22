import { useState, useCallback, useEffect, createContext, useContext, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  notify: (toast: Omit<Toast, 'id'>) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notify = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2, 9);
    const newToast: Toast = { ...toast, id };
    setToasts((prev) => [...prev, newToast]);
    return id;
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, notify, dismiss, dismissAll }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}

interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  useEffect(() => {
    if (toast.duration !== 0) {
      const timer = setTimeout(() => {
        onDismiss(toast.id);
      }, toast.duration ?? 2600);
      return () => clearTimeout(timer);
    }
  }, [toast, onDismiss]);

  const typeStyles: Record<ToastType, { bg: string; icon: string; iconColor: string }> = {
    success: { bg: 'bg-inverse-surface', icon: 'check_circle', iconColor: 'text-state-accepted-text' },
    error: { bg: 'bg-inverse-surface', icon: 'error', iconColor: 'text-error' },
    info: { bg: 'bg-inverse-surface', icon: 'info', iconColor: 'text-secondary' },
    warning: { bg: 'bg-inverse-surface', icon: 'warning', iconColor: 'text-state-review-text' },
  };

  const styles = typeStyles[toast.type];

  return (
    <motion.div
      className={`pointer-events-auto flex items-start gap-space-sm ${styles.bg} text-inverse-on-surface px-space-md py-space-sm rounded-lg shadow-level-3`}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <span className={`material-symbols-outlined text-[18px] shrink-0 mt-0.5 ${styles.iconColor}`}>
        {styles.icon}
      </span>
      <div className="flex-1 min-w-0">
        <div className="font-headline-sm text-headline-sm text-inverse-on-surface">{toast.title}</div>
        {toast.message && (
          <p className="font-body-sm text-body-sm text-inverse-on-surface/80 mt-0.5">{toast.message}</p>
        )}
      </div>
      {toast.action && (
        <button
          onClick={() => {
            toast.action?.onClick();
            onDismiss(toast.id);
          }}
          className="shrink-0 px-space-sm py-1 rounded text-inverse-on-surface hover:bg-inverse-surface/20 transition-colors font-headline-sm text-headline-sm"
        >
          {toast.action.label}
        </button>
      )}
      <button
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 p-1 text-inverse-on-surface/60 hover:text-inverse-on-surface transition-colors"
      >
        <span className="material-symbols-outlined text-[18px]">close</span>
      </button>
    </motion.div>
  );
}