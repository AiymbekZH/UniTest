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
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="glass-card-solid p-8 sm:p-10 mb-6"
        >
          <div className="flex flex-col sm:flex-row items-center gap-8">
            {/* SVG Circular Progress Ring */}
            <div className="relative flex-shrink-0">
              <svg width="160" height="160" viewBox="0 0 160 160">
                {/* Background circle */}
                <circle
                  cx="80" cy="80" r="68"
                  fill="none"
                  stroke="currentColor"
                  className="text-gray-100 dark:text-slate-700"
                  strokeWidth="10"
                />
                {/* Progress circle */}
                <motion.circle
                  cx="80" cy="80" r="68"
                  fill="none"
                  stroke={result.percentage >= 75 ? '#10B981' : result.percentage >= 50 ? '#F59E0B' : '#EF4444'}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 68}
                  strokeDashoffset={2 * Math.PI * 68}
                  animate={{ strokeDashoffset: 2 * Math.PI * 68 * (1 - result.percentage / 100) }}
                  transition={{ duration: 1.2, delay: 0.3, ease: 'easeOut' }}
                  transform="rotate(-90 80 80)"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">{result.percentage}%</span>
                <span className={`text-xs font-semibold mt-0.5 ${grade.color}`}>{grade.label}</span>
              </div>
            </div>

            {/* Info + stats */}
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 tracking-tight mb-1">
                {result.test?.title || 'Результат теста'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                {result.score} из {result.totalPoints} баллов
              </p>

              {/* Compact stat row with vertical dividers */}
              <div className="flex items-center justify-center sm:justify-start gap-0">
                <div className="flex items-center gap-2 px-4 first:pl-0">
                  <CheckCircle size={15} className="text-emerald-500" />
                  <div>
                    <p className="text-lg font-bold text-gray-900 dark:text-gray-100 leading-none">{correct}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Верно</p>
                  </div>
                </div>
                <div className="divider-vertical h-8" />
                <div className="flex items-center gap-2 px-4">
                  <XCircle size={15} className="text-red-500" />
                  <div>
                    <p className="text-lg font-bold text-gray-900 dark:text-gray-100 leading-none">{wrong}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Неверно</p>
                  </div>
                </div>
                <div className="divider-vertical h-8" />
                <div className="flex items-center gap-2 px-4">
                  <Clock size={15} className="text-blue-500" />
                  <div>
                    <p className="text-lg font-bold text-gray-900 dark:text-gray-100 leading-none">{formatTime(result.timeSpent)}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Время</p>
                  </div>
                </div>
                {result.violationCount > 0 && (
                  <>
                    <div className="divider-vertical h-8" />
                    <div className="flex items-center gap-2 px-4">
                      <AlertTriangle size={15} className="text-amber-500" />
                      <div>
                        <p className="text-lg font-bold text-gray-900 dark:text-gray-100 leading-none">{result.violationCount}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">Нарушения</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons row: Certificate + Leaderboard */}
          <div className="flex items-center justify-center sm:justify-start gap-3 mt-7 pt-6 border-t border-gray-100 dark:border-slate-700">
            {result.percentage >= 50 && (
              <button
                onClick={downloadCertificate}
                className="btn-primary py-2.5 px-5 text-sm flex items-center gap-2"
              >
                <Download size={15} /> Сертификат
              </button>
            )}
            {result.test?._id && (
              <button
                onClick={() => navigate(`/leaderboard/${result.test._id}`)}
                className="btn-secondary py-2.5 px-5 text-sm flex items-center gap-2"
              >
                <Award size={15} className="text-amber-500" /> Лидеры
              </button>
            )}
          </div>

          {/* Inline rating */}
          {result.test?._id && (
            <div className="flex items-center justify-center sm:justify-start gap-3 mt-5 pt-5 border-t border-gray-100 dark:border-slate-700">
              <span className="text-xs text-gray-400">Оцените тест:</span>
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    onClick={() => !ratingSubmitted && submitRating(star)}
                    onMouseEnter={() => !ratingSubmitted && setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    disabled={ratingSubmitted}
                    className="p-0.5 transition-transform hover:scale-110 disabled:cursor-default"
                  >
                    <Star
                      size={22}
                      className={`transition-colors ${
                        (hoverRating || userRating) >= star
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-gray-300 dark:text-slate-600'
                      }`}
                    />
                  </button>
                ))}
              </div>
              {ratingSubmitted && (
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  {userRating}/5
                </span>
              )}
            </div>
          )}
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
          className="glass-card-solid overflow-hidden mb-6"
        >
          <button
            onClick={() => setShowReview(!showReview)}
            className="w-full flex items-center justify-between p-5 hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <FileText size={16} className="text-primary-600 dark:text-primary-400" />
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Разбор ответов</span>
              <span className="text-xs text-gray-400">{correct} из {total} верно</span>
            </div>
            {showReview ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
          </button>

          {/* Progress bar showing correct/incorrect ratio */}
          <div className="px-5">
            <div className="flex rounded-full overflow-hidden h-1.5 bg-gray-100 dark:bg-slate-700">
              {correct > 0 && (
                <div className="bg-emerald-500 h-full" style={{ width: `${(correct / total) * 100}%` }} />
              )}
              {wrong > 0 && (
                <div className="bg-red-400 h-full" style={{ width: `${(wrong / total) * 100}%` }} />
              )}
            </div>
          </div>

          {showReview && (
            <div className="border-t border-gray-100 dark:border-slate-700 mt-4 p-5 space-y-3">
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
                    className={`p-4 rounded-xl border ${
                      answer.isCorrect
                        ? 'border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/30 dark:bg-emerald-900/10'
                        : isEssay && answer.pointsEarned === 0
                          ? 'border-amber-200 dark:border-amber-800/50 bg-amber-50/30 dark:bg-amber-900/10'
                          : 'border-red-200 dark:border-red-800/50 bg-red-50/30 dark:bg-red-900/10'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-start gap-2.5 flex-1">
                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5 ${
                          answer.isCorrect
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : isEssay && answer.pointsEarned === 0
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {i + 1}
                        </span>
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: qText }} />
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                        {answer.isCorrect ? (
                          <CheckCircle size={16} className="text-emerald-500" />
                        ) : isEssay && answer.pointsEarned === 0 ? (
                          <HelpCircle size={16} className="text-amber-500" />
                        ) : (
                          <XCircle size={16} className="text-red-500" />
                        )}
                        <span className="text-[11px] font-medium text-gray-400">
                          {answer.pointsEarned}/{maxPts}
                        </span>
                      </div>
                    </div>

                    {/* User's answer */}
                    <div className="ml-8.5 space-y-2 pl-[34px]">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">Ваш ответ:</span>
                        <p className={`text-sm mt-0.5 ${
                          answer.isCorrect ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
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
                        <div className="mt-2 p-2.5 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                          <span className="text-[10px] uppercase tracking-wider font-semibold text-purple-500">Комментарий преподавателя:</span>
                          <p className="text-xs text-purple-700 dark:text-purple-300 mt-0.5">{answer.feedback}</p>
                        </div>
                      )}

                      {/* Explanation */}
                      {question?.explanation && (
                        <div className="mt-2 p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <span className="text-[10px] uppercase tracking-wider font-semibold text-blue-500">Пояснение:</span>
                          <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">{question.explanation}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
