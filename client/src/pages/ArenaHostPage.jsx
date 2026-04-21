import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Copy, Play, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { connectArenaSocket, disconnectArenaSocket, getArenaSocket } from '../services/arenaSocket';
import ArenaQuestionPanel from '../components/arena/ArenaQuestionPanel';
import ArenaStandings from '../components/arena/ArenaStandings';
import BrandLogo from '../components/BrandLogo';

function computeTimeLeft(targetDate) {
  return targetDate ? Math.max(0, new Date(targetDate).getTime() - Date.now()) : 0;
}

export default function ArenaHostPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [participant, setParticipant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [timeLeftMs, setTimeLeftMs] = useState(0);

  const fetchRoom = useCallback(async () => {
    try {
      const res = await api.get(`/arena/rooms/${roomId}`);
      setRoom(res.data.room);
      setParticipant(res.data.participant);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Не удалось открыть комнату ведущего');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  }, [navigate, roomId]);

  useEffect(() => {
    fetchRoom();
  }, [fetchRoom]);

  useEffect(() => {
    if (!room?._id) return undefined;

    const socket = connectArenaSocket() || getArenaSocket();
    if (!socket) return undefined;

    const handleState = (nextRoom) => setRoom(nextRoom);
    const handleError = ({ message }) => {
      if (message) toast.error(message);
    };

    socket.on('arena:lobbyState', handleState);
    socket.on('arena:countdown', handleState);
    socket.on('arena:question', handleState);
    socket.on('arena:roundResult', handleState);
    socket.on('arena:final', handleState);
    socket.on('arena:error', handleError);
    socket.emit('arena:join', { roomId: room._id });

    return () => {
      socket.emit('arena:leave', { roomId: room._id });
      socket.off('arena:lobbyState', handleState);
      socket.off('arena:countdown', handleState);
      socket.off('arena:question', handleState);
      socket.off('arena:roundResult', handleState);
      socket.off('arena:final', handleState);
      socket.off('arena:error', handleError);
      disconnectArenaSocket();
    };
  }, [room?._id]);

  useEffect(() => {
    if (!room?.questionEndsAt && !room?.countdownEndsAt) {
      setTimeLeftMs(0);
      return undefined;
    }
    const update = () => {
      if (room?.status === 'countdown') {
        setTimeLeftMs(computeTimeLeft(room.countdownEndsAt));
      } else if (room?.status === 'live_question') {
        setTimeLeftMs(computeTimeLeft(room.questionEndsAt));
      } else {
        setTimeLeftMs(0);
      }
    };
    update();
    const interval = setInterval(update, 250);
    return () => clearInterval(interval);
  }, [room?.countdownEndsAt, room?.questionEndsAt, room?.status]);

  const runHostAction = async (kind) => {
    setActionBusy(true);
    try {
      const res = await api.post(`/arena/rooms/${roomId}/${kind}`);
      if (res.data?.room) setRoom(res.data.room);
      if (kind === 'cancel') toast.success('Арена отменена');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Ошибка действия арены');
    } finally {
      setActionBusy(false);
    }
  };

  const participants = useMemo(() => room?.participants || [], [room?.participants]);

  if (loading || !room) {
    return (
      <div className="min-h-screen bg-surface px-4 py-8">
        <div className="mx-auto flex max-w-5xl items-center justify-center py-24">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-200 border-t-orange-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface px-4 py-8">
      <div className="mx-auto max-w-7xl">
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

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/arena/code/${room.joinCode}`);
                toast.success('Ссылка комнаты скопирована');
              }}
              className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-dark transition hover:border-orange-200 hover:bg-orange-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <Copy size={15} /> Скопировать приглашение
            </button>
            <Link
              to={`/arena/code/${room.joinCode}`}
              className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-dark transition hover:border-orange-200 hover:bg-orange-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              Player view
            </Link>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <div className="rounded-[2rem] border border-white/60 bg-white/92 p-6 shadow-[0_32px_90px_-46px_rgba(15,23,42,0.6)] dark:border-slate-700 dark:bg-slate-900/88">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">Экран ведущего</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-dark">{room.title}</h1>
              <p className="mt-2 text-sm text-gray-500">Управляй лобби, вопросами и раундами отсюда. Игроки входят по коду <span className="font-black tracking-[0.2em] text-dark">{room.joinCode}</span>.</p>

              <div className="mt-5 flex flex-wrap gap-3">
                {room.status === 'lobby' && (
                  <button
                    type="button"
                    onClick={() => runHostAction('start')}
                    disabled={actionBusy}
                    className="inline-flex items-center gap-2 rounded-2xl bg-primary-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Play size={16} /> Запустить матч
                  </button>
                )}
                {room.status === 'round_result' && (
                  <button
                    type="button"
                    onClick={() => runHostAction('next')}
                    disabled={actionBusy}
                    className="inline-flex items-center gap-2 rounded-2xl bg-primary-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Play size={16} /> {room.currentQuestionIndex >= room.questionCount - 1 ? 'Открыть финал' : 'Следующий раунд'}
                  </button>
                )}
                {!['cancelled', 'declined', 'final'].includes(room.status) && (
                  <button
                    type="button"
                    onClick={() => runHostAction('cancel')}
                    disabled={actionBusy}
                    className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-300"
                  >
                    <XCircle size={16} /> Отменить
                  </button>
                )}
              </div>
            </div>

            {room.status === 'countdown' && (
              <div className="rounded-[2rem] border border-white/60 bg-white/92 p-8 text-center shadow-[0_32px_90px_-46px_rgba(15,23,42,0.6)] dark:border-slate-700 dark:bg-slate-900/88">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">Countdown</p>
                <h2 className="mt-3 text-5xl font-black tracking-tight text-dark">{Math.max(0, Math.ceil(timeLeftMs / 1000))}</h2>
                <p className="mt-2 text-sm text-gray-500">Игроки видят общий старт. Следующий экран автоматически покажет первый вопрос.</p>
              </div>
            )}

            {room.status === 'live_question' && (
              <ArenaQuestionPanel question={room.currentQuestion} timeLeftMs={timeLeftMs} isHostView />
            )}

            {room.status === 'round_result' && (
              <div className="rounded-[2rem] border border-white/60 bg-white/92 p-6 shadow-[0_32px_90px_-46px_rgba(15,23,42,0.6)] dark:border-slate-700 dark:bg-slate-900/88">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">Раунд закрыт</p>
                <h2 className="mt-2 text-2xl font-black text-dark">Промежуточный рейтинг зафиксирован</h2>
                <p className="mt-2 text-sm text-gray-500">Если нужно, дай игрокам время посмотреть на изменения, затем запускай следующий раунд.</p>
              </div>
            )}

            {['final', 'cancelled', 'declined'].includes(room.status) && (
              <div className="rounded-[2rem] border border-white/60 bg-white/92 p-6 shadow-[0_32px_90px_-46px_rgba(15,23,42,0.6)] dark:border-slate-700 dark:bg-slate-900/88">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">Финал</p>
                <h2 className="mt-2 text-2xl font-black text-dark">
                  {room.status === 'final' ? 'Матч завершён' : 'Комната закрыта'}
                </h2>
                <p className="mt-2 text-sm text-gray-500">Все результаты уже сохранены в аренном слое. Официальный leaderboard теста они не затрагивают.</p>
                <div className="mt-5">
                  <Link
                    to={`/arena/results/${room._id}`}
                    className="inline-flex items-center gap-2 rounded-2xl bg-primary-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-600"
                  >
                    <Play size={16} /> Открыть результаты арены
                  </Link>
                </div>
              </div>
            )}
          </div>

          <ArenaStandings participants={participants} title={room.status === 'final' ? 'Финальный подиум' : 'Игроки'} />
        </div>
      </div>
    </div>
  );
}
