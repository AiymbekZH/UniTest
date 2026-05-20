import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Eye, Sparkles } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import { getQuestionTypeLabel } from '../utils/questionTypeLabel';

// "Sample question" preview. Picks one question from the test (the
// shortest-prompt one we can find — gives the most "preview-like"
// impression) and renders it with answer options. We deliberately do
// NOT mark the correct answer here — the goal is to convey style,
// not leak content. For essay/fill-blank we fall back to a generic
// preview text.
//
// We also strictly cap option text rendered to 8 options to avoid
// dumping a 50-option matching question into the page.

const MAX_OPTIONS = 8;

function pickSampleQuestion(questions) {
  if (!Array.isArray(questions) || questions.length === 0) return null;
  // Prefer single/multi-choice with a sane number of options.
  const candidates = questions.filter(q =>
    (q.type === 'single-choice' || q.type === 'multiple-choice' || q.type === 'true-false') &&
    Array.isArray(q.options) &&
    q.options.length > 0,
  );
  const pool = candidates.length > 0 ? candidates : questions;
  // Sort by prompt length ascending — short prompts make the best
  // preview because they fit without wrapping awkwardly. Field name
  // on the Test schema is `questionText`; we also try `text`/`question`
  // defensively in case a future schema rename lands.
  const promptOf = (q) => q.questionText || q.text || q.question || '';
  return [...pool].sort((a, b) => promptOf(a).length - promptOf(b).length)[0];
}

export default function QuestionPreviewCard({ test }) {
  const { t } = useLanguage();
  const sample = useMemo(() => pickSampleQuestion(test.questions), [test.questions]);
  if (!sample) return null;

  const options = (sample.options || []).slice(0, MAX_OPTIONS);
  const isOpen = sample.type === 'essay' || sample.type === 'fill-blank';

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.2 }}
      className="chunky-card overflow-hidden p-0"
    >
      {/* Header strip */}
      <div className="flex items-center justify-between border-b-2 border-slate-200 bg-amber-50 px-5 py-3 dark:border-slate-700 dark:bg-amber-900/20">
        <h3 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-300">
          <Eye size={13} strokeWidth={2.6} />
          {t('seeSampleQuestion')}
        </h3>
        <span className="rounded-full border-2 border-slate-900 bg-white px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-slate-700 dark:border-white dark:bg-slate-800 dark:text-slate-200">
          {getQuestionTypeLabel(sample.type, t)}
        </span>
      </div>

      <div className="p-5">
        <p className="text-[10px] font-bold italic text-slate-400">
          <Sparkles size={10} strokeWidth={2.6} className="mr-1 inline-block" />
          {t('sampleQuestionHint')}
        </p>

        {/* Question text — questionText comes from TipTap so it's HTML.
            Plain-text fallback for legacy `text`/`question` fields. */}
        {sample.questionText
          ? (
            <div
              className="prose prose-sm mt-2 max-w-none text-sm font-bold leading-relaxed text-slate-900 dark:prose-invert dark:text-white [&_*]:!my-0 [&_p]:!my-0"
              dangerouslySetInnerHTML={{ __html: sample.questionText }}
            />
          )
          : (
            <p className="mt-2 text-sm font-bold leading-relaxed text-slate-900 dark:text-white">
              {sample.text || sample.question || '—'}
            </p>
          )
        }

        {/* Options grid (or fake-blank for open-ended) */}
        {isOpen ? (
          <div className="mt-4 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-4 text-xs font-bold text-slate-400 dark:border-slate-600 dark:bg-slate-800">
            {sample.type === 'essay'
              ? t('essay') + '…'
              : '____________'}
          </div>
        ) : (
          <ul className="mt-4 space-y-2">
            {options.map((opt, i) => (
              <li
                key={i}
                className="flex items-center gap-3 rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 border-slate-900 bg-amber-100 text-[10px] font-black text-slate-900 dark:border-white">
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {typeof opt === 'string' ? opt : (opt.text || '—')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </motion.section>
  );
}
