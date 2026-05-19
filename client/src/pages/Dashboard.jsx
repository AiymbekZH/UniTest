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
import AnimatedHero from '../components/AnimatedHero';
import TestCoverArtwork from '../components/TestCoverArtwork';
import AnimatedFlame from '../components/AnimatedFlame';
import AnimatedCounter from '../components/AnimatedCounter';
import MissionControl from '../components/dashboard/MissionControl';
import GuestHome from '../components/dashboard/GuestHome';
// (AnimatedIcon / BrandLogo removed — using raw Lucide icons for minimalism)

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
    guestLogin: 'I have an account',
    guestCtaEyebrow: 'Get started',
    guestCtaTitle: 'Take real tests, keep your streak alive',
    guestCtaDesc: 'Sign up in 30 seconds to save progress, climb the leaderboard, and unlock daily challenges.',
    guestPillarBrowseTitle: 'Browse public tests',
    guestPillarBrowseDesc: 'Hundreds of community-built tests across languages, school subjects, and exam prep.',
    guestPillarStreakTitle: 'Keep a daily streak',
    guestPillarStreakDesc: 'One test a day keeps you on track. Build momentum and watch your streak climb.',
    guestPillarCompeteTitle: 'Climb the leaderboard',
    guestPillarCompeteDesc: 'Earn XP for every test, level up your tier, and see how you rank globally.',
    guestStatTestsLabel: 'Public tests',
    guestStatFreeValue: 'Free',
    guestStatFreeLabel: 'No paywall, no card',
    guestStatLanguagesValue: '4',
    guestStatLanguagesLabel: 'Languages: en · ru · kz · es',
    guestPopularEyebrow: 'Trending right now',
    guestPopularTitle: 'Popular tests this week',
    guestPopularCta: 'See all',
    guestPopularPlay: 'Try',
    guestPopularEmpty: 'No public tests available yet — check back soon.',
    guestFinalTitle: 'Free forever for learners',
    guestFinalDesc: 'No credit card. No paywalls on public tests. Just learning.',
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
    guestLogin: 'У меня есть аккаунт',
    guestCtaEyebrow: 'Начни сейчас',
    guestCtaTitle: 'Проходи реальные тесты и держи серию',
    guestCtaDesc: 'Регистрация за 30 секунд: сохранишь прогресс, попадёшь в лидерборд и откроешь ежедневные челленджи.',
    guestPillarBrowseTitle: 'Каталог публичных тестов',
    guestPillarBrowseDesc: 'Сотни тестов от сообщества: языки, школьные предметы, подготовка к экзаменам.',
    guestPillarStreakTitle: 'Держи серию',
    guestPillarStreakDesc: 'Один тест в день — и ты в ритме. Серия растёт, а вместе с ней и привычка.',
    guestPillarCompeteTitle: 'Поднимайся в рейтинге',
    guestPillarCompeteDesc: 'Получай XP за каждый тест, прокачивай уровень и смотри, как поднимаешься в лидерборде.',
    guestStatTestsLabel: 'Публичных тестов',
    guestStatFreeValue: 'Бесплатно',
    guestStatFreeLabel: 'Без paywall и карты',
    guestStatLanguagesValue: '4',
    guestStatLanguagesLabel: 'Языка: en · ru · kz · es',
    guestPopularEyebrow: 'В тренде сейчас',
    guestPopularTitle: 'Популярные тесты этой недели',
    guestPopularCta: 'Все тесты',
    guestPopularPlay: 'Попробовать',
    guestPopularEmpty: 'Пока нет публичных тестов — загляни позже.',
    guestFinalTitle: 'Бесплатно для учеников',
    guestFinalDesc: 'Без карты. Без paywall на публичных тестах. Только учёба.',
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
    guestLogin: 'Аккаунтым бар',
    guestCtaEyebrow: 'Қазір баста',
    guestCtaTitle: 'Нақты тесттерді тапсыр, серияңды сақта',
    guestCtaDesc: '30 секундта тіркел: прогресс сақталады, лидербордқа кіресің, күн челленджтері ашылады.',
    guestPillarBrowseTitle: 'Қоғамдық тесттер каталогы',
    guestPillarBrowseDesc: 'Қоғам жасаған жүздеген тест: тілдер, мектеп пәндері, емтихан дайындығы.',
    guestPillarStreakTitle: 'Серияны сақта',
    guestPillarStreakDesc: 'Күніне бір тест — қарқын сақталады, серия өседі, әдет қалыптасады.',
    guestPillarCompeteTitle: 'Рейтингте көтеріл',
    guestPillarCompeteDesc: 'Әр тест үшін XP ал, деңгейіңді көтер, лидербордта өз орныңды қара.',
    guestStatTestsLabel: 'Қоғамдық тест',
    guestStatFreeValue: 'Тегін',
    guestStatFreeLabel: 'Картасыз, paywall жоқ',
    guestStatLanguagesValue: '4',
    guestStatLanguagesLabel: 'Тіл: en · ru · kz · es',
    guestPopularEyebrow: 'Қазір трендте',
    guestPopularTitle: 'Осы аптадағы танымал тесттер',
    guestPopularCta: 'Барлығын көру',
    guestPopularPlay: 'Бастау',
    guestPopularEmpty: 'Әзірге қоғамдық тест жоқ — кейінірек қайтып кел.',
    guestFinalTitle: 'Оқушыларға тегін',
    guestFinalDesc: 'Картасыз. Қоғамдық тесттерде ақы жоқ. Тек оқу.',
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
    guestLogin: 'Ya tengo cuenta',
    guestCtaEyebrow: 'Empieza ahora',
    guestCtaTitle: 'Resuelve tests reales y mantén tu racha',
    guestCtaDesc: 'Regístrate en 30 segundos para guardar progreso, subir en la clasificación y desbloquear desafíos diarios.',
    guestPillarBrowseTitle: 'Explora tests públicos',
    guestPillarBrowseDesc: 'Cientos de tests creados por la comunidad: idiomas, materias escolares, preparación de exámenes.',
    guestPillarStreakTitle: 'Mantén una racha diaria',
    guestPillarStreakDesc: 'Un test al día y vas en ritmo. La racha crece, el hábito se queda.',
    guestPillarCompeteTitle: 'Sube en la clasificación',
    guestPillarCompeteDesc: 'Gana XP en cada test, sube de nivel y mira tu posición global.',
    guestStatTestsLabel: 'Tests públicos',
    guestStatFreeValue: 'Gratis',
    guestStatFreeLabel: 'Sin paywall ni tarjeta',
    guestStatLanguagesValue: '4',
    guestStatLanguagesLabel: 'Idiomas: en · ru · kz · es',
    guestPopularEyebrow: 'En tendencia ahora',
    guestPopularTitle: 'Tests populares esta semana',
    guestPopularCta: 'Ver todos',
    guestPopularPlay: 'Probar',
    guestPopularEmpty: 'Todavía no hay tests públicos — vuelve pronto.',
    guestFinalTitle: 'Gratis para los estudiantes',
    guestFinalDesc: 'Sin tarjeta. Sin paywall en tests públicos. Solo aprender.',
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
      className={`touch-target relative inline-flex items-center gap-1.5 whitespace-nowrap rounded-2xl border-2 px-3.5 py-2 text-[12px] font-black transition-transform active:translate-y-[2px] ${
        active
          ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900'
          : 'border-slate-900 bg-white text-slate-700 hover:text-slate-900 dark:border-white dark:bg-slate-800 dark:text-slate-300'
      }`}
      style={{ boxShadow: active ? '0 3px 0 #0f172a' : '0 3px 0 #cbd5e1' }}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}

function SummaryMetric({ icon: Icon, label, value, tone = 'primary', flameStreak }) {
  const toneColors = {
    primary: 'text-primary-500',
    amber: 'text-amber-500',
    emerald: 'text-emerald-500',
    blue: 'text-primary-500'
  };
  const toneShadows = {
    primary: '0 6px 0 #c7d2fe',
    amber: '0 6px 0 #fde68a',
    emerald: '0 6px 0 #a7f3d0',
    blue: '0 6px 0 #c7d2fe'
  };
  const animateFlame = typeof flameStreak === 'number';
  const iconColor = toneColors[tone] || toneColors.primary;
  const numericValue = Number.isFinite(Number(value)) ? Number(value) : null;

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className="rounded-2xl border-2 border-slate-200 bg-white p-4 transition-shadow dark:border-slate-700 dark:bg-slate-800 sm:p-5"
      style={{ boxShadow: '0 4px 0 #e2e8f0' }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = toneShadows[tone] || '0 6px 0 #cbd5e1'; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 4px 0 #e2e8f0'; }}
    >
      {animateFlame ? (
        <span className={`mb-3 inline-block ${iconColor}`}>
          <AnimatedFlame streak={flameStreak} size={16} />
        </span>
      ) : (
        <Icon size={16} className={`mb-3 ${iconColor}`} />
      )}
      <p className="font-mono text-2xl font-black tracking-tight text-dark">
        {numericValue !== null ? <AnimatedCounter value={numericValue} duration={1.0} /> : value}
      </p>
      <p className="mt-0.5 text-[11px] font-black uppercase tracking-[0.14em] text-gray-400">{label}</p>
    </motion.div>
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
  // Lazy-loaded covers map: { testId: coverImageBase64 }. Dashboard fetches
  // tests list WITHOUT coverImage (fast), then in background fetches covers
  // for visible tests via batch /tests/covers endpoint. UI renders the
  // AnimatedPlaceholder until cover arrives, then swaps in.
  const [coversMap, setCoversMap] = useState({});
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

  // Lazy-load covers in background after tests list arrives.
  // Skip tests we already have a cover for (avoid refetching on pagination).
  useEffect(() => {
    if (!tests.length) return;
    const missingIds = tests
      .map(t => t._id)
      .filter(id => !(id in coversMap));
    if (!missingIds.length) return;
    const idsParam = missingIds.join(',');
    api.get('/tests/covers', { params: { ids: idsParam } })
      .then(res => {
        // Mark all requested ids as 'fetched' (even if no cover) so we don't refetch.
        const update = {};
        missingIds.forEach(id => { update[id] = res.data?.[id] || ''; });
        setCoversMap(prev => ({ ...prev, ...update }));
      })
      .catch(() => {
        // Silent fail — placeholder stays.
      });
  }, [tests, coversMap]);

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
    <div className="space-y-4 sm:space-y-6">
      <MissionControl
        level={progressData?.progress?.level || 1}
        xp={progressData?.progress?.xp || 0}
        xpIntoLevel={levelMeta?.xpIntoLevel || 0}
        xpForNextLevel={levelMeta?.xpForNextLevel || 100}
        continueSession={continueSession}
        dailyChallenge={dailyChallenge}
        weeklySprint={weeklySprint}
        countdownMs={dailyCountdownMs}
        copy={copy}
        onContinue={() => continueSession && navigate(`/test/${continueSession.shareLink}`)}
        onStartDaily={() => dailyChallenge?.test?.shareLink && navigate(`/test/${dailyChallenge.test.shareLink}`)}
        onClaimDaily={() => dailyChallenge?.test?.shareLink && navigate(`/test/${dailyChallenge.test.shareLink}`)}
        onOpenSprint={() => setActiveTab('challenges')}
        onExplore={() => setActiveTab('explore')}
      />

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="grid gap-3 [&>*]:min-w-0 sm:gap-4 lg:grid-cols-3">
      {/* Main card — continue session or latest result */}
      <div className="lg:col-span-2 chunky-card p-3 sm:p-5 lg:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-300 dark:text-gray-500">
          {continueSession ? copy.continueTitle : copy.latestResultTitle}
        </p>
        <h3 className="mt-3 text-lg font-semibold text-dark">
          {continueSession?.testTitle || recentResult?.test?.title || copy.noRecentActivity}
        </h3>
        <p className="mt-1 text-sm text-gray-400">
          {continueSession
            ? copy.resumeAt.replace('{{current}}', String((continueSession.currentQ || 0) + 1)).replace('{{total}}', String(continueSession.questionCount || 0))
            : recentResult
              ? copy.latestResultDesc
              : copy.noRecentActivityDesc}
        </p>

        {continueSession ? (
          <>
            <div className="mt-5 flex items-center justify-between text-xs text-gray-400">
              <span>{copy.answeredNow.replace('{{count}}', String(continueSession.answeredCount || 0))}</span>
              <span>{new Date(continueSession.updatedAt).toLocaleTimeString()}</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-slate-700">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-primary-500 to-violet-500"
                initial={{ width: 0 }}
                animate={{ width: `${continueSession.questionCount ? Math.min(100, Math.round(((continueSession.answeredCount || 0) / continueSession.questionCount) * 100)) : 0}%` }}
                transition={{ duration: 1.0, ease: 'easeOut' }}
              />
            </div>
            <button
              type="button"
              onClick={() => navigate(`/test/${continueSession.shareLink}`)}
              className="chunky-btn-primary mt-5 inline-flex items-center gap-2 text-xs sm:text-sm"
            >
              {copy.continueButton}
              <ArrowRight size={14} />
            </button>
          </>
        ) : recentResult ? (
          <>
            <div className="mt-5 flex gap-3">
              <motion.div
                whileHover={{ y: -2 }}
                className="flex-1 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-3 text-center dark:from-emerald-900/20 dark:to-emerald-900/10"
              >
                <p className="text-lg font-bold text-emerald-600">
                  <AnimatedCounter value={recentResult.percentage || 0} duration={0.9} />%
                </p>
                <p className="text-[10px] text-gray-400">{copy.scoreLabel}</p>
              </motion.div>
              <motion.div
                whileHover={{ y: -2 }}
                className="flex-1 rounded-xl bg-gray-50 p-3 text-center dark:bg-slate-700/50"
              >
                <p className="text-lg font-bold text-dark">
                  <AnimatedCounter value={recentResult.answers?.length || 0} duration={0.9} />
                </p>
                <p className="text-[10px] text-gray-400">{copy.questionsLabel}</p>
              </motion.div>
              <motion.div
                whileHover={{ y: -2 }}
                className="flex-1 rounded-xl bg-gray-50 p-3 text-center dark:bg-slate-700/50"
              >
                <p className="text-lg font-bold text-dark">
                  <AnimatedCounter value={recentResult.timeSpent || 0} duration={1.1} />s
                </p>
                <p className="text-[10px] text-gray-400">{copy.timeLabel}</p>
              </motion.div>
            </div>
            <button type="button" onClick={() => navigate(`/result/${recentResult._id}`)} className="chunky-btn-ghost mt-5 inline-flex items-center gap-2 text-xs sm:text-sm">
              {copy.openResult}
              <ArrowRight size={14} />
            </button>
          </>
        ) : (
          <button type="button" onClick={() => navigate('/my-tests')} className="chunky-btn-ghost mt-5 inline-flex items-center gap-2 text-xs sm:text-sm">
            {copy.createFirstChallenge}
            <ArrowRight size={14} />
          </button>
        )}
      </div>

      {/* Right column */}
      <div className="flex flex-col gap-4">
        {/* Daily challenge mini */}
        <div className="chunky-card p-3 sm:p-5">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-gray-300 dark:text-gray-500">
            <CalendarDays size={12} />
            {copy.quickChallengeTitle}
          </div>
          <h4 className="mt-2.5 text-sm font-semibold text-dark line-clamp-1">{dailyChallenge?.test?.title || copy.exploreTests}</h4>

          {dailyChallenge?.test ? (
            <>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="font-medium text-primary-500">{copy.rewardXp.replace('{{xp}}', String(dailyChallenge.rewardXp || 40))}</span>
                <span className="font-mono text-gray-400">{dailyCountdownLabel}</span>
              </div>
              <button
                type="button"
                onClick={() => navigate(`/test/${dailyChallenge.test.shareLink}`)}
                className="btn-press mt-3.5 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-gray-50 py-2 text-xs font-medium text-dark transition hover:bg-gray-100 dark:bg-slate-700 dark:hover:bg-slate-600"
              >
                <Play size={12} />
                {copy.startChallenge}
              </button>
            </>
          ) : (
            <p className="mt-2 text-xs text-gray-400">{copy.noDailyChallenge}</p>
          )}
        </div>

        {/* Quick stats */}
        <div className="chunky-card p-3 sm:p-5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-300 dark:text-gray-500">{copy.quickStats}</p>
          <motion.div
            className="mt-3 space-y-3"
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } } }}
          >
            <motion.div
              variants={{ hidden: { opacity: 0, x: -8 }, show: { opacity: 1, x: 0 } }}
              whileHover={{ x: 2 }}
              className="flex items-center justify-between rounded-lg px-1 py-0.5 transition-colors hover:bg-primary-50/40 dark:hover:bg-primary-900/10"
            >
              <div className="flex items-center gap-2 text-sm text-gray-500"><Trophy size={14} className="text-primary-500" /> XP</div>
              <span className="text-sm font-bold text-dark"><AnimatedCounter value={progressData?.progress?.xp || 0} duration={1.4} /></span>
            </motion.div>
            <motion.div
              variants={{ hidden: { opacity: 0, x: -8 }, show: { opacity: 1, x: 0 } }}
              whileHover={{ x: 2 }}
              className="flex items-center justify-between rounded-lg px-1 py-0.5 transition-colors hover:bg-amber-50/60 dark:hover:bg-amber-900/10"
            >
              <div className="flex items-center gap-2 text-sm text-gray-500"><span className="text-amber-500"><AnimatedFlame streak={progressData?.progress?.currentStreakDays || 0} size={14} /></span> {copy.currentStreak}</div>
              <span className="text-sm font-bold text-dark"><AnimatedCounter value={progressData?.progress?.currentStreakDays || 0} duration={1.0} /></span>
            </motion.div>
            <motion.div
              variants={{ hidden: { opacity: 0, x: -8 }, show: { opacity: 1, x: 0 } }}
              whileHover={{ x: 2 }}
              className="flex items-center justify-between rounded-lg px-1 py-0.5 transition-colors hover:bg-primary-50/40 dark:hover:bg-primary-900/10"
            >
              <div className="flex items-center gap-2 text-sm text-gray-500"><Crown size={14} className="text-primary-500" /> {copy.levelShort}</div>
              <span className="text-sm font-bold text-dark"><AnimatedCounter value={progressData?.progress?.level || 1} duration={0.9} /></span>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </motion.div>
    </div>
  ) : (
    <GuestHome
      copy={copy}
      t={t}
      onExplore={() => setActiveTab('explore')}
      onRegister={() => navigate('/register')}
      onLogin={() => navigate('/login')}
      onOpenTest={(test) => test?.shareLink && navigate(`/test-profile/${test.shareLink}`)}
    />
  );

  const challengeCards = isAuthenticated ? (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="grid gap-3 [&>*]:min-w-0 sm:gap-4 lg:grid-cols-2">
      {/* Daily challenge */}
      <div className="chunky-card p-3 sm:p-5 lg:p-6">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-gray-300 dark:text-gray-500">
          <CalendarDays size={12} />
          {copy.dailyChallenge}
        </div>
        <h3 className="mt-3 text-lg font-semibold text-dark">{dailyChallenge?.test?.title || copy.exploreTests}</h3>
        <p className="mt-1 text-sm text-gray-400">{copy.dailyChallengeDesc}</p>

        {dailyChallenge?.test ? (
          <>
            <div className="mt-5 flex items-center justify-between rounded-xl bg-gray-50 p-4 dark:bg-slate-700/50">
              <div>
                <p className="text-sm font-semibold text-dark">{copy.rewardXp.replace('{{xp}}', String(dailyChallenge.rewardXp || 40))}</p>
                <p className="text-xs text-gray-400">
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
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{copy.resetIn}</p>
                <p className="mt-0.5 font-mono text-lg font-bold text-dark">{dailyCountdownLabel}</p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2.5">
              {dailyChallenge.completed ? (
                <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-300">
                  {dailyChallenge.rewardClaimed ? copy.doneLabel : copy.rewardReady}
                </span>
              ) : (
                <button type="button" onClick={() => navigate(`/test/${dailyChallenge.test.shareLink}`)} className="chunky-btn-primary inline-flex items-center gap-2 text-xs sm:text-sm">
                  <Play size={13} />
                  {copy.startChallenge}
                </button>
              )}
              <button type="button" onClick={() => navigate(`/test-profile/${dailyChallenge.test.shareLink}`)} className="chunky-btn-ghost inline-flex items-center gap-2 text-xs sm:text-sm">
                {copy.exploreTests}
                <ArrowRight size={14} />
              </button>
            </div>
          </>
        ) : (
          <p className="mt-4 text-sm text-gray-400">{copy.noDailyChallenge}</p>
        )}
      </div>

      {/* Weekly sprint */}
      <div className="chunky-card p-3 sm:p-5 lg:p-6">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-gray-300 dark:text-gray-500">
          <Dumbbell size={12} />
          {copy.weeklySprint}
        </div>
        <h3 className="mt-3 text-lg font-semibold text-dark">
          {copy.sprintProgress.replace('{{current}}', String(weeklySprint?.completedCount || 0)).replace('{{goal}}', String(weeklySprint?.goalCount || 3))}
        </h3>
        <p className="mt-1 text-sm text-gray-400">{copy.weeklySprintDesc}</p>

        <div className="mt-5 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-slate-700">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, Math.round((((weeklySprint?.completedCount || 0)) / (weeklySprint?.goalCount || 3)) * 100))}%` }}
            transition={{ duration: 1.1, ease: 'easeOut' }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="font-medium text-violet-500">
            {copy.sprintRewardHint.replace('{{xp}}', String(weeklySprint?.rewardXp || 120))}
          </span>
          <span className="text-gray-400">
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
              className={`btn-press flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                weeklyCompletedSet.has(test._id)
                  ? 'border-emerald-100 bg-emerald-50/60 dark:border-emerald-800/40 dark:bg-emerald-900/10'
                  : 'border-gray-100 hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-700/50'
              }`}
            >
              <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-primary-500 to-sky-500 text-xs font-semibold text-white">
                {(test.coverImage || coversMap[test._id]) ? <img src={test.coverImage || coversMap[test._id]} alt="" className="h-full w-full object-cover" /> : (test.title?.[0] || 'T').toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-dark">{test.title}</p>
                <p className="text-[10px] text-gray-400">{test.totalPoints || 0} pts</p>
              </div>
              {weeklyCompletedSet.has(test._id) ? (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-300">
                  {copy.sprintDoneTag}
                </span>
              ) : (
                <ArrowRight size={14} className="text-gray-300" />
              )}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  ) : null;

  const progressCards = isAuthenticated ? (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="grid gap-3 [&>*]:min-w-0 sm:gap-4 lg:grid-cols-[1.15fr_0.85fr]">
      {/* Progress detail */}
      <div className="chunky-card p-3 sm:p-5 lg:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-300 dark:text-gray-500">{copy.progressTitle}</p>
        <h3 className="mt-2 text-lg font-semibold text-dark">{copy.progressDesc}</h3>

        {dashboardLoading ? (
          <div className="mt-5 h-40 animate-pulse rounded-xl bg-gray-50 dark:bg-slate-700" />
        ) : (
          <>
            {/* Level bar */}
            <div className="mt-5 rounded-xl bg-gray-50 p-4 dark:bg-slate-700/50">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-2xl font-bold tracking-tight text-dark">{copy.levelShort} <AnimatedCounter value={progressData?.progress?.level || 1} duration={0.8} /></p>
                  <p className="text-xs text-gray-400"><AnimatedCounter value={progressData?.progress?.xp || 0} duration={1.2} /> XP</p>
                </div>
                <div className="text-right text-xs text-gray-400">
                  <p>{levelMeta?.xpIntoLevel || 0} / {levelMeta?.xpForNextLevel || 100}</p>
                  <p>{levelMeta?.progressPercent || 0}%</p>
                </div>
              </div>
              <div className="relative mt-3 h-2 overflow-hidden rounded-full bg-white dark:bg-slate-600">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-primary-400 via-primary-500 to-violet-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${levelMeta?.progressPercent || 0}%` }}
                  transition={{ duration: 1.1, ease: 'easeOut' }}
                />
                {/* Shimmer overlay — лёгкая бегущая блика поверх заполненной части */}
                <motion.div
                  className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                  animate={{ x: ['-100%', '300%'] }}
                  transition={{ duration: 2.4, ease: 'linear', repeat: Infinity, repeatDelay: 0.6 }}
                  style={{ mixBlendMode: 'overlay' }}
                />
              </div>
            </div>

            {/* Metrics */}
            <div className="mt-4 grid gap-3 [&>*]:min-w-0 sm:grid-cols-3">
              <SummaryMetric icon={Flame} label={copy.currentStreak} value={progressData?.progress?.currentStreakDays || 0} tone="amber" flameStreak={progressData?.progress?.currentStreakDays || 0} />
              <SummaryMetric icon={Medal} label={copy.completedExams} value={progressData?.progress?.stats?.totalCompleted || 0} tone="emerald" />
              <SummaryMetric icon={Crown} label={copy.perfectScores} value={progressData?.progress?.stats?.perfectScores || 0} tone="blue" />
            </div>

            {/* Badges */}
            <div className="mt-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-dark">{copy.badgesTitle}</p>
                <p className="text-[10px] text-gray-300">{formattedBadges.length}</p>
              </div>
              {formattedBadges.length > 0 ? (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {formattedBadges.map((badge) => (
                    <span
                      key={`${badge.key}-${badge.unlockedAt}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-gray-100 bg-gray-50 px-2.5 py-1 text-[11px] font-medium text-gray-600 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-300"
                    >
                      <Sparkles size={10} className="text-primary-400" />
                      {badgeLabels[badge.key]?.[lang] || badge.key}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-xs text-gray-400">{copy.firstBadgeHint}</p>
              )}
            </div>

            {/* 7-day activity */}
            <div className="mt-5">
              <p className="text-xs font-semibold text-dark">{copy.activity7d}</p>
              <motion.div
                className="mt-2.5 grid grid-cols-7 gap-1.5 [&>*]:min-w-0"
                initial="hidden"
                animate="show"
                variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
              >
                {(progressData?.weeklyActivity || []).map((entry) => {
                  const barHeight = Math.max(4, Math.min(48, entry.count * 10 || 4));
                  const isToday = entry.dayKey === new Date().toISOString().slice(0, 10);
                  return (
                    <motion.div
                      key={entry.dayKey}
                      variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
                      className="group/bar flex flex-col items-center gap-1"
                      title={`${entry.dayKey}: ${entry.count}`}
                    >
                      <div className="flex h-12 w-full items-end justify-center">
                        <motion.div
                          className={`w-full max-w-[20px] rounded-md ${
                            isToday
                              ? 'bg-gradient-to-t from-primary-500 to-violet-500'
                              : entry.count > 0
                                ? 'bg-primary-400/80 dark:bg-primary-500/70'
                                : 'bg-gray-200 dark:bg-slate-600/60'
                          } group-hover/bar:saturate-150`}
                          initial={{ height: 4, opacity: 0.4 }}
                          animate={{ height: barHeight, opacity: 1 }}
                          transition={{ duration: 0.6, ease: 'easeOut' }}
                          whileHover={{ scaleY: 1.15, transformOrigin: 'bottom' }}
                        />
                      </div>
                      <p className={`text-[9px] ${isToday ? 'font-bold text-primary-500' : 'text-gray-400'}`}>{entry.dayKey.slice(5)}</p>
                      <p className="text-[10px] font-semibold text-dark">{entry.count}</p>
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>
          </>
        )}
      </div>

      {/* Leaderboard */}
      <div className="chunky-card p-3 sm:p-5 lg:p-6">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-gray-300 dark:text-gray-500">
          <Trophy size={12} />
          {copy.topLearners}
        </div>
        <h3 className="mt-2 text-sm font-semibold text-dark">{copy.topLearnersDesc}</h3>

        <motion.div
          className="mt-4 space-y-1.5"
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } } }}
        >
          {progressLeaderboard.length > 0 ? progressLeaderboard.slice(0, 5).map((entry) => (
            <motion.div
              key={entry.user?._id || entry.rank}
              variants={{ hidden: { opacity: 0, x: -10 }, show: { opacity: 1, x: 0 } }}
              whileHover={{ x: 3 }}
              className="flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition-colors hover:bg-gray-50 dark:hover:bg-slate-700/50"
            >
              <motion.span
                className={`relative flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${
                  entry.rank === 1
                    ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                    : entry.rank === 2
                      ? 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-gray-300'
                      : entry.rank === 3
                        ? 'bg-orange-50 text-orange-500 dark:bg-orange-900/30 dark:text-orange-400'
                        : 'bg-gray-50 text-gray-400 dark:bg-slate-700/50 dark:text-gray-400'
                }`}
                animate={
                  entry.rank === 1
                    ? { boxShadow: ['0 0 0 0 rgba(245, 158, 11, 0)', '0 0 0 6px rgba(245, 158, 11, 0.15)', '0 0 0 0 rgba(245, 158, 11, 0)'] }
                    : { boxShadow: '0 0 0 0 rgba(0,0,0,0)' }
                }
                transition={{ duration: 2.2, repeat: entry.rank === 1 ? Infinity : 0, ease: 'easeInOut' }}
              >
                {entry.rank}
              </motion.span>
              <button
                type="button"
                onClick={() => entry.user?._id && navigate(`/profile/${entry.user._id}`)}
                className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-lg bg-primary-50 text-[10px] font-semibold text-primary-600 transition hover:scale-105 dark:bg-primary-900/30 dark:text-primary-300"
              >
                {entry.user?.avatar ? <img src={entry.user.avatar} alt="" className="h-full w-full object-cover" /> : `${entry.user?.firstName?.[0] || ''}${entry.user?.lastName?.[0] || ''}`}
              </button>
              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => entry.user?._id && navigate(`/profile/${entry.user._id}`)}
                  className="truncate text-left text-sm font-medium text-dark transition hover:text-primary-500"
                >
                  {entry.user?.firstName} {entry.user?.lastName}
                </button>
                <p className="text-[10px] text-gray-400">
                  {copy.leaderboardEntry
                    .replace('{{level}}', String(entry.level))
                    .replace('{{streak}}', String(entry.currentStreakDays))}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-primary-500"><AnimatedCounter value={entry.xp} duration={1.0} /></p>
                <p className="text-[9px] text-gray-300">XP</p>
              </div>
            </motion.div>
          )) : (
            <p className="text-sm text-gray-400">{copy.leaderboardEmpty}</p>
          )}
        </motion.div>
      </div>
    </motion.div>
  ) : null;

  const renderExplore = () => (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      {/* Search + sort */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <form onSubmit={handleSearch} className="relative min-w-[200px] flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={15} />
          <input
            type="text"
            className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm text-dark placeholder-gray-300 transition focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400/30 dark:border-slate-600 dark:bg-slate-800 dark:placeholder-gray-500 dark:focus:border-primary-500"
            placeholder={t('searchTests')}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </form>

        <div className="flex gap-0.5 rounded-xl border border-gray-100 bg-gray-50 p-0.5 dark:border-slate-700 dark:bg-slate-800">
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
              className={`btn-press rounded-lg px-3.5 py-1.5 text-xs font-medium whitespace-nowrap transition ${
                sort === option.key
                  ? 'bg-white text-dark shadow-sm dark:bg-slate-700 dark:text-white'
                  : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Test grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 [&>*]:min-w-0 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((index) => (
            <div key={index} className="chunky-card p-3 sm:p-5">
              <div className="mb-4 h-36 animate-pulse rounded-xl bg-gray-100 dark:bg-slate-700" />
              <div className="mb-2.5 h-4 w-2/3 animate-pulse rounded bg-gray-100 dark:bg-slate-700" />
              <div className="mb-2 h-3 w-full animate-pulse rounded bg-gray-50 dark:bg-slate-700/50" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-gray-50 dark:bg-slate-700/50" />
            </div>
          ))}
        </div>
      ) : tests.length === 0 ? (
        <div className="py-20 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-50 dark:bg-slate-800">
            <Plus size={24} className="text-gray-300" />
          </div>
          <h3 className="text-base font-semibold text-dark">{t('noTests')}</h3>
          <p className="mt-1 text-sm text-gray-400">{t('createFirst')}</p>
          <button type="button" onClick={() => navigate('/create-test')} className="chunky-btn-primary mt-5 text-xs sm:text-sm">
            {t('createTest')}
          </button>
        </div>
      ) : (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 gap-4 [&>*]:min-w-0 sm:grid-cols-2 lg:grid-cols-3">
          {tests.map((test) => {
            const isCreator = (test.creator?._id || test.creator?.id) === currentUserId;
            return (
              <motion.div
                key={test._id}
                variants={cardVariants}
                whileHover={{ y: -3, transition: { duration: 0.2 } }}
                className="group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border-2 border-slate-900 bg-white transition active:translate-y-[1px] dark:border-white dark:bg-slate-900"
                style={{ boxShadow: '0 4px 0 #0f172a' }}
              >
                <TestCoverArtwork
                  coverImage={test.coverImage || coversMap[test._id]}
                  title={test.title}
                  className="w-full"
                  imageClassName="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                  onClick={() => navigate(`/test-profile/${test.shareLink}`)}
                  style={{ aspectRatio: '16 / 9' }}
                />

                <div className="flex flex-1 flex-col p-4">
                  <div className="absolute right-3 top-3 z-10">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setMenuOpen(menuOpen === test._id ? null : test._id);
                      }}
                      className="btn-press rounded-lg bg-white/90 p-1.5 shadow-sm backdrop-blur transition hover:bg-white dark:bg-slate-800/90 dark:hover:bg-slate-700"
                    >
                      <MoreVertical size={14} className="text-gray-400" />
                    </button>
                    {menuOpen === test._id && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute right-0 mt-1 z-10 w-40 rounded-xl border border-gray-100 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-800"
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
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-slate-700"
                            >
                              <Edit3 size={13} /> {t('edit')}
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                navigate(`/results/${test._id}`);
                                setMenuOpen(null);
                              }}
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-slate-700"
                            >
                              <Users size={13} /> {t('viewResults')}
                            </button>
                            <hr className="my-0.5 border-gray-100 dark:border-slate-700" />
                          </>
                        )}
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            copyShareLink(test.shareLink);
                            setMenuOpen(null);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-slate-700"
                        >
                          <Copy size={13} /> {t('copyLink')}
                        </button>
                        {isCreator && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setDeleteConfirm({ open: true, id: test._id });
                              setMenuOpen(null);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <Trash2 size={13} /> {t('delete')}
                          </button>
                        )}
                      </motion.div>
                    )}
                  </div>

                  <div onClick={() => navigate(`/test-profile/${test.shareLink}`)} className="flex flex-1 flex-col">
                    <div className="mb-2 flex items-center gap-2">
                      {test.settings?.isPublic ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-primary-50 px-1.5 py-0.5 text-[10px] font-medium text-primary-600 dark:bg-primary-900/30 dark:text-primary-400"><Eye size={9} /> {t('publicTest')}</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"><EyeOff size={9} /> {t('privateTest')}</span>
                      )}
                      <span className="text-[10px] text-gray-300">
                        {test.questions?.length || 0} {t('questions')}
                      </span>
                    </div>

                    <h3 className="mb-1 pr-6 text-sm font-semibold text-dark line-clamp-1 transition-colors group-hover:text-primary-500">
                      {test.title}
                    </h3>

                    <p className="mb-2.5 min-h-[2rem] text-xs leading-4 text-gray-400 line-clamp-2">
                      {test.description || t('noDescription')}
                    </p>

                    {test.tags?.length > 0 && (
                      <div className="mb-2.5 flex flex-wrap gap-1">
                        {test.tags.slice(0, 3).map((tag, index) => (
                          <span key={index} className="inline-flex items-center gap-0.5 rounded bg-gray-50 px-1.5 py-0.5 text-[10px] text-gray-500 dark:bg-slate-700 dark:text-gray-400">
                            <Tag size={8} /> {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex-1" />

                    <div className="flex items-center justify-between border-t border-gray-50 pt-3 dark:border-slate-700/50">
                      <div className="flex min-w-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            if (test.creator?._id) navigate(`/profile/${test.creator._id}`);
                          }}
                          className="btn-press flex h-5 w-5 items-center justify-center overflow-hidden rounded bg-primary-50 text-[9px] font-semibold text-primary-600 transition hover:scale-105 dark:bg-primary-900/30 dark:text-primary-300"
                        >
                          {test.creator?.avatar ? (
                            <img src={test.creator.avatar} alt="" className="h-full w-full rounded object-cover" />
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
                          className="truncate text-[11px] text-gray-400 transition hover:text-primary-500"
                        >
                          {test.creator?.firstName} {test.creator?.lastName?.[0]}.
                        </button>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-2">
                        {renderStars(test.rating)}
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            navigate(`/leaderboard/${test._id}`);
                          }}
                          className="btn-press text-gray-300 transition hover:text-primary-500"
                          title="Рейтинг"
                        >
                          <Trophy size={11} />
                        </button>
                        <span className="flex items-center gap-0.5 text-[10px] text-gray-300">
                          <Users size={10} />
                          {test.attemptCount || 0}
                        </span>
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

      <main className="mx-auto max-w-6xl px-3 pb-12 pt-4 sm:px-6 sm:pt-6 lg:px-8">
        {/* Premium animated hero */}
        <AnimatedHero
          preset="paper"
          height="md"
          eyebrow={isAuthenticated ? 'Dashboard' : 'UniTest'}
          icon={<Sparkles size={22} />}
          title={isAuthenticated ? `${t('welcome')}, ${user?.firstName || 'Guest'}` : copy.guestHeroTitle}
          subtitle={isAuthenticated ? copy.heroDesc : copy.guestHeroDesc}
          stats={
            isAuthenticated
              ? [
                  { icon: <Crown size={14} />, label: copy.levelShort, value: <AnimatedCounter value={progressData?.progress?.level || 1} duration={0.9} /> },
                  { icon: <AnimatedFlame streak={progressData?.progress?.currentStreakDays || 0} size={14} />, label: 'Streak', value: <AnimatedCounter value={progressData?.progress?.currentStreakDays || 0} duration={1.0} /> },
                  { icon: <Trophy size={14} />, label: 'XP', value: <AnimatedCounter value={progressData?.progress?.xp || 0} duration={1.4} /> }
                ]
              : undefined
          }
          actions={
            isAuthenticated ? (
              <>
                <button type="button" onClick={() => navigate('/create-test')} className="chunky-btn-primary inline-flex items-center gap-2 text-xs sm:text-sm">
                  <Plus size={15} /> {t('createTest')}
                </button>
                <button type="button" onClick={() => setActiveTab('explore')} className="chunky-btn-ghost inline-flex items-center gap-2 text-xs sm:text-sm">
                  <Search size={15} /> {copy.exploreTests}
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => navigate('/register')} className="chunky-btn-primary inline-flex items-center gap-2 text-xs sm:text-sm">
                  <Plus size={15} /> {copy.guestCta}
                </button>
                <button type="button" onClick={() => setActiveTab('explore')} className="chunky-btn-ghost inline-flex items-center gap-2 text-xs sm:text-sm">
                  <Play size={15} /> {copy.exploreTests}
                </button>
              </>
            )
          }
        />

        {/* Tab bar - chunky pills */}
        <div className="mt-6">
          <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar [&>*]:min-w-0">
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

        {/* Tab content */}
        <div className="mt-6">
          {activeTab === 'home' && homeCards}
          {activeTab === 'challenges' && challengeCards}
          {activeTab === 'progress' && progressCards}
          {activeTab === 'explore' && renderExplore()}
        </div>
      </main>
    </div>
  );
}
