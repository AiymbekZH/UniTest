import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search, Plus, Star, Users, Eye, EyeOff, Trash2, Edit3, MoreVertical, Tag, Copy, Trophy,
  Flame, Target, ArrowRight, Play, Sparkles, CalendarDays, Dumbbell, Clock3, Medal, Crown
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import Pagination from '../components/Pagination';
import ConfirmDialog from '../components/ConfirmDialog';
import TestCoverArtwork from '../components/TestCoverArtwork';

const ACTIVE_SESSION_TTL_MS = 5 * 60 * 1000;

const dashboardCopy = {
  en: {
    heroTitle: 'Make UniTest a place people want to return to',
    heroDesc: 'Track momentum, keep streaks alive, finish challenges, and turn every test into progress.',
    continueTitle: 'Continue session',
    continueDesc: 'Saved progress stays available for 5 minutes.',
    continueButton: 'Continue',
    resumeAt: 'Resume at question {{current}} / {{total}}',
    answeredNow: '{{count}} answered',
    latestResultTitle: 'Latest result',
    latestResultDesc: 'Jump back into your recent activity and keep the pace.',
    openResult: 'Open result',
    noRecentActivity: 'No recent activity yet',
    noRecentActivityDesc: 'Start with a public test or launch a practice run.',
    dailyChallenge: 'Daily Challenge',
    dailyChallengeDesc: 'One focused test today. Finish it to keep momentum.',
    rewardXp: '+{{xp}} XP',
    weeklySprint: 'Weekly Sprint',
    weeklySprintDesc: 'Complete 3 different tests this week.',
    sprintProgress: '{{current}} / {{goal}} tests',
    progressTitle: 'Your Progress',
    progressDesc: 'Level up with steady work, not one lucky result.',
    currentStreak: 'Current streak',
    longestStreak: 'Best streak',
    completedExams: 'Exams',
    completedPractice: 'Practice runs',
    perfectScores: 'Perfect scores',
    badgesTitle: 'Unlocked badges',
    topLearners: 'Top learners',
    topLearnersDesc: 'Progress leaderboard by XP and streak.',
    createFirstChallenge: 'Build your first test',
    guestHeroTitle: 'Explore public tests and build learning momentum',
    guestHeroDesc: 'Browse tests, see what creators publish, then sign up to unlock progress, streaks, and challenges.',
    startChallenge: 'Start challenge',
    startSprint: 'Open sprint',
    exploreTests: 'Explore tests',
    progressLeaderboard: 'XP leaderboard',
    guestCta: 'Create account',
    heroLevelHint: 'Progress level',
    heroStreakHint: 'Keep momentum alive',
    heroXpHint: '{{xp}} XP to next level',
    progressLoadError: 'Failed to load progress overview',
    firstBadgeHint: 'Complete tests to unlock your first badge.',
    activity7d: '7-day activity',
    leaderboardEmpty: 'Leaderboard will appear after the first completed runs.',
    leaderboardEntry: 'Level {{level}} · {{streak}} day streak',
    levelShort: 'Lvl',
    availableToday: 'Available today',
    completedToday: 'Completed today',
    doneLabel: 'Done',
    noDailyChallenge: "No public tests available for today's challenge.",
    scoreLabel: 'Score',
    modeLabel: 'Mode',
    timeLabel: 'Time'
  },
  ru: {
    heroTitle: 'Сделай UniTest местом, куда хочется возвращаться',
    heroDesc: 'Следи за прогрессом, держи серию, закрывай челленджи и превращай каждый тест в рост.',
    continueTitle: 'Продолжить сессию',
    continueDesc: 'Сохранённый прогресс доступен 5 минут.',
    continueButton: 'Продолжить',
    resumeAt: 'Вернуться к вопросу {{current}} / {{total}}',
    answeredNow: 'Отвечено: {{count}}',
    latestResultTitle: 'Последний результат',
    latestResultDesc: 'Быстро вернись к недавней активности и не теряй темп.',
    openResult: 'Открыть результат',
    noRecentActivity: 'Пока нет недавней активности',
    noRecentActivityDesc: 'Начни с публичного теста или запусти тренировку.',
    dailyChallenge: 'Челлендж дня',
    dailyChallengeDesc: 'Один точный тест на сегодня. Пройди его и поддержи темп.',
    rewardXp: '+{{xp}} XP',
    weeklySprint: 'Недельный спринт',
    weeklySprintDesc: 'Пройди 3 разных теста за эту неделю.',
    sprintProgress: '{{current}} / {{goal}} тестов',
    progressTitle: 'Твой прогресс',
    progressDesc: 'Уровень растёт от стабильной работы, а не от одной удачи.',
    currentStreak: 'Текущая серия',
    longestStreak: 'Лучшая серия',
    completedExams: 'Экзамены',
    completedPractice: 'Тренировки',
    perfectScores: 'Идеальные результаты',
    badgesTitle: 'Открытые достижения',
    topLearners: 'Лучшие по прогрессу',
    topLearnersDesc: 'Таблица по XP и серии активности.',
    createFirstChallenge: 'Создай свой первый тест',
    guestHeroTitle: 'Изучай публичные тесты и набирай темп обучения',
    guestHeroDesc: 'Смотри, что публикуют авторы, а после регистрации открой прогресс, серии и челленджи.',
    startChallenge: 'Начать челлендж',
    startSprint: 'Открыть спринт',
    exploreTests: 'Смотреть тесты',
    progressLeaderboard: 'Лидерборд XP',
    guestCta: 'Создать аккаунт',
    heroLevelHint: 'Уровень прогресса',
    heroStreakHint: 'Поддерживай темп',
    heroXpHint: '{{xp}} XP до следующего уровня',
    progressLoadError: 'Не удалось загрузить обзор прогресса',
    firstBadgeHint: 'Проходи тесты, чтобы открыть первое достижение.',
    activity7d: 'Активность за 7 дней',
    leaderboardEmpty: 'Лидерборд появится после первых завершённых прохождений.',
    leaderboardEntry: 'Уровень {{level}} · серия {{streak}} дн.',
    levelShort: 'Ур.',
    availableToday: 'Доступно сегодня',
    completedToday: 'Выполнено сегодня',
    doneLabel: 'Готово',
    noDailyChallenge: 'Сегодня нет подходящего публичного челленджа.',
    scoreLabel: 'Результат',
    modeLabel: 'Режим',
    timeLabel: 'Время'
  },
  kz: {
    heroTitle: 'UniTest-ті қайта оралғың келетін орынға айналдыр',
    heroDesc: 'Прогресті бақыла, серияны сақта, челленджтерді жап және әр тесті өсімге айналдыр.',
    continueTitle: 'Сессияны жалғастыру',
    continueDesc: 'Сақталған прогресс 5 минут бойы қолжетімді.',
    continueButton: 'Жалғастыру',
    resumeAt: '{{current}} / {{total}} сұрақтан жалғастыру',
    answeredNow: 'Жауап берілгені: {{count}}',
    latestResultTitle: 'Соңғы нәтиже',
    latestResultDesc: 'Жақындағы әрекетке тез оралып, қарқынды жоғалтпа.',
    openResult: 'Нәтижені ашу',
    noRecentActivity: 'Соңғы белсенділік әлі жоқ',
    noRecentActivityDesc: 'Қоғамдық тесттен баста немесе жаттығуды іске қос.',
    dailyChallenge: 'Күн челленджі',
    dailyChallengeDesc: 'Бүгінге бір нақты тест. Оны өтіп, қарқынды сақта.',
    rewardXp: '+{{xp}} XP',
    weeklySprint: 'Апталық спринт',
    weeklySprintDesc: 'Осы аптада 3 түрлі тест тапсыр.',
    sprintProgress: '{{current}} / {{goal}} тест',
    progressTitle: 'Сенің прогресің',
    progressDesc: 'Деңгей бір реттік сәттіліктен емес, тұрақты жұмыстан өседі.',
    currentStreak: 'Қазіргі серия',
    longestStreak: 'Ең ұзақ серия',
    completedExams: 'Емтихандар',
    completedPractice: 'Жаттығулар',
    perfectScores: 'Мінсіз нәтижелер',
    badgesTitle: 'Ашылған жетістіктер',
    topLearners: 'Прогресс бойынша үздіктер',
    topLearnersDesc: 'XP және белсенділік сериясы бойынша кесте.',
    createFirstChallenge: 'Алғашқы тестіңді жаса',
    guestHeroTitle: 'Қоғамдық тесттерді қарап, оқу қарқынын арттыр',
    guestHeroDesc: 'Авторлар не жариялағанын қара, ал тіркелгеннен кейін прогресс, серия және челленджтер ашылады.',
    startChallenge: 'Челленджті бастау',
    startSprint: 'Спринтті ашу',
    exploreTests: 'Тесттерді қарау',
    progressLeaderboard: 'XP лидерборды',
    guestCta: 'Аккаунт ашу',
    heroLevelHint: 'Прогресс деңгейі',
    heroStreakHint: 'Қарқынды сақта',
    heroXpHint: 'Келесі деңгейге {{xp}} XP',
    progressLoadError: 'Прогресс шолуын жүктеу мүмкін болмады',
    firstBadgeHint: 'Алғашқы жетістікті ашу үшін тесттерді орында.',
    activity7d: '7 күндік белсенділік',
    leaderboardEmpty: 'Алғашқы аяқталған өтулерден кейін лидерборд пайда болады.',
    leaderboardEntry: '{{level}} деңгей · {{streak}} күндік серия',
    levelShort: 'Деңг.',
    availableToday: 'Бүгін қолжетімді',
    completedToday: 'Бүгін аяқталды',
    doneLabel: 'Дайын',
    noDailyChallenge: 'Бүгінге лайық қоғамдық челлендж табылмады.',
    scoreLabel: 'Нәтиже',
    modeLabel: 'Режим',
    timeLabel: 'Уақыт'
  },
  es: {
    heroTitle: 'Haz de UniTest un lugar al que la gente quiera volver',
    heroDesc: 'Sigue tu progreso, mantén la racha, completa desafíos y convierte cada test en avance.',
    continueTitle: 'Continuar sesión',
    continueDesc: 'El progreso guardado permanece disponible durante 5 minutos.',
    continueButton: 'Continuar',
    resumeAt: 'Volver a la pregunta {{current}} / {{total}}',
    answeredNow: '{{count}} respondidas',
    latestResultTitle: 'Último resultado',
    latestResultDesc: 'Vuelve rápido a tu actividad reciente y mantén el ritmo.',
    openResult: 'Abrir resultado',
    noRecentActivity: 'Todavía no hay actividad reciente',
    noRecentActivityDesc: 'Empieza con un test público o abre una práctica.',
    dailyChallenge: 'Desafío diario',
    dailyChallengeDesc: 'Un test concreto para hoy. Complétalo y mantén el ritmo.',
    rewardXp: '+{{xp}} XP',
    weeklySprint: 'Sprint semanal',
    weeklySprintDesc: 'Completa 3 tests diferentes esta semana.',
    sprintProgress: '{{current}} / {{goal}} tests',
    progressTitle: 'Tu progreso',
    progressDesc: 'El nivel crece con constancia, no con una sola suerte.',
    currentStreak: 'Racha actual',
    longestStreak: 'Mejor racha',
    completedExams: 'Exámenes',
    completedPractice: 'Prácticas',
    perfectScores: 'Resultados perfectos',
    badgesTitle: 'Insignias desbloqueadas',
    topLearners: 'Mejores por progreso',
    topLearnersDesc: 'Tabla por XP y racha de actividad.',
    createFirstChallenge: 'Crea tu primer test',
    guestHeroTitle: 'Explora tests públicos y crea impulso de aprendizaje',
    guestHeroDesc: 'Mira lo que publican los creadores y luego regístrate para desbloquear progreso, rachas y desafíos.',
    startChallenge: 'Empezar desafío',
    startSprint: 'Abrir sprint',
    exploreTests: 'Explorar tests',
    progressLeaderboard: 'Clasificación XP',
    guestCta: 'Crear cuenta',
    heroLevelHint: 'Nivel de progreso',
    heroStreakHint: 'Mantén el ritmo',
    heroXpHint: '{{xp}} XP para el siguiente nivel',
    progressLoadError: 'No se pudo cargar el resumen de progreso',
    firstBadgeHint: 'Completa tests para desbloquear tu primera insignia.',
    activity7d: 'Actividad de 7 días',
    leaderboardEmpty: 'La clasificación aparecerá después de las primeras actividades completadas.',
    leaderboardEntry: 'Nivel {{level}} · racha de {{streak}} días',
    levelShort: 'Nv.',
    availableToday: 'Disponible hoy',
    completedToday: 'Completado hoy',
    doneLabel: 'Hecho',
    noDailyChallenge: 'No hay un desafío público disponible para hoy.',
    scoreLabel: 'Resultado',
    modeLabel: 'Modo',
    timeLabel: 'Tiempo'
  }
};

const badgeLabels = {
  first_completion: {
    en: 'First completion',
    ru: 'Первое завершение',
    kz: 'Алғашқы аяқтау',
    es: 'Primera finalización'
  },
  three_day_streak: {
    en: '3-day streak',
    ru: 'Серия 3 дня',
    kz: '3 күндік серия',
    es: 'Racha de 3 días'
  },
  ten_completed: {
    en: '10 completed tests',
    ru: '10 завершённых тестов',
    kz: '10 аяқталған тест',
    es: '10 tests completados'
  },
  perfect_score: {
    en: 'Perfect score',
    ru: 'Идеальный результат',
    kz: 'Мінсіз нәтиже',
    es: 'Puntuación perfecta'
  }
};

const getCurrentUserId = (user) => user?._id || user?.id || '';

function countAnsweredQuestions(answers = {}) {
  return Object.values(answers).filter(answer => {
    if (!answer) return false;
    if (Array.isArray(answer.selectedOptions) && answer.selectedOptions.length > 0) return true;
    if (typeof answer.textAnswer === 'string' && answer.textAnswer.trim()) return true;
    if (Array.isArray(answer.matchingPairs) && answer.matchingPairs.length > 0) return true;
    return false;
  }).length;
}

function readContinueSession() {
  if (typeof window === 'undefined') return null;

  const keys = Object.keys(localStorage).filter(key => key.startsWith('testSession_'));
  const snapshots = keys.map((key) => {
    try {
      const value = JSON.parse(localStorage.getItem(key) || 'null');
      if (!value?.started || value.resumeBlocked) return null;
      const updatedAt = value.updatedAt ? new Date(value.updatedAt).getTime() : 0;
      if (!updatedAt || (Date.now() - updatedAt) > ACTIVE_SESSION_TTL_MS) return null;
      return {
        ...value,
        shareLink: value.shareLink || key.replace('testSession_', ''),
        answeredCount: countAnsweredQuestions(value.answers || {}),
        updatedAtMs: updatedAt
      };
    } catch {
      return null;
    }
  }).filter(Boolean);

  return snapshots.sort((a, b) => b.updatedAtMs - a.updatedAtMs)[0] || null;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } }
};

export default function Dashboard() {
  const [tests, setTests] = useState([]);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('latest');
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null });
  const [continueSession, setContinueSession] = useState(null);
  const [progressData, setProgressData] = useState(null);
  const [challengeData, setChallengeData] = useState(null);
  const [progressLeaderboard, setProgressLeaderboard] = useState([]);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const copy = dashboardCopy[lang] || dashboardCopy.en;
  const currentUserId = getCurrentUserId(user);
  const testsPerPage = 12;

  const refreshContinueSession = () => {
    setContinueSession(readContinueSession());
  };

  useEffect(() => {
    fetchTests();
  }, [sort, page, search]);

  useEffect(() => {
    refreshContinueSession();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setProgressData(null);
      setChallengeData(null);
      setProgressLeaderboard([]);
      return;
    }

    const loadDashboardData = async () => {
      setDashboardLoading(true);
      try {
        const [progressRes, challengeRes, leaderboardRes] = await Promise.all([
          api.get('/progress/me'),
          api.get('/challenges/active'),
          api.get('/progress/leaderboard')
        ]);
        setProgressData(progressRes.data);
        setChallengeData(challengeRes.data);
        setProgressLeaderboard(leaderboardRes.data.leaderboard || []);
      } catch (error) {
        toast.error(copy.progressLoadError);
      } finally {
        setDashboardLoading(false);
      }
    };

    loadDashboardData();
  }, [copy.progressLoadError, isAuthenticated]);

  const fetchTests = async () => {
    setLoading(true);
    try {
      const sortMap = { latest: undefined, rating: 'rating', popular: 'popular', title: 'title' };
      const params = { sort: sortMap[sort], page, limit: testsPerPage };
      if (search) params.search = search;
      const res = await api.get('/tests', { params });
      setTests(res.data.tests || []);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      toast.error(t('errorLoadingTests'));
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchTests();
  };

  const deleteTest = async (id) => {
    try {
      await api.delete(`/tests/${id}`);
      setTests(prev => prev.filter(test => test._id !== id));
      toast.success(t('testDeleted'));
    } catch {
      toast.error(t('errorDeleting'));
    }
  };

  const copyShareLink = (shareLink) => {
    navigator.clipboard.writeText(`${window.location.origin}/test/${shareLink}`);
    toast.success(t('linkCopied'));
  };

  const renderStars = (rating) => (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <Star
          key={star}
          size={12}
          className={star <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}
        />
      ))}
      <span className="text-xs text-gray-500 ml-1">{rating?.toFixed(1) || '0.0'}</span>
    </div>
  );

  const levelMeta = progressData?.progress?.levelMeta;
  const recentResult = progressData?.recentResults?.[0] || null;
  const dailyChallenge = challengeData?.dailyChallenge || null;
  const weeklySprint = challengeData?.weeklySprint || null;

  const formattedBadges = useMemo(() => {
    return (progressData?.progress?.badges || []).slice(-4).reverse();
  }, [progressData?.progress?.badges]);

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />

      <ConfirmDialog
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, id: null })}
        onConfirm={() => deleteTest(deleteConfirm.id)}
        title={t('deleteTestTitle')}
        message={t('deleteTestMsg')}
        confirmText={t('delete')}
        variant="danger"
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <motion.section
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[32px] border border-primary-100 bg-gradient-to-br from-white via-primary-50/60 to-blue-50 p-6 shadow-[0_30px_80px_-50px_rgba(79,70,229,0.35)] dark:border-slate-700 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900"
        >
          <div className="absolute -right-14 -top-14 h-44 w-44 rounded-full bg-primary-500/10 blur-3xl" />
          <div className="absolute -bottom-16 left-10 h-36 w-36 rounded-full bg-sky-400/10 blur-3xl" />
          <div className="relative grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary-200/70 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-600 dark:border-primary-900/50 dark:bg-slate-800/70 dark:text-primary-300">
                <Sparkles size={13} />
                UniTest
              </div>
              <h1 className="mt-4 text-3xl font-bold tracking-tight text-dark sm:text-4xl">
                {isAuthenticated ? `${t('welcome')}, ${user?.firstName || 'Guest'}!` : copy.guestHeroTitle}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500 dark:text-gray-400">
                {isAuthenticated ? copy.heroDesc : copy.guestHeroDesc}
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                {isAuthenticated ? (
                  <>
                    <button onClick={() => navigate('/create-test')} className="btn-primary inline-flex items-center gap-2">
                      <Plus size={16} />
                      {t('createTest')}
                    </button>
                    <button onClick={() => navigate('/my-results')} className="btn-secondary inline-flex items-center gap-2">
                      <Trophy size={16} />
                      {t('results')}
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => navigate('/register')} className="btn-primary inline-flex items-center gap-2">
                      <Plus size={16} />
                      {copy.guestCta}
                    </button>
                    <button onClick={() => navigate('/login')} className="btn-secondary inline-flex items-center gap-2">
                      <Play size={16} />
                      {copy.exploreTests}
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-[24px] border border-white/70 bg-white/85 p-4 dark:border-slate-700 dark:bg-slate-800/70">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">{copy.progressLeaderboard}</p>
                <p className="mt-2 text-3xl font-black text-dark">{progressData?.progress?.level || 1}</p>
                <p className="text-sm text-gray-500">{copy.heroLevelHint}</p>
              </div>
              <div className="rounded-[24px] border border-white/70 bg-white/85 p-4 dark:border-slate-700 dark:bg-slate-800/70">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">{copy.currentStreak}</p>
                <div className="mt-2 flex items-center gap-2">
                  <Flame className="text-amber-500" size={22} />
                  <span className="text-3xl font-black text-dark">{progressData?.progress?.currentStreakDays || 0}</span>
                </div>
                <p className="text-sm text-gray-500">{copy.heroStreakHint}</p>
              </div>
              <div className="rounded-[24px] border border-white/70 bg-white/85 p-4 dark:border-slate-700 dark:bg-slate-800/70">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">XP</p>
                <p className="mt-2 text-3xl font-black text-dark">{progressData?.progress?.xp || 0}</p>
                <p className="text-sm text-gray-500">{copy.heroXpHint.replace('{{xp}}', String(levelMeta?.xpForNextLevel || 100))}</p>
              </div>
            </div>
          </div>
        </motion.section>

        {isAuthenticated && (
          <div className="mt-8 grid gap-5 lg:grid-cols-[1.1fr_0.9fr_0.9fr]">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card-solid p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">{continueSession ? copy.continueTitle : copy.latestResultTitle}</p>
                  <h3 className="mt-2 text-lg font-semibold text-dark">
                    {continueSession?.testTitle || recentResult?.test?.title || copy.noRecentActivity}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {continueSession
                      ? copy.resumeAt.replace('{{current}}', String((continueSession.currentQ || 0) + 1)).replace('{{total}}', String(continueSession.questionCount || 0))
                      : recentResult
                        ? copy.latestResultDesc
                        : copy.noRecentActivityDesc}
                  </p>
                </div>
                <div className="rounded-2xl bg-primary-50 p-3 text-primary-600 dark:bg-primary-900/20 dark:text-primary-300">
                  {continueSession ? <Clock3 size={22} /> : <Target size={22} />}
                </div>
              </div>

              {continueSession ? (
                <>
                  <div className="mt-4 rounded-2xl border border-primary-100 bg-primary-50/80 p-4 dark:border-primary-900/40 dark:bg-primary-900/10">
                    <div className="flex items-center justify-between text-xs text-primary-600 dark:text-primary-300">
                      <span>{copy.answeredNow.replace('{{count}}', String(continueSession.answeredCount || 0))}</span>
                      <span>{new Date(continueSession.updatedAt).toLocaleTimeString()}</span>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-white/80 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-primary-500"
                        style={{ width: `${continueSession.questionCount ? Math.min(100, Math.round(((continueSession.answeredCount || 0) / continueSession.questionCount) * 100)) : 0}%` }}
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/test/${continueSession.shareLink}`)}
                    className="btn-primary mt-4 inline-flex items-center gap-2"
                  >
                    {copy.continueButton}
                    <ArrowRight size={16} />
                  </button>
                </>
              ) : recentResult ? (
                <>
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <div className="rounded-2xl bg-emerald-50 p-3 text-center dark:bg-emerald-900/15">
                      <p className="text-xl font-bold text-emerald-600">{recentResult.percentage}%</p>
                      <p className="text-[11px] text-emerald-500">{copy.scoreLabel}</p>
                    </div>
                    <div className="rounded-2xl bg-blue-50 p-3 text-center dark:bg-blue-900/15">
                      <p className="text-xl font-bold text-blue-600">{recentResult.isPractice ? copy.completedPractice : copy.completedExams}</p>
                      <p className="text-[11px] text-blue-500">{copy.modeLabel}</p>
                    </div>
                    <div className="rounded-2xl bg-amber-50 p-3 text-center dark:bg-amber-900/15">
                      <p className="text-xl font-bold text-amber-600">{recentResult.timeSpent || 0}s</p>
                      <p className="text-[11px] text-amber-500">{copy.timeLabel}</p>
                    </div>
                  </div>
                  <button onClick={() => navigate(`/result/${recentResult._id}`)} className="btn-secondary mt-4 inline-flex items-center gap-2">
                    {copy.openResult}
                    <ArrowRight size={16} />
                  </button>
                </>
              ) : (
                <button onClick={() => navigate('/my-tests')} className="btn-secondary mt-4 inline-flex items-center gap-2">
                  {copy.createFirstChallenge}
                  <ArrowRight size={16} />
                </button>
              )}
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card-solid p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">{copy.dailyChallenge}</p>
                  <h3 className="mt-2 text-lg font-semibold text-dark">{dailyChallenge?.test?.title || copy.exploreTests}</h3>
                  <p className="mt-1 text-sm text-gray-500">{copy.dailyChallengeDesc}</p>
                </div>
                <div className="rounded-2xl bg-amber-50 p-3 text-amber-500 dark:bg-amber-900/20 dark:text-amber-300">
                  <CalendarDays size={22} />
                </div>
              </div>
              {dailyChallenge?.test ? (
                <>
                  <div className="mt-4 flex items-center justify-between rounded-2xl border border-amber-100 bg-amber-50/80 p-4 dark:border-amber-900/40 dark:bg-amber-900/10">
                    <div>
                      <p className="text-sm font-semibold text-dark">{copy.rewardXp.replace('{{xp}}', String(dailyChallenge.rewardXp || 40))}</p>
                      <p className="text-xs text-gray-500">{dailyChallenge.completed ? copy.completedToday : copy.availableToday}</p>
                    </div>
                    {dailyChallenge.completed ? (
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-300">
                        {copy.doneLabel}
                      </span>
                    ) : (
                      <button onClick={() => navigate(`/test/${dailyChallenge.test.shareLink}`)} className="btn-primary py-2 px-4 text-sm inline-flex items-center gap-1.5">
                        <Play size={14} />
                        {copy.startChallenge}
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <p className="mt-4 text-sm text-gray-500">{copy.noDailyChallenge}</p>
              )}
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card-solid p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">{copy.weeklySprint}</p>
                  <h3 className="mt-2 text-lg font-semibold text-dark">{copy.sprintProgress.replace('{{current}}', String(weeklySprint?.completedCount || 0)).replace('{{goal}}', String(weeklySprint?.goalCount || 3))}</h3>
                  <p className="mt-1 text-sm text-gray-500">{copy.weeklySprintDesc}</p>
                </div>
                <div className="rounded-2xl bg-violet-50 p-3 text-violet-500 dark:bg-violet-900/20 dark:text-violet-300">
                  <Dumbbell size={22} />
                </div>
              </div>
              <div className="mt-4 h-2 rounded-full bg-gray-100 dark:bg-slate-700">
                <div
                  className="h-full rounded-full bg-violet-500"
                  style={{ width: `${Math.min(100, Math.round((((weeklySprint?.completedCount || 0)) / (weeklySprint?.goalCount || 3)) * 100))}%` }}
                />
              </div>
              <div className="mt-4 space-y-2">
                {(weeklySprint?.tests || []).map((test) => (
                  <button
                    key={test._id}
                    onClick={() => navigate(`/test-profile/${test.shareLink}`)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-gray-100 px-3 py-3 text-left transition hover:border-primary-200 hover:bg-primary-50/50 dark:border-slate-700 dark:hover:border-primary-900/50 dark:hover:bg-primary-900/10"
                  >
                    <div className="h-10 w-10 overflow-hidden rounded-xl bg-gradient-to-br from-primary-500 to-sky-500 text-white flex items-center justify-center font-semibold">
                      {test.coverImage ? <img src={test.coverImage} alt="" className="h-full w-full object-cover" /> : (test.title?.[0] || 'T').toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-dark">{test.title}</p>
                      <p className="text-xs text-gray-500">{test.totalPoints || 0} pts</p>
                    </div>
                    <ArrowRight size={16} className="text-gray-300" />
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}

        {isAuthenticated && (
          <div className="mt-5 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card-solid p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">{copy.progressTitle}</p>
                  <h3 className="mt-2 text-lg font-semibold text-dark">{copy.progressDesc}</h3>
                </div>
                <div className="rounded-2xl bg-primary-50 p-3 text-primary-500 dark:bg-primary-900/20 dark:text-primary-300">
                  <Target size={22} />
                </div>
              </div>

              {dashboardLoading ? (
                <div className="mt-4 h-40 animate-pulse rounded-2xl bg-gray-100 dark:bg-slate-700" />
              ) : (
                <>
                  <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50/80 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <p className="text-3xl font-black text-dark">{copy.levelShort} {progressData?.progress?.level || 1}</p>
                        <p className="text-sm text-gray-500">{progressData?.progress?.xp || 0} XP</p>
                      </div>
                      <div className="text-right text-sm text-gray-500">
                        <p>{levelMeta?.xpIntoLevel || 0} / {levelMeta?.xpForNextLevel || 100}</p>
                        <p>{levelMeta?.progressPercent || 0}%</p>
                      </div>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-white dark:bg-slate-700">
                      <div className="h-full rounded-full bg-primary-500" style={{ width: `${levelMeta?.progressPercent || 0}%` }} />
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl bg-amber-50 p-4 text-center dark:bg-amber-900/15">
                      <Flame className="mx-auto text-amber-500" size={20} />
                      <p className="mt-2 text-2xl font-bold text-dark">{progressData?.progress?.currentStreakDays || 0}</p>
                      <p className="text-xs text-gray-500">{copy.currentStreak}</p>
                    </div>
                    <div className="rounded-2xl bg-emerald-50 p-4 text-center dark:bg-emerald-900/15">
                      <Medal className="mx-auto text-emerald-500" size={20} />
                      <p className="mt-2 text-2xl font-bold text-dark">{progressData?.progress?.stats?.completedExams || 0}</p>
                      <p className="text-xs text-gray-500">{copy.completedExams}</p>
                    </div>
                    <div className="rounded-2xl bg-blue-50 p-4 text-center dark:bg-blue-900/15">
                      <Crown className="mx-auto text-blue-500" size={20} />
                      <p className="mt-2 text-2xl font-bold text-dark">{progressData?.progress?.stats?.perfectScores || 0}</p>
                      <p className="text-xs text-gray-500">{copy.perfectScores}</p>
                    </div>
                  </div>

                  <div className="mt-5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-dark">{copy.badgesTitle}</p>
                      <p className="text-xs text-gray-400">{formattedBadges.length}</p>
                    </div>
                    {formattedBadges.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {formattedBadges.map((badge) => (
                          <span
                            key={`${badge.key}-${badge.unlockedAt}`}
                            className="inline-flex items-center gap-2 rounded-full border border-primary-100 bg-primary-50 px-3 py-1.5 text-xs font-medium text-primary-600 dark:border-primary-900/40 dark:bg-primary-900/10 dark:text-primary-300"
                          >
                            <Sparkles size={12} />
                            {badgeLabels[badge.key]?.[lang] || badge.key}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-gray-500">{copy.firstBadgeHint}</p>
                    )}
                  </div>

                  <div className="mt-5">
                    <p className="text-sm font-semibold text-dark">{copy.activity7d}</p>
                    <div className="mt-3 grid grid-cols-7 gap-2">
                      {(progressData?.weeklyActivity || []).map((entry) => (
                        <div key={entry.dayKey} className="rounded-2xl bg-gray-50 p-3 text-center dark:bg-slate-800/60">
                          <div
                            className="mx-auto mb-2 w-6 rounded-full bg-primary-500/90"
                            style={{ height: `${Math.max(12, Math.min(56, entry.count * 12 || 12))}px` }}
                          />
                          <p className="text-[10px] font-semibold text-gray-400">{entry.dayKey.slice(5)}</p>
                          <p className="text-xs font-semibold text-dark">{entry.count}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card-solid p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">{copy.topLearners}</p>
                  <h3 className="mt-2 text-lg font-semibold text-dark">{copy.topLearnersDesc}</h3>
                </div>
                <div className="rounded-2xl bg-amber-50 p-3 text-amber-500 dark:bg-amber-900/20 dark:text-amber-300">
                  <Trophy size={22} />
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {progressLeaderboard.length > 0 ? progressLeaderboard.slice(0, 5).map((entry) => (
                  <div key={entry.user?._id || entry.rank} className="flex items-center gap-3 rounded-2xl border border-gray-100 px-3 py-3 dark:border-slate-700">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold ${entry.rank === 1 ? 'bg-amber-100 text-amber-600' : entry.rank === 2 ? 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300' : entry.rank === 3 ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-gray-300'}`}>
                      {entry.rank}
                    </div>
                    <div className="h-9 w-9 overflow-hidden rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center font-semibold">
                      {entry.user?.avatar ? <img src={entry.user.avatar} alt="" className="h-full w-full object-cover" /> : `${entry.user?.firstName?.[0] || ''}${entry.user?.lastName?.[0] || ''}`}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-dark">{entry.user?.firstName} {entry.user?.lastName}</p>
                      <p className="text-xs text-gray-500">
                        {copy.leaderboardEntry
                          .replace('{{level}}', String(entry.level))
                          .replace('{{streak}}', String(entry.currentStreakDays))}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-primary-600">{entry.xp}</p>
                      <p className="text-[11px] text-gray-400">XP</p>
                    </div>
                  </div>
                )) : (
                  <p className="text-sm text-gray-500">{copy.leaderboardEmpty}</p>
                )}
              </div>
            </motion.div>
          </div>
        )}

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-10">
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-dark">{t('home')}</h2>
            <p className="mt-1 text-sm text-gray-500">{t('dashboardSubtitle')}</p>
          </div>

          <div className="flex items-center gap-3 mb-8 flex-wrap">
            <form onSubmit={handleSearch} className="relative flex-1 min-w-[220px] max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200/80 dark:border-slate-600 rounded-full text-sm text-dark placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:bg-white dark:focus:bg-slate-700 transition-all duration-200"
                placeholder={t('searchTests')}
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
              />
            </form>

            <div className="flex gap-1 bg-gray-100/80 dark:bg-slate-800 rounded-full p-1 border border-gray-200/50 dark:border-slate-700">
              {[
                { key: 'latest', label: t('newest') },
                { key: 'popular', label: t('popular') },
                { key: 'rating', label: t('rating') }
              ].map(option => (
                <button
                  key={option.key}
                  onClick={() => { setSort(option.key); setPage(1); }}
                  className={`px-4 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-all duration-200 ${
                    sort === option.key
                      ? 'bg-white dark:bg-slate-700 text-dark shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-dark dark:hover:text-gray-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map(index => (
                <div key={index} className="glass-card-solid p-6 animate-pulse">
                  <div className="h-40 rounded-2xl bg-gray-200 dark:bg-slate-700 mb-4" />
                  <div className="h-5 bg-gray-200 rounded w-3/4 mb-3" />
                  <div className="h-4 bg-gray-100 rounded w-full mb-2" />
                  <div className="h-4 bg-gray-100 rounded w-1/2 mb-4" />
                </div>
              ))}
            </div>
          ) : tests.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-20"
            >
              <div className="w-20 h-20 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-primary-400" />
              </div>
              <h3 className="text-lg font-semibold text-dark mb-2">{t('noTests')}</h3>
              <p className="text-gray-500 mb-6">{t('createFirst')}</p>
              <button onClick={() => navigate('/create-test')} className="btn-primary">
                {t('createTest')}
              </button>
            </motion.div>
          ) : (
            <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {tests.map((test) => {
                const isCreator = (test.creator?._id || test.creator?.id) === currentUserId;
                return (
                  <motion.div
                    key={test._id}
                    variants={cardVariants}
                    whileHover={{ y: -4, transition: { duration: 0.2 } }}
                    className="glass-card-solid overflow-hidden cursor-pointer group relative flex flex-col"
                  >
                    <TestCoverArtwork
                      coverImage={test.coverImage}
                      title={test.title}
                      className="w-full"
                      imageClassName="h-full w-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                      onClick={() => navigate(`/test-profile/${test.shareLink}`)}
                      style={{ aspectRatio: '16 / 9' }}
                    />

                    <div className="p-4 sm:p-5 flex flex-col flex-1">
                      <div className="absolute top-4 right-4 z-10">
                        <button
                          onClick={(event) => { event.stopPropagation(); setMenuOpen(menuOpen === test._id ? null : test._id); }}
                          className="rounded-lg bg-white/90 p-1.5 shadow-sm backdrop-blur transition-colors hover:bg-white dark:bg-slate-800/90 dark:hover:bg-slate-700"
                        >
                          <MoreVertical size={16} className="text-gray-400" />
                        </button>
                        {menuOpen === test._id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="absolute right-0 mt-1 w-44 bg-white dark:bg-slate-800 rounded-xl shadow-glass border border-gray-100 dark:border-slate-700 p-1.5 z-10"
                          >
                            {isCreator && (
                              <>
                                <button
                                  onClick={(event) => { event.stopPropagation(); navigate(`/edit-test/${test._id}`); setMenuOpen(null); }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-lg"
                                >
                                  <Edit3 size={14} /> {t('edit')}
                                </button>
                                <button
                                  onClick={(event) => { event.stopPropagation(); navigate(`/results/${test._id}`); setMenuOpen(null); }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-lg"
                                >
                                  <Users size={14} /> {t('viewResults')}
                                </button>
                                <hr className="my-1 border-gray-100 dark:border-slate-700" />
                              </>
                            )}
                            <button
                              onClick={(event) => { event.stopPropagation(); copyShareLink(test.shareLink); setMenuOpen(null); }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-lg"
                            >
                              <Copy size={14} /> {t('copyLink')}
                            </button>
                            {isCreator && (
                              <button
                                onClick={(event) => { event.stopPropagation(); setDeleteConfirm({ open: true, id: test._id }); setMenuOpen(null); }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                              >
                                <Trash2 size={14} /> {t('delete')}
                              </button>
                            )}
                          </motion.div>
                        )}
                      </div>

                      <div onClick={() => navigate(`/test-profile/${test.shareLink}`)} className="flex flex-col flex-1">
                        <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                          {test.settings?.isPublic ? (
                            <span className="badge-info flex items-center gap-1 text-[10px] py-0.5 px-2"><Eye size={10} /> {t('publicTest')}</span>
                          ) : (
                            <span className="badge-warning flex items-center gap-1 text-[10px] py-0.5 px-2"><EyeOff size={10} /> {t('privateTest')}</span>
                          )}
                          {test.settings?.practiceMode && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600 dark:bg-blue-900/20 dark:text-blue-300">
                              <Dumbbell size={10} /> Practice
                            </span>
                          )}
                          <span className="text-[10px] text-gray-400">
                            {test.questions?.length || 0} {t('questions')}
                          </span>
                        </div>

                        <h3 className="mb-1 pr-8 text-[15px] font-semibold text-dark transition-colors group-hover:text-primary-600 line-clamp-1">
                          {test.title}
                        </h3>

                        <p className="mb-3 min-h-[2.5rem] text-[13px] leading-5 text-gray-500 line-clamp-2">
                          {test.description || t('noDescription')}
                        </p>

                        {test.tags?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {test.tags.slice(0, 3).map((tag, index) => (
                              <span key={index} className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-slate-700 rounded-md text-[11px] text-gray-600 dark:text-gray-400">
                                <Tag size={9} /> {tag}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="flex-1" />

                        <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-slate-700">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-6 h-6 bg-primary-100 text-primary-600 rounded-md flex items-center justify-center text-[10px] font-semibold overflow-hidden flex-shrink-0">
                              {test.creator?.avatar ? (
                                <img src={test.creator.avatar} alt="" className="w-full h-full object-cover rounded-md" />
                              ) : (
                                <>{test.creator?.firstName?.[0]}{test.creator?.lastName?.[0]}</>
                              )}
                            </div>
                            <span className="text-xs text-gray-500 truncate">
                              {test.creator?.firstName} {test.creator?.lastName?.[0]}.
                            </span>
                          </div>
                          <div className="flex items-center gap-2.5 flex-shrink-0">
                            {renderStars(test.rating)}
                            <button
                              onClick={(event) => { event.stopPropagation(); navigate(`/leaderboard/${test._id}`); }}
                              className="flex items-center gap-1 text-[10px] text-primary-500 hover:text-primary-600 transition"
                              title="Рейтинг"
                            >
                              <Trophy size={12} />
                            </button>
                            <div className="flex items-center gap-1 text-xs text-gray-400">
                              <Users size={12} />
                              {test.attemptCount || 0}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}

          {!loading && totalPages > 1 && (
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={(nextPage) => { setPage(nextPage); window.scrollTo(0, 0); }} />
          )}
        </motion.div>
      </main>
    </div>
  );
}
