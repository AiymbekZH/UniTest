import { Link } from 'react-router-dom';
import {
  Sparkles, Trophy, Flame, Medal, Target, Star,
  BarChart3, Users, ArrowRight
} from 'lucide-react';
import SectionHeader from '../SectionHeader';
import StatTile from '../StatTile';

export default function PublicOverviewTab({
  copy, t, progress, creatorStats, formattedBadges, publicTests,
  onGoTests, onGoAchievements
}) {
  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={copy.tabPublicOverview}
        title={copy.overview}
        subtitle={copy.publicOverviewSubtitle}
      />

      {/* Stats tiles */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile icon={Sparkles} label={copy.level}          value={progress?.level || 1}                          tone="primary" />
        <StatTile icon={Trophy}   label={copy.xp}             value={progress?.xp || 0}                             tone="blue" />
        <StatTile icon={Flame}    label={copy.currentStreak}  value={progress?.currentStreakDays || 0}              tone="amber" />
        <StatTile icon={Medal}    label={copy.bestStreak}     value={progress?.longestStreakDays || 0}              tone="emerald" />
        <StatTile icon={Target}   label={copy.completedExams} value={progress?.stats?.totalCompleted || 0}          tone="blue" />
        <StatTile icon={Star}     label={copy.perfectScores}  value={progress?.stats?.perfectScores || 0}           tone="amber" />
      </div>

      {/* Creator stats + badges preview */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="chunky-card p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{copy.creatorStats}</p>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-300">
              <BarChart3 size={15} />
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('testsCreated')}</p>
              <p className="mt-1 font-mono text-xl font-black text-dark">{creatorStats?.testsCreated || 0}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{copy.publicRating}</p>
              <p className="mt-1 font-mono text-xl font-black text-dark">{creatorStats?.publicAverageRating || 0}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{copy.publicPlays}</p>
              <p className="mt-1 font-mono text-xl font-black text-dark">{creatorStats?.publicPlays || 0}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{copy.publishedTests}</p>
              <p className="mt-1 font-mono text-xl font-black text-dark">{creatorStats?.publicTestsCount || 0}</p>
            </div>
          </div>
        </section>

        <section className="chunky-card p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{copy.badges}</p>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-300">
              <Sparkles size={15} />
            </div>
          </div>
          {formattedBadges.length > 0 ? (
            <>
              <p className="mt-4 font-mono text-3xl font-black text-dark">{formattedBadges.length}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {formattedBadges.slice(0, 6).map((badge) => (
                  <span
                    key={`${badge.key}-${badge.unlockedAt}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-black text-amber-700 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200"
                  >
                    <Sparkles size={10} />
                    {badge.label}
                  </span>
                ))}
                {formattedBadges.length > 6 && (
                  <button
                    type="button"
                    onClick={onGoAchievements}
                    className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                  >
                    +{formattedBadges.length - 6}
                  </button>
                )}
              </div>
            </>
          ) : (
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{copy.noBadges}</p>
          )}
        </section>
      </div>

      {/* Portfolio preview */}
      <section className="chunky-card p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{copy.creatorPortfolio}</p>
            <h3 className="mt-1 text-lg font-black text-dark">{copy.publicTests}</h3>
          </div>
          {publicTests.length > 0 ? (
            <button
              type="button"
              onClick={onGoTests}
              className="inline-flex items-center gap-1.5 rounded-full border-2 border-slate-900 bg-white px-3 py-1.5 text-xs font-black text-slate-900 active:translate-y-[2px] dark:border-white dark:bg-slate-900 dark:text-white"
              style={{ boxShadow: '0 3px 0 #0f172a' }}
            >
              {copy.viewAllPublished} <ArrowRight size={13} />
            </button>
          ) : null}
        </div>

        {publicTests.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{copy.noPublicTests}</p>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {publicTests.slice(0, 6).map((test) => (
              <Link
                key={test._id}
                to={`/test-profile/${test.shareLink}`}
                className="group rounded-2xl border-2 border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-primary-400 dark:border-slate-700 dark:bg-slate-900/60"
              >
                <p className="line-clamp-1 text-sm font-black text-dark group-hover:text-primary-600">{test.title}</p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  <span>{test.questions?.length || 0} {t('questions')}</span>
                  <span className="inline-flex items-center gap-1"><Users size={10} /> {test.attemptCount || 0}</span>
                  <span className="inline-flex items-center gap-1"><Star size={10} /> {Number(test.rating || 0).toFixed(1)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
