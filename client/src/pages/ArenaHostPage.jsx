import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Copy, Pause, Play, Plus, SkipForward, Smartphone, Trophy, UserX, Users, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { connectArenaSocket, disconnectArenaSocket, getArenaSocket } from '../services/arenaSocket';
import ArenaQuestionPanel from '../components/arena/ArenaQuestionPanel';
import ArenaStandings from '../components/arena/ArenaStandings';
import ArenaJoinQR from '../components/arena/ArenaJoinQR';
import ArenaGameplayOverlay from '../components/arena/ArenaGameplayOverlay';
import BrandLogo from '../components/BrandLogo';
import ChunkyCard from '../components/ui/ChunkyCard';
import Confetti from '../components/ui/Confetti';

const ARENA_EVENTS = [
  'arena:state', 'arena:lobbyState', 'arena:countdown', 'arena:questionIntro',
  'arena:question', 'arena:answerReveal', 'arena:leaderboard', 'arena:roundResult', 'arena:final'
];

const computeTimeLeft = (target) => target ? Math.max(0, new Date(target).getTime() - Date.now()) : 0;
const getPhaseEnd = (room) => room?.phaseEndsAt
  || room?.countdownEndsAt || room?.questionIntroEndsAt
  || room?.questionEndsAt || room?.answerRevealEndsAt
  || room?.leaderboardEndsAt || null;

function statusLabel(status) {
  switch (status) {
    case 'lobby': return 'Лобби';
    case 'countdown':
    case 'starting_countdown': return 'Старт';
    case 'question_intro': return 'Вопрос';
    case 'live_question': return 'Ответы';
    case 'answer_reveal': return 'Правильный ответ';
    case 'leaderboard':
    case 'round_result': return 'Рейтинг';
    case 'final': return 'Финал';
    case 'paused': return 'Пауза';
    default: return 'Arena';
  }
}

function PlayerPill({ participant, onKick }) {
  const name = participant.displayName || 'Игрок';
  return (
    <div
      className="group relative flex items-center gap-2 rounded-full border-2 border-slate-900 bg-white pl-3 pr-2 py-2 dark:border-white dark:bg-slate-800"
      style={{ boxShadow: '0 3px 0 var(--shadow-chunky, #1f1a14)' }}
    >
      <span className={`h-2.5 w-2.5 rounded-full ${participant.state === 'joined' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
      <span className="max-w-[180px] truncate text-sm font-black text-slate-900 dark:text-white">{name}</span>
      {onKick && (
        <button
          type="button"
          onClick={() => onKick(participant._id, name)}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-red-500/20 text-red-200 opacity-0 transition group-hover:opacity-100 hover:bg-red-500/40"
          title="Исключить"
        >
          <UserX size={13} />
        </button>
      )}
    </div>
  );
}

function HostActionBtn({ children, variant = 'ghost', title, onClick, disabled }) {
  const base = 'touch-target inline-flex items-center justify-center gap-1.5 rounded-2xl px-3 font-black text-sm transition-transform active:translate-y-[3px]';
  const tones = {
    ghost: 'bg-white text-slate-900 border-2 border-slate-900 dark:bg-slate-800 dark:text-white dark:border-white',
    primary: 'bg-amber-400 text-slate-900 border-2 border-amber-600',
    success: 'bg-emerald-500 text-white border-2 border-emerald-700',
    warning: 'bg-amber-500 text-white border-2 border-amber-700',
    danger: 'bg-red-500 text-white border-2 border-red-700'
  };
  const shadowMap = {
    ghost: '0 4px 0 var(--shadow-chunky, #1f1a14)',
    primary: '0 4px 0 #b45309',
    success: '0 4px 0 #065f46',
    warning: '0 4px 0 #b45309',
    danger: '0 4px 0 #7f1d1d'
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`${base} ${tones[variant] || tones.ghost} h-11 disabled:opacity-40 disabled:cursor-not-allowed`}
      style={{ boxShadow: shadowMap[variant] || shadowMap.ghost }}
    >
      {children}
    </button>
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
      navigate('/arena');
    } finally {
      setLoading(false);
    }
  }, [navigate, roomId]);

  useEffect(() => { fetchRoom(); }, [fetchRoom]);

  useEffect(() => {
    if (!room?._id) return undefined;
    const socket = connectArenaSocket() || getArenaSocket();
    if (!socket) return undefined;
    const handleState = (nextRoom) => setRoom(nextRoom);
    const handleError = ({ message }) => { if (message) toast.error(message); };
    ARENA_EVENTS.forEach(e => socket.on(e, handleState));
    socket.on('arena:error', handleError);
    socket.emit('arena:join', { roomId: room._id });
    return () => {
      socket.emit('arena:leave', { roomId: room._id });
      ARENA_EVENTS.forEach(e => socket.off(e, handleState));
      socket.off('arena:error', handleError);
      disconnectArenaSocket();
    };
  }, [room?._id]);

  useEffect(() => {
    const phaseEnd = getPhaseEnd(room);
    if (!phaseEnd) { setTimeLeftMs(0); return undefined; }
    const update = () => setTimeLeftMs(computeTimeLeft(phaseEnd));
    update();
    const interval = setInterval(update, 200);
    return () => clearInterval(interval);
  }, [
    room?.phaseEndsAt, room?.countdownEndsAt, room?.questionIntroEndsAt,
    room?.questionEndsAt, room?.answerRevealEndsAt, room?.leaderboardEndsAt
  ]);

  const runHostAction = async (kind, body) => {
    if (!room?._id) return;
    setActionBusy(true);
    try {
      const res = await api.post(`/arena/rooms/${room._id}/${kind}`, body || {});
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
  const onlineCount = participants.filter(p => p.state === 'joined').length;
  const showAnswer = room?.status === 'answer_reveal' || room?.status === 'leaderboard' || room?.status === 'round_result';
  const isCountdown = room?.status === 'countdown' || room?.status === 'starting_countdown';

  const PAUSABLE = ['starting_countdown', 'countdown', 'question_intro', 'live_question', 'answer_reveal', 'leaderboard', 'round_result'];
  const canPause = PAUSABLE.includes(room?.status);
  const isPaused = room?.status === 'paused';
  const canExtend = PAUSABLE.includes(room?.status);
  const isFinal = room?.status === 'final';

  if (loading || !room) {
    return (
      <div className="flex min-h-screen items-center justify-center arena-stage-bg">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-300 border-t-primary-500 dark:border-slate-700" />
      </div>
    );
  }

  const countdownSec = Math.max(0, Math.ceil(timeLeftMs / 1000));

  return (
    <div className="min-h-screen arena-stage-bg text-slate-900 dark:text-white">
      {isFinal ? <Confetti active duration={3000} /> : null}

      <div className="relative z-10 flex min-h-screen flex-col p-4 pb-24 sm:pb-8 lg:p-6">
        {/* Header */}
        <header className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/arena')}
              className="touch-target grid h-11 w-11 place-items-center rounded-2xl border-2 border-slate-900 bg-white text-slate-900 dark:border-white dark:bg-slate-800 dark:text-slate-100"
              style={{ boxShadow: '0 4px 0 var(--shadow-chunky, #1f1a14)' }}
              aria-label="Назад"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="rounded-2xl bg-white px-3 py-2">
              <BrandLogo />
            </div>
            <div className="hidden rounded-full border-2 border-primary-500/50 bg-primary-500/15 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-primary-200 sm:block">
              {statusLabel(room.status)}
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
            <HostActionBtn
              title="Скопировать код"
              onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/arena/code/${room.joinCode}`); toast.success('Ссылка скопирована'); }}
            >
              <Copy size={15} /> <span className="font-mono tracking-[0.2em]">{room.joinCode}</span>
            </HostActionBtn>
            <Link
              to={`/arena/code/${room.joinCode}`}
              className="touch-target hidden h-11 items-center gap-2 rounded-2xl border-2 border-slate-900 bg-white px-3 text-sm font-black text-slate-900 dark:border-white dark:bg-slate-800 dark:text-slate-100 md:inline-flex"
              style={{ boxShadow: '0 4px 0 var(--shadow-chunky, #1f1a14)' }}
            >
              <Smartphone size={15} /> Player
            </Link>
            {canExtend && (
              <HostActionBtn variant="success" title="+15 сек" onClick={() => runHostAction('extend-timer', { extraSec: 15 })} disabled={actionBusy}>
                <Plus size={15} /> 15s
              </HostActionBtn>
            )}
            {canPause && (
              <HostActionBtn variant="warning" title="Пауза" onClick={() => runHostAction('pause')} disabled={actionBusy}>
                <Pause size={16} />
              </HostActionBtn>
            )}
            {isPaused && (
              <HostActionBtn variant="success" title="Продолжить" onClick={() => runHostAction('resume')} disabled={actionBusy}>
                <Play size={16} />
              </HostActionBtn>
            )}
            {room.status !== 'lobby' && !['final', 'cancelled', 'declined'].includes(room.status) && (
              <HostActionBtn variant="primary" title="Пропустить" onClick={() => runHostAction('skip')} disabled={actionBusy}>
                <SkipForward size={16} />
              </HostActionBtn>
            )}
            {!['cancelled', 'declined', 'final'].includes(room.status) && (
              <HostActionBtn variant="danger" title="Отменить" onClick={() => runHostAction('cancel')} disabled={actionBusy}>
                <XCircle size={16} />
              </HostActionBtn>
            )}
          </div>
        </header>

        <main className="flex flex-1 flex-col gap-4">
          {/* Lobby */}
          {room.status === 'lobby' && (
            <section className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)]">
              <div
                className="flex min-h-[60vh] flex-col justify-between rounded-[2.5rem] border-2 border-slate-900 bg-white p-6 dark:border-white dark:bg-slate-900"
                style={{ boxShadow: '0 6px 0 var(--shadow-chunky, #1f1a14)' }}
              >
                <div>
                  <span className="inline-flex items-center gap-1 rounded-full border-2 border-primary-700 bg-primary-50 px-3 py-1 text-xs font-black uppercase tracking-[0.3em] text-primary-700 dark:border-primary-300 dark:bg-primary-900/30 dark:text-primary-300">
                    UniTest Arena
                  </span>
                  <h1 className="mt-5 max-w-5xl text-4xl font-black leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">
                    {room.title}
                  </h1>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-[minmax(0,1fr)_260px]">
                  <ChunkyCard variant="primary" className="relative overflow-hidden p-6 text-white">
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-white/80">Код входа</p>
                    <p className="mt-3 font-mono text-6xl font-black tracking-[0.2em] sm:text-7xl md:text-8xl">{room.joinCode}</p>
                    <div className="mt-5 hidden sm:flex">
                      <ArenaJoinQR
                        url={`${window.location.origin}/arena/code/${room.joinCode}`}
                        size={130}
                        caption="Сканируй QR"
                      />
                    </div>
                  </ChunkyCard>
                  <ChunkyCard variant="amber" className="p-5">
                    <div className="flex items-center gap-3">
                      <Users className="text-slate-900" size={28} />
                      <div>
                        <p className="text-4xl font-black text-slate-900">{participants.length}</p>
                        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-800">игроков</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => runHostAction('start')}
                      disabled={actionBusy || participants.length === 0}
                      className="chunky-btn-dark mt-6 w-full justify-center text-base"
                    >
                      <Play size={18} /> Старт
                    </button>
                  </ChunkyCard>
                </div>
              </div>

              <div
                className="flex min-h-[60vh] flex-col rounded-[2.5rem] border-2 border-slate-900 bg-white p-5 dark:border-white dark:bg-slate-900"
                style={{ boxShadow: '0 6px 0 var(--shadow-chunky, #1f1a14)' }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-primary-600 dark:text-primary-300">Players</p>
                    <h2 className="text-2xl font-black">Лобби</h2>
                  </div>
                  <span className="chunky-pill bg-white text-slate-900" style={{ boxShadow: '0 3px 0 #94a3b8' }}>
                    {onlineCount} online
                  </span>
                </div>
                <div className="mt-5 flex flex-1 content-start flex-wrap gap-2 overflow-auto">
                  {participants.length ? participants.map(p => (
                    <PlayerPill key={p._id} participant={p} onKick={kickParticipant} />
                  )) : (
                    <div className="rounded-3xl border-2 border-dashed border-slate-300 bg-slate-50 p-5 text-sm font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                      Игроки появятся здесь после входа по коду.
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Countdown */}
          {isCountdown && (
            <section className="grid flex-1 place-items-center">
              <motion.div
                key={countdownSec}
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 16 }}
                className="text-center"
              >
                <p className="text-sm font-black uppercase tracking-[0.4em] text-primary-600 dark:text-primary-300">Матч начинается</p>
                <p className="mt-4 text-[10rem] font-black leading-none text-slate-900 dark:text-white sm:text-[16rem]">{countdownSec}</p>
                <p className="mt-4 text-xl font-black text-slate-600 dark:text-slate-300 sm:text-3xl">Первый вопрос открывается</p>
              </motion.div>
            </section>
          )}

          {/* Intro */}
          {room.status === 'question_intro' && (
            <section
              className="flex flex-1 flex-col justify-center rounded-[2.5rem] border-2 border-slate-900 bg-white p-6 text-slate-900 dark:border-white dark:bg-slate-900 dark:text-white sm:p-8"
              style={{ boxShadow: '0 6px 0 var(--shadow-chunky, #1f1a14)' }}
            >
              <p className="text-xs font-black uppercase tracking-[0.3em] text-primary-600 dark:text-primary-300">Вопрос {room.currentQuestion?.questionNumber}</p>
              <h1 className="mt-4 max-w-6xl text-4xl font-black leading-[0.98] tracking-tight sm:text-6xl md:text-7xl">
                {room.currentQuestion?.questionText}
              </h1>
              <p className="mt-8 font-mono text-5xl font-black text-primary-300 sm:text-6xl">{countdownSec}</p>
            </section>
          )}

          {/* Question */}
          {(room.status === 'live_question' || room.status === 'answer_reveal') && (
            <ArenaQuestionPanel
              question={room.currentQuestion}
              timeLeftMs={timeLeftMs}
              mode="host"
              showAnswer={showAnswer}
              answerStats={room.answerStats}
            />
          )}

          {/* Leaderboard */}
          {(room.status === 'leaderboard' || room.status === 'round_result') && (
            <section className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div
                className="w-full rounded-[2.5rem] border-2 border-slate-900 bg-primary-500 p-6 text-white dark:border-white sm:p-7"
                style={{ boxShadow: '0 6px 0 #9a3412' }}
              >
                <p className="text-xs font-black uppercase tracking-[0.3em] text-white/85">Leaderboard</p>
                <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-6xl md:text-7xl">Текущий топ</h1>
                <p className="mt-5 font-mono text-5xl font-black text-amber-200">{countdownSec}</p>
              </div>
              <ArenaStandings participants={participants} title="Рейтинг" limit={8} />
            </section>
          )}

          {/* Final */}
          {['final', 'cancelled', 'declined'].includes(room.status) && (
            <section className="grid flex-1 content-center gap-4">
              <ChunkyCard variant="primary" className="p-6 sm:p-8">
                <div className="flex items-center gap-4">
                  <div className="chunky-card grid h-16 w-16 place-items-center bg-slate-900 text-amber-300" style={{ boxShadow: '0 5px 0 #020617' }}>
                    <Trophy size={30} />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-white/80">Финал</p>
                    <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl md:text-6xl">
                      {room.status === 'final' ? 'Матч завершён' : 'Комната закрыта'}
                    </h1>
                  </div>
                </div>
                <Link to={`/arena/results/${room._id}`} className="chunky-btn-dark mt-6 inline-flex">
                  <Trophy size={16} /> Результаты
                </Link>
              </ChunkyCard>
              {room.status === 'final' && <ArenaStandings participants={participants} title="Финальный подиум" variant="podium" limit={3} />}
            </section>
          )}
        </main>

        <ArenaGameplayOverlay room={room} participant={null} />
      </div>
    </div>
  );
}
