import React, { createContext, useCallback, useContext, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const ToastContext = createContext(null);

let idSeq = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const push = useCallback((message, tone = 'info') => {
    const id = ++idSeq;
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  const tones = {
    info: 'border-primary/30 text-text-primary',
    success: 'border-success/40 text-text-primary',
    error: 'border-danger/40 text-text-primary',
  };

  return (
    <ToastContext.Provider value={{ toast: push }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2" aria-live="polite">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              className={`rounded-lg border bg-white shadow-pop px-4 py-3 text-sm max-w-xs ${tones[t.tone] || tones.info}`}
            >
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  return ctx ? ctx.toast : () => {};
}
