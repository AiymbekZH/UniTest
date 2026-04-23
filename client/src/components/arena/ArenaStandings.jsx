import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Flame, Medal, Trophy } from 'lucide-react';

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

function podiumColor(place) {
  if (place === 1) return 'from-orange-400 via-amber-400 to-yellow-300';
  if (place === 2) return 'from-zinc-300 via-zinc-200 to-white';
  return 'from-orange-800 via-orange-500 to-amber-300';
}

function PodiumCard({ participant, place }) {
  return (
    <article className={`relative min-h-[210px] overflow-hidden rounded-[2rem] bg-gradient-to-br ${podiumColor(place)} p-5 text-black shadow-[0_28px_90px_-44px_rgba(0,0,0,0.95)]`}>
      <div className="absolute -right-10 -top-12 text-[8rem] font-black leading-none opacity-15">#{place}</div>
      <div className="relative z-10 flex h-full flex-col justify-between">
        <div className="flex items-center justify-between gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-[1.35rem] bg-black/12 text-2xl font-black">
            {initials(participant?.displayName)}
          </div>
          {place === 1 && <Crown size={30} />}
        </div>
        <div>
          <p className="truncate text-xl font-black">{participant?.displayName || 'Игрок'}</p>
          <p className="mt-1 text-4xl font-black tracking-tight">{participant?.score || 0}</p>
          <p className="text-xs font-black uppercase tracking-[0.18em] opacity-60">очков</p>
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
      <section className="rounded-[2.25rem] border border-white/10 bg-black/45 p-4 text-white shadow-[0_28px_90px_-52px_rgba(0,0,0,0.95)] backdrop-blur">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 text-black">
            <Trophy size={22} />
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-orange-300">Final</p>
            <h3 className="text-2xl font-black tracking-tight">{title}</h3>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {second && <PodiumCard participant={second} place={2} />}
          {first && <PodiumCard participant={first} place={1} />}
          {third && <PodiumCard participant={third} place={3} />}
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[2.25rem] border border-white/10 bg-black/45 p-4 text-white shadow-[0_28px_90px_-52px_rgba(0,0,0,0.95)] backdrop-blur">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-orange-300">Leaderboard</p>
          <h3 className="text-2xl font-black tracking-tight">{title}</h3>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500 text-black">
          <Trophy size={20} />
        </div>
      </div>

      {top.length === 0 ? (
        <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5 text-sm font-semibold text-white/55">
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
                  className={`relative flex items-center gap-3 rounded-[1.35rem] border px-3 py-3 ${
                    isFirst
                      ? 'border-orange-300/35 bg-orange-400/18'
                      : hotCombo
                        ? 'border-orange-400/50 bg-orange-500/10'
                        : 'border-white/10 bg-white/7'
                  }`}
                >
                  {hotCombo && (
                    <motion.div
                      className="pointer-events-none absolute inset-0 rounded-[1.35rem]"
                      style={{ boxShadow: '0 0 24px rgba(249,115,22,0.45)' }}
                      animate={{ opacity: [0.4, 0.9, 0.4] }}
                      transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  )}
                  <div className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.1rem] text-sm font-black ${
                    isFirst ? 'bg-orange-400 text-black' : 'bg-white/10 text-white'
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
                          className="inline-flex items-center gap-0.5 rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-black text-black"
                        >
                          <Flame size={10} /> x{currentStreak}
                        </motion.span>
                      )}
                    </div>
                    {!compact && (
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] font-semibold text-white/50">
                        <span className="inline-flex items-center gap-1"><Flame size={12} className="text-orange-300" /> {participant.bestStreak || 0}</span>
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
                    transition={{ duration: 0.5 }}
                    className="relative text-right"
                  >
                    <p className="text-2xl font-black">{participant.score || 0}</p>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">pts</p>
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
