import { Sparkles } from 'lucide-react';
import SectionHeader from '../SectionHeader';

export default function PublicAchievementsTab({ copy, formattedBadges }) {
  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={copy.tabPublicAchievements}
        title={copy.badges}
        subtitle={copy.publicAchievementsSubtitle}
      />

      <section className="chunky-card p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <p className="font-mono text-2xl font-black text-dark">{formattedBadges.length}</p>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-300">
            <Sparkles size={18} />
          </div>
        </div>

        {formattedBadges.length === 0 ? (
          <div className="mt-4 flex flex-col items-center justify-center py-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
              <Sparkles size={22} />
            </div>
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{copy.noBadges}</p>
          </div>
        ) : (
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {formattedBadges.map((badge) => (
              <div
                key={`${badge.key}-${badge.unlockedAt}`}
                className="flex items-center gap-3 rounded-2xl border-2 border-amber-300 bg-amber-50 px-3 py-2.5 dark:border-amber-700 dark:bg-amber-900/20"
              >
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white">
                  <Sparkles size={14} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-black text-amber-800 dark:text-amber-200">{badge.label}</p>
                  <p className="mt-0.5 text-[10px] text-amber-600/80 dark:text-amber-300/70">
                    {badge.unlockedAt ? new Date(badge.unlockedAt).toLocaleDateString() : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
