import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Sparkles, Users, Clock, Rocket, Eye, EyeOff
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import Navbar from '../components/Navbar';
import ArenaQuestionPicker from '../components/arena/ArenaQuestionPicker';

const TIMER_PRESETS = [10, 15, 20, 30, 45, 60];

/**
 * Stand-alone quick-launch flow that turns a hand-picked subset of the user's
 * Question Bank into a live arena room without ever creating a Test document.
 *
 * Layout:
 *   - sticky header with title input + back button
 *   - ArenaQuestionPicker (split-view drag-drop)
 *   - settings strip (default timer, max players, allow guests)
 *   - sticky footer with summary + Launch button
 */
export default function ArenaQuickStart() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [snapshot, setSnapshot] = useState([]);
  const [defaultTimer, setDefaultTimer] = useState(30);
  const [maxPlayers, setMaxPlayers] = useState(50);
  const [allowGuests, setAllowGuests] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const handleLaunch = async () => {
    if (snapshot.length === 0) {
      toast.error('Добавьте хотя бы один вопрос');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        title: title.trim() || 'Арена из банка',
        entries: snapshot.map(s => ({
          bankQuestionId: s.bankId,
          timerOverride: s.timerOverride ?? null,
          pointsOverride: s.pointsOverride ?? null,
        })),
        allowGuests,
        maxPlayers,
        settings: {
          answerTimeSec: defaultTimer,
        },
      };
      const res = await api.post('/arena/rooms/from-bank', payload);
      const roomId = res.data?.room?._id || res.data?.room?.id;
      if (!roomId) throw new Error('Сервер вернул пустой ответ');
      toast.success('Арена создана');
      navigate(`/arena/host/${roomId}`);
    } catch (err) {
      const msg = err?.response?.data?.message || 'Не удалось создать арену';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />

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
              <Sparkles size={20} className="text-amber-500" strokeWidth={2.6} /> Арена из банка
            </h1>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
              Подберите вопросы из банка перетаскиванием — арена запустится мгновенно.
            </p>
          </div>
        </motion.header>

        {/* TITLE INPUT */}
        <div
          className="mb-4 rounded-[1.5rem] border-2 border-slate-900 bg-white p-3 dark:border-white dark:bg-slate-900"
          style={{ boxShadow: '0 4px 0 var(--shadow-chunky, #1f1a14)' }}
        >
          <label className="mb-1 block text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            Название арены
          </label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Например: Викторина по истории — 6 класс"
            maxLength={120}
            className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900 focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/30 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />
        </div>

        {/* PICKER */}
        <div className="mb-4">
          <ArenaQuestionPicker
            defaultTimer={defaultTimer}
            initialSnapshot={[]}
            onChange={setSnapshot}
            height={560}
          />
        </div>

        {/* SETTINGS STRIP */}
        <div
          className="mb-4 grid gap-3 rounded-[1.5rem] border-2 border-slate-900 bg-white p-3 dark:border-white dark:bg-slate-900 sm:grid-cols-3"
          style={{ boxShadow: '0 4px 0 var(--shadow-chunky, #1f1a14)' }}
        >
          {/* Default timer */}
          <div>
            <label className="mb-1.5 flex items-center gap-1 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              <Clock size={11} strokeWidth={2.8} /> Таймер по умолчанию
            </label>
            <div className="flex flex-wrap gap-1">
              {TIMER_PRESETS.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setDefaultTimer(t)}
                  className={`rounded-lg border-2 px-2 py-1 text-[11px] font-black tabular-nums transition
                    ${defaultTimer === t
                      ? 'border-primary-600 bg-primary-500 text-white shadow-[0_2px_0_#9a3412]'
                      : 'border-slate-300 bg-white text-slate-700 hover:border-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200'}`}
                >
                  {t}с
                </button>
              ))}
            </div>
            <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
              Можно переопределить для конкретных вопросов выше.
            </p>
          </div>

          {/* Max players */}
          <div>
            <label className="mb-1.5 flex items-center gap-1 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              <Users size={11} strokeWidth={2.8} /> Макс игроков
            </label>
            <input
              type="number"
              min={2}
              max={500}
              value={maxPlayers}
              onChange={e => setMaxPlayers(Math.max(2, Math.min(500, parseInt(e.target.value) || 2)))}
              className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-sm font-black tabular-nums text-slate-900 focus:border-primary-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            />
            <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
              От 2 до 500 одновременно.
            </p>
          </div>

          {/* Allow guests toggle */}
          <div>
            <label className="mb-1.5 flex items-center gap-1 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              {allowGuests ? <Eye size={11} strokeWidth={2.8} /> : <EyeOff size={11} strokeWidth={2.8} />} Гости (без аккаунта)
            </label>
            <button
              type="button"
              onClick={() => setAllowGuests(g => !g)}
              className={`flex w-full items-center justify-between gap-2 rounded-xl border-2 px-3 py-2 text-xs font-black transition
                ${allowGuests
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:border-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-200'
                  : 'border-slate-300 bg-white text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}
            >
              <span>{allowGuests ? 'Разрешены' : 'Только зарегистрированные'}</span>
              <span className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 transition
                ${allowGuests ? 'border-emerald-500 bg-emerald-500' : 'border-slate-400 bg-slate-300 dark:bg-slate-600'}`}
              >
                <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition
                  ${allowGuests ? 'left-[18px]' : 'left-0.5'}`}
                />
              </span>
            </button>
            <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
              Подключение по PIN/QR.
            </p>
          </div>
        </div>

        {/* LAUNCH FOOTER */}
        <div className="sticky bottom-3 z-30">
          <div
            className="flex flex-wrap items-center gap-2 rounded-[1.5rem] border-2 border-slate-900 bg-amber-200 px-4 py-3 dark:border-white dark:bg-amber-900/40"
            style={{ boxShadow: '0 5px 0 var(--shadow-chunky, #1f1a14)' }}
          >
            <span className="text-sm font-black uppercase tracking-[0.18em] text-slate-900 dark:text-amber-100">
              {snapshot.length > 0
                ? `Готово к запуску: ${snapshot.length} ${plural(snapshot.length, ['вопрос', 'вопроса', 'вопросов'])}`
                : 'Добавьте вопросы из банка'}
            </span>
            <button
              type="button"
              onClick={handleLaunch}
              disabled={submitting || snapshot.length === 0}
              className="ml-auto inline-flex items-center gap-2 rounded-xl border-2 border-slate-900 bg-emerald-500 px-4 py-2 text-sm font-black text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 dark:border-white"
              style={{ boxShadow: '0 3px 0 var(--shadow-chunky, #1f1a14)' }}
            >
              <Rocket size={15} strokeWidth={2.6} />
              {submitting ? 'Создаём…' : 'Запустить арену'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

// Russian plural helper.
function plural(n, forms) {
  const abs = Math.abs(n) % 100;
  const tail = abs % 10;
  if (abs > 10 && abs < 20) return forms[2];
  if (tail > 1 && tail < 5) return forms[1];
  if (tail === 1) return forms[0];
  return forms[2];
}
