import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

// Shared modal shell for the TestProfile feature.
//
// All three modals (QR / Report / ShareSheet) want the same treatment:
//   - Backdrop with blur
//   - Click-outside to close
//   - Esc to close
//   - Chunky frame (border + offset shadow)
//   - Optional title row with a close button
//
// We keep this local to features/testProfile to avoid coupling with
// any future global modal library — the chunky look is feature-
// specific.

export default function ChunkyModal({
  open,
  onClose,
  title,
  children,
  size = 'md',           // 'sm' | 'md' | 'lg'
  /** When true, the sheet docks to the bottom on mobile. Used by ShareSheet. */
  bottomSheetOnMobile = false,
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    // Lock body scroll while the modal is open
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  const widthClass = size === 'sm' ? 'max-w-xs' : size === 'lg' ? 'max-w-lg' : 'max-w-md';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`fixed inset-0 z-[100] flex p-0 sm:items-center sm:justify-center sm:p-4 ${
            bottomSheetOnMobile ? 'items-end justify-center' : 'items-center justify-center'
          }`}
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm" />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={
              bottomSheetOnMobile
                ? { opacity: 0, y: 60 }
                : { opacity: 0, scale: 0.92, y: 12 }
            }
            animate={
              bottomSheetOnMobile
                ? { opacity: 1, y: 0 }
                : { opacity: 1, scale: 1, y: 0 }
            }
            exit={
              bottomSheetOnMobile
                ? { opacity: 0, y: 60 }
                : { opacity: 0, scale: 0.92, y: 12 }
            }
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className={`relative w-full ${widthClass} border-2 border-slate-900 bg-white shadow-[6px_6px_0_rgba(15,23,42,0.95)] dark:border-white dark:bg-slate-900 dark:shadow-[6px_6px_0_rgba(255,255,255,0.7)] ${
              bottomSheetOnMobile
                ? 'rounded-t-3xl pb-[max(1rem,env(safe-area-inset-bottom))] sm:rounded-2xl sm:pb-0'
                : 'rounded-2xl'
            }`}
          >
            {/* Header */}
            {title && (
              <div className="flex items-center justify-between border-b-2 border-slate-200 bg-amber-50 px-5 py-3 dark:border-slate-700 dark:bg-amber-900/20">
                <h3 className="text-sm font-black uppercase tracking-wide text-slate-900 dark:text-white">
                  {title}
                </h3>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="rounded-lg border-2 border-slate-900 bg-white p-1 text-slate-700 transition hover:bg-amber-100 dark:border-white dark:bg-slate-800 dark:text-slate-200"
                >
                  <X size={14} strokeWidth={2.8} />
                </button>
              </div>
            )}

            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
