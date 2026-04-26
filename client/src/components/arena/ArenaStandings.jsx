import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Flame, Medal, Trophy } from 'lucide-react';
import AnimatedFlame from '../AnimatedFlame';

function formatMs(ms = 0) {
  const seconds = Math.max(0, Math.round(ms / 1000));
  return `${seconds}s`;
}

function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('') || '?';
}

function PodiumCard({ participant, place }) {
  const theme = place === 1
    ? { bg: '#F97316', border: '#9a3412', text: 'text-white' }
    : place === 2
      ? { bg: '#cbd5e1', border: '#64748b', text: 'text-slate-900' }
      : { bg: '#f59e0b', border: '#b45309', text: 'text-slate-900' };

  const heights = place === 1 ? 'min-h-[240px] md:min-h-[260px]' : place === 2 ? 'min-h-[210px]' : 'min-h-[190px]';

  return (
    <article
      className={`relative overflow-hidden rounded-[2rem] border-2 ${heights} p-5 ${theme.text}`}
      style={{ background: theme.bg, borderColor: theme.border, boxShadow: `0 8px 0 ${theme.border}` }}
    >
      <div className="absolute -right-10 -top-12 font-black leading-none opacity-15" style={{ fontSize: '8rem' }}>#{place}</div>
      <div className="relative z-10 flex h-full flex-col justify-between gap-6">
        <div className="flex items-center justify-between gap-3">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-black/15 text-xl font-black">
            {initials(participant?.displayName)}
          </div>
          {place === 1 ? <Crown size={28} /> : <Medal size={22} />}
        </div>
        <div>
          <p className="truncate text-lg font-black sm:text-xl">{participant?.displayName || 'Игрок'}</p>
          <p className="mt-1 font-mono text-4xl font-black tracking-tight sm:text-5xl">{participant?.score || 0}</p>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] opacity-70">очков</p>
        </div>
      </div>
    </article>
  );
}

export default function ArenaStandings({
  participants = [],
  compact = false,
  title = 'Таблица',
  variant = 'panel',
  limit = 8
}) {
  const top = (participants || []).slice(0, limit);

  if (variant === 'podium') {
    const [first, second, third] = participants || [];
    return (
      <section
        className="rounded-[2rem] border-2 border-slate-900 bg-white p-4 text-slate-900 dark:border-white dark:bg-slate-900 dark:text-white"
        style={{ boxShadow: '0 6px 0 var(--shadow-chunky, #1f1a14)' }}
      >
        <div className="mb-4 flex items-center gap-3">
          <div
            className="grid h-12 w-12 place-items-center rounded-2xl border-2 border-slate-900 bg-primary-500 text-white dark:border-white"
            style={{ boxShadow: '0 4px 0 #9a3412' }}
          >
            <Trophy size={22} strokeWidth={2.6} />
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-primary-600 dark:text-primary-300">Final</p>
            <h3 className="text-2xl font-black tracking-tight sm:text-3xl">{title}</h3>
          </div>
        </div>
        <div className="grid items-end gap-3 sm:grid-cols-3">
          {second && <PodiumCard participant={second} place={2} />}
          {first && <PodiumCard participant={first} place={1} />}
          {third && <PodiumCard participant={third} place={3} />}
        </div>
      </section>
    );
  }

  return (
    <section
      className="rounded-[2rem] border-2 border-slate-900 bg-white p-4 text-slate-900 dark:border-white dark:bg-slate-900 dark:text-white"
      style={{ boxShadow: '0 6px 0 var(--shadow-chunky, #1f1a14)' }}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-primary-600 dark:text-primary-300">Leaderboard</p>
          <h3 className="text-2xl font-black tracking-tight">{title}</h3>
        </div>
        <div
          className="grid h-11 w-11 place-items-center rounded-2xl border-2 border-slate-900 bg-primary-500 text-white dark:border-white"
          style={{ boxShadow: '0 4px 0 #9a3412' }}
        >
          <Trophy size={20} strokeWidth={2.6} />
        </div>
      </div>

      {top.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-5 text-sm font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
          Пока нет игроков.
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {top.map((participant, index) => {
              const place = participant.liveRank || participant.rank || index + 1;
              const isFirst = index === 0;
              const currentStreak = participant.currentStreak || participant.streak || 0;
              const hotCombo = currentStreak >= 3;

              return (
                <motion.div
                  key={participant._id || `${participant.displayName}-${index}`}
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  className={`relative flex items-center gap-3 rounded-2xl border-2 px-3 py-3 ${
                    isFirst
                      ? 'border-primary-700 bg-primary-50 dark:border-primary-300 dark:bg-primary-900/30'
                      : hotCombo
                        ? 'border-amber-700 bg-amber-50 dark:border-amber-300 dark:bg-amber-900/20'
                        : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800'
                  }`}
                  style={{ boxShadow: isFirst ? '0 3px 0 #9a3412' : hotCombo ? '0 3px 0 #b45309' : '0 3px 0 #cbd5e1' }}
                >
                  <div className={`relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl border-2 text-sm font-black ${
                    isFirst
                      ? 'border-slate-900 bg-primary-500 text-white dark:border-white'
                      : 'border-slate-300 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
                  }`}>
                    {index < 3 ? <Medal size={18} strokeWidth={2.6} /> : place}
                  </div>
                  <div className="relative min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {participant.crown && (
                        <motion.span
                          initial={{ scale: 0, rotate: -20 }}
                          animate={{ scale: [1, 1.15, 1], rotate: [0, -5, 5, 0] }}
                          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                          className="inline-flex items-center justify-center"
                          title="Лидер · корона"
                        >
                          <Crown size={16} className="fill-amber-400 text-amber-600 drop-shadow-[0_0_6px_rgba(251,191,36,0.7)]" strokeWidth={2.4} />
                        </motion.span>
                      )}
                      <p className="truncate text-sm font-black text-slate-900 dark:text-white">{participant.displayName}</p>
                      {hotCombo && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="inline-flex items-center gap-0.5 rounded-full border-2 border-amber-700 bg-amber-300 px-2 py-0.5 text-[10px] font-black text-slate-900"
                          style={{ boxShadow: '0 2px 0 #78350f' }}
                        >
                          <AnimatedFlame streak={currentStreak} size={10} /> x{currentStreak}
                        </motion.span>
                      )}
                    </div>
                    {!compact && (
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1"><AnimatedFlame streak={participant.bestStreak || 0} size={12} className="text-amber-500" /> {participant.bestStreak || 0}</span>
                        <span>{formatMs(participant.totalResponseTimeMs)}</span>
                        {participant.lastAnswer && (
                          <motion.span
                            key={`${participant.lastAnswer.questionId || ''}-${participant.score}`}
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`font-black ${participant.lastAnswer.isCorrect ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}
                          >
                            {participant.lastAnswer.isCorrect ? '+' : ''}{participant.lastAnswer.pointsAwarded || 0}
                          </motion.span>
                        )}
                      </div>
                    )}
                  </div>
                  <motion.div
                    key={participant.score || 0}
                    initial={{ scale: 1.2, color: '#f59e0b' }}
                    animate={{ scale: 1, color: 'currentColor' }}
                    transition={{ duration: 0.4 }}
                    className="relative text-right text-slate-900 dark:text-white"
                  >
                    <p className="font-mono text-2xl font-black">{participant.score || 0}</p>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">pts</p>
                  </motion.div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </section>
  );
}
