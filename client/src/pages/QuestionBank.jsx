import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Trash2, Edit3, Plus, Database, Check,
  ListChecks, ToggleLeft, FileText, Link2, Type, X, ChevronDown, ArrowLeft,
  Copy, Tag, TrendingUp, Filter, ChevronRight, Sparkles, Hash, GripVertical,
  SlidersHorizontal, MoreHorizontal
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import Pagination from '../components/Pagination';
import ConfirmDialog from '../components/ConfirmDialog';

const TYPE_META = {
  'single-choice':   { label: 'Один ответ',          icon: Check,       chip: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-700' },
  'multiple-choice': { label: 'Несколько ответов', icon: ListChecks,  chip: 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/40 dark:text-purple-200 dark:border-purple-700' },
  'true-false':      { label: 'Верно/Неверно',     icon: ToggleLeft,  chip: 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-700' },
  'essay':           { label: 'Эссе',                icon: FileText,    chip: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-700' },
  'matching':        { label: 'Сопоставление',     icon: Link2,       chip: 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-900/40 dark:text-rose-200 dark:border-rose-700' },
  'fill-blank':      { label: 'Заполнить пропуск',  icon: Type,        chip: 'bg-teal-100 text-teal-700 border-teal-300 dark:bg-teal-900/40 dark:text-teal-200 dark:border-teal-700' },
};

const SORT_OPTIONS = [
  { value: 'newest',     label: 'Сначала новые' },
  { value: 'oldest',     label: 'Сначала старые' },
  { value: 'most_used',  label: 'Популярные' },
  { value: 'least_used', label: 'Редко используемые' },
  { value: 'alpha',      label: 'По алфавиту' },
];

// Compact pill showing the question type with colored dot.
function TypeChip({ type }) {
  const meta = TYPE_META[type] || TYPE_META['single-choice'];
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] ${meta.chip}`}>
      <Icon size={10} strokeWidth={3} /> {meta.label}
    </span>
  );
}

// Skeleton row for the loading state (matches QuestionRow heights).
function RowSkeleton() {
  return (
    <div className="flex items-start gap-3 rounded-2xl border-2 border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
      <div className="mt-0.5 h-5 w-5 shrink-0 animate-pulse rounded-md bg-slate-200 dark:bg-slate-700" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-3.5 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
      </div>
      <div className="h-6 w-12 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />
    </div>
  );
}

// Sidebar group with collapsible header. Used for categories + tags.
function SidebarSection({ title, icon: Icon, count, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-slate-200 dark:border-slate-700 first:border-t-0">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
      >
        <span className="flex items-center gap-1.5">
          {Icon && <Icon size={12} strokeWidth={2.6} />} {title}
          {typeof count === 'number' && count > 0 && (
            <span className="ml-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-slate-200 px-1 text-[9px] font-black tabular-nums text-slate-700 dark:bg-slate-700 dark:text-slate-300">{count}</span>
          )}
        </span>
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="px-2 pb-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Pillbutton used for type/category/tag filter rows in the sidebar.
function FilterButton({ active, onClick, children, count }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between gap-2 rounded-xl border-2 px-2.5 py-1.5 text-left text-[12px] font-black transition
        ${active
          ? 'border-primary-600 bg-primary-500 text-white shadow-[0_2px_0_#9a3412]'
          : 'border-transparent bg-transparent text-slate-700 hover:border-slate-300 hover:bg-slate-100 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800'}`}
    >
      <span className="truncate">{children}</span>
      {typeof count === 'number' && (
        <span className={`shrink-0 text-[10px] tabular-nums ${active ? 'text-white/80' : 'text-slate-400 dark:text-slate-500'}`}>{count}</span>
      )}
    </button>
  );
}

export default function QuestionBank() {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  // Filters
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [sort, setSort] = useState('newest');
  // Aggregated metadata
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  // Selection / interaction
  const [selected, setSelected] = useState(new Set());
  const [expandedId, setExpandedId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Modals
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null });
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [editModal, setEditModal] = useState({ open: false, question: null });

  const limit = 20;
  const searchDebounceRef = useRef(null);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit, sort });
      if (search) params.append('search', search);
      if (filterType) params.append('type', filterType);
      if (filterCategory) params.append('category', filterCategory);
      if (filterTag) params.append('tag', filterTag);
      const res = await api.get(`/question-bank?${params}`);
      setQuestions(res.data.questions || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.totalPages || 1);
      if (res.data.categories) setCategories(res.data.categories);
      if (res.data.tags) setTags(res.data.tags);
    } catch (err) {
      toast.error('Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchQuestions(); /* eslint-disable-line */ }, [page, filterType, filterCategory, filterTag, sort, search]);

  // Debounced search input → triggers fetch via `search` state.
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 350);
    return () => searchDebounceRef.current && clearTimeout(searchDebounceRef.current);
  }, [searchInput]);

  const resetFilters = () => {
    setSearchInput('');
    setSearch('');
    setFilterType('');
    setFilterCategory('');
    setFilterTag('');
    setSort('newest');
    setPage(1);
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/question-bank/${id}`);
      toast.success('Вопрос удалён');
      setSelected(prev => { const next = new Set(prev); next.delete(id); return next; });
      fetchQuestions();
    } catch { toast.error('Ошибка удаления'); }
  };

  const handleBulkDelete = async () => {
    try {
      await api.post('/question-bank/bulk-delete', { ids: Array.from(selected) });
      toast.success(`Удалено ${selected.size} вопросов`);
      setSelected(new Set());
      fetchQuestions();
    } catch { toast.error('Ошибка удаления'); }
  };

  const handleEdit = async () => {
    if (!editModal.question) return;
    try {
      await api.put(`/question-bank/${editModal.question._id}`, editModal.question);
      toast.success('Вопрос обновлён');
      setEditModal({ open: false, question: null });
      fetchQuestions();
    } catch { toast.error('Ошибка сохранения'); }
  };

  const handleDuplicate = async (id) => {
    try {
      await api.post(`/question-bank/${id}/duplicate`);
      toast.success('Вопрос продублирован');
      fetchQuestions();
    } catch { toast.error('Ошибка дублирования'); }
  };

  const toggleSelect = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === questions.length) setSelected(new Set());
    else setSelected(new Set(questions.map(q => q._id)));
  };

  const filtersActive = !!(search || filterType || filterCategory || filterTag);
  const allSelected = questions.length > 0 && selected.size === questions.length;

  // ───────── Sidebar (shared between desktop column and mobile drawer) ─────────
  const sidebarBody = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b-2 border-slate-900 px-4 py-3 dark:border-white">
        <span className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-slate-700 dark:text-slate-200">
          <SlidersHorizontal size={14} strokeWidth={2.6} /> Фильтры
        </span>
        {filtersActive && (
          <button
            type="button"
            onClick={resetFilters}
            className="rounded-full border-2 border-slate-900 bg-white px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-700 transition hover:bg-slate-100 dark:border-white dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            title="Сбросить все фильтры"
          >
            Сбросить
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <SidebarSection title="Тип вопроса" icon={Filter}>
          <div className="space-y-1">
            <FilterButton active={!filterType} onClick={() => { setFilterType(''); setPage(1); }}>
              Все типы
            </FilterButton>
            {Object.entries(TYPE_META).map(([key, meta]) => (
              <FilterButton key={key} active={filterType === key} onClick={() => { setFilterType(key); setPage(1); }}>
                {meta.label}
              </FilterButton>
            ))}
          </div>
        </SidebarSection>

        {categories.length > 0 && (
          <SidebarSection title="Категории" icon={Database} count={categories.length}>
            <div className="space-y-1">
              <FilterButton active={!filterCategory} onClick={() => { setFilterCategory(''); setPage(1); }}>
                Все категории
              </FilterButton>
              {categories.map(c => (
                <FilterButton key={c} active={filterCategory === c} onClick={() => { setFilterCategory(c); setPage(1); }}>
                  {c}
                </FilterButton>
              ))}
            </div>
          </SidebarSection>
        )}

        {tags.length > 0 && (
          <SidebarSection title="Теги" icon={Tag} count={tags.length} defaultOpen={false}>
            <div className="flex flex-wrap gap-1.5 px-1">
              <button
                type="button"
                onClick={() => { setFilterTag(''); setPage(1); }}
                className={`rounded-full border-2 px-2 py-0.5 text-[11px] font-black transition
                  ${!filterTag
                    ? 'border-primary-600 bg-primary-500 text-white'
                    : 'border-slate-300 bg-white text-slate-600 hover:border-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}
              >
                Все
              </button>
              {tags.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => { setFilterTag(filterTag === tag ? '' : tag); setPage(1); }}
                  className={`rounded-full border-2 px-2 py-0.5 text-[11px] font-black transition
                    ${filterTag === tag
                      ? 'border-primary-600 bg-primary-500 text-white'
                      : 'border-slate-300 bg-white text-slate-600 hover:border-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </SidebarSection>
        )}

        <SidebarSection title="Сортировка" icon={TrendingUp} defaultOpen={false}>
          <div className="space-y-1">
            {SORT_OPTIONS.map(opt => (
              <FilterButton key={opt.value} active={sort === opt.value} onClick={() => { setSort(opt.value); setPage(1); }}>
                {opt.label}
              </FilterButton>
            ))}
          </div>
        </SidebarSection>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />

      <ConfirmDialog
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, id: null })}
        onConfirm={() => handleDelete(deleteConfirm.id)}
        title="Удалить вопрос"
        message="Вы уверены? Это действие нельзя отменить."
        confirmText="Удалить"
        variant="danger"
      />
      <ConfirmDialog
        isOpen={bulkDeleteConfirm}
        onClose={() => setBulkDeleteConfirm(false)}
        onConfirm={handleBulkDelete}
        title="Удалить выбранные"
        message={`Удалить ${selected.size} вопросов?`}
        confirmText="Удалить все"
        variant="danger"
      />

      <main className="mx-auto max-w-7xl px-3 sm:px-5 lg:px-8 py-5 sm:py-7">
        {/* HEADER */}
        <motion.header
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 flex flex-wrap items-center gap-3"
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
              <Database size={22} className="text-primary-600" /> Банк вопросов
            </h1>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
              {total > 0 ? `${total} ${pluralize(total, ['вопрос', 'вопроса', 'вопросов'])} в библиотеке` : 'Библиотека вопросов для повторного использования'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border-2 border-slate-900 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-100 lg:hidden dark:border-white dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            style={{ boxShadow: '0 3px 0 var(--shadow-chunky, #1f1a14)' }}
          >
            <SlidersHorizontal size={14} strokeWidth={2.6} /> Фильтры
            {filtersActive && <span className="ml-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary-500 px-1 text-[9px] font-black text-white">!</span>}
          </button>
          <button
            type="button"
            onClick={() => navigate('/create-test?source=bank')}
            className="chunky-btn chunky-btn-primary"
            title="Создать вопросы (через CreateTest → Сохранить в банк)"
          >
            <Plus size={15} strokeWidth={2.6} /> Создать
          </button>
        </motion.header>

        <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
          {/* SIDEBAR (desktop) */}
          <aside
            className="hidden lg:block self-start sticky top-20 rounded-[1.75rem] border-2 border-slate-900 bg-white dark:border-white dark:bg-slate-900"
            style={{ boxShadow: '0 6px 0 var(--shadow-chunky, #1f1a14)', maxHeight: 'calc(100vh - 6rem)' }}
          >
            {sidebarBody}
          </aside>

          {/* SIDEBAR DRAWER (mobile/tablet) */}
          <AnimatePresence>
            {sidebarOpen && (
              <motion.div
                key="drawer"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[60] lg:hidden"
                onClick={() => setSidebarOpen(false)}
              >
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                <motion.div
                  initial={{ x: '-100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '-100%' }}
                  transition={{ type: 'tween', duration: 0.22 }}
                  onClick={e => e.stopPropagation()}
                  className="absolute left-0 top-0 h-full w-[85%] max-w-[320px] border-r-2 border-slate-900 bg-white dark:border-white dark:bg-slate-900"
                >
                  <div className="flex items-center justify-between border-b-2 border-slate-900 px-4 py-3 dark:border-white">
                    <span className="text-sm font-black text-slate-900 dark:text-white">Фильтры</span>
                    <button type="button" onClick={() => setSidebarOpen(false)} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                      <X size={18} />
                    </button>
                  </div>
                  <div className="h-[calc(100%-49px)] overflow-y-auto">{sidebarBody}</div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* MAIN PANE */}
          <section className="min-w-0">
            {/* Search bar + summary row */}
            <div
              className="mb-4 rounded-[1.75rem] border-2 border-slate-900 bg-white p-3 dark:border-white dark:bg-slate-900"
              style={{ boxShadow: '0 4px 0 var(--shadow-chunky, #1f1a14)' }}
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" strokeWidth={2.4} />
                  <input
                    className="w-full rounded-xl border-2 border-slate-900 bg-white py-2 pl-9 pr-9 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-primary-500/30 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                    placeholder="Поиск по тексту, тегам, категории…"
                    value={searchInput}
                    onChange={e => setSearchInput(e.target.value)}
                  />
                  {searchInput && (
                    <button
                      type="button"
                      onClick={() => setSearchInput('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                      aria-label="Очистить"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                <select
                  value={sort}
                  onChange={e => { setSort(e.target.value); setPage(1); }}
                  className="rounded-xl border-2 border-slate-900 bg-white py-2 px-3 text-sm font-black text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary-500/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 sm:w-48"
                >
                  {SORT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>

              {/* Active filter chips row */}
              {filtersActive && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Активные:</span>
                  {filterType && <ActiveChip onClear={() => { setFilterType(''); setPage(1); }}>Тип: {TYPE_META[filterType]?.label}</ActiveChip>}
                  {filterCategory && <ActiveChip onClear={() => { setFilterCategory(''); setPage(1); }}>Категория: {filterCategory}</ActiveChip>}
                  {filterTag && <ActiveChip onClear={() => { setFilterTag(''); setPage(1); }}>Тег: {filterTag}</ActiveChip>}
                  {search && <ActiveChip onClear={() => { setSearchInput(''); setSearch(''); }}>Поиск: «{search}»</ActiveChip>}
                </div>
              )}
            </div>

            {/* Bulk action sticky bar */}
            <AnimatePresence>
              {selected.size > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="sticky top-16 z-40 mb-3 flex flex-wrap items-center gap-2 rounded-2xl border-2 border-slate-900 bg-amber-50 px-3 py-2 dark:border-white dark:bg-amber-900/30"
                  style={{ boxShadow: '0 4px 0 var(--shadow-chunky, #1f1a14)' }}
                >
                  <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-700 dark:text-amber-100">
                    Выбрано: {selected.size}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelected(new Set())}
                    className="rounded-lg border-2 border-slate-900 bg-white px-2 py-1 text-[11px] font-black text-slate-700 hover:bg-slate-100 dark:border-white dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    Снять
                  </button>
                  <span className="ml-auto" />
                  <button
                    type="button"
                    onClick={() => setBulkDeleteConfirm(true)}
                    className="flex items-center gap-1 rounded-lg border-2 border-red-600 bg-red-50 px-2 py-1 text-[11px] font-black text-red-700 transition hover:bg-red-100 dark:border-red-400 dark:bg-red-900/40 dark:text-red-200 dark:hover:bg-red-900/60"
                  >
                    <Trash2 size={12} strokeWidth={2.6} /> Удалить
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* List */}
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 8 }).map((_, i) => <RowSkeleton key={i} />)}
              </div>
            ) : questions.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-[1.75rem] border-2 border-dashed border-slate-300 bg-white py-16 text-center dark:border-slate-700 dark:bg-slate-900">
                <Database size={42} className="mb-3 text-slate-300 dark:text-slate-600" />
                <h3 className="text-base font-black text-slate-700 dark:text-slate-200">
                  {filtersActive ? 'Ничего не найдено' : 'Банк пуст'}
                </h3>
                <p className="mt-1 max-w-xs px-4 text-xs text-slate-500 dark:text-slate-400">
                  {filtersActive ? 'Попробуйте изменить фильтры или сбросить их.' : 'Создайте тест и сохраните вопросы в банк, или создайте напрямую кнопкой выше.'}
                </p>
                {filtersActive && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="mt-4 rounded-xl border-2 border-slate-900 bg-white px-3 py-1.5 text-xs font-black text-slate-700 hover:bg-slate-100 dark:border-white dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    Сбросить фильтры
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Toolbar above list */}
                <div className="mb-2 flex items-center gap-2 px-1">
                  <button
                    type="button"
                    onClick={toggleAll}
                    className={`flex h-5 w-5 items-center justify-center rounded-md border-2 transition
                      ${allSelected
                        ? 'border-primary-600 bg-primary-500'
                        : 'border-slate-400 bg-white dark:border-slate-500 dark:bg-slate-800'}`}
                    aria-label="Выбрать все"
                  >
                    {allSelected && <Check size={12} className="text-white" strokeWidth={3} />}
                  </button>
                  <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    {allSelected ? 'Снять все' : 'Выбрать все на странице'}
                  </span>
                  <span className="ml-auto text-[11px] font-black tabular-nums text-slate-400 dark:text-slate-500">
                    стр. {page} / {totalPages}
                  </span>
                </div>

                <div className="space-y-2">
                  {questions.map(q => (
                    <QuestionRow
                      key={q._id}
                      q={q}
                      selected={selected.has(q._id)}
                      expanded={expandedId === q._id}
                      onToggleSelect={() => toggleSelect(q._id)}
                      onToggleExpand={() => setExpandedId(prev => prev === q._id ? null : q._id)}
                      onEdit={() => setEditModal({ open: true, question: { ...q } })}
                      onDelete={() => setDeleteConfirm({ open: true, id: q._id })}
                      onDuplicate={() => handleDuplicate(q._id)}
                    />
                  ))}
                </div>

                <div className="mt-5">
                  <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
                </div>
              </>
            )}
          </section>
        </div>
      </main>

      {/* EDIT MODAL */}
      <AnimatePresence>
        {editModal.open && editModal.question && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            onClick={() => setEditModal({ open: false, question: null })}
          >
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div
              initial={{ scale: 0.94, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.94, y: 12 }}
              onClick={e => e.stopPropagation()}
              className="relative w-full max-w-lg rounded-[1.75rem] border-2 border-slate-900 bg-white p-5 dark:border-white dark:bg-slate-900"
              style={{ boxShadow: '0 6px 0 var(--shadow-chunky, #1f1a14)' }}
            >
              <div className="mb-3 flex items-center gap-2">
                <Edit3 size={18} className="text-primary-600" strokeWidth={2.4} />
                <h3 className="text-base font-black text-slate-900 dark:text-white">Редактировать вопрос</h3>
                <button
                  type="button"
                  onClick={() => setEditModal({ open: false, question: null })}
                  className="ml-auto rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Текст вопроса</label>
                  <textarea
                    className="w-full rounded-xl border-2 border-slate-900 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-4 focus:ring-primary-500/30 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                    rows="3"
                    placeholder="Текст вопроса…"
                    value={editModal.question.questionText}
                    onChange={e => setEditModal(prev => ({ ...prev, question: { ...prev.question, questionText: e.target.value } }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Баллы</label>
                    <input
                      type="number"
                      className="w-full rounded-xl border-2 border-slate-900 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-4 focus:ring-primary-500/30 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                      min="0"
                      value={editModal.question.points}
                      onChange={e => setEditModal(prev => ({ ...prev, question: { ...prev.question, points: parseInt(e.target.value) || 0 } }))}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Категория</label>
                    <input
                      className="w-full rounded-xl border-2 border-slate-900 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-4 focus:ring-primary-500/30 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                      placeholder="Категория"
                      value={editModal.question.category || ''}
                      onChange={e => setEditModal(prev => ({ ...prev, question: { ...prev.question, category: e.target.value } }))}
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Теги (через запятую)</label>
                  <input
                    className="w-full rounded-xl border-2 border-slate-900 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-4 focus:ring-primary-500/30 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                    placeholder="например: алгебра, школа, легко"
                    value={(editModal.question.tags || []).join(', ')}
                    onChange={e => setEditModal(prev => ({
                      ...prev,
                      question: {
                        ...prev.question,
                        tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                      }
                    }))}
                  />
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={handleEdit}
                  className="chunky-btn chunky-btn-primary flex-1"
                >
                  Сохранить
                </button>
                <button
                  type="button"
                  onClick={() => setEditModal({ open: false, question: null })}
                  className="chunky-btn chunky-btn-ghost flex-1"
                >
                  Отмена
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Russian plural helper for the count summary in the header.
function pluralize(n, forms) {
  const abs = Math.abs(n) % 100;
  const tail = abs % 10;
  if (abs > 10 && abs < 20) return forms[2];
  if (tail > 1 && tail < 5) return forms[1];
  if (tail === 1) return forms[0];
  return forms[2];
}

// Small clearable filter chip used in the active-filters row above the list.
function ActiveChip({ children, onClear }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border-2 border-slate-900 bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-slate-800 dark:border-white dark:bg-amber-900/40 dark:text-amber-100">
      {children}
      <button type="button" onClick={onClear} className="rounded-full p-0.5 hover:bg-amber-200 dark:hover:bg-amber-900/60" aria-label="Снять">
        <X size={10} strokeWidth={3} />
      </button>
    </span>
  );
}

// Compact list-row for the bank — hover-reveal actions, click to expand details.
function QuestionRow({ q, selected, expanded, onToggleSelect, onToggleExpand, onEdit, onDelete, onDuplicate }) {
  const meta = TYPE_META[q.type] || TYPE_META['single-choice'];
  const Icon = meta.icon;
  const correctAnswers = (q.options || []).filter(o => o.isCorrect);

  return (
    <motion.div
      layout
      className={`group rounded-2xl border-2 bg-white transition dark:bg-slate-900
        ${selected
          ? 'border-primary-600 ring-2 ring-primary-500/30'
          : 'border-slate-200 hover:border-slate-400 dark:border-slate-700 dark:hover:border-slate-500'}`}
    >
      <div className="flex items-start gap-2 p-3">
        {/* Drag handle (placeholder for Epic C — visible on hover) */}
        <span className="hidden select-none items-center self-stretch text-slate-300 opacity-0 transition group-hover:opacity-100 dark:text-slate-600 sm:flex" title="Перетащить (скоро)">
          <GripVertical size={14} />
        </span>

        {/* Checkbox */}
        <button
          type="button"
          onClick={onToggleSelect}
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition
            ${selected
              ? 'border-primary-600 bg-primary-500'
              : 'border-slate-400 bg-white dark:border-slate-500 dark:bg-slate-800'}`}
          aria-label="Выбрать"
        >
          {selected && <Check size={12} className="text-white" strokeWidth={3} />}
        </button>

        {/* Type icon (color-coded) */}
        <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${meta.chip}`}>
          <Icon size={14} strokeWidth={2.6} />
        </div>

        {/* Body — clickable to expand */}
        <button
          type="button"
          onClick={onToggleExpand}
          className="min-w-0 flex-1 text-left"
        >
          <div
            className="prose prose-sm max-w-none text-sm font-bold leading-snug text-slate-900 dark:prose-invert dark:text-slate-100 line-clamp-2 [&_*]:!my-0 [&_p]:!my-0"
            dangerouslySetInnerHTML={{ __html: q.questionText || '<em>Без текста</em>' }}
          />
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <TypeChip type={q.type} />
            <span className="inline-flex items-center gap-0.5 rounded-full border border-slate-300 bg-slate-50 px-2 py-0.5 text-[10px] font-black tabular-nums text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {q.points} б
            </span>
            {q.usageCount > 0 && (
              <span className="inline-flex items-center gap-0.5 rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200" title="Сколько раз использован">
                <TrendingUp size={9} strokeWidth={3} /> {q.usageCount}
              </span>
            )}
            {q.category && (
              <span className="inline-flex items-center gap-0.5 rounded-full border border-blue-300 bg-blue-50 px-2 py-0.5 text-[10px] font-black text-blue-700 dark:border-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
                <Hash size={9} strokeWidth={3} /> {q.category}
              </span>
            )}
            {(q.tags || []).slice(0, 3).map((t, i) => (
              <span key={i} className="inline-flex items-center gap-0.5 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <Tag size={9} strokeWidth={2.4} /> {t}
              </span>
            ))}
            {(q.tags || []).length > 3 && (
              <span className="text-[10px] font-bold text-slate-400">+{q.tags.length - 3}</span>
            )}
          </div>
        </button>

        {/* Actions (always visible on mobile, fade on desktop hover) */}
        <div className="flex shrink-0 items-center gap-0.5 opacity-100 transition lg:opacity-0 lg:group-hover:opacity-100">
          <button
            type="button"
            onClick={onToggleExpand}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            title={expanded ? 'Свернуть' : 'Развернуть'}
          >
            <ChevronRight size={14} className={`transition-transform ${expanded ? 'rotate-90' : ''}`} strokeWidth={2.6} />
          </button>
          <button
            type="button"
            onClick={onDuplicate}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            title="Дублировать"
          >
            <Copy size={14} strokeWidth={2.4} />
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-900/30"
            title="Редактировать"
          >
            <Edit3 size={14} strokeWidth={2.4} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30"
            title="Удалить"
          >
            <Trash2 size={14} strokeWidth={2.4} />
          </button>
        </div>
      </div>

      {/* Expanded details */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="border-t-2 border-dashed border-slate-200 px-4 py-3 dark:border-slate-700">
              {q.options && q.options.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                    Варианты ({correctAnswers.length} верн.)
                  </div>
                  <ul className="space-y-1">
                    {q.options.map((opt, i) => (
                      <li
                        key={opt.id || i}
                        className={`flex items-start gap-2 rounded-lg border-2 px-2 py-1 text-xs
                          ${opt.isCorrect
                            ? 'border-emerald-400 bg-emerald-50 text-emerald-900 dark:border-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-100'
                            : 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}
                      >
                        <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 text-[9px] font-black
                          ${opt.isCorrect
                            ? 'border-emerald-500 bg-emerald-500 text-white'
                            : 'border-slate-400 text-slate-400'}`}
                        >
                          {opt.isCorrect ? <Check size={10} strokeWidth={3} /> : String.fromCharCode(65 + i)}
                        </span>
                        <span
                          className="prose prose-xs max-w-none flex-1 [&_*]:!my-0 [&_p]:!my-0"
                          dangerouslySetInnerHTML={{ __html: opt.text || '—' }}
                        />
                        {opt.matchPair && (
                          <span className="rounded bg-slate-200 px-1 text-[9px] font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                            ↔ {opt.matchPair}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {q.correctAnswer && !q.options?.length && (
                <div className="rounded-lg border-2 border-emerald-300 bg-emerald-50 px-2 py-1.5 text-xs font-bold text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">Ответ:</span>{' '}
                  {q.correctAnswer}
                </div>
              )}
              {q.explanation && (
                <div className="mt-2 rounded-lg bg-amber-50 px-2 py-1.5 text-xs text-amber-900 dark:bg-amber-900/30 dark:text-amber-100">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">Объяснение:</span>{' '}
                  <span dangerouslySetInnerHTML={{ __html: q.explanation }} />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
