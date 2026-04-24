import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Swords,
  Plus,
  Hash,
  Users,
  Zap,
  Trophy,
  Clock,
  Flame,
  ChevronRight,
  Search,
  X,
  Sparkles,
  PlayCircle,
  ArrowRight,
  Radio,
  Crown
} from 'lucide-react';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import AnimatedHero from '../components/AnimatedHero';
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
  if (!host) return <span className="text-white/50">—</span>;
  const label = host.username
    ? `@${host.username}`
    : `${host.firstName || ''} ${host.lastName || ''}`.trim() || '@user';
  return <span className="font-semibold text-primary-200">{label}</span>;
}

function LiveRoomCard({ room, onJoin }) {
  return (
    <motion.button
      layout
      whileHover={{ y: -2 }}
      onClick={onJoin}
      className="group relative flex w-full flex-col gap-3 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/80 via-slate-900/70 to-slate-900/80 p-5 text-left shadow-[0_20px_50px_-30px_rgba(0,0,0,0.8)] transition hover:border-primary-500/40"
    >
      <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(249,115,22,0.18),transparent_55%)]" />
      </div>
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-black uppercase tracking-widest text-emerald-300">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          Live
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white/60">
          {STATUS_LABEL[room.status] || room.status}
        </span>
      </div>
      <div className="relative min-h-[48px]">
        <p className="line-clamp-2 text-base font-black text-white">{room.title || room.test?.title || 'Арена'}</p>
        <p className="mt-1 text-xs text-white/50">Ведущий: <HostNameBadge host={room.host} /></p>
      </div>
      <div className="relative flex items-center justify-between text-xs text-white/70">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
          <Users size={12} /> {room.participantCount}/{room.maxPlayers}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
          <Hash size={12} /> {room.joinCode}
        </span>
        <span className="inline-flex items-center gap-1.5 font-semibold text-primary-300 transition group-hover:gap-2">
          Войти <ArrowRight size={12} />
        </span>
      </div>
    </motion.button>
  );
}

function RecentResultCard({ result }) {
  const placeLabel = result.placement ? `${result.placement} место` : '—';
  const placeColor =
    result.placement === 1
      ? 'from-amber-400 to-orange-400 text-slate-900'
      : result.placement === 2
        ? 'from-slate-200 to-slate-400 text-slate-900'
        : result.placement === 3
          ? 'from-orange-300 to-amber-300 text-slate-900'
          : 'from-slate-700 to-slate-800 text-white';

  return (
    <Link
      to={`/arena/results/${result.room?._id || result.room}`}
      className="group flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-3 text-left transition hover:border-primary-500/30 hover:bg-white/[0.05]"
    >
      <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-xs font-black shadow-sm ${placeColor}`}>
        {result.placement === 1 ? <Crown size={16} /> : `#${result.placement || '-'}`}
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-1 text-sm font-bold text-white">{result.test?.title || result.room?.title || 'Арена'}</p>
        <p className="mt-0.5 text-[11px] text-white/55">
          {placeLabel} · {result.score || 0} очков · {formatRelative(result.completedAt)}
        </p>
      </div>
      <ChevronRight size={14} className="text-white/40 transition group-hover:translate-x-0.5 group-hover:text-primary-300" />
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
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 p-0 backdrop-blur-sm sm:items-center sm:p-4"
        >
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            onClick={e => e.stopPropagation()}
            className="relative w-full max-w-2xl overflow-hidden rounded-t-3xl border border-white/10 bg-[linear-gradient(180deg,#0f172a_0%,#0b1220_100%)] shadow-2xl sm:rounded-3xl"
          >
            <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-orange-600 text-white shadow-lg">
                  <Swords size={18} />
                </div>
                <div>
                  <p className="text-sm font-black text-white">Запустить арену</p>
                  <p className="text-[11px] text-white/50">Выберите свой тест или публичный</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-white/60 transition hover:bg-white/10 hover:text-white"
                aria-label="Закрыть"
              >
                <X size={16} />
              </button>
            </div>

            <div className="border-b border-white/5 px-5 py-3">
              <div className="flex items-center gap-2 rounded-2xl border border-white/8 bg-white/5 px-3 py-2">
                <Search size={14} className="text-white/50" />
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Поиск по своим тестам..."
                  className="flex-1 border-0 bg-transparent p-0 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-0"
                />
              </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto px-3 py-3 sm:max-h-[50vh]">
              {loadingTests ? (
                <div className="flex items-center justify-center py-10 text-white/50 text-sm">Загрузка...</div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-10 text-center text-white/60">
                  <Sparkles size={24} className="text-primary-300/60" />
                  <p className="text-sm">У вас нет подходящих тестов</p>
                  <Link
                    to="/create-test"
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary-500 px-4 py-2 text-xs font-bold text-white transition hover:bg-primary-400"
                  >
                    <Plus size={13} /> Создать тест
                  </Link>
                </div>
              ) : (
                <ul className="space-y-1.5">
                  {filtered.map(t => (
                    <li key={t._id}>
                      <button
                        type="button"
                        disabled={launching}
                        onClick={() => onLaunch(t)}
                        className="flex w-full items-center gap-3 rounded-2xl border border-transparent bg-white/[0.03] px-3 py-3 text-left transition hover:border-primary-500/40 hover:bg-primary-500/10 disabled:opacity-50"
                      >
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500/30 to-orange-600/20 text-primary-200">
                          <PlayCircle size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-1 text-sm font-bold text-white">{t.title}</p>
                          <p className="mt-0.5 text-[11px] text-white/50">
                            {(t.questions?.length || t.questionCount || 0)} вопросов
                            {t.settings?.isPublic ? ' · публичный' : ''}
                          </p>
                        </div>
                        <ArrowRight size={14} className="text-white/40" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border-t border-white/5 bg-white/[0.02] px-5 py-3 text-[11px] text-white/45">
              Совет: для быстрой игры нажмите «Быстрая игра» — мы подберём публичную арену автоматически.
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
      className="flex flex-col gap-2 sm:flex-row sm:items-center"
    >
      <div className="relative flex-1">
        <Hash size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
        <input
          type="text"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
          placeholder="Введите код арены"
          maxLength={8}
          className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-9 pr-3 text-base font-black uppercase tracking-[0.25em] text-white placeholder-white/30 focus:border-primary-400 focus:outline-none focus:ring-0"
        />
      </div>
      <button
        type="submit"
        disabled={disabled}
        className="flex items-center justify-center gap-2 rounded-2xl bg-primary-500 px-5 py-3 text-sm font-black text-white transition hover:bg-primary-400 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ArrowRight size={15} /> Войти
      </button>
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
    } catch (error) {
      // silent
    } finally {
      setLoadingRooms(false);
    }
  }, []);

  const refreshRecent = useCallback(async () => {
    setLoadingRecent(true);
    try {
      const res = await api.get('/arena/my-recent-results');
      setRecent(res.data.results || []);
    } catch (error) {
      // silent — not authed or empty
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
      } catch (error) {
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
      const res = await api.post('/arena/rooms', {
        testId: test._id,
        sourceType: 'public'
      });
      setStartOpen(false);
      toast.success('Арена создана!');
      navigate(`/arena/host/${res.data.room._id}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Не удалось создать арену');
    } finally {
      setLaunching(false);
    }
  };

  const joinByCode = (code) => {
    navigate(`/arena/code/${code}`);
  };

  const quickPlay = () => {
    const available = publicRooms.find(r => (r.status === 'lobby' || r.status === 'pending') && r.participantCount < r.maxPlayers);
    if (available) {
      navigate(`/arena/code/${available.joinCode}`);
    } else {
      toast('Свободных арен сейчас нет — создайте свою!', { icon: '⚡' });
      openStartModal();
    }
  };

  const liveCount = publicRooms.length;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 pb-16 pt-4 sm:px-6 sm:pt-6 lg:px-8">
        {/* Hero */}
        <AnimatedHero
          preset="neon"
          height="lg"
          eyebrow="Соревнователь · Арена"
          icon={<Swords size={22} />}
          title="Арена — живые дуэли и турниры"
          subtitle="Создайте игру, присоединяйтесь по коду или попробуйте быструю игру. Бустеры, эмодзи, реальное время."
          stats={[
            { label: 'LIVE комнат', value: liveCount, icon: <Radio size={14} /> },
            { label: 'Ваше место', value: recent[0]?.placement ? `#${recent[0].placement}` : '—', icon: <Trophy size={14} /> },
            { label: 'Игр сыграно', value: recent.length, icon: <Flame size={14} /> }
          ]}
          actions={
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={quickPlay}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-2.5 text-xs font-black text-white backdrop-blur-xl transition hover:bg-white/15"
              >
                <Zap size={14} className="text-amber-300" /> Быстрая игра
              </button>
              <button
                type="button"
                onClick={openStartModal}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-br from-primary-500 to-orange-600 px-4 py-2.5 text-xs font-black text-white shadow-lg transition hover:shadow-primary-500/30"
              >
                <Plus size={14} /> Создать арену
              </button>
            </div>
          }
        />

        {/* Join by code */}
        <section className="mt-5 rounded-3xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl">
          <div className="mb-3 flex items-center gap-2">
            <Hash size={15} className="text-primary-300" />
            <h2 className="text-sm font-black uppercase tracking-widest text-white/70">Войти по коду</h2>
          </div>
          <JoinByCodeBar onSubmit={joinByCode} />
        </section>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Live rooms */}
          <section className="lg:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio size={15} className="text-emerald-300" />
                <h2 className="text-sm font-black uppercase tracking-widest text-white/70">
                  Публичные арены {liveCount > 0 ? <span className="text-emerald-300">· {liveCount}</span> : null}
                </h2>
              </div>
              <button
                type="button"
                onClick={refreshPublic}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold text-white/60 transition hover:bg-white/10"
              >
                Обновить
              </button>
            </div>

            {loadingRooms ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[0, 1, 2, 3].map(i => (
                  <div key={i} className="h-36 animate-pulse rounded-3xl border border-white/5 bg-white/[0.02]" />
                ))}
              </div>
            ) : publicRooms.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center text-white/50">
                <Sparkles size={22} className="mx-auto mb-2 text-primary-300/60" />
                <p className="text-sm">Сейчас нет живых публичных арен.</p>
                <button
                  type="button"
                  onClick={openStartModal}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary-500 px-4 py-2 text-xs font-bold text-white transition hover:bg-primary-400"
                >
                  <Plus size={13} /> Запустить первую
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {publicRooms.map(room => (
                  <LiveRoomCard
                    key={room._id}
                    room={room}
                    onJoin={() => navigate(`/arena/code/${room.joinCode}`)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Recent + how-to */}
          <aside className="space-y-5">
            <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
              <div className="mb-3 flex items-center gap-2">
                <Clock size={14} className="text-primary-300" />
                <h3 className="text-xs font-black uppercase tracking-widest text-white/70">Ваши недавние матчи</h3>
              </div>
              {loadingRecent ? (
                <div className="space-y-2">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="h-14 animate-pulse rounded-2xl bg-white/[0.03]" />
                  ))}
                </div>
              ) : recent.length === 0 ? (
                <p className="text-xs text-white/50">Ещё ни одного матча. Сыграйте первую арену!</p>
              ) : (
                <div className="space-y-2">
                  {recent.slice(0, 5).map(r => <RecentResultCard key={r._id} result={r} />)}
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-primary-500/10 via-orange-500/5 to-transparent p-5">
              <div className="mb-2 flex items-center gap-2">
                <Zap size={14} className="text-amber-300" />
                <h3 className="text-xs font-black uppercase tracking-widest text-amber-200/90">Новое в Арене</h3>
              </div>
              <ul className="space-y-2 text-xs text-white/70">
                <li className="flex items-start gap-2"><span className="text-primary-300">•</span> Бустеры: 50/50, x2 очки, щит</li>
                <li className="flex items-start gap-2"><span className="text-primary-300">•</span> Эмодзи-реакции в реальном времени</li>
                <li className="flex items-start gap-2"><span className="text-primary-300">•</span> Хост-контроль: пауза, кик, продление таймера</li>
                <li className="flex items-start gap-2"><span className="text-primary-300">•</span> Мобильный режим как у Kahoot</li>
              </ul>
            </section>
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
