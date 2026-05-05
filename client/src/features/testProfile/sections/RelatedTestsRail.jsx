import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, Users, Sparkles, User } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import TestCoverArtwork from '../../../components/TestCoverArtwork';

// Horizontal-scrolling rail of related tests. Server returns a mix
// from two sources:
//   - source: 'tag'      → matched by overlapping tags
//   - source: 'creator'  → fallback fill from same author
//
// We render up to 4 cards sized for a 2-column grid on mobile and a
// 4-column grid on desktop. The chip in each card's footer shows
// where the recommendation came from.

export default function RelatedTestsRail({ items }) {
  const { t } = useLanguage();
  if (!items || items.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.35 }}
      className="chunky-card p-5"
    >
      <h3 className="mb-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
        <Sparkles size={13} strokeWidth={2.6} className="text-amber-500" />
        {t('relatedTests')}
      </h3>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => {
          const link = `/test-profile/${item.shareLink}`;
          const isCreator = item.source === 'creator';
          return (
            <Link
              key={item._id}
              to={link}
              className="group relative flex flex-col overflow-hidden rounded-2xl border-2 border-slate-900 bg-white shadow-[3px_3px_0_rgba(15,23,42,0.9)] transition-all hover:-translate-y-0.5 hover:shadow-[5px_5px_0_rgba(15,23,42,0.9)] dark:border-white dark:bg-slate-800 dark:shadow-[3px_3px_0_rgba(255,255,255,0.6)] dark:hover:shadow-[5px_5px_0_rgba(255,255,255,0.6)]"
            >
              <div className="aspect-[4/3] w-full overflow-hidden border-b-2 border-slate-900 dark:border-white">
                <TestCoverArtwork
                  coverImage={item.coverImage}
                  title={item.title}
                  className="h-full w-full"
                />
              </div>

              <div className="flex flex-1 flex-col gap-1.5 p-3">
                <h4 className="line-clamp-2 text-[12px] font-black leading-tight text-slate-900 dark:text-white">
                  {item.title}
                </h4>

                <div className="mt-auto flex items-center justify-between gap-2 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-0.5">
                    <Star size={9} strokeWidth={2.6} className="text-amber-500" />
                    {item.rating ? Number(item.rating).toFixed(1) : '—'}
                  </span>
                  <span className="inline-flex items-center gap-0.5">
                    <Users size={9} strokeWidth={2.6} />
                    {item.attemptCount || 0}
                  </span>
                </div>

                <span
                  className={`inline-flex w-fit items-center gap-1 rounded-full border-2 border-slate-900 px-2 py-0.5 text-[8px] font-black uppercase tracking-wide dark:border-white ${
                    isCreator
                      ? 'bg-violet-200 text-violet-900 dark:bg-violet-900/40 dark:text-violet-100'
                      : 'bg-emerald-200 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100'
                  }`}
                >
                  {isCreator
                    ? <><User size={8} strokeWidth={2.6} /> {t('bySameCreator')}</>
                    : <><Sparkles size={8} strokeWidth={2.6} /> {t('byMatchingTags')}</>}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </motion.section>
  );
}
