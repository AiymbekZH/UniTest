import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Copy, LogIn, Play, Swords, Trophy, Users, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { connectArenaSocket, disconnectArenaSocket, getArenaSocket } from '../services/arenaSocket';
import BrandLogo from '../components/BrandLogo';
import ArenaStandings from '../components/arena/ArenaStandings';
import ArenaQuestionPanel from '../components/arena/ArenaQuestionPanel';

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

function JoinShell({ children }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#070709] px-4 py-6 text-white">
      <div className="pointer-events-none absolute -left-32 top-16 h-96 w-96 rounded-full bg-orange-500/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-28 bottom-10 h-[30rem] w-[30rem] rounded-full bg-amber-400/15 blur-3xl" />
      <div className="relative z-10 mx-auto max-w-5xl">{children}</div>
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
      navigate('/dashboard');
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

  useEffect(() => {
    fetchRoomSummary();
  }, [fetchRoomSummary]);

  useEffect(() => {
    if (!room?._id || participant || actionBusy) return;
    if (guestToken) {
      joinArena({ guestToken });
      return;
    }
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
    const handleAck = (nextAck) => setAck(nextAck);
    const handleError = ({ message }) => {
      if (message) toast.error(message);
    };

    ARENA_EVENTS.forEach(eventName => socket.on(eventName, handleState));
    socket.on('arena:answerAck', handleAck);
    socket.on('arena:error', handleError);
    socket.emit('arena:join', { roomId: room._id, guestToken });

    return () => {
      socket.emit('arena:leave', { roomId: room._id });
      ARENA_EVENTS.forEach(eventName => socket.off(eventName, handleState));
      socket.off('arena:answerAck', handleAck);
      socket.off('arena:error', handleError);
      disconnectArenaSocket();
    };
  }, [guestToken, isAuthenticated, isHostUser, participant, room?._id]);

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

  const participants = useMemo(() => room?.participants || [], [room?.participants]);
  const currentParticipant = useMemo(() => {
    const id = getParticipantId(participant);
    return participants.find(item => getParticipantId(item) === id) || participant;
  }, [participant, participants]);

  const submitAnswer = (payload) => {
    if (!room?._id || !currentParticipant) return;
    const socket = getArenaSocket() || connectArenaSocket({ arenaGuestToken: !isAuthenticated ? guestToken : undefined });
    socket?.emit('arena:submitAnswer', {
      roomId: room._id,
      guestToken,
      ...payload
    });
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
      <JoinShell>
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-200 border-t-orange-500" />
        </div>
      </JoinShell>
    );
  }

  return (
    <JoinShell>
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
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/arena/code/${room.joinCode}`);
              toast.success('Ссылка комнаты скопирована');
            }}
            className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-black text-slate-950 transition hover:border-orange-200 hover:bg-orange-50"
          >
            <Copy size={15} /> Код {room.joinCode}
          </button>
          {isHostUser && (
            <Link
              to={`/arena/host/${room._id}`}
              className="hidden rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-orange-600 sm:inline-flex"
            >
              Экран ведущего
            </Link>
          )}
        </div>
      </header>

      {!currentParticipant && room.sourceType === 'public' && (
        <section className="rounded-[2.5rem] border border-white/10 bg-white/10 p-5 shadow-[0_36px_100px_-60px_rgba(0,0,0,0.95)] backdrop-blur">
          <div className="rounded-[2rem] bg-white p-6 text-slate-950">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-500">UniTest Arena</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight">{room.title}</h1>
            <p className="mt-2 text-gray-500">Введи ник и подключайся. Если войдёшь в аккаунт, получишь XP после финала.</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              {!isAuthenticated ? (
                <>
                  <input
                    value={guestName}
                    onChange={(event) => setGuestName(event.target.value)}
                    className="min-h-14 flex-1 rounded-2xl border border-gray-200 bg-gray-50 px-4 text-base font-semibold text-slate-950 outline-none transition focus:border-orange-300 focus:bg-white"
                    placeholder="Твой ник"
                  />
                  <button
                    type="button"
                    onClick={() => joinArena({ guestName })}
                    disabled={joinBusy || !guestName.trim()}
                    className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-6 text-sm font-black text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <LogIn size={16} /> Войти
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => joinArena()}
                  disabled={joinBusy}
                  className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-6 text-sm font-black text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <LogIn size={16} /> Войти как {user?.firstName}
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {!currentParticipant && room.sourceType !== 'public' && !isAuthenticated && (
        <section className="rounded-[2rem] border border-white/10 bg-white p-6 text-slate-950">
          <h2 className="text-2xl font-black">Нужен аккаунт</h2>
          <p className="mt-2 text-gray-500">Для дуэлей и групповых арен нужен авторизованный профиль.</p>
          <div className="mt-5 flex gap-3">
            <Link to="/login" className="rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-white transition hover:bg-orange-600">Войти</Link>
            <Link to="/register" className="rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-black text-slate-950 transition hover:border-orange-200 hover:bg-orange-50">Регистрация</Link>
          </div>
        </section>
      )}

      {room.sourceType === 'dm_duel' && room.status === 'pending_acceptance' && (
        <section className="rounded-[2rem] border border-white/10 bg-white p-6 text-slate-950">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
              <Swords size={24} />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-black">Дуэль ждёт подтверждения</h2>
              <p className="mt-2 text-gray-500">
                {isInvitedUser ? 'Прими вызов, чтобы открыть лобби.' : 'Приглашение отправлено. Ждём второго игрока.'}
              </p>
              {isInvitedUser && !currentParticipant && (
                <div className="mt-5 flex gap-3">
                  <button
                    type="button"
                    onClick={acceptDuel}
                    disabled={actionBusy}
                    className="rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-white transition hover:bg-orange-600 disabled:opacity-50"
                  >
                    Принять дуэль
                  </button>
                  <button
                    type="button"
                    onClick={declineDuel}
                    disabled={actionBusy}
                    className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-black text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                  >
                    <XCircle size={15} /> Отклонить
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {currentParticipant && (
        <main className="space-y-5">
          {room.status === 'lobby' && (
            <section className="rounded-[2.5rem] border border-white/10 bg-white/10 p-5 shadow-[0_36px_100px_-60px_rgba(0,0,0,0.95)] backdrop-blur">
              <div className="rounded-[2rem] bg-white p-6 text-slate-950">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-500">Лобби</p>
                <h1 className="mt-3 text-4xl font-black tracking-tight">{room.title}</h1>
                <p className="mt-2 text-gray-500">Ты в комнате. Ждём старт ведущего.</p>
                <div className="mt-6 flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
                  <Users className="text-orange-500" size={22} />
                  <span className="text-lg font-black">{participants.length} игроков</span>
                </div>
                {isHostUser && (
                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => runHostAction('start')}
                      disabled={actionBusy || participants.length === 0}
                      className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-6 py-3 text-sm font-black text-white transition hover:bg-orange-600 disabled:opacity-50"
                    >
                      <Play size={16} /> Старт
                    </button>
                    <button
                      type="button"
                      onClick={() => runHostAction('cancel')}
                      disabled={actionBusy}
                      className="rounded-2xl border border-red-200 bg-red-50 px-6 py-3 text-sm font-black text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                    >
                      Отменить
                    </button>
                  </div>
                )}
              </div>
            </section>
          )}

          {isCountdown && (
            <section className="flex min-h-[62vh] flex-col items-center justify-center rounded-[2.5rem] border border-white/10 bg-white/10 p-6 text-center shadow-[0_36px_100px_-60px_rgba(0,0,0,0.95)]">
              <p className="text-sm font-black uppercase tracking-[0.35em] text-orange-300">Матч начинается</p>
              <p className="mt-6 text-[9rem] font-black leading-none">{Math.max(0, Math.ceil(timeLeftMs / 1000))}</p>
              <p className="mt-4 text-xl font-bold text-white/70">Смотри на главный экран.</p>
            </section>
          )}

          {room.status === 'question_intro' && (
            <section className="flex min-h-[62vh] flex-col justify-center rounded-[2.5rem] border border-white/10 bg-white/10 p-6 shadow-[0_36px_100px_-60px_rgba(0,0,0,0.95)]">
              <p className="text-sm font-black uppercase tracking-[0.35em] text-orange-300">Следующий вопрос</p>
              <h1 className="mt-4 text-4xl font-black leading-tight tracking-tight">{room.currentQuestion?.questionText}</h1>
              <p className="mt-6 text-3xl font-black text-white/60">Ответы откроются через {Math.max(0, Math.ceil(timeLeftMs / 1000))}</p>
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
            <section className="space-y-4">
              <div className="rounded-[2rem] border border-white/10 bg-white/10 p-5 text-white">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-300">Рейтинг</p>
                <h2 className="mt-2 text-4xl font-black">Следующий вопрос скоро</h2>
                <p className="mt-2 text-white/70">Продолжение через {Math.max(0, Math.ceil(timeLeftMs / 1000))} сек.</p>
              </div>
              <ArenaStandings participants={participants} title="Текущий топ" />
            </section>
          )}

          {['final', 'cancelled', 'declined'].includes(room.status) && (
            <section className="space-y-4">
              <div className="rounded-[2rem] border border-white/10 bg-white p-6 text-slate-950">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500 text-white">
                    <Trophy size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-500">Финал</p>
                    <h2 className="text-3xl font-black">{room.status === 'final' ? 'Матч завершён' : 'Комната закрыта'}</h2>
                  </div>
                </div>
                {room.status === 'final' && (
                  <Link
                    to={`/arena/results/${room._id}`}
                    className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-6 py-3 text-sm font-black text-white transition hover:bg-orange-600"
                  >
                    <Trophy size={16} /> Результаты
                  </Link>
                )}
              </div>
              {room.status === 'final' && <ArenaStandings participants={participants} title="Финальный подиум" variant="podium" />}
            </section>
          )}
        </main>
      )}
    </JoinShell>
  );
}
