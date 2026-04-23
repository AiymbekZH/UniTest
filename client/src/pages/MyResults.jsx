import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3, Trophy, Clock, AlertTriangle, Eye, ArrowLeft, TrendingUp, ChevronDown, ChevronUp
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import api from '../services/api';
import toast, { Toaster } from 'react-hot-toast';
import Navbar from '../components/Navbar';
import Pagination from '../components/Pagination';

export default function MyResults() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [expandedChart, setExpandedChart] = useState(null); // testId or null
  const navigate = useNavigate();
  const perPage = 10;
  const totalPages = Math.ceil(results.length / perPage);
  const pagedResults = results.slice((page - 1) * perPage, page * perPage);

  // Group results by test for chart data
  const attemptsByTest = {};
  results.forEach(r => {
    const testId = r.test?._id;
    if (!testId) return;
    if (!attemptsByTest[testId]) attemptsByTest[testId] = [];
    attemptsByTest[testId].push(r);
  });
  // Sort each group chronologically
  Object.values(attemptsByTest).forEach(arr => arr.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)));

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
            {pagedResults.map((result, i) => {
              const testId = result.test?._id;
              const attempts = testId ? attemptsByTest[testId] : [];
              const hasMultiple = attempts.length > 1;
              const isChartOpen = expandedChart === testId;
              const chartData = attempts.map((a, idx) => ({
                name: `#${idx + 1}`,
                percent: a.percentage,
                score: a.score,
                date: new Date(a.createdAt).toLocaleDateString('ru-RU')
              }));

              return (
              <div key={result._id}>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => navigate(`/result/${result._id}`)}
                className="glass-card-solid p-5 flex items-center gap-4 cursor-pointer hover:shadow-sm transition-all"
              >
                {/* Percentage circle */}
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-lg flex-shrink-0 ${
                  result.percentage >= 75 ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600' :
                  result.percentage >= 50 ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600' : 'bg-red-50 dark:bg-red-900/30 text-red-600'
                }`}>
                  {result.percentage}%
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-dark truncate">{result.test?.title || 'Тест удалён'}</h3>
                  </div>
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

              {/* Progress chart toggle */}
              {hasMultiple && (
                <div className="flex justify-center -mt-1 mb-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); setExpandedChart(isChartOpen ? null : testId); }}
                    className="flex items-center gap-1 text-[11px] text-primary-500 hover:text-primary-700 font-medium py-1 px-3 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 transition"
                  >
                    <TrendingUp size={12} />
                    {isChartOpen ? 'Скрыть прогресс' : `Прогресс (${attempts.length} попыток)`}
                    {isChartOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                </div>
              )}

              <AnimatePresence>
                {isChartOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="glass-card-solid p-4 -mt-1">
                      <p className="text-xs font-semibold text-gray-500 mb-3">Прогресс по попыткам</p>
                      <ResponsiveContainer width="100%" height={180}>
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                          <Tooltip
                            contentStyle={{ borderRadius: 12, fontSize: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                            formatter={(value, name) => [`${value}%`, 'Результат']}
                            labelFormatter={(label, payload) => payload?.[0]?.payload?.date || label}
                          />
                          <Line
                            type="monotone"
                            dataKey="percent"
                            stroke="#6366f1"
                            strokeWidth={2.5}
                            dot={{ r: 4, fill: '#6366f1' }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              </div>
              );
            })}
          </motion.div>
        )}

        {!loading && results.length > 0 && (
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        )}
      </main>
    </div>
  );
}
