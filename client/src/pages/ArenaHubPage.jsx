import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Swords, Plus, Hash, Users, Zap, Trophy, Clock, Flame,
  ChevronRight, Search, X, Sparkles, PlayCircle, ArrowRight, Radio, Crown, Rocket
} from 'lucide-react';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import ChunkyButton from '../components/ui/ChunkyButton';
import ChunkyCard from '../components/ui/ChunkyCard';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const STATUS_LABEL = {
  lobby: 'Лобби',
  pending: 'Ожидание',
  countdown: 'Старт через...',
  running: 'Идёт матч',
  active: 'Идёт матч',
  intro: 'Представление',
  reveal: 'Ответы',
  leaderboard: 'Таблица',
  final: 'Финал'
};

function formatRelative(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'только что';
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function HostNameBadge({ host }) {
  if (!host) return <span className="text-slate-400">—</span>;
  const label = host.username
    ? `@${host.username}`
    : `${host.firstName || ''} ${host.lastName || ''}`.trim() || '@user';
  return <span className="font-black text-primary-600">{label}</span>;
}

function LiveRoomCard({ room, onJoin }) {
  return (
    <motion.button
      layout
      whileTap={{ y: 4 }}
      onClick={onJoin}
      className="chunky-card group relative flex w-full flex-col gap-3 p-5 text-left active:[box-shadow:0_0_0_#e2e8f0]"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="chunky-pill bg-emerald-100 text-emerald-700">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> LIVE
        </span>
        <span className="chunky-pill bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200">
          {STATUS_LABEL[room.status] || room.status}
        </span>
      </div>
      <div className="min-h-[52px]">
        <p className="line-clamp-2 text-lg font-black leading-tight text-dark">{room.title || room.test?.title || 'Арена'}</p>
        <p className="mt-1 text-xs font-semibold text-slate-500">
          Ведущий: <HostNameBadge host={room.host} />
        </p>
      </div>
      <div className="flex items-center justify-between gap-2 text-xs font-black">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-amber-700">
          <Users size={12} /> {room.participantCount}/{room.maxPlayers}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1 font-mono tracking-[0.24em] text-white">
          <Hash size={12} /> {room.joinCode}
        </span>
        <span className="inline-flex items-center gap-1 text-primary-600 transition group-hover:gap-2">
          Войти <ArrowRight size={14} />
        </span>
      </div>
    </motion.button>
  );
}

function RecentResultCard({ result }) {
  const placeLabel = result.placement ? `${result.placement} место` : '—';
  const placeBg =
    result.placement === 1 ? 'bg-amber-400 text-slate-900'
      : result.placement === 2 ? 'bg-slate-300 text-slate-900'
        : result.placement === 3 ? 'bg-orange-300 text-slate-900'
          : 'bg-slate-800 text-white';

  return (
    <Link
      to={`/arena/results/${result.room?._id || result.room}`}
      className="group flex items-center gap-3 rounded-2xl border-2 border-slate-200 bg-white p-3 transition active:translate-y-[2px] dark:border-slate-700 dark:bg-slate-800"
    >
      <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl text-sm font-black ${placeBg}`}>
        {result.placement === 1 ? <Crown size={18} /> : `#${result.placement || '-'}`}
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-1 text-sm font-black text-dark">{result.test?.title || result.room?.title || 'Арена'}</p>
        <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
          {placeLabel} · {result.score || 0} очков · {formatRelative(result.completedAt)}
        </p>
      </div>
      <ChevronRight size={16} className="text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-primary-500" />
    </Link>
  );
}

function StartArenaModal({ open, onClose, tests, loadingTests, onLaunch, launching }) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tests;
    return tests.filter(t => t.title?.toLowerCase().includes(q));
  }, [tests, query]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
        >
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            onClick={e => e.stopPropagation()}
            className="chunky-card relative w-full max-w-2xl overflow-hidden rounded-t-[2rem] sm:rounded-[2rem]"
          >
            <div className="flex items-center justify-between gap-3 border-b-2 border-slate-100 bg-[#FFF8EE] px-5 py-4 dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <div className="chunky-card grid h-11 w-11 place-items-center bg-primary-500 text-white" style={{ boxShadow: '0 4px 0 #9a3412' }}>
                  <Swords size={18} />
                </div>
                <div>
                  <p className="text-base font-black text-dark">Запустить арену</p>
                  <p className="text-xs font-semibold text-slate-500">Выберите тест — мы создадим комнату</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="touch-target flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-500 transition hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                aria-label="Закрыть"
              >
                <X size={16} />
              </button>
            </div>

            <div className="border-b-2 border-slate-100 bg-white px-5 py-3 dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-center gap-2 rounded-2xl border-2 border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-900">
                <Search size={15} className="text-slate-400" />
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Найти свой тест..."
                  className="flex-1 border-0 bg-transparent p-0 text-sm font-semibold text-dark placeholder-slate-400 focus:outline-none focus:ring-0 dark:text-gray-100"
                />
              </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto bg-white px-4 py-3 dark:bg-slate-800 sm:max-h-[50vh]">
              {loadingTests ? (
                <div className="flex items-center justify-center py-10 text-sm font-bold text-slate-500">Загрузка...</div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                  <div className="chunky-card grid h-14 w-14 place-items-center bg-amber-100 text-amber-600">
                    <Sparkles size={22} />
                  </div>
                  <p className="text-sm font-bold text-slate-600 dark:text-slate-300">У вас нет подходящих тестов</p>
                  <Link to="/create-test" className="chunky-btn-primary">
                    <Plus size={15} /> Создать тест
                  </Link>
                </div>
              ) : (
                <ul className="space-y-2">
                  {filtered.map(t => (
                    <li key={t._id}>
                      <button
                        type="button"
                        disabled={launching}
                        onClick={() => onLaunch(t)}
                        className="flex w-full items-center gap-3 rounded-2xl border-2 border-slate-200 bg-white p-3 text-left transition hover:border-primary-400 active:translate-y-[2px] disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900"
                      >
                        <div className="chunky-card grid h-11 w-11 place-items-center bg-amber-400 text-slate-900" style={{ boxShadow: '0 4px 0 #b45309' }}>
                          <PlayCircle size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-1 text-sm font-black text-dark">{t.title}</p>
                          <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
                            {(t.questions?.length || t.questionCount || 0)} вопросов
                            {t.settings?.isPublic ? ' · публичный' : ''}
                          </p>
                        </div>
                        <ArrowRight size={16} className="text-primary-500" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border-t-2 border-slate-100 bg-[#FFF8EE] px-5 py-3 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              💡 Быстрая игра сразу подберёт свободную публичную арену
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function JoinByCodeBar({ onSubmit }) {
  const [code, setCode] = useState('');
  const disabled = code.trim().length < 4;
  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        if (disabled) return;
        onSubmit(code.trim().toUpperCase());
      }}
      className="flex flex-col gap-3 sm:flex-row sm:items-stretch"
    >
      <div className="relative flex-1">
        <Hash size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
          placeholder="PIN"
          maxLength={8}
          inputMode="numeric"
          autoComplete="off"
          className="chunky-input w-full pl-11 text-center text-2xl font-black uppercase tracking-[0.4em]"
        />
      </div>
      <ChunkyButton type="submit" variant="primary" size="lg" disabled={disabled} iconAfter={<ArrowRight size={18} />}>
        Войти
      </ChunkyButton>
    </form>
  );
}

export default function ArenaHubPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [publicRooms, setPublicRooms] = useState([]);
  const [recent, setRecent] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingRecent, setLoadingRecent] = useState(true);

  const [myTests, setMyTests] = useState([]);
  const [loadingTests, setLoadingTests] = useState(false);

  const [startOpen, setStartOpen] = useState(false);
  const [launching, setLaunching] = useState(false);

  const refreshPublic = useCallback(async () => {
    setLoadingRooms(true);
    try {
      const res = await api.get('/arena/public-rooms');
      setPublicRooms(res.data.rooms || []);
    } catch (_error) {
      /* silent */
    } finally {
      setLoadingRooms(false);
    }
  }, []);

  const refreshRecent = useCallback(async () => {
    setLoadingRecent(true);
    try {
      const res = await api.get('/arena/my-recent-results');
      setRecent(res.data.results || []);
    } catch (_error) {
      /* silent */
    } finally {
      setLoadingRecent(false);
    }
  }, []);

  useEffect(() => {
    refreshPublic();
    const interval = setInterval(refreshPublic, 15000);
    return () => clearInterval(interval);
  }, [refreshPublic]);

  useEffect(() => {
    if (user) refreshRecent();
  }, [user, refreshRecent]);

  const openStartModal = async () => {
    setStartOpen(true);
    if (myTests.length === 0) {
      setLoadingTests(true);
      try {
        const res = await api.get('/tests/my');
        setMyTests(res.data.tests || res.data || []);
      } catch (_error) {
        toast.error('Не удалось загрузить ваши тесты');
      } finally {
        setLoadingTests(false);
      }
    }
  };

  const launchArena = async (test) => {
    if (launching) return;
    setLaunching(true);
    try {
      const res = await api.post('/arena/rooms', { testId: test._id, sourceType: 'public' });
      setStartOpen(false);
      toast.success('Арена создана!');
      navigate(`/arena/host/${res.data.room._id}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Не удалось создать арену');
    } finally {
      setLaunching(false);
    }
  };

  const joinByCode = (code) => navigate(`/arena/code/${code}`);

  const quickPlay = () => {
    const available = publicRooms.find(r => (r.status === 'lobby' || r.status === 'pending') && r.participantCount < r.maxPlayers);
    if (available) {
      navigate(`/arena/code/${available.joinCode}`);
    } else {
      toast('Свободных арен нет — создайте свою!', { icon: '⚡' });
      openStartModal();
    }
  };

  const liveCount = publicRooms.length;

  return (
    <div className="min-h-screen bg-[#FFFAF0] dark:bg-slate-900">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 pb-28 pt-5 sm:px-6 sm:pb-16 lg:px-8">
        {/* Chunky hero */}
        <ChunkyCard variant="cream" className="overflow-hidden p-6 sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <span className="chunky-pill bg-white text-primary-600" style={{ boxShadow: '0 3px 0 #fed7aa' }}>
                <Swords size={12} /> Соревнователь · Арена
              </span>
              <h1 className="mt-5 text-4xl font-black leading-[0.95] tracking-tight text-dark sm:text-5xl lg:text-6xl">
                Живые дуэли <span className="inline-block -rotate-1 rounded-2xl bg-primary-500 px-3 py-1 text-white" style={{ boxShadow: '0 5px 0 #9a3412' }}>и турниры</span>
              </h1>
              <p className="mt-4 max-w-xl text-base font-semibold text-slate-700 dark:text-slate-200">
                Создавайте комнаты, играйте по коду или нажмите быструю игру — бустеры, эмодзи, реал-тайм.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <ChunkyButton variant="primary" size="lg" onClick={quickPlay} icon={<Zap size={18} />}>
                  Быстрая игра
                </ChunkyButton>
                <ChunkyButton variant="dark" size="lg" onClick={openStartModal} icon={<Plus size={18} />}>
                  Из теста
                </ChunkyButton>
                <ChunkyButton variant="amber" size="lg" onClick={() => navigate('/arena/quick-start')} icon={<Sparkles size={18} />}>
                  Из банка
                </ChunkyButton>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 self-center sm:gap-4">
              <ChunkyCard variant="white" className="p-4 text-center">
                <Radio size={16} className="mx-auto text-emerald-500" />
                <p className="mt-1.5 text-2xl font-black text-dark">{liveCount}</p>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">LIVE</p>
              </ChunkyCard>
              <ChunkyCard variant="white" className="p-4 text-center">
                <Trophy size={16} className="mx-auto text-amber-500" />
                <p className="mt-1.5 text-2xl font-black text-dark">{recent[0]?.placement ? `#${recent[0].placement}` : '—'}</p>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Место</p>
              </ChunkyCard>
              <ChunkyCard variant="white" className="p-4 text-center">
                <Flame size={16} className="mx-auto text-red-500" />
                <p className="mt-1.5 text-2xl font-black text-dark">{recent.length}</p>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Игры</p>
              </ChunkyCard>
            </div>
          </div>
        </ChunkyCard>

        {/* Join by code */}
        <ChunkyCard variant="white" className="mt-6 p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="chunky-card grid h-9 w-9 place-items-center bg-amber-400 text-slate-900" style={{ boxShadow: '0 4px 0 #b45309' }}>
                <Hash size={16} />
              </div>
              <h2 className="text-base font-black text-dark">Ввести PIN</h2>
            </div>
            <span className="hidden text-xs font-semibold text-slate-500 sm:inline">или вставьте ссылку</span>
          </div>
          <JoinByCodeBar onSubmit={joinByCode} />
        </ChunkyCard>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Live rooms */}
          <section className="lg:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio size={16} className="text-emerald-500" />
                <h2 className="text-sm font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">
                  Публичные {liveCount > 0 ? <span className="text-emerald-500">· {liveCount}</span> : null}
                </h2>
              </div>
              <button
                type="button"
                onClick={refreshPublic}
                className="chunky-pill bg-white text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                style={{ boxShadow: '0 3px 0 #e2e8f0' }}
              >
                Обновить
              </button>
            </div>

            {loadingRooms ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[0, 1, 2, 3].map(i => (
                  <div key={i} className="h-40 animate-pulse rounded-3xl border-2 border-slate-200 bg-white" />
                ))}
              </div>
            ) : publicRooms.length === 0 ? (
              <ChunkyCard variant="white" className="p-8 text-center">
                <div className="chunky-card mx-auto grid h-16 w-16 place-items-center bg-amber-100 text-amber-600">
                  <Sparkles size={22} />
                </div>
                <p className="mt-4 text-sm font-bold text-slate-600 dark:text-slate-300">Сейчас нет живых арен.</p>
                <div className="mt-4 flex justify-center">
                  <ChunkyButton variant="primary" onClick={openStartModal} icon={<Rocket size={15} />}>
                    Запустить первую
                  </ChunkyButton>
                </div>
              </ChunkyCard>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {publicRooms.map(room => (
                  <LiveRoomCard key={room._id} room={room} onJoin={() => navigate(`/arena/code/${room.joinCode}`)} />
                ))}
              </div>
            )}
          </section>

          {/* Recent + how-to */}
          <aside className="space-y-5">
            <ChunkyCard variant="white" className="p-5">
              <div className="mb-3 flex items-center gap-2">
                <Clock size={14} className="text-primary-500" />
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">
                  Недавние матчи
                </h3>
              </div>
              {loadingRecent ? (
                <div className="space-y-2">
                  {[0, 1, 2].map(i => <div key={i} className="h-14 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-700" />)}
                </div>
              ) : recent.length === 0 ? (
                <p className="text-sm font-semibold text-slate-500">Ещё не играли. Сыграйте первую арену!</p>
              ) : (
                <div className="space-y-2">
                  {recent.slice(0, 5).map(r => <RecentResultCard key={r._id} result={r} />)}
                </div>
              )}
            </ChunkyCard>

            <ChunkyCard variant="amber" className="p-5">
              <div className="mb-2 flex items-center gap-2">
                <Zap size={14} />
                <h3 className="text-xs font-black uppercase tracking-widest">Новое в Арене</h3>
              </div>
              <ul className="space-y-2 text-sm font-semibold">
                <li className="flex items-start gap-2"><span>⚡</span> Бустеры: 50/50, x2, щит</li>
                <li className="flex items-start gap-2"><span>🎉</span> Эмодзи-реакции в реальном времени</li>
                <li className="flex items-start gap-2"><span>⏸</span> Хост-контроль: пауза, кик, +15s</li>
                <li className="flex items-start gap-2"><span>📱</span> Мобильный как Kahoot</li>
              </ul>
            </ChunkyCard>
          </aside>
        </div>
      </main>

      <StartArenaModal
        open={startOpen}
        onClose={() => setStartOpen(false)}
        tests={myTests}
        loadingTests={loadingTests}
        onLaunch={launchArena}
        launching={launching}
      />
    </div>
  );
}
