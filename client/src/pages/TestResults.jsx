import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Trophy, Clock, AlertTriangle, Users,
  Medal, TrendingUp, Eye, Download, ExternalLink, FileText, Check, X,
  ChevronDown, ChevronUp, FileJson, Printer, BarChart3
} from 'lucide-react';
import api from '../services/api';
import toast, { Toaster } from 'react-hot-toast';
import Navbar from '../components/Navbar';
import Pagination from '../components/Pagination';

export default function TestResults() {
  const { testId } = useParams();
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [essayGrades, setEssayGrades] = useState({});
  const [expandedResult, setExpandedResult] = useState(null);
  const [gradingLoading, setGradingLoading] = useState({});
  const [bestOnly, setBestOnly] = useState(true);
  const [activeTab, setActiveTab] = useState('results'); // 'results' | 'analytics'
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const resultsPerPage = 15;

  useEffect(() => {
    fetchResults();
  }, [testId]);

  const fetchResults = async () => {
    try {
      const res = await api.get(`/results/test/${testId}`);
      setResults(res.data);
    } catch (err) {
      toast.error('Ошибка загрузки результатов');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    if (analytics) return; // already fetched
    setAnalyticsLoading(true);
    try {
      const res = await api.get(`/results/analytics/${testId}`);
      setAnalytics(res.data);
    } catch (err) {
      toast.error('Ошибка загрузки аналитики');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const formatTime = (seconds) => {
    if (!seconds) return '-';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getMedalColor = (index) => {
    if (index === 0) return 'text-amber-500';
    if (index === 1) return 'text-gray-400';
    if (index === 2) return 'text-orange-600';
    return 'text-gray-300';
  };

  // Essay grading
  const gradeEssay = async (resultId, questionId, points) => {
    setGradingLoading(prev => ({ ...prev, [`${resultId}_${questionId}`]: true }));
    try {
      const feedback = essayGrades[`${resultId}_${questionId}_feedback`] || '';
      await api.put(`/results/${resultId}/grade-essay`, {
        questionId,
        points: Number(points),
        feedback
      });
      toast.success('Оценка сохранена');
      fetchResults(); // Refresh to show updated score
    } catch (err) {
      toast.error(err.response?.data?.message || 'Ошибка оценивания');
    } finally {
      setGradingLoading(prev => ({ ...prev, [`${resultId}_${questionId}`]: false }));
    }
  };

  // Export to CSV (Excel-compatible with semicolons)
  const exportToCSV = () => {
    if (results.length === 0) return;
    const sep = ';';
    const headers = ['Имя', 'Баллы', 'Макс. баллы', 'Процент', 'Время', 'Нарушения', 'Дата'];
    const rows = results.map(r => [
      `"${(r.user ? `${r.user.lastName} ${r.user.firstName}` : r.guestName || 'Гость').replace(/"/g, '""')}"`,
      r.score,
      r.totalPoints,
      r.percentage + '%',
      formatTime(r.timeSpent),
      r.violationCount,
      `"${new Date(r.completedAt || r.createdAt).toLocaleString('ru-RU')}"`
    ]);

    const csv = 'sep=;\n' + [headers.join(sep), ...rows.map(r => r.join(sep))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `results_${testId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV скачан');
  };

  // Export to JSON
  const exportToJSON = () => {
    if (results.length === 0) return;
    const data = results.map(r => ({
      name: r.user ? `${r.user.lastName} ${r.user.firstName}` : r.guestName || 'Гость',
      score: r.score,
      totalPoints: r.totalPoints,
      percentage: r.percentage,
      timeSpent: r.timeSpent,
      violationCount: r.violationCount,
      completedAt: r.completedAt || r.createdAt,
      answers: r.answers
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `results_${testId}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('JSON скачан');
  };

  // Export to PDF (via print)
  const exportToPDF = () => {
    if (results.length === 0) return;
    const rows = results.map((r, i) => `<tr>
      <td style="padding:6px;border:1px solid #ddd">${i + 1}</td>
      <td style="padding:6px;border:1px solid #ddd">${r.user ? `${r.user.lastName} ${r.user.firstName}` : r.guestName || 'Гость'}</td>
      <td style="padding:6px;border:1px solid #ddd">${r.score}/${r.totalPoints}</td>
      <td style="padding:6px;border:1px solid #ddd">${r.percentage}%</td>
      <td style="padding:6px;border:1px solid #ddd">${formatTime(r.timeSpent)}</td>
      <td style="padding:6px;border:1px solid #ddd">${r.violationCount}</td>
      <td style="padding:6px;border:1px solid #ddd">${new Date(r.completedAt || r.createdAt).toLocaleString('ru-RU')}</td>
    </tr>`).join('');

    const avg = Math.round(results.reduce((s, r) => s + r.percentage, 0) / results.length);
    const best = Math.max(...results.map(r => r.percentage));

    const html = `<html><head><title>Результаты теста</title><style>
      body{font-family:Arial,sans-serif;padding:20px}
      h1{font-size:18px;margin-bottom:10px}
      table{border-collapse:collapse;width:100%;font-size:13px}
      th{background:#f5f5f5;padding:8px;border:1px solid #ddd;text-align:left}
      .stats{display:flex;gap:20px;margin-bottom:15px;font-size:14px}
      .stat{padding:8px 14px;background:#f0f0f0;border-radius:6px}
    </style></head><body>
      <h1>Результаты теста</h1>
      <div class="stats">
        <div class="stat">Участников: <b>${results.length}</b></div>
        <div class="stat">Средний: <b>${avg}%</b></div>
        <div class="stat">Лучший: <b>${best}%</b></div>
      </div>
      <table><thead><tr>
        <th>№</th><th>Имя</th><th>Баллы</th><th>%</th><th>Время</th><th>Нарушения</th><th>Дата</th>
      </tr></thead><tbody>${rows}</tbody></table>
    </body></html>`;

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    win.print();
  };

  // Deduplicate: keep best result per user
  const deduplicatedResults = (() => {
    if (!bestOnly) return results;
    const seen = new Map();
    for (const r of results) {
      const key = r.user ? r.user._id : (r.guestName || `guest_${r._id}`);
      if (!seen.has(key) || seen.get(key).percentage < r.percentage) {
        seen.set(key, r);
      }
    }
    return Array.from(seen.values()).sort((a, b) => b.percentage - a.percentage);
  })();

  const displayResults = deduplicatedResults;
  const totalPages = Math.ceil(displayResults.length / resultsPerPage);
  const pagedResults = displayResults.slice((page - 1) * resultsPerPage, page * resultsPerPage);

  // Check if any results have essay questions
  const hasEssays = results.some(r => r.answers?.some(a => a.type === 'essay'));

  return (
    <div className="min-h-screen bg-surface">
      
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
              <ArrowLeft size={20} className="text-dark" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-dark">Результаты теста</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{displayResults.length} участников{!bestOnly ? ` (${results.length} попыток)` : ''}</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setBestOnly(!bestOnly)}
              className={`flex items-center gap-1.5 py-2 px-3 text-xs rounded-xl font-medium transition ${bestOnly ? 'bg-primary-600 text-white' : 'btn-secondary'}`}>
              <Users size={14} /> {bestOnly ? 'Лучшие' : 'Все попытки'}
            </button>
            <button onClick={exportToCSV}
              className="btn-secondary flex items-center gap-1.5 py-2 px-3 text-xs">
              <Download size={14} /> CSV
            </button>
            <button onClick={exportToJSON}
              className="btn-secondary flex items-center gap-1.5 py-2 px-3 text-xs">
              <FileJson size={14} /> JSON
            </button>
            <button onClick={exportToPDF}
              className="btn-secondary flex items-center gap-1.5 py-2 px-3 text-xs">
              <Printer size={14} /> PDF
            </button>
          </div>
        </motion.div>

        {/* Tabs: Results / Analytics */}
        <div className="flex gap-1 mb-6 bg-gray-100 dark:bg-slate-800 rounded-xl p-1">
          <button
            onClick={() => setActiveTab('results')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'results'
                ? 'bg-white dark:bg-slate-700 text-dark shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Trophy size={16} /> Результаты
          </button>
          <button
            onClick={() => { setActiveTab('analytics'); fetchAnalytics(); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'analytics'
                ? 'bg-white dark:bg-slate-700 text-dark shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <BarChart3 size={16} /> Аналитика
          </button>
        </div>

        {activeTab === 'analytics' ? (
          /* Analytics View */
          analyticsLoading ? (
            <div className="p-12 text-center"><div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto" /></div>
          ) : !analytics || analytics.totalResponses === 0 ? (
            <div className="glass-card-solid p-12 text-center text-gray-500">Нет данных для аналитики</div>
          ) : (
            <div className="space-y-4">
              <div className="glass-card-solid p-4">
                <p className="text-sm text-gray-500">Всего ответов: <span className="font-bold text-dark">{analytics.totalResponses}</span></p>
              </div>
              {analytics.questions.map((q, qi) => {
                const isHard = q.correctPercent < 40;
                const isEasy = q.correctPercent >= 80;
                return (
                  <motion.div
                    key={q.questionId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: qi * 0.03 }}
                    className={`glass-card-solid p-4 sm:p-5 ${isHard ? 'border-l-4 border-red-400' : isEasy ? 'border-l-4 border-emerald-400' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <span className="w-7 h-7 bg-gray-100 dark:bg-slate-700 text-gray-500 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0">
                          {qi + 1}
                        </span>
                        <p className="text-sm font-medium text-dark leading-relaxed prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: q.questionText }} />
                      </div>
                      <span className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-xs font-bold ${
                        isHard ? 'bg-red-100 dark:bg-red-900/30 text-red-600' :
                        isEasy ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' :
                        'bg-amber-100 dark:bg-amber-900/30 text-amber-600'
                      }`}>
                        {q.correctPercent}%
                      </span>
                    </div>

                    {/* Correct/incorrect bar */}
                    <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden mb-3">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isHard ? 'bg-red-500' : isEasy ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${q.correctPercent}%` }}
                      />
                    </div>

                    <p className="text-xs text-gray-400 mb-3">
                      {q.correctCount} из {q.totalResponses} ответили правильно
                    </p>

                    {/* Option breakdown (for choice questions) */}
                    {(q.type === 'single-choice' || q.type === 'multiple-choice' || q.type === 'true-false') && q.options.length > 0 && (
                      <div className="space-y-1.5">
                        {q.options.map(opt => (
                          <div key={opt.id} className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 ${
                              opt.isCorrect ? 'bg-emerald-500 text-white' : 'bg-gray-200 dark:bg-slate-600'
                            }`}>
                              {opt.isCorrect && <Check size={10} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-xs text-dark truncate flex-1">{opt.text}</span>
                                <span className="text-[10px] font-bold text-gray-400 flex-shrink-0">{opt.selectedPercent}%</span>
                              </div>
                              <div className="h-1 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${opt.isCorrect ? 'bg-emerald-400' : opt.selectedPercent > 20 ? 'bg-red-300' : 'bg-gray-300 dark:bg-slate-500'}`}
                                  style={{ width: `${opt.selectedPercent}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {isHard && (
                      <p className="text-[10px] text-red-500 mt-2 font-medium">Сложный вопрос - большинство ответили неправильно</p>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )
        ) : (
        <>
        {/* Summary stats */}
        {displayResults.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {[
              { icon: Users, label: 'Участники', value: displayResults.length, color: 'text-primary-600' },
              { icon: TrendingUp, label: 'Средний %', value: `${Math.round(displayResults.reduce((s, r) => s + r.percentage, 0) / displayResults.length)}%`, color: 'text-emerald-600' },
              { icon: Trophy, label: 'Лучший %', value: `${Math.max(...displayResults.map(r => r.percentage))}%`, color: 'text-amber-600' },
              { icon: AlertTriangle, label: 'Нарушения', value: displayResults.reduce((s, r) => s + r.violationCount, 0), color: 'text-red-600' },
            ].map((stat, i) => (
              <div key={i} className="glass-card-solid p-4 text-center">
                <stat.icon className={`w-5 h-5 mx-auto mb-2 ${stat.color}`} />
                <p className="text-2xl font-bold text-dark">{stat.value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        )}

        {/* Essay grading notice */}
        {hasEssays && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="glass-card-solid p-4 mb-6 border-l-4 border-amber-400">
            <p className="text-sm text-dark font-medium flex items-center gap-2">
              <FileText size={16} className="text-amber-500" />
              Этот тест содержит эссе-вопросы. Нажмите на результат, чтобы оценить их вручную.
            </p>
          </motion.div>
        )}

        {/* Leaderboard */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="glass-card-solid overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-slate-700">
            <h3 className="font-semibold text-dark flex items-center gap-2">
              <Trophy size={18} className="text-amber-500" /> Таблица результатов
            </h3>
          </div>

          {loading ? (
            <div className="p-8 text-center"><div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto" /></div>
          ) : results.length === 0 ? (
            <div className="p-12 text-center text-gray-500 dark:text-gray-400">Пока нет ответов</div>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-slate-700/50">
              {pagedResults.map((result, i) => {
                const realIndex = (page - 1) * resultsPerPage + i;
                const isExpanded = expandedResult === result._id;
                const essayAnswers = result.answers?.filter(a => a.type === 'essay') || [];

                return (
                  <div key={result._id}>
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 * i }}
                      className="flex items-center gap-4 p-4 hover:bg-gray-50/50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer"
                      onClick={() => {
                        if (essayAnswers.length > 0) {
                          setExpandedResult(isExpanded ? null : result._id);
                        } else {
                          navigate(`/result/${result._id}`);
                        }
                      }}
                    >
                      {/* Rank */}
                      <div className="flex-shrink-0 w-8 text-center">
                        {realIndex < 3 ? (
                          <Medal size={22} className={getMedalColor(realIndex)} />
                        ) : (
                          <span className="text-sm font-bold text-gray-400">{realIndex + 1}</span>
                        )}
                      </div>

                      {/* Name */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-dark text-sm truncate">
                          {result.user
                            ? `${result.user.lastName} ${result.user.firstName}`
                            : result.guestName || 'Гость'
                          }
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          {new Date(result.completedAt || result.createdAt).toLocaleString('ru-RU')}
                        </p>
                      </div>

                      {/* Score */}
                      <div className="text-right flex-shrink-0">
                        <p className={`text-lg font-bold ${
                          result.percentage >= 75 ? 'text-emerald-600' :
                          result.percentage >= 50 ? 'text-amber-600' : 'text-red-600'
                        }`}>
                          {result.percentage}%
                        </p>
                        <p className="text-[10px] text-gray-400">{result.score}/{result.totalPoints}</p>
                      </div>

                      {/* Time */}
                      <div className="text-center flex-shrink-0 hidden sm:block">
                        <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                          <Clock size={12} /> {formatTime(result.timeSpent)}
                        </p>
                      </div>

                      {/* Violations */}
                      <div className="flex-shrink-0">
                        {result.violationCount > 0 ? (
                          <span className="badge-danger flex items-center gap-1">
                            <AlertTriangle size={10} /> {result.violationCount}
                          </span>
                        ) : (
                          <span className="badge-success">Чисто</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        {essayAnswers.length > 0 && (
                          isExpanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />
                        )}
                        <button onClick={e => { e.stopPropagation(); navigate(`/result/${result._id}`); }}
                          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-600">
                          <Eye size={14} className="text-gray-300" />
                        </button>
                      </div>
                    </motion.div>

                    {/* Expanded essay grading */}
                    <AnimatePresence>
                      {isExpanded && essayAnswers.length > 0 && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden border-t border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50"
                        >
                          <div className="p-4 space-y-4">
                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Эссе-ответы</h4>
                            {essayAnswers.map((answer, ai) => (
                              <div key={ai} className="glass-card-solid p-4 space-y-2">
                                <p className="text-sm font-medium text-dark prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: answer.questionText || `Вопрос ${ai + 1}` }} />
                                <div className="bg-white dark:bg-slate-700 p-3 rounded-lg text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                  {answer.userAnswer || answer.textAnswer || <span className="italic text-gray-400">Нет ответа</span>}
                                </div>
                                <div className="flex items-center gap-3 pt-2">
                                  <label className="text-xs text-gray-500">Баллы (макс. {answer.maxPoints || answer.points || '?'}):</label>
                                  <input
                                    type="number"
                                    min="0"
                                    max={answer.maxPoints || answer.points || 100}
                                    className="w-20 input-field py-1 px-2 text-sm text-center"
                                    value={essayGrades[`${result._id}_${answer.questionId}`] ?? answer.pointsEarned ?? ''}
                                    onChange={e => setEssayGrades(prev => ({
                                      ...prev,
                                      [`${result._id}_${answer.questionId}`]: e.target.value
                                    }))}
                                  />
                                  <button
                                    disabled={gradingLoading[`${result._id}_${answer.questionId}`]}
                                    onClick={() => gradeEssay(
                                      result._id,
                                      answer.questionId,
                                      essayGrades[`${result._id}_${answer.questionId}`] ?? 0
                                    )}
                                    className="btn-primary py-1 px-3 text-xs flex items-center gap-1"
                                  >
                                    {gradingLoading[`${result._id}_${answer.questionId}`]
                                      ? <div className="w-3 h-3 border border-white/50 border-t-white rounded-full animate-spin" />
                                      : <Check size={12} />}
                                    Оценить
                                  </button>
                                  {answer.pointsEarned != null && (
                                    <span className="text-xs text-emerald-600 font-medium">Оценка: {answer.pointsEarned} б.</span>
                                  )}
                                </div>
                                {/* Teacher feedback / comment */}
                                <div className="pt-2">
                                  <textarea
                                    className="input-field text-xs py-2 resize-none"
                                    rows="2"
                                    placeholder="Комментарий для студента (необязательно)..."
                                    value={essayGrades[`${result._id}_${answer.questionId}_feedback`] ?? answer.feedback ?? ''}
                                    onChange={e => setEssayGrades(prev => ({
                                      ...prev,
                                      [`${result._id}_${answer.questionId}_feedback`]: e.target.value
                                    }))}
                                  />
                                </div>
                                {answer.feedback && (
                                  <p className="text-xs text-gray-500 italic mt-1">Предыдущий комментарий: {answer.feedback}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </>
        )}
      </main>
    </div>
  );
}
