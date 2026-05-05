import { motion } from 'framer-motion';
import { BarChart3, Clock, Shield, Star, Users } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import TestCoverArtwork from '../../../components/TestCoverArtwork';
import { formatDateShort } from '../utils/formatDate';

// Hero card — replaces the AnimatedHero the legacy page used. We want
// a look that matches the rest of the chunky UI (hard borders, offset
// shadow) rather than the gradient-mesh hero used on Dashboard, so we
// render a native chunky-card with the cover + title + stats strip.
//
// Stats strip is 4 cells on desktop, wraps to 2×2 on mobile.

export default function TestHero({ test }) {
  const { t, lang } = useLanguage();
  const ratingDisplay = test.rating ? test.rating.toFixed(1) : '—';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="chunky-card overflow-hidden p-0"
    >
      {/* Cover */}
      <div className="relative border-b-2 border-slate-200 dark:border-slate-700">
        <TestCoverArtwork
          coverImage={test.coverImage}
          title={test.title}
          className="w-full"
          style={{ aspectRatio: '16 / 6' }}
          imageOverlayClassName="absolute inset-0 bg-gradient-to-t from-slate-950/35 via-slate-950/5 to-transparent"
        />
        {/* Eyebrow badge — public/private */}
        <span
          className={`absolute left-4 top-4 inline-flex items-center gap-1 rounded-full border-2 border-slate-900 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide dark:border-white ${
            test.settings?.isPublic
              ? 'bg-emerald-400 text-slate-900'
              : 'bg-slate-900 text-white'
          }`}
        >
          {test.settings?.isPublic ? t('publicTest') || 'public' : t('privateTest') || 'private'}
        </span>
      </div>

      {/* Title + description */}
      <div className="px-5 pt-5 sm:px-6">
        <h1 className="text-xl font-black leading-tight tracking-tight text-slate-900 dark:text-white sm:text-2xl">
          {test.title}
        </h1>
        {test.description && (
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            {test.description}
          </p>
        )}

        {/* Window chips — start / end dates */}
        <div className="mt-3 flex flex-wrap gap-2">
          {test.settings?.antiCheat?.blockTabSwitch && (
            <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-red-500 bg-red-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-red-600 dark:bg-red-900/20 dark:text-red-300">
              <Shield size={10} strokeWidth={2.6} /> anti-cheat
            </span>
          )}
          {test.settings?.startDate && (
            <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-slate-900 bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-900 dark:border-white dark:bg-emerald-900/30 dark:text-emerald-200">
              <Clock size={10} strokeWidth={2.6} /> {t('from')} {formatDateShort(test.settings.startDate, lang)}
            </span>
          )}
          {test.settings?.endDate && (
            <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-slate-900 bg-amber-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-amber-900 dark:border-white dark:bg-amber-900/30 dark:text-amber-200">
              <Clock size={10} strokeWidth={2.6} /> {t('until')} {formatDateShort(test.settings.endDate, lang)}
            </span>
          )}
          {test.settings?.variants?.enabled && (
            <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-slate-900 bg-violet-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-violet-900 dark:border-white dark:bg-violet-900/30 dark:text-violet-200">
              {test.settings.variants.count}× variants
            </span>
          )}
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 gap-0 border-t-2 border-slate-200 px-0 pt-0 dark:border-slate-700 sm:grid-cols-4">
        <Stat icon={<BarChart3 size={14} strokeWidth={2.6} />} label={t('questions')} value={test.questions?.length || 0} borderR />
        <Stat icon={<Clock size={14} strokeWidth={2.6} />} label={t('min')} value={test.settings?.timeLimit || '∞'} borderR />
        <Stat icon={<Users size={14} strokeWidth={2.6} />} label={t('totalParticipants') || t('attempts')} value={test.attemptCount || 0} borderR />
        <Stat icon={<Star size={14} strokeWidth={2.6} />} label={t('rating')} value={ratingDisplay} sublabel={test.ratingCount ? `${test.ratingCount}` : null} />
      </div>
    </motion.div>
  );
}

function Stat({ icon, label, value, sublabel, borderR }) {
  return (
    <div
      className={`flex flex-col items-center justify-center px-3 py-3 sm:py-4 ${
        borderR ? 'border-b-2 border-slate-200 dark:border-slate-700 sm:border-b-0 sm:border-r-2' : ''
      }`}
    >
      <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
        {icon}
        <span className="text-[10px] font-black uppercase tracking-wide">{label}</span>
      </div>
      <div className="mt-1 text-lg font-black leading-none text-slate-900 dark:text-white sm:text-xl">
        {value}
      </div>
      {sublabel && (
        <div className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">
          {sublabel}
        </div>
      )}
    </div>
  );
}
