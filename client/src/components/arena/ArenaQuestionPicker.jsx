import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext, useDraggable, useDroppable, PointerSensor, KeyboardSensor,
  useSensor, useSensors, closestCorners, DragOverlay
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, arrayMove,
  sortableKeyboardCoordinates, verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Search, X, GripVertical, Plus, Trash2, Tag, Hash, Database, ListChecks,
  Check, ToggleLeft, FileText, Link2, Type, Clock, Trophy, Filter, Inbox, RotateCcw,
  Sparkles, Edit3
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import InlineQuestionEditor from './InlineQuestionEditor';

// Type metadata mirrors the QuestionBank palette so users see consistent colors.
const TYPE_META = {
  'single-choice':   { label: 'Один ответ',          icon: Check,       chip: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-700' },
  'multiple-choice': { label: 'Несколько ответов', icon: ListChecks,  chip: 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/40 dark:text-purple-200 dark:border-purple-700' },
  'true-false':      { label: 'Верно/Неверно',     icon: ToggleLeft,  chip: 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-700' },
  'essay':           { label: 'Эссе',                icon: FileText,    chip: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-700' },
  'matching':        { label: 'Сопоставление',     icon: Link2,       chip: 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-900/40 dark:text-rose-200 dark:border-rose-700' },
  'fill-blank':      { label: 'Заполнить пропуск',  icon: Type,        chip: 'bg-teal-100 text-teal-700 border-teal-300 dark:bg-teal-900/40 dark:text-teal-200 dark:border-teal-700' },
};

const BANK_DRAG_PREFIX = 'bank-';
const SNAP_DRAG_PREFIX = 'snap-';
const DROP_ZONE_ID = 'arena-snapshot-dropzone';

// Generate a stable client-side id for snapshot rows so reorder works without server roundtrip.
let __pickerCounter = 0;
const newSnapId = () => `${SNAP_DRAG_PREFIX}${Date.now().toString(36)}-${(++__pickerCounter).toString(36)}`;

function TypeBadge({ type }) {
  const meta = TYPE_META[type] || TYPE_META['single-choice'];
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] ${meta.chip}`}>
      <Icon size={9} strokeWidth={3} /> {meta.label}
    </span>
  );
}

// Bank row — draggable source, with explicit "+" button so users without drag affordance can still add.
function BankCard({ q, onAdd }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${BANK_DRAG_PREFIX}${q._id}`,
    data: { source: 'bank', question: q }
  });
  return (
    <div
      ref={setNodeRef}
      className={`group flex items-start gap-2 rounded-2xl border-2 bg-white p-2.5 transition dark:bg-slate-900
        ${isDragging
          ? 'border-primary-400 ring-2 ring-primary-300 opacity-40'
          : 'border-slate-200 hover:border-slate-400 dark:border-slate-700 dark:hover:border-slate-500'}`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab self-stretch rounded-md px-0.5 text-slate-300 hover:bg-slate-100 hover:text-slate-600 active:cursor-grabbing dark:hover:bg-slate-800 dark:hover:text-slate-300"
        aria-label="Перетащить в арену"
        title="Перетащите в правую панель или нажмите +"
      >
        <GripVertical size={14} />
      </button>

      <div className="min-w-0 flex-1">
        <div
          className="prose prose-sm max-w-none text-[13px] font-bold leading-snug text-slate-900 dark:prose-invert dark:text-slate-100 line-clamp-2 [&_*]:!my-0 [&_p]:!my-0"
          dangerouslySetInnerHTML={{ __html: q.questionText || '<em>Без текста</em>' }}
        />
        <div className="mt-1 flex flex-wrap items-center gap-1">
          <TypeBadge type={q.type} />
          <span className="rounded-full border border-slate-300 bg-slate-50 px-1.5 py-0 text-[9px] font-black tabular-nums text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">{q.points} б</span>
          {q.category && (
            <span className="inline-flex items-center gap-0.5 rounded-full border border-blue-300 bg-blue-50 px-1.5 py-0 text-[9px] font-black text-blue-700 dark:border-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
              <Hash size={8} /> {q.category}
            </span>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => onAdd(q)}
        className="shrink-0 rounded-lg border-2 border-slate-900 bg-amber-300 p-1 text-slate-900 transition hover:bg-amber-400 dark:border-white"
        title="Добавить в арену"
        style={{ boxShadow: '0 2px 0 var(--shadow-chunky, #1f1a14)' }}
      >
        <Plus size={13} strokeWidth={3} />
      </button>
    </div>
  );
}

// Snapshot row — sortable + per-question override fields (timer, points).
function SnapshotCard({ entry, index, defaultTimer, onRemove, onChange, onEdit }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: entry.id });
  const meta = TYPE_META[entry.q.type] || TYPE_META['single-choice'];
  const Icon = meta.icon;
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  const effectiveTimer = entry.timerOverride ?? defaultTimer;
  const effectivePoints = entry.pointsOverride ?? entry.q.points;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group rounded-2xl border-2 border-slate-900 bg-white p-2.5 dark:border-white dark:bg-slate-900"
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab self-stretch rounded-md px-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 active:cursor-grabbing dark:hover:bg-slate-800 dark:hover:text-slate-200"
          aria-label="Изменить порядок"
        >
          <GripVertical size={14} />
        </button>

        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-slate-900 bg-amber-300 text-[10px] font-black tabular-nums text-slate-900 dark:border-white">
          {index + 1}
        </span>

        <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border ${meta.chip}`}>
          <Icon size={12} strokeWidth={2.6} />
        </div>

        <div className="min-w-0 flex-1">
          <div
            className="prose prose-sm max-w-none text-[12px] font-bold leading-snug text-slate-900 dark:prose-invert dark:text-slate-100 line-clamp-2 [&_*]:!my-0 [&_p]:!my-0"
            dangerouslySetInnerHTML={{ __html: entry.q.questionText || '<em>Без текста</em>' }}
          />
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(entry.q)}
              className="rounded-lg p-1 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/30"
              title="Редактировать в банке"
            >
              <Edit3 size={13} />
            </button>
          )}
          <button
            type="button"
            onClick={() => onRemove(entry.id)}
            className="rounded-lg p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30"
            title="Удалить из арены"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Per-question override row */}
      <div className="mt-2 flex flex-wrap items-center gap-2 pl-8">
        <label className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
          <Clock size={10} strokeWidth={2.6} /> Таймер:
          <input
            type="number"
            min={5}
            max={300}
            step={5}
            value={effectiveTimer}
            onChange={e => {
              const v = parseInt(e.target.value);
              onChange(entry.id, {
                timerOverride: Number.isFinite(v) && v !== defaultTimer ? v : null
              });
            }}
            className="w-14 rounded-md border-2 border-slate-300 bg-white px-1 py-0 text-center text-[11px] font-black tabular-nums text-slate-900 focus:border-primary-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />
          <span className="text-[9px] text-slate-400">сек</span>
        </label>

        <label className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
          <Trophy size={10} strokeWidth={2.6} /> Очки:
          <input
            type="number"
            min={0}
            max={1000}
            value={effectivePoints}
            onChange={e => {
              const v = parseInt(e.target.value);
              onChange(entry.id, {
                pointsOverride: Number.isFinite(v) && v !== entry.q.points ? v : null
              });
            }}
            className="w-14 rounded-md border-2 border-slate-300 bg-white px-1 py-0 text-center text-[11px] font-black tabular-nums text-slate-900 focus:border-primary-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />
        </label>

        <TypeBadge type={entry.q.type} />

        {/* Arena spice indicators — visible at a glance so the host knows what's special */}
        {entry.q.blockPowerUps && (
          <span className="inline-flex items-center gap-0.5 rounded-full border border-red-300 bg-red-50 px-1.5 py-0 text-[9px] font-black text-red-700 dark:border-red-700 dark:bg-red-900/40 dark:text-red-200" title="Босс-вопрос: без бустеров">
            ☠ Босс
          </span>
        )}
        {entry.q.trapOptionId && (
          <span className="inline-flex items-center gap-0.5 rounded-full border border-rose-300 bg-rose-50 px-1.5 py-0 text-[9px] font-black text-rose-700 dark:border-rose-700 dark:bg-rose-900/40 dark:text-rose-200" title="Содержит вариант-ловушку">
            ⦿ Ловушка
          </span>
        )}
        {entry.q.revealHint && (
          <span className="inline-flex items-center gap-0.5 rounded-full border border-cyan-300 bg-cyan-50 px-1.5 py-0 text-[9px] font-black text-cyan-700 dark:border-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-200" title={`Подсказка: ${entry.q.revealHint}`}>
            ¡ Подсказка
          </span>
        )}
        {entry.q.speedProfile && entry.q.speedProfile !== 'normal' && (
          <span className={`inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0 text-[9px] font-black uppercase ${
            entry.q.speedProfile === 'blitz'
              ? 'border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-900/40 dark:text-red-200'
              : 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200'
          }`} title="Профиль темпа">
            {entry.q.speedProfile === 'blitz' ? '⚡ Блиц' : '🏆 Марафон'}
          </span>
        )}
      </div>
    </div>
  );
}

// Drop-zone wrapper for the snapshot column. Adds visual ring while dragging.
function SnapshotDropZone({ children, isEmpty, isOver }) {
  const { setNodeRef } = useDroppable({ id: DROP_ZONE_ID });
  return (
    <div
      ref={setNodeRef}
      className={`flex-1 overflow-y-auto rounded-2xl border-2 border-dashed transition
        ${isOver
          ? 'border-primary-500 bg-primary-50/70 dark:bg-primary-900/20'
          : 'border-slate-300 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-900/40'}`}
    >
      {isEmpty ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Inbox size={36} className="mb-2 text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-black text-slate-500 dark:text-slate-400">Пусто</p>
          <p className="mt-1 max-w-[220px] px-4 text-xs text-slate-400 dark:text-slate-500">
            Перетащите сюда вопросы из банка слева, или нажмите +
          </p>
        </div>
      ) : (
        <div className="space-y-2 p-2">{children}</div>
      )}
    </div>
  );
}

// Public reusable picker. Parent passes `defaultTimer` (sec) + reads selection via `onChange(snapshot)`.
// `snapshot` is an array of { id, bankId, q (full object), timerOverride, pointsOverride }.
export default function ArenaQuestionPicker({
  defaultTimer = 30,
  initialSnapshot = [],
  onChange,
  height = 520,
}) {
  const [bankItems, setBankItems] = useState([]);
  const [bankLoading, setBankLoading] = useState(true);
  const [bankSearch, setBankSearch] = useState('');
  const [bankSearchInput, setBankSearchInput] = useState('');
  const [bankType, setBankType] = useState('');
  const [bankPage, setBankPage] = useState(1);
  const [bankHasMore, setBankHasMore] = useState(false);
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [activeDrag, setActiveDrag] = useState(null); // for DragOverlay
  const [isOverDrop, setIsOverDrop] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorInitial, setEditorInitial] = useState(null); // when editing existing bank question

  const searchDebounceRef = useRef(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Notify parent on every snapshot change (debounced via microtask is fine for this scale).
  useEffect(() => {
    if (typeof onChange === 'function') onChange(snapshot);
  }, [snapshot, onChange]);

  // Fetch bank items.
  useEffect(() => {
    let cancelled = false;
    const fetchBank = async () => {
      setBankLoading(true);
      try {
        const params = new URLSearchParams({ page: bankPage, limit: 20 });
        if (bankSearch) params.append('search', bankSearch);
        if (bankType) params.append('type', bankType);
        const res = await api.get(`/question-bank?${params}`);
        if (cancelled) return;
        const items = res.data.questions || [];
        setBankItems(prev => bankPage === 1 ? items : [...prev, ...items]);
        setBankHasMore(items.length === 20 && bankPage < (res.data.totalPages || 1));
      } catch {
        if (!cancelled) toast.error('Не удалось загрузить банк');
      } finally {
        if (!cancelled) setBankLoading(false);
      }
    };
    fetchBank();
    return () => { cancelled = true; };
  }, [bankPage, bankSearch, bankType]);

  // Debounced search input.
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setBankPage(1);
      setBankSearch(bankSearchInput.trim());
    }, 300);
    return () => searchDebounceRef.current && clearTimeout(searchDebounceRef.current);
  }, [bankSearchInput]);

  const addToSnapshot = (q) => {
    setSnapshot(prev => [...prev, {
      id: newSnapId(),
      bankId: q._id,
      q,
      timerOverride: null,
      pointsOverride: null,
    }]);
  };

  const removeFromSnapshot = (id) => {
    setSnapshot(prev => prev.filter(s => s.id !== id));
  };

  const updateSnapshotEntry = (id, patch) => {
    setSnapshot(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
  };

  const clearSnapshot = () => setSnapshot([]);

  const handleDragStart = (event) => {
    const data = event.active?.data?.current;
    if (data?.source === 'bank') {
      setActiveDrag({ kind: 'bank', q: data.question });
    } else {
      const entry = snapshot.find(s => s.id === event.active.id);
      if (entry) setActiveDrag({ kind: 'snapshot', q: entry.q });
    }
  };

  const handleDragOver = (event) => {
    setIsOverDrop(event.over?.id === DROP_ZONE_ID || snapshot.some(s => s.id === event.over?.id));
  };

  const handleDragEnd = (event) => {
    setActiveDrag(null);
    setIsOverDrop(false);
    const { active, over } = event;
    if (!over) return;

    const fromBank = active.data.current?.source === 'bank';
    const overInSnapshot = over.id === DROP_ZONE_ID || snapshot.some(s => s.id === over.id);

    if (fromBank && overInSnapshot) {
      addToSnapshot(active.data.current.question);
      return;
    }

    if (!fromBank && active.id !== over.id) {
      const oldIdx = snapshot.findIndex(s => s.id === active.id);
      const newIdx = snapshot.findIndex(s => s.id === over.id);
      if (oldIdx !== -1 && newIdx !== -1) {
        setSnapshot(prev => arrayMove(prev, oldIdx, newIdx));
      }
    }
  };

  const handleDragCancel = () => { setActiveDrag(null); setIsOverDrop(false); };

  // Snapshot summary stats for the footer.
  const stats = useMemo(() => {
    const totalPoints = snapshot.reduce((sum, s) => sum + (s.pointsOverride ?? s.q.points ?? 0), 0);
    const totalSec = snapshot.reduce((sum, s) => sum + (s.timerOverride ?? defaultTimer), 0);
    const types = snapshot.reduce((acc, s) => { acc[s.q.type] = (acc[s.q.type] || 0) + 1; return acc; }, {});
    return { count: snapshot.length, totalPoints, totalSec, types };
  }, [snapshot, defaultTimer]);

  const formatDuration = (sec) => {
    if (sec < 60) return `${sec}с`;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return s ? `${m}м ${s}с` : `${m}м`;
  };

  const inSnapshotIds = useMemo(() => new Set(snapshot.map(s => s.bankId)), [snapshot]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="grid gap-3 md:grid-cols-2" style={{ minHeight: height }}>
        {/* LEFT — bank source */}
        <section
          className="flex min-h-0 flex-col rounded-[1.5rem] border-2 border-slate-900 bg-white p-3 dark:border-white dark:bg-slate-900"
          style={{ boxShadow: '0 4px 0 var(--shadow-chunky, #1f1a14)' }}
        >
          <header className="mb-2 flex items-center gap-2">
            <Database size={15} className="text-primary-600" strokeWidth={2.6} />
            <h3 className="text-sm font-black text-slate-900 dark:text-white">Банк вопросов</h3>
            <span className="rounded-full bg-slate-100 px-1.5 py-0 text-[10px] font-black tabular-nums text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {bankItems.length}{bankHasMore ? '+' : ''}
            </span>
            <button
              type="button"
              onClick={() => { setEditorInitial(null); setEditorOpen(true); }}
              className="ml-auto inline-flex items-center gap-1 rounded-lg border-2 border-slate-900 bg-amber-300 px-2 py-1 text-[11px] font-black text-slate-900 transition hover:bg-amber-400 active:translate-y-[1px] dark:border-white"
              title="Создать новый вопрос (попадёт в банк)"
              style={{ boxShadow: '0 2px 0 var(--shadow-chunky, #1f1a14)' }}
            >
              <Sparkles size={11} strokeWidth={3} /> Создать
            </button>
          </header>

          <div className="mb-2 flex gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" strokeWidth={2.4} />
              <input
                type="text"
                value={bankSearchInput}
                onChange={e => setBankSearchInput(e.target.value)}
                placeholder="Поиск в банке…"
                className="w-full rounded-lg border-2 border-slate-300 bg-white py-1.5 pl-7 pr-2 text-xs font-bold text-slate-900 focus:border-primary-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <select
              value={bankType}
              onChange={e => { setBankType(e.target.value); setBankPage(1); }}
              className="rounded-lg border-2 border-slate-300 bg-white px-2 py-1.5 text-xs font-black text-slate-700 focus:border-primary-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="">Все типы</option>
              {Object.entries(TYPE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>

          <div className="-mx-1 flex-1 overflow-y-auto px-1">
            {bankLoading && bankItems.length === 0 ? (
              <div className="space-y-2 py-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-14 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
                ))}
              </div>
            ) : bankItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Database size={36} className="mb-2 text-slate-300 dark:text-slate-600" />
                <p className="text-sm font-black text-slate-500 dark:text-slate-400">Банк пуст</p>
                <p className="mt-1 max-w-[220px] px-4 text-xs text-slate-400 dark:text-slate-500">
                  Создайте вопросы в Банке и они появятся здесь.
                </p>
              </div>
            ) : (
              <div className="space-y-2 py-1">
                {bankItems.map(q => (
                  <div key={q._id} className={inSnapshotIds.has(q._id) ? 'opacity-50' : ''}>
                    <BankCard q={q} onAdd={addToSnapshot} />
                  </div>
                ))}
                {bankHasMore && (
                  <button
                    type="button"
                    onClick={() => setBankPage(p => p + 1)}
                    disabled={bankLoading}
                    className="w-full rounded-xl border-2 border-dashed border-slate-300 bg-white py-2 text-xs font-black text-slate-500 transition hover:border-slate-500 hover:text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-slate-500"
                  >
                    {bankLoading ? 'Загрузка…' : 'Показать ещё'}
                  </button>
                )}
              </div>
            )}
          </div>
        </section>

        {/* RIGHT — snapshot drop target */}
        <section
          className="flex min-h-0 flex-col rounded-[1.5rem] border-2 border-slate-900 bg-amber-50/40 p-3 dark:border-white dark:bg-slate-900"
          style={{ boxShadow: '0 4px 0 var(--shadow-chunky, #1f1a14)' }}
        >
          <header className="mb-2 flex items-center gap-2">
            <Filter size={15} className="text-amber-700 dark:text-amber-300" strokeWidth={2.6} />
            <h3 className="text-sm font-black text-slate-900 dark:text-white">В арене</h3>
            <span className="rounded-full bg-amber-200 px-1.5 py-0 text-[10px] font-black tabular-nums text-amber-900 dark:bg-amber-900/60 dark:text-amber-100">
              {stats.count}
            </span>
            {snapshot.length > 0 && (
              <button
                type="button"
                onClick={clearSnapshot}
                className="ml-auto inline-flex items-center gap-1 rounded-md border-2 border-slate-300 bg-white px-1.5 py-0.5 text-[10px] font-black text-slate-600 transition hover:border-slate-500 hover:text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
                title="Очистить все"
              >
                <RotateCcw size={10} /> Очистить
              </button>
            )}
          </header>

          <SortableContext items={snapshot.map(s => s.id)} strategy={verticalListSortingStrategy}>
            <SnapshotDropZone isEmpty={snapshot.length === 0} isOver={isOverDrop}>
              {snapshot.map((entry, i) => (
                <SnapshotCard
                  key={entry.id}
                  entry={entry}
                  index={i}
                  defaultTimer={defaultTimer}
                  onRemove={removeFromSnapshot}
                  onChange={updateSnapshotEntry}
                  onEdit={(q) => { setEditorInitial(q); setEditorOpen(true); }}
                />
              ))}
            </SnapshotDropZone>
          </SortableContext>

          {/* Footer stats */}
          <footer className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border-2 border-slate-900 bg-white px-3 py-2 dark:border-white dark:bg-slate-800">
            <Stat icon={ListChecks} label="Вопросов" value={stats.count} />
            <span className="h-5 w-px bg-slate-200 dark:bg-slate-700" />
            <Stat icon={Trophy} label="Очков" value={stats.totalPoints} accent="text-amber-700 dark:text-amber-300" />
            <span className="h-5 w-px bg-slate-200 dark:bg-slate-700" />
            <Stat icon={Clock} label="Время" value={formatDuration(stats.totalSec)} accent="text-blue-700 dark:text-blue-300" />
          </footer>
        </section>
      </div>

      {/* DragOverlay shows the dragged item floating with cursor (cleaner than the default snapshot) */}
      <DragOverlay dropAnimation={null}>
        {activeDrag ? (
          <div className="pointer-events-none rounded-2xl border-2 border-primary-500 bg-white p-2 shadow-xl dark:bg-slate-900">
            <div
              className="prose prose-sm max-w-[260px] text-[12px] font-bold text-slate-900 dark:prose-invert dark:text-slate-100 line-clamp-2 [&_*]:!my-0 [&_p]:!my-0"
              dangerouslySetInnerHTML={{ __html: activeDrag.q.questionText || '' }}
            />
          </div>
        ) : null}
      </DragOverlay>

      {/* Inline Question Editor — creates a new BankQuestion and adds it to the snapshot */}
      <InlineQuestionEditor
        open={editorOpen}
        initial={editorInitial}
        onClose={() => { setEditorOpen(false); setEditorInitial(null); }}
        onSaved={(saved) => {
          if (!saved) return;
          // 1. Refresh bank list so the new question appears
          setBankItems(prev => [saved, ...prev.filter(b => b._id !== saved._id)]);
          // 2. If we were editing an existing snapshot row, update its `q` reference; otherwise add new
          if (editorInitial?._id) {
            setSnapshot(prev => prev.map(s => s.bankId === saved._id ? { ...s, q: saved } : s));
          } else {
            setSnapshot(prev => [...prev, {
              id: newSnapId(),
              bankId: saved._id,
              q: saved,
              timerOverride: null,
              pointsOverride: null
            }]);
          }
        }}
      />
    </DndContext>
  );
}

function Stat({ icon: Icon, label, value, accent = 'text-slate-700 dark:text-slate-300' }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-[0.14em] ${accent}`}>
      <Icon size={12} strokeWidth={2.8} />
      <span className="text-slate-400 dark:text-slate-500">{label}:</span>
      <span className="tabular-nums">{value}</span>
    </span>
  );
}
