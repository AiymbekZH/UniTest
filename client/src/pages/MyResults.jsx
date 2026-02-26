import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BarChart3, Trophy, Clock, AlertTriangle, Eye, ArrowLeft
} from 'lucide-react';
import api from '../services/api';
import toast, { Toaster } from 'react-hot-toast';
import Navbar from '../components/Navbar';
import Pagination from '../components/Pagination';

export default function MyResults() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const navigate = useNavigate();
  const perPage = 10;
  const totalPages = Math.ceil(results.length / perPage);
  const pagedResults = results.slice((page - 1) * perPage, page * perPage);

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      const res = await api.get('/results/my');
      setResults(res.data);
    } catch (err) {
      toast.error('Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-surface">
      <Toaster position="top-right" />
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition">
            <ArrowLeft size={20} className="text-gray-500" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-dark">Мои результаты</h1>
            <p className="text-sm text-gray-500">{results.length} результатов всего</p>
          </div>
        </motion.div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="glass-card-solid p-5 animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-1/3 mb-2" />
                <div className="h-4 bg-gray-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : results.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
            <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-8 h-8 text-primary-400" />
            </div>
            <h3 className="text-lg font-semibold text-dark mb-2">Нет результатов</h3>
            <p className="text-gray-500">Пройдите тест, чтобы увидеть результаты</p>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            {pagedResults.map((result, i) => (
              <motion.div
                key={result._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => navigate(`/result/${result._id}`)}
                className="glass-card-solid p-5 flex items-center gap-4 cursor-pointer hover:shadow-glass transition-all"
              >
                {/* Percentage circle */}
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-lg flex-shrink-0 ${
                  result.percentage >= 75 ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600' :
                  result.percentage >= 50 ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600' : 'bg-red-50 dark:bg-red-900/30 text-red-600'
                }`}>
                  {result.percentage}%
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-dark truncate">{result.test?.title || 'Тест удалён'}</h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    <span>{result.score}/{result.totalPoints} баллов</span>
                    <span className="flex items-center gap-1"><Clock size={11} /> {formatTime(result.timeSpent)}</span>
                    {result.violationCount > 0 && (
                      <span className="flex items-center gap-1 text-amber-500">
                        <AlertTriangle size={11} /> {result.violationCount}
                      </span>
                    )}
                    <span>{new Date(result.createdAt).toLocaleDateString('ru-RU')}</span>
                  </div>
                </div>

                <Eye size={16} className="text-gray-300 flex-shrink-0" />
              </motion.div>
            ))}
          </motion.div>
        )}

        {!loading && results.length > 0 && (
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        )}
      </main>
    </div>
  );
}
