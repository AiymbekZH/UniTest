import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';

// Top-5 leaderboard preview, lifted from the legacy sidebar. We keep
// the rendering logic here because it's the only place that consumes
// the `/results/leaderboard/:testId` shape and the row colour
// thresholds (80/50%) are layout-specific.

export default function LeaderboardPreview({ testId, leaderboard }) {
  const { t } = useLanguage();
  const rows = leaderboard?.leaderboard || [];

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.2 }}
      className="chunky-card p-5"
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">
          <Trophy size={14} strokeWidth={2.6} className="text-amber-500" />
          {t('leaderboard')}
        </h3>
        <Link
          to={`/leaderboard/${testId}`}
          className="text-[11px] font-black uppercase tracking-wide text-amber-600 transition hover:text-amber-700 dark:text-amber-400"
        >
          {t('viewAll')}
        </Link>
      </div>

      {rows.length > 0 ? (
        <ul className="space-y-1">
          {rows.slice(0, 5).map((entry, i) => (
            <li
              key={i}
              className={`flex items-center gap-3 py-2 ${
                i > 0 ? 'border-t-2 border-slate-100 dark:border-slate-700' : ''
              }`}
            >
              <span
                className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 border-slate-900 text-[10px] font-black dark:border-white ${
                  i === 0 ? 'bg-amber-400 text-slate-900' :
                  i === 1 ? 'bg-slate-200 text-slate-700 dark:bg-slate-600 dark:text-slate-200' :
                  i === 2 ? 'bg-orange-300 text-slate-900' :
                  'bg-white text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-slate-700 dark:text-slate-200">
                {entry.userName}
              </span>
              <span
                className={`text-[13px] font-black ${
                  entry.percentage >= 80 ? 'text-emerald-600 dark:text-emerald-400' :
                  entry.percentage >= 50 ? 'text-amber-500' :
                  'text-red-500'
                }`}
              >
                {entry.percentage}%
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="py-6 text-center">
          <Trophy size={20} className="mx-auto mb-1.5 text-slate-300 dark:text-slate-600" strokeWidth={2.4} />
          <p className="text-xs font-bold text-slate-400">{t('emptyLeaderboard')}</p>
        </div>
      )}
    </motion.section>
  );
}
