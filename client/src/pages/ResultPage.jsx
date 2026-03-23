import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Clock, AlertTriangle, CheckCircle, XCircle,
  ArrowLeft, Star, FileText, HelpCircle,
  ChevronDown, ChevronUp, Award, Download
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer
} from 'recharts';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast, { Toaster } from 'react-hot-toast';
import CommentsSection from '../components/CommentsSection';

export default function ResultPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showReview, setShowReview] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  useEffect(() => {
    fetchResult();
  }, [id]);

  const fetchResult = async () => {
    try {
      const res = await api.get(`/results/${id}`);
      setResult(res.data);
    } catch (err) {
      toast.error('Результат не найден');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m} мин ${s} сек`;
  };

  const getGradeInfo = (pct) => {
    if (pct >= 90) return { label: 'Отлично', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: 'trophy' };
    if (pct >= 75) return { label: 'Хорошо', color: 'text-blue-600', bg: 'bg-blue-50', icon: 'award' };
    if (pct >= 50) return { label: 'Удовлетворительно', color: 'text-amber-600', bg: 'bg-amber-50', icon: 'filetext' };
    return { label: 'Неудовлетворительно', color: 'text-red-600', bg: 'bg-red-50', icon: 'alert' };
  };

  const submitRating = async (rating) => {
    setUserRating(rating);
    try {
      const res = await api.post(`/tests/${result.test?._id}/rate`, { rating });
      setRatingSubmitted(true);
      toast.success(res.data.alreadyRated ? 'Оценка обновлена!' : 'Спасибо за оценку!');
    } catch (err) {
      toast.error('Ошибка отправки оценки');
    }
  };

  // Check if user already rated this test
  useEffect(() => {
    if (result?.test?._id && user) {
      api.get(`/tests/${result.test._id}/my-rating`)
        .then(res => {
          if (res.data.rating > 0) {
            setUserRating(res.data.rating);
            setRatingSubmitted(true);
          }
        })
        .catch(() => {});
    }
  }, [result, user]);

  const downloadCertificate = () => {
    if (!result) return;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const W = 1200, H = 850;
    canvas.width = W;
    canvas.height = H;

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    // Border
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 4;
    ctx.strokeRect(20, 20, W - 40, H - 40);
    ctx.strokeStyle = '#c7d2fe';
    ctx.lineWidth = 1;
    ctx.strokeRect(30, 30, W - 60, H - 60);

    // Decorative corners
    const drawCorner = (x, y, dx, dy) => {
      ctx.beginPath();
      ctx.moveTo(x, y + dy * 40);
      ctx.lineTo(x, y);
      ctx.lineTo(x + dx * 40, y);
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 3;
      ctx.stroke();
    };
    drawCorner(35, 35, 1, 1);
    drawCorner(W - 35, 35, -1, 1);
    drawCorner(35, H - 35, 1, -1);
    drawCorner(W - 35, H - 35, -1, -1);

    // Title
    ctx.textAlign = 'center';
    ctx.fillStyle = '#6366f1';
    ctx.font = '600 14px Inter, sans-serif';
    ctx.letterSpacing = '4px';
    ctx.fillText('CERTIFICATE OF COMPLETION', W / 2, 100);

    // Divider line
    ctx.beginPath();
    ctx.moveTo(W / 2 - 80, 115);
    ctx.lineTo(W / 2 + 80, 115);
    ctx.strokeStyle = '#c7d2fe';
    ctx.lineWidth = 2;
    ctx.stroke();

    // "This certifies that"
    ctx.fillStyle = '#6b7280';
    ctx.font = '400 16px Inter, sans-serif';
    ctx.fillText('This certifies that', W / 2, 160);

    // Name
    const studentName = result.user
      ? `${result.user.lastName} ${result.user.firstName}`
      : result.guestName || 'Student';
    ctx.fillStyle = '#1f2937';
    ctx.font = '700 36px Inter, sans-serif';
    ctx.fillText(studentName, W / 2, 220);

    // Underline name
    const nameWidth = ctx.measureText(studentName).width;
    ctx.beginPath();
    ctx.moveTo(W / 2 - nameWidth / 2 - 20, 232);
    ctx.lineTo(W / 2 + nameWidth / 2 + 20, 232);
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.stroke();

    // "has successfully completed the test"
    ctx.fillStyle = '#6b7280';
    ctx.font = '400 16px Inter, sans-serif';
    ctx.fillText('has successfully completed the test', W / 2, 275);

    // Test title
    const testTitle = result.test?.title || 'Test';
    ctx.fillStyle = '#4f46e5';
    ctx.font = '600 28px Inter, sans-serif';
    // Truncate if too long
    let displayTitle = testTitle;
    if (ctx.measureText(testTitle).width > W - 200) {
      while (ctx.measureText(displayTitle + '...').width > W - 200 && displayTitle.length > 0) {
        displayTitle = displayTitle.slice(0, -1);
      }
      displayTitle += '...';
    }
    ctx.fillText(displayTitle, W / 2, 325);

    // Score section
    ctx.fillStyle = '#1f2937';
    ctx.font = '700 64px Inter, sans-serif';
    ctx.fillText(`${result.percentage}%`, W / 2, 430);

    ctx.fillStyle = '#6b7280';
    ctx.font = '400 16px Inter, sans-serif';
    ctx.fillText(`${result.score} / ${result.totalPoints} points`, W / 2, 465);

    // Grade
    const gradeLabel = getGradeInfo(result.percentage).label;
    const gradeColor = result.percentage >= 75 ? '#10b981' : result.percentage >= 50 ? '#f59e0b' : '#ef4444';
    ctx.fillStyle = gradeColor;
    ctx.font = '600 20px Inter, sans-serif';
    ctx.fillText(gradeLabel, W / 2, 505);

    // Stats
    ctx.fillStyle = '#9ca3af';
    ctx.font = '400 13px Inter, sans-serif';
    ctx.fillText(
      `${correct} correct  |  ${wrong} incorrect  |  Time: ${formatTime(result.timeSpent)}`,
      W / 2, 545
    );

    // Divider
    ctx.beginPath();
    ctx.moveTo(200, 580);
    ctx.lineTo(W - 200, 580);
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Date
    ctx.fillStyle = '#6b7280';
    ctx.font = '400 14px Inter, sans-serif';
    const dateStr = new Date(result.completedAt || result.createdAt).toLocaleDateString('ru-RU', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
    ctx.fillText(dateStr, W / 2, 620);

    // Platform
    ctx.fillStyle = '#c7d2fe';
    ctx.font = '600 12px Inter, sans-serif';
    ctx.fillText('UniTest Platform', W / 2, 780);

    // ID
    ctx.fillStyle = '#d1d5db';
    ctx.font = '400 10px Inter, sans-serif';
    ctx.fillText(`ID: ${result._id}`, W / 2, 800);

    // Download
    const link = document.createElement('a');
    link.download = `certificate_${result._id.slice(-6)}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    toast.success('Сертификат скачан!');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="w-10 h-10 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!result) return null;

  const grade = getGradeInfo(result.percentage);
  const correct = result.answers.filter(a => a.isCorrect).length;
  const wrong = result.answers.filter(a => !a.isCorrect).length;
  const total = result.answers.length;

  const barData = result.answers.map((a, i) => ({
    name: `?${i + 1}`,
    earned: a.pointsEarned,
    max: result.test?.questions?.find(q => q.id === a.questionId)?.points || 1,
  }));

  return (
    <div className="min-h-screen bg-surface p-4 sm:p-8">
      <Toaster position="top-right" />

      <div className="max-w-3xl mx-auto">
        {/* Back */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-6 transition-colors text-sm"
        >
          <ArrowLeft size={16} /> На главную
        </motion.button>

        {/* Score card with SVG ring */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, type: 'spring' }}
          className="relative overflow-hidden rounded-[2rem] border border-white/10 shadow-[0_20px_50px_-12px_rgba(79,70,229,0.3)] p-8 sm:p-12 mb-8 bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900"
        >
          {/* Decorative shapes */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-purple-500/30 rounded-full blur-[80px] pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-indigo-500/30 rounded-full blur-[80px] pointer-events-none"></div>

          <div className="relative z-10 flex flex-col sm:flex-row items-center gap-10">
            {/* SVG Circular Progress Ring */}
            <div className="relative flex-shrink-0 drop-shadow-xl">
              <svg width="180" height="180" viewBox="0 0 180 180">
                {/* Background circle */}
                <circle cx="90" cy="90" r="76" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="12" />
                {/* Progress circle */}
                <motion.circle
                  cx="90" cy="90" r="76" fill="none"
                  stroke={result.percentage >= 75 ? '#34D399' : result.percentage >= 50 ? '#FBBF24' : '#F87171'}
                  strokeWidth="12" strokeLinecap="round" strokeDasharray={2 * Math.PI * 76} strokeDashoffset={2 * Math.PI * 76}
                  animate={{ strokeDashoffset: 2 * Math.PI * 76 * (1 - result.percentage / 100) }}
                  transition={{ duration: 1.5, delay: 0.2, ease: 'easeOut' }}
                  transform="rotate(-90 90 90)"
                  style={{ filter: "drop-shadow(0 0 8px rgba(255,255,255,0.3))" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pt-1">
                <span className="text-5xl font-extrabold text-white tracking-tighter drop-shadow-md leading-none">{result.percentage}%</span>
                <span className={`text-[10px] font-bold mt-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 tracking-wider uppercase shadow-sm ${result.percentage >= 75 ? 'text-emerald-300' : result.percentage >= 50 ? 'text-amber-300' : 'text-red-300'}`}>
                  {grade.label}
                </span>
              </div>
            </div>

            {/* Info + stats */}
            <div className="flex-1 text-center sm:text-left w-full">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2 drop-shadow-sm">
                {result.test?.title || 'Результат теста'}
              </h1>
              <p className="text-base text-indigo-200 font-medium mb-6">
                Вы набрали <span className="text-white font-bold">{result.score}</span> из <span className="text-white font-bold">{result.totalPoints}</span> баллов
              </p>

              {/* Stat Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col items-center sm:items-start transition-all hover:bg-white/15">
                  <div className="flex items-center gap-1.5 text-emerald-300 mb-1.5">
                    <CheckCircle size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Верно</span>
                  </div>
                  <span className="text-2xl font-bold text-white leading-none">{correct}</span>
                </div>
                <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col items-center sm:items-start transition-all hover:bg-white/15">
                  <div className="flex items-center gap-1.5 text-red-300 mb-1.5">
                    <XCircle size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Неверно</span>
                  </div>
                  <span className="text-2xl font-bold text-white leading-none">{wrong}</span>
                </div>
                <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col items-center sm:items-start transition-all hover:bg-white/15">
                  <div className="flex items-center gap-1.5 text-blue-300 mb-1.5">
                    <Clock size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Время</span>
                  </div>
                  <span className="text-lg font-bold text-white leading-tight">{formatTime(result.timeSpent)}</span>
                </div>
                {result.violationCount > 0 && (
                  <div className="bg-white/10 backdrop-blur-md border border-red-500/30 rounded-2xl p-4 flex flex-col items-center sm:items-start transition-all hover:bg-white/15 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                    <div className="flex items-center gap-1.5 text-red-400 mb-1.5">
                      <AlertTriangle size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Нарушения</span>
                    </div>
                    <span className="text-2xl font-bold text-white leading-none">{result.violationCount}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons row: Certificate + Leaderboard */}
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4 mt-8 pt-6 border-t border-white/10">
            <div className="flex items-center justify-center sm:justify-start gap-3 w-full md:w-auto">
              {result.percentage >= 50 && (
                <button
                  onClick={downloadCertificate}
                  className="bg-white text-indigo-900 hover:bg-gray-50 font-bold py-2.5 px-6 rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-white/20 flex-1 md:flex-none"
                >
                  <Download size={16} /> Сертификат
                </button>
              )}
              {result.test?._id && (
                <button
                  onClick={() => navigate(`/leaderboard/${result.test._id}`)}
                  className="bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold py-2.5 px-6 rounded-xl text-sm flex items-center justify-center gap-2 transition-all flex-1 md:flex-none"
                >
                  <Award size={16} className="text-amber-300" /> Таблица
                </button>
              )}
            </div>

            {/* Inline rating */}
            {result.test?._id && (
              <div className="flex items-center justify-center gap-3 w-full md:w-auto bg-white/5 px-4 py-2.5 rounded-xl border border-white/10">
                <span className="text-[11px] font-bold text-indigo-200 tracking-wide uppercase">Оцените тест:</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onClick={() => !ratingSubmitted && submitRating(star)}
                      onMouseEnter={() => !ratingSubmitted && setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      disabled={ratingSubmitted}
                      className="p-1 transition-transform hover:scale-125 disabled:cursor-default"
                    >
                      <Star
                        size={20}
                        className={`transition-all duration-300 ${
                          (hoverRating || userRating) >= star
                            ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]'
                            : 'text-white/20 dark:text-white/20'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                {ratingSubmitted && (
                  <span className="text-xs text-amber-300 font-bold ml-1">
                    {userRating}/5
                  </span>
                )}
              </div>
            )}
          </div>
        </motion.div>

        {/* Charts row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
          {/* Horizontal stacked bar replacing pie chart */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="glass-card-solid p-5"
          >
            <p className="section-title mb-4">Распределение ответов</p>
            {/* Stacked bar */}
            <div className="flex rounded-full overflow-hidden h-5 bg-gray-100 dark:bg-slate-700">
              {correct > 0 && (
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(correct / total) * 100}%` }}
                  transition={{ duration: 0.8, delay: 0.6 }}
                  className="bg-emerald-500 h-full"
                />
              )}
              {wrong > 0 && (
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(wrong / total) * 100}%` }}
                  transition={{ duration: 0.8, delay: 0.7 }}
                  className="bg-red-400 h-full"
                />
              )}
            </div>
            <div className="flex items-center justify-between mt-3">
              <span className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
                Верно: {correct} ({total > 0 ? Math.round((correct / total) * 100) : 0}%)
              </span>
              <span className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="w-2.5 h-2.5 bg-red-400 rounded-full" />
                Неверно: {wrong} ({total > 0 ? Math.round((wrong / total) * 100) : 0}%)
              </span>
            </div>
          </motion.div>

          {/* Bar chart — improved */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="glass-card-solid p-5"
          >
            <p className="section-title mb-4">Баллы по вопросам</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={barData} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                />
                <Bar dataKey="max" fill="#EEF2FF" radius={[6, 6, 6, 6]} name="Максимум" />
                <Bar dataKey="earned" fill="#6366F1" radius={[6, 6, 6, 6]} name="Набрано" />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* Violations list */}
        {result.violations?.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="glass-card-solid p-5 mb-6"
          >
            <p className="section-title mb-3">Нарушения ({result.violations.length})</p>
            <div className="space-y-2">
              {result.violations.map((v, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 text-sm">
                  <AlertTriangle size={14} className="text-amber-500 flex-shrink-0" />
                  <span className="badge-danger text-[10px]">{v.type}</span>
                  <span className="text-gray-600 dark:text-gray-400 flex-1 text-xs">{v.details}</span>
                  <span className="text-[10px] text-gray-400 flex-shrink-0">
                    {new Date(v.timestamp).toLocaleTimeString('ru-RU')}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Detailed Answer Review */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="glass-card-solid overflow-hidden mb-6 border-0 shadow-md ring-1 ring-gray-200/50 dark:ring-gray-700/50"
        >
          <button
            onClick={() => setShowReview(!showReview)}
            className="w-full flex items-center justify-between p-6 hover:bg-gray-50/80 dark:hover:bg-slate-800/50 transition-colors group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center group-hover:scale-105 transition-transform shadow-inner border border-primary-100 dark:border-primary-800/30">
                <FileText size={22} className="text-primary-600 dark:text-primary-400" />
              </div>
              <div className="text-left">
                <span className="block text-lg font-bold text-gray-900 dark:text-gray-100 leading-tight">Разбор ответов</span>
                <span className="block text-sm font-medium text-gray-500 tracking-wide mt-0.5">{correct} верных из {total} вопросов</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center group-hover:bg-primary-50 dark:group-hover:bg-primary-900/30 transition-colors shadow-sm">
              {showReview ? <ChevronUp size={20} className="text-gray-500 group-hover:text-primary-600 dark:group-hover:text-primary-400" /> : <ChevronDown size={20} className="text-gray-500 group-hover:text-primary-600 dark:group-hover:text-primary-400" />}
            </div>
          </button>

          {/* Progress bar showing correct/incorrect ratio */}
          <div className="px-6 pb-4">
            <div className="flex rounded-full overflow-hidden h-2.5 bg-gray-100 dark:bg-gray-800 shadow-inner">
              {correct > 0 && (
                <div className="bg-emerald-500 h-full transition-all duration-1000" style={{ width: `${Math.max(2, (correct / total) * 100)}%` }} />
              )}
              {wrong > 0 && (
                <div className="bg-red-400 h-full transition-all duration-1000 delay-300" style={{ width: `${Math.max(2, (wrong / total) * 100)}%` }} />
              )}
            </div>
          </div>

          <AnimatePresence>
          {showReview && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }} 
              animate={{ height: "auto", opacity: 1 }} 
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-gray-100 dark:border-gray-800 mt-2 p-6 space-y-5 bg-gray-50/50 dark:bg-gray-900/30"
            >
              {result.answers.map((answer, i) => {
                const question = result.test?.questions?.find(q => q.id === answer.questionId);
                const qText = answer.questionText || question?.questionText || `Вопрос ${i + 1}`;
                const maxPts = answer.maxPoints || question?.points || 1;
                const isEssay = (answer.type || question?.type) === 'essay';

                // Build correct answer text
                let correctAnswerText = '';
                if (question) {
                  if (question.type === 'fill-blank') {
                    correctAnswerText = question.correctAnswer || '';
                  } else if (question.type === 'essay') {
                    correctAnswerText = question.correctAnswer || 'Ручная проверка';
                  } else if (question.type === 'matching') {
                    correctAnswerText = question.options
                      ?.filter(o => o.matchPair)
                      .map(o => `${o.text} → ${o.matchPair}`)
                      .join('; ') || '';
                  } else {
                    correctAnswerText = question.options
                      ?.filter(o => o.isCorrect)
                      .map(o => o.text)
                      .join(', ') || '';
                  }
                }

                // Build user answer text
                let userAnswerText = answer.userAnswer || '';
                if (!userAnswerText) {
                  if (answer.textAnswer) {
                    userAnswerText = answer.textAnswer;
                  } else if (answer.selectedOptions?.length > 0 && question) {
                    userAnswerText = answer.selectedOptions
                      .map(optId => question.options?.find(o => o.id === optId)?.text || optId)
                      .join(', ');
                  } else if (answer.matchingPairs?.length > 0 && question) {
                    userAnswerText = answer.matchingPairs
                      .map(p => {
                        const left = question.options?.find(o => o.id === p.left)?.text || p.left;
                        const right = p.right || '';
                        return `${left} → ${right}`;
                      })
                      .join('; ');
                  }
                }

                return (
                  <div
                    key={i}
                    className={`p-5 rounded-[1.25rem] border shadow-sm transition-all hover:shadow-md ${
                      answer.isCorrect
                        ? 'border-emerald-200/60 dark:border-emerald-800/50 bg-white dark:bg-gray-800'
                        : isEssay && answer.pointsEarned === 0
                          ? 'border-amber-200/60 dark:border-amber-800/50 bg-white dark:bg-gray-800'
                          : 'border-red-200/60 dark:border-red-800/50 bg-white dark:bg-gray-800'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-4 flex-1 pr-2">
                        <span className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 shadow-inner ${
                          answer.isCorrect
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/30'
                            : isEssay && answer.pointsEarned === 0
                              ? 'bg-amber-50 text-amber-600 border border-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/30'
                              : 'bg-red-50 text-red-600 border border-red-100 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/30'
                        }`}>
                          {i + 1}
                        </span>
                        <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 leading-relaxed max-w-none pt-1.5" dangerouslySetInnerHTML={{ __html: qText }} />
                      </div>
                      <div className={`flex items-center gap-1.5 flex-shrink-0 px-3 py-1.5 rounded-xl border shadow-sm ${
                          answer.isCorrect
                            ? 'bg-emerald-50 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800/30'
                            : isEssay && answer.pointsEarned === 0
                              ? 'bg-amber-50 border-amber-100 dark:bg-amber-900/20 dark:border-amber-800/30'
                              : 'bg-red-50 border-red-100 dark:bg-red-900/20 dark:border-red-800/30'
                        }`}>
                        {answer.isCorrect ? (
                          <CheckCircle size={14} className="text-emerald-600 dark:text-emerald-500" />
                        ) : isEssay && answer.pointsEarned === 0 ? (
                          <HelpCircle size={14} className="text-amber-600 dark:text-amber-500" />
                        ) : (
                          <XCircle size={14} className="text-red-600 dark:text-red-500" />
                        )}
                        <span className={`text-xs font-bold tracking-wide ${
                          answer.isCorrect ? 'text-emerald-700 dark:text-emerald-400'
                          : isEssay && answer.pointsEarned === 0 ? 'text-amber-700 dark:text-amber-400'
                          : 'text-red-700 dark:text-red-400'
                        }`}>
                          {answer.pointsEarned}/{maxPts}
                        </span>
                      </div>
                    </div>

                    {/* User's answer */}
                    <div className="ml-[3.25rem] space-y-3">
                      <div className="bg-gray-50/80 dark:bg-gray-800/80 rounded-xl p-3.5 border border-gray-100 dark:border-gray-700">
                        <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400 block mb-1">Ваш ответ</span>
                        <p className={`text-sm font-semibold ${
                          answer.isCorrect ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
                        }`}>
                          {userAnswerText || <span className="italic opacity-70 font-medium">Нет ответа</span>}
                        </p>
                      </div>

                      {/* Correct answer (if wrong) */}
                      {!answer.isCorrect && correctAnswerText && !isEssay && (
                        <div className="bg-emerald-50/50 dark:bg-emerald-900/10 rounded-xl p-3.5 border border-emerald-100 dark:border-emerald-800/30">
                          <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-600/70 dark:text-emerald-400/70 block mb-1">Правильный ответ</span>
                          <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                            {correctAnswerText}
                          </p>
                        </div>
                      )}

                      {/* Essay pending notice */}
                      {isEssay && answer.pointsEarned === 0 && !answer.feedback && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 italic font-medium px-2">
                          В ожидании проверки преподавателем...
                        </p>
                      )}

                      {/* Teacher feedback for essay */}
                      {answer.feedback && (
                        <div className="mt-3 p-3.5 bg-purple-50 dark:bg-purple-900/10 rounded-xl border border-purple-100 dark:border-purple-800/30">
                          <span className="text-[10px] uppercase tracking-wider font-bold text-purple-500 block mb-1">Комментарий преподавателя:</span>
                          <p className="text-sm font-medium text-purple-700 dark:text-purple-300 leading-relaxed">{answer.feedback}</p>
                        </div>
                      )}

                      {/* Explanation */}
                      {question?.explanation && (
                        <div className="mt-3 p-3.5 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-800/30">
                          <span className="text-[10px] uppercase tracking-wider font-bold text-blue-500 block mb-1">Пояснение:</span>
                          <p className="text-sm font-medium text-blue-700 dark:text-blue-300 leading-relaxed">{question.explanation}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}
          </AnimatePresence>
        </motion.div>

        {/* Comments — separate card */}
        {result?.test?._id && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="glass-card-solid overflow-hidden mb-6"
          >
            <CommentsSection testId={result.test._id} />
          </motion.div>
        )}
      </div>
    </div>
  );
}
