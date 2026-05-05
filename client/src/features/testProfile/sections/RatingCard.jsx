import { useState } from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';

// Combined "rate this test" + "rate the difficulty" card. Renders two
// 5-star rows — both work as buttons (click to rate) with hover preview.
//
// The parent owns the state (`myRating`, `myDifficulty`) so we can
// re-mount this without losing UX continuity, and so toasts fire from
// a single source.

function StarRow({ value, onChange, label, hint, color = 'amber' }) {
  const [hover, setHover] = useState(0);
  const fill = color === 'red'
    ? 'fill-red-400 text-red-400'
    : 'fill-amber-400 text-amber-400';

  return (
    <div>
      <h3 className="mb-2 text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
        {label}
      </h3>
      <div className="flex flex-wrap items-center gap-1">
        {[1, 2, 3, 4, 5].map(v => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            onMouseEnter={() => setHover(v)}
            onMouseLeave={() => setHover(0)}
            className="rounded-lg p-1 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-amber-400"
            aria-label={`${label} ${v}`}
          >
            <Star
              size={26}
              strokeWidth={2.4}
              className={v <= (hover || value) ? fill : 'text-slate-300 dark:text-slate-600'}
            />
          </button>
        ))}
        <span className="ml-2 truncate text-xs font-bold text-slate-500 dark:text-slate-400">
          {hint}
        </span>
      </div>
    </div>
  );
}

export default function RatingCard({ myRating, myDifficulty, onRate, onRateDifficulty }) {
  const { t } = useLanguage();

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.15 }}
      className="chunky-card p-5"
    >
      <StarRow
        value={myRating}
        onChange={onRate}
        label={t('rateTest')}
        hint={myRating > 0 ? `${t('yourRating')}: ${myRating}/5` : t('clickToRate')}
        color="amber"
      />

      <div className="mt-5 border-t-2 border-slate-200 pt-5 dark:border-slate-700">
        <StarRow
          value={myDifficulty}
          onChange={onRateDifficulty}
          label={t('rateDifficulty')}
          hint={myDifficulty > 0
            ? `${t('yourDifficultyRating')}: ${myDifficulty}/5`
            : t('clickToRateDifficulty')}
          color="red"
        />
      </div>
    </motion.section>
  );
}
