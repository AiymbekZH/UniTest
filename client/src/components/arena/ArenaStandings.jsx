import { Clock3, Flame, Medal, Trophy } from 'lucide-react';

function formatMs(ms = 0) {
  const seconds = Math.max(0, Math.round(ms / 1000));
  return `${seconds}s`;
}

function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('') || '?';
}

function PodiumCard({ participant, place }) {
  const color = place === 1 ? 'from-amber-300 to-orange-500' : place === 2 ? 'from-slate-200 to-slate-400' : 'from-orange-200 to-amber-500';

  return (
    <div className={`relative overflow-hidden rounded-[2rem] border border-white/30 bg-gradient-to-br ${color} p-5 text-white shadow-[0_24px_70px_-36px_rgba(15,23,42,0.85)]`}>
      <div className="absolute right-3 top-3 text-5xl font-black opacity-20">#{place}</div>
      <div className="relative z-10">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 text-xl font-black backdrop-blur">
          {getInitials(participant?.displayName)}
        </div>
        <p className="mt-4 truncate text-lg font-black">{participant?.displayName || 'Игрок'}</p>
        <p className="text-3xl font-black tracking-tight">{participant?.score || 0}</p>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/75">очков</p>
      </div>
    </div>
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
      <div className="rounded-[2rem] border border-white/60 bg-white/95 p-5 shadow-[0_28px_80px_-42px_rgba(15,23,42,0.7)] dark:border-slate-700 dark:bg-slate-900/90">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 text-white">
            <Trophy size={20} />
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-orange-500">Arena</p>
            <h3 className="text-2xl font-black tracking-tight text-dark dark:text-white">{title}</h3>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {second && <PodiumCard participant={second} place={2} />}
          {first && <PodiumCard participant={first} place={1} />}
          {third && <PodiumCard participant={third} place={3} />}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[2rem] border border-white/60 bg-white/95 p-5 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.55)] dark:border-slate-700 dark:bg-slate-900/90">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-orange-500 dark:bg-orange-900/20">
          <Trophy size={19} />
        </div>
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">Arena</p>
          <h3 className="text-lg font-black text-dark dark:text-white">{title}</h3>
        </div>
      </div>

      {top.length === 0 ? (
        <p className="text-sm text-gray-400">Пока нет игроков.</p>
      ) : (
        <div className="space-y-2">
          {top.map((participant, index) => {
            const place = participant.liveRank || participant.rank || index + 1;
            return (
              <div
                key={participant._id || `${participant.displayName}-${index}`}
                className={`flex items-center gap-3 rounded-2xl border px-3 py-3 transition ${
                  index === 0
                    ? 'border-orange-200 bg-orange-50/90 dark:border-orange-900/30 dark:bg-orange-900/10'
                    : 'border-gray-100 bg-gray-50/80 dark:border-slate-700 dark:bg-slate-800/60'
                }`}
              >
                <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl text-sm font-black shadow-sm ${
                  index === 0 ? 'bg-orange-500 text-white' : 'bg-white text-dark dark:bg-slate-700 dark:text-white'
                }`}>
                  {index < 3 ? <Medal size={17} /> : place}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-dark dark:text-white">{participant.displayName}</p>
                  {!compact && (
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-gray-500">
                      <span className="inline-flex items-center gap-1"><Flame size={12} className="text-orange-500" /> {participant.bestStreak || 0}</span>
                      <span className="inline-flex items-center gap-1"><Clock3 size={12} className="text-gray-400" /> {formatMs(participant.totalResponseTimeMs)}</span>
                      {participant.lastAnswer && (
                        <span className={participant.lastAnswer.isCorrect ? 'text-emerald-600' : 'text-red-500'}>
                          {participant.lastAnswer.isCorrect ? '+' : ''}{participant.lastAnswer.pointsAwarded || 0}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xl font-black text-dark dark:text-white">{participant.score || 0}</p>
                  <p className="text-[11px] font-medium text-gray-400">очков</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
