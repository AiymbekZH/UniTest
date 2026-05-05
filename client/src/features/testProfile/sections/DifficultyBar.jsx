import { motion } from 'framer-motion';
import { useLanguage } from '../../../context/LanguageContext';
import { getDifficultyMeta } from '../utils/difficultyMeta';

// Five-segment "DNA" bar showing aggregate difficulty rating. Pulled
// out of the legacy header card so it can stand on its own and read
// the i18n-friendly metadata helper.
//
// Visual: chunky-card → header row (label / score) → 5-segment bar
// → footer with mini legend.

const LEVELS = [
  { level: 1, key: 'veryEasy',  bg: 'bg-emerald-400 dark:bg-emerald-500', text: 'text-emerald-500' },
  { level: 2, key: 'easy',      bg: 'bg-lime-400 dark:bg-lime-500',       text: 'text-lime-500' },
  { level: 3, key: 'medium',    bg: 'bg-amber-400 dark:bg-amber-500',     text: 'text-amber-500' },
  { level: 4, key: 'hard',      bg: 'bg-orange-400 dark:bg-orange-500',   text: 'text-orange-500' },
  { level: 5, key: 'veryHard',  bg: 'bg-red-500 dark:bg-red-500',         text: 'text-red-500' },
];

export default function DifficultyBar({ score, count }) {
  const { t } = useLanguage();
  const meta = getDifficultyMeta(score);
  const rounded = score ? Math.round(score) : 0;

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.1 }}
      className="chunky-card p-5"
    >
      {/* Header row */}
      <div className="mb-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h3 className="mb-1 text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
            {t('difficultyLabel')}
          </h3>
          <span className={`block truncate text-base font-black tracking-tight ${meta.color}`}>
            {t(meta.labelKey)}
          </span>
        </div>
        <div className="flex-shrink-0 text-right">
          <div className="flex items-baseline justify-end gap-1 text-2xl font-black leading-none text-slate-900 dark:text-white">
            {score ? Number(score).toFixed(1) : '0.0'}
            <span className="text-xs font-black text-slate-400">/ 5</span>
          </div>
          <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {t('difficultyVotes', { count: count || 0 })}
          </div>
        </div>
      </div>

      {/* DNA segments */}
      <div
        className="flex h-3 w-full overflow-hidden rounded-full border-2 border-slate-900 dark:border-white"
        role="img"
        aria-label={`${t('difficultyLabel')}: ${score ? score.toFixed(1) : '0'} / 5`}
      >
        {LEVELS.map(({ level, bg }) => (
          <div
            key={level}
            className={`h-full flex-1 transition-colors duration-500 ${
              rounded >= level ? bg : 'bg-slate-100 dark:bg-slate-700'
            } ${level < 5 ? 'border-r-2 border-slate-900 dark:border-white' : ''}`}
          />
        ))}
      </div>

      {/* Mini legend */}
      <div className="mt-2 flex justify-between gap-1">
        {LEVELS.map(({ level, key, text }) => (
          <span
            key={level}
            className={`flex-1 text-center text-[9px] font-black uppercase tracking-wider leading-none ${text}`}
          >
            {t(key)}
          </span>
        ))}
      </div>
    </motion.section>
  );
}
