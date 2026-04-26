import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Copy, LogIn, Play, Swords, Trophy, Users, XCircle, Pause } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { connectArenaSocket, disconnectArenaSocket, getArenaSocket } from '../services/arenaSocket';
import BrandLogo from '../components/BrandLogo';
import ArenaStandings from '../components/arena/ArenaStandings';
import ArenaQuestionPanel from '../components/arena/ArenaQuestionPanel';
import ArenaGameplayOverlay from '../components/arena/ArenaGameplayOverlay';
import ChunkyButton from '../components/ui/ChunkyButton';
import ChunkyCard from '../components/ui/ChunkyCard';
import Confetti from '../components/ui/Confetti';
import { haptic } from '../utils/haptics';

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

const guestTokenKey = (joinCode) => `unitest_arena_guest_${String(joinCode || '').toUpperCase()}`;

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

function buildUserId(user) {
  return user?._id || user?.id || null;
}

function getParticipantId(participant) {
  return String(participant?._id || '');
}

function PlayerShell({ children }) {
  return (
    <div className="min-h-screen arena-stage-bg">
      <div className="relative mx-auto flex min-h-screen w-full max-w-2xl flex-col px-4 py-4 sm:max-w-3xl sm:px-6 sm:py-6">
        {children}
      </div>
    </div>
  );
}

export default function ArenaCodePage() {
  const { joinCode } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const currentUserId = buildUserId(user);

  const [room, setRoom] = useState(null);
  const [participant, setParticipant] = useState(null);
  const [guestName, setGuestName] = useState('');
  const [guestToken, setGuestToken] = useState(() => localStorage.getItem(guestTokenKey(joinCode)) || '');
  const [loading, setLoading] = useState(true);
  const [joinBusy, setJoinBusy] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [ack, setAck] = useState(null);
  const [timeLeftMs, setTimeLeftMs] = useState(0);

  const normalizedJoinCode = String(joinCode || '').toUpperCase();
  const isHostUser = Boolean(currentUserId && room?.hostUser?._id === currentUserId);
  const isInvitedUser = Boolean(currentUserId && room?.invitedUserId === currentUserId);

  const fetchRoomSummary = useCallback(async () => {
    try {
      const res = await api.get(`/arena/code/${normalizedJoinCode}`);
      setRoom(res.data.room);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Комната арены не найдена');
      navigate('/arena');
    } finally {
      setLoading(false);
    }
  }, [navigate, normalizedJoinCode]);

  const joinArena = useCallback(async (payload = {}) => {
    if (!room?._id) return null;
    setJoinBusy(true);
    try {
      const res = await api.post(`/arena/rooms/${room._id}/join`, payload);
      setRoom(res.data.room);
      setParticipant(res.data.participant);
      if (res.data.guestToken) {
        localStorage.setItem(guestTokenKey(normalizedJoinCode), res.data.guestToken);
        setGuestToken(res.data.guestToken);
      }
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Не удалось войти в арену');
      return null;
    } finally {
      setJoinBusy(false);
    }
  }, [normalizedJoinCode, room?._id]);

  useEffect(() => { fetchRoomSummary(); }, [fetchRoomSummary]);

  useEffect(() => {
    if (!room?._id || participant || actionBusy) return;
    if (guestToken) { joinArena({ guestToken }); return; }
    if (isAuthenticated && room.sourceType !== 'public') {
      if (room.sourceType === 'dm_duel' && room.status === 'pending_acceptance' && isInvitedUser) return;
      joinArena();
    }
  }, [actionBusy, guestToken, isAuthenticated, isInvitedUser, joinArena, participant, room]);

  useEffect(() => {
    if (!room?._id || (!participant && !isHostUser)) return undefined;
    const socket = connectArenaSocket({ arenaGuestToken: !isAuthenticated ? guestToken : undefined }) || getArenaSocket();
    if (!socket) return undefined;

    const handleState = (nextRoom) => {
      setRoom(nextRoom);
      setAck((prev) => (prev?.questionIndex === nextRoom.currentQuestionIndex ? prev : null));
    };
    const handleAck = (nextAck) => {
      setAck(nextAck);
      if (nextAck?.correct) haptic.success();
      else haptic.tap();
    };
    const handleError = ({ message }) => { if (message) toast.error(message); };
    const handleKicked = (payload) => {
      if (!payload) return;
      const myParticipantId = getParticipantId(participant);
      const matchesUser = currentUserId && payload.userId === String(currentUserId);
      const matchesGuest = guestToken && payload.guestTokenId;
      const matchesParticipant = myParticipantId && payload.participantId === myParticipantId;
      if (matchesUser || matchesGuest || matchesParticipant) {
        toast.error('Ведущий исключил вас из арены');
        setTimeout(() => navigate('/arena'), 800);
      }
    };

    ARENA_EVENTS.forEach(eventName => socket.on(eventName, handleState));
    socket.on('arena:answerAck', handleAck);
    socket.on('arena:error', handleError);
    socket.on('arena:kicked', handleKicked);
    socket.emit('arena:join', { roomId: room._id, guestToken });

    return () => {
      socket.emit('arena:leave', { roomId: room._id });
      ARENA_EVENTS.forEach(eventName => socket.off(eventName, handleState));
      socket.off('arena:answerAck', handleAck);
      socket.off('arena:error', handleError);
      socket.off('arena:kicked', handleKicked);
      disconnectArenaSocket();
    };
  }, [currentUserId, guestToken, isAuthenticated, isHostUser, navigate, participant, room?._id]);

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

  const participants = useMemo(() => room?.participants || [], [room?.participants]);
  const currentParticipant = useMemo(() => {
    const id = getParticipantId(participant);
    return participants.find(item => getParticipantId(item) === id) || participant;
  }, [participant, participants]);

  const submitAnswer = (payload) => {
    if (!room?._id || !currentParticipant) return;
    const socket = getArenaSocket() || connectArenaSocket({ arenaGuestToken: !isAuthenticated ? guestToken : undefined });
    socket?.emit('arena:submitAnswer', { roomId: room._id, guestToken, ...payload });
    haptic.press();
  };

  const acceptDuel = async () => {
    if (!room?._id) return;
    setActionBusy(true);
    try {
      const res = await api.post(`/arena/rooms/${room._id}/accept-duel`);
      setRoom(res.data.room);
      setParticipant(res.data.participant);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Не удалось принять дуэль');
    } finally {
      setActionBusy(false);
    }
  };

  const declineDuel = async () => {
    if (!room?._id) return;
    setActionBusy(true);
    try {
      await api.post(`/arena/rooms/${room._id}/decline-duel`);
      setRoom(prev => prev ? { ...prev, status: 'declined' } : prev);
      toast.success('Дуэль отклонена');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Не удалось отклонить дуэль');
    } finally {
      setActionBusy(false);
    }
  };

  const runHostAction = async (kind) => {
    if (!room?._id) return;
    setActionBusy(true);
    try {
      const res = await api.post(`/arena/rooms/${room._id}/${kind}`);
      if (res.data?.room) setRoom(res.data.room);
      if (kind === 'cancel') toast.success('Арена отменена');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Ошибка действия арены');
    } finally {
      setActionBusy(false);
    }
  };

  const showAnswer = room?.status === 'answer_reveal' || room?.status === 'leaderboard' || room?.status === 'round_result';
  const isCountdown = room?.status === 'countdown' || room?.status === 'starting_countdown';
  const answerLocked = !currentParticipant
    || currentParticipant.answeredCurrentQuestion
    || ack?.questionIndex === room?.currentQuestionIndex
    || room?.status !== 'live_question';

  if (loading || !room) {
    return (
      <PlayerShell>
        <div className="grid min-h-screen place-items-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-200 border-t-primary-500" />
        </div>
      </PlayerShell>
    );
  }

  const countdownSec = Math.max(0, Math.ceil(timeLeftMs / 1000));
  const isFinal = room.status === 'final';
  const myPlacement = currentParticipant?.placement || null;
  const isWinner = myPlacement === 1;

  return (
    <PlayerShell>
      {/* Header */}
      <header className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/arena')}
            className="touch-target grid h-11 w-11 place-items-center rounded-2xl border-2 border-slate-900 bg-white text-slate-900 dark:border-white dark:bg-slate-800 dark:text-slate-100"
            style={{ boxShadow: '0 4px 0 var(--shadow-chunky, #1f1a14)' }}
            aria-label="Назад"
          >
            <ArrowLeft size={18} strokeWidth={2.6} />
          </button>
          <div className="rounded-2xl bg-white px-3 py-2">
            <BrandLogo />
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(`${window.location.origin}/arena/code/${room.joinCode}`);
            toast.success('Ссылка скопирована');
          }}
          className="chunky-btn chunky-btn-ghost touch-target"
        >
          <Copy size={15} /> <span className="font-mono tracking-[0.2em]">{room.joinCode}</span>
        </button>
      </header>

      {/* No participant, public: show join form */}
      {!currentParticipant && room.sourceType === 'public' && (
        <section className="grid flex-1 place-items-center">
          <ChunkyCard variant="cream" className="w-full max-w-md p-6">
            <span className="chunky-pill bg-primary-500 text-white">
              <Swords size={12} /> Арена
            </span>
            <h1 className="mt-4 text-3xl font-black leading-tight text-dark sm:text-4xl">{room.title}</h1>
            <p className="mt-2 text-sm font-semibold text-slate-600">Введи ник и подключайся — играем!</p>

            <div className="mt-6 space-y-3">
              {!isAuthenticated ? (
                <>
                  <input
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Твой ник"
                    maxLength={20}
                    className="chunky-input text-lg py-4"
                  />
                  <ChunkyButton
                    variant="primary"
                    size="xl"
                    full
                    loading={joinBusy}
                    disabled={!guestName.trim()}
                    icon={<LogIn size={20} />}
                    onClick={() => joinArena({ guestName })}
                  >
                    Войти в игру
                  </ChunkyButton>
                  <p className="text-center text-xs font-semibold text-slate-500">
                    Или <Link to="/login" className="text-primary-600 underline">войдите</Link> в аккаунт
                  </p>
                </>
              ) : (
                <ChunkyButton
                  variant="primary"
                  size="xl"
                  full
                  loading={joinBusy}
                  icon={<LogIn size={20} />}
                  onClick={() => joinArena()}
                >
                  Войти как {user?.firstName}
                </ChunkyButton>
              )}
            </div>
          </ChunkyCard>
        </section>
      )}

      {/* No participant, non-public, not authed: need account */}
      {!currentParticipant && room.sourceType !== 'public' && !isAuthenticated && (
        <section className="grid flex-1 place-items-center">
          <ChunkyCard variant="white" className="w-full max-w-md p-6">
            <h2 className="text-2xl font-black text-dark">Нужен аккаунт</h2>
            <p className="mt-2 text-sm font-semibold text-slate-600">Дуэли и приватные арены доступны только авторизованным игрокам.</p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Link to="/login" className="chunky-btn-primary flex-1 justify-center">Войти</Link>
              <Link to="/register" className="chunky-btn-ghost flex-1 justify-center">Регистрация</Link>
            </div>
          </ChunkyCard>
        </section>
      )}

      {/* Duel pending */}
      {room.sourceType === 'dm_duel' && room.status === 'pending_acceptance' && (
        <section className="grid flex-1 place-items-center">
          <ChunkyCard variant="cream" className="w-full max-w-xl p-6">
            <div className="flex items-start gap-4">
              <div className="chunky-card grid h-14 w-14 place-items-center bg-primary-500 text-white" style={{ boxShadow: '0 5px 0 #9a3412' }}>
                <Swords size={24} />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-black text-dark sm:text-3xl">Дуэль ждёт</h2>
                <p className="mt-1 text-sm font-semibold text-slate-600">
                  {isInvitedUser ? 'Прими вызов, чтобы открыть лобби.' : 'Приглашение отправлено. Ждём второго игрока.'}
                </p>
                {isInvitedUser && !currentParticipant && (
                  <div className="mt-5 flex flex-wrap gap-3">
                    <ChunkyButton variant="primary" onClick={acceptDuel} loading={actionBusy}>Принять</ChunkyButton>
                    <ChunkyButton variant="danger" onClick={declineDuel} loading={actionBusy} icon={<XCircle size={15} />}>Отклонить</ChunkyButton>
                  </div>
                )}
              </div>
            </div>
          </ChunkyCard>
        </section>
      )}

      {/* Active player content */}
      {currentParticipant && (
        <main className="flex flex-1 flex-col gap-4">
          {room.status === 'lobby' && (
            <section className="grid flex-1 content-center gap-4">
              <ChunkyCard variant="cream" className="p-6 sm:p-8">
                <span className="chunky-pill bg-white text-primary-600" style={{ boxShadow: '0 3px 0 #fed7aa' }}>Лобби</span>
                <h1 className="mt-3 text-3xl font-black leading-tight text-dark sm:text-4xl">{room.title}</h1>

                <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_1fr]">
                  <ChunkyCard variant="primary" className="p-5">
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/80">PIN</p>
                    <p className="mt-2 font-mono text-5xl font-black tracking-[0.22em] text-white sm:text-6xl">{room.joinCode}</p>
                  </ChunkyCard>
                  <ChunkyCard variant="white" className="flex items-center gap-3 p-5">
                    <div className="chunky-card grid h-12 w-12 place-items-center bg-amber-400 text-slate-900" style={{ boxShadow: '0 4px 0 #b45309' }}>
                      <Users size={20} />
                    </div>
                    <div>
                      <p className="text-3xl font-black text-dark">{participants.length}</p>
                      <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">в лобби</p>
                    </div>
                  </ChunkyCard>
                </div>

                {isHostUser && (
                  <div className="mt-6 flex flex-wrap gap-3">
                    <ChunkyButton variant="primary" size="lg" icon={<Play size={17} />} disabled={participants.length === 0} loading={actionBusy} onClick={() => runHostAction('start')}>
                      Старт
                    </ChunkyButton>
                    <ChunkyButton variant="danger" size="lg" loading={actionBusy} onClick={() => runHostAction('cancel')}>
                      Отменить
                    </ChunkyButton>
                  </div>
                )}
                {!isHostUser && (
                  <p className="mt-6 text-sm font-bold text-slate-600 dark:text-slate-300">
                    Ждём ведущего... Устройтесь поудобнее 🎮
                  </p>
                )}
              </ChunkyCard>

              <ChunkyCard variant="white" className="p-4">
                <div className="flex flex-wrap gap-2">
                  {participants.length ? participants.map(p => (
                    <span key={p._id} className="chunky-pill bg-amber-100 text-slate-900">
                      <span className={`h-2 w-2 rounded-full ${p.state === 'joined' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      {p.displayName || 'Игрок'}
                    </span>
                  )) : (
                    <p className="text-sm font-semibold text-slate-500">Ожидаем игроков...</p>
                  )}
                </div>
              </ChunkyCard>
            </section>
          )}

          {isCountdown && (
            <section className="grid flex-1 place-items-center">
              <motion.div
                key={countdownSec}
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 16 }}
                className="text-center"
              >
                <p className="text-sm font-black uppercase tracking-[0.4em] text-primary-600 dark:text-primary-300">Старт</p>
                <p className="mt-4 text-[8rem] font-black leading-none text-slate-900 dark:text-white sm:text-[12rem]">{countdownSec}</p>
                <p className="mt-4 text-xl font-black text-slate-600 dark:text-slate-300">Смотри на главный экран</p>
              </motion.div>
            </section>
          )}

          {room.status === 'paused' && (
            <section className="grid flex-1 place-items-center">
              <ChunkyCard variant="amber" className="p-8 text-center">
                <div className="chunky-card mx-auto grid h-16 w-16 place-items-center bg-white text-amber-600" style={{ boxShadow: '0 4px 0 #b45309' }}>
                  <Pause size={26} />
                </div>
                <p className="mt-4 text-xs font-black uppercase tracking-[0.3em]">Пауза</p>
                <h2 className="mt-2 text-3xl font-black text-slate-900">Ведущий остановил игру</h2>
                <p className="mt-3 text-sm font-bold text-slate-800">Оставайтесь на странице — мы продолжим автоматически.</p>
              </ChunkyCard>
            </section>
          )}

          {room.status === 'question_intro' && (
            <section className="grid flex-1 place-items-center">
              <ChunkyCard variant="primary" className="w-full max-w-3xl p-6 sm:p-8">
                <p className="text-xs font-black uppercase tracking-[0.3em] text-white/85">Следующий вопрос</p>
                <h1
                  className="prose prose-headings:!my-0 prose-invert mt-3 max-w-none text-2xl font-black leading-tight text-white prose-p:!my-0 prose-strong:font-black sm:text-3xl md:text-4xl"
                  dangerouslySetInnerHTML={{ __html: room.currentQuestion?.questionText || '' }}
                />
                <p className="mt-6 font-mono text-5xl font-black text-amber-200 sm:text-6xl">{countdownSec}</p>
              </ChunkyCard>
            </section>
          )}

          {(room.status === 'live_question' || room.status === 'answer_reveal') && (
            <ArenaQuestionPanel
              question={room.currentQuestion}
              timeLeftMs={timeLeftMs}
              locked={answerLocked}
              onSubmit={submitAnswer}
              ack={ack}
              showAnswer={showAnswer}
              answerStats={room.answerStats}
            />
          )}

          {(room.status === 'leaderboard' || room.status === 'round_result') && (
            <section className="grid flex-1 content-start gap-4">
              <ChunkyCard variant="primary" className="p-6">
                <p className="text-xs font-black uppercase tracking-[0.3em] text-white/85">Рейтинг</p>
                <h2 className="mt-2 text-3xl font-black text-white sm:text-4xl">Следующий вопрос скоро</h2>
                <p className="mt-4 font-mono text-5xl font-black text-amber-200">{countdownSec}</p>
              </ChunkyCard>
              <ArenaStandings participants={participants} title="Текущий топ" />
            </section>
          )}

          {['final', 'cancelled', 'declined'].includes(room.status) && (
            <section className="grid flex-1 content-center gap-4">
              {isFinal && isWinner ? <Confetti active duration={2800} /> : null}
              <ChunkyCard variant={isFinal && isWinner ? 'primary' : 'white'} className="p-6 sm:p-8">
                <div className="flex items-center gap-4">
                  <div className="chunky-card grid h-16 w-16 place-items-center bg-amber-400 text-slate-900" style={{ boxShadow: '0 5px 0 #b45309' }}>
                    <Trophy size={28} />
                  </div>
                  <div>
                    <p className={`text-xs font-black uppercase tracking-[0.3em] ${isFinal && isWinner ? 'text-white/80' : 'text-slate-500'}`}>
                      {isFinal ? 'Финал' : 'Статус'}
                    </p>
                    <h2 className={`text-3xl font-black sm:text-4xl ${isFinal && isWinner ? 'text-white' : 'text-dark'}`}>
                      {room.status === 'final' ? (isWinner ? 'Ты победил! 🎉' : 'Матч завершён') : 'Комната закрыта'}
                    </h2>
                    {myPlacement && isFinal ? (
                      <p className={`mt-2 text-sm font-bold ${isWinner ? 'text-white/90' : 'text-slate-600'}`}>
                        Твоё место: #{myPlacement}
                        {currentParticipant?.score ? ` · ${currentParticipant.score} очков` : ''}
                      </p>
                    ) : null}
                  </div>
                </div>
                {isFinal && (
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Link to={`/arena/results/${room._id}`} className={isWinner ? 'chunky-btn-dark' : 'chunky-btn-primary'}>
                      <Trophy size={16} /> Результаты
                    </Link>
                    <Link to="/arena" className="chunky-btn-ghost">Ещё игру</Link>
                  </div>
                )}
              </ChunkyCard>
              {isFinal && <ArenaStandings participants={participants} title="Финальный подиум" variant="podium" />}
            </section>
          )}
        </main>
      )}

      {currentParticipant ? (
        <ArenaGameplayOverlay room={room} participant={currentParticipant} guestToken={guestToken} />
      ) : null}
    </PlayerShell>
  );
}
