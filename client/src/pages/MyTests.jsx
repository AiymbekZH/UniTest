import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FileText, Plus, Edit3, Trash2, Share2, Users,
  Copy, Eye, EyeOff, MoreVertical, BarChart3, ArrowLeft, Download, Upload
} from 'lucide-react';
import api from '../services/api';
import toast, { Toaster } from 'react-hot-toast';
import Navbar from '../components/Navbar';
import Pagination from '../components/Pagination';
import ConfirmDialog from '../components/ConfirmDialog';

export default function MyTests() {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null });
  const navigate = useNavigate();
  const perPage = 10;

  useEffect(() => {
    fetchMyTests();
  }, []);

  const fetchMyTests = async () => {
    try {
      const res = await api.get('/tests/my');
      setTests(res.data);
    } catch (err) {
      toast.error('Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  const deleteTest = async (id) => {
    try {
      await api.delete(`/tests/${id}`);
      setTests(prev => prev.filter(t => t._id !== id));
      toast.success('Тест удалён');
    } catch (err) {
      toast.error('Ошибка удаления');
    }
  };

  const totalPages = Math.ceil(tests.length / perPage);
  const pagedTests = tests.slice((page - 1) * perPage, page * perPage);

  const copyLink = (shareLink) => {
    navigator.clipboard.writeText(`${window.location.origin}/test/${shareLink}`);
    toast.success('Ссылка скопирована!');
  };

  const exportTest = async (testId) => {
    try {
      const res = await api.get(`/tests/${testId}`);
      const data = res.data;
      const exportData = {
        _exportVersion: 1,
        title: data.title,
        description: data.description,
        tags: data.tags,
        questions: data.questions,
        settings: data.settings,
        coverImage: data.coverImage
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${data.title.replace(/[^a-zA-Z0-9а-яА-Яәөұқіңғүһ\s-]/gi, '')}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Тест экспортирован!');
    } catch {
      toast.error('Ошибка экспорта');
    }
  };

  const importTest = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.title || !data.questions?.length) {
        toast.error('Некорректный файл');
        return;
      }
      const payload = {
        title: data.title + ' (импорт)',
        description: data.description || '',
        tags: data.tags || [],
        questions: data.questions,
        settings: data.settings || {},
        coverImage: data.coverImage || ''
      };
      await api.post('/tests', payload);
      toast.success('Тест импортирован!');
      fetchMyTests();
    } catch {
      toast.error('Ошибка импорта — проверьте файл');
    }
  };

  return (
    <div className="min-h-screen bg-surface">
      <Toaster position="top-right" />
      <Navbar />

      <ConfirmDialog
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, id: null })}
        onConfirm={() => deleteTest(deleteConfirm.id)}
        title="Удалить тест"
        message="Удалить этот тест? Все результаты также будут удалены."
        confirmText="Удалить"
        variant="danger"
      />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition">
              <ArrowLeft size={20} className="text-gray-500" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-dark">Мои тесты</h1>
              <p className="text-sm text-gray-500">{tests.length} тестов создано</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="btn-secondary flex items-center gap-2 text-sm cursor-pointer">
              <Upload size={16} /> Импорт JSON
              <input type="file" accept=".json" className="hidden" onChange={importTest} />
            </label>
            <button onClick={() => navigate('/create-test')} className="btn-primary flex items-center gap-2 text-sm">
              <Plus size={16} /> Создать тест
            </button>
          </div>
        </motion.div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="glass-card-solid p-5 animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-1/3 mb-3" />
                <div className="h-4 bg-gray-100 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : tests.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
            <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-primary-400" />
            </div>
            <h3 className="text-lg font-semibold text-dark mb-2">Нет тестов</h3>
            <p className="text-gray-500 mb-4">Создайте свой первый тест</p>
            <button onClick={() => navigate('/create-test')} className="btn-primary">Создать</button>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            {pagedTests.map((test, i) => (
              <motion.div
                key={test._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card-solid p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 group hover:shadow-glass transition-all"
              >
                {test.coverImage && (
                  <div className="w-full sm:w-32 h-32 sm:h-24 rounded-lg overflow-hidden bg-gray-100 dark:bg-slate-800 flex-shrink-0 cursor-pointer" onClick={() => navigate(`/test-profile/${test.shareLink}`)}>
                    <img src={test.coverImage} className="w-full h-full object-cover" alt={test.title} />
                  </div>
                )}
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/test-profile/${test.shareLink}`)}>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-semibold text-dark truncate">{test.title}</h3>
                    {test.isDeleted && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 font-medium">
                        <Trash2 size={9} /> Удалён админом
                      </span>
                    )}
                    {test.settings?.isPublic ? (
                      <span className="badge-info text-[10px]"><Eye size={9} /> Публичный</span>
                    ) : (
                      <span className="badge-warning text-[10px]"><EyeOff size={9} /> Приватный</span>
                    )}
                  </div>
                  {test.isDeleted && test.deleteReason && (
                    <p className="text-xs text-red-500 dark:text-red-400 mb-1">Причина: {test.deleteReason}</p>
                  )}
                  <p className="text-sm text-gray-500 truncate">{test.description || 'Без описания'}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    <span>{test.questions?.length || 0} вопросов</span>
                    <span><Users size={11} className="inline" /> {test.attemptCount || 0} попыток</span>
                    <span>{new Date(test.createdAt).toLocaleDateString('ru-RU')}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => exportTest(test._id)}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 hover:text-green-600 transition-colors" title="Экспорт JSON">
                    <Download size={16} />
                  </button>
                  <button onClick={() => copyLink(test.shareLink)}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 hover:text-primary-600 transition-colors" title="Скопировать ссылку">
                    <Copy size={16} />
                  </button>
                  <button onClick={() => navigate(`/results/${test._id}`)}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 hover:text-blue-600 transition-colors" title="Результаты">
                    <BarChart3 size={16} />
                  </button>
                  <button onClick={() => navigate(`/edit-test/${test._id}`)}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 hover:text-amber-600 transition-colors" title="Редактировать">
                    <Edit3 size={16} />
                  </button>
                  <button onClick={() => setDeleteConfirm({ open: true, id: test._id })}
                    className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600 transition-colors" title="Удалить">
                    <Trash2 size={16} />
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {!loading && tests.length > 0 && (
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        )}
      </main>
    </div>
  );
}
