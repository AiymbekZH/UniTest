import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2, Check, X, Info } from 'lucide-react';

const icons = {
  danger: { icon: Trash2, bg: 'bg-red-100 dark:bg-red-900/30', color: 'text-red-600' },
  warning: { icon: AlertTriangle, bg: 'bg-amber-100 dark:bg-amber-900/30', color: 'text-amber-600' },
  success: { icon: Check, bg: 'bg-emerald-100 dark:bg-emerald-900/30', color: 'text-emerald-600' },
  info: { icon: Info, bg: 'bg-primary-100 dark:bg-primary-900/30', color: 'text-primary-600' },
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
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={e => e.stopPropagation()}
            className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="p-6 sm:p-8">
              {/* Icon */}
              <div className={`w-14 h-14 ${bg} rounded-2xl flex items-center justify-center mx-auto mb-5`}>
                <Icon size={24} className={color} />
              </div>

              {/* Content */}
              <h3 className="text-xl font-bold text-dark dark:text-white text-center mb-2">
                {title}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-center text-sm leading-relaxed">
                {message}
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 p-6 pt-0 sm:px-8 sm:pb-8">
              <button
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-xl border border-gray-200 dark:border-slate-600 text-sm font-medium
                  text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all active:scale-[0.98]"
              >
                {cancelText}
              </button>
              <button
                onClick={() => { onConfirm(); onClose(); }}
                className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium text-white transition-all active:scale-[0.98]
                  ${variant === 'danger' ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/25' :
                    variant === 'warning' ? 'bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-500/25' :
                    variant === 'success' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/25' :
                    'bg-primary-600 hover:bg-primary-700 shadow-lg shadow-primary-600/25'}`}
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
