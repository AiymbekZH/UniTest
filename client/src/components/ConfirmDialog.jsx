import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2, Check, X, Info } from 'lucide-react';

const icons = {
  danger: { icon: Trash2, bg: 'bg-red-50 dark:bg-red-900/20', color: 'text-red-500' },
  warning: { icon: AlertTriangle, bg: 'bg-amber-50 dark:bg-amber-900/20', color: 'text-amber-500' },
  success: { icon: Check, bg: 'bg-emerald-50 dark:bg-emerald-900/20', color: 'text-emerald-500' },
  info: { icon: Info, bg: 'bg-primary-50 dark:bg-primary-900/20', color: 'text-primary-500' },
};

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Подтверждение',
  message = 'Вы уверены?',
  confirmText = 'Подтвердить',
  cancelText = 'Отмена',
  variant = 'danger', // danger | warning | success | info
}) {
  if (!isOpen) return null;

  const { icon: Icon, bg, color } = icons[variant] || icons.info;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[220] flex min-h-screen items-center justify-center overflow-y-auto p-4"
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            onClick={e => e.stopPropagation()}
            className="relative my-auto w-full max-w-sm rounded-2xl border border-gray-100 bg-white shadow-xl overflow-hidden dark:border-slate-700 dark:bg-slate-800"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 icon-btn h-8 w-8"
            >
              <X size={15} />
            </button>

            <div className="px-6 pt-8 pb-5">
              {/* Icon */}
              <div className={`w-12 h-12 ${bg} rounded-xl flex items-center justify-center mx-auto mb-4`}>
                <Icon size={20} className={color} />
              </div>

              {/* Content */}
              <h3 className="text-base font-semibold text-dark dark:text-white text-center mb-1.5">
                {title}
              </h3>
              <p className="text-gray-400 dark:text-gray-400 text-center text-sm leading-relaxed">
                {message}
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2 px-6 pb-6">
              <button
                onClick={onClose}
                className="btn-secondary flex-1 text-sm"
              >
                {cancelText}
              </button>
              <button
                onClick={() => { onConfirm(); onClose(); }}
                className={`flex-1 py-2 px-5 rounded-xl text-sm font-medium text-white shadow-sm hover:shadow-md transition-all active:scale-[0.98]
                  ${variant === 'danger' ? 'bg-red-500 hover:bg-red-600' :
                    variant === 'warning' ? 'bg-amber-500 hover:bg-amber-600' :
                    variant === 'success' ? 'bg-emerald-500 hover:bg-emerald-600' :
                    'bg-primary-500 hover:bg-primary-600'}`}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
