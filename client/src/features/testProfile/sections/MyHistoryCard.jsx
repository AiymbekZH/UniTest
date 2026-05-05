import { motion } from 'framer-motion';
import { History, Trophy } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import { formatDateShort } from '../utils/formatDate';

// Logged-in user's recent attempt history for this test. Server
// returns `{ attempts: [{ percentage, score, completedAt, ... }],
// count, best }` — we render the top 5, headlined by best score.
//
// Color thresholds match LeaderboardPreview so the page stays
// internally consistent.

function tone(pct) {
  if (pct >= 80) return 'text-emerald-600 dark:text-emerald-400';
  if (pct >= 50) return 'text-amber-500';
  return 'text-red-500';
}

export default function MyHistoryCard({ history }) {
  const { t, lang } = useLanguage();
  const attempts = (history?.attempts || []).slice(0, 5);
  if (attempts.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.25 }}
      className="chunky-card p-5"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
          <History size={13} strokeWidth={2.6} />
          {t('myHistory')}
        </h3>
        {typeof history?.best === 'number' && (
          <span className="inline-flex items-center gap-1 rounded-full border-2 border-slate-900 bg-amber-300 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-slate-900 dark:border-white">
            <Trophy size={10} strokeWidth={2.6} />
            {t('bestScore')}: {history.best}%
          </span>
        )}
      </div>

      <ul className="space-y-1">
        {attempts.map((a, i) => (
          <li
            key={a._id || i}
            className={`flex items-center gap-3 py-2 ${
              i > 0 ? 'border-t-2 border-slate-100 dark:border-slate-700' : ''
            }`}
          >
            <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border-2 border-slate-900 bg-white text-[10px] font-black text-slate-700 dark:border-white dark:bg-slate-800 dark:text-slate-200">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12px] font-bold text-slate-700 dark:text-slate-200">
                {formatDateShort(a.completedAt || a.createdAt, lang)}
              </div>
              {typeof a.score === 'number' && typeof a.totalPoints === 'number' && (
                <div className="text-[10px] font-bold text-slate-400">
                  {a.score} / {a.totalPoints}
                </div>
              )}
            </div>
            <span className={`text-sm font-black ${tone(a.percentage || 0)}`}>
              {a.percentage || 0}%
            </span>
          </li>
        ))}
      </ul>
    </motion.section>
  );
}
