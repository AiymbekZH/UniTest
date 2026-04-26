import { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext, PointerSensor, KeyboardSensor, useSensor, useSensors, closestCorners
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Plus, Trash2, Sparkles, Zap, Check, ListChecks, ToggleLeft, FileText, Link2, Type,
  Database, ChevronDown, ChevronUp, GripVertical, Wand2, X, Languages, Image as ImageIcon,
  Crown, Skull, Snowflake, Hourglass, Star, Loader2, Save, ArrowDownUp
} from 'lucide-react';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import api from '../../services/api';
import ArenaQuestionPicker from './ArenaQuestionPicker';
import AIGenerateModal from '../AIGenerateModal';

const RichTextEditor = lazy(() => import('../RichTextEditor'));

// ──────────────────────────────────────────────────────────────────────────
// Constants & helpers
// ──────────────────────────────────────────────────────────────────────────

export const QUESTION_TYPES = [
  { value: 'single-choice',   label: 'Один ответ',         icon: Check,       chip: 'border-blue-300 bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-700' },
  { value: 'multiple-choice', label: 'Несколько ответов',  icon: ListChecks,  chip: 'border-purple-300 bg-purple-50 text-purple-700 dark:bg-purple-900/40 dark:text-purple-200 dark:border-purple-700' },
  { value: 'true-false',      label: 'Верно/Неверно',       icon: ToggleLeft,  chip: 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-700' },
  { value: 'essay',           label: 'Эссе',                 icon: FileText,    chip: 'border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-700' },
  { value: 'matching',        label: 'Сопоставление',       icon: Link2,       chip: 'border-rose-300 bg-rose-50 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200 dark:border-rose-700' },
  { value: 'fill-blank',      label: 'Заполнить пропуск',   icon: Type,        chip: 'border-teal-300 bg-teal-50 text-teal-700 dark:bg-teal-900/40 dark:text-teal-200 dark:border-teal-700' },
];

const TYPE_BY_VALUE = Object.fromEntries(QUESTION_TYPES.map(t => [t.value, t]));

// Per-question power-up tags. UI is a horizontal segmented control.
export const QUESTION_TAGS = [
  { value: 'normal',  label: 'Обычный', icon: null,       desc: 'Без эффектов', color: 'border-slate-300 bg-white text-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600' },
  { value: 'blitz',   label: 'Блиц',    icon: Zap,        desc: 'Таймер 5с',    color: 'border-cyan-400 bg-cyan-50 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-200 dark:border-cyan-600' },
  { value: 'think',   label: 'Думай',   icon: Hourglass,  desc: 'Таймер 60с',   color: 'border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-600' },
  { value: 'jackpot', label: 'Джекпот', icon: Star,       desc: '×2 очков',     color: 'border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-600' },
  { value: 'boss',    label: 'BOSS',    icon: Skull,      desc: '×3 очков · бустеры выкл.', color: 'border-red-500 bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-200 dark:border-red-700' },
];

export const LANGS = [
  { code: 'ru', label: '🇷🇺 RU' },
  { code: 'en', label: '🇬🇧 EN' },
  { code: 'kz', label: '🇰🇿 KZ' },
  { code: 'es', label: '🇪🇸 ES' },
];

const TF_LABELS = {
  ru: ['Верно', 'Неверно'],
  en: ['True', 'False'],
  kz: ['Дұрыс', 'Бұрыс'],
  es: ['Verdadero', 'Falso']
};

export function createEmptyEmbeddedQuestion(type = 'single-choice') {
  const base = {
    type,
    questionText: '',
    passage: '',
    points: 1,
    options: [],
    correctAnswer: '',
    explanation: '',
    media: { type: '', url: '', fileName: '' },
    translations: {}
  };
  if (type === 'single-choice' || type === 'multiple-choice') {
    base.options = [
      { id: uuidv4(), text: '', isCorrect: false, matchPair: '' },
      { id: uuidv4(), text: '', isCorrect: false, matchPair: '' },
      { id: uuidv4(), text: '', isCorrect: false, matchPair: '' },
      { id: uuidv4(), text: '', isCorrect: false, matchPair: '' },
    ];
  } else if (type === 'true-false') {
    base.options = TF_LABELS.ru.map((text, i) => ({
      id: uuidv4(), text, isCorrect: i === 0, matchPair: ''
    }));
  } else if (type === 'matching') {
    base.options = [
      { id: uuidv4(), text: '', isCorrect: true, matchPair: '' },
      { id: uuidv4(), text: '', isCorrect: true, matchPair: '' },
      { id: uuidv4(), text: '', isCorrect: true, matchPair: '' },
    ];
  }
  return base;
}

// Convert a CreateTest-style question (from AIGenerateModal) into an embedded entry payload.
function aiQuestionToEmbedded(q) {
  return {
    type: q.type || 'single-choice',
    questionText: q.questionText || '',
    passage: q.passage || '',
    points: Math.max(1, Math.min(1000, Number(q.points) || 1)),
    options: (q.options || []).map(o => ({
      id: uuidv4(),
      text: o.text || '',
      isCorrect: !!o.isCorrect,
      matchPair: o.matchPair || ''
    })),
    correctAnswer: q.correctAnswer || '',
    explanation: q.explanation || '',
    media: { type: '', url: '', fileName: '' },
    translations: {}
  };
}

// Strip HTML to a short preview line.
function plainPreview(html, max = 120) {
  const txt = String(html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return txt.length > max ? txt.slice(0, max - 1) + '…' : txt;
}

// ──────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ──────────────────────────────────────────────────────────────────────────

/**
 * ArenaQuestionsStep — unified Step 2 of CreateArenaTest.
 *
 * Manages the master `entries` array (bank + embedded mixed). Provides:
 *   - Sortable list with collapse/expand cards
 *   - Inline editor for embedded entries (full feature parity with CreateTest)
 *   - Bank picker as a side-panel toggle
 *   - AI generation via existing AIGenerateModal
 *   - AI auto-balance to reorder + retime entries
 *   - "В банк" promote button for embedded entries (edit mode only)
 *
 * Props:
 *   entries            — master array of `{ id, kind, bankId?, q, tag, timerOverride, pointsOverride }`
 *   onChange(entries)  — fires on every mutation
 *   defaultTimer       — fallback timer (sec) shown when entry has no timerOverride
 *   arenaTestId        — when set (edit mode), enables the "В банк" promote button
 *   hasAIAccess        — toggles AI buttons
 *   currentLanguage    — base language for AIGenerateModal
 */
export default function ArenaQuestionsStep({
  entries,
  onChange,
  defaultTimer = 20,
  arenaTestId = null,
  hasAIAccess = false,
  currentLanguage = 'ru'
}) {
  const [expandedId, setExpandedId] = useState(null);
  const [showAddTypeMenu, setShowAddTypeMenu] = useState(false);
  const [showBankPicker, setShowBankPicker] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [balancing, setBalancing] = useState(false);
  const [remixingId, setRemixingId] = useState(null);
  const [translatingId, setTranslatingId] = useState(null);
  const [promotingId, setPromotingId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // ── Mutation helpers ─────────────────────────────────────────────────
  const setEntries = (updater) => {
    const next = typeof updater === 'function' ? updater(entries) : updater;
    onChange(next);
  };

  const addEmbedded = (type) => {
    const q = createEmptyEmbeddedQuestion(type);
    const newEntry = {
      id: `emb-${uuidv4()}`,
      kind: 'embedded',
      bankId: null,
      q,
      tag: 'normal',
      timerOverride: null,
      pointsOverride: null,
    };
    setEntries(prev => [...prev, newEntry]);
    setExpandedId(newEntry.id);
    setShowAddTypeMenu(false);
  };

  const removeEntry = (id) => {
    setEntries(prev => prev.filter(e => e.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  const patchEntry = (id, patch) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, ...patch } : e));
  };

  // Update a single property on the embedded `q` payload of an entry.
  const patchEmbeddedQ = (id, qPatch) => {
    setEntries(prev => prev.map(e =>
      e.id === id ? { ...e, q: { ...e.q, ...qPatch } } : e
    ));
  };

  // Update a single option inside an embedded q.
  const patchEmbeddedOption = (id, optionIndex, optPatch) => {
    setEntries(prev => prev.map(e => {
      if (e.id !== id || e.kind !== 'embedded') return e;
      const nextOpts = [...(e.q.options || [])];
      nextOpts[optionIndex] = { ...nextOpts[optionIndex], ...optPatch };
      // For single-choice / true-false: when toggling isCorrect on, others must flip off.
      if ('isCorrect' in optPatch && optPatch.isCorrect &&
          (e.q.type === 'single-choice' || e.q.type === 'true-false')) {
        nextOpts.forEach((opt, i) => {
          if (i !== optionIndex) opt.isCorrect = false;
        });
      }
      return { ...e, q: { ...e.q, options: nextOpts } };
    }));
  };

  const addOptionRow = (id) => {
    setEntries(prev => prev.map(e => {
      if (e.id !== id || e.kind !== 'embedded') return e;
      if ((e.q.options || []).length >= 12) return e;
      const newOpt = { id: uuidv4(), text: '', isCorrect: false, matchPair: '' };
      return { ...e, q: { ...e.q, options: [...(e.q.options || []), newOpt] } };
    }));
  };

  const removeOptionRow = (id, optionIndex) => {
    setEntries(prev => prev.map(e => {
      if (e.id !== id || e.kind !== 'embedded') return e;
      if ((e.q.options || []).length <= 2) return e;
      return { ...e, q: { ...e.q, options: e.q.options.filter((_, i) => i !== optionIndex) } };
    }));
  };

  // ── DnD ──────────────────────────────────────────────────────────────
  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = entries.findIndex(e => e.id === active.id);
    const newIdx = entries.findIndex(e => e.id === over.id);
    if (oldIdx >= 0 && newIdx >= 0) {
      setEntries(arrayMove(entries, oldIdx, newIdx));
    }
  };

  // ── Bank picker integration ──────────────────────────────────────────
  // Picker emits its own snapshot; we splice it into our master entries by
  // adding entries that are NEW (bank ids not yet present).
  const bankIdsInMaster = useMemo(
    () => new Set(entries.filter(e => e.kind === 'bank').map(e => e.bankId)),
    [entries]
  );

  const handlePickerChange = (pickerSnapshot) => {
    // pickerSnapshot is the picker's entire selection. We sync bank entries to match.
    // Remove bank entries that are no longer in pickerSnapshot, add new ones.
    const pickerBankIds = new Set(pickerSnapshot.map(s => s.bankId));
    setEntries(prev => {
      // Keep all embedded entries + bank entries still selected, in their current order.
      const kept = prev.filter(e => e.kind === 'embedded' || pickerBankIds.has(e.bankId));
      // Append new bank entries from picker (those whose bankId wasn't in master).
      const existing = new Set(kept.filter(e => e.kind === 'bank').map(e => e.bankId));
      const additions = pickerSnapshot
        .filter(s => !existing.has(s.bankId))
        .map(s => ({
          id: `bk-${s.bankId}-${uuidv4().slice(0, 6)}`,
          kind: 'bank',
          bankId: s.bankId,
          q: s.q,
          tag: 'normal',
          timerOverride: s.timerOverride ?? null,
          pointsOverride: s.pointsOverride ?? null,
        }));
      return [...kept, ...additions];
    });
  };

  // Picker initial snapshot from current bank entries.
  const pickerInitial = useMemo(() => entries
    .filter(e => e.kind === 'bank')
    .map(e => ({
      id: e.id,
      bankId: e.bankId,
      q: e.q,
      timerOverride: e.timerOverride,
      pointsOverride: e.pointsOverride
    })), [entries]);

  // ── AI integrations ──────────────────────────────────────────────────
  const handleAIRemix = async (entry) => {
    if (!hasAIAccess) {
      toast.error('AI-функции доступны по разрешению администратора');
      return;
    }
    if (entry.kind !== 'embedded') {
      toast('Ремикс работает только с собственными вопросами', { icon: '✏️' });
      return;
    }
    setRemixingId(entry.id);
    try {
      const res = await api.post('/ai/arena-remix', {
        question: {
          type: entry.q.type,
          questionText: entry.q.questionText,
          options: entry.q.options || [],
          explanation: entry.q.explanation || '',
          points: entry.q.points || 1
        },
        language: currentLanguage
      });
      const remixed = res.data?.remixed;
      if (!remixed) throw new Error('Empty response');
      patchEmbeddedQ(entry.id, {
        questionText: remixed.questionText,
        options: remixed.options,
        explanation: remixed.explanation
      });
      toast.success('Вопрос обновлён ✨');
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Ошибка ремикса');
    } finally {
      setRemixingId(null);
    }
  };

  const handleAITranslate = async (entry, targetCodes) => {
    if (!hasAIAccess) {
      toast.error('AI-функции доступны по разрешению администратора');
      return;
    }
    if (entry.kind !== 'embedded') {
      toast('Переводы работают только для собственных вопросов', { icon: '✏️' });
      return;
    }
    setTranslatingId(entry.id);
    try {
      const res = await api.post('/ai/translate', {
        question: {
          type: entry.q.type,
          questionText: entry.q.questionText,
          options: (entry.q.options || []).map(o => ({ text: o.text, matchPair: o.matchPair })),
          passage: entry.q.passage || '',
          explanation: entry.q.explanation || '',
          correctAnswer: entry.q.correctAnswer || ''
        },
        sourceLanguage: currentLanguage,
        targetLanguages: targetCodes
      });
      const translations = res.data?.translations || {};
      const next = { ...(entry.q.translations || {}) };
      for (const code of targetCodes) {
        if (translations[code]) next[code] = translations[code];
      }
      patchEmbeddedQ(entry.id, { translations: next });
      toast.success(`Переведено: ${targetCodes.join(', ').toUpperCase()}`);
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Ошибка перевода');
    } finally {
      setTranslatingId(null);
    }
  };

  const handleAIBalance = async () => {
    if (!hasAIAccess) {
      toast.error('AI-функции доступны по разрешению администратора');
      return;
    }
    if (entries.length < 2) {
      toast('Нужно минимум 2 вопроса для автобаланса', { icon: 'ℹ️' });
      return;
    }
    setBalancing(true);
    try {
      const compactEntries = entries.map((e, i) => ({
        idx: i,
        type: e.q?.type || 'single-choice',
        questionText: e.q?.questionText || '',
        points: e.pointsOverride ?? e.q?.points ?? 1
      }));
      const res = await api.post('/ai/arena-balance', {
        entries: compactEntries,
        language: currentLanguage,
        defaultTimer
      });
      const { ordering = [], timers = [], difficulties = [] } = res.data || {};

      // Apply AI suggestions: reorder + set timer overrides + map difficulties to tags.
      const DIFF_TO_TAG = { easy: 'normal', medium: 'normal', hard: 'normal', jackpot: 'jackpot', boss: 'boss' };
      const reordered = ordering.map((origIdx, newIdx) => {
        const original = entries[origIdx];
        if (!original) return null;
        return {
          ...original,
          timerOverride: timers[newIdx] && timers[newIdx] !== defaultTimer ? timers[newIdx] : original.timerOverride,
          tag: DIFF_TO_TAG[difficulties[newIdx]] || original.tag || 'normal'
        };
      }).filter(Boolean);
      setEntries(reordered);
      toast.success('Лента арены сбалансирована ⚖');
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Ошибка автобаланса');
    } finally {
      setBalancing(false);
    }
  };

  // ── "В банк" promote (edit mode only) ────────────────────────────────
  const handlePromoteToBank = async (entry) => {
    if (!arenaTestId) {
      toast.error('Сначала сохраните шаблон, потом перенесите вопрос в банк');
      return;
    }
    if (entry.kind !== 'embedded') return;
    const idx = entries.findIndex(e => e.id === entry.id);
    if (idx < 0) return;
    setPromotingId(entry.id);
    try {
      const res = await api.post(`/arena-tests/${arenaTestId}/promote-to-bank`, {
        entryIndex: idx
      });
      const newBank = res.data?.bankQuestion;
      if (!newBank) throw new Error('No bank question returned');
      patchEntry(entry.id, {
        kind: 'bank',
        bankId: newBank._id,
        q: newBank
      });
      toast.success('Вопрос добавлен в банк');
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Ошибка переноса в банк');
    } finally {
      setPromotingId(null);
    }
  };

  // ── Stats footer ─────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalPoints = entries.reduce((s, e) =>
      s + (e.pointsOverride ?? e.q?.points ?? 0), 0);
    const totalSec = entries.reduce((s, e) =>
      s + (e.timerOverride ?? defaultTimer), 0);
    const tags = entries.reduce((acc, e) => {
      const t = e.tag || 'normal';
      acc[t] = (acc[t] || 0) + 1;
      return acc;
    }, {});
    const embeddedCount = entries.filter(e => e.kind === 'embedded').length;
    return { count: entries.length, totalPoints, totalSec, tags, embeddedCount };
  }, [entries, defaultTimer]);

  // ──────────────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div
        className="flex flex-wrap items-center gap-2 rounded-2xl border-2 border-slate-900 bg-white p-2.5 dark:border-white dark:bg-slate-900"
        style={{ boxShadow: '0 4px 0 var(--shadow-chunky, #1f1a14)' }}
      >
        <ToolbarStat label="Вопросов" value={stats.count} />
        <span className="h-5 w-px bg-slate-200 dark:bg-slate-700" />
        <ToolbarStat label="Свои" value={stats.embeddedCount} />
        <span className="h-5 w-px bg-slate-200 dark:bg-slate-700" />
        <ToolbarStat label="~Время" value={`${Math.round(stats.totalSec / 60) || 0}м`} />
        <span className="ml-auto" />
        <button
          type="button"
          onClick={() => setShowBankPicker(v => !v)}
          className={`inline-flex items-center gap-1.5 rounded-lg border-2 px-2.5 py-1.5 text-[11px] font-black transition
            ${showBankPicker
              ? 'border-blue-600 bg-blue-500 text-white'
              : 'border-slate-300 bg-white text-slate-700 hover:border-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200'}`}
        >
          <Database size={13} strokeWidth={2.6} /> Из банка
        </button>
        {hasAIAccess && (
          <>
            <button
              type="button"
              onClick={() => setShowAIModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border-2 border-purple-500 bg-purple-50 px-2.5 py-1.5 text-[11px] font-black text-purple-800 transition hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-200"
            >
              <Sparkles size={13} strokeWidth={2.6} /> AI генерация
            </button>
            <button
              type="button"
              onClick={handleAIBalance}
              disabled={balancing || entries.length < 2}
              className="inline-flex items-center gap-1.5 rounded-lg border-2 border-amber-500 bg-amber-50 px-2.5 py-1.5 text-[11px] font-black text-amber-800 transition hover:bg-amber-100 disabled:opacity-50 dark:bg-amber-900/30 dark:text-amber-200"
            >
              {balancing ? <Loader2 size={13} className="animate-spin" /> : <ArrowDownUp size={13} strokeWidth={2.6} />}
              AI ⚖ автобаланс
            </button>
          </>
        )}
      </div>

      {/* Bank picker (collapsible) */}
      <AnimatePresence initial={false}>
        {showBankPicker && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <ArenaQuestionPicker
              defaultTimer={defaultTimer}
              initialSnapshot={pickerInitial}
              onChange={handlePickerChange}
              height={420}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Master sortable list */}
      {entries.length === 0 ? (
        <EmptyState
          onAddType={addEmbedded}
          onOpenBank={() => setShowBankPicker(true)}
          onAIGen={() => setShowAIModal(true)}
          hasAIAccess={hasAIAccess}
        />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
          <SortableContext items={entries.map(e => e.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {entries.map((entry, i) => (
                <SortableEntry
                  key={entry.id}
                  entry={entry}
                  index={i}
                  expanded={expandedId === entry.id}
                  onToggle={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                  onRemove={() => removeEntry(entry.id)}
                  onPatch={(patch) => patchEntry(entry.id, patch)}
                  onPatchQ={(qp) => patchEmbeddedQ(entry.id, qp)}
                  onPatchOption={(idx, op) => patchEmbeddedOption(entry.id, idx, op)}
                  onAddOption={() => addOptionRow(entry.id)}
                  onRemoveOption={(idx) => removeOptionRow(entry.id, idx)}
                  onRemix={() => handleAIRemix(entry)}
                  onTranslate={(codes) => handleAITranslate(entry, codes)}
                  onPromote={() => handlePromoteToBank(entry)}
                  isRemixing={remixingId === entry.id}
                  isTranslating={translatingId === entry.id}
                  isPromoting={promotingId === entry.id}
                  defaultTimer={defaultTimer}
                  hasAIAccess={hasAIAccess}
                  promoteEnabled={!!arenaTestId}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Add menu (sticky bottom) */}
      <div className="sticky bottom-2 z-20 mt-3">
        <div className="relative">
          <AnimatePresence>
            {showAddTypeMenu && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute bottom-full left-0 right-0 mb-2 rounded-2xl border-2 border-slate-900 bg-white p-3 dark:border-white dark:bg-slate-900"
                style={{ boxShadow: '0 5px 0 var(--shadow-chunky, #1f1a14)' }}
              >
                <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                  Создать новый вопрос
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {QUESTION_TYPES.map(t => {
                    const Icon = t.icon;
                    return (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => addEmbedded(t.value)}
                        className={`flex items-center gap-2 rounded-xl border-2 px-2.5 py-2 text-left text-[11px] font-black transition ${t.chip} hover:scale-105`}
                      >
                        <Icon size={14} strokeWidth={2.6} />
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="button"
            onClick={() => setShowAddTypeMenu(v => !v)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-slate-900 bg-emerald-500 px-3 py-3 text-sm font-black text-white transition hover:bg-emerald-600 dark:border-white"
            style={{ boxShadow: '0 5px 0 var(--shadow-chunky, #1f1a14)' }}
          >
            {showAddTypeMenu ? <X size={16} strokeWidth={2.8} /> : <Plus size={16} strokeWidth={2.8} />}
            {showAddTypeMenu ? 'Закрыть меню' : 'Добавить вопрос'}
          </button>
        </div>
      </div>

      {/* AI Generate Modal — adds embedded entries */}
      <AIGenerateModal
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
        currentLanguage={currentLanguage}
        onGenerated={(generated) => {
          const newEntries = (generated || []).map(q => ({
            id: `emb-${uuidv4()}`,
            kind: 'embedded',
            bankId: null,
            q: aiQuestionToEmbedded(q),
            tag: 'normal',
            timerOverride: null,
            pointsOverride: null,
          }));
          setEntries(prev => [...prev, ...newEntries]);
          toast.success(`Добавлено вопросов: ${newEntries.length}`);
        }}
      />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Empty state
// ──────────────────────────────────────────────────────────────────────────
function EmptyState({ onAddType, onOpenBank, onAIGen, hasAIAccess }) {
  return (
    <div
      className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900"
    >
      <Sparkles size={42} className="mx-auto mb-3 text-amber-300" />
      <h3 className="text-base font-black text-slate-700 dark:text-slate-200">
        Лента арены пуста
      </h3>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Создайте свой вопрос, перенесите из банка или сгенерируйте с AI.
      </p>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={() => onAddType('single-choice')}
          className="inline-flex items-center gap-1.5 rounded-lg border-2 border-slate-900 bg-emerald-500 px-3 py-1.5 text-xs font-black text-white dark:border-white"
        >
          <Plus size={13} strokeWidth={2.8} /> Свой вопрос
        </button>
        <button
          type="button"
          onClick={onOpenBank}
          className="inline-flex items-center gap-1.5 rounded-lg border-2 border-blue-500 bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-800 dark:bg-blue-900/30 dark:text-blue-200"
        >
          <Database size={13} strokeWidth={2.8} /> Из банка
        </button>
        {hasAIAccess && (
          <button
            type="button"
            onClick={onAIGen}
            className="inline-flex items-center gap-1.5 rounded-lg border-2 border-purple-500 bg-purple-50 px-3 py-1.5 text-xs font-black text-purple-800 dark:bg-purple-900/30 dark:text-purple-200"
          >
            <Sparkles size={13} strokeWidth={2.8} /> AI генерация
          </button>
        )}
      </div>
    </div>
  );
}

function ToolbarStat({ label, value }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-700 dark:text-slate-300">
      <span className="text-slate-400 dark:text-slate-500">{label}:</span>
      <span className="tabular-nums">{value}</span>
    </span>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// SortableEntry — wrapper that provides drag handle + collapsed/expanded views
// ──────────────────────────────────────────────────────────────────────────
function SortableEntry(props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.entry.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    <div ref={setNodeRef} style={style}>
      <EntryCard {...props} dragAttrs={attributes} dragListeners={listeners} />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// EntryCard — single entry (collapsed header + expanded editor)
// ──────────────────────────────────────────────────────────────────────────
function EntryCard({
  entry, index, expanded, onToggle, onRemove, onPatch, onPatchQ, onPatchOption,
  onAddOption, onRemoveOption, onRemix, onTranslate, onPromote,
  isRemixing, isTranslating, isPromoting, defaultTimer, hasAIAccess, promoteEnabled,
  dragAttrs, dragListeners
}) {
  const meta = TYPE_BY_VALUE[entry.q?.type] || TYPE_BY_VALUE['single-choice'];
  const TypeIcon = meta.icon;
  const tagMeta = QUESTION_TAGS.find(t => t.value === entry.tag) || QUESTION_TAGS[0];
  const TagIcon = tagMeta.icon;

  const isEmbedded = entry.kind === 'embedded';

  return (
    <div
      className={`rounded-2xl border-2 bg-white transition dark:bg-slate-900
        ${expanded ? 'border-primary-500 shadow-[0_4px_0_var(--shadow-chunky,#1f1a14)]' : 'border-slate-300 dark:border-slate-700'}`}
    >
      {/* Header (always visible) */}
      <div className="flex items-start gap-2 p-2.5">
        <button
          type="button"
          {...dragAttrs}
          {...dragListeners}
          className="cursor-grab self-stretch rounded-md px-0.5 text-slate-300 hover:bg-slate-100 hover:text-slate-700 active:cursor-grabbing dark:hover:bg-slate-800 dark:hover:text-slate-200"
          aria-label="Перетащить"
        >
          <GripVertical size={14} />
        </button>

        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-slate-900 bg-amber-300 text-[10px] font-black tabular-nums text-slate-900 dark:border-white">
          {index + 1}
        </span>

        <span className={`mt-0.5 inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] ${meta.chip}`}>
          <TypeIcon size={9} strokeWidth={3} /> {meta.label}
        </span>

        {/* Source pill */}
        <span className={`mt-0.5 inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9px] font-black
          ${isEmbedded
            ? 'border-amber-400 bg-amber-50 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
            : 'border-blue-400 bg-blue-50 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200'}`}>
          {isEmbedded ? '⚡ Свой' : '📚 Банк'}
        </span>

        {/* Tag pill */}
        {entry.tag !== 'normal' && (
          <span className={`mt-0.5 inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9px] font-black ${tagMeta.color}`}>
            {TagIcon && <TagIcon size={9} strokeWidth={3} />} {tagMeta.label}
          </span>
        )}

        <div className="min-w-0 flex-1 pl-1">
          <div
            className="line-clamp-1 text-[12px] font-bold text-slate-900 dark:text-slate-100"
            dangerouslySetInnerHTML={{ __html: entry.q?.questionText || '<em>Без текста</em>' }}
          />
        </div>

        <button
          type="button"
          onClick={onToggle}
          className="shrink-0 rounded-md border border-slate-300 bg-white p-1 text-slate-600 transition hover:border-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
          title={expanded ? 'Свернуть' : 'Развернуть'}
        >
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>

        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 rounded-md p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30"
          title="Удалить"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Expanded editor */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 border-t-2 border-dashed border-slate-200 px-3 pb-3 pt-3 dark:border-slate-700">
              {/* Tag selector + per-question overrides */}
              <TagAndOverrides
                entry={entry}
                onPatch={onPatch}
                defaultTimer={defaultTimer}
              />

              {/* Embedded → full editor; Bank → read-only display */}
              {isEmbedded ? (
                <EmbeddedEditor
                  entry={entry}
                  onPatchQ={onPatchQ}
                  onPatchOption={onPatchOption}
                  onAddOption={onAddOption}
                  onRemoveOption={onRemoveOption}
                  onRemix={onRemix}
                  onTranslate={onTranslate}
                  onPromote={onPromote}
                  isRemixing={isRemixing}
                  isTranslating={isTranslating}
                  isPromoting={isPromoting}
                  hasAIAccess={hasAIAccess}
                  promoteEnabled={promoteEnabled}
                />
              ) : (
                <BankReadOnly entry={entry} />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Tag selector + timer/points overrides (works for BOTH bank + embedded)
// ──────────────────────────────────────────────────────────────────────────
function TagAndOverrides({ entry, onPatch, defaultTimer }) {
  return (
    <div className="space-y-2">
      <div>
        <p className="mb-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
          Эффект на вопросе
        </p>
        <div className="flex flex-wrap gap-1.5">
          {QUESTION_TAGS.map(t => {
            const Icon = t.icon;
            const active = entry.tag === t.value;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => onPatch({ tag: t.value })}
                title={t.desc}
                className={`inline-flex items-center gap-1 rounded-md border-2 px-2 py-1 text-[10px] font-black transition
                  ${active
                    ? `${t.color} ring-2 ring-offset-1 dark:ring-offset-slate-900`
                    : 'border-slate-300 bg-white text-slate-600 hover:border-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}
              >
                {Icon && <Icon size={10} strokeWidth={2.8} />} {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="mb-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            Таймер (сек) {entry.timerOverride === null && <span className="font-normal normal-case text-slate-400">— используется {defaultTimer}с</span>}
          </p>
          <input
            type="number"
            min={5}
            max={300}
            placeholder={`${defaultTimer}`}
            value={entry.timerOverride ?? ''}
            onChange={e => {
              const v = parseInt(e.target.value, 10);
              onPatch({ timerOverride: Number.isFinite(v) ? Math.max(5, Math.min(300, v)) : null });
            }}
            className="w-full rounded-md border-2 border-slate-300 bg-white px-2 py-1 text-xs font-black tabular-nums text-slate-900 focus:border-primary-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />
        </div>
        <div>
          <p className="mb-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            Очки {entry.pointsOverride === null && <span className="font-normal normal-case text-slate-400">— по умолч. {entry.q?.points || 1}</span>}
          </p>
          <input
            type="number"
            min={0}
            max={1000}
            placeholder={`${entry.q?.points || 1}`}
            value={entry.pointsOverride ?? ''}
            onChange={e => {
              const v = parseInt(e.target.value, 10);
              onPatch({ pointsOverride: Number.isFinite(v) ? Math.max(0, Math.min(1000, v)) : null });
            }}
            className="w-full rounded-md border-2 border-slate-300 bg-white px-2 py-1 text-xs font-black tabular-nums text-slate-900 focus:border-primary-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// BankReadOnly — display only. Cannot edit bank questions inside ArenaTest.
// ──────────────────────────────────────────────────────────────────────────
function BankReadOnly({ entry }) {
  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
      <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-blue-700 dark:text-blue-300">
        Из банка вопросов · только чтение
      </p>
      <div
        className="prose prose-sm max-w-none text-sm font-bold text-slate-900 dark:prose-invert dark:text-slate-100"
        dangerouslySetInnerHTML={{ __html: entry.q?.questionText || '' }}
      />
      {(entry.q?.options || []).length > 0 && (
        <ul className="mt-2 space-y-1">
          {entry.q.options.map((opt, i) => (
            <li
              key={opt.id || i}
              className={`flex items-start gap-2 rounded-md px-2 py-1 text-xs ${opt.isCorrect ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200' : 'text-slate-600 dark:text-slate-300'}`}
            >
              {opt.isCorrect && <Check size={11} className="mt-0.5 shrink-0" />}
              <span className="flex-1">{plainPreview(opt.text, 200)}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-[10px] italic text-slate-500 dark:text-slate-400">
        Чтобы отредактировать — откройте Банк вопросов.
      </p>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// EmbeddedEditor — full inline editor (everything CreateTest can do)
// ──────────────────────────────────────────────────────────────────────────
function EmbeddedEditor({
  entry, onPatchQ, onPatchOption, onAddOption, onRemoveOption,
  onRemix, onTranslate, onPromote, isRemixing, isTranslating, isPromoting,
  hasAIAccess, promoteEnabled
}) {
  const [showTranslations, setShowTranslations] = useState(false);
  const [activeLang, setActiveLang] = useState('ru');
  const q = entry.q;
  const isChoice = q.type === 'single-choice' || q.type === 'multiple-choice';
  const isTrueFalse = q.type === 'true-false';
  const isMatching = q.type === 'matching';
  const isFillBlank = q.type === 'fill-blank';
  const isEssay = q.type === 'essay';

  return (
    <div className="space-y-3">
      {/* AI + Tools row */}
      <div className="flex flex-wrap gap-1.5">
        {hasAIAccess && (
          <button
            type="button"
            onClick={onRemix}
            disabled={isRemixing}
            className="inline-flex items-center gap-1 rounded-md border-2 border-purple-500 bg-purple-50 px-2 py-1 text-[10px] font-black text-purple-800 transition hover:bg-purple-100 disabled:opacity-50 dark:bg-purple-900/30 dark:text-purple-200"
            title="AI ремикс — переписать в 'арена-стиле'"
          >
            {isRemixing ? <Loader2 size={11} className="animate-spin" /> : <Wand2 size={11} strokeWidth={2.8} />}
            ✨ AI ремикс
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowTranslations(v => !v)}
          className={`inline-flex items-center gap-1 rounded-md border-2 px-2 py-1 text-[10px] font-black transition
            ${showTranslations
              ? 'border-cyan-600 bg-cyan-500 text-white'
              : 'border-slate-300 bg-white text-slate-700 hover:border-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200'}`}
        >
          <Languages size={11} strokeWidth={2.8} /> Переводы
        </button>
        {promoteEnabled && (
          <button
            type="button"
            onClick={onPromote}
            disabled={isPromoting}
            className="inline-flex items-center gap-1 rounded-md border-2 border-blue-500 bg-blue-50 px-2 py-1 text-[10px] font-black text-blue-800 transition hover:bg-blue-100 disabled:opacity-50 dark:bg-blue-900/30 dark:text-blue-200"
            title="Перенести в банк вопросов для повторного использования"
          >
            {isPromoting ? <Loader2 size={11} className="animate-spin" /> : <Database size={11} strokeWidth={2.8} />}
            В банк
          </button>
        )}
      </div>

      {/* Question text */}
      <div>
        <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
          Текст вопроса <span className="text-red-500">*</span>
        </label>
        <Suspense fallback={<div className="h-24 rounded-xl border border-dashed border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800" />}>
          <RichTextEditor
            content={q.questionText}
            onChange={(value) => onPatchQ({ questionText: value })}
            placeholder="Что спросить у игроков?"
          />
        </Suspense>
      </div>

      {/* Options based on type */}
      {(isChoice || isTrueFalse) && (
        <div>
          <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            {isChoice ? 'Варианты ответа · отметьте правильные' : 'Какой ответ верный?'}
          </label>
          <div className="space-y-1.5">
            {(q.options || []).map((opt, i) => (
              <div key={opt.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onPatchOption(i, { isCorrect: !opt.isCorrect })}
                  className={`flex h-6 w-6 shrink-0 items-center justify-center border-2 transition
                    ${q.type === 'single-choice' || isTrueFalse ? 'rounded-full' : 'rounded-md'}
                    ${opt.isCorrect
                      ? 'border-emerald-600 bg-emerald-500 text-white'
                      : 'border-slate-300 hover:border-emerald-400 dark:border-slate-600'}`}
                  title={opt.isCorrect ? 'Верный' : 'Сделать верным'}
                >
                  {opt.isCorrect && <Check size={11} strokeWidth={3} />}
                </button>
                <input
                  type="text"
                  value={opt.text}
                  disabled={isTrueFalse}
                  onChange={e => onPatchOption(i, { text: e.target.value })}
                  placeholder={`Вариант ${i + 1}`}
                  className="flex-1 rounded-md border-2 border-slate-300 bg-white px-2 py-1 text-xs font-bold text-slate-900 focus:border-primary-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
                {!isTrueFalse && (q.options || []).length > 2 && (
                  <button
                    type="button"
                    onClick={() => onRemoveOption(i)}
                    className="shrink-0 rounded-md p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            ))}
            {!isTrueFalse && (q.options || []).length < 8 && (
              <button
                type="button"
                onClick={onAddOption}
                className="flex items-center gap-1 text-[10px] font-black text-primary-600 transition hover:text-primary-700"
              >
                <Plus size={10} strokeWidth={2.8} /> Добавить вариант
              </button>
            )}
          </div>
        </div>
      )}

      {isMatching && (
        <div>
          <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            Сопоставление · левая ↔ правая часть
          </label>
          <div className="space-y-1.5">
            {(q.options || []).map((opt, i) => (
              <div key={opt.id} className="grid grid-cols-2 items-center gap-2">
                <input
                  type="text"
                  value={opt.text}
                  onChange={e => onPatchOption(i, { text: e.target.value })}
                  placeholder={`Элемент ${i + 1}`}
                  className="rounded-md border-2 border-slate-300 bg-white px-2 py-1 text-xs font-bold text-slate-900 focus:border-primary-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={opt.matchPair}
                    onChange={e => onPatchOption(i, { matchPair: e.target.value })}
                    placeholder={`Пара ${i + 1}`}
                    className="flex-1 rounded-md border-2 border-slate-300 bg-white px-2 py-1 text-xs font-bold text-slate-900 focus:border-primary-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  />
                  {(q.options || []).length > 2 && (
                    <button
                      type="button"
                      onClick={() => onRemoveOption(i)}
                      className="shrink-0 rounded-md p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {(q.options || []).length < 8 && (
              <button
                type="button"
                onClick={onAddOption}
                className="flex items-center gap-1 text-[10px] font-black text-primary-600 transition hover:text-primary-700"
              >
                <Plus size={10} strokeWidth={2.8} /> Добавить пару
              </button>
            )}
          </div>
        </div>
      )}

      {isFillBlank && (
        <div>
          <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            Правильный ответ
          </label>
          <input
            type="text"
            value={q.correctAnswer || ''}
            onChange={e => onPatchQ({ correctAnswer: e.target.value })}
            placeholder="Точный ответ"
            className="w-full rounded-md border-2 border-slate-300 bg-white px-2 py-1.5 text-xs font-bold text-slate-900 focus:border-primary-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />
        </div>
      )}

      {isEssay && (
        <div className="rounded-md border-2 border-amber-300 bg-amber-50 p-2 text-[11px] text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
          ⚠ Эссе автоматически считается «неверным» в арене (живой формат не поддерживает оценку текста). Используйте для опросов или дискуссий.
        </div>
      )}

      {/* Explanation + Points */}
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-2">
          <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            Объяснение (показывается на reveal)
          </label>
          <input
            type="text"
            value={q.explanation || ''}
            onChange={e => onPatchQ({ explanation: e.target.value })}
            placeholder="Короткая подсказка после ответа"
            className="w-full rounded-md border-2 border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 focus:border-primary-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            Очки
          </label>
          <input
            type="number"
            min={1}
            max={1000}
            value={q.points || 1}
            onChange={e => onPatchQ({ points: Math.max(1, Math.min(1000, parseInt(e.target.value, 10) || 1)) })}
            className="w-full rounded-md border-2 border-slate-300 bg-white px-2 py-1.5 text-xs font-black tabular-nums text-slate-900 focus:border-primary-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />
        </div>
      </div>

      {/* Translations panel */}
      <AnimatePresence initial={false}>
        {showTranslations && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <TranslationsPanel
              entry={entry}
              activeLang={activeLang}
              onActiveLang={setActiveLang}
              onPatchQ={onPatchQ}
              onTranslate={onTranslate}
              isTranslating={isTranslating}
              hasAIAccess={hasAIAccess}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// TranslationsPanel — multi-language editing per question (4 langs).
// ──────────────────────────────────────────────────────────────────────────
function TranslationsPanel({ entry, activeLang, onActiveLang, onPatchQ, onTranslate, isTranslating, hasAIAccess }) {
  const q = entry.q;
  const translations = q.translations || {};
  const isChoice = q.type === 'single-choice' || q.type === 'multiple-choice' || q.type === 'true-false';
  const isMatching = q.type === 'matching';
  const isFillBlank = q.type === 'fill-blank';

  const trans = translations[activeLang] || {};

  const updateTrans = (key, value) => {
    const next = {
      ...translations,
      [activeLang]: { ...trans, [key]: value }
    };
    onPatchQ({ translations: next });
  };

  const updateTransOption = (idx, value) => {
    const optsArr = [...(trans.options || [])];
    optsArr[idx] = value;
    updateTrans('options', optsArr);
  };

  const updateTransPair = (idx, value) => {
    const arr = [...(trans.matchPairs || [])];
    arr[idx] = value;
    updateTrans('matchPairs', arr);
  };

  const presentLangs = LANGS.filter(l => translations[l.code]);
  const missingLangs = LANGS.filter(l => !translations[l.code]);

  return (
    <div className="rounded-xl border-2 border-cyan-300 bg-cyan-50/50 p-2.5 dark:border-cyan-800 dark:bg-cyan-900/10">
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-800 dark:text-cyan-200">
          Переводы
        </span>
        {presentLangs.length > 0 && (
          <span className="text-[10px] text-slate-500">
            ({presentLangs.length}/{LANGS.length})
          </span>
        )}
        {hasAIAccess && missingLangs.length > 0 && (
          <button
            type="button"
            onClick={() => onTranslate(missingLangs.map(l => l.code))}
            disabled={isTranslating}
            className="ml-auto inline-flex items-center gap-1 rounded-md border-2 border-purple-500 bg-purple-50 px-1.5 py-0.5 text-[10px] font-black text-purple-800 transition hover:bg-purple-100 disabled:opacity-50 dark:bg-purple-900/30 dark:text-purple-200"
          >
            {isTranslating ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} strokeWidth={2.8} />}
            AI ✨ заполнить недостающие
          </button>
        )}
      </div>

      {/* Lang tabs */}
      <div className="mb-2 flex flex-wrap gap-1">
        {LANGS.map(l => {
          const has = !!translations[l.code];
          const active = activeLang === l.code;
          return (
            <button
              key={l.code}
              type="button"
              onClick={() => onActiveLang(l.code)}
              className={`inline-flex items-center gap-1 rounded-md border-2 px-2 py-1 text-[10px] font-black transition
                ${active
                  ? 'border-cyan-600 bg-cyan-500 text-white'
                  : has
                    ? 'border-emerald-300 bg-white text-emerald-700 dark:bg-slate-800 dark:text-emerald-300 dark:border-emerald-700'
                    : 'border-slate-300 bg-white text-slate-500 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-600'}`}
            >
              {l.label} {has ? '✓' : '∅'}
            </button>
          );
        })}
      </div>

      {/* Active lang fields */}
      <div className="space-y-2">
        <input
          type="text"
          value={trans.questionText || ''}
          onChange={e => updateTrans('questionText', e.target.value)}
          placeholder={`Перевод вопроса (${activeLang.toUpperCase()})`}
          className="w-full rounded-md border-2 border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 focus:border-primary-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        />
        {isChoice && (q.options || []).map((opt, i) => (
          <input
            key={opt.id}
            type="text"
            value={(trans.options || [])[i] || ''}
            onChange={e => updateTransOption(i, e.target.value)}
            placeholder={`Вариант ${i + 1}: ${plainPreview(opt.text, 30)}`}
            className="w-full rounded-md border-2 border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-900 focus:border-primary-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        ))}
        {isMatching && (q.options || []).map((opt, i) => (
          <div key={opt.id} className="grid grid-cols-2 gap-1">
            <input
              type="text"
              value={(trans.options || [])[i] || ''}
              onChange={e => updateTransOption(i, e.target.value)}
              placeholder={`Эл. ${i + 1}: ${plainPreview(opt.text, 20)}`}
              className="rounded-md border-2 border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-900 focus:border-primary-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            <input
              type="text"
              value={(trans.matchPairs || [])[i] || ''}
              onChange={e => updateTransPair(i, e.target.value)}
              placeholder={`Пара ${i + 1}: ${plainPreview(opt.matchPair, 20)}`}
              className="rounded-md border-2 border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-900 focus:border-primary-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
        ))}
        {isFillBlank && (
          <input
            type="text"
            value={trans.correctAnswer || ''}
            onChange={e => updateTrans('correctAnswer', e.target.value)}
            placeholder={`Правильный ответ (${activeLang.toUpperCase()})`}
            className="w-full rounded-md border-2 border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-900 focus:border-primary-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        )}
        <input
          type="text"
          value={trans.explanation || ''}
          onChange={e => updateTrans('explanation', e.target.value)}
          placeholder="Объяснение (для reveal-фазы)"
          className="w-full rounded-md border-2 border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-900 focus:border-primary-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
        {hasAIAccess && (
          <button
            type="button"
            onClick={() => onTranslate([activeLang])}
            disabled={isTranslating}
            className="inline-flex items-center gap-1 rounded-md border-2 border-purple-400 bg-purple-50 px-2 py-1 text-[10px] font-black text-purple-700 transition hover:bg-purple-100 disabled:opacity-50 dark:bg-purple-900/30 dark:text-purple-200"
          >
            {isTranslating ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} strokeWidth={2.8} />}
            AI ✨ заполнить только {activeLang.toUpperCase()}
          </button>
        )}
      </div>
    </div>
  );
}
