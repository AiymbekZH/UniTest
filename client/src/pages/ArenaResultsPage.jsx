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
                <div>
                  <p className="text-sm font-semibold text-dark">
                    {result.user ? `${result.user.firstName} ${result.user.lastName}` : result.guestName}
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
      </div>
    </div>
  );
}
