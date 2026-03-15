import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Trophy, Clock, AlertTriangle, CheckCircle, XCircle,
  ArrowLeft, Star, BarChart3, FileText, HelpCircle,
  ChevronDown, ChevronUp, Award, Download
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast, { Toaster } from 'react-hot-toast';
import CommentsSection from '../components/CommentsSection';

const COLORS = ['#10B981', '#EF4444', '#F59E0B'];

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
    if (pct >= 90) return { label: 'Отлично', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', icon: 'trophy' };
    if (pct >= 75) return { label: 'Хорошо', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20', icon: 'award' };
    if (pct >= 50) return { label: 'Удовлетворительно', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20', icon: 'filetext' };
    return { label: 'Неудовлетворительно', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20', icon: 'alert' };
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

  const pieData = [
    { name: 'Верно', value: correct },
    { name: 'Неверно', value: wrong },
  ];

  const barData = result.answers.map((a, i) => ({
    name: `?${i + 1}`,
    earned: a.pointsEarned,
    max: result.test?.questions?.find(q => q.id === a.questionId)?.points || 1,
  }));

  return (
    <div className="min-h-screen bg-surface p-4 sm:p-8">
      <Toaster position="top-right" />

      <div className="max-w-4xl mx-auto">
        {/* Back */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-gray-400 hover:text-dark mb-6 transition-colors text-sm"
        >
          <ArrowLeft size={16} /> На главную
        </motion.button>

        {/* Score card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200/60 dark:border-slate-700/50 shadow-card p-8 sm:p-10 text-center mb-6"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
            className="mb-4 flex justify-center"
          >
            <div className={`w-16 h-16 rounded-2xl ${grade.bg} flex items-center justify-center`}>
              {grade.icon === 'trophy' && <Trophy size={32} className="text-emerald-500" />}
              {grade.icon === 'award' && <Award size={32} className="text-blue-500" />}
              {grade.icon === 'filetext' && <FileText size={32} className="text-amber-500" />}
              {grade.icon === 'alert' && <AlertTriangle size={32} className="text-red-500" />}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h1 className="text-5xl sm:text-6xl font-extrabold text-dark mb-2 tracking-tight">
              {result.percentage}%
            </h1>
            <p className={`text-lg font-semibold ${grade.color} mb-1`}>{grade.label}</p>
            <p className="text-gray-400 text-sm">
              {result.score} из {result.totalPoints} баллов
            </p>
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8"
          >
            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/15 rounded-xl border border-emerald-100/50 dark:border-emerald-900/30">
              <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto mb-1.5" />
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{correct}</p>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-500 font-medium">Верно</p>
            </div>
            <div className="p-4 bg-red-50 dark:bg-red-900/15 rounded-xl border border-red-100/50 dark:border-red-900/30">
              <XCircle className="w-5 h-5 text-red-500 mx-auto mb-1.5" />
              <p className="text-2xl font-bold text-red-700 dark:text-red-400">{wrong}</p>
              <p className="text-[11px] text-red-600 dark:text-red-500 font-medium">Неверно</p>
            </div>
            <div className="p-4 bg-blue-50 dark:bg-blue-900/15 rounded-xl border border-blue-100/50 dark:border-blue-900/30">
              <Clock className="w-5 h-5 text-blue-500 mx-auto mb-1.5" />
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{formatTime(result.timeSpent)}</p>
              <p className="text-[11px] text-blue-600 dark:text-blue-500 font-medium">Время</p>
            </div>
            <div className="p-4 bg-amber-50 dark:bg-amber-900/15 rounded-xl border border-amber-100/50 dark:border-amber-900/30">
              <AlertTriangle className="w-5 h-5 text-amber-500 mx-auto mb-1.5" />
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{result.violationCount}</p>
              <p className="text-[11px] text-amber-600 dark:text-amber-500 font-medium">Нарушения</p>
            </div>
          </motion.div>

          {/* Certificate download button */}
          {result.percentage >= 50 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.52 }}
              className="mt-6"
            >
              <button
                onClick={downloadCertificate}
                className="inline-flex items-center gap-2 py-2.5 px-6 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-all active:scale-[0.98] shadow-sm hover:shadow-md"
              >
                <Download size={16} /> Скачать сертификат
              </button>
            </motion.div>
          )}
        </motion.div>

        {/* Star Rating + Leaderboard row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {/* Star Rating */}
          {result.test?._id && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200/60 dark:border-slate-700/50 shadow-card p-5 text-center"
            >
              <h3 className="font-semibold text-dark mb-2 flex items-center justify-center gap-2 text-sm">
                <Star size={16} className="text-amber-500" /> Оцените этот тест
              </h3>
              <p className="text-[11px] text-gray-400 mb-3">Ваша оценка поможет другим</p>
              <div className="flex items-center justify-center gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <motion.button
                    key={star}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => !ratingSubmitted && submitRating(star)}
                    onMouseEnter={() => !ratingSubmitted && setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    disabled={ratingSubmitted}
                    className="p-0.5 transition-colors disabled:cursor-default"
                  >
                    <Star
                      size={28}
                      className={`transition-colors ${
                        (hoverRating || userRating) >= star
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-gray-200 dark:text-slate-600'
                      }`}
                    />
                  </motion.button>
                ))}
              </div>
              {ratingSubmitted && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 font-medium"
                >
                  {userRating > 0 ? `Ваша оценка: ${userRating}/5` : 'Спасибо за оценку!'}
                </motion.p>
              )}
            </motion.div>
          )}

          {/* Leaderboard link */}
          {result.test?._id && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.58 }}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200/60 dark:border-slate-700/50 shadow-card p-5 flex flex-col items-center justify-center"
            >
              <Award size={28} className="text-amber-400 mb-2" />
              <h3 className="font-semibold text-dark text-sm mb-3">Таблица лидеров</h3>
              <button
                onClick={() => navigate(`/leaderboard/${result.test._id}`)}
                className="btn-secondary flex items-center justify-center gap-2 py-2.5 px-5 text-sm w-full"
              >
                <Trophy size={15} />
                Посмотреть рейтинг
              </button>
            </motion.div>
          )}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {/* Pie chart */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200/60 dark:border-slate-700/50 shadow-card p-5"
          >
            <h3 className="font-semibold text-dark mb-4 flex items-center gap-2 text-sm">
              <BarChart3 size={16} className="text-gray-400" /> Распределение ответов
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value">
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-2">
              <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-full" /> Верно ({correct})</span>
              <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-2.5 h-2.5 bg-red-500 rounded-full" /> Неверно ({wrong})</span>
            </div>
          </motion.div>

          {/* Bar chart */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200/60 dark:border-slate-700/50 shadow-card p-5"
          >
            <h3 className="font-semibold text-dark mb-4 flex items-center gap-2 text-sm">
              <Trophy size={16} className="text-gray-400" /> Баллы по вопросам
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="earned" fill="#6366F1" radius={[4, 4, 0, 0]} name="Набрано" />
                <Bar dataKey="max" fill="#E0E7FF" radius={[4, 4, 0, 0]} name="Максимум" />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* Violations list */}
        {result.violations?.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200/60 dark:border-slate-700/50 shadow-card p-5 mb-6"
          >
            <h3 className="font-semibold text-dark mb-4 flex items-center gap-2 text-sm">
              <AlertTriangle size={16} className="text-amber-500" /> Нарушения ({result.violations.length})
            </h3>
            <div className="space-y-2">
              {result.violations.map((v, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/15 rounded-xl text-sm border border-amber-100/50 dark:border-amber-900/20">
                  <span className="text-[10px] font-semibold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-md">{v.type}</span>
                  <span className="text-gray-600 dark:text-gray-400 flex-1 text-xs">{v.details}</span>
                  <span className="text-[10px] text-gray-400">
                    {new Date(v.timestamp).toLocaleTimeString('ru-RU')}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Detailed Answer Review */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200/60 dark:border-slate-700/50 shadow-card overflow-hidden mb-6"
        >
          <button
            onClick={() => setShowReview(!showReview)}
            className="w-full flex items-center justify-between p-5 hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors"
          >
            <h3 className="font-semibold text-dark flex items-center gap-2 text-sm">
              <FileText size={16} className="text-primary-500" />
              Подробный разбор ответов ({correct} из {total} верно)
            </h3>
            {showReview ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
          </button>

          {showReview && (
            <div className="border-t border-gray-100 dark:border-slate-700 p-5 space-y-3">
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
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className={`p-4 rounded-xl border ${
                      answer.isCorrect
                        ? 'border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-900/10'
                        : isEssay && answer.pointsEarned === 0
                          ? 'border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-900/10'
                          : 'border-red-200 dark:border-red-800/50 bg-red-50/50 dark:bg-red-900/10'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-start gap-2 flex-1">
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${
                          answer.isCorrect
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : isEssay && answer.pointsEarned === 0
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {i + 1}
                        </span>
                        <p className="text-sm font-medium text-dark leading-relaxed prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: qText }} />
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                        {answer.isCorrect ? (
                          <CheckCircle size={16} className="text-emerald-500" />
                        ) : isEssay && answer.pointsEarned === 0 ? (
                          <HelpCircle size={16} className="text-amber-500" />
                        ) : (
                          <XCircle size={16} className="text-red-500" />
                        )}
                        <span className="text-xs font-medium text-gray-400">
                          {answer.pointsEarned}/{maxPts}
                        </span>
                      </div>
                    </div>

                    {/* User's answer */}
                    <div className="ml-9 space-y-2">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">Ваш ответ:</span>
                        <p className={`text-sm mt-0.5 ${
                          answer.isCorrect ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'
                        }`}>
                          {userAnswerText || <span className="italic text-gray-400">Нет ответа</span>}
                        </p>
                      </div>

                      {/* Correct answer (if wrong) */}
                      {!answer.isCorrect && correctAnswerText && !isEssay && (
                        <div>
                          <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">Правильный ответ:</span>
                          <p className="text-sm mt-0.5 text-emerald-700 dark:text-emerald-400 font-medium">
                            {correctAnswerText}
                          </p>
                        </div>
                      )}

                      {/* Essay pending notice */}
                      {isEssay && answer.pointsEarned === 0 && !answer.feedback && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 italic">
                          В ожидании проверки преподавателем
                        </p>
                      )}

                      {/* Teacher feedback for essay */}
                      {answer.feedback && (
                        <div className="mt-2 p-2.5 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-100/50 dark:border-purple-900/30">
                          <span className="text-[10px] uppercase tracking-wider font-semibold text-purple-500">Комментарий преподавателя:</span>
                          <p className="text-xs text-purple-700 dark:text-purple-300 mt-0.5">{answer.feedback}</p>
                        </div>
                      )}

                      {/* Explanation */}
                      {question?.explanation && (
                        <div className="mt-2 p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100/50 dark:border-blue-900/30">
                          <span className="text-[10px] uppercase tracking-wider font-semibold text-blue-500">Пояснение:</span>
                          <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">{question.explanation}</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Comments */}
          {result?.test?._id && (
            <CommentsSection testId={result.test._id} />
          )}
        </motion.div>
      </div>
    </div>
  );
}
