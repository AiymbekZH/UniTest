import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, CalendarClock, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import { formatDateLong } from '../utils/formatDate';

// Friendly replacement for the "oops, redirect" behaviour the legacy
// TestProfile had when the server returned 403 NOT_STARTED / ENDED.
// Instead of bouncing back to the dashboard we render this card so
// the user sees exactly when the test opens or closed.

export default function TestWindowClosedCard({ deadlineError }) {
  const navigate = useNavigate();
  const { t, lang } = useLanguage();

  const isNotStarted = deadlineError.code === 'NOT_STARTED';
  const dateStr = formatDateLong(
    isNotStarted ? deadlineError.startDate : deadlineError.endDate,
    lang,
  );

  return (
    <main className="flex min-h-[60vh] items-center justify-center px-4 py-12 sm:py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="chunky-card w-full max-w-md p-8 text-center"
      >
        <div
          className={`mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-slate-900 dark:border-white ${
            isNotStarted ? 'bg-amber-400' : 'bg-red-500'
          }`}
          style={{ boxShadow: isNotStarted ? '0 4px 0 #92400e' : '0 4px 0 #7f1d1d' }}
        >
          {isNotStarted
            ? <CalendarClock className="h-8 w-8 text-slate-900" strokeWidth={2.4} />
            : <AlertTriangle className="h-8 w-8 text-white" strokeWidth={2.4} />}
        </div>

        <h2 className="mb-2 text-xl font-black tracking-tight text-slate-900 dark:text-white">
          {isNotStarted ? t('testNotAvailableYet') : t('testFinished')}
        </h2>
        <p className="mb-6 text-sm font-medium text-slate-500 dark:text-slate-400">
          {isNotStarted
            ? t('testOpensAt', { date: dateStr })
            : t('testWasAvailableUntil', { date: dateStr })}
        </p>

        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="chunky-btn-primary flex w-full items-center justify-center gap-2 py-3 text-sm"
        >
          <ArrowLeft size={14} strokeWidth={2.6} />
          {t('backToDashboard') || t('back')}
        </button>
      </motion.div>
    </main>
  );
}
