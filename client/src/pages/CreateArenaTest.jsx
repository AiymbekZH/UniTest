import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, Save, Sparkles, ListChecks, Settings,
  Zap, Shield, Crown, Target, Eye, EyeOff, Users, Clock, Hash,
  Check, Loader2, Trash2, Trophy, Snowflake, Swords, Flame
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import Navbar from '../components/Navbar';
import ArenaQuestionPicker from '../components/arena/ArenaQuestionPicker';

const TIMER_PRESETS = [10, 15, 20, 30, 45, 60];

// Power-ups available for selection. Icons kept in sync with Epic E plan.
const POWER_UPS = [
  { id: 'fiftyFifty',   label: '50/50',         icon: Target,    desc: 'Убрать 2 неверных ответа' },
  { id: 'doublePoints', label: '×2 очки',       icon: Zap,       desc: 'Удвоить очки за вопрос' },
  { id: 'shield',       label: 'Щит',           icon: Shield,    desc: 'Защита от ошибки' },
  { id: 'timeFreeze',   label: 'Заморозка',     icon: Snowflake, desc: 'Остановить таймер на 5с' },
  { id: 'steal',        label: 'Кража',         icon: Swords,    desc: 'Украсть 50 очков у лидера' },
  { id: 'mirror',       label: 'Зеркало',       icon: Eye,       desc: 'Показать % выбравших каждый вариант' },
  { id: 'suddenDeath',  label: 'Vа-банк',       icon: Flame,     desc: '×2 за верно или −100 за ошибку' },
];

const STEPS = [
  { id: 'basics',    label: 'Основное',       icon: Hash },
  { id: 'questions', label: 'Вопросы',        icon: ListChecks },
  { id: 'settings',  label: 'Настройки арены', icon: Settings },
];

/**
 * CreateArenaTest — saves a reusable arena template (ArenaTest model).
 * Three steps: basics, questions (drag-from-bank), arena settings (timers, power-ups, abilities).
 *
 * URL forms:
 *   /arena-tests/new       — fresh template
 *   /arena-tests/:id/edit  — edit existing template
 */
export default function CreateArenaTest() {
  const navigate = useNavigate();
  const { id } = useParams(); // present in edit mode
  const isEdit = !!id;

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [launching, setLaunching] = useState(false);

  // ── Form state ──────────────────────────────────────────────────────────
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [snapshot, setSnapshot] = useState([]); // entries from picker
  const [settings, setSettings] = useState({
    countdownSeconds: 5,
    questionIntroSec: 3,
    answerTimeSec: 30,
    answerRevealSec: 5,
    leaderboardSec: 6,
    allowGuests: true,
    maxPlayers: 100,
    powerUpPool: ['fiftyFifty', 'doublePoints', 'shield'],
    streaksEnabled: false,
    underdogBonus: false,
    shuffleQuestions: false,
  });

  // ── Hydrate when editing ───────────────────────────────────────────────
  useEffect(() => {
    if (!isEdit) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get(`/arena-tests/${id}`);
        if (cancelled) return;
        const t = res.data?.test;
        if (!t) throw new Error('Шаблон не найден');
        setTitle(t.title || '');
        setDescription(t.description || '');
        setTagsInput((t.tags || []).join(', '));
        setSettings(prev => ({ ...prev, ...t.settings }));
        setSnapshot((t.entries || []).map((entry, i) => ({
          id: `snap-edit-${i}-${Date.now()}`,
          bankId: entry.bankQuestion?._id || entry.bankQuestion,
          q: entry.bankQuestion,
          timerOverride: entry.timerOverride,
          pointsOverride: entry.pointsOverride,
        })));
      } catch (e) {
        toast.error(e?.response?.data?.message || 'Не удалось загрузить шаблон');
        navigate('/arena');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, isEdit, navigate]);

  const canProceed = useMemo(() => {
    if (step === 0) return title.trim().length > 0;
    if (step === 1) return snapshot.length > 0;
    return true;
  }, [step, title, snapshot]);

  // ── Persistence helpers ─────────────────────────────────────────────────
  const buildPayload = () => ({
    title: title.trim(),
    description: description.trim(),
    tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean),
    entries: snapshot.map(s => ({
      bankQuestionId: s.bankId,
      timerOverride: s.timerOverride ?? null,
      pointsOverride: s.pointsOverride ?? null,
    })),
    settings,
  });

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Укажите название');
      setStep(0);
      return null;
    }
    if (snapshot.length === 0) {
      toast.error('Добавьте хотя бы один вопрос');
      setStep(1);
      return null;
    }
    setSaving(true);
    try {
      const payload = buildPayload();
      const res = isEdit
        ? await api.put(`/arena-tests/${id}`, payload)
        : await api.post('/arena-tests', payload);
      toast.success(isEdit ? 'Шаблон обновлён' : 'Шаблон создан');
      return res.data?.test;
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Ошибка сохранения');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndExit = async () => {
    const result = await handleSave();
    if (result) navigate('/arena/templates');
  };

  const handleLaunch = async () => {
    const saved = await handleSave();
    if (!saved) return;
    setLaunching(true);
    try {
      const res = await api.post('/arena/rooms/from-arena-test', { arenaTestId: saved._id });
      const roomId = res.data?.room?._id || res.data?.room?.id;
      if (!roomId) throw new Error('Сервер вернул пустой ответ');
      toast.success('Арена запускается');
      navigate(`/arena/host/${roomId}`);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Не удалось запустить арену');
    } finally {
      setLaunching(false);
    }
  };

  // Tally for the sticky stats card.
  const stats = useMemo(() => {
    const totalPoints = snapshot.reduce((sum, s) => sum + (s.pointsOverride ?? s.q?.points ?? 0), 0);
    const totalSec = snapshot.reduce((sum, s) => sum + (s.timerOverride ?? settings.answerTimeSec), 0);
    return { count: snapshot.length, totalPoints, totalSec };
  }, [snapshot, settings.answerTimeSec]);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface">
        <Navbar />
        <div className="flex justify-center py-20">
          <Loader2 size={36} className="animate-spin text-primary-600" />
        </div>
      </div>
    );
  }

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
              <Sparkles size={20} className="text-amber-500" strokeWidth={2.6} />
              {isEdit ? 'Редактировать арена-шаблон' : 'Новый арена-шаблон'}
            </h1>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
              Сохраните набор вопросов + настройки, чтобы запускать арены повторно одной кнопкой.
            </p>
          </div>
        </motion.header>

        {/* STEP STRIP */}
        <nav className="mb-4 flex items-center gap-1 overflow-x-auto sm:gap-2">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const active = step === i;
            const done = step > i;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setStep(i)}
                className={`flex shrink-0 items-center gap-1.5 rounded-xl border-2 px-3 py-1.5 text-xs font-black transition
                  ${active
                    ? 'border-primary-600 bg-primary-500 text-white shadow-[0_3px_0_#9a3412]'
                    : done
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200'
                      : 'border-slate-300 bg-white text-slate-600 hover:border-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}
              >
                <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black tabular-nums
                  ${active ? 'bg-white/20 text-white' : done ? 'bg-emerald-200 text-emerald-800 dark:bg-emerald-700 dark:text-white' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'}`}>
                  {done ? <Check size={11} strokeWidth={3} /> : i + 1}
                </span>
                <Icon size={13} strokeWidth={2.6} />
                <span className="hidden sm:inline">{s.label}</span>
              </button>
            );
          })}
        </nav>

        {/* STEP CONTENT */}
        <AnimatePresence mode="wait">
          <motion.section
            key={STEPS[step].id}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.18 }}
          >
            {step === 0 && (
              <BasicsStep
                title={title} setTitle={setTitle}
                description={description} setDescription={setDescription}
                tagsInput={tagsInput} setTagsInput={setTagsInput}
              />
            )}
            {step === 1 && (
              <QuestionsStep
                snapshot={snapshot}
                onChange={setSnapshot}
                defaultTimer={settings.answerTimeSec}
              />
            )}
            {step === 2 && (
              <SettingsStep
                settings={settings}
                setSettings={setSettings}
                stats={stats}
              />
            )}
          </motion.section>
        </AnimatePresence>

        {/* WIZARD FOOTER */}
        <div className="sticky bottom-3 z-30 mt-4">
          <div
            className="flex flex-wrap items-center gap-2 rounded-[1.5rem] border-2 border-slate-900 bg-amber-200 px-3 py-2 dark:border-white dark:bg-amber-900/40"
            style={{ boxShadow: '0 5px 0 var(--shadow-chunky, #1f1a14)' }}
          >
            <span className="hidden sm:inline text-[11px] font-black uppercase tracking-[0.2em] text-slate-700 dark:text-amber-100">
              Шаг {step + 1}/{STEPS.length} · {snapshot.length} вопр.
            </span>

            <button
              type="button"
              onClick={() => setStep(s => Math.max(0, s - 1))}
              disabled={step === 0}
              className="ml-auto rounded-lg border-2 border-slate-900 bg-white px-3 py-1.5 text-xs font-black text-slate-700 transition hover:bg-slate-100 disabled:opacity-40 dark:border-white dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <ArrowLeft size={13} strokeWidth={2.6} className="inline" /> Назад
            </button>

            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => setStep(s => Math.min(STEPS.length - 1, s + 1))}
                disabled={!canProceed}
                className="rounded-lg border-2 border-slate-900 bg-emerald-500 px-3 py-1.5 text-xs font-black text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 dark:border-white"
              >
                Далее <ArrowRight size={13} strokeWidth={2.6} className="inline" />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleSaveAndExit}
                  disabled={saving || launching}
                  className="rounded-lg border-2 border-slate-900 bg-white px-3 py-1.5 text-xs font-black text-slate-700 transition hover:bg-slate-100 disabled:opacity-40 dark:border-white dark:bg-slate-800 dark:text-slate-200"
                >
                  {saving ? <Loader2 size={13} className="inline animate-spin" /> : <Save size={13} strokeWidth={2.6} className="inline" />} Сохранить
                </button>
                <button
                  type="button"
                  onClick={handleLaunch}
                  disabled={saving || launching}
                  className="rounded-lg border-2 border-slate-900 bg-emerald-500 px-3 py-1.5 text-xs font-black text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-300 dark:border-white"
                >
                  {launching ? <Loader2 size={13} className="inline animate-spin" /> : <Zap size={13} strokeWidth={2.6} className="inline" />} Сохранить и запустить
                </button>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// STEP 1 — Basics
function BasicsStep({ title, setTitle, description, setDescription, tagsInput, setTagsInput }) {
  return (
    <div
      className="rounded-[1.75rem] border-2 border-slate-900 bg-white p-5 dark:border-white dark:bg-slate-900"
      style={{ boxShadow: '0 4px 0 var(--shadow-chunky, #1f1a14)' }}
    >
      <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white">
        <Hash size={18} className="text-primary-600" strokeWidth={2.6} /> Основное
      </h2>

      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            Название <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Например: История России — викторина для 8 класса"
            maxLength={140}
            className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900 focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/30 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />
          <p className="mt-1 text-[10px] text-slate-400">{title.length}/140</p>
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            Описание
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Кому подходит, какая тема, как играть…"
            maxLength={1000}
            className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/30 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />
          <p className="mt-1 text-[10px] text-slate-400">{description.length}/1000</p>
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            Теги (через запятую)
          </label>
          <input
            type="text"
            value={tagsInput}
            onChange={e => setTagsInput(e.target.value)}
            placeholder="история, школа, лёгкий"
            className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900 focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/30 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />
          <p className="mt-1 text-[10px] text-slate-400">До 20 тегов. Используются для поиска и фильтра.</p>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// STEP 2 — Questions (delegates to ArenaQuestionPicker)
function QuestionsStep({ snapshot, onChange, defaultTimer }) {
  return (
    <div className="space-y-3">
      <div
        className="rounded-[1.75rem] border-2 border-slate-900 bg-white p-3 dark:border-white dark:bg-slate-900"
        style={{ boxShadow: '0 4px 0 var(--shadow-chunky, #1f1a14)' }}
      >
        <h2 className="mb-2 flex items-center gap-2 px-1 text-base font-black text-slate-900 dark:text-white">
          <ListChecks size={18} className="text-primary-600" strokeWidth={2.6} /> Вопросы
        </h2>
        <p className="mb-2 px-1 text-[11px] text-slate-500 dark:text-slate-400">
          Перетащите вопросы из банка слева в список арены справа. Меняйте порядок и переопределяйте таймер/очки на каждой карточке.
        </p>
      </div>

      <ArenaQuestionPicker
        defaultTimer={defaultTimer}
        initialSnapshot={snapshot}
        onChange={onChange}
        height={560}
      />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// STEP 3 — Arena settings (timers + power-up pool + abilities)
function SettingsStep({ settings, setSettings, stats }) {
  const togglePower = (id) => {
    setSettings(prev => ({
      ...prev,
      powerUpPool: prev.powerUpPool.includes(id)
        ? prev.powerUpPool.filter(p => p !== id)
        : [...prev.powerUpPool, id]
    }));
  };

  const formatDuration = (sec) => {
    if (sec < 60) return `${sec}с`;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return s ? `${m}м ${s}с` : `${m}м`;
  };

  return (
    <div className="space-y-4">
      {/* TIMERS + LIMITS */}
      <div
        className="rounded-[1.75rem] border-2 border-slate-900 bg-white p-5 dark:border-white dark:bg-slate-900"
        style={{ boxShadow: '0 4px 0 var(--shadow-chunky, #1f1a14)' }}
      >
        <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white">
          <Clock size={18} className="text-primary-600" strokeWidth={2.6} /> Таймеры и игроки
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-1.5 flex items-center gap-1 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              <Clock size={11} strokeWidth={2.8} /> Таймер вопроса по умолчанию
            </label>
            <div className="flex flex-wrap gap-1">
              {TIMER_PRESETS.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSettings(s => ({ ...s, answerTimeSec: t }))}
                  className={`rounded-lg border-2 px-2 py-1 text-[11px] font-black tabular-nums transition
                    ${settings.answerTimeSec === t
                      ? 'border-primary-600 bg-primary-500 text-white shadow-[0_2px_0_#9a3412]'
                      : 'border-slate-300 bg-white text-slate-700 hover:border-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200'}`}
                >
                  {t}с
                </button>
              ))}
            </div>
          </div>

          <NumField
            icon={Users}
            label="Макс игроков"
            value={settings.maxPlayers}
            min={2}
            max={500}
            onChange={v => setSettings(s => ({ ...s, maxPlayers: v }))}
            hint="Одновременно в одной арене"
          />

          <ToggleField
            label="Гости (без аккаунта)"
            value={settings.allowGuests}
            onChange={v => setSettings(s => ({ ...s, allowGuests: v }))}
            on="Разрешены"
            off="Только зарегистрированные"
          />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <NumField
            icon={Clock}
            label="Обратный отсчёт"
            value={settings.countdownSeconds}
            min={3}
            max={15}
            onChange={v => setSettings(s => ({ ...s, countdownSeconds: v }))}
            suffix="с"
          />
          <NumField
            icon={Clock}
            label="Превью вопроса"
            value={settings.questionIntroSec}
            min={1}
            max={10}
            onChange={v => setSettings(s => ({ ...s, questionIntroSec: v }))}
            suffix="с"
          />
          <NumField
            icon={Clock}
            label="Показ ответа"
            value={settings.answerRevealSec}
            min={2}
            max={20}
            onChange={v => setSettings(s => ({ ...s, answerRevealSec: v }))}
            suffix="с"
          />
          <NumField
            icon={Clock}
            label="Лидерборд"
            value={settings.leaderboardSec}
            min={2}
            max={30}
            onChange={v => setSettings(s => ({ ...s, leaderboardSec: v }))}
            suffix="с"
          />
        </div>
      </div>

      {/* POWER-UP POOL */}
      <div
        className="rounded-[1.75rem] border-2 border-slate-900 bg-white p-5 dark:border-white dark:bg-slate-900"
        style={{ boxShadow: '0 4px 0 var(--shadow-chunky, #1f1a14)' }}
      >
        <h2 className="mb-1 flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white">
          <Zap size={18} className="text-amber-500" strokeWidth={2.6} /> Способности
        </h2>
        <p className="mb-3 text-[11px] text-slate-500 dark:text-slate-400">
          Какие power-ups доступны игрокам в этой арене. Выбрано: {settings.powerUpPool.length}/{POWER_UPS.length}.
        </p>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {POWER_UPS.map(p => {
            const Icon = p.icon;
            const active = settings.powerUpPool.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => togglePower(p.id)}
                className={`flex items-start gap-2 rounded-2xl border-2 p-3 text-left transition
                  ${active
                    ? 'border-amber-500 bg-amber-50 shadow-[0_3px_0_#92400e] dark:bg-amber-900/30'
                    : 'border-slate-300 bg-white hover:border-slate-500 dark:border-slate-600 dark:bg-slate-800'}`}
              >
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl
                  ${active ? 'bg-amber-300 text-amber-900' : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                  <Icon size={16} strokeWidth={2.6} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-sm font-black text-slate-900 dark:text-white">{p.label}</span>
                    {active && <Check size={14} className="text-emerald-600" strokeWidth={3} />}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{p.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ABILITIES */}
      <div
        className="rounded-[1.75rem] border-2 border-slate-900 bg-white p-5 dark:border-white dark:bg-slate-900"
        style={{ boxShadow: '0 4px 0 var(--shadow-chunky, #1f1a14)' }}
      >
        <h2 className="mb-3 flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white">
          <Crown size={18} className="text-purple-500" strokeWidth={2.6} /> Дополнительные механики
        </h2>

        <div className="grid gap-2 sm:grid-cols-3">
          <ToggleCard
            icon={Flame}
            title="Серии (комбо)"
            desc="Множитель очков за подряд правильные ответы."
            value={settings.streaksEnabled}
            onChange={v => setSettings(s => ({ ...s, streaksEnabled: v }))}
          />
          <ToggleCard
            icon={Trophy}
            title="Underdog бонус"
            desc="Игрокам в нижней тройке +20% очков за правильный ответ."
            value={settings.underdogBonus}
            onChange={v => setSettings(s => ({ ...s, underdogBonus: v }))}
          />
          <ToggleCard
            icon={Sparkles}
            title="Перемешать вопросы"
            desc="Каждый игрок видит вопросы в разном порядке."
            value={settings.shuffleQuestions}
            onChange={v => setSettings(s => ({ ...s, shuffleQuestions: v }))}
          />
        </div>
      </div>

      {/* PREVIEW STATS */}
      <div
        className="rounded-[1.75rem] border-2 border-slate-900 bg-amber-50/70 p-4 dark:border-white dark:bg-amber-900/20"
        style={{ boxShadow: '0 4px 0 var(--shadow-chunky, #1f1a14)' }}
      >
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-700 dark:text-amber-100">Сводка:</span>
          <Stat icon={ListChecks} label="Вопросов" value={stats.count} />
          <span className="h-4 w-px bg-slate-300 dark:bg-slate-600" />
          <Stat icon={Trophy} label="Очков" value={stats.totalPoints} />
          <span className="h-4 w-px bg-slate-300 dark:bg-slate-600" />
          <Stat icon={Clock} label="Время" value={formatDuration(stats.totalSec)} />
          <span className="h-4 w-px bg-slate-300 dark:bg-slate-600" />
          <Stat icon={Zap} label="Способностей" value={settings.powerUpPool.length} />
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Tiny field primitives used in SettingsStep
function NumField({ icon: Icon, label, value, min, max, onChange, hint, suffix }) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        {Icon && <Icon size={11} strokeWidth={2.8} />} {label}
      </label>
      <div className="flex items-center gap-1">
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={e => onChange(Math.max(min, Math.min(max, parseInt(e.target.value) || min)))}
          className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-sm font-black tabular-nums text-slate-900 focus:border-primary-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        />
        {suffix && <span className="text-[11px] font-black text-slate-400">{suffix}</span>}
      </div>
      {hint && <p className="mt-1 text-[10px] text-slate-400">{hint}</p>}
    </div>
  );
}

function ToggleField({ label, value, onChange, on = 'Включено', off = 'Выключено' }) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        {value ? <Eye size={11} strokeWidth={2.8} /> : <EyeOff size={11} strokeWidth={2.8} />} {label}
      </label>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`flex w-full items-center justify-between gap-2 rounded-xl border-2 px-3 py-2 text-xs font-black transition
          ${value
            ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:border-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-200'
            : 'border-slate-300 bg-white text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}
      >
        <span>{value ? on : off}</span>
        <span className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 transition
          ${value ? 'border-emerald-500 bg-emerald-500' : 'border-slate-400 bg-slate-300 dark:bg-slate-600'}`}
        >
          <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition
            ${value ? 'left-[18px]' : 'left-0.5'}`}
          />
        </span>
      </button>
    </div>
  );
}

function ToggleCard({ icon: Icon, title, desc, value, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`flex items-start gap-2 rounded-2xl border-2 p-3 text-left transition
        ${value
          ? 'border-purple-500 bg-purple-50 shadow-[0_3px_0_#6b21a8] dark:bg-purple-900/30'
          : 'border-slate-300 bg-white hover:border-slate-500 dark:border-slate-600 dark:bg-slate-800'}`}
    >
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl
        ${value ? 'bg-purple-300 text-purple-900' : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
        <Icon size={16} strokeWidth={2.6} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1">
          <span className="text-sm font-black text-slate-900 dark:text-white">{title}</span>
          {value && <Check size={14} className="text-emerald-600" strokeWidth={3} />}
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">{desc}</p>
      </div>
    </button>
  );
}

function Stat({ icon: Icon, label, value }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-[0.14em] text-slate-700 dark:text-slate-200">
      <Icon size={12} strokeWidth={2.8} />
      <span className="text-slate-500 dark:text-slate-400">{label}:</span>
      <span className="tabular-nums">{value}</span>
    </span>
  );
}
