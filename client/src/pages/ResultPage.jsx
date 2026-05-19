import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy, Clock, AlertTriangle, CheckCircle, XCircle,
  ArrowLeft, Share2, Star, BarChart3, FileText, HelpCircle,
  ChevronDown, ChevronUp, Award, Download, RotateCcw, Dumbbell,
  Search, Filter, TrendingUp, TrendingDown, Target, Lightbulb,
  Sparkles, ArrowRight, Users, Zap, Crown, Medal, Hash,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  LineChart, Line,
} from 'recharts';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import CommentsSection from '../components/CommentsSection';
import Confetti from '../components/ui/Confetti';
import { LottieIcon } from '../components/LottieIcon';
import { useCelebration } from '../components/celebration/CelebrationEngine';

const PIE_COLORS = ['#10B981', '#EF4444'];
const TABS = [
  { id: 'overview', label: 'Обзор', icon: BarChart3 },
  { id: 'review', label: 'Разбор', icon: FileText },
  { id: 'analysis', label: 'Анализ', icon: Target },
  { id: 'compare', label: 'Сравнение', icon: TrendingUp },
];

function formatTime(seconds) {
  const total = Math.max(0, Math.round(seconds || 0));
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m === 0) return `${s} сек`;
  return `${m} мин ${s} сек`;
}

function getGradeInfo(pct) {
  if (pct >= 90) return { label: 'Отлично', color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-900/20', shadow: '#065f46', icon: Trophy, iconColor: 'text-emerald-500' };
  if (pct >= 75) return { label: 'Хорошо', color: 'text-primary-700 dark:text-primary-300', bg: 'bg-primary-50 dark:bg-primary-900/20', shadow: '#9a3412', icon: Award, iconColor: 'text-primary-500' };
  if (pct >= 50) return { label: 'Удовлетворительно', color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-50 dark:bg-amber-900/20', shadow: '#78350f', icon: FileText, iconColor: 'text-amber-500' };
  return { label: 'Неудовлетворительно', color: 'text-red-700 dark:text-red-300', bg: 'bg-red-50 dark:bg-red-900/20', shadow: '#7f1d1d', icon: AlertTriangle, iconColor: 'text-red-500' };
}

function getDifficultyMeta(score) {
  const value = Number(score || 0);
  if (!value) return { label: 'Нет оценок', badge: 'border-slate-300 bg-slate-50 text-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400' };
  if (value >= 4.5) return { label: 'Очень сложная', badge: 'border-red-300 bg-red-50 text-red-700 dark:border-red-600 dark:bg-red-900/30 dark:text-red-300' };
  if (value >= 3.5) return { label: 'Сложная', badge: 'border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-600 dark:bg-orange-900/30 dark:text-orange-300' };
  if (value >= 2.5) return { label: 'Средняя', badge: 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-600 dark:bg-amber-900/30 dark:text-amber-300' };
  if (value >= 1.5) return { label: 'Легко', badge: 'border-lime-300 bg-lime-50 text-lime-700 dark:border-lime-600 dark:bg-lime-900/30 dark:text-lime-300' };
  return { label: 'Очень легко', badge: 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300' };
}

export default function ResultPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Core
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  // Tabs
  const [activeTab, setActiveTab] = useState('overview');

  // Confetti
  const [showConfetti, setShowConfetti] = useState(false);

  // Rating
  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [userDifficulty, setUserDifficulty] = useState(0);
  const [hoverDifficulty, setHoverDifficulty] = useState(0);
  const [difficultySubmitted, setDifficultySubmitted] = useState(false);

  // Review filters
  const [reviewFilter, setReviewFilter] = useState('all'); // all | wrong | correct | pending
  const [reviewSearch, setReviewSearch] = useState('');

  // Phase 5 data (lazy)
  const [comparison, setComparison] = useState(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [history, setHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  // Mobile actions menu
  const [showActionsMenu, setShowActionsMenu] = useState(false);

  // ── Fetch core ──
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get(`/results/${id}`)
      .then(res => { if (!cancelled) setResult(res.data); })
      .catch(() => { if (!cancelled) toast.error('Результат не найден'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  // ── Confetti at >=80% (once per result via sessionStorage) ──
  const celebrate = useCelebration();
  useEffect(() => {
    if (!result) return;
    if (result.percentage < 80) return;
    const key = `confetti_seen_${result._id}`;
    if (sessionStorage.getItem(key) === '1') return;
    sessionStorage.setItem(key, '1');
    setShowConfetti(true);
    if (result.percentage === 100) {
      celebrate({ kind: 'perfect', testTitle: result.test?.title });
    }
    const t = setTimeout(() => setShowConfetti(false), 3500);
    return () => clearTimeout(t);
  }, [result]);

  // ── My rating + difficulty ──
  useEffect(() => {
    if (!result?.test?._id || !user) return;
    api.get(`/tests/${result.test._id}/my-rating`)
      .then(res => {
        if (res.data.rating > 0) {
          setUserRating(res.data.rating);
          setRatingSubmitted(true);
        }
      }).catch(() => {});
    api.get(`/tests/${result.test._id}/my-difficulty-rating`)
      .then(res => {
        if (res.data.difficulty > 0) {
          setUserDifficulty(res.data.difficulty);
          setDifficultySubmitted(true);
        }
      }).catch(() => {});
  }, [result, user]);

  // ── Lazy: comparison ──
  useEffect(() => {
    if (activeTab !== 'compare' || !result || comparison || comparisonLoading) return;
    setComparisonLoading(true);
    api.get(`/results/${id}/comparison`)
      .then(res => setComparison(res.data))
      .catch(() => setComparison(null))
      .finally(() => setComparisonLoading(false));
  }, [activeTab, result, id, comparison, comparisonLoading]);

  // ── Lazy: history ──
  useEffect(() => {
    if (activeTab !== 'compare' || !result || history || historyLoading) return;
    setHistoryLoading(true);
    api.get(`/results/${id}/my-history`)
      .then(res => setHistory(res.data))
      .catch(() => setHistory(null))
      .finally(() => setHistoryLoading(false));
  }, [activeTab, result, id, history, historyLoading]);

  // ── Lazy: topic analysis ──
  useEffect(() => {
    if (activeTab !== 'analysis' || !result || analysis || analysisLoading) return;
    setAnalysisLoading(true);
    api.get(`/results/${id}/topic-analysis`)
      .then(res => setAnalysis(res.data))
      .catch(() => setAnalysis(null))
      .finally(() => setAnalysisLoading(false));
  }, [activeTab, result, id, analysis, analysisLoading]);

  // ── Derived ──
  const correct = useMemo(() => result?.answers?.filter(a => a.isCorrect).length || 0, [result]);
  const wrong = useMemo(() => result?.answers?.filter(a => !a.isCorrect).length || 0, [result]);
  const total = result?.answers?.length || 0;

  const pieData = useMemo(() => ([
    { name: 'Верно', value: correct },
    { name: 'Неверно', value: wrong },
  ]), [correct, wrong]);

  const barData = useMemo(() => result?.answers?.map((a, i) => ({
    name: `№${i + 1}`,
    earned: a.pointsEarned,
    max: result.test?.questions?.find(q => q.id === a.questionId)?.points || 1,
  })) || [], [result]);

  // Time-per-question metric
  const timePerQuestion = useMemo(() => {
    if (!result?.timeSpent || !total) return null;
    return Math.round(result.timeSpent / total);
  }, [result, total]);

  // Filtered review
  const filteredAnswers = useMemo(() => {
    if (!result?.answers) return [];
    const q = reviewSearch.trim().toLowerCase();
    return result.answers.filter(a => {
      const question = result.test?.questions?.find(qq => qq.id === a.questionId);
      const isPending = (a.type || question?.type) === 'essay' && a.pointsEarned === 0 && !a.feedback;
      if (reviewFilter === 'correct' && !a.isCorrect) return false;
      if (reviewFilter === 'wrong' && (a.isCorrect || isPending)) return false;
      if (reviewFilter === 'pending' && !isPending) return false;
      if (q) {
        const text = (a.questionText || question?.questionText || '').toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [result, reviewFilter, reviewSearch]);

  // ── Actions ──
  const submitRating = async (rating) => {
    setUserRating(rating);
    try {
      const res = await api.post(`/tests/${result.test?._id}/rate`, { rating });
      setRatingSubmitted(true);
      toast.success(res.data.alreadyRated ? 'Оценка обновлена!' : 'Спасибо за оценку!');
    } catch (e) { toast.error('Ошибка отправки оценки'); }
  };

  const submitDifficulty = async (difficulty) => {
    setUserDifficulty(difficulty);
    try {
      await api.post(`/tests/${result.test?._id}/rate-difficulty`, { difficulty });
      setDifficultySubmitted(true);
      toast.success('Спасибо за оценку сложности!');
    } catch (_) { toast.error('Ошибка отправки оценки сложности'); }
  };

  const handleShare = async () => {
    const text = `Я набрал(а) ${result.percentage}% (${result.score}/${result.totalPoints}) в тесте «${result.test?.title}» на UniTest 🎯`;
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Мой результат на UniTest', text, url });
      } else {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        toast.success('Скопировано в буфер');
      }
    } catch (e) {
      try {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        toast.success('Скопировано в буфер');
      } catch (_) {
        toast.error('Не удалось поделиться');
      }
    }
  };

  const handleRetake = () => {
    if (!result?.test?.shareLink) return;
    navigate(`/test/${result.test.shareLink}`);
  };

  const handlePractice = () => {
    if (!result?.test?.shareLink) return;
    navigate(`/test/${result.test.shareLink}?practice=1`);
  };

  const downloadCertificate = () => {
    if (!result) return;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const W = 1200, H = 850;
    canvas.width = W;
    canvas.height = H;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = '#ea580c';
    ctx.lineWidth = 4;
    ctx.strokeRect(20, 20, W - 40, H - 40);
    ctx.strokeStyle = '#fed7aa';
    ctx.lineWidth = 1;
    ctx.strokeRect(30, 30, W - 60, H - 60);

    const drawCorner = (x, y, dx, dy) => {
      ctx.beginPath();
      ctx.moveTo(x, y + dy * 40);
      ctx.lineTo(x, y);
      ctx.lineTo(x + dx * 40, y);
      ctx.strokeStyle = '#ea580c';
      ctx.lineWidth = 3;
      ctx.stroke();
    };
    drawCorner(35, 35, 1, 1);
    drawCorner(W - 35, 35, -1, 1);
    drawCorner(35, H - 35, 1, -1);
    drawCorner(W - 35, H - 35, -1, -1);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ea580c';
    ctx.font = '600 14px Inter, sans-serif';
    ctx.fillText('CERTIFICATE OF COMPLETION', W / 2, 100);

    ctx.beginPath();
    ctx.moveTo(W / 2 - 80, 115);
    ctx.lineTo(W / 2 + 80, 115);
    ctx.strokeStyle = '#fed7aa';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#6b7280';
    ctx.font = '400 16px Inter, sans-serif';
    ctx.fillText('This certifies that', W / 2, 160);

    const studentName = result.user
      ? `${result.user.lastName} ${result.user.firstName}`
      : result.guestName || 'Student';
    ctx.fillStyle = '#1f2937';
    ctx.font = '700 36px Inter, sans-serif';
    ctx.fillText(studentName, W / 2, 220);

    const nameWidth = ctx.measureText(studentName).width;
    ctx.beginPath();
    ctx.moveTo(W / 2 - nameWidth / 2 - 20, 232);
    ctx.lineTo(W / 2 + nameWidth / 2 + 20, 232);
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#6b7280';
    ctx.font = '400 16px Inter, sans-serif';
    ctx.fillText('has successfully completed the test', W / 2, 275);

    const testTitle = result.test?.title || 'Test';
    ctx.fillStyle = '#c2410c';
    ctx.font = '600 28px Inter, sans-serif';
    let displayTitle = testTitle;
    if (ctx.measureText(testTitle).width > W - 200) {
      while (ctx.measureText(displayTitle + '...').width > W - 200 && displayTitle.length > 0) {
        displayTitle = displayTitle.slice(0, -1);
      }
      displayTitle += '...';
    }
    ctx.fillText(displayTitle, W / 2, 325);

    ctx.fillStyle = '#1f2937';
    ctx.font = '700 64px Inter, sans-serif';
    ctx.fillText(`${result.percentage}%`, W / 2, 430);

    ctx.fillStyle = '#6b7280';
    ctx.font = '400 16px Inter, sans-serif';
    ctx.fillText(`${result.score} / ${result.totalPoints} points`, W / 2, 465);

    const gradeLabel = getGradeInfo(result.percentage).label;
    const gradeColor = result.percentage >= 75 ? '#10b981' : result.percentage >= 50 ? '#f59e0b' : '#ef4444';
    ctx.fillStyle = gradeColor;
    ctx.font = '600 20px Inter, sans-serif';
    ctx.fillText(gradeLabel, W / 2, 505);

    ctx.fillStyle = '#9ca3af';
    ctx.font = '400 13px Inter, sans-serif';
    ctx.fillText(
      `${correct} correct  |  ${wrong} incorrect  |  Time: ${formatTime(result.timeSpent)}`,
      W / 2, 545
    );

    ctx.beginPath();
    ctx.moveTo(200, 580);
    ctx.lineTo(W - 200, 580);
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#6b7280';
    ctx.font = '400 14px Inter, sans-serif';
    const dateStr = new Date(result.completedAt || result.createdAt).toLocaleDateString('ru-RU', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
    ctx.fillText(dateStr, W / 2, 620);

    ctx.fillStyle = '#fed7aa';
    ctx.font = '600 12px Inter, sans-serif';
    ctx.fillText('UniTest Platform', W / 2, 780);

    ctx.fillStyle = '#d1d5db';
    ctx.font = '400 10px Inter, sans-serif';
    ctx.fillText(`ID: ${result._id}`, W / 2, 800);

    const link = document.createElement('a');
    link.download = `certificate_${result._id.slice(-6)}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    toast.success('Сертификат скачан!');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
    );
  }
  if (!result) return null;

  const grade = getGradeInfo(result.percentage);
  const GradeIcon = grade.icon;
  const difficultyMeta = getDifficultyMeta(result.test?.difficultyScore);
  const canRetake = !result.isPractice && result.test?.shareLink;
  const showCertificate = !result.isPractice && result.percentage >= 50;

  return (
    <div className="min-h-screen bg-surface pb-12">
      {showConfetti && <Confetti active duration={2400} count={140} />}

      {/* ─── STICKY HEADER ─── */}
      <div className="sticky top-0 z-30 border-b-2 border-slate-200 bg-white/95 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/95">
        <div className="mx-auto max-w-5xl px-3 py-3 sm:px-6 sm:py-4">
          {/* Top row: back + title + actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border-2 border-slate-900 bg-white text-slate-900 transition active:translate-y-[2px] dark:border-white dark:bg-slate-800 dark:text-white"
              style={{ boxShadow: '0 3px 0 #0f172a' }}
              aria-label="Назад"
            >
              <ArrowLeft size={15} strokeWidth={2.6} />
            </button>

            <div className="min-w-0 flex-1">
              <p className="truncate text-[10px] font-black uppercase tracking-widest text-slate-400">
                {result.isPractice ? 'Тренировка' : 'Результат'}
              </p>
              <p className="truncate text-sm font-black text-slate-900 dark:text-white sm:text-base">
                {result.test?.title || 'Тест'}
              </p>
            </div>

            {/* Desktop actions */}
            <div className="hidden items-center gap-2 sm:flex">
              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center gap-1.5 rounded-xl border-2 border-slate-900 bg-white px-3 py-2 text-xs font-black text-slate-700 transition active:translate-y-[2px] dark:border-white dark:bg-slate-800 dark:text-slate-200"
                style={{ boxShadow: '0 3px 0 #0f172a' }}
                title="Поделиться"
              >
                <Share2 size={13} strokeWidth={2.6} /> Поделиться
              </button>
              {canRetake && (
                <button
                  type="button"
                  onClick={handleRetake}
                  className="inline-flex items-center gap-1.5 rounded-xl border-2 border-primary-700 bg-primary-50 px-3 py-2 text-xs font-black text-primary-700 transition active:translate-y-[2px] dark:border-primary-300 dark:bg-primary-900/30 dark:text-primary-300"
                  style={{ boxShadow: '0 3px 0 #9a3412' }}
                  title="Пройти ещё раз"
                >
                  <RotateCcw size={13} strokeWidth={2.6} /> Ещё раз
                </button>
              )}
            </div>

            {/* Mobile actions menu */}
            <div className="relative sm:hidden">
              <button
                type="button"
                onClick={() => setShowActionsMenu(prev => !prev)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border-2 border-slate-900 bg-white text-slate-700 transition active:translate-y-[2px] dark:border-white dark:bg-slate-800 dark:text-slate-200"
                style={{ boxShadow: '0 3px 0 #0f172a' }}
                aria-label="Действия"
              >
                <Sparkles size={15} strokeWidth={2.6} />
              </button>
              <AnimatePresence>
                {showActionsMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowActionsMenu(false)} />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -6 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -6 }}
                      className="absolute right-0 top-11 z-20 w-44 overflow-hidden rounded-2xl border-2 border-slate-900 bg-white p-1 shadow-lg dark:border-white dark:bg-slate-800"
                      style={{ boxShadow: '0 4px 0 #0f172a' }}
                    >
                      <button onClick={() => { handleShare(); setShowActionsMenu(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700">
                        <Share2 size={13} strokeWidth={2.4} /> Поделиться
                      </button>
                      {canRetake && (
                        <button onClick={() => { handleRetake(); setShowActionsMenu(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700">
                          <RotateCcw size={13} strokeWidth={2.4} /> Ещё раз
                        </button>
                      )}
                      {result.test?.shareLink && (
                        <button onClick={() => { handlePractice(); setShowActionsMenu(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700">
                          <Dumbbell size={13} strokeWidth={2.4} /> Тренировка
                        </button>
                      )}
                      {showCertificate && (
                        <button onClick={() => { downloadCertificate(); setShowActionsMenu(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700">
                          <Download size={13} strokeWidth={2.4} /> Сертификат
                        </button>
                      )}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Hero metric */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 flex items-center gap-3 sm:mt-4 sm:gap-4"
          >
            <div
              className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl border-2 border-slate-900 ${grade.bg} dark:border-white sm:h-16 sm:w-16`}
              style={{ boxShadow: `0 4px 0 ${grade.shadow}` }}
            >
              <GradeIcon size={26} strokeWidth={2.4} className={grade.iconColor} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <h1 className="font-mono text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                  {result.percentage}%
                </h1>
                <span className={`text-xs font-black ${grade.color} sm:text-sm`}>{grade.label}</span>
              </div>
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 sm:text-xs">
                {result.score} из {result.totalPoints} баллов · {correct} верно из {total}
              </p>
            </div>
            <LottieIcon
              name="testSuccess"
              trigger="autoplay"
              loop={false}
              size={72}
              ariaLabel="Тест отправлен"
              className="ml-auto flex-shrink-0"
            />
          </motion.div>

          {/* Tabs */}
          <div className="no-scrollbar mt-3 flex gap-1.5 overflow-x-auto sm:mt-4 sm:gap-2">
            {TABS.map(t => {
              const Icon = t.icon;
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`inline-flex flex-shrink-0 items-center gap-1.5 rounded-xl border-2 px-3 py-1.5 text-[11px] font-black transition active:translate-y-[1px] sm:text-xs ${
                    isActive
                      ? 'border-slate-900 bg-primary-500 text-white dark:border-white'
                      : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                  style={isActive ? { boxShadow: '0 3px 0 #9a3412' } : undefined}
                >
                  <Icon size={12} strokeWidth={2.6} />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── TAB CONTENT ─── */}
      <main className="mx-auto max-w-5xl px-3 py-4 sm:px-6 sm:py-6">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.section
              key="overview"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-4 sm:space-y-5"
            >
              {/* Metrics tiles */}
              <div className="grid grid-cols-2 gap-3 [&>*]:min-w-0 sm:grid-cols-4">
                <MetricTile icon={CheckCircle} label="Верно" value={correct} color="emerald" shadow="#065f46" />
                <MetricTile icon={XCircle} label="Неверно" value={wrong} color="red" shadow="#7f1d1d" />
                <MetricTile icon={Clock} label="Время" value={formatTime(result.timeSpent)} color="primary" shadow="#9a3412" mono />
                <MetricTile icon={AlertTriangle} label="Нарушения" value={result.violationCount || 0} color="amber" shadow="#78350f" />
              </div>

              {/* Time efficiency */}
              {timePerQuestion !== null && (
                <div className="chunky-card flex items-center gap-3 p-4 sm:p-5">
                  <div
                    className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border-2 border-slate-900 bg-blue-50 text-blue-600 dark:border-white dark:bg-blue-900/20 dark:text-blue-300"
                    style={{ boxShadow: '0 3px 0 #1e3a8a' }}
                  >
                    <Zap size={18} strokeWidth={2.4} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Темп</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white sm:text-base">
                      ~{timePerQuestion} сек на вопрос · всего {total}
                    </p>
                  </div>
                </div>
              )}

              {/* Charts */}
              <div className="grid gap-4 [&>*]:min-w-0 lg:grid-cols-2">
                <div className="chunky-card p-4 sm:p-5">
                  <h3 className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    <BarChart3 size={14} strokeWidth={2.6} className="text-primary-500" /> Распределение
                  </h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value">
                        {pieData.map((_, i) => (<Cell key={i} fill={PIE_COLORS[i]} />))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-1 flex justify-center gap-4 text-xs">
                    <span className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300"><span className="h-3 w-3 rounded-full bg-emerald-500" /> Верно ({correct})</span>
                    <span className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300"><span className="h-3 w-3 rounded-full bg-red-500" /> Неверно ({wrong})</span>
                  </div>
                </div>

                <div className="chunky-card p-4 sm:p-5">
                  <h3 className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    <Trophy size={14} strokeWidth={2.6} className="text-amber-500" /> Баллы по вопросам
                  </h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={barData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="earned" fill="#EA580C" radius={[4, 4, 0, 0]} name="Набрано" />
                      <Bar dataKey="max" fill="#FED7AA" radius={[4, 4, 0, 0]} name="Максимум" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Quick actions row */}
              <div className="chunky-card p-4 sm:p-5">
                <p className="mb-3 text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Действия</p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 [&>*]:min-w-0">
                  {result.test?.shareLink && (
                    <ActionButton onClick={handlePractice} icon={Dumbbell} label="Тренировка" sub="без оценки" color="border-emerald-700 bg-emerald-50 text-emerald-700 dark:border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300" shadow="#065f46" />
                  )}
                  {!result.isPractice && result.test?._id && (
                    <ActionButton onClick={() => navigate(`/leaderboard/${result.test._id}`)} icon={Crown} label="Лидерборд" sub="топ участников" color="border-amber-700 bg-amber-50 text-amber-700 dark:border-amber-300 dark:bg-amber-900/30 dark:text-amber-300" shadow="#78350f" />
                  )}
                  {showCertificate && (
                    <ActionButton onClick={downloadCertificate} icon={Download} label="Сертификат" sub="PNG, 1200×850" color="border-primary-700 bg-primary-50 text-primary-700 dark:border-primary-300 dark:bg-primary-900/30 dark:text-primary-300" shadow="#9a3412" />
                  )}
                  <ActionButton onClick={handleShare} icon={Share2} label="Поделиться" sub="ссылка + текст" color="border-blue-700 bg-blue-50 text-blue-700 dark:border-blue-300 dark:bg-blue-900/30 dark:text-blue-300" shadow="#1e3a8a" />
                </div>
              </div>

              {/* Star rating */}
              {result.test?._id && (
                <div className="chunky-card p-5 text-center">
                  <h3 className="mb-1 flex items-center justify-center gap-2 text-sm font-black text-slate-900 dark:text-white">
                    <Star size={16} className="text-amber-500" /> Оцените тест
                  </h3>
                  <p className="mb-3 text-xs font-medium text-slate-500 dark:text-slate-400">Помогите другим выбрать качественные тесты</p>
                  <div className="flex items-center justify-center gap-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <motion.button
                        key={star}
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.92 }}
                        onClick={() => !ratingSubmitted && submitRating(star)}
                        onMouseEnter={() => !ratingSubmitted && setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        disabled={ratingSubmitted}
                        className="p-1 disabled:cursor-default"
                      >
                        <Star
                          size={32}
                          className={`transition-colors ${
                            (hoverRating || userRating) >= star
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-slate-300 dark:text-slate-600'
                          }`}
                        />
                      </motion.button>
                    ))}
                  </div>
                  {ratingSubmitted && userRating > 0 && (
                    <p className="mt-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">Ваша оценка: {userRating}/5</p>
                  )}
                  <p className="mt-2 text-[11px] font-medium text-slate-400">Всего оценок: {result.test?.ratingCount || 0}</p>

                  {/* Difficulty rating */}
                  <div className="mt-5 border-t-2 border-dashed border-slate-200 pt-4 dark:border-slate-700">
                    <h4 className="mb-3 text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Сложность</h4>
                    <div className="grid grid-cols-5 gap-1.5 [&>*]:min-w-0">
                      {[1, 2, 3, 4, 5].map(level => {
                        const colorMap = {
                          1: { active: 'bg-emerald-500', label: 'Очень легко' },
                          2: { active: 'bg-lime-500', label: 'Легко' },
                          3: { active: 'bg-amber-500', label: 'Средняя' },
                          4: { active: 'bg-orange-500', label: 'Сложная' },
                          5: { active: 'bg-red-500', label: 'Очень сложная' },
                        };
                        const meta = colorMap[level];
                        const isHovered = hoverDifficulty >= level;
                        const isSelected = userDifficulty >= level;
                        const isActive = isHovered || isSelected;
                        return (
                          <motion.button
                            key={`d-${level}`}
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => !difficultySubmitted && submitDifficulty(level)}
                            onMouseEnter={() => !difficultySubmitted && setHoverDifficulty(level)}
                            onMouseLeave={() => setHoverDifficulty(0)}
                            disabled={difficultySubmitted}
                            className={`flex flex-col items-center justify-center rounded-xl border-2 px-1 py-2 text-[9px] font-black transition disabled:cursor-default sm:text-[10px] ${
                              isActive
                                ? `${meta.active} border-slate-900 text-white dark:border-white`
                                : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                            style={isActive ? { boxShadow: '0 2px 0 #0f172a' } : undefined}
                          >
                            <span className="text-sm font-black">{level}</span>
                            <span className="mt-0.5 leading-tight">{meta.label}</span>
                          </motion.button>
                        );
                      })}
                    </div>
                    <div className="mt-3 flex justify-center">
                      <span className={`inline-flex items-center gap-2 rounded-full border-2 px-3 py-1 text-[10px] font-black uppercase tracking-widest ${difficultyMeta.badge}`}>
                        {difficultyMeta.label}
                        <span className="opacity-50">|</span>
                        {result.test?.difficultyScore ? result.test.difficultyScore.toFixed(1) : '0.0'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Comments */}
              {result.test?._id && (
                <div className="chunky-card overflow-hidden">
                  <CommentsSection testId={result.test._id} />
                </div>
              )}
            </motion.section>
          )}

          {activeTab === 'review' && (
            <motion.section
              key="review"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {/* Toolbar */}
              <div className="chunky-card space-y-3 p-3 sm:p-4">
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" strokeWidth={2.4} />
                  <input
                    type="text"
                    value={reviewSearch}
                    onChange={(e) => setReviewSearch(e.target.value)}
                    placeholder="Поиск по тексту вопроса..."
                    className="w-full rounded-xl border-2 border-slate-300 bg-white py-2 pl-9 pr-9 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                  />
                  {reviewSearch && (
                    <button onClick={() => setReviewSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700">
                      <XCircle size={13} />
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'all', label: 'Все', count: total },
                    { id: 'wrong', label: 'Неверные', count: wrong },
                    { id: 'correct', label: 'Верные', count: correct },
                    { id: 'pending', label: 'На проверке', count: result.answers?.filter(a => (a.type === 'essay' || result.test?.questions?.find(q => q.id === a.questionId)?.type === 'essay') && a.pointsEarned === 0 && !a.feedback).length || 0 },
                  ].map(f => {
                    const isActive = reviewFilter === f.id;
                    return (
                      <button
                        key={f.id}
                        onClick={() => setReviewFilter(f.id)}
                        className={`inline-flex items-center gap-1.5 rounded-xl border-2 px-2.5 py-1 text-[11px] font-black transition active:translate-y-[1px] ${
                          isActive
                            ? 'border-slate-900 bg-primary-500 text-white dark:border-white'
                            : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                        style={isActive ? { boxShadow: '0 2px 0 #9a3412' } : undefined}
                      >
                        {f.label}
                        <span className={`rounded-full px-1.5 text-[10px] ${isActive ? 'bg-white/30 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300'}`}>
                          {f.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] font-bold text-slate-400">
                  Найдено {filteredAnswers.length} из {total}
                </p>
              </div>

              {/* Answers list */}
              {filteredAnswers.length === 0 ? (
                <div className="chunky-card p-10 text-center">
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-slate-900 bg-slate-50 text-slate-400 dark:border-white dark:bg-slate-900/30" style={{ boxShadow: '0 3px 0 #0f172a' }}>
                    <Search size={26} strokeWidth={2.2} />
                  </div>
                  <p className="text-sm font-black text-slate-900 dark:text-white">Ничего не найдено</p>
                  <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">Попробуй сменить фильтр или очистить поиск</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredAnswers.map((answer, idx) => {
                    const originalIdx = result.answers.findIndex(a => a === answer);
                    const question = result.test?.questions?.find(q => q.id === answer.questionId);
                    const qText = answer.questionText || question?.questionText || `Вопрос ${originalIdx + 1}`;
                    const maxPts = answer.maxPoints || question?.points || 1;
                    const isEssay = (answer.type || question?.type) === 'essay';
                    const isPending = isEssay && answer.pointsEarned === 0 && !answer.feedback;

                    let correctAnswerText = '';
                    if (question) {
                      if (question.type === 'fill-blank') correctAnswerText = question.correctAnswer || '';
                      else if (question.type === 'essay') correctAnswerText = question.correctAnswer || 'Ручная проверка';
                      else if (question.type === 'matching') {
                        correctAnswerText = question.options?.filter(o => o.matchPair).map(o => `${o.text} → ${o.matchPair}`).join('; ') || '';
                      } else {
                        correctAnswerText = question.options?.filter(o => o.isCorrect).map(o => o.text).join(', ') || '';
                      }
                    }

                    let userAnswerText = answer.userAnswer || '';
                    if (!userAnswerText) {
                      if (answer.textAnswer) userAnswerText = answer.textAnswer;
                      else if (answer.selectedOptions?.length > 0 && question) {
                        userAnswerText = answer.selectedOptions.map(optId => question.options?.find(o => o.id === optId)?.text || optId).join(', ');
                      } else if (answer.matchingPairs?.length > 0 && question) {
                        userAnswerText = answer.matchingPairs.map(p => {
                          const left = question.options?.find(o => o.id === p.left)?.text || p.left;
                          return `${left} → ${p.right || ''}`;
                        }).join('; ');
                      }
                    }

                    const tone = answer.isCorrect ? 'emerald' : isPending ? 'amber' : 'red';
                    const toneStyles = {
                      emerald: { card: 'border-emerald-300 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-900/15', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', icon: <CheckCircle size={16} className="text-emerald-500" /> },
                      red: { card: 'border-red-300 bg-red-50 dark:border-red-600 dark:bg-red-900/15', badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', icon: <XCircle size={16} className="text-red-500" /> },
                      amber: { card: 'border-amber-300 bg-amber-50 dark:border-amber-600 dark:bg-amber-900/15', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', icon: <HelpCircle size={16} className="text-amber-500" /> },
                    };
                    const styles = toneStyles[tone];

                    return (
                      <motion.div
                        key={originalIdx}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.02 }}
                        className={`rounded-2xl border-2 p-4 ${styles.card}`}
                      >
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div className="flex flex-1 items-start gap-2">
                            <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-xs font-black ${styles.badge}`}>
                              {originalIdx + 1}
                            </span>
                            <p className="prose prose-sm max-w-none text-sm font-bold leading-relaxed text-slate-900 dark:prose-invert dark:text-white" dangerouslySetInnerHTML={{ __html: qText }} />
                          </div>
                          <div className="flex flex-shrink-0 items-center gap-1.5">
                            {styles.icon}
                            <span className="text-xs font-black text-slate-500 dark:text-slate-400">{answer.pointsEarned}/{maxPts}</span>
                          </div>
                        </div>
                        <div className="ml-9 space-y-2">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ваш ответ</p>
                            <p className={`mt-0.5 text-sm font-bold ${answer.isCorrect ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>
                              {userAnswerText || <span className="italic text-slate-400">Нет ответа</span>}
                            </p>
                          </div>
                          {!answer.isCorrect && correctAnswerText && !isEssay && (
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Правильный ответ</p>
                              <p className="mt-0.5 text-sm font-bold text-emerald-700 dark:text-emerald-300">{correctAnswerText}</p>
                            </div>
                          )}
                          {isPending && (
                            <p className="text-xs font-bold italic text-amber-600 dark:text-amber-400">В ожидании проверки преподавателем</p>
                          )}
                          {answer.feedback && (
                            <div className="mt-2 rounded-xl border-2 border-purple-300 bg-purple-50 p-2.5 dark:border-purple-600 dark:bg-purple-900/20">
                              <p className="text-[10px] font-black uppercase tracking-widest text-purple-500">Комментарий преподавателя</p>
                              <p className="mt-0.5 text-xs font-medium text-purple-700 dark:text-purple-300">{answer.feedback}</p>
                            </div>
                          )}
                          {question?.explanation && (
                            <div className="mt-2 rounded-xl border-2 border-primary-300 bg-primary-50 p-2.5 dark:border-primary-600 dark:bg-primary-900/20">
                              <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-primary-500">
                                <Lightbulb size={10} strokeWidth={2.6} /> Пояснение
                              </p>
                              <p className="mt-0.5 text-xs font-medium text-primary-700 dark:text-primary-300">{question.explanation}</p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.section>
          )}

          {activeTab === 'analysis' && (
            <motion.section
              key="analysis"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-4 sm:space-y-5"
            >
              {analysisLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="chunky-card animate-pulse p-5">
                      <div className="h-3 w-1/3 rounded bg-slate-200 dark:bg-slate-700" />
                      <div className="mt-3 h-4 rounded bg-slate-300 dark:bg-slate-600" />
                    </div>
                  ))}
                </div>
              ) : !analysis || analysis.byTopic.length === 0 ? (
                <div className="chunky-card p-10 text-center">
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-slate-900 bg-slate-50 text-slate-400 dark:border-white dark:bg-slate-900/30" style={{ boxShadow: '0 3px 0 #0f172a' }}>
                    <Target size={26} strokeWidth={2.2} />
                  </div>
                  <p className="text-sm font-black text-slate-900 dark:text-white">Нет данных для анализа</p>
                </div>
              ) : (
                <>
                  {/* Topic breakdown */}
                  <div className="chunky-card p-4 sm:p-5">
                    <h3 className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      <Target size={14} strokeWidth={2.6} className="text-primary-500" /> По типам вопросов
                    </h3>
                    <div className="space-y-3">
                      {analysis.byTopic.map(t => {
                        const barColor = t.weakness === 'high' ? 'bg-red-500' : t.weakness === 'medium' ? 'bg-amber-500' : 'bg-emerald-500';
                        const labelColor = t.weakness === 'high' ? 'text-red-700 dark:text-red-300' : t.weakness === 'medium' ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300';
                        return (
                          <div key={t.topicKey}>
                            <div className="mb-1 flex items-baseline justify-between gap-2">
                              <span className="truncate text-sm font-bold text-slate-900 dark:text-white">{t.topic}</span>
                              <span className={`flex-shrink-0 text-xs font-black ${labelColor}`}>
                                {t.correct}/{t.total} · {t.accuracy}%
                              </span>
                            </div>
                            <div className="relative h-3 overflow-hidden rounded-full border-2 border-slate-900 bg-slate-100 dark:border-white dark:bg-slate-800" style={{ boxShadow: '0 2px 0 #0f172a' }}>
                              <div className={`absolute inset-y-0 left-0 ${barColor}`} style={{ width: `${t.accuracy}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Weak topics callout */}
                  {analysis.weakTopics.length > 0 && (
                    <div className="chunky-card border-red-300 bg-red-50 p-4 dark:border-red-600 dark:bg-red-900/15 sm:p-5">
                      <h3 className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-red-600 dark:text-red-400">
                        <AlertTriangle size={14} strokeWidth={2.6} /> Слабые темы — стоит подтянуть
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {analysis.weakTopics.map(t => (
                          <span
                            key={t.topicKey}
                            className="inline-flex items-center gap-1.5 rounded-full border-2 border-red-700 bg-white px-2.5 py-1 text-[11px] font-black text-red-700 dark:border-red-300 dark:bg-slate-900 dark:text-red-300"
                            style={{ boxShadow: '0 2px 0 #7f1d1d' }}
                          >
                            {t.topic}
                            <span className="rounded-full bg-red-100 px-1.5 text-[10px] dark:bg-red-900/40">{t.accuracy}%</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommended tests */}
                  {analysis.recommendedTests.length > 0 && (
                    <div className="chunky-card p-4 sm:p-5">
                      <h3 className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                        <Sparkles size={14} strokeWidth={2.6} className="text-amber-500" /> Похожие тесты
                      </h3>
                      <div className="space-y-2">
                        {analysis.recommendedTests.map(t => (
                          <button
                            key={t._id}
                            onClick={() => navigate(`/test-profile/${t.shareLink}`)}
                            className="flex w-full items-center gap-3 rounded-xl border-2 border-slate-200 bg-white p-2.5 text-left transition hover:border-slate-300 active:translate-y-[1px] dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-500"
                          >
                            <div
                              className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-slate-900 bg-gradient-to-br from-primary-400 to-primary-600 text-base font-black text-white dark:border-white"
                              style={{ boxShadow: '0 2px 0 #0f172a' }}
                            >
                              {t.coverImage ? <img src={t.coverImage} alt="" className="h-full w-full object-cover" /> : (t.title?.[0] || 'T').toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-black text-slate-900 dark:text-white">{t.title}</p>
                              <p className="truncate text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                {t.attemptCount || 0} прохожд. · средн. {t.averageScore || 0}%
                              </p>
                              {t.matchedTags?.length > 0 && (
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {t.matchedTags.slice(0, 3).map(tag => (
                                    <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-primary-100 px-1.5 py-0.5 text-[9px] font-black text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
                                      <Hash size={8} strokeWidth={3} /> {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <ArrowRight size={14} className="flex-shrink-0 text-slate-400" strokeWidth={2.6} />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </motion.section>
          )}

          {activeTab === 'compare' && (
            <motion.section
              key="compare"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-4 sm:space-y-5"
            >
              {/* Percentile */}
              {comparisonLoading ? (
                <div className="chunky-card animate-pulse p-6">
                  <div className="h-4 w-1/3 rounded bg-slate-200 dark:bg-slate-700" />
                  <div className="mt-3 h-12 rounded bg-slate-300 dark:bg-slate-600" />
                </div>
              ) : !comparison || comparison.totalAttempts === 0 ? (
                <div className="chunky-card p-10 text-center">
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-slate-900 bg-slate-50 text-slate-400 dark:border-white dark:bg-slate-900/30" style={{ boxShadow: '0 3px 0 #0f172a' }}>
                    <Users size={26} strokeWidth={2.2} />
                  </div>
                  <p className="text-sm font-black text-slate-900 dark:text-white">Пока нет данных для сравнения</p>
                  <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">Ты один из первых, кто прошёл этот тест</p>
                </div>
              ) : (
                <div className="chunky-card p-4 sm:p-5">
                  <h3 className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    <Users size={14} strokeWidth={2.6} className="text-primary-500" /> Среди всех участников
                  </h3>
                  <div className="flex flex-col items-center gap-2 text-center">
                    <p className="font-mono text-5xl font-black tracking-tight text-primary-600 dark:text-primary-300 sm:text-6xl">
                      {comparison.percentile}
                      <span className="ml-1 text-2xl">%</span>
                    </p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                      Лучше {comparison.percentile}% участников
                    </p>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Ранг {comparison.rank} из {comparison.totalAttempts}
                    </p>
                  </div>
                  {/* Percentile bar */}
                  <div className="relative mt-5 h-4 overflow-hidden rounded-full border-2 border-slate-900 bg-slate-100 dark:border-white dark:bg-slate-800" style={{ boxShadow: '0 3px 0 #0f172a' }}>
                    <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-400 via-amber-400 to-primary-500" style={{ width: `${comparison.percentile}%` }} />
                    <div className="absolute inset-y-0 right-0 bg-slate-200 dark:bg-slate-700" style={{ width: `${100 - comparison.percentile}%` }} />
                    <div
                      className="absolute top-1/2 h-6 w-1.5 -translate-y-1/2 rounded-sm border-2 border-slate-900 bg-white dark:border-white"
                      style={{ left: `calc(${comparison.percentile}% - 3px)`, boxShadow: '0 2px 0 #0f172a' }}
                    />
                  </div>
                  {/* Stats grid */}
                  <div className="mt-4 grid grid-cols-3 gap-2 [&>*]:min-w-0">
                    <CompareStatTile label="Твой" value={`${comparison.currentPercentage}%`} accent="primary" />
                    <CompareStatTile label="Средний" value={`${comparison.avgPercentage}%`} accent="slate" />
                    <CompareStatTile label="Лучший" value={`${comparison.bestPercentage}%`} accent="emerald" />
                  </div>
                </div>
              )}

              {/* History */}
              {historyLoading ? (
                <div className="chunky-card animate-pulse p-6">
                  <div className="h-4 w-1/3 rounded bg-slate-200 dark:bg-slate-700" />
                  <div className="mt-3 h-32 rounded bg-slate-300 dark:bg-slate-600" />
                </div>
              ) : history && history.totalAttempts > 0 && history.attempts.length > 0 && (
                <div className="chunky-card p-4 sm:p-5">
                  <h3 className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    <TrendingUp size={14} strokeWidth={2.6} className="text-emerald-500" /> Твои попытки ({history.totalAttempts})
                  </h3>
                  {history.totalAttempts === 1 ? (
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Это твоя первая попытка по этому тесту</p>
                  ) : (
                    <>
                      {/* Delta callout */}
                      {history.deltaVsPrevious !== null && (
                        <div className={`mb-3 inline-flex items-center gap-1.5 rounded-xl border-2 px-3 py-1.5 text-xs font-black ${
                          history.deltaVsPrevious > 0
                            ? 'border-emerald-700 bg-emerald-50 text-emerald-700 dark:border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300'
                            : history.deltaVsPrevious < 0
                              ? 'border-red-700 bg-red-50 text-red-700 dark:border-red-300 dark:bg-red-900/30 dark:text-red-300'
                              : 'border-slate-300 bg-slate-50 text-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`} style={{ boxShadow: history.deltaVsPrevious !== 0 ? `0 2px 0 ${history.deltaVsPrevious > 0 ? '#065f46' : '#7f1d1d'}` : undefined }}>
                          {history.deltaVsPrevious > 0 ? <TrendingUp size={13} /> : history.deltaVsPrevious < 0 ? <TrendingDown size={13} /> : null}
                          {history.deltaVsPrevious > 0 ? '+' : ''}{history.deltaVsPrevious}% vs прошлая попытка
                        </div>
                      )}

                      {/* Line chart */}
                      <ResponsiveContainer width="100%" height={180}>
                        <LineChart data={history.attempts.map((a, i) => ({ name: `№${i + 1}`, percentage: a.percentage, isCurrent: a.isCurrent }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
                          <Tooltip />
                          <Line
                            type="monotone"
                            dataKey="percentage"
                            stroke="#EA580C"
                            strokeWidth={3}
                            dot={(props) => {
                              const { cx, cy, payload } = props;
                              return <circle key={payload.name} cx={cx} cy={cy} r={payload.isCurrent ? 7 : 4} fill={payload.isCurrent ? '#EA580C' : '#FED7AA'} stroke="#0f172a" strokeWidth={2} />;
                            }}
                          />
                        </LineChart>
                      </ResponsiveContainer>

                      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                        <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-amber-700 bg-amber-50 px-2 py-0.5 text-amber-700 dark:border-amber-300 dark:bg-amber-900/30 dark:text-amber-300">
                          <Medal size={11} strokeWidth={2.6} /> Лучший: {history.best}%
                        </span>
                        <span>·</span>
                        <span>Всего попыток: {history.totalAttempts}</span>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Violations (moved here) */}
              {result.violations?.length > 0 && (
                <div className="chunky-card p-4 sm:p-5">
                  <h3 className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">
                    <AlertTriangle size={14} strokeWidth={2.6} /> Нарушения ({result.violations.length})
                  </h3>
                  <div className="space-y-2">
                    {result.violations.map((v, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-xl border-2 border-amber-300 bg-amber-50 p-2.5 text-xs dark:border-amber-600 dark:bg-amber-900/15">
                        <span className="rounded-md border-2 border-amber-700 bg-white px-1.5 py-0.5 text-[10px] font-black text-amber-700 dark:border-amber-300 dark:bg-slate-900 dark:text-amber-300">{v.type}</span>
                        <span className="flex-1 truncate font-medium text-slate-700 dark:text-slate-300">{v.details}</span>
                        <span className="flex-shrink-0 text-[10px] font-bold text-slate-400">{new Date(v.timestamp).toLocaleTimeString('ru-RU')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.section>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// ─── Sub components ───
function MetricTile({ icon: Icon, label, value, color, shadow, mono = false }) {
  const colorMap = {
    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-300', icon: 'text-emerald-600 dark:text-emerald-300' },
    red: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-300', icon: 'text-red-600 dark:text-red-300' },
    primary: { bg: 'bg-primary-50 dark:bg-primary-900/20', text: 'text-primary-700 dark:text-primary-300', icon: 'text-primary-600 dark:text-primary-300' },
    amber: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-300', icon: 'text-amber-600 dark:text-amber-300' },
  };
  const c = colorMap[color] || colorMap.primary;
  return (
    <div className={`rounded-2xl border-2 border-slate-900 ${c.bg} p-3 dark:border-white sm:p-4`} style={{ boxShadow: `0 4px 0 ${shadow}` }}>
      <Icon className={`mb-1 h-5 w-5 ${c.icon} sm:h-6 sm:w-6`} strokeWidth={2.4} />
      <p className={`${mono ? 'font-mono text-base sm:text-lg' : 'text-xl sm:text-2xl'} font-black ${c.text}`}>{value}</p>
      <p className={`text-[9px] font-black uppercase tracking-widest ${c.icon} sm:text-[10px]`}>{label}</p>
    </div>
  );
}

function ActionButton({ onClick, icon: Icon, label, sub, color, shadow }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2.5 rounded-xl border-2 px-3 py-2.5 text-left transition active:translate-y-[2px] ${color}`}
      style={{ boxShadow: `0 3px 0 ${shadow}` }}
    >
      <Icon size={16} strokeWidth={2.6} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-black">{label}</p>
        <p className="truncate text-[10px] font-bold opacity-70">{sub}</p>
      </div>
    </button>
  );
}

function CompareStatTile({ label, value, accent }) {
  const colorMap = {
    primary: 'border-primary-700 bg-primary-50 text-primary-700 dark:border-primary-300 dark:bg-primary-900/30 dark:text-primary-300',
    emerald: 'border-emerald-700 bg-emerald-50 text-emerald-700 dark:border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300',
    slate: 'border-slate-300 bg-slate-50 text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300',
  };
  return (
    <div className={`rounded-xl border-2 p-2.5 text-center ${colorMap[accent]}`}>
      <p className="text-[9px] font-black uppercase tracking-widest opacity-70">{label}</p>
      <p className="mt-0.5 text-lg font-black">{value}</p>
    </div>
  );
}
