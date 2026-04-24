import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BarChart3, Clock, Zap, Target } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import BrandLogo from '../components/BrandLogo';
import ArenaStandings from '../components/arena/ArenaStandings';

export default function ArenaResultsPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [results, setResults] = useState([]);
  const [breakdowns, setBreakdowns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/arena/rooms/${roomId}/results`)
      .then((res) => {
        setRoom(res.data.room);
        setResults(res.data.results || []);
        setBreakdowns(res.data.questionBreakdowns || []);
      })
      .catch((error) => {
        toast.error(error.response?.data?.message || 'Не удалось загрузить результаты арены');
        navigate('/dashboard');
      })
      .finally(() => setLoading(false));
  }, [navigate, roomId]);

  if (loading || !room) {
    return (
      <div className="min-h-screen bg-surface px-4 py-8">
        <div className="mx-auto flex max-w-5xl items-center justify-center py-24">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-200 border-t-orange-500" />
        </div>
      </div>
    );
  }

  const standings = (room.participants || []).map((participant) => {
    const result = results.find(item =>
      (item.user?._id || item.user)?.toString() === participant.user?._id?.toString()
      || (!item.user && item.guestName === participant.guestName)
    );

    return {
      ...participant,
      xpAwarded: result?.xpAwarded || 0
    };
  });

  return (
    <div className="min-h-screen bg-surface px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="icon-btn"
            >
              <ArrowLeft size={16} />
            </button>
            <BrandLogo />
          </div>
          <Link
            to={room.joinCode ? `/arena/code/${room.joinCode}` : '/dashboard'}
            className="btn-secondary text-sm"
          >
            Открыть комнату
          </Link>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 dark:border-slate-700/60 dark:bg-slate-800">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-300 dark:text-gray-500">Arena Results</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-dark">{room.title}</h1>
          <p className="mt-1.5 text-sm text-gray-400">Финальный рейтинг, очки и начисленный XP для зарегистрированных участников.</p>
        </div>

        <div className="mt-6">
          <ArenaStandings participants={standings} title="Финальный подиум" />
        </div>

        <div className="mt-4 rounded-2xl border border-gray-100 bg-white p-6 dark:border-slate-700/60 dark:bg-slate-800">
          <h3 className="text-base font-semibold text-dark">Награды</h3>
          <div className="mt-4 space-y-2">
            {results.map((result) => (
              <div key={result._id} className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 dark:bg-slate-700/50">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-dark truncate">
                    {result.user?.username ? `@${result.user.username}` : (result.user ? `${result.user.firstName || ''} ${result.user.lastName || ''}`.trim() : result.guestName)}
                  </p>
                  <p className="text-[11px] text-gray-400">Место #{result.placement} · {result.score} очков</p>
                </div>
                <div className="text-right">
                  <p className="text-base font-bold text-primary-500">+{result.xpAwarded || 0} XP</p>
                  <p className="text-[10px] text-gray-300">{(result.badgesAwarded || []).join(', ') || 'без новых бейджей'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {breakdowns.length > 0 && (
          <div className="mt-4 rounded-2xl border border-gray-100 bg-white p-6 dark:border-slate-700/60 dark:bg-slate-800">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-300">
                <BarChart3 size={16} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-dark">Аналитика по вопросам</h3>
                <p className="text-[11px] text-gray-400">Точность, среднее время ответа и самый быстрый игрок</p>
              </div>
            </div>
            <div className="space-y-2">
              {breakdowns.map((q) => (
                <div key={q.questionIndex} className="rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-slate-700/60 dark:bg-slate-700/40">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-black uppercase tracking-widest text-gray-400">Вопрос {q.questionNumber}</p>
                      <p className="mt-0.5 line-clamp-2 text-sm font-semibold text-dark">{q.questionText}</p>
                    </div>
                    <div className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black ${
                      q.accuracy >= 70 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300'
                        : q.accuracy >= 40 ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300'
                          : 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300'
                    }`}>
                      <Target size={12} /> {q.accuracy}%
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200/60 dark:bg-slate-800">
                    <div
                      className={`h-full rounded-full transition-all ${q.accuracy >= 70 ? 'bg-emerald-400' : q.accuracy >= 40 ? 'bg-amber-400' : 'bg-red-400'}`}
                      style={{ width: `${q.accuracy}%` }}
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400">
                    <span className="inline-flex items-center gap-1"><Clock size={11} /> avg {Math.round((q.avgResponseTimeMs || 0) / 100) / 10}s</span>
                    <span className="inline-flex items-center gap-1">{q.correctAnswered}/{q.totalAnswered} ответили верно</span>
                    {q.fastest ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100/80 px-2 py-0.5 font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
                        <Zap size={10} /> {q.fastest.username ? `@${q.fastest.username}` : q.fastest.displayName} · {Math.round((q.fastest.responseTimeMs || 0) / 100) / 10}s
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
