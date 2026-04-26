import { useEffect, useMemo, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Plus, Search, X, Edit3, Trash2, Copy, Sparkles, Clock,
  ListChecks, Trophy, Zap, Rocket, Calendar, Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import Navbar from '../components/Navbar';
import Pagination from '../components/Pagination';
import ConfirmDialog from '../components/ConfirmDialog';

/**
 * MyArenaTests — list of user's saved ArenaTest templates.
 * Card grid; each card has Edit / Duplicate / Launch / Delete.
 */
export default function MyArenaTests() {
  const navigate = useNavigate();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null });
  const [launchingId, setLaunchingId] = useState(null);
  const debounceRef = useRef(null);

  const fetchTests = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (search) params.append('search', search);
      const res = await api.get(`/arena-tests?${params}`);
      setTests(res.data.tests || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.totalPages || 1);
    } catch {
      toast.error('Не удалось загрузить шаблоны');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTests(); /* eslint-disable-line */ }, [page, search]);

  // Debounced search.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 350);
    return () => debounceRef.current && clearTimeout(debounceRef.current);
  }, [searchInput]);

  const handleDelete = async (id) => {
    try {
      await api.delete(`/arena-tests/${id}`);
      toast.success('Шаблон удалён');
      fetchTests();
    } catch {
      toast.error('Ошибка удаления');
    } finally {
      setConfirmDelete({ open: false, id: null });
    }
  };

  const handleDuplicate = async (id) => {
    try {
      const res = await api.post(`/arena-tests/${id}/duplicate`);
      toast.success('Шаблон продублирован');
      // Optimistically navigate to edit the copy.
      const newId = res.data?.test?._id;
      if (newId) navigate(`/arena-tests/${newId}/edit`);
      else fetchTests();
    } catch {
      toast.error('Ошибка дублирования');
    }
  };

  const handleLaunch = async (id) => {
    setLaunchingId(id);
    try {
      const res = await api.post('/arena/rooms/from-arena-test', { arenaTestId: id });
      const roomId = res.data?.room?._id || res.data?.room?.id;
      if (!roomId) throw new Error('Сервер вернул пустой ответ');
      toast.success('Арена запускается');
      navigate(`/arena/host/${roomId}`);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Не удалось запустить арену');
    } finally {
      setLaunchingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />

      <ConfirmDialog
        isOpen={confirmDelete.open}
        onClose={() => setConfirmDelete({ open: false, id: null })}
        onConfirm={() => handleDelete(confirmDelete.id)}
        title="Удалить шаблон"
        message="Шаблон будет удалён навсегда. Запущенные арены и результаты не пострадают."
        confirmText="Удалить"
        variant="danger"
      />

      <main className="mx-auto max-w-7xl px-3 sm:px-5 lg:px-8 py-4 sm:py-6">
        {/* HEADER */}
        <motion.header
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 flex flex-wrap items-center gap-3"
        >
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-xl border-2 border-slate-900 bg-white p-2 text-slate-700 transition hover:bg-slate-100 dark:border-white dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            title="Назад"
            style={{ boxShadow: '0 3px 0 var(--shadow-chunky, #1f1a14)' }}
          >
            <ArrowLeft size={18} strokeWidth={2.4} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="flex items-center gap-2 text-xl font-black text-slate-900 dark:text-white sm:text-2xl">
              <Sparkles size={20} className="text-amber-500" strokeWidth={2.6} /> Мои арена-шаблоны
            </h1>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
              {total > 0 ? `${total} ${plural(total, ['шаблон', 'шаблона', 'шаблонов'])} · быстрый запуск одной кнопкой` : 'Сохранённые арены для повторного запуска'}
            </p>
          </div>
          <Link
            to="/arena-tests/new"
            className="chunky-btn chunky-btn-primary"
          >
            <Plus size={15} strokeWidth={2.6} /> Новый шаблон
          </Link>
        </motion.header>

        {/* SEARCH */}
        <div
          className="mb-4 rounded-[1.5rem] border-2 border-slate-900 bg-white p-3 dark:border-white dark:bg-slate-900"
          style={{ boxShadow: '0 4px 0 var(--shadow-chunky, #1f1a14)' }}
        >
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" strokeWidth={2.4} />
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Поиск по названию, тегам, описанию…"
              className="w-full rounded-xl border-2 border-slate-900 bg-white py-2 pl-9 pr-9 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-primary-500/30 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            />
            {searchInput && (
              <button type="button" onClick={() => setSearchInput('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-700">
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* LIST */}
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
            ))}
          </div>
        ) : tests.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[1.75rem] border-2 border-dashed border-slate-300 bg-white py-16 text-center dark:border-slate-700 dark:bg-slate-900">
            <Sparkles size={42} className="mb-3 text-amber-300" />
            <h3 className="text-base font-black text-slate-700 dark:text-slate-200">
              {search ? 'Ничего не найдено' : 'Шаблоны ещё не созданы'}
            </h3>
            <p className="mt-1 max-w-sm px-4 text-xs text-slate-500 dark:text-slate-400">
              {search
                ? 'Попробуйте другой запрос или сбросьте поиск.'
                : 'Создайте арена-шаблон — в нём вы один раз настраиваете вопросы, таймеры, способности, и потом запускаете арены одной кнопкой.'}
            </p>
            <Link
              to="/arena-tests/new"
              className="mt-4 chunky-btn chunky-btn-primary"
            >
              <Plus size={14} strokeWidth={2.6} /> Создать шаблон
            </Link>
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence>
                {tests.map(t => (
                  <ArenaTestCard
                    key={t._id}
                    test={t}
                    onEdit={() => navigate(`/arena-tests/${t._id}/edit`)}
                    onDelete={() => setConfirmDelete({ open: true, id: t._id })}
                    onDuplicate={() => handleDuplicate(t._id)}
                    onLaunch={() => handleLaunch(t._id)}
                    launching={launchingId === t._id}
                  />
                ))}
              </AnimatePresence>
            </div>
            <div className="mt-5">
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function ArenaTestCard({ test, onEdit, onDelete, onDuplicate, onLaunch, launching }) {
  const formatDuration = (sec) => {
    if (!sec) return '—';
    if (sec < 60) return `${sec}с`;
    const m = Math.floor(sec / 60);
    return `~${m}м`;
  };

  const totalSec = (test.entries || []).length * (test.settings?.answerTimeSec || 20);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="rounded-2xl border-2 border-slate-900 bg-white p-4 transition dark:border-white dark:bg-slate-900"
      style={{ boxShadow: '0 4px 0 var(--shadow-chunky, #1f1a14)' }}
    >
      <header className="flex items-start gap-2">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-slate-900 bg-amber-200 dark:border-white">
          <Sparkles size={18} className="text-amber-700" strokeWidth={2.6} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-sm font-black text-slate-900 dark:text-white">{test.title}</h3>
          {test.description && (
            <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-500 dark:text-slate-400">{test.description}</p>
          )}
        </div>
      </header>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <Pill icon={ListChecks} value={`${(test.entries || []).length} вопр.`} />
        <Pill icon={Clock} value={formatDuration(totalSec)} />
        <Pill icon={Zap} value={`${(test.settings?.powerUpPool || []).length} способн.`} />
        {test.usageCount > 0 && <Pill icon={Trophy} value={`${test.usageCount} запуск${test.usageCount === 1 ? '' : 'ов'}`} accent="emerald" />}
      </div>

      {(test.tags || []).length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {(test.tags || []).slice(0, 4).map((t, i) => (
            <span key={i} className="rounded-full bg-slate-100 px-1.5 py-0 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              #{t}
            </span>
          ))}
        </div>
      )}

      <footer className="mt-3 flex flex-wrap gap-1.5 border-t-2 border-dashed border-slate-200 pt-3 dark:border-slate-700">
        <button
          type="button"
          onClick={onLaunch}
          disabled={launching}
          className="flex flex-1 items-center justify-center gap-1 rounded-lg border-2 border-slate-900 bg-emerald-500 px-2 py-1.5 text-xs font-black text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-300 dark:border-white"
        >
          {launching ? <Loader2 size={13} className="animate-spin" /> : <Rocket size={13} strokeWidth={2.6} />} Запустить
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="rounded-lg border-2 border-slate-300 bg-white p-1.5 text-slate-600 transition hover:border-primary-500 hover:bg-primary-50 hover:text-primary-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
          title="Редактировать"
        >
          <Edit3 size={13} strokeWidth={2.4} />
        </button>
        <button
          type="button"
          onClick={onDuplicate}
          className="rounded-lg border-2 border-slate-300 bg-white p-1.5 text-slate-600 transition hover:border-slate-500 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
          title="Дублировать"
        >
          <Copy size={13} strokeWidth={2.4} />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="rounded-lg border-2 border-slate-300 bg-white p-1.5 text-slate-600 transition hover:border-red-500 hover:bg-red-50 hover:text-red-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
          title="Удалить"
        >
          <Trash2 size={13} strokeWidth={2.4} />
        </button>
      </footer>
    </motion.article>
  );
}

function Pill({ icon: Icon, value, accent = 'slate' }) {
  const accentCls = accent === 'emerald'
    ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200'
    : 'border-slate-300 bg-slate-50 text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black tabular-nums ${accentCls}`}>
      <Icon size={10} strokeWidth={3} /> {value}
    </span>
  );
}

function plural(n, forms) {
  const abs = Math.abs(n) % 100;
  const tail = abs % 10;
  if (abs > 10 && abs < 20) return forms[2];
  if (tail > 1 && tail < 5) return forms[1];
  if (tail === 1) return forms[0];
  return forms[2];
}
