import { Trophy, Clock3, Flame } from 'lucide-react';

function formatMs(ms = 0) {
  const seconds = Math.max(0, Math.round(ms / 1000));
  return `${seconds}s`;
}

export default function ArenaStandings({ participants = [], compact = false, title = 'Таблица' }) {
  const top = participants || [];

  return (
    <div className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.55)] dark:border-slate-700 dark:bg-slate-900/85">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-50 text-orange-500 dark:bg-orange-900/20">
          <Trophy size={18} />
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">Arena</p>
          <h3 className="text-lg font-semibold text-dark">{title}</h3>
        </div>
      </div>

      {top.length === 0 ? (
        <p className="text-sm text-gray-400">Пока нет игроков.</p>
      ) : (
        <div className="space-y-2">
          {top.map((participant, index) => (
            <div
              key={participant._id || `${participant.displayName}-${index}`}
              className={`flex items-center gap-3 rounded-2xl border px-3 py-3 ${
                index === 0
                  ? 'border-orange-200 bg-orange-50/80 dark:border-orange-900/30 dark:bg-orange-900/10'
                  : 'border-gray-100 bg-gray-50/70 dark:border-slate-700 dark:bg-slate-800/60'
              }`}
            >
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-white text-sm font-black text-dark shadow-sm dark:bg-slate-700 dark:text-white">
                {participant.rank || index + 1}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-dark">{participant.displayName}</p>
                {!compact && (
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-gray-500">
                    <span className="inline-flex items-center gap-1"><Flame size={12} className="text-orange-500" /> {participant.bestStreak || 0}</span>
                    <span className="inline-flex items-center gap-1"><Clock3 size={12} className="text-gray-400" /> {formatMs(participant.totalResponseTimeMs)}</span>
                  </div>
                )}
              </div>
              <div className="text-right">
                <p className="text-xl font-black text-dark">{participant.score || 0}</p>
                <p className="text-[11px] font-medium text-gray-400">очков</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
