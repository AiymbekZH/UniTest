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

function ArenaShell({ children }) {
  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute left-[-16rem] top-[-12rem] h-[36rem] w-[36rem] rounded-full bg-orange-500/20 blur-3xl" />
        <div className="absolute bottom-[-16rem] right-[-18rem] h-[34rem] w-[34rem] rounded-full bg-amber-400/10 blur-3xl" />
      </div>
      <div className="relative z-10 mx-auto min-h-screen max-w-5xl p-4">{children}</div>
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
      <ArenaShell>
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-11 w-11 animate-spin rounded-full border-4 border-white/10 border-t-orange-500" />
        </div>
      </ArenaShell>
    );
  }

  return (
    <ArenaShell>
      <header className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
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
        </div>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(`${window.location.origin}/arena/code/${room.joinCode}`);
            toast.success('Ссылка комнаты скопирована');
          }}
          className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-sm font-black text-white transition hover:bg-white/15"
        >
          <Copy size={15} /> {room.joinCode}
        </button>
      </header>

      {!currentParticipant && room.sourceType === 'public' && (
        <section className="grid min-h-[calc(100vh-96px)] place-items-center">
          <div className="w-full max-w-xl rounded-[2.5rem] bg-[#111111] p-5 shadow-[0_36px_100px_-60px_rgba(0,0,0,1)]">
            <div className="rounded-[2rem] bg-orange-500 p-6 text-black">
              <p className="text-xs font-black uppercase tracking-[0.24em] opacity-65">UniTest Arena</p>
              <h1 className="mt-3 text-4xl font-black leading-none tracking-tight">{room.title}</h1>
              <p className="mt-4 text-base font-bold opacity-70">Введи ник и подключайся к игре.</p>
            </div>

            <div className="mt-4 rounded-[2rem] border border-white/10 bg-white/7 p-4">
              {!isAuthenticated ? (
                <div className="space-y-3">
                  <input
                    value={guestName}
                    onChange={(event) => setGuestName(event.target.value)}
                    className="h-16 w-full rounded-[1.35rem] border border-white/10 bg-white px-5 text-lg font-black text-black outline-none transition focus:border-orange-300"
                    placeholder="Твой ник"
                  />
                  <button
                    type="button"
                    onClick={() => joinArena({ guestName })}
                    disabled={joinBusy || !guestName.trim()}
                    className="inline-flex h-16 w-full items-center justify-center gap-2 rounded-[1.35rem] bg-orange-500 px-6 text-base font-black text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <LogIn size={18} /> Войти
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => joinArena()}
                  disabled={joinBusy}
                  className="inline-flex h-16 w-full items-center justify-center gap-2 rounded-[1.35rem] bg-orange-500 px-6 text-base font-black text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <LogIn size={18} /> Войти как {user?.firstName}
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {!currentParticipant && room.sourceType !== 'public' && !isAuthenticated && (
        <section className="grid min-h-[calc(100vh-96px)] place-items-center">
          <div className="w-full max-w-lg rounded-[2.5rem] bg-[#111111] p-6">
            <h2 className="text-3xl font-black">Нужен аккаунт</h2>
            <p className="mt-2 text-white/55">Для дуэлей и групповых арен нужен авторизованный профиль.</p>
            <div className="mt-5 flex gap-3">
              <Link to="/login" className="rounded-[1.25rem] bg-orange-500 px-5 py-3 text-sm font-black text-black transition hover:bg-orange-400">Войти</Link>
              <Link to="/register" className="rounded-[1.25rem] border border-white/10 bg-white/8 px-5 py-3 text-sm font-black text-white transition hover:bg-white/15">Регистрация</Link>
            </div>
          </div>
        </section>
      )}

      {room.sourceType === 'dm_duel' && room.status === 'pending_acceptance' && (
        <section className="grid min-h-[calc(100vh-96px)] place-items-center">
          <div className="w-full max-w-xl rounded-[2.5rem] bg-[#111111] p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500 text-black">
                <Swords size={24} />
              </div>
              <div className="flex-1">
                <h2 className="text-3xl font-black">Дуэль ждёт подтверждения</h2>
                <p className="mt-2 text-white/55">
                  {isInvitedUser ? 'Прими вызов, чтобы открыть лобби.' : 'Приглашение отправлено. Ждём второго игрока.'}
                </p>
                {isInvitedUser && !currentParticipant && (
                  <div className="mt-5 flex gap-3">
                    <button
                      type="button"
                      onClick={acceptDuel}
                      disabled={actionBusy}
                      className="rounded-[1.25rem] bg-orange-500 px-5 py-3 text-sm font-black text-black transition hover:bg-orange-400 disabled:opacity-40"
                    >
                      Принять
                    </button>
                    <button
                      type="button"
                      onClick={declineDuel}
                      disabled={actionBusy}
                      className="inline-flex items-center gap-2 rounded-[1.25rem] border border-red-300/20 bg-red-500/12 px-5 py-3 text-sm font-black text-red-200 transition hover:bg-red-500/20 disabled:opacity-40"
                    >
                      <XCircle size={15} /> Отклонить
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {currentParticipant && (
        <main className="space-y-4">
          {room.status === 'lobby' && (
            <section className="grid min-h-[calc(100vh-96px)] content-center gap-4">
              <div className="rounded-[2.5rem] bg-[#111111] p-6">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-300">Лобби</p>
                <h1 className="mt-3 text-5xl font-black leading-none tracking-tight">{room.title}</h1>
                <div className="mt-6 rounded-[2rem] bg-orange-500 p-5 text-black">
                  <p className="text-sm font-black uppercase tracking-[0.2em] opacity-60">Код</p>
                  <p className="mt-1 text-5xl font-black tracking-[0.15em]">{room.joinCode}</p>
                </div>
                <div className="mt-4 flex items-center gap-3 rounded-[1.5rem] border border-white/10 bg-white/7 p-4">
                  <Users className="text-orange-300" size={22} />
                  <span className="text-lg font-black">{participants.length} игроков</span>
                </div>
                {isHostUser && (
                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => runHostAction('start')}
                      disabled={actionBusy || participants.length === 0}
                      className="inline-flex items-center gap-2 rounded-[1.25rem] bg-orange-500 px-6 py-3 text-sm font-black text-black transition hover:bg-orange-400 disabled:opacity-40"
                    >
                      <Play size={16} /> Старт
                    </button>
                    <button
                      type="button"
                      onClick={() => runHostAction('cancel')}
                      disabled={actionBusy}
                      className="rounded-[1.25rem] border border-red-300/20 bg-red-500/12 px-6 py-3 text-sm font-black text-red-200 transition hover:bg-red-500/20 disabled:opacity-40"
                    >
                      Отменить
                    </button>
                  </div>
                )}
              </div>
            </section>
          )}

          {isCountdown && (
            <section className="flex min-h-[calc(100vh-96px)] flex-col items-center justify-center rounded-[2.5rem] bg-orange-500 p-6 text-center text-black">
              <p className="text-sm font-black uppercase tracking-[0.35em] opacity-60">Старт</p>
              <p className="mt-5 text-[10rem] font-black leading-none">{Math.max(0, Math.ceil(timeLeftMs / 1000))}</p>
              <p className="mt-4 text-xl font-black opacity-70">Смотри на главный экран</p>
            </section>
          )}

          {room.status === 'question_intro' && (
            <section className="flex min-h-[calc(100vh-96px)] flex-col justify-center rounded-[2.5rem] bg-[#111111] p-6">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-300">Следующий вопрос</p>
              <h1 className="mt-4 text-4xl font-black leading-tight tracking-tight">{room.currentQuestion?.questionText}</h1>
              <p className="mt-6 text-5xl font-black text-orange-300">{Math.max(0, Math.ceil(timeLeftMs / 1000))}</p>
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
            <section className="grid min-h-[calc(100vh-96px)] content-center gap-4">
              <div className="rounded-[2.5rem] bg-[#111111] p-6">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-300">Рейтинг</p>
                <h2 className="mt-2 text-5xl font-black">Следующий вопрос скоро</h2>
                <p className="mt-4 text-5xl font-black text-orange-300">{Math.max(0, Math.ceil(timeLeftMs / 1000))}</p>
              </div>
              <ArenaStandings participants={participants} title="Текущий топ" />
            </section>
          )}

          {['final', 'cancelled', 'declined'].includes(room.status) && (
            <section className="grid min-h-[calc(100vh-96px)] content-center gap-4">
              <div className="rounded-[2.5rem] bg-orange-500 p-6 text-black">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-black text-orange-300">
                    <Trophy size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.24em] opacity-60">Финал</p>
                    <h2 className="text-4xl font-black">{room.status === 'final' ? 'Матч завершён' : 'Комната закрыта'}</h2>
                  </div>
                </div>
                {room.status === 'final' && (
                  <Link
                    to={`/arena/results/${room._id}`}
                    className="mt-6 inline-flex items-center gap-2 rounded-[1.25rem] bg-black px-6 py-3 text-sm font-black text-white transition hover:bg-zinc-900"
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
    </ArenaShell>
  );
}
