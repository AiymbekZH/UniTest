import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, Users, Star, Trophy, Play, ArrowLeft,
  Eye, EyeOff, Shield, AlertTriangle, Tag, User,
  BarChart3, MessageSquare, Flag, Copy, QrCode, Swords
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import Navbar from '../components/Navbar';
import AnimatedHero from '../components/AnimatedHero';
import CommentsSection from '../components/CommentsSection';
import toast, { Toaster } from 'react-hot-toast';
import TestCoverArtwork from '../components/TestCoverArtwork';

export default function TestProfile() {
  const { shareLink } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();

  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState(null);
  const [attemptInfo, setAttemptInfo] = useState({ attempts: 0, maxAttempts: 0 });
  const [myRating, setMyRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [myDifficulty, setMyDifficulty] = useState(0);
  const [hoverDifficulty, setHoverDifficulty] = useState(0);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [showQRModal, setShowQRModal] = useState(false);

  useEffect(() => {
    fetchTest();
  }, [shareLink]);

  const fetchTest = async () => {
    try {
      const res = await api.get(`/tests/share/${shareLink}`);
      setTest(res.data);

      // Fetch leaderboard
      try {
        const lbRes = await api.get(`/results/leaderboard/${res.data._id}`);
        setLeaderboard(lbRes.data);
      } catch (_) {}

      // Fetch attempt info
      if (user) {
        try {
          const attRes = await api.get(`/results/my-attempts/${res.data._id}`);
          setAttemptInfo({ attempts: attRes.data.attempts, maxAttempts: res.data.settings?.maxAttempts || 0 });
        } catch (_) {}

        // Fetch my rating
        try {
          const rRes = await api.get(`/tests/${res.data._id}/my-rating`);
          setMyRating(rRes.data.rating || 0);
        } catch (_) {}

        // Fetch my difficulty rating
        try {
          const dRes = await api.get(`/tests/${res.data._id}/my-difficulty-rating`);
          setMyDifficulty(dRes.data.difficulty || 0);
        } catch (_) {}
      }
    } catch (err) {
      toast.error(t('testNotFound'));
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleRate = async (value) => {
    if (!user) {
      toast.error(t('loginToRate'));
      return;
    }
    try {
      const res = await api.post(`/tests/${test._id}/rate`, { rating: value });
      setMyRating(value);
      setTest(prev => ({ ...prev, rating: res.data.rating, ratingCount: res.data.ratingCount }));
      toast.success(res.data.alreadyRated ? t('ratingUpdated') : t('thanksForRating'));
    } catch (err) {
      toast.error(t('error'));
    }
  };

  const handleDifficultyRate = async (value) => {
    if (!user) {
      toast.error(t('loginToRate'));
      return;
    }
    try {
      const res = await api.post(`/tests/${test._id}/rate-difficulty`, { difficulty: value });
      setMyDifficulty(value);
      setTest(prev => ({
        ...prev,
        difficultyScore: res.data.difficultyScore,
        difficultyCount: res.data.difficultyCount
      }));
      toast.success(res.data.alreadyRated ? 'Оценка сложности обновлена' : 'Спасибо за оценку сложности');
    } catch (_) {
      toast.error(t('error'));
    }
  };

  const startArena = async () => {
    if (!user) {
      toast.error('Для запуска арены нужен аккаунт');
      return;
    }
    try {
      const res = await api.post('/arena/rooms', {
        testId: test._id,
        sourceType: 'public'
      });
      navigate(`/arena/host/${res.data.room._id}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Не удалось запустить арену');
    }
  };

  const getDifficultyMeta = (score) => {
    const value = Number(score || 0);
    if (!value) return { label: 'Нет оценок', color: 'text-gray-500', badge: 'bg-gray-50 text-gray-500 border-gray-200' };
    if (value >= 4.5) return { label: 'Очень сложная', color: 'text-red-600 dark:text-red-400', badge: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800' };
    if (value >= 3.5) return { label: 'Сложная', color: 'text-orange-600 dark:text-orange-400', badge: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800' };
    if (value >= 2.5) return { label: 'Средняя', color: 'text-amber-600 dark:text-amber-400', badge: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800' };
    if (value >= 1.5) return { label: 'Легко', color: 'text-lime-600 dark:text-lime-400', badge: 'bg-lime-50 dark:bg-lime-900/20 text-lime-600 dark:text-lime-400 border-lime-200 dark:border-lime-800' };
    return { label: 'Очень легко', color: 'text-emerald-600 dark:text-emerald-400', badge: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' };
  };

  const getQuestionTypeLabel = (type) => {
    const map = {
      'single-choice': t('singleChoice'),
      'multiple-choice': t('multipleChoice'),
      'true-false': t('trueFalse'),
      'essay': t('essay'),
      'fill-blank': t('fillBlank'),
      'matching': t('matching')
    };
    return map[type] || type;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!test) return null;

  const questionTypes = {};
  test.questions?.forEach(q => {
    questionTypes[q.type] = (questionTypes[q.type] || 0) + 1;
  });

  const difficultyMeta = getDifficultyMeta(test.difficultyScore);

  const canStart = !(attemptInfo.maxAttempts > 0 && attemptInfo.attempts >= attemptInfo.maxAttempts);
  const canLaunchArena = Boolean(user && (test.settings?.isPublic || test.creator?._id === (user?._id || user?.id)));

  return (
    <div className="min-h-screen bg-surface">
      
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {/* Back button */}
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-sm font-medium text-primary-600 hover:opacity-70 transition mb-5"
        >
          <ArrowLeft size={16} /> {t('back')}
        </button>

        {/* Hero banner with test title + stats */}
        <AnimatedHero
          preset="grid"
          height="md"
          eyebrow={test.settings?.isPublic ? t('publicTest') : t('privateTest')}
          icon={<BarChart3 size={22} />}
          title={test.title}
          subtitle={test.description || undefined}
          stats={[
            { icon: <BarChart3 size={14} />, label: t('questions'), value: test.questions?.length || 0 },
            { icon: <Clock size={14} />, label: t('min'), value: test.settings?.timeLimit || '∞' },
            { icon: <Users size={14} />, label: t('totalParticipants'), value: test.attemptCount || 0 },
            { icon: <Star size={14} />, label: t('rating'), value: test.rating ? test.rating.toFixed(1) : '—' }
          ]}
          className="mb-6"
        />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          {/* Main info */}
          <div className="space-y-6">
            {/* Header card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card-solid p-6 sm:p-8"
            >
              <div className="mb-6 overflow-hidden rounded-2xl border border-gray-100 dark:border-slate-700/70">
                <TestCoverArtwork
                  coverImage={test.coverImage}
                  title={test.title}
                  className="w-full"
                  imageOverlayClassName="absolute inset-0 bg-gradient-to-t from-slate-950/12 via-slate-950/3 to-transparent"
                  style={{ aspectRatio: '16 / 9' }}
                />
              </div>

              {/* Status badges */}
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                {test.settings?.antiCheat?.blockTabSwitch && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400"><Shield size={10} /> Anti-cheat</span>
                )}
                {test.settings?.startDate && (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-semibold bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400">
                    <Clock size={9} /> {t('from') || 'с'} {new Date(test.settings.startDate).toLocaleDateString()}
                  </span>
                )}
                {test.settings?.endDate && (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-semibold bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400">
                    <Clock size={9} /> {t('until') || 'до'} {new Date(test.settings.endDate).toLocaleDateString()}
                  </span>
                )}
              </div>

              {/* Tags */}
              {test.tags?.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {test.tags.map((tag, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-slate-700 rounded-full text-xs font-medium text-gray-500 dark:text-gray-300">
                      <Tag size={10} /> {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Complexity DNA Bar */}
              <div className="mb-6 p-4 rounded-2xl border border-gray-100 dark:border-slate-700 bg-gray-50/60 dark:bg-slate-800/50">
                <div className="flex justify-between items-end mb-3">
                  <div>
                    <h3 className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">Оценка сложности</h3>
                    <div className="flex items-center gap-2">
                      <span className={`text-base font-bold tracking-tight ${difficultyMeta.color}`}>{difficultyMeta.label}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-slate-700 dark:text-slate-200 leading-none flex items-baseline justify-end gap-1">
                      {test.difficultyScore ? test.difficultyScore.toFixed(1) : '0.0'}
                      <span className="text-xs font-bold text-gray-400">/ 5</span>
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-gray-400 mt-1">
                      {test.difficultyCount || 0} голосов
                    </div>
                  </div>
                </div>
                {/* DNA Scale */}
                <div className="h-2 w-full bg-slate-100 dark:bg-slate-700/50 rounded-full overflow-hidden flex">
                  {[1, 2, 3, 4, 5].map((level) => {
                    const isActive = test.difficultyScore ? Math.round(test.difficultyScore) >= level : false;
                    let bgColor = "bg-slate-200 dark:bg-slate-700";
                    if (isActive) {
                      if (level === 1) bgColor = "bg-emerald-400 dark:bg-emerald-500";
                      else if (level === 2) bgColor = "bg-lime-400 dark:bg-lime-500";
                      else if (level === 3) bgColor = "bg-amber-400 dark:bg-amber-500";
                      else if (level === 4) bgColor = "bg-orange-400 dark:bg-orange-500";
                      else bgColor = "bg-red-500 dark:bg-red-500";
                    }
                    return (
                      <div key={level} className={`h-full flex-1 ${level < 5 ? 'border-r-2 border-white dark:border-slate-800' : ''} transition-colors duration-500 ${bgColor}`} />
                    );
                  })}
                </div>
                <div className="flex justify-between mt-2 px-0.5">
                  <span className="text-[9px] font-medium text-emerald-500 uppercase tracking-wider text-left leading-none" style={{width: '20%'}}>Очень<br/>легко</span>
                  <span className="text-[9px] font-medium text-lime-500 uppercase tracking-wider text-center leading-none" style={{width: '20%'}}>Легко</span>
                  <span className="text-[9px] font-medium text-amber-500 uppercase tracking-wider text-center leading-none" style={{width: '20%'}}>Средняя</span>
                  <span className="text-[9px] font-medium text-orange-500 uppercase tracking-wider text-center leading-none" style={{width: '20%'}}>Сложная</span>
                  <span className="text-[9px] font-medium text-red-500 uppercase tracking-wider text-right leading-none" style={{width: '20%'}}>Очень<br/>сложная</span>
                </div>
              </div>

              {/* Question types */}
              {Object.keys(questionTypes).length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-dark mb-2">{t('questionTypes')}</h3>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(questionTypes).map(([type, count]) => (
                      <span key={type} className="px-3.5 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200/60 dark:border-slate-600 rounded-full text-xs font-medium text-gray-500 dark:text-gray-300">
                        {getQuestionTypeLabel(type)}: {count}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Creator info */}
              <div className="flex items-center gap-3 pt-4 border-t border-gray-100 dark:border-slate-700">
                <Link to={test.creator?._id ? `/profile/${test.creator._id}` : '#'}
                  className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 text-primary-600 rounded-xl flex items-center justify-center font-semibold text-sm overflow-hidden flex-shrink-0">
                  {test.creator?.avatar ? (
                    <img src={test.creator.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <>{test.creator?.firstName?.[0]}{test.creator?.lastName?.[0]}</>
                  )}
                </Link>
                <div className="flex-1">
                  <Link to={test.creator?._id ? `/profile/${test.creator._id}` : '#'}
                    className="text-sm font-medium text-dark hover:text-primary-600 transition">
                    {test.creator?.firstName} {test.creator?.lastName}
                  </Link>
                  <p className="text-xs text-gray-400">{test.creator?.role === 'teacher' ? t('teacher') : test.creator?.role === 'admin' ? t('adminRole') : t('student')}</p>
                </div>
                {user && test.creator?._id !== user?.id && (
                  <button onClick={() => setShowReportModal(true)}
                    className="p-2 rounded-lg text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition"
                    title={t('report')}>
                    <Flag size={14} />
                  </button>
                )}
              </div>
            </motion.div>

            {/* Rate the test */}
            {user && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="glass-card-solid p-6"
              >
                <h3 className="text-sm font-semibold text-dark mb-3">{t('rateTest')}</h3>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map(v => (
                    <button
                      key={v}
                      onClick={() => handleRate(v)}
                      onMouseEnter={() => setHoverRating(v)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 transition-transform hover:scale-125"
                    >
                      <Star
                        size={28}
                        className={
                          v <= (hoverRating || myRating)
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-gray-300 dark:text-gray-600'
                        }
                      />
                    </button>
                  ))}
                  <span className="text-sm text-gray-500 ml-3">
                    {myRating > 0 ? `${t('yourRating')}: ${myRating}/5` : t('clickToRate')}
                  </span>
                </div>

                <div className="mt-5 pt-5 border-t border-gray-100 dark:border-slate-700">
                  <h3 className="text-sm font-semibold text-dark mb-3">Оцените сложность</h3>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(v => (
                      <button
                        key={`difficulty-${v}`}
                        onClick={() => handleDifficultyRate(v)}
                        onMouseEnter={() => setHoverDifficulty(v)}
                        onMouseLeave={() => setHoverDifficulty(0)}
                        className="p-1 transition-transform hover:scale-125"
                      >
                        <Star
                          size={26}
                          className={
                            v <= (hoverDifficulty || myDifficulty)
                              ? 'fill-red-400 text-red-400'
                              : 'text-gray-300 dark:text-gray-600'
                          }
                        />
                      </button>
                    ))}
                    <span className="text-sm text-gray-500 ml-3">
                      {myDifficulty > 0 ? `Ваша оценка сложности: ${myDifficulty}/5` : 'Кликните, чтобы оценить сложность'}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}

          </div>

          {/* Sidebar */}
          <div className="lg:sticky lg:top-[72px] lg:max-h-[calc(100vh-72px-24px)] lg:overflow-y-auto lg:scrollbar-hide space-y-6">
            {/* Start test card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card-solid p-6"
            >
              {/* Anti-cheat warning */}
              {test.settings?.antiCheat?.blockTabSwitch && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 mb-4 text-xs">
                  <p className="font-semibold text-red-700 dark:text-red-400 flex items-center gap-1 mb-1">
                    <Shield size={12} /> Anti-cheat
                  </p>
                  <p className="text-red-600 dark:text-red-300">{t('tabSwitchBlocked')}: {test.settings.antiCheat.maxViolations}</p>
                </div>
              )}

              {/* Attempt info */}
              {attemptInfo.maxAttempts > 0 && (
                <div className="mb-4 text-sm text-gray-500">
                  {t('attempts')}: <strong>{attemptInfo.attempts}</strong> / {attemptInfo.maxAttempts}
                </div>
              )}

              {!canStart && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 mb-4 text-center">
                  <p className="text-sm font-semibold text-red-600">{t('allAttemptsUsed')}</p>
                </div>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(`/test/${shareLink}`)}
                disabled={!canStart}
                className="btn-primary w-full text-lg py-3.5 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play size={20} />
                {t('startTest')}
              </motion.button>

              {/* Share & QR buttons */}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/test-profile/${shareLink}`);
                    toast.success(t('linkCopied'));
                  }}
                  className="flex-1 min-w-0 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 text-[13px] font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition"
                >
                  <Copy size={14} className="flex-shrink-0" /> <span className="truncate">{t('copyLink')}</span>
                </button>
                <button
                  onClick={() => setShowQRModal(true)}
                  className="flex-shrink-0 flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl border border-gray-200 dark:border-slate-600 text-[13px] font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition"
                >
                  <QrCode size={14} /> QR
                </button>
              </div>

              {/* Practice mode button */}
              {test.settings?.practiceMode && (
                <button
                  onClick={() => navigate(`/test/${shareLink}?practice=true`)}
                  className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-green-200 dark:border-green-700 text-[13px] font-medium text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition"
                >
                  <Play size={14} /> {t('practiceModeLabel')}
                </button>
              )}

              {canLaunchArena && (
                <button
                  onClick={startArena}
                  className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-orange-200 dark:border-orange-700 text-[13px] font-medium text-orange-700 dark:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition"
                >
                  <Swords size={14} /> Запустить Arena
                </button>
              )}


            </motion.div>

            {/* Leaderboard preview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card-solid p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-dark flex items-center gap-2">
                  <Trophy size={16} className="text-primary-600" />
                  {t('leaderboard')}
                </h3>
                <Link
                  to={`/leaderboard/${test._id}`}
                  className="text-xs text-primary-600 hover:text-primary-700 font-medium transition"
                >
                  {t('viewAll')}
                </Link>
              </div>

              {leaderboard?.leaderboard?.length > 0 ? (
                <div className="space-y-2">
                  {leaderboard.leaderboard.slice(0, 5).map((entry, i) => (
                    <div key={i} className={`flex items-center gap-3 py-2.5 ${i > 0 ? 'border-t border-gray-100 dark:border-slate-700' : ''}`}>
                      <span className={`w-[26px] h-[26px] rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0
                        ${i === 0 ? 'bg-amber-100 text-amber-700' :
                          i === 1 ? 'bg-slate-100 dark:bg-slate-600 text-slate-500 dark:text-slate-300' :
                          i === 2 ? 'bg-orange-100 text-orange-700' :
                          'bg-gray-50 dark:bg-slate-700 text-gray-400'}`}>
                        {i + 1}
                      </span>
                      <span className="flex-1 min-w-0 text-[13px] font-medium text-dark truncate">{entry.userName}</span>
                      <span className={`text-[13px] font-bold ${
                        entry.percentage >= 80 ? 'text-emerald-600' :
                        entry.percentage >= 50 ? 'text-amber-500' : 'text-red-500'
                      }`}>
                        {entry.percentage}%
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Trophy size={24} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                  <p className="text-xs text-gray-400">{t('emptyLeaderboard')}</p>
                </div>
              )}
            </motion.div>
          </div>
        </div>
        {/* Comments Section - always at the bottom */}
        {test._id && (
          <div className="mt-8">
            <CommentsSection testId={test._id} />
          </div>
        )}
        {/* QR Code Modal */}
        <AnimatePresence>
          {showQRModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4"
              onClick={() => setShowQRModal(false)}>
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 text-center max-w-xs w-full">
                <h3 className="text-lg font-bold text-dark mb-4">QR-код теста</h3>
                <div className="bg-white p-4 rounded-xl inline-block shadow-inner mb-4">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(window.location.origin + '/test-profile/' + shareLink)}`}
                    alt="QR Code"
                    className="w-48 h-48"
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                  Покажите QR на экране — студенты сканируют и сразу попадают на тест
                </p>
                <button onClick={() => setShowQRModal(false)}
                  className="w-full btn-secondary py-2 text-sm">{t('close') || 'Закрыть'}</button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Report modal */}
        <AnimatePresence>
          {showReportModal && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4"
              onClick={() => setShowReportModal(false)}
            >
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                onClick={e => e.stopPropagation()}
                className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6"
              >
                <h3 className="text-lg font-bold text-dark mb-4 flex items-center gap-2">
                  <Flag size={18} className="text-orange-500" />
                  {t('reportTest')}
                </h3>
                <textarea
                  className="input-field text-sm w-full resize-none"
                  rows={3}
                  placeholder={t('reportReason')}
                  value={reportReason}
                  onChange={e => setReportReason(e.target.value)}
                  maxLength={500}
                />
                <div className="flex gap-3 mt-4">
                  <button onClick={() => { setShowReportModal(false); setReportReason(''); }}
                    className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 dark:border-slate-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition">
                    {t('cancel')}
                  </button>
                  <button onClick={async () => {
                    if (!reportReason.trim()) return;
                    try {
                      await api.post('/reports', { targetType: 'test', targetId: test._id, reason: reportReason.trim() });
                      toast.success(t('reportSent'));
                      setShowReportModal(false);
                      setReportReason('');
                    } catch (err) {
                      toast.error(err.response?.data?.message || 'Error');
                    }
                  }} disabled={!reportReason.trim()}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium transition disabled:opacity-50">
                    {t('report')}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
