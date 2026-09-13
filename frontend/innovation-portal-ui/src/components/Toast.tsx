import React, { createContext, useCallback, useContext, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export const useToast = () => useContext(ToastContext);

let toastId = 0;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, type: ToastType = 'info') => {
      const id = ++toastId;
      setToasts((prev) => [...prev, { id, type, message }]);
      setTimeout(() => removeToast(id), 4000);
    },
    [removeToast]
  );

  const iconMap: Record<ToastType, string> = {
    success: 'check_circle',
    error: 'error',
    info: 'info',
  };

  const styleMap: Record<ToastType, { bg: string; border: string; text: string; icon: string; progress: string }> = {
    success: {
      bg: 'bg-white',
      border: 'border-emerald-200',
      text: 'text-emerald-900',
      icon: 'text-emerald-600',
      progress: 'bg-emerald-500',
    },
    error: {
      bg: 'bg-white',
      border: 'border-red-200',
      text: 'text-red-900',
      icon: 'text-red-600',
      progress: 'bg-red-500',
    },
    info: {
      bg: 'bg-white',
      border: 'border-[#BFDBFE]',
      text: 'text-[#0A2540]',
      icon: 'text-[#0A2540]',
      progress: 'bg-[#FF9933]',
    },
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast container */}
      <div
        className="fixed top-20 right-5 z-[100] flex flex-col gap-2.5 pointer-events-none"
        style={{ maxWidth: 380, width: '100%' }}
      >
        <AnimatePresence mode="sync">
          {toasts.map((t) => {
            const s = styleMap[t.type];
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, x: 60, scale: 0.92 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 420, damping: 26 }}
                className={`pointer-events-auto relative flex items-start gap-3 px-4 py-3.5 rounded-xl border shadow-xl backdrop-blur-md overflow-hidden ${s.bg} ${s.border}`}
              >
                <span className={`material-symbols-outlined text-[22px] mt-0.5 shrink-0 ${s.icon}`}>
                  {iconMap[t.type]}
                </span>
                <span className={`text-[13px] font-semibold leading-snug flex-1 ${s.text}`}>
                  {t.message}
                </span>
                <button
                  onClick={() => removeToast(t.id)}
                  className="shrink-0 text-[#94A3B8] hover:text-[#0A2540] transition-colors p-0.5 rounded-lg"
                  aria-label="Dismiss notification"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>

                {/* Shrinking progress bar */}
                <motion.div
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: 4, ease: 'linear' }}
                  className={`absolute bottom-0 left-0 h-[3px] ${s.progress}`}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};
