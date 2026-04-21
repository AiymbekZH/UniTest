import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Copy, LogIn, Play, Swords, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { connectArenaSocket, disconnectArenaSocket, getArenaSocket } from '../services/arenaSocket';
import BrandLogo from '../components/BrandLogo';
import ArenaStandings from '../components/arena/ArenaStandings';
import ArenaQuestionPanel from '../components/arena/ArenaQuestionPanel';

const guestTokenKey = (joinCode) => `unitest_arena_guest_${String(joinCode || '').toUpperCase()}`;

function computeTimeLeft(targetDate) {
  return targetDate ? Math.max(0, new Date(targetDate).getTime() - Date.now()) : 0;
}

function buildUserId(user) {
  return user?._id || user?.id || null;
}

export default function ArenaCodePage() {
  const { joinCode } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const currentUserId = buildUserId(user);

  const [room, setRoom] = useState(null);
  const [participant, setParticipant] = useState(null);
  const [meta, setMeta] = useState(null);
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
      setMeta(res.data.meta);
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
    const handleAck = (nextAck) => {
      setAck(nextAck);
    };
    const handleError = ({ message }) => {
      if (message) toast.error(message);
    };

    socket.on('arena:lobbyState', handleState);
    socket.on('arena:countdown', handleState);
    socket.on('arena:question', handleState);
    socket.on('arena:roundResult', handleState);
    socket.on('arena:final', handleState);
    socket.on('arena:answerAck', handleAck);
    socket.on('arena:error', handleError);
    socket.emit('arena:join', { roomId: room._id, guestToken });

    return () => {
      socket.emit('arena:leave', { roomId: room._id });
      socket.off('arena:lobbyState', handleState);
      socket.off('arena:countdown', handleState);
      socket.off('arena:question', handleState);
      socket.off('arena:roundResult', handleState);
      socket.off('arena:final', handleState);
      socket.off('arena:answerAck', handleAck);
      socket.off('arena:error', handleError);
      disconnectArenaSocket();
    };
  }, [guestToken, isAuthenticated, isHostUser, participant, room?._id]);

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

  const submitAnswer = (payload) => {
    if (!room?._id || !participant) return;
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
      if (res.data?.room) {
        setRoom(res.data.room);
      }
      if (kind === 'cancel') {
        toast.success('Арена отменена');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Ошибка действия арены');
    } finally {
      setActionBusy(false);
    }
  };

  const participants = useMemo(() => room?.participants || [], [room?.participants]);
  const standingsTitle = room?.status === 'final' ? 'Финальный подиум' : room?.status === 'round_result' ? 'Текущие результаты' : 'Игроки';

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
      <div className="mx-auto max-w-6xl">
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
          <div className="rounded-2xl border border-white/60 bg-white/90 px-4 py-3 text-sm text-gray-500 shadow-sm dark:border-slate-700 dark:bg-slate-900/80 dark:text-gray-300">
            Код комнаты: <span className="font-black tracking-[0.2em] text-dark dark:text-white">{room.joinCode}</span>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-6">
            <div className="rounded-[2rem] border border-white/60 bg-white/92 p-6 shadow-[0_32px_90px_-46px_rgba(15,23,42,0.6)] dark:border-slate-700 dark:bg-slate-900/88">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                    {room.sourceType === 'dm_duel' ? 'DM Duel' : room.sourceType === 'group' ? 'Group Battle' : 'Arena Room'}
                  </p>
                  <h1 className="mt-2 text-3xl font-black tracking-tight text-dark">{room.title}</h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
                    {room.sourceType === 'public' && 'Живая комната по коду. Гости могут входить без аккаунта.'}
                    {room.sourceType === 'group' && 'Состязание внутри группы. Вход только для участников группы.'}
                    {room.sourceType === 'dm_duel' && 'Личная дуэль один на один.'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/arena/code/${room.joinCode}`);
                      toast.success('Ссылка комнаты скопирована');
                    }}
                    className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-dark transition hover:border-orange-200 hover:bg-orange-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <Copy size={15} /> Скопировать ссылку
                  </button>
                  {room.sourceType !== 'dm_duel' && isHostUser && (
                    <Link
                      to={`/arena/host/${room._id}`}
                      className="inline-flex items-center gap-2 rounded-2xl bg-primary-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-600"
                    >
                      <Play size={15} /> Экран ведущего
                    </Link>
                  )}
                </div>
              </div>
            </div>

            {!participant && room.sourceType === 'public' && (
              <div className="rounded-[2rem] border border-white/60 bg-white/92 p-6 shadow-[0_32px_90px_-46px_rgba(15,23,42,0.6)] dark:border-slate-700 dark:bg-slate-900/88">
                <h2 className="text-xl font-black text-dark">Войти в арену</h2>
                <p className="mt-2 text-sm text-gray-500">Для гостевого входа нужен только ник. Если у тебя есть аккаунт, можно войти сразу и забрать XP.</p>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  {!isAuthenticated ? (
                    <>
                      <input
                        value={guestName}
                        onChange={(event) => setGuestName(event.target.value)}
                        className="flex-1 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-dark outline-none transition focus:border-orange-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        placeholder="Твой ник в арене"
                      />
                      <button
                        type="button"
                        onClick={() => joinArena({ guestName })}
                        disabled={joinBusy || !guestName.trim()}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <LogIn size={16} /> Войти
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => joinArena()}
                      disabled={joinBusy}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <LogIn size={16} /> Войти как {user?.firstName}
                    </button>
                  )}
                </div>
              </div>
            )}

            {!participant && room.sourceType !== 'public' && !isAuthenticated && (
              <div className="rounded-[2rem] border border-white/60 bg-white/92 p-6 shadow-[0_32px_90px_-46px_rgba(15,23,42,0.6)] dark:border-slate-700 dark:bg-slate-900/88">
                <h2 className="text-xl font-black text-dark">Нужен аккаунт</h2>
                <p className="mt-2 text-sm text-gray-500">Для дуэлей и групповых арен нужен авторизованный профиль.</p>
                <div className="mt-4 flex gap-3">
                  <Link to="/login" className="rounded-2xl bg-primary-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-600">Войти</Link>
                  <Link to="/register" className="rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-dark transition hover:border-orange-200 hover:bg-orange-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white">Регистрация</Link>
                </div>
              </div>
            )}

            {room.sourceType === 'dm_duel' && room.status === 'pending_acceptance' && (
              <div className="rounded-[2rem] border border-white/60 bg-white/92 p-6 shadow-[0_32px_90px_-46px_rgba(15,23,42,0.6)] dark:border-slate-700 dark:bg-slate-900/88">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-500 dark:bg-orange-900/20">
                    <Swords size={22} />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-black text-dark">Дуэль ждёт подтверждения</h2>
                    <p className="mt-2 text-sm text-gray-500">
                      {isInvitedUser
                        ? 'Прими вызов, чтобы открыть лобби и начать матч.'
                        : 'Приглашение отправлено. Ждём второго игрока.'}
                    </p>
                    {isInvitedUser && !participant && (
                      <div className="mt-5 flex gap-3">
                        <button
                          type="button"
                          onClick={acceptDuel}
                          disabled={actionBusy}
                          className="rounded-2xl bg-primary-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Принять дуэль
                        </button>
                        <button
                          type="button"
                          onClick={declineDuel}
                          disabled={actionBusy}
                          className="rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-300"
                        >
                          Отклонить
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {room.status === 'lobby' && (
              <div className="rounded-[2rem] border border-white/60 bg-white/92 p-6 shadow-[0_32px_90px_-46px_rgba(15,23,42,0.6)] dark:border-slate-700 dark:bg-slate-900/88">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">Лобби</p>
                    <h2 className="mt-2 text-2xl font-black text-dark">Игроки собираются</h2>
                    <p className="mt-2 text-sm text-gray-500">Как только ведущий запустит матч, все игроки увидят общий countdown и первый вопрос.</p>
                  </div>
                  {isHostUser && (
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => runHostAction('cancel')}
                        disabled={actionBusy}
                        className="rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-300"
                      >
                        Отменить
                      </button>
                      <button
                        type="button"
                        onClick={() => runHostAction('start')}
                        disabled={actionBusy}
                        className="rounded-2xl bg-primary-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Запустить матч
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {room.status === 'countdown' && (
              <div className="rounded-[2rem] border border-white/60 bg-white/92 p-6 text-center shadow-[0_32px_90px_-46px_rgba(15,23,42,0.6)] dark:border-slate-700 dark:bg-slate-900/88">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">Countdown</p>
                <h2 className="mt-3 text-4xl font-black tracking-tight text-dark">{Math.max(0, Math.ceil(timeLeftMs / 1000))}</h2>
                <p className="mt-2 text-sm text-gray-500">Матч начинается. Приготовься отвечать быстро.</p>
              </div>
            )}

            {room.status === 'live_question' && (
              <ArenaQuestionPanel
                question={room.currentQuestion}
                timeLeftMs={timeLeftMs}
                locked={!participant || ack?.questionIndex === room.currentQuestionIndex}
                onSubmit={submitAnswer}
                ack={ack}
              />
            )}

            {room.status === 'round_result' && (
              <div className="rounded-[2rem] border border-white/60 bg-white/92 p-6 shadow-[0_32px_90px_-46px_rgba(15,23,42,0.6)] dark:border-slate-700 dark:bg-slate-900/88">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">Раунд закрыт</p>
                <h2 className="mt-2 text-2xl font-black text-dark">Смотрим промежуточный рейтинг</h2>
                <p className="mt-2 text-sm text-gray-500">
                  {isHostUser ? 'Когда все ознакомятся, запускай следующий раунд.' : 'Ждём, пока ведущий переведёт матч к следующему вопросу.'}
                </p>
                {isHostUser && (
                  <div className="mt-5">
                    <button
                      type="button"
                      onClick={() => runHostAction('next')}
                      disabled={actionBusy}
                      className="rounded-2xl bg-primary-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {room.currentQuestionIndex >= room.questionCount - 1 ? 'Открыть финал' : 'Следующий раунд'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {['final', 'cancelled', 'declined'].includes(room.status) && (
              <div className="rounded-[2rem] border border-white/60 bg-white/92 p-6 shadow-[0_32px_90px_-46px_rgba(15,23,42,0.6)] dark:border-slate-700 dark:bg-slate-900/88">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">Финал</p>
                <h2 className="mt-2 text-2xl font-black text-dark">
                  {room.status === 'final' && 'Матч завершён'}
                  {room.status === 'cancelled' && 'Арена отменена'}
                  {room.status === 'declined' && 'Дуэль отклонена'}
                </h2>
                <p className="mt-2 text-sm text-gray-500">
                  {room.status === 'final' && 'Итоговый рейтинг уже зафиксирован. Зарегистрированные игроки получили XP и обновление серии.'}
                  {room.status !== 'final' && 'Комната больше не активна.'}
                </p>
                {room.status === 'final' && (
                  <div className="mt-5">
                    <Link
                      to={`/arena/results/${room._id}`}
                      className="inline-flex items-center gap-2 rounded-2xl bg-primary-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-600"
                    >
                      <Play size={16} /> Открыть страницу результатов
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <ArenaStandings participants={participants} title={standingsTitle} />
            <div className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.55)] dark:border-slate-700 dark:bg-slate-900/85">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-50 text-orange-500 dark:bg-orange-900/20">
                  <Users size={18} />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">Комната</p>
                  <h3 className="text-lg font-semibold text-dark">{participants.length} игроков</h3>
                </div>
              </div>
              <p className="text-sm text-gray-500">Если игроки заходят с разных устройств, им достаточно открыть ссылку по коду и войти под своим именем.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
