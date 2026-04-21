import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import BrandLogo from '../components/BrandLogo';
import ArenaStandings from '../components/arena/ArenaStandings';

export default function ArenaResultsPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/arena/rooms/${roomId}/results`)
      .then((res) => {
        setRoom(res.data.room);
        setResults(res.data.results || []);
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
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/60 bg-white/90 text-gray-500 shadow-sm transition hover:text-dark dark:border-slate-700 dark:bg-slate-900/80 dark:text-gray-300"
            >
              <ArrowLeft size={18} />
            </button>
            <BrandLogo />
          </div>
          <Link
            to={room.joinCode ? `/arena/code/${room.joinCode}` : '/dashboard'}
            className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-dark transition hover:border-orange-200 hover:bg-orange-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            Открыть комнату
          </Link>
        </div>

        <div className="rounded-[2rem] border border-white/60 bg-white/92 p-6 shadow-[0_32px_90px_-46px_rgba(15,23,42,0.6)] dark:border-slate-700 dark:bg-slate-900/88">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">Arena Results</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-dark">{room.title}</h1>
          <p className="mt-2 text-sm text-gray-500">Финальный рейтинг, очки и начисленный XP для зарегистрированных участников.</p>
        </div>

        <div className="mt-6">
          <ArenaStandings participants={standings} title="Финальный подиум" />
        </div>

        <div className="mt-6 rounded-3xl border border-white/60 bg-white/90 p-5 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.55)] dark:border-slate-700 dark:bg-slate-900/85">
          <h3 className="text-lg font-semibold text-dark">Награды</h3>
          <div className="mt-4 space-y-2">
            {results.map((result) => (
              <div key={result._id} className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50/70 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60">
                <div>
                  <p className="text-sm font-semibold text-dark">
                    {result.user ? `${result.user.firstName} ${result.user.lastName}` : result.guestName}
                  </p>
                  <p className="text-[11px] text-gray-500">Место #{result.placement} · {result.score} очков</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-orange-500">+{result.xpAwarded || 0} XP</p>
                  <p className="text-[11px] text-gray-400">{(result.badgesAwarded || []).join(', ') || 'без новых бейджей'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
