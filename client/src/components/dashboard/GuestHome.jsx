import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  Compass,
  Flame,
  Globe,
  Play,
  Sparkles,
  Star,
  Trophy,
  Users
} from 'lucide-react';
import api from '../../services/api';
import TestCoverArtwork from '../TestCoverArtwork';

/**
 * GuestHome — Home tab content for non-authenticated visitors.
 *
 * Replaces the previous null state with a sales-y, scrollable surface that:
 *   - shows three benefit pillars
 *   - renders 6 most popular public tests as a sneak-peek grid
 *   - has a final CTA strip nudging to register
 *
 * Reuses the chunky/paper visual language used on the rest of the site.
 *
 * Props:
 *   - copy           localized strings from dashboardCopy[lang]
 *   - t              i18n function from useLanguage
 *   - onExplore      switch to Explore tab
 *   - onRegister     navigate to /register
 *   - onLogin        navigate to /auth (login)
 *   - onOpenTest     (test) => navigate(`/test-profile/${test.shareLink}`)
 */
export default function GuestHome({
  copy,
  t,
  onExplore,
  onRegister,
  onLogin,
  onOpenTest
}) {
  const [popular, setPopular] = useState([]);
  const [loading, setLoading] = useState(true);
  const [coversMap, setCoversMap] = useState({});

  // Pull a small set of popular public tests as a sneak-peek.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get('/tests', { params: { sort: 'popular', page: 1, limit: 6 } })
      .then((res) => {
        if (!cancelled) setPopular(res.data?.tests || []);
      })
      .catch(() => {
        if (!cancelled) setPopular([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Lazy-load covers once tests arrive (mirrors the auth-path behaviour).
  useEffect(() => {
    if (!popular.length) return;
    const missing = popular.map((p) => p._id).filter((id) => !(id in coversMap));
    if (!missing.length) return;
    api
      .get('/tests/covers', { params: { ids: missing.join(',') } })
      .then((res) => {
        const update = {};
        missing.forEach((id) => {
          update[id] = res.data?.[id] || '';
        });
        setCoversMap((prev) => ({ ...prev, ...update }));
      })
      .catch(() => {});
  }, [popular, coversMap]);

  const pillars = [
    {
      Icon: Compass,
      title: copy.guestPillarBrowseTitle,
      desc: copy.guestPillarBrowseDesc,
      accent: { fill: '#fde68a', border: '#7c2d12', ink: '#7c2d12' }
    },
    {
      Icon: Flame,
      title: copy.guestPillarStreakTitle,
      desc: copy.guestPillarStreakDesc,
      accent: { fill: '#fecdd3', border: '#9f1239', ink: '#9f1239' }
    },
    {
      Icon: Trophy,
      title: copy.guestPillarCompeteTitle,
      desc: copy.guestPillarCompeteDesc,
      accent: { fill: '#bae6fd', border: '#075985', ink: '#075985' }
    }
  ];

  const stats = [
    { Icon: Globe, value: copy.guestStatTestsValue, label: copy.guestStatTestsLabel },
    { Icon: Users, value: copy.guestStatLearnersValue, label: copy.guestStatLearnersLabel },
    { Icon: Sparkles, value: copy.guestStatStreakValue, label: copy.guestStatStreakLabel }
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Hero CTA strip — chunky bar with two big buttons */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative flex flex-col items-start gap-4 rounded-3xl border-[3px] border-slate-900 bg-gradient-to-br from-[#FFF8EE] via-[#FFFBF2] to-[#FCEBC0] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
        style={{ boxShadow: '0 8px 0 #0f172a' }}
      >
        <div className="max-w-xl">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700/85">
            {copy.guestCtaEyebrow}
          </p>
          <h2 className="mt-2 text-xl font-black tracking-tight sm:text-2xl">
            {copy.guestCtaTitle}
          </h2>
          <p className="mt-1.5 text-sm text-slate-700/80 sm:text-[15px]">
            {copy.guestCtaDesc}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onRegister}
            className="inline-flex items-center gap-2 rounded-2xl border-[3px] border-slate-900 bg-amber-400 px-4 py-2.5 text-sm font-black text-slate-900 transition-transform active:translate-y-[2px]"
            style={{ boxShadow: '0 4px 0 #0f172a' }}
          >
            <Sparkles size={15} strokeWidth={2.8} />
            {copy.guestCta}
          </button>
          <button
            type="button"
            onClick={onLogin}
            className="inline-flex items-center gap-2 rounded-2xl border-[3px] border-slate-900 bg-white px-4 py-2.5 text-sm font-black text-slate-900 transition-transform active:translate-y-[2px]"
            style={{ boxShadow: '0 4px 0 #0f172a' }}
          >
            {copy.guestLogin}
          </button>
        </div>
      </motion.div>

      {/* Three pillars */}
      <motion.div
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } } }}
        className="grid gap-4 [&>*]:min-w-0 sm:grid-cols-3"
      >
        {pillars.map((p, i) => (
          <motion.div
            key={i}
            variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
            whileHover={{ y: -3 }}
            className="rounded-3xl border-[3px] border-slate-900 bg-white p-5 transition-shadow"
            style={{ boxShadow: '0 6px 0 #0f172a' }}
          >
            <span
              className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border-[3px]"
              style={{
                backgroundColor: p.accent.fill,
                borderColor: p.accent.border,
                color: p.accent.ink,
                boxShadow: `0 4px 0 ${p.accent.border}`
              }}
            >
              <p.Icon size={20} strokeWidth={2.6} />
            </span>
            <h3 className="mt-4 text-base font-black tracking-tight text-slate-900 sm:text-lg">
              {p.title}
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{p.desc}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Aggregate stats strip */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut', delay: 0.1 }}
        className="grid gap-3 [&>*]:min-w-0 sm:grid-cols-3"
      >
        {stats.map((s, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-2xl border-[3px] border-slate-200 bg-white px-4 py-3.5 dark:border-slate-700 dark:bg-slate-800"
            style={{ boxShadow: '0 4px 0 #e2e8f0' }}
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
              <s.Icon size={16} strokeWidth={2.6} />
            </span>
            <div className="leading-tight">
              <p className="font-mono text-lg font-black text-dark">{s.value}</p>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-gray-400">
                {s.label}
              </p>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Popular tests sneak-peek */}
      <div>
        <div className="mb-3 flex items-end justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700/85">
              {copy.guestPopularEyebrow}
            </p>
            <h3 className="mt-1 text-base font-black tracking-tight text-slate-900 sm:text-lg">
              {copy.guestPopularTitle}
            </h3>
          </div>
          <button
            type="button"
            onClick={onExplore}
            className="inline-flex items-center gap-1.5 text-xs font-black text-amber-700 hover:text-amber-800"
          >
            {copy.guestPopularCta}
            <ArrowRight size={13} strokeWidth={2.8} />
          </button>
        </div>

        {loading ? (
          <div className="grid gap-4 [&>*]:min-w-0 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="rounded-3xl border-[3px] border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800"
                style={{ boxShadow: '0 4px 0 #e2e8f0' }}
              >
                <div className="mb-3 aspect-[16/9] animate-pulse rounded-2xl bg-gray-100 dark:bg-slate-700" />
                <div className="mb-2 h-4 w-2/3 animate-pulse rounded bg-gray-100 dark:bg-slate-700" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-gray-50 dark:bg-slate-700/50" />
              </div>
            ))}
          </div>
        ) : popular.length > 0 ? (
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } } }}
            className="grid gap-4 [&>*]:min-w-0 sm:grid-cols-2 lg:grid-cols-3"
          >
            {popular.map((test) => (
              <motion.button
                type="button"
                key={test._id}
                variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                whileHover={{ y: -3 }}
                onClick={() => onOpenTest(test)}
                className="group flex flex-col overflow-hidden rounded-3xl border-[3px] border-slate-900 bg-white text-left transition-shadow active:translate-y-[1px] dark:bg-slate-900"
                style={{ boxShadow: '0 6px 0 #0f172a' }}
              >
                <TestCoverArtwork
                  coverImage={test.coverImage || coversMap[test._id]}
                  title={test.title}
                  className="w-full"
                  imageClassName="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  style={{ aspectRatio: '16 / 9' }}
                />
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <div className="flex items-center justify-between text-[10px] text-gray-400">
                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                      <Globe size={9} /> {t('publicTest')}
                    </span>
                    <span>
                      {test.questions?.length || 0} {t('questions')}
                    </span>
                  </div>
                  <h4 className="text-sm font-black tracking-tight text-slate-900 line-clamp-1 dark:text-white">
                    {test.title}
                  </h4>
                  <p className="text-xs leading-relaxed text-slate-500 line-clamp-2">
                    {test.description || t('noDescription')}
                  </p>
                  <div className="mt-auto flex items-center justify-between pt-2">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          size={11}
                          className={
                            s <= Math.round(test.rating || 0)
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-gray-200 dark:text-slate-700'
                          }
                        />
                      ))}
                      <span className="ml-1 text-[10px] text-gray-500">
                        {(test.rating || 0).toFixed(1)}
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-black text-amber-700">
                      <Play size={11} strokeWidth={2.8} />
                      {copy.guestPopularPlay}
                    </span>
                  </div>
                </div>
              </motion.button>
            ))}
          </motion.div>
        ) : (
          <p className="text-sm text-gray-400">{copy.guestPopularEmpty}</p>
        )}
      </div>

      {/* Bottom mini-CTA — final nudge */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut', delay: 0.15 }}
        className="flex flex-col items-start gap-3 rounded-3xl border-[3px] border-slate-900 bg-emerald-50 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6 dark:bg-emerald-900/20"
        style={{ boxShadow: '0 6px 0 #0f172a' }}
      >
        <div className="flex items-center gap-3">
          <span
            className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border-[3px] border-emerald-900 bg-emerald-200 text-emerald-900"
            style={{ boxShadow: '0 4px 0 #064e3b' }}
          >
            <CheckCircle2 size={20} strokeWidth={2.6} />
          </span>
          <div>
            <p className="text-base font-black tracking-tight text-slate-900 sm:text-lg">
              {copy.guestFinalTitle}
            </p>
            <p className="text-xs text-slate-700/80 sm:text-sm">{copy.guestFinalDesc}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onRegister}
          className="inline-flex items-center gap-2 rounded-2xl border-[3px] border-emerald-900 bg-emerald-500 px-4 py-2.5 text-sm font-black text-white transition-transform active:translate-y-[2px]"
          style={{ boxShadow: '0 4px 0 #064e3b' }}
        >
          {copy.guestCta}
          <ArrowRight size={15} strokeWidth={2.8} />
        </button>
      </motion.div>
    </div>
  );
}
