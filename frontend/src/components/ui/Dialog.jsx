import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconButton } from './Button';

export function Dialog({ open, onClose, title, children, footer, wide }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          role="dialog" aria-modal="true" aria-label={title}
        >
          <div className="absolute inset-0 bg-sidebar/40 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.18 }}
            className={cnWide(wide, 'relative bg-white rounded-2xl shadow-pop border border-border max-h-[85vh] overflow-y-auto')}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-white rounded-t-2xl z-10">
              <h2 className="text-sm font-semibold">{title}</h2>
              <IconButton label="Close" onClick={onClose}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </IconButton>
            </div>
            <div className="px-5 py-4">{children}</div>
            {footer && <div className="px-5 py-4 border-t border-border flex justify-end gap-2 sticky bottom-0 bg-white rounded-b-2xl">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function cnWide(wide, base) {
  return `${wide ? 'w-full max-w-2xl' : 'w-full max-w-md'} ${base}`;
}
