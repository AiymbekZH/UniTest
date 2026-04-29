import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Save, Plus, Trash2, Check, ToggleLeft, FileText, Link2, Type,
  ListChecks, Sparkles, Zap, Eye, AlertTriangle, Shuffle, Snowflake,
  Flame, Target, Loader2, Hash, Lightbulb, Skull, Trophy, Clock,
  ChevronDown, ChevronUp
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { haptic } from '../../utils/haptics';

/**
 * InlineQuestionEditor — modal/panel for creating a NEW question right inside
 * the arena flow (so users don't need to detour through the Question Bank).
 *
 * What makes it Arena-specific (compared to CreateTest): the Spice section.
 *   • speedProfile (blitz / normal / marathon) — preset timer + points combo
 *   • trapOptionId — one wrong option marked as a "trap" (selecting costs streak)
 *   • blockPowerUps — boss-level: no abilities allowed on this question
 *   • revealHint — short text auto-shown at 50% of the timer (the "lifeline")
 *   • shuffleOptions — Kahoot-style per-player option shuffling
 *
 * On save → POST /api/question-bank → returns the saved BankQuestion → onSaved(q).
 * The created question is reusable from the bank for future arenas.
 */

const QUESTION_TYPES = [
  { id: 'single-choice',   label: 'Один ответ',           icon: Check,      color: 'blue',    desc: 'Выбор одного правильного варианта' },
  { id: 'multiple-choice', label: 'Несколько ответов',  icon: ListChecks, color: 'purple',  desc: 'Несколько правильных вариантов' },
  { id: 'true-false',      label: 'Верно/Неверно',      icon: ToggleLeft, color: 'emerald', desc: 'Простой бинарный выбор' },
  { id: 'essay',           label: 'Открытый ответ',      icon: FileText,   color: 'amber',   desc: 'Игрок вводит текст' },
  { id: 'matching',        label: 'Сопоставление',       icon: Link2,      color: 'rose',    desc: 'Соединить пары значений' },
  { id: 'fill-blank',      label: 'Заполнить пропуск',   icon: Type,       color: 'teal',    desc: 'Подставить слово / число' },
];

const SPEED_PROFILES = [
  { id: 'blitz',    label: 'Блиц',     timer: 10,  pointsHint: '×0.5 очков', icon: Flame,    color: 'red',     desc: '10 сек · меньше очков, больше адреналина' },
  { id: 'normal',   label: 'Стандарт', timer: 20,  pointsHint: 'обычные',     icon: Sparkles, color: 'amber',   desc: '20 сек · обычные очки' },
  { id: 'marathon', label: 'Марафон',  timer: 60,  pointsHint: '×1.5 очков', icon: Trophy,   color: 'emerald', desc: '60 сек · сложные вопросы, больше очков' },
  { id: 'custom',   label: 'Свой',     timer: null, pointsHint: 'свободно',  icon: Clock,    color: 'slate',   desc: 'Задать самому' },
];

const COLOR_CHIPS = {
  blue:    'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-700',
  purple:  'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/40 dark:text-purple-200 dark:border-purple-700',
  emerald: 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-700',
  amber:   'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-700',
  rose:    'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-900/40 dark:text-rose-200 dark:border-rose-700',
  teal:    'bg-teal-100 text-teal-700 border-teal-300 dark:bg-teal-900/40 dark:text-teal-200 dark:border-teal-700',
  red:     'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/40 dark:text-red-200 dark:border-red-700',
  slate:   'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600',
};

let __optCounter = 0;
const newOptId = () => `opt-${Date.now().toString(36)}-${(++__optCounter).toString(36)}`;

const blankSingleOptions = () => ([
  { id: newOptId(), text: '', isCorrect: true,  matchPair: '' },
  { id: newOptId(), text: '', isCorrect: false, matchPair: '' },
  { id: newOptId(), text: '', isCorrect: false, matchPair: '' },
  { id: newOptId(), text: '', isCorrect: false, matchPair: '' },
]);

const trueFalseOptions = () => ([
  { id: 'tf-true',  text: 'Верно',   isCorrect: true,  matchPair: '' },
  { id: 'tf-false', text: 'Неверно', isCorrect: false, matchPair: '' },
]);

const blankMatchingOptions = () => ([
  { id: newOptId(), text: '',  isCorrect: false, matchPair: '' },
  { id: newOptId(), text: '',  isCorrect: false, matchPair: '' },
  { id: newOptId(), text: '',  isCorrect: false, matchPair: '' },
]);

function buildInitialState(initial) {
  if (initial) {
    return {
      type: initial.type || 'single-choice',
      questionText: initial.questionText || '',
      points: initial.points ?? 1,
      options: (initial.options || []).map(o => ({
        id: o.id || newOptId(),
        text: o.text || '',
        isCorrect: !!o.isCorrect,
        matchPair: o.matchPair || ''
      })),
      correctAnswer: initial.correctAnswer || '',
      explanation: initial.explanation || '',
      tags: (initial.tags || []).join(', '),
      category: initial.category || '',
      // Arena spice
      speedProfile:  initial.speedProfile || 'normal',
      timerSec:      initial.timerSec ?? null,
      trapOptionId:  initial.trapOptionId || '',
      blockPowerUps: !!initial.blockPowerUps,
      revealHint:    initial.revealHint || '',
      shuffleOptions: initial.shuffleOptions !== false,
    };
  }
  return {
    type: 'single-choice',
    questionText: '',
    points: 1,
    options: blankSingleOptions(),
    correctAnswer: '',
    explanation: '',
    tags: '',
    category: '',
    speedProfile: 'normal',
    timerSec: null,
    trapOptionId: '',
    blockPowerUps: false,
    revealHint: '',
    shuffleOptions: true,
  };
}

export default function InlineQuestionEditor({
  open,
  onClose,
  onSaved,        // (savedBankQuestion) => void
  initial = null, // when editing existing bank question
}) {
  const [state, setState] = useState(() => buildInitialState(initial));
  const [saving, setSaving] = useState(false);
  const [spiceOpen, setSpiceOpen] = useState(false);
  const dialogRef = useRef(null);

  // Reset whenever the modal is opened (so reopening after save shows fresh form).
  useEffect(() => {
    if (open) {
      setState(buildInitialState(initial));
      setSpiceOpen(false);
    }
  }, [open, initial]);

  // ESC to close + scroll-lock body while open
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  // ── Type-switching keeps consistent option layout ────────────────────────
  const setType = (nextType) => {
    setState(prev => {
      let nextOptions = prev.options;
      if (nextType === 'true-false') nextOptions = trueFalseOptions();
      else if (nextType === 'matching') nextOptions = blankMatchingOptions();
      else if (nextType === 'single-choice' || nextType === 'multiple-choice') {
        nextOptions = prev.options?.length >= 2 && prev.type !== 'matching' && prev.type !== 'true-false'
          ? prev.options.map((o, i) => ({ ...o, isCorrect: nextType === 'single-choice' ? i === 0 : !!o.isCorrect }))
          : blankSingleOptions();
      } else {
        nextOptions = []; // essay / fill-blank
      }
      return {
        ...prev,
        type: nextType,
        options: nextOptions,
        // Reset trap when switching to a type that doesn't support it.
        trapOptionId: ['single-choice', 'multiple-choice'].includes(nextType) ? prev.trapOptionId : '',
        correctAnswer: ['essay', 'fill-blank'].includes(nextType) ? prev.correctAnswer : ''
      };
    });
  };

  const updateOption = (id, patch) => {
    setState(prev => ({
      ...prev,
      options: prev.options.map(o => o.id === id ? { ...o, ...patch } : o)
    }));
  };

  const toggleCorrect = (id) => {
    setState(prev => {
      if (prev.type === 'single-choice') {
        return { ...prev, options: prev.options.map(o => ({ ...o, isCorrect: o.id === id })) };
      }
      if (prev.type === 'multiple-choice') {
        return { ...prev, options: prev.options.map(o => o.id === id ? { ...o, isCorrect: !o.isCorrect } : o) };
      }
      return prev;
    });
  };

  const addOption = () => {
    if (state.options.length >= 6) return;
    setState(prev => ({
      ...prev,
      options: [...prev.options, { id: newOptId(), text: '', isCorrect: false, matchPair: '' }]
    }));
  };

  const removeOption = (id) => {
    if (state.options.length <= 2) return;
    setState(prev => ({
      ...prev,
      options: prev.options.filter(o => o.id !== id),
      trapOptionId: prev.trapOptionId === id ? '' : prev.trapOptionId
    }));
  };

  const setSpeedProfile = (profileId) => {
    const profile = SPEED_PROFILES.find(p => p.id === profileId);
    setState(prev => ({
      ...prev,
      speedProfile: profileId,
      timerSec: profile?.timer ?? prev.timerSec,
      points: profileId === 'blitz' ? 1 : profileId === 'marathon' ? 3 : prev.points
    }));
  };

  // ── Validation ──────────────────────────────────────────────────────────
  const validation = useMemo(() => {
    const errors = [];
    if (!state.questionText.trim()) errors.push('Введите текст вопроса');

    if (['single-choice', 'multiple-choice', 'true-false'].includes(state.type)) {
      const filled = state.options.filter(o => o.text.trim());
      if (filled.length < 2) errors.push('Минимум 2 варианта');
      const correct = state.options.filter(o => o.isCorrect && o.text.trim());
      if (correct.length === 0) errors.push('Отметьте хотя бы один правильный');
      if (state.type === 'single-choice' && correct.length > 1) errors.push('Для «Один ответ» только один правильный');
    }
    if (state.type === 'matching') {
      const filled = state.options.filter(o => o.text.trim() && o.matchPair.trim());
      if (filled.length < 2) errors.push('Минимум 2 пары для сопоставления');
    }
    if (['essay', 'fill-blank'].includes(state.type)) {
      if (!state.correctAnswer.trim()) errors.push('Укажите эталонный ответ');
    }
    if (state.points < 0) errors.push('Очки не могут быть отрицательными');
    if (state.timerSec != null && (state.timerSec < 5 || state.timerSec > 300)) {
      errors.push('Таймер: 5–300 секунд');
    }
    return errors;
  }, [state]);

  const canSave = validation.length === 0 && !saving;

  // ── Save ────────────────────────────────────────────────────────────────
  const buildPayload = () => {
    const payload = {
      type: state.type,
      questionText: state.questionText.trim(),
      points: Math.max(0, Math.min(100, Math.round(state.points || 0))),
      options: ['essay', 'fill-blank'].includes(state.type) ? [] : state.options
        .filter(o => state.type === 'matching' ? (o.text.trim() || o.matchPair.trim()) : o.text.trim())
        .map(o => ({
          id: o.id,
          text: o.text.trim(),
          isCorrect: !!o.isCorrect,
          matchPair: o.matchPair?.trim() || ''
        })),
      correctAnswer: ['essay', 'fill-blank'].includes(state.type) ? state.correctAnswer.trim() : '',
      explanation: state.explanation.trim(),
      tags: state.tags.split(',').map(t => t.trim()).filter(Boolean).slice(0, 20),
      category: state.category.trim(),
      // Arena spice
      speedProfile: state.speedProfile,
      timerSec: state.timerSec || null,
      trapOptionId: ['single-choice', 'multiple-choice'].includes(state.type) ? (state.trapOptionId || '') : '',
      blockPowerUps: !!state.blockPowerUps,
      revealHint: (state.revealHint || '').slice(0, 200),
      shuffleOptions: !!state.shuffleOptions
    };
    return payload;
  };

  const handleSave = async (closeAfter = true) => {
    if (!canSave) {
      toast.error(validation[0] || 'Проверьте поля');
      return null;
    }
    setSaving(true);
    try {
      const payload = buildPayload();
      const res = initial?._id
        ? await api.put(`/question-bank/${initial._id}`, payload)
        : await api.post('/question-bank', payload);
      const saved = res.data?.question || res.data;
      toast.success(initial?._id ? 'Вопрос обновлён' : 'Вопрос добавлен в банк');
      haptic.success?.();
      onSaved?.(saved);
      if (closeAfter) onClose?.();
      return saved;
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Ошибка сохранения');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndCreateAnother = async () => {
    const saved = await handleSave(false);
    if (saved) {
      // Reset form for next question, keep the same type + tags/category for fast batch entry.
      setState(prev => ({
        ...buildInitialState(null),
        type: prev.type,
        tags: prev.tags,
        category: prev.category,
        speedProfile: prev.speedProfile,
        shuffleOptions: prev.shuffleOptions,
        options: prev.type === 'true-false' ? trueFalseOptions()
              : prev.type === 'matching' ? blankMatchingOptions()
              : prev.type === 'single-choice' || prev.type === 'multiple-choice' ? blankSingleOptions()
              : []
      }));
    }
  };

  if (!open) return null;
  const typeMeta = QUESTION_TYPES.find(t => t.id === state.type) || QUESTION_TYPES[0];

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      >
        <motion.div
          ref={dialogRef}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.18 }}
          className="relative flex h-[min(92vh,860px)] w-[min(96vw,820px)] flex-col overflow-hidden rounded-[1.5rem] border-2 border-slate-900 bg-white text-slate-900 dark:border-white dark:bg-slate-900 dark:text-white"
          style={{ boxShadow: '0 8px 0 var(--shadow-chunky, #1f1a14)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* HEADER */}
          <header className="flex items-center justify-between border-b-2 border-slate-200 bg-gradient-to-r from-amber-200 to-amber-100 px-4 py-3 dark:border-slate-700 dark:from-amber-900/40 dark:to-amber-900/20">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-slate-900 bg-white dark:border-white dark:bg-slate-800">
                <Sparkles size={17} className="text-amber-600" strokeWidth={2.6} />
              </span>
              <div>
                <h2 className="text-base font-black leading-tight">
                  {initial?._id ? 'Редактировать вопрос' : 'Создать вопрос для арены'}
                </h2>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600 dark:text-slate-400">
                  {initial?._id ? 'изменения сохранятся в банке' : 'будет добавлен в ваш банк вопросов'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="touch-target grid h-9 w-9 place-items-center rounded-xl border-2 border-slate-900 bg-white text-slate-700 transition hover:bg-slate-100 dark:border-white dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              title="Закрыть (Esc)"
            >
              <X size={16} strokeWidth={2.6} />
            </button>
          </header>

          {/* BODY */}
          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
            {/* TYPE SELECTOR */}
            <section className="mb-4">
              <p className="mb-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Тип вопроса
              </p>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-6">
                {QUESTION_TYPES.map((t) => {
                  const Icon = t.icon;
                  const active = state.type === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setType(t.id)}
                      title={t.desc}
                      className={`flex items-center gap-1.5 rounded-xl border-2 px-2 py-1.5 text-[11px] font-black transition
                        ${active
                          ? `${COLOR_CHIPS[t.color]} ring-2 ring-offset-1 ring-offset-white dark:ring-offset-slate-900`
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}
                    >
                      <Icon size={12} strokeWidth={2.8} />
                      <span className="truncate">{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* QUESTION TEXT */}
            <section className="mb-4">
              <label className="mb-1.5 flex items-center gap-1 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Текст вопроса <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={state.questionText}
                onChange={(e) => setState(s => ({ ...s, questionText: e.target.value }))}
                placeholder="Например: В каком году была основана Astana?"
                maxLength={1000}
                className="w-full resize-y rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/30 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              />
              <p className="mt-1 text-[10px] text-slate-400">{state.questionText.length}/1000</p>
            </section>

            {/* TYPE-SPECIFIC EDITOR */}
            <section className="mb-4">
              {(state.type === 'single-choice' || state.type === 'multiple-choice') && (
                <ChoiceOptionsEditor
                  state={state}
                  onUpdate={updateOption}
                  onToggle={toggleCorrect}
                  onAdd={addOption}
                  onRemove={removeOption}
                />
              )}

              {state.type === 'true-false' && (
                <TrueFalseEditor state={state} onToggle={toggleCorrect} />
              )}

              {state.type === 'matching' && (
                <MatchingEditor state={state} onUpdate={updateOption} onAdd={addOption} onRemove={removeOption} />
              )}

              {state.type === 'essay' && (
                <SimpleAnswerEditor
                  label="Эталонный ответ"
                  hint="Будет показан игрокам в финале для самопроверки. Авто-оценки нет — арена не считает эссе."
                  value={state.correctAnswer}
                  onChange={(v) => setState(s => ({ ...s, correctAnswer: v }))}
                  rows={3}
                />
              )}

              {state.type === 'fill-blank' && (
                <SimpleAnswerEditor
                  label="Правильный ответ"
                  hint="Сравнение нечувствительно к регистру и пробелам."
                  value={state.correctAnswer}
                  onChange={(v) => setState(s => ({ ...s, correctAnswer: v }))}
                  rows={1}
                />
              )}
            </section>

            {/* META: points / category / tags */}
            <section className="mb-4 grid gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  <Trophy size={11} strokeWidth={2.8} className="mr-1 inline" /> Очки
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={state.points}
                  onChange={(e) => setState(s => ({ ...s, points: parseInt(e.target.value) || 0 }))}
                  className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-sm font-black tabular-nums text-slate-900 focus:border-primary-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  <Hash size={11} strokeWidth={2.8} className="mr-1 inline" /> Категория
                </label>
                <input
                  type="text"
                  value={state.category}
                  onChange={(e) => setState(s => ({ ...s, category: e.target.value }))}
                  placeholder="История, Математика…"
                  className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900 focus:border-primary-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Теги (через запятую)
                </label>
                <input
                  type="text"
                  value={state.tags}
                  onChange={(e) => setState(s => ({ ...s, tags: e.target.value }))}
                  placeholder="легко, школа, история"
                  className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900 focus:border-primary-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </section>

            {/* EXPLANATION */}
            <section className="mb-4">
              <label className="mb-1 block text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Пояснение (показывается в момент раскрытия ответа)
              </label>
              <textarea
                rows={2}
                value={state.explanation}
                onChange={(e) => setState(s => ({ ...s, explanation: e.target.value }))}
                placeholder="Например: Astana основана 6 июля 1830 года…"
                maxLength={500}
                className="w-full resize-y rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              />
            </section>

            {/* ARENA SPICE — collapsible */}
            <section className="rounded-2xl border-2 border-amber-300 bg-amber-50/60 dark:border-amber-700 dark:bg-amber-900/20">
              <button
                type="button"
                onClick={() => setSpiceOpen(s => !s)}
                className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
              >
                <span className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-300 text-amber-900 dark:bg-amber-600 dark:text-amber-50">
                    <Zap size={13} strokeWidth={3} />
                  </span>
                  <span className="text-[12px] font-black uppercase tracking-[0.14em] text-amber-900 dark:text-amber-100">
                    Арена-фишки <span className="ml-1 rounded-full bg-white/70 px-1.5 py-0 text-[9px] tracking-[0.1em] dark:bg-amber-950/50">5</span>
                  </span>
                </span>
                {spiceOpen ? <ChevronUp size={14} className="text-amber-700" /> : <ChevronDown size={14} className="text-amber-700" />}
              </button>

              <AnimatePresence initial={false}>
                {spiceOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="overflow-hidden border-t border-amber-200 dark:border-amber-700"
                  >
                    <div className="space-y-4 px-3 pb-3 pt-3 sm:px-4">
                      {/* SPEED PROFILE */}
                      <div>
                        <p className="mb-1.5 flex items-center gap-1 text-[11px] font-black uppercase tracking-[0.16em] text-amber-900 dark:text-amber-200">
                          <Flame size={11} strokeWidth={2.8} /> Профиль темпа
                        </p>
                        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                          {SPEED_PROFILES.map(p => {
                            const Icon = p.icon;
                            const active = state.speedProfile === p.id;
                            return (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => setSpeedProfile(p.id)}
                                title={p.desc}
                                className={`flex flex-col items-start gap-0.5 rounded-xl border-2 px-2 py-1.5 text-left transition
                                  ${active
                                    ? `${COLOR_CHIPS[p.color]} ring-2 ring-offset-1 ring-offset-amber-50 dark:ring-offset-amber-900`
                                    : 'border-slate-200 bg-white hover:border-slate-400 dark:border-slate-700 dark:bg-slate-800'}`}
                              >
                                <span className="flex items-center gap-1 text-[11px] font-black">
                                  <Icon size={11} strokeWidth={2.8} /> {p.label}
                                </span>
                                <span className={`text-[9px] tabular-nums ${active ? 'opacity-90' : 'text-slate-500 dark:text-slate-400'}`}>
                                  {p.timer ? `${p.timer}с` : '—'} · {p.pointsHint}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                        {state.speedProfile === 'custom' && (
                          <div className="mt-2 flex items-center gap-2">
                            <Clock size={12} className="text-amber-700 dark:text-amber-300" strokeWidth={2.8} />
                            <input
                              type="number"
                              min={5}
                              max={300}
                              placeholder="свой таймер, сек"
                              value={state.timerSec || ''}
                              onChange={(e) => setState(s => ({ ...s, timerSec: e.target.value ? parseInt(e.target.value) : null }))}
                              className="w-32 rounded-lg border-2 border-amber-300 bg-white px-2 py-1 text-xs font-black tabular-nums text-slate-900 focus:border-amber-500 focus:outline-none dark:border-amber-700 dark:bg-amber-950/40 dark:text-white"
                            />
                            <span className="text-[10px] text-amber-700 dark:text-amber-300">5–300с</span>
                          </div>
                        )}
                      </div>

                      {/* TRAP OPTION (only for choice questions) */}
                      {['single-choice', 'multiple-choice'].includes(state.type) && (
                        <div>
                          <p className="mb-1 flex items-center gap-1 text-[11px] font-black uppercase tracking-[0.16em] text-rose-700 dark:text-rose-300">
                            <Target size={11} strokeWidth={2.8} /> Ловушка-вариант
                          </p>
                          <p className="mb-1.5 text-[10px] text-slate-600 dark:text-slate-400">
                            Если игрок выберет этот неправильный вариант — он потеряет всю серию (комбо). Опасно :)
                          </p>
                          <select
                            value={state.trapOptionId}
                            onChange={(e) => setState(s => ({ ...s, trapOptionId: e.target.value }))}
                            className="w-full rounded-xl border-2 border-rose-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-rose-500 focus:outline-none dark:border-rose-700 dark:bg-rose-950/30 dark:text-white"
                          >
                            <option value="">— Без ловушки —</option>
                            {state.options.filter(o => !o.isCorrect && o.text.trim()).map(o => (
                              <option key={o.id} value={o.id}>{o.text.slice(0, 60)}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* HINT */}
                      <div>
                        <p className="mb-1 flex items-center gap-1 text-[11px] font-black uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-300">
                          <Lightbulb size={11} strokeWidth={2.8} /> Подсказка (показ при 50% таймера)
                        </p>
                        <input
                          type="text"
                          maxLength={200}
                          value={state.revealHint}
                          onChange={(e) => setState(s => ({ ...s, revealHint: e.target.value }))}
                          placeholder="Подсказка появится у всех игроков на середине таймера"
                          className="w-full rounded-xl border-2 border-cyan-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-cyan-500 focus:outline-none dark:border-cyan-700 dark:bg-cyan-950/30 dark:text-white"
                        />
                        <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">{(state.revealHint || '').length}/200</p>
                      </div>

                      {/* TOGGLES */}
                      <div className="grid gap-2 sm:grid-cols-2">
                        <ToggleRow
                          icon={Skull}
                          color="red"
                          title="Босс-вопрос (без бустеров)"
                          desc="На этом вопросе нельзя применять способности"
                          value={state.blockPowerUps}
                          onChange={(v) => setState(s => ({ ...s, blockPowerUps: v }))}
                        />
                        <ToggleRow
                          icon={Shuffle}
                          color="purple"
                          title="Перемешать варианты"
                          desc="Каждый игрок видит варианты в своём порядке"
                          value={state.shuffleOptions}
                          onChange={(v) => setState(s => ({ ...s, shuffleOptions: v }))}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>
          </div>

          {/* FOOTER — sticky save bar */}
          <footer className="flex flex-wrap items-center gap-2 border-t-2 border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-950">
            {validation.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-lg border-2 border-red-300 bg-red-50 px-2 py-1 text-[10px] font-black text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-200">
                <AlertTriangle size={11} strokeWidth={2.8} /> {validation[0]}
              </span>
            )}
            <span className="ml-auto" />
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border-2 border-slate-300 bg-white px-3 py-1.5 text-xs font-black text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            >
              Отмена
            </button>
            {!initial?._id && (
              <button
                type="button"
                onClick={handleSaveAndCreateAnother}
                disabled={!canSave}
                className="rounded-lg border-2 border-slate-900 bg-white px-3 py-1.5 text-xs font-black text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white dark:bg-slate-800 dark:text-slate-200"
                title="Сохранить и создать ещё (для пакетного ввода)"
              >
                <Plus size={13} strokeWidth={2.8} className="mr-1 inline" />
                Создать ещё
              </button>
            )}
            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={!canSave}
              className="rounded-lg border-2 border-slate-900 bg-emerald-500 px-3 py-1.5 text-xs font-black text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 dark:border-white"
              style={{ boxShadow: '0 3px 0 #065f46' }}
            >
              {saving ? <Loader2 size={13} className="mr-1 inline animate-spin" /> : <Save size={13} strokeWidth={2.8} className="mr-1 inline" />}
              {initial?._id ? 'Сохранить' : 'Готово'}
            </button>
          </footer>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Sub-editors ──────────────────────────────────────────────────────────
function ChoiceOptionsEditor({ state, onUpdate, onToggle, onAdd, onRemove }) {
  return (
    <div>
      <p className="mb-1.5 flex items-center justify-between text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        <span>Варианты ({state.options.length}) <span className="text-red-500">*</span></span>
        {state.type === 'single-choice'
          ? <span className="text-[9px] font-black text-blue-600 dark:text-blue-300">отметьте 1 правильный</span>
          : <span className="text-[9px] font-black text-purple-600 dark:text-purple-300">отметьте все правильные</span>}
      </p>
      <div className="space-y-1.5">
        {state.options.map((opt, idx) => {
          const isTrap = opt.id === state.trapOptionId;
          return (
            <div
              key={opt.id}
              className={`flex items-center gap-2 rounded-xl border-2 p-1.5 transition
                ${opt.isCorrect
                  ? 'border-emerald-400 bg-emerald-50/70 dark:border-emerald-600 dark:bg-emerald-900/20'
                  : isTrap
                    ? 'border-rose-400 bg-rose-50/70 dark:border-rose-600 dark:bg-rose-900/20'
                    : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800'}`}
            >
              <button
                type="button"
                onClick={() => onToggle(opt.id)}
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg border-2 text-xs font-black transition
                  ${opt.isCorrect
                    ? 'border-emerald-600 bg-emerald-500 text-white'
                    : 'border-slate-300 bg-white text-slate-400 hover:border-emerald-500 dark:border-slate-600 dark:bg-slate-700'}`}
                title={opt.isCorrect ? 'Правильный ответ' : 'Отметить как правильный'}
              >
                {opt.isCorrect ? <Check size={13} strokeWidth={3.2} /> : String.fromCharCode(65 + idx)}
              </button>
              <input
                type="text"
                value={opt.text}
                onChange={(e) => onUpdate(opt.id, { text: e.target.value })}
                placeholder={`Вариант ${String.fromCharCode(65 + idx)}`}
                maxLength={300}
                className="flex-1 rounded-lg border-0 bg-transparent px-1 py-1 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/40 dark:text-white"
              />
              {isTrap && <span className="rounded-full bg-rose-200 px-1.5 py-0 text-[9px] font-black text-rose-800 dark:bg-rose-800 dark:text-rose-100">ловушка</span>}
              {state.options.length > 2 && (
                <button
                  type="button"
                  onClick={() => onRemove(opt.id)}
                  className="rounded-md p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30"
                  title="Удалить вариант"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          );
        })}
      </div>
      {state.options.length < 6 && (
        <button
          type="button"
          onClick={onAdd}
          className="mt-2 flex w-full items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-300 bg-white py-1.5 text-xs font-black text-slate-500 transition hover:border-primary-500 hover:text-primary-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400"
        >
          <Plus size={13} strokeWidth={2.8} /> Добавить вариант
        </button>
      )}
    </div>
  );
}

function TrueFalseEditor({ state, onToggle }) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        Какой вариант правильный?
      </p>
      <div className="grid grid-cols-2 gap-2">
        {state.options.map(opt => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onToggle(opt.id)}
            className={`flex items-center justify-center gap-2 rounded-xl border-2 px-3 py-3 text-sm font-black transition
              ${opt.isCorrect
                ? 'border-emerald-600 bg-emerald-500 text-white shadow-[0_3px_0_#065f46]'
                : 'border-slate-300 bg-white text-slate-700 hover:border-emerald-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200'}`}
          >
            {opt.isCorrect && <Check size={14} strokeWidth={3} />}
            {opt.text}
          </button>
        ))}
      </div>
    </div>
  );
}

function MatchingEditor({ state, onUpdate, onAdd, onRemove }) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        Пары для сопоставления ({state.options.length})
      </p>
      <div className="space-y-1.5">
        {state.options.map((opt, idx) => (
          <div
            key={opt.id}
            className="flex items-center gap-1.5 rounded-xl border-2 border-slate-200 bg-white p-1.5 dark:border-slate-700 dark:bg-slate-800"
          >
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-rose-100 text-[10px] font-black text-rose-700 dark:bg-rose-900/40 dark:text-rose-200">
              {idx + 1}
            </span>
            <input
              type="text"
              value={opt.text}
              onChange={(e) => onUpdate(opt.id, { text: e.target.value })}
              placeholder="Левая часть (вопрос)"
              maxLength={200}
              className="min-w-0 flex-1 rounded-lg border-2 border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-900 focus:border-rose-500 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-white"
            />
            <Link2 size={13} className="shrink-0 text-slate-400" />
            <input
              type="text"
              value={opt.matchPair}
              onChange={(e) => onUpdate(opt.id, { matchPair: e.target.value })}
              placeholder="Правая часть (ответ)"
              maxLength={200}
              className="min-w-0 flex-1 rounded-lg border-2 border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-900 focus:border-rose-500 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-white"
            />
            {state.options.length > 2 && (
              <button
                type="button"
                onClick={() => onRemove(opt.id)}
                className="rounded-md p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        ))}
      </div>
      {state.options.length < 6 && (
        <button
          type="button"
          onClick={onAdd}
          className="mt-2 flex w-full items-center justify-center gap-1 rounded-xl border-2 border-dashed border-rose-300 bg-white py-1.5 text-xs font-black text-rose-600 transition hover:border-rose-500 dark:border-rose-700 dark:bg-slate-800"
        >
          <Plus size={13} strokeWidth={2.8} /> Добавить пару
        </button>
      )}
    </div>
  );
}

function SimpleAnswerEditor({ label, hint, value, onChange, rows = 2 }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        {label} <span className="text-red-500">*</span>
      </label>
      {rows === 1 ? (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={300}
          className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900 focus:border-primary-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        />
      ) : (
        <textarea
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={1000}
          className="w-full resize-y rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        />
      )}
      {hint && <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">{hint}</p>}
    </div>
  );
}

function ToggleRow({ icon: Icon, color, title, desc, value, onChange }) {
  const palette = {
    red:    { on: 'border-red-500 bg-red-50 text-red-800 dark:border-red-600 dark:bg-red-900/30 dark:text-red-200',          dot: 'bg-red-500' },
    purple: { on: 'border-purple-500 bg-purple-50 text-purple-800 dark:border-purple-600 dark:bg-purple-900/30 dark:text-purple-200', dot: 'bg-purple-500' },
  }[color] || { on: 'border-slate-500 bg-slate-50', dot: 'bg-slate-500' };

  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`flex items-start gap-2 rounded-xl border-2 p-2.5 text-left transition
        ${value
          ? palette.on
          : 'border-slate-200 bg-white hover:border-slate-400 dark:border-slate-700 dark:bg-slate-800'}`}
    >
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg
        ${value ? palette.dot + ' text-white' : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
        <Icon size={13} strokeWidth={2.8} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1">
          <span className="text-[12px] font-black">{title}</span>
          <span className={`relative inline-flex h-4 w-7 shrink-0 rounded-full border-2 transition
            ${value ? 'border-emerald-600 bg-emerald-500' : 'border-slate-400 bg-slate-300 dark:bg-slate-600'}`}>
            <span className={`absolute top-0 h-2.5 w-2.5 rounded-full bg-white transition
              ${value ? 'left-[14px]' : 'left-0.5'}`} />
          </span>
        </div>
        <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">{desc}</p>
      </div>
    </button>
  );
}
