import { motion } from 'framer-motion';
import { BarChart3, Users } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';

// 5-bucket histogram of all submitted attempt percentages on this
// test, plus average / median / your-percentile.
//
// Server response shape (results.js → /distribution/:testId):
//   {
//     total: number,
//     average: number (0..100),
//     median:  number (0..100),
//     myPercentile: number (0..100, only for logged-in users with
//                            at least one completed attempt),
//     myBucket: number (0..4 index into the buckets array),
//     buckets: [
//       { range: '0-19',   count },
//       { range: '20-39',  count },
//       { range: '40-59',  count },
//       { range: '60-79',  count },
//       { range: '80-100', count },
//     ]
//   }
// `pct` (per-bucket share of total) is derived client-side.

const BAR_COLORS = [
  'bg-red-400 dark:bg-red-500',
  'bg-orange-400 dark:bg-orange-500',
  'bg-amber-400 dark:bg-amber-500',
  'bg-lime-400 dark:bg-lime-500',
  'bg-emerald-400 dark:bg-emerald-500',
];

export default function ScoreDistributionCard({ distribution }) {
  const { t } = useLanguage();
  if (!distribution || !distribution.total) return null;

  // Highest count is the normalisation reference for bar heights —
  // we render relative pixel heights, not relative to total, so a
  // bucket of 4 next to a bucket of 5 still looks visibly different.
  const maxCount = Math.max(...distribution.buckets.map(b => b.count || 0), 1);

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.3 }}
      className="chunky-card p-5"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
          <BarChart3 size={13} strokeWidth={2.6} />
          {t('scoreDistribution')}
        </h3>
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400">
          <Users size={10} strokeWidth={2.6} />
          {t('totalCompletions', { count: distribution.total })}
        </span>
      </div>

      {/* Bars */}
      <div className="flex h-32 items-end gap-1.5">
        {distribution.buckets.map((b, i) => {
          const heightPct = (b.count / maxCount) * 100;
          const isMine = distribution.myBucket === i;
          return (
            <div key={b.range} className="flex flex-1 flex-col items-center justify-end">
              <span className={`mb-1 text-[10px] font-black tabular-nums ${
                isMine ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'
              }`}>
                {b.count}
              </span>
              <div
                className={`relative w-full overflow-hidden rounded-t-lg border-2 border-b-0 border-slate-900 dark:border-white ${BAR_COLORS[i]} ${
                  isMine ? 'ring-2 ring-amber-500 ring-offset-1 dark:ring-offset-slate-900' : ''
                }`}
                style={{ height: `${Math.max(heightPct, 4)}%` }}
                title={`${b.range}%: ${b.count}`}
                aria-label={`${b.range}%: ${b.count}`}
              />
              <span className={`mt-1 text-[9px] font-black uppercase tracking-wide ${
                isMine ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'
              }`}>
                {b.range}
              </span>
            </div>
          );
        })}
      </div>

      {/* Footer stats */}
      <div className="mt-4 grid grid-cols-2 gap-3 border-t-2 border-slate-200 pt-4 dark:border-slate-700 sm:grid-cols-3">
        <div>
          <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">
            {t('averageScoreLabel')}
          </div>
          <div className="text-base font-black text-slate-900 dark:text-white">
            {Number(distribution.average || 0).toFixed(0)}%
          </div>
        </div>
        <div>
          <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">
            {t('medianScoreLabel')}
          </div>
          <div className="text-base font-black text-slate-900 dark:text-white">
            {Number(distribution.median || 0).toFixed(0)}%
          </div>
        </div>
        {typeof distribution.myPercentile === 'number' && (
          <div className="col-span-2 sm:col-span-1">
            <div className="text-[9px] font-black uppercase tracking-widest text-amber-500">
              {/* myPercentile = % of attempts strictly below user's score.
                  "Top N%" = 100 - myPercentile, clamped to 1..100. */}
              {t('yourPercentile', {
                percent: Math.max(1, 100 - distribution.myPercentile).toFixed(0),
              })}
            </div>
          </div>
        )}
      </div>
    </motion.section>
  );
}
