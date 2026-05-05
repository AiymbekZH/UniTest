import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Flag, Tag } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import UsernameBadge from '../../../components/UsernameBadge';
import { getQuestionTypeLabel } from '../utils/questionTypeLabel';

// Tags + question type breakdown + creator strip.
//
// Splits cleanly out of the legacy "header card" mega-component. Keeps
// the chunky-card neobrutalist look (border + shadow) and exposes a
// single onReport callback so the page-level state stays in
// TestProfilePage.jsx.

export default function TestMetaCard({ test, currentUserId, onReport }) {
  const { t } = useLanguage();

  // Build {type → count} from the questions array. Done at render time
  // (cheap, < 100 questions typically) so the parent doesn't have to
  // memo it.
  const questionTypes = {};
  test.questions?.forEach(q => {
    questionTypes[q.type] = (questionTypes[q.type] || 0) + 1;
  });

  const hasTypes = Object.keys(questionTypes).length > 0;
  const hasTags = Array.isArray(test.tags) && test.tags.length > 0;

  if (!hasTypes && !hasTags && !test.creator) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.05 }}
      className="chunky-card p-5 sm:p-6"
    >
      {/* Tags */}
      {hasTags && (
        <div className="mb-4 flex flex-wrap gap-2">
          {test.tags.map((tag, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 rounded-full border-2 border-slate-900 bg-amber-100 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-slate-900 dark:border-white dark:bg-amber-900/30 dark:text-amber-100"
            >
              <Tag size={10} strokeWidth={2.6} /> {tag}
            </span>
          ))}
        </div>
      )}

      {/* Question types */}
      {hasTypes && (
        <div className="mb-4">
          <h3 className="mb-2 text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
            {t('questionTypes')}
          </h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(questionTypes).map(([type, count]) => (
              <span
                key={type}
                className="inline-flex items-center gap-1.5 rounded-full border-2 border-slate-900 bg-white px-3 py-1 text-[11px] font-bold text-slate-700 dark:border-white dark:bg-slate-800 dark:text-slate-200"
              >
                {getQuestionTypeLabel(type, t)}
                <span className="rounded-full bg-slate-900 px-1.5 py-0.5 text-[9px] font-black text-white dark:bg-white dark:text-slate-900">
                  {count}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Creator strip */}
      {test.creator && (
        <div className="flex items-center gap-3 border-t-2 border-slate-200 pt-4 dark:border-slate-700">
          <Link
            to={test.creator?._id ? `/profile/${test.creator._id}` : '#'}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-slate-900 bg-amber-300 text-sm font-black text-slate-900 dark:border-white"
            aria-label={`${test.creator.firstName} ${test.creator.lastName}`}
          >
            {test.creator.avatar ? (
              <img src={test.creator.avatar} alt="" className="h-full w-full object-cover" />
            ) : (
              <>{test.creator.firstName?.[0]}{test.creator.lastName?.[0]}</>
            )}
          </Link>
          <div className="min-w-0 flex-1">
            <UsernameBadge user={test.creator} size="sm" layout="col" accent="orange" />
            <p className="mt-0.5 text-[11px] font-bold text-slate-400 dark:text-slate-500">
              {test.creator.role === 'teacher'
                ? t('teacher')
                : test.creator.role === 'admin'
                  ? t('adminRole')
                  : t('student')}
            </p>
          </div>
          {currentUserId && test.creator?._id !== currentUserId && (
            <button
              type="button"
              onClick={onReport}
              className="rounded-xl border-2 border-slate-900 bg-white p-2 text-slate-400 transition hover:bg-orange-100 hover:text-orange-500 dark:border-white dark:bg-slate-800 dark:hover:bg-orange-900/30"
              title={t('report')}
              aria-label={t('report')}
            >
              <Flag size={14} strokeWidth={2.6} />
            </button>
          )}
        </div>
      )}
    </motion.section>
  );
}
