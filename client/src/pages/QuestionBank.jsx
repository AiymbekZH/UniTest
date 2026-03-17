import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Filter, Trash2, Edit3, Plus, Database, Check,
  ListChecks, ToggleLeft, FileText, Link2, Type, X, ChevronDown, ArrowLeft
} from 'lucide-react';
import api from '../services/api';
import toast, { Toaster } from 'react-hot-toast';
import Navbar from '../components/Navbar';
import Pagination from '../components/Pagination';
import ConfirmDialog from '../components/ConfirmDialog';

const typeMap = {
  'single-choice': { label: 'Один ответ', icon: Check, color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30' },
  'multiple-choice': { label: 'Несколько ответов', icon: ListChecks, color: 'bg-orange-50 text-orange-600 dark:bg-orange-900/30' },
  'true-false': { label: 'Верно/Неверно', icon: ToggleLeft, color: 'bg-green-50 text-green-600 dark:bg-green-900/30' },
  'essay': { label: 'Эссе', icon: FileText, color: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30' },
  'matching': { label: 'Сопоставление', icon: Link2, color: 'bg-rose-50 text-rose-600 dark:bg-rose-900/30' },
  'fill-blank': { label: 'Заполнить пропуск', icon: Type, color: 'bg-teal-50 text-teal-600 dark:bg-teal-900/30' },
};

export default function QuestionBank() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selected, setSelected] = useState(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null });
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [editModal, setEditModal] = useState({ open: false, question: null });
  const [filterCategory, setFilterCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const limit = 12;

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit });
      if (search) params.append('search', search);
      if (filterType) params.append('type', filterType);
      if (filterCategory) params.append('category', filterCategory);
      const res = await api.get(`/question-bank?${params}`);
      setQuestions(res.data.questions || []);
      setTotalPages(res.data.totalPages || 1);
      if (res.data.categories) setCategories(res.data.categories);
    } catch (err) {
      toast.error('Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchQuestions(); }, [page, filterType, filterCategory]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchQuestions();
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/question-bank/${id}`);
      toast.success('Вопрос удалён');
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

  const toggleSelect = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === questions.length) setSelected(new Set());
    else setSelected(new Set(questions.map(q => q._id)));
  };

  return (
    <div className="min-h-screen bg-surface">
      <Toaster position="top-right" />
      <Navbar />

      <ConfirmDialog isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, id: null })}
        onConfirm={() => handleDelete(deleteConfirm.id)}
        title="Удалить вопрос" message="Вы уверены? Это действие нельзя отменить."
        confirmText="Удалить" variant="danger" />

      <ConfirmDialog isOpen={bulkDeleteConfirm}
        onClose={() => setBulkDeleteConfirm(false)}
        onConfirm={handleBulkDelete}
        title="Удалить выбранные" message={`Удалить ${selected.size} вопросов?`}
        confirmText="Удалить все" variant="danger" />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition">
                <ArrowLeft size={20} className="text-gray-500" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-dark flex items-center gap-2">
                  <Database size={24} className="text-primary-600" /> Банк вопросов
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Библиотека вопросов для повторного использования</p>
              </div>
            </div>
          </div>

          {/* Search & Filter */}
          <div className="glass-card-solid p-4 mb-6">
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input className="input-field pl-9 py-2 text-sm" placeholder="Поиск по тексту вопроса..."
                  value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1); }}
                className="input-field py-2 text-sm w-full sm:w-44">
                <option value="">Все типы</option>
                {Object.entries(typeMap).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              {categories.length > 0 && (
                <select value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setPage(1); }}
                  className="input-field py-2 text-sm w-full sm:w-44">
                  <option value="">Все категории</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              )}
              <button type="submit" className="btn-primary py-2 px-4 text-sm">Найти</button>
            </form>
          </div>

          {/* Bulk actions */}
          {selected.size > 0 && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="glass-card-solid p-3 mb-4 flex items-center justify-between">
              <span className="text-sm text-dark font-medium">Выбрано: {selected.size}</span>
              <button onClick={() => setBulkDeleteConfirm(true)}
                className="btn-secondary flex items-center gap-1.5 py-1.5 px-3 text-xs text-red-600 border-red-200 hover:bg-red-50">
                <Trash2 size={12} /> Удалить выбранные
              </button>
            </motion.div>
          )}

          {/* Question list */}
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
            </div>
          ) : questions.length === 0 ? (
            <div className="text-center py-20">
              <Database size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <h3 className="text-lg font-semibold text-dark mb-1">Банк пуст</h3>
              <p className="text-sm text-gray-500">Создайте тест и сохраните вопросы в банк</p>
            </div>
          ) : (
            <>
              {/* Select all */}
              <div className="flex items-center gap-2 mb-3">
                <button onClick={toggleAll}
                  className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all
                    ${selected.size === questions.length ? 'bg-primary-600 border-primary-600' : 'border-gray-300 dark:border-slate-500'}`}>
                  {selected.size === questions.length && <Check size={8} className="text-white" />}
                </button>
                <span className="text-xs text-gray-500">Выбрать все</span>
              </div>

              <div className="grid gap-3">
                {questions.map((q, i) => {
                  const typeInfo = typeMap[q.type] || typeMap['single-choice'];
                  const Icon = typeInfo.icon;
                  return (
                    <motion.div key={q._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className={`glass-card-solid p-4 flex items-start gap-3 hover:shadow-lg transition-all
                        ${selected.has(q._id) ? 'ring-2 ring-primary-500/30' : ''}`}>
                      <button onClick={() => toggleSelect(q._id)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 mt-0.5
                          ${selected.has(q._id) ? 'bg-primary-600 border-primary-600' : 'border-gray-300 dark:border-slate-500'}`}>
                        {selected.has(q._id) && <Check size={10} className="text-white" />}
                      </button>

                      <div className={`w-8 h-8 ${typeInfo.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                        <Icon size={14} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-dark mb-1">{q.questionText}</p>
                        <div className="flex flex-wrap gap-2">
                          <span className="text-[10px] text-gray-400">{typeInfo.label}</span>
                          <span className="text-[10px] text-gray-400">• {q.points} б.</span>
                          {q.category && <span className="text-[10px] badge-info px-1.5 py-0">{q.category}</span>}
                          {q.tags?.map((t, i) => <span key={i} className="text-[10px] badge-primary px-1.5 py-0">{t}</span>)}
                        </div>
                      </div>

                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => setEditModal({ open: true, question: { ...q } })}
                          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 hover:text-primary-600 transition-colors">
                          <Edit3 size={14} />
                        </button>
                        <button onClick={() => setDeleteConfirm({ open: true, id: q._id })}
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </>
          )}
        </motion.div>
      </main>

      {/* Edit Modal */}
      <AnimatePresence>
        {editModal.open && editModal.question && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setEditModal({ open: false, question: null })}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              onClick={e => e.stopPropagation()} className="relative w-full max-w-md glass-card-solid p-6">
              <h3 className="text-lg font-bold text-dark mb-4">Редактировать вопрос</h3>
              <div className="space-y-3">
                <textarea className="input-field text-sm py-2 resize-none" rows="3" placeholder="Текст вопроса..."
                  value={editModal.question.questionText}
                  onChange={e => setEditModal(prev => ({ ...prev, question: { ...prev.question, questionText: e.target.value } }))} />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">Баллы</label>
                    <input type="number" className="input-field text-sm py-2" min="0"
                      value={editModal.question.points}
                      onChange={e => setEditModal(prev => ({ ...prev, question: { ...prev.question, points: parseInt(e.target.value) || 0 } }))} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">Категория</label>
                    <input className="input-field text-sm py-2" placeholder="Категория"
                      value={editModal.question.category || ''}
                      onChange={e => setEditModal(prev => ({ ...prev, question: { ...prev.question, category: e.target.value } }))} />
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={handleEdit} className="btn-primary flex-1 py-2 text-sm">Сохранить</button>
                <button onClick={() => setEditModal({ open: false, question: null })} className="btn-secondary flex-1 py-2 text-sm">Отмена</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
