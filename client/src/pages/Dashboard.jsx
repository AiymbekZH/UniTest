import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  Copy,
  Crown,
  Dumbbell,
  Edit3,
  Eye,
  EyeOff,
  Flame,
  Medal,
  MoreVertical,
  Play,
  Plus,
  Search,
  Sparkles,
  Star,
  Tag,
  Target,
  Trash2,
  Trophy,
  Users
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import Navbar from '../components/Navbar';
import Pagination from '../components/Pagination';
import ConfirmDialog from '../components/ConfirmDialog';
import TestCoverArtwork from '../components/TestCoverArtwork';
import AnimatedIcon from '../components/AnimatedIcon';
import BrandLogo from '../components/BrandLogo';

const ACTIVE_SESSION_TTL_MS = 5 * 60 * 1000;
const DASHBOARD_TAB_KEY = 'unitest_dashboard_tab';

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
    noRecentActivityDesc: 'Start with a public test and begin a new streak.',
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
    completedExams: 'Completed tests',
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
    questionsLabel: 'Questions',
    modeLabel: 'Mode',
    timeLabel: 'Time',
    rewardCollected: 'XP collected',
    rewardReady: 'Reward ready',
    rewardLocked: 'Finish to unlock reward',
    sprintRewardHint: '+{{xp}} XP after completion',
    sprintDoneTag: 'Completed',
    homeTab: 'Home',
    challengesTab: 'Challenges',
    progressTab: 'Progress',
    exploreTab: 'Explore',
    quickStats: 'Quick stats',
    resetIn: 'Reset in',
    resetNow: 'Refreshing...',
    quickChallengeTitle: 'Today on deck',
    quickChallengeDesc: 'Your daily challenge rotates at the next UTC reset.',
    challengeReadyState: 'Ready to run',
    keepMomentum: 'Keep momentum',
    openChallenges: 'Open challenges'
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
    noRecentActivityDesc: 'Начни с публичного теста и запусти новую серию.',
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
    completedExams: 'Завершённые тесты',
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
    questionsLabel: 'Вопросы',
    modeLabel: 'Режим',
    timeLabel: 'Время',
    rewardCollected: 'XP получен',
    rewardReady: 'Награда готова',
    rewardLocked: 'Заверши спринт, чтобы получить награду',
    sprintRewardHint: '+{{xp}} XP после завершения',
    sprintDoneTag: 'Выполнено',
    homeTab: 'Главная',
    challengesTab: 'Челленджи',
    progressTab: 'Прогресс',
    exploreTab: 'Каталог',
    quickStats: 'Быстрые метрики',
    resetIn: 'Сброс через',
    resetNow: 'Обновление...',
    quickChallengeTitle: 'Сегодня в фокусе',
    quickChallengeDesc: 'Челлендж дня сменится на следующем UTC-сбросе.',
    challengeReadyState: 'Готов к запуску',
    keepMomentum: 'Держи темп',
    openChallenges: 'Открыть челленджи'
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
    noRecentActivityDesc: 'Қоғамдық тесттен бастап, жаңа серияны іске қос.',
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
    completedExams: 'Аяқталған тесттер',
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
    questionsLabel: 'Сұрақтар',
    modeLabel: 'Режим',
    timeLabel: 'Уақыт',
    rewardCollected: 'XP алынды',
    rewardReady: 'Сыйлық дайын',
    rewardLocked: 'Сыйлық алу үшін спринтті аяқта',
    sprintRewardHint: 'Аяқтаған соң +{{xp}} XP',
    sprintDoneTag: 'Орындалды',
    homeTab: 'Басты',
    challengesTab: 'Челленджтер',
    progressTab: 'Прогресс',
    exploreTab: 'Каталог',
    quickStats: 'Жылдам метрикалар',
    resetIn: 'Қалғаны',
    resetNow: 'Жаңартылуда...',
    quickChallengeTitle: 'Бүгінгі фокус',
    quickChallengeDesc: 'Күн челленджі келесі UTC-сброс кезінде ауысады.',
    challengeReadyState: 'Бастауға дайын',
    keepMomentum: 'Қарқынды сақта',
    openChallenges: 'Челленджтерді ашу'
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
    noRecentActivityDesc: 'Empieza con un test público y lanza una nueva racha.',
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
    completedExams: 'Tests completados',
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
    questionsLabel: 'Preguntas',
    modeLabel: 'Modo',
    timeLabel: 'Tiempo',
    rewardCollected: 'XP recibido',
    rewardReady: 'Recompensa lista',
    rewardLocked: 'Termina el sprint para desbloquear la recompensa',
    sprintRewardHint: '+{{xp}} XP al completarlo',
    sprintDoneTag: 'Completado',
    homeTab: 'Inicio',
    challengesTab: 'Desafíos',
    progressTab: 'Progreso',
    exploreTab: 'Explorar',
    quickStats: 'Métricas rápidas',
    resetIn: 'Reinicio en',
    resetNow: 'Actualizando...',
    quickChallengeTitle: 'En foco hoy',
    quickChallengeDesc: 'El desafío diario rota en el próximo reinicio UTC.',
    challengeReadyState: 'Listo para empezar',
    keepMomentum: 'Mantén el ritmo',
    openChallenges: 'Abrir desafíos'
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
  },
  first_arena: {
    en: 'First arena',
    ru: 'Первая арена',
    kz: 'Алғашқы арена',
    es: 'Primera arena'
  },
  arena_winner: {
    en: 'Arena winner',
    ru: 'Победа в арене',
    kz: 'Арена жеңімпазы',
    es: 'Ganador de arena'
  },
  duel_winner: {
    en: 'Duel winner',
    ru: 'Победа в дуэли',
    kz: 'Дуэль жеңімпазы',
    es: 'Ganador del duelo'
  }
};

const tabIcons = {
  home: Sparkles,
  challenges: CalendarDays,
  progress: Target,
  explore: Search
};

const getCurrentUserId = (user) => user?._id || user?.id || '';

function countAnsweredQuestions(answers = {}) {
  return Object.values(answers).filter((answer) => {
    if (!answer) return false;
    if (Array.isArray(answer.selectedOptions) && answer.selectedOptions.length > 0) return true;
    if (typeof answer.textAnswer === 'string' && answer.textAnswer.trim()) return true;
    if (Array.isArray(answer.matchingPairs) && answer.matchingPairs.length > 0) return true;
    return false;
  }).length;
}

function readContinueSession() {
  if (typeof window === 'undefined') return null;

  const keys = Object.keys(localStorage).filter((key) => key.startsWith('testSession_'));
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

function readSavedDashboardTab() {
  if (typeof window === 'undefined') return 'home';
  return localStorage.getItem(DASHBOARD_TAB_KEY) || 'home';
}

function formatCountdown(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return '00:00:00';

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
}

function DashboardTabButton({ label, tabKey, active, onClick }) {
  const Icon = tabIcons[tabKey];

  return (
    <button
      type="button"
      onClick={() => onClick(tabKey)}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition ${
        active
          ? 'bg-white text-dark shadow-sm dark:bg-slate-700 dark:text-white'
          : 'text-gray-500 hover:text-dark dark:text-gray-400 dark:hover:text-gray-100'
      }`}
    >
      <AnimatedIcon
        icon={Icon}
        size={15}
        active={active}
        preset={active ? 'soft-pulse' : ''}
        className={active ? 'text-primary-500 dark:text-primary-300' : 'text-gray-400'}
      />
      {label}
    </button>
  );
}

function SummaryMetric({ icon: Icon, label, value, tone = 'primary' }) {
  const toneMap = {
    primary: 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-300',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-300',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-300',
    blue: 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-300'
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4 dark:border-slate-700 dark:bg-slate-800/60">
      <div className={`inline-flex rounded-2xl p-3 ${toneMap[tone] || toneMap.primary}`}>
        <AnimatedIcon icon={Icon} size={18} className="text-current" />
      </div>
      <p className="mt-4 text-2xl font-black text-dark">{value}</p>
      <p className="mt-1 text-sm text-gray-500">{label}</p>
    </div>
  );
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
  const [dailyCountdownMs, setDailyCountdownMs] = useState(null);
  const [activeTab, setActiveTab] = useState(() => readSavedDashboardTab());
  const { user, isAuthenticated } = useAuth();
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const copy = dashboardCopy[lang] || dashboardCopy.en;
  const currentUserId = getCurrentUserId(user);
  const testsPerPage = 12;
  const challengeRefreshInFlight = useRef(false);

  const availableTabs = useMemo(
    () => (isAuthenticated ? ['home', 'challenges', 'progress', 'explore'] : ['home', 'explore']),
    [isAuthenticated]
  );

  const refreshContinueSession = useCallback(() => {
    setContinueSession(readContinueSession());
  }, []);

  const refreshChallenges = useCallback(async () => {
    const res = await api.get('/challenges/active');
    setChallengeData(res.data);
    return res.data;
  }, []);

  const loadDashboardData = useCallback(async () => {
    if (!isAuthenticated) {
      setProgressData(null);
      setChallengeData(null);
      setProgressLeaderboard([]);
      return;
    }

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
  }, [copy.progressLoadError, isAuthenticated]);

  const fetchTests = useCallback(async () => {
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
  }, [page, search, sort, t]);

  useEffect(() => {
    if (!availableTabs.includes(activeTab)) {
      setActiveTab('home');
      return;
    }
    localStorage.setItem(DASHBOARD_TAB_KEY, activeTab);
  }, [activeTab, availableTabs]);

  useEffect(() => {
    refreshContinueSession();
    const handleFocus = () => refreshContinueSession();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refreshContinueSession]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    if (activeTab !== 'explore') return;
    fetchTests();
  }, [activeTab, fetchTests]);

  useEffect(() => {
    if (!isAuthenticated || !challengeData?.dailyResetAt || !challengeData?.serverNow || !challengeData?.dailyChallenge?.test) {
      setDailyCountdownMs(null);
      return undefined;
    }

    const resetAtMs = new Date(challengeData.dailyResetAt).getTime();
    const serverNowMs = new Date(challengeData.serverNow).getTime();
    if (!Number.isFinite(resetAtMs) || !Number.isFinite(serverNowMs)) {
      setDailyCountdownMs(null);
      return undefined;
    }

    const serverOffsetMs = serverNowMs - Date.now();

    const tick = () => {
      const remaining = resetAtMs - (Date.now() + serverOffsetMs);
      if (remaining <= 0) {
        setDailyCountdownMs(0);
        if (!challengeRefreshInFlight.current) {
          challengeRefreshInFlight.current = true;
          refreshChallenges().finally(() => {
            challengeRefreshInFlight.current = false;
          });
        }
        return;
      }
      setDailyCountdownMs(remaining);
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [challengeData?.dailyChallenge?.test, challengeData?.dailyResetAt, challengeData?.serverNow, isAuthenticated, refreshChallenges]);

  const handleSearch = (event) => {
    event.preventDefault();
    setPage(1);
    fetchTests();
  };

  const deleteTest = async (id) => {
    try {
      await api.delete(`/tests/${id}`);
      setTests((prev) => prev.filter((test) => test._id !== id));
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
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={12}
          className={star <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}
        />
      ))}
      <span className="ml-1 text-xs text-gray-500">{rating?.toFixed(1) || '0.0'}</span>
    </div>
  );

  const levelMeta = progressData?.progress?.levelMeta;
  const recentResult = progressData?.recentResults?.[0] || null;
  const dailyChallenge = challengeData?.dailyChallenge || null;
  const weeklySprint = challengeData?.weeklySprint || null;
  const weeklyCompletedSet = useMemo(
    () => new Set(weeklySprint?.completedTestIds || []),
    [weeklySprint?.completedTestIds]
  );
  const formattedBadges = useMemo(
    () => (progressData?.progress?.badges || []).slice(-4).reverse(),
    [progressData?.progress?.badges]
  );
  const dailyCountdownLabel = dailyCountdownMs === 0 ? copy.resetNow : formatCountdown(dailyCountdownMs || 0);

  const homeCards = isAuthenticated ? (
    <div className="grid items-start gap-5 xl:grid-cols-[1.08fr_0.92fr]">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card-solid self-start p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
              {continueSession ? copy.continueTitle : copy.latestResultTitle}
            </p>
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
            <AnimatedIcon
              icon={continueSession ? Clock3 : Target}
              size={22}
              preset={continueSession ? 'attention-wiggle' : 'soft-pulse'}
              active
              hover={false}
            />
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
              type="button"
              onClick={() => navigate(`/test/${continueSession.shareLink}`)}
              className="btn-primary mt-4 inline-flex items-center gap-2"
            >
              {copy.continueButton}
              <AnimatedIcon icon={ArrowRight} size={16} className="text-white" />
            </button>
          </>
        ) : recentResult ? (
          <>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-emerald-50 p-3 text-center dark:bg-emerald-900/15">
                <p className="text-xl font-bold text-emerald-600">{recentResult.percentage}%</p>
                <p className="text-[11px] text-emerald-500">{copy.scoreLabel}</p>
              </div>
              <div className="rounded-2xl bg-primary-50 p-3 text-center dark:bg-primary-900/15">
                <p className="text-xl font-bold text-primary-600">{recentResult.answers?.length || 0}</p>
                <p className="text-[11px] text-primary-500">{copy.questionsLabel}</p>
              </div>
              <div className="rounded-2xl bg-amber-50 p-3 text-center dark:bg-amber-900/15">
                <p className="text-xl font-bold text-amber-600">{recentResult.timeSpent || 0}s</p>
                <p className="text-[11px] text-amber-500">{copy.timeLabel}</p>
              </div>
            </div>
            <button type="button" onClick={() => navigate(`/result/${recentResult._id}`)} className="btn-secondary mt-4 inline-flex items-center gap-2">
              {copy.openResult}
              <AnimatedIcon icon={ArrowRight} size={16} />
            </button>
          </>
        ) : (
          <button type="button" onClick={() => navigate('/my-tests')} className="btn-secondary mt-4 inline-flex items-center gap-2">
            {copy.createFirstChallenge}
            <AnimatedIcon icon={ArrowRight} size={16} />
          </button>
        )}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card-solid self-start p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">{copy.quickChallengeTitle}</p>
            <h3 className="mt-2 text-lg font-semibold text-dark">{dailyChallenge?.test?.title || copy.exploreTests}</h3>
            <p className="mt-1 text-sm text-gray-500">{copy.quickChallengeDesc}</p>
          </div>
          <div className="rounded-2xl bg-amber-50 p-3 text-amber-500 dark:bg-amber-900/20 dark:text-amber-300">
            <AnimatedIcon
              icon={CalendarDays}
              size={22}
              active={Boolean(dailyChallenge?.test && !dailyChallenge?.completed)}
              preset="countdown-pulse"
              hover={false}
            />
          </div>
        </div>

        {dailyChallenge?.test ? (
          <>
            <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50/80 p-4 dark:border-amber-900/40 dark:bg-amber-900/10">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-dark">{copy.rewardXp.replace('{{xp}}', String(dailyChallenge.rewardXp || 40))}</p>
                  <p className="text-xs text-gray-500">
                    {dailyChallenge.rewardClaimed
                      ? copy.rewardCollected
                      : dailyChallenge.rewardReady
                        ? copy.rewardReady
                        : dailyChallenge.completed
                          ? copy.completedToday
                          : copy.challengeReadyState}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-600 dark:text-amber-300">{copy.resetIn}</p>
                  <p className="mt-1 font-mono text-lg font-bold text-dark">{dailyCountdownLabel}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <button
                type="button"
                onClick={() => navigate(`/test/${dailyChallenge.test.shareLink}`)}
                className="btn-primary inline-flex w-full items-center justify-center gap-2 sm:w-auto"
              >
                <AnimatedIcon icon={Play} size={14} className="text-white" />
                {copy.startChallenge}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('challenges')}
                className="btn-secondary inline-flex w-full items-center justify-center gap-2 sm:w-auto"
              >
                {copy.openChallenges}
                <AnimatedIcon icon={ArrowRight} size={16} />
              </button>
            </div>
          </>
        ) : (
          <p className="mt-4 text-sm text-gray-500">{copy.noDailyChallenge}</p>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card-solid self-start p-5 xl:col-span-2"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">{copy.quickStats}</p>
            <h3 className="mt-2 text-lg font-semibold text-dark">{copy.keepMomentum}</h3>
            <p className="mt-1 text-sm text-gray-500">{copy.progressDesc}</p>
          </div>
          <div className="rounded-2xl bg-primary-50 p-3 text-primary-500 dark:bg-primary-900/20 dark:text-primary-300">
            <AnimatedIcon icon={Sparkles} size={22} active preset="orbit-drift" hover={false} />
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <SummaryMetric icon={Trophy} label="XP" value={progressData?.progress?.xp || 0} tone="blue" />
          <SummaryMetric icon={Flame} label={copy.currentStreak} value={progressData?.progress?.currentStreakDays || 0} tone="amber" />
          <SummaryMetric icon={Crown} label={copy.levelShort} value={progressData?.progress?.level || 1} tone="primary" />
        </div>
      </motion.div>
    </div>
  ) : null;

  const challengeCards = isAuthenticated ? (
    <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card-solid p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">{copy.dailyChallenge}</p>
            <h3 className="mt-2 text-lg font-semibold text-dark">{dailyChallenge?.test?.title || copy.exploreTests}</h3>
            <p className="mt-1 text-sm text-gray-500">{copy.dailyChallengeDesc}</p>
          </div>
          <div className="rounded-2xl bg-amber-50 p-3 text-amber-500 dark:bg-amber-900/20 dark:text-amber-300">
            <AnimatedIcon
              icon={CalendarDays}
              size={22}
              active={Boolean(dailyChallenge?.test && !dailyChallenge?.completed)}
              preset="countdown-pulse"
              hover={false}
            />
          </div>
        </div>
        {dailyChallenge?.test ? (
          <>
            <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50/80 p-4 dark:border-amber-900/40 dark:bg-amber-900/10">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-dark">{copy.rewardXp.replace('{{xp}}', String(dailyChallenge.rewardXp || 40))}</p>
                  <p className="text-xs text-gray-500">
                    {dailyChallenge.rewardClaimed
                      ? copy.rewardCollected
                      : dailyChallenge.rewardReady
                        ? copy.rewardReady
                        : dailyChallenge.completed
                          ? copy.completedToday
                          : copy.availableToday}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-600 dark:text-amber-300">{copy.resetIn}</p>
                  <p className="mt-1 font-mono text-xl font-bold text-dark">{dailyCountdownLabel}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
              {dailyChallenge.completed ? (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-300">
                  {dailyChallenge.rewardClaimed ? copy.doneLabel : copy.rewardReady}
                </span>
              ) : (
                <button type="button" onClick={() => navigate(`/test/${dailyChallenge.test.shareLink}`)} className="btn-primary inline-flex w-full items-center justify-center gap-2 sm:w-auto">
                  <AnimatedIcon icon={Play} size={14} className="text-white" />
                  {copy.startChallenge}
                </button>
              )}
              <button type="button" onClick={() => navigate(`/test-profile/${dailyChallenge.test.shareLink}`)} className="btn-secondary inline-flex w-full items-center justify-center gap-2 sm:w-auto">
                {copy.exploreTests}
                <AnimatedIcon icon={ArrowRight} size={16} />
              </button>
            </div>
          </>
        ) : (
          <p className="mt-4 text-sm text-gray-500">{copy.noDailyChallenge}</p>
        )}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card-solid p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">{copy.weeklySprint}</p>
            <h3 className="mt-2 text-lg font-semibold text-dark">
              {copy.sprintProgress.replace('{{current}}', String(weeklySprint?.completedCount || 0)).replace('{{goal}}', String(weeklySprint?.goalCount || 3))}
            </h3>
            <p className="mt-1 text-sm text-gray-500">{copy.weeklySprintDesc}</p>
          </div>
          <div className="rounded-2xl bg-violet-50 p-3 text-violet-500 dark:bg-violet-900/20 dark:text-violet-300">
            <AnimatedIcon
              icon={Dumbbell}
              size={22}
              active={Boolean(weeklySprint && !weeklySprint.completed)}
              preset="orbit-drift"
              hover={false}
            />
          </div>
        </div>
        <div className="mt-4 h-2 rounded-full bg-gray-100 dark:bg-slate-700">
          <div
            className="h-full rounded-full bg-violet-500"
            style={{ width: `${Math.min(100, Math.round((((weeklySprint?.completedCount || 0)) / (weeklySprint?.goalCount || 3)) * 100))}%` }}
          />
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 text-xs">
          <span className="font-semibold text-violet-600 dark:text-violet-300">
            {copy.sprintRewardHint.replace('{{xp}}', String(weeklySprint?.rewardXp || 120))}
          </span>
          <span className="text-gray-500">
            {weeklySprint?.rewardClaimed
              ? copy.rewardCollected
              : weeklySprint?.rewardReady
                ? copy.rewardReady
                : copy.rewardLocked}
          </span>
        </div>
        <div className="mt-4 space-y-2">
          {(weeklySprint?.tests || []).map((test) => (
            <button
              key={test._id}
              type="button"
              onClick={() => navigate(`/test-profile/${test.shareLink}`)}
              className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ${
                weeklyCompletedSet.has(test._id)
                  ? 'border-emerald-200 bg-emerald-50/80 dark:border-emerald-800 dark:bg-emerald-900/10'
                  : 'border-gray-100 hover:border-primary-200 hover:bg-primary-50/50 dark:border-slate-700 dark:hover:border-primary-900/50 dark:hover:bg-primary-900/10'
              }`}
            >
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-primary-500 to-sky-500 font-semibold text-white">
                {test.coverImage ? <img src={test.coverImage} alt="" className="h-full w-full object-cover" /> : (test.title?.[0] || 'T').toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-dark">{test.title}</p>
                <p className="text-xs text-gray-500">{test.totalPoints || 0} pts</p>
              </div>
              {weeklyCompletedSet.has(test._id) ? (
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-300">
                  {copy.sprintDoneTag}
                </span>
              ) : (
                <AnimatedIcon icon={ArrowRight} size={16} className="text-gray-300" />
              )}
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  ) : null;

  const progressCards = isAuthenticated ? (
    <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card-solid p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">{copy.progressTitle}</p>
            <h3 className="mt-2 text-lg font-semibold text-dark">{copy.progressDesc}</h3>
          </div>
          <div className="rounded-2xl bg-primary-50 p-3 text-primary-500 dark:bg-primary-900/20 dark:text-primary-300">
            <AnimatedIcon icon={Target} size={22} active preset="soft-pulse" hover={false} />
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
              <SummaryMetric icon={Flame} label={copy.currentStreak} value={progressData?.progress?.currentStreakDays || 0} tone="amber" />
              <SummaryMetric icon={Medal} label={copy.completedExams} value={progressData?.progress?.stats?.totalCompleted || 0} tone="emerald" />
              <SummaryMetric icon={Crown} label={copy.perfectScores} value={progressData?.progress?.stats?.perfectScores || 0} tone="blue" />
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
                      <AnimatedIcon icon={Sparkles} size={12} className="text-current" />
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

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card-solid p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">{copy.topLearners}</p>
            <h3 className="mt-2 text-lg font-semibold text-dark">{copy.topLearnersDesc}</h3>
          </div>
          <div className="rounded-2xl bg-amber-50 p-3 text-amber-500 dark:bg-amber-900/20 dark:text-amber-300">
            <AnimatedIcon icon={Trophy} size={22} active preset="trophy-pop" hover={false} />
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {progressLeaderboard.length > 0 ? progressLeaderboard.slice(0, 5).map((entry) => (
            <div key={entry.user?._id || entry.rank} className="flex items-center gap-3 rounded-2xl border border-gray-100 px-3 py-3 dark:border-slate-700">
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold ${
                entry.rank === 1
                  ? 'bg-amber-100 text-amber-600'
                  : entry.rank === 2
                    ? 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300'
                    : entry.rank === 3
                      ? 'bg-orange-100 text-orange-600'
                      : 'bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-gray-300'
              }`}>
                {entry.rank}
              </div>
              <button
                type="button"
                onClick={() => entry.user?._id && navigate(`/profile/${entry.user._id}`)}
                className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-primary-100 font-semibold text-primary-600 transition hover:scale-[1.03]"
              >
                {entry.user?.avatar ? <img src={entry.user.avatar} alt="" className="h-full w-full object-cover" /> : `${entry.user?.firstName?.[0] || ''}${entry.user?.lastName?.[0] || ''}`}
              </button>
              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => entry.user?._id && navigate(`/profile/${entry.user._id}`)}
                  className="truncate text-left text-sm font-semibold text-dark transition hover:text-primary-600"
                >
                  {entry.user?.firstName} {entry.user?.lastName}
                </button>
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
  ) : null;

  const renderExplore = () => (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-dark">{copy.exploreTab}</h2>
        <p className="mt-1 text-sm text-gray-500">{t('dashboardSubtitle')}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearch} className="relative min-w-[220px] max-w-md flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            className="w-full rounded-full border border-gray-200/80 bg-gray-50 py-2 pl-10 pr-4 text-sm text-dark transition-all duration-200 placeholder-gray-400 focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-slate-600 dark:bg-slate-800 dark:focus:bg-slate-700"
            placeholder={t('searchTests')}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </form>

        <div className="flex gap-1 rounded-full border border-gray-200/50 bg-gray-100/80 p-1 dark:border-slate-700 dark:bg-slate-800">
          {[
            { key: 'latest', label: t('newest') },
            { key: 'popular', label: t('popular') },
            { key: 'rating', label: t('rating') }
          ].map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => {
                setSort(option.key);
                setPage(1);
              }}
              className={`rounded-full px-4 py-1.5 text-[13px] font-medium whitespace-nowrap transition-all duration-200 ${
                sort === option.key
                  ? 'bg-white text-dark shadow-sm dark:bg-slate-700'
                  : 'text-gray-500 hover:text-dark dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((index) => (
            <div key={index} className="glass-card-solid p-6 animate-pulse">
              <div className="mb-4 h-40 rounded-2xl bg-gray-200 dark:bg-slate-700" />
              <div className="mb-3 h-5 w-3/4 rounded bg-gray-200" />
              <div className="mb-2 h-4 w-full rounded bg-gray-100" />
              <div className="mb-4 h-4 w-1/2 rounded bg-gray-100" />
            </div>
          ))}
        </div>
      ) : tests.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="py-20 text-center"
        >
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary-50">
            <AnimatedIcon icon={Plus} size={32} className="text-primary-400" active preset="soft-pulse" hover={false} />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-dark">{t('noTests')}</h3>
          <p className="mb-6 text-gray-500">{t('createFirst')}</p>
          <button type="button" onClick={() => navigate('/create-test')} className="btn-primary">
            {t('createTest')}
          </button>
        </motion.div>
      ) : (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {tests.map((test) => {
            const isCreator = (test.creator?._id || test.creator?.id) === currentUserId;
            return (
              <motion.div
                key={test._id}
                variants={cardVariants}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="glass-card-solid relative flex cursor-pointer flex-col overflow-hidden group"
              >
                <TestCoverArtwork
                  coverImage={test.coverImage}
                  title={test.title}
                  className="w-full"
                  imageClassName="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  onClick={() => navigate(`/test-profile/${test.shareLink}`)}
                  style={{ aspectRatio: '16 / 9' }}
                />

                <div className="flex flex-1 flex-col p-4 sm:p-5">
                  <div className="absolute right-4 top-4 z-10">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setMenuOpen(menuOpen === test._id ? null : test._id);
                      }}
                      className="rounded-lg bg-white/90 p-1.5 shadow-sm backdrop-blur transition-colors hover:bg-white dark:bg-slate-800/90 dark:hover:bg-slate-700"
                    >
                      <MoreVertical size={16} className="text-gray-400" />
                    </button>
                    {menuOpen === test._id && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute right-0 mt-1 z-10 w-44 rounded-xl border border-gray-100 bg-white p-1.5 shadow-glass dark:border-slate-700 dark:bg-slate-800"
                      >
                        {isCreator && (
                          <>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                navigate(`/edit-test/${test._id}`);
                                setMenuOpen(null);
                              }}
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-slate-700"
                            >
                              <Edit3 size={14} /> {t('edit')}
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                navigate(`/results/${test._id}`);
                                setMenuOpen(null);
                              }}
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-slate-700"
                            >
                              <Users size={14} /> {t('viewResults')}
                            </button>
                            <hr className="my-1 border-gray-100 dark:border-slate-700" />
                          </>
                        )}
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            copyShareLink(test.shareLink);
                            setMenuOpen(null);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-slate-700"
                        >
                          <Copy size={14} /> {t('copyLink')}
                        </button>
                        {isCreator && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setDeleteConfirm({ open: true, id: test._id });
                              setMenuOpen(null);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <Trash2 size={14} /> {t('delete')}
                          </button>
                        )}
                      </motion.div>
                    )}
                  </div>

                  <div onClick={() => navigate(`/test-profile/${test.shareLink}`)} className="flex flex-1 flex-col">
                    <div className="mb-2.5 flex flex-wrap items-center gap-2">
                      {test.settings?.isPublic ? (
                        <span className="badge-info flex items-center gap-1 px-2 py-0.5 text-[10px]"><Eye size={10} /> {t('publicTest')}</span>
                      ) : (
                        <span className="badge-warning flex items-center gap-1 px-2 py-0.5 text-[10px]"><EyeOff size={10} /> {t('privateTest')}</span>
                      )}
                      <span className="text-[10px] text-gray-400">
                        {test.questions?.length || 0} {t('questions')}
                      </span>
                    </div>

                    <h3 className="mb-1 pr-8 text-[15px] font-semibold text-dark transition-colors line-clamp-1 group-hover:text-primary-600">
                      {test.title}
                    </h3>

                    <p className="mb-3 min-h-[2.5rem] text-[13px] leading-5 text-gray-500 line-clamp-2">
                      {test.description || t('noDescription')}
                    </p>

                    {test.tags?.length > 0 && (
                      <div className="mb-3 flex flex-wrap gap-1.5">
                        {test.tags.slice(0, 3).map((tag, index) => (
                          <span key={index} className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600 dark:bg-slate-700 dark:text-gray-400">
                            <Tag size={9} /> {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex-1" />

                    <div className="flex items-center justify-between border-t border-gray-100 pt-3 dark:border-slate-700">
                      <div className="flex min-w-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            if (test.creator?._id) navigate(`/profile/${test.creator._id}`);
                          }}
                          className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-md bg-primary-100 text-[10px] font-semibold text-primary-600 transition hover:scale-[1.03]"
                        >
                          {test.creator?.avatar ? (
                            <img src={test.creator.avatar} alt="" className="h-full w-full rounded-md object-cover" />
                          ) : (
                            <>{test.creator?.firstName?.[0]}{test.creator?.lastName?.[0]}</>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            if (test.creator?._id) navigate(`/profile/${test.creator._id}`);
                          }}
                          className="truncate text-xs text-gray-500 transition hover:text-primary-600"
                        >
                          {test.creator?.firstName} {test.creator?.lastName?.[0]}.
                        </button>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-2.5">
                        {renderStars(test.rating)}
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            navigate(`/leaderboard/${test._id}`);
                          }}
                          className="flex items-center gap-1 text-[10px] text-primary-500 transition hover:text-primary-600"
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
  );

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

      <main className="mx-auto max-w-7xl px-3 py-6 sm:px-6 sm:py-8">
        <motion.section
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[28px] border border-primary-100 bg-gradient-to-br from-white via-primary-50/60 to-orange-50 p-5 shadow-[0_30px_80px_-50px_rgba(234,88,12,0.28)] dark:border-slate-700 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 sm:rounded-[32px] sm:p-6"
        >
          <div className="absolute -right-14 -top-14 h-44 w-44 rounded-full bg-primary-500/10 blur-3xl" />
          <div className="absolute -bottom-16 left-10 h-36 w-36 rounded-full bg-sky-400/10 blur-3xl" />
          <div className="relative grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary-200/70 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-600 dark:border-primary-900/50 dark:bg-slate-800/70 dark:text-primary-300">
                <BrandLogo size={18} />
                UniTest
              </div>
              <h1 className="mt-4 text-3xl font-bold tracking-tight text-dark sm:text-4xl">
                {isAuthenticated ? `${t('welcome')}, ${user?.firstName || 'Guest'}!` : copy.guestHeroTitle}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500 dark:text-gray-400">
                {isAuthenticated ? copy.heroDesc : copy.guestHeroDesc}
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                {isAuthenticated ? (
                  <>
                    <button type="button" onClick={() => navigate('/create-test')} className="btn-primary inline-flex w-full items-center justify-center gap-2 sm:w-auto">
                      <AnimatedIcon icon={Plus} size={16} className="text-white" />
                      {t('createTest')}
                    </button>
                    <button type="button" onClick={() => setActiveTab('explore')} className="btn-secondary inline-flex w-full items-center justify-center gap-2 sm:w-auto">
                      <AnimatedIcon icon={Search} size={16} />
                      {copy.exploreTests}
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" onClick={() => navigate('/register')} className="btn-primary inline-flex w-full items-center justify-center gap-2 sm:w-auto">
                      <AnimatedIcon icon={Plus} size={16} className="text-white" />
                      {copy.guestCta}
                    </button>
                    <button type="button" onClick={() => setActiveTab('explore')} className="btn-secondary inline-flex w-full items-center justify-center gap-2 sm:w-auto">
                      <AnimatedIcon icon={Play} size={16} />
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
                  <AnimatedIcon icon={Flame} size={22} active={Boolean(progressData?.progress?.currentStreakDays)} preset="flame-flicker" className="text-amber-500" hover={false} />
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

        <div className="mt-6 rounded-[24px] border border-gray-200/70 bg-gray-100/80 p-1.5 dark:border-slate-700 dark:bg-slate-800/80 sm:rounded-[28px] sm:p-2">
          <div className="flex gap-1 overflow-x-auto pb-1">
            {availableTabs.map((tabKey) => (
              <DashboardTabButton
                key={tabKey}
                tabKey={tabKey}
                active={activeTab === tabKey}
                onClick={setActiveTab}
                label={copy[`${tabKey}Tab`]}
              />
            ))}
          </div>
        </div>

        <div className="mt-8">
          {activeTab === 'home' && homeCards}
          {activeTab === 'challenges' && challengeCards}
          {activeTab === 'progress' && progressCards}
          {activeTab === 'explore' && renderExplore()}
        </div>
      </main>
    </div>
  );
}
