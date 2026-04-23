import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Copy, Pause, Play, Plus, SkipForward, Smartphone, Trophy, UserX, Users, XCircle } from 'lucide-react';
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
      return 'Ответы';
    case 'answer_reveal':
      return 'Правильный ответ';
    case 'leaderboard':
    case 'round_result':
      return 'Рейтинг';
    case 'final':
      return 'Финал';
    default:
      return 'Arena';
  }
}

function PlayerPill({ participant, onKick }) {
  const name = participant.displayName || 'Игрок';
  return (
    <div className="group relative flex items-center gap-2 rounded-full border border-white/10 bg-white/8 pl-3 pr-2 py-2">
      <span className={`h-2.5 w-2.5 rounded-full ${participant.state === 'joined' ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
      <span className="max-w-[180px] truncate text-sm font-black text-white">{name}</span>
      {onKick && (
        <button
          type="button"
          onClick={() => onKick(participant._id, name)}
          className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500/10 text-red-300 opacity-0 transition group-hover:opacity-100 hover:bg-red-500/25"
          title="Исключить"
        >
          <UserX size={12} />
        </button>
      )}
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

  const runHostAction = async (kind, body) => {
    setActionBusy(true);
    try {
      const res = await api.post(`/arena/rooms/${roomId}/${kind}`, body || {});
      if (res.data?.room) setRoom(res.data.room);
      if (kind === 'cancel') toast.success('Арена отменена');
      if (kind === 'pause') toast.success('Пауза');
      if (kind === 'resume') toast.success('Продолжаем');
      if (kind === 'extend-timer') toast.success(`+${body?.extraSec || 15} сек`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Ошибка действия арены');
    } finally {
      setActionBusy(false);
    }
  };

  const kickParticipant = async (participantId, displayName) => {
    if (!participantId) return;
    setActionBusy(true);
    try {
      const res = await api.post(`/arena/rooms/${roomId}/kick/${participantId}`);
      if (res.data?.room) setRoom(res.data.room);
      toast.success(`${displayName || 'Игрок'} исключён`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Не удалось исключить игрока');
    } finally {
      setActionBusy(false);
    }
  };

  const participants = useMemo(() => room?.participants || [], [room?.participants]);
  const onlineCount = participants.filter(participant => participant.state === 'joined').length;
  const showAnswer = room?.status === 'answer_reveal' || room?.status === 'leaderboard' || room?.status === 'round_result';
  const isCountdown = room?.status === 'countdown' || room?.status === 'starting_countdown';

  const PAUSABLE_STATUSES = ['starting_countdown', 'countdown', 'question_intro', 'live_question', 'answer_reveal', 'leaderboard', 'round_result'];
  const EXTENDABLE_STATUSES = ['starting_countdown', 'countdown', 'question_intro', 'live_question', 'answer_reveal', 'leaderboard', 'round_result'];
  const canPause = PAUSABLE_STATUSES.includes(room?.status);
  const isPaused = room?.status === 'paused';
  const canExtend = EXTENDABLE_STATUSES.includes(room?.status);

  if (loading || !room) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0b]">
        <div className="h-11 w-11 animate-spin rounded-full border-4 border-white/10 border-t-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-hidden bg-[#0a0a0b] text-white">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute left-[-18rem] top-[-12rem] h-[42rem] w-[42rem] rounded-full bg-orange-500/20 blur-3xl" />
        <div className="absolute bottom-[-16rem] right-[-16rem] h-[40rem] w-[40rem] rounded-full bg-amber-400/10 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:44px_44px] opacity-25" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col p-4 lg:p-6">
        <header className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/8 text-white transition hover:bg-white/15"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="rounded-2xl bg-white px-3 py-2">
              <BrandLogo />
            </div>
            <div className="hidden rounded-full border border-orange-300/25 bg-orange-500/12 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-orange-300 sm:block">
              {statusLabel(room.status)}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/arena/code/${room.joinCode}`);
                toast.success('Ссылка комнаты скопирована');
              }}
              className="hidden items-center gap-2 rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-sm font-black text-white transition hover:bg-white/15 sm:inline-flex"
            >
              <Copy size={15} /> {room.joinCode}
            </button>
            <Link
              to={`/arena/code/${room.joinCode}`}
              className="hidden items-center gap-2 rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-sm font-black text-white transition hover:bg-white/15 md:inline-flex"
            >
              <Smartphone size={15} /> Player
            </Link>
            {canExtend && (
              <button
                type="button"
                onClick={() => runHostAction('extend-timer', { extraSec: 15 })}
                disabled={actionBusy}
                className="inline-flex h-11 items-center gap-1.5 rounded-2xl border border-emerald-300/20 bg-emerald-400/12 px-3 text-emerald-200 transition hover:bg-emerald-400/20 disabled:opacity-40"
                title="Продлить таймер на 15 сек"
              >
                <Plus size={15} /> 15s
              </button>
            )}
            {canPause && (
              <button
                type="button"
                onClick={() => runHostAction('pause')}
                disabled={actionBusy}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/8 text-white transition hover:bg-white/15 disabled:opacity-40"
                title="Пауза"
              >
                <Pause size={17} />
              </button>
            )}
            {isPaused && (
              <button
                type="button"
                onClick={() => runHostAction('resume')}
                disabled={actionBusy}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-300/30 bg-emerald-400/20 text-emerald-200 transition hover:bg-emerald-400/30 disabled:opacity-40"
                title="Продолжить"
              >
                <Play size={17} />
              </button>
            )}
            {room.status !== 'lobby' && !['final', 'cancelled', 'declined'].includes(room.status) && (
              <button
                type="button"
                onClick={() => runHostAction('skip')}
                disabled={actionBusy}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-400/12 text-amber-200 transition hover:bg-amber-400/20 disabled:opacity-40"
                title="Skip"
              >
                <SkipForward size={17} />
              </button>
            )}
            {!['cancelled', 'declined', 'final'].includes(room.status) && (
              <button
                type="button"
                onClick={() => runHostAction('cancel')}
                disabled={actionBusy}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-red-300/20 bg-red-500/12 text-red-200 transition hover:bg-red-500/20 disabled:opacity-40"
                title="Отменить"
              >
                <XCircle size={17} />
              </button>
            )}
          </div>
        </header>

        <main className="flex flex-1 flex-col gap-4">
          {room.status === 'lobby' && (
            <section className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
              <div className="flex min-h-[68vh] flex-col justify-between rounded-[2.5rem] border border-white/10 bg-[#111111] p-6 shadow-[0_36px_100px_-65px_rgba(0,0,0,1)]">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.35em] text-orange-300">UniTest Arena</p>
                  <h1 className="mt-5 max-w-5xl text-5xl font-black leading-[0.95] tracking-tight md:text-7xl">
                    {room.title}
                  </h1>
                </div>

                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_260px]">
                  <div className="rounded-[2rem] bg-orange-500 p-6 text-black">
                    <p className="text-sm font-black uppercase tracking-[0.22em] opacity-65">Код входа</p>
                    <p className="mt-3 text-7xl font-black tracking-[0.16em] md:text-8xl">{room.joinCode}</p>
                  </div>
                  <div className="rounded-[2rem] border border-white/10 bg-white/7 p-5">
                    <div className="flex items-center gap-3">
                      <Users className="text-orange-300" size={30} />
                      <div>
                        <p className="text-5xl font-black">{participants.length}</p>
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-white/45">игроков</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => runHostAction('start')}
                      disabled={actionBusy || participants.length === 0}
                      className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-[1.5rem] bg-white px-5 py-4 text-base font-black text-black transition hover:bg-orange-200 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Play size={18} /> Старт
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex min-h-[68vh] flex-col rounded-[2.5rem] border border-white/10 bg-black/35 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-300">Players</p>
                    <h2 className="text-3xl font-black">Лобби</h2>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-sm font-black text-black">{onlineCount} online</span>
                </div>
                <div className="mt-5 flex flex-1 content-start flex-wrap gap-2 overflow-auto">
                  {participants.length ? participants.map(participant => (
                    <PlayerPill key={participant._id} participant={participant} onKick={kickParticipant} />
                  )) : (
                    <div className="rounded-[1.5rem] border border-dashed border-white/15 p-5 text-sm font-semibold text-white/45">
                      Игроки появятся здесь после входа по коду.
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {isCountdown && (
            <section className="flex flex-1 flex-col items-center justify-center rounded-[2.5rem] bg-orange-500 p-6 text-center text-black">
              <p className="text-sm font-black uppercase tracking-[0.35em] opacity-60">Матч начинается</p>
              <p className="mt-4 text-[12rem] font-black leading-none md:text-[18rem]">{Math.max(0, Math.ceil(timeLeftMs / 1000))}</p>
              <p className="mt-4 text-2xl font-black opacity-70">Первый вопрос откроется автоматически</p>
            </section>
          )}

          {room.status === 'question_intro' && (
            <section className="flex flex-1 flex-col justify-center rounded-[2.5rem] bg-[#111111] p-8">
              <p className="text-sm font-black uppercase tracking-[0.35em] text-orange-300">Вопрос {room.currentQuestion?.questionNumber}</p>
              <h1 className="mt-5 max-w-6xl text-6xl font-black leading-[0.98] tracking-tight md:text-8xl">
                {room.currentQuestion?.questionText}
              </h1>
              <p className="mt-8 text-5xl font-black text-orange-300">{Math.max(0, Math.ceil(timeLeftMs / 1000))}</p>
            </section>
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
            <section className="grid flex-1 place-items-center gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="w-full rounded-[2.5rem] bg-[#111111] p-7">
                <p className="text-sm font-black uppercase tracking-[0.35em] text-orange-300">Leaderboard</p>
                <h1 className="mt-4 text-6xl font-black tracking-tight md:text-8xl">Текущий топ</h1>
                <p className="mt-5 text-5xl font-black text-orange-300">{Math.max(0, Math.ceil(timeLeftMs / 1000))}</p>
              </div>
              <ArenaStandings participants={participants} title="Рейтинг" limit={8} />
            </section>
          )}

          {['final', 'cancelled', 'declined'].includes(room.status) && (
            <section className="grid flex-1 place-items-center gap-4">
              <div className="w-full rounded-[2.5rem] bg-orange-500 p-7 text-black">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-black text-orange-300">
                    <Trophy size={30} />
                  </div>
                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.3em] opacity-60">Финал</p>
                    <h1 className="text-6xl font-black tracking-tight">{room.status === 'final' ? 'Матч завершён' : 'Комната закрыта'}</h1>
                  </div>
                </div>
                <Link
                  to={`/arena/results/${room._id}`}
                  className="mt-7 inline-flex items-center gap-2 rounded-[1.5rem] bg-black px-6 py-4 text-sm font-black text-white transition hover:bg-zinc-900"
                >
                  <Trophy size={16} /> Результаты
                </Link>
              </div>
              {room.status === 'final' && <ArenaStandings participants={participants} title="Финальный подиум" variant="podium" limit={3} />}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
