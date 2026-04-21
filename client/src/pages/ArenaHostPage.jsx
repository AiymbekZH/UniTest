import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Copy, Play, SkipForward, Smartphone, Trophy, Users, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { connectArenaSocket, disconnectArenaSocket, getArenaSocket } from '../services/arenaSocket';
import ArenaQuestionPanel from '../components/arena/ArenaQuestionPanel';
import ArenaStandings from '../components/arena/ArenaStandings';
import BrandLogo from '../components/BrandLogo';

const ARENA_EVENTS = [
  'arena:state',
  'arena:lobbyState',
  'arena:countdown',
  'arena:questionIntro',
  'arena:question',
  'arena:answerReveal',
  'arena:leaderboard',
  'arena:roundResult',
  'arena:final'
];

function computeTimeLeft(targetDate) {
  return targetDate ? Math.max(0, new Date(targetDate).getTime() - Date.now()) : 0;
}

function getPhaseEnd(room) {
  return room?.phaseEndsAt
    || room?.countdownEndsAt
    || room?.questionIntroEndsAt
    || room?.questionEndsAt
    || room?.answerRevealEndsAt
    || room?.leaderboardEndsAt
    || null;
}

function statusLabel(status) {
  switch (status) {
    case 'lobby':
      return 'Лобби';
    case 'countdown':
    case 'starting_countdown':
      return 'Старт';
    case 'question_intro':
      return 'Вопрос';
    case 'live_question':
      return 'Играют';
    case 'answer_reveal':
      return 'Ответ';
    case 'leaderboard':
    case 'round_result':
      return 'Рейтинг';
    case 'final':
      return 'Финал';
    default:
      return 'Arena';
  }
}

function PlayerCloud({ participants = [] }) {
  if (!participants.length) {
    return (
      <div className="rounded-[2rem] border border-white/10 bg-white/10 p-6 text-center text-white/60">
        Игроки появятся здесь после входа по коду.
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-3">
      {participants.map((participant, index) => (
        <div
          key={participant._id || `${participant.displayName}-${index}`}
          className="rounded-2xl border border-white/10 bg-white/15 px-4 py-3 text-sm font-black text-white shadow-lg backdrop-blur"
        >
          {participant.displayName}
        </div>
      ))}
    </div>
  );
}

export default function ArenaHostPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [timeLeftMs, setTimeLeftMs] = useState(0);

  const fetchRoom = useCallback(async () => {
    try {
      const res = await api.get(`/arena/rooms/${roomId}`);
      setRoom(res.data.room);
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

    ARENA_EVENTS.forEach(eventName => socket.on(eventName, handleState));
    socket.on('arena:error', handleError);
    socket.emit('arena:join', { roomId: room._id });

    return () => {
      socket.emit('arena:leave', { roomId: room._id });
      ARENA_EVENTS.forEach(eventName => socket.off(eventName, handleState));
      socket.off('arena:error', handleError);
      disconnectArenaSocket();
    };
  }, [room?._id]);

  useEffect(() => {
    const phaseEnd = getPhaseEnd(room);
    if (!phaseEnd) {
      setTimeLeftMs(0);
      return undefined;
    }

    const update = () => setTimeLeftMs(computeTimeLeft(phaseEnd));
    update();
    const interval = setInterval(update, 200);
    return () => clearInterval(interval);
  }, [
    room?.phaseEndsAt,
    room?.countdownEndsAt,
    room?.questionIntroEndsAt,
    room?.questionEndsAt,
    room?.answerRevealEndsAt,
    room?.leaderboardEndsAt
  ]);

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
  const activeCount = participants.filter(participant => participant.state === 'joined').length;
  const showAnswer = room?.status === 'answer_reveal' || room?.status === 'leaderboard' || room?.status === 'round_result';
  const isCountdown = room?.status === 'countdown' || room?.status === 'starting_countdown';

  if (loading || !room) {
    return (
      <div className="min-h-screen bg-slate-950 px-4 py-8">
        <div className="mx-auto flex max-w-5xl items-center justify-center py-24">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-200 border-t-orange-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#070709] px-4 py-5 text-white">
      <div className="pointer-events-none absolute -left-32 top-20 h-96 w-96 rounded-full bg-orange-500/22 blur-3xl" />
      <div className="pointer-events-none absolute -right-28 bottom-10 h-[30rem] w-[30rem] rounded-full bg-amber-400/14 blur-3xl" />

      <div className="relative z-10 mx-auto max-w-[1500px]">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-[2rem] border border-white/10 bg-white/90 px-4 py-3 text-slate-950 shadow-[0_24px_80px_-50px_rgba(0,0,0,0.9)] backdrop-blur">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-500 transition hover:text-slate-950"
            >
              <ArrowLeft size={18} />
            </button>
            <BrandLogo />
            <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-white">
              {statusLabel(room.status)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/arena/code/${room.joinCode}`);
                toast.success('Ссылка комнаты скопирована');
              }}
              className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-black text-slate-950 transition hover:border-orange-200 hover:bg-orange-50"
            >
              <Copy size={15} /> Ссылка
            </button>
            <Link
              to={`/arena/code/${room.joinCode}`}
              className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-black text-slate-950 transition hover:border-orange-200 hover:bg-orange-50"
            >
              <Smartphone size={15} /> Player
            </Link>
            {room.status !== 'lobby' && !['final', 'cancelled', 'declined'].includes(room.status) && (
              <button
                type="button"
                onClick={() => runHostAction('skip')}
                disabled={actionBusy}
                className="inline-flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-black text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"
              >
                <SkipForward size={15} /> Skip
              </button>
            )}
            {!['cancelled', 'declined', 'final'].includes(room.status) && (
              <button
                type="button"
                onClick={() => runHostAction('cancel')}
                disabled={actionBusy}
                className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-600 transition hover:bg-red-100 disabled:opacity-50"
              >
                <XCircle size={15} /> Отменить
              </button>
            )}
          </div>
        </header>

        <main className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <section className="min-h-[72vh] overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/10 p-5 shadow-[0_36px_100px_-60px_rgba(0,0,0,0.95)] backdrop-blur">
            {room.status === 'lobby' && (
              <div className="flex min-h-[68vh] flex-col justify-between gap-10">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.32em] text-orange-300">UniTest Arena</p>
                  <h1 className="mt-4 max-w-5xl text-5xl font-black leading-none tracking-tight md:text-7xl">
                    {room.title}
                  </h1>
                  <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="rounded-[2rem] border border-white/10 bg-white/15 p-6">
                      <p className="text-sm font-black uppercase tracking-[0.24em] text-white/60">Код входа</p>
                      <p className="mt-2 text-7xl font-black tracking-[0.18em] text-orange-300 md:text-8xl">{room.joinCode}</p>
                      <p className="mt-3 text-lg font-semibold text-white/70">Игроки открывают ссылку или вводят код комнаты.</p>
                    </div>
                    <div className="rounded-[2rem] border border-orange-300/20 bg-orange-400/12 p-6">
                      <div className="flex items-center gap-3">
                        <Users size={28} className="text-orange-300" />
                        <div>
                          <p className="text-5xl font-black">{participants.length}</p>
                          <p className="text-sm font-black uppercase tracking-[0.2em] text-white/60">игроков</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => runHostAction('start')}
                        disabled={actionBusy || participants.length === 0}
                        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-6 py-4 text-lg font-black text-white shadow-lg shadow-orange-500/25 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Play size={20} /> Старт матча
                      </button>
                    </div>
                  </div>
                </div>
                <PlayerCloud participants={participants} />
              </div>
            )}

            {isCountdown && (
              <div className="flex min-h-[68vh] flex-col items-center justify-center text-center">
                <p className="text-sm font-black uppercase tracking-[0.35em] text-orange-300">Готовимся</p>
                <p className="mt-6 text-[10rem] font-black leading-none tracking-tight text-white md:text-[14rem]">{Math.max(0, Math.ceil(timeLeftMs / 1000))}</p>
                <p className="mt-4 text-2xl font-bold text-white/70">Первый вопрос начнётся автоматически.</p>
              </div>
            )}

            {room.status === 'question_intro' && (
              <div className="flex min-h-[68vh] flex-col justify-center">
                <p className="text-sm font-black uppercase tracking-[0.35em] text-orange-300">Вопрос {room.currentQuestion?.questionNumber}</p>
                <h1 className="mt-5 max-w-6xl text-6xl font-black leading-tight tracking-tight md:text-8xl">
                  {room.currentQuestion?.questionText}
                </h1>
                <p className="mt-8 text-4xl font-black text-white/60">Старт через {Math.max(0, Math.ceil(timeLeftMs / 1000))}</p>
              </div>
            )}

            {(room.status === 'live_question' || room.status === 'answer_reveal') && (
              <ArenaQuestionPanel
                question={room.currentQuestion}
                timeLeftMs={timeLeftMs}
                mode="host"
                showAnswer={showAnswer}
                answerStats={room.answerStats}
              />
            )}

            {(room.status === 'leaderboard' || room.status === 'round_result') && (
              <div className="grid min-h-[68vh] content-center gap-5">
                <div className="rounded-[2rem] border border-white/10 bg-white/15 p-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-black uppercase tracking-[0.3em] text-orange-300">Рейтинг</p>
                      <h2 className="mt-2 text-5xl font-black tracking-tight">Текущий топ</h2>
                    </div>
                    <div className="rounded-2xl bg-white px-5 py-4 text-slate-950">
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-gray-400">дальше через</p>
                      <p className="text-4xl font-black">{Math.max(0, Math.ceil(timeLeftMs / 1000))}</p>
                    </div>
                  </div>
                </div>
                <ArenaStandings participants={participants} title="Промежуточный лидерборд" limit={10} />
              </div>
            )}

            {['final', 'cancelled', 'declined'].includes(room.status) && (
              <div className="grid min-h-[68vh] content-center gap-5">
                <div className="rounded-[2rem] border border-white/10 bg-white/15 p-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-orange-500 text-white">
                      <Trophy size={28} />
                    </div>
                    <div>
                      <p className="text-sm font-black uppercase tracking-[0.3em] text-orange-300">Финал</p>
                      <h2 className="text-5xl font-black tracking-tight">{room.status === 'final' ? 'Матч завершён' : 'Комната закрыта'}</h2>
                    </div>
                  </div>
                  <div className="mt-6">
                    <Link
                      to={`/arena/results/${room._id}`}
                      className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-6 py-4 text-sm font-black text-white transition hover:bg-orange-600"
                    >
                      <Trophy size={16} /> Открыть результаты
                    </Link>
                  </div>
                </div>
                {room.status === 'final' && <ArenaStandings participants={participants} title="Финальный подиум" variant="podium" limit={3} />}
              </div>
            )}
          </section>

          <aside className="space-y-5">
            <div className="rounded-[2rem] border border-white/10 bg-white/90 p-5 text-slate-950 shadow-[0_24px_70px_-46px_rgba(0,0,0,0.8)]">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-500">Комната</p>
              <h2 className="mt-2 text-2xl font-black">{room.title}</h2>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-100 p-4">
                  <p className="text-3xl font-black">{participants.length}</p>
                  <p className="text-xs font-bold text-gray-500">в комнате</p>
                </div>
                <div className="rounded-2xl bg-orange-50 p-4">
                  <p className="text-3xl font-black text-orange-600">{activeCount}</p>
                  <p className="text-xs font-bold text-gray-500">онлайн</p>
                </div>
              </div>
            </div>

            <ArenaStandings
              participants={participants}
              title={room.status === 'final' ? 'Финальный топ' : 'Игроки'}
              compact={room.status === 'lobby'}
              limit={8}
            />
          </aside>
        </main>
      </div>
    </div>
  );
}
