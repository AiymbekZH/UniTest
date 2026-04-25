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
      <section className="rounded-[2rem] border-2 border-white/15 bg-black/50 p-4 text-white backdrop-blur">
        <div className="mb-4 flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary-500 text-white" style={{ boxShadow: '0 5px 0 #9a3412' }}>
            <Trophy size={22} />
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-primary-300">Final</p>
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
    <section className="rounded-[2rem] border-2 border-white/15 bg-black/50 p-4 text-white backdrop-blur">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-primary-300">Leaderboard</p>
          <h3 className="text-2xl font-black tracking-tight">{title}</h3>
        </div>
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary-500 text-white" style={{ boxShadow: '0 4px 0 #9a3412' }}>
          <Trophy size={20} />
        </div>
      </div>

      {top.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-white/15 bg-white/5 p-5 text-sm font-semibold text-white/55">
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
                      ? 'border-primary-500/60 bg-primary-500/20'
                      : hotCombo
                        ? 'border-amber-400/50 bg-amber-400/10'
                        : 'border-white/15 bg-white/8'
                  }`}
                >
                  <div className={`relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-sm font-black ${
                    isFirst ? 'bg-primary-500 text-white' : 'bg-white/10 text-white'
                  }`}>
                    {index < 3 ? <Medal size={18} /> : place}
                  </div>
                  <div className="relative min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-black">{participant.displayName}</p>
                      {hotCombo && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="inline-flex items-center gap-0.5 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-black text-slate-900"
                        >
                          <AnimatedFlame streak={currentStreak} size={10} /> x{currentStreak}
                        </motion.span>
                      )}
                    </div>
                    {!compact && (
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] font-semibold text-white/50">
                        <span className="inline-flex items-center gap-1"><AnimatedFlame streak={participant.bestStreak || 0} size={12} className="text-amber-300" /> {participant.bestStreak || 0}</span>
                        <span>{formatMs(participant.totalResponseTimeMs)}</span>
                        {participant.lastAnswer && (
                          <motion.span
                            key={`${participant.lastAnswer.questionId || ''}-${participant.score}`}
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={participant.lastAnswer.isCorrect ? 'text-emerald-300' : 'text-red-300'}
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
                    animate={{ scale: 1, color: '#ffffff' }}
                    transition={{ duration: 0.4 }}
                    className="relative text-right"
                  >
                    <p className="font-mono text-2xl font-black">{participant.score || 0}</p>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/40">pts</p>
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
