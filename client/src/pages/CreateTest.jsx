import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Trash2, Save, ArrowLeft, Image, Video, Music,
  Check, X, Type, ListChecks, ToggleLeft,
  FileText, Link2, Settings, Upload, ChevronUp, ChevronDown,
  Database, FileSpreadsheet, Eye, EyeOff, Ticket, Sparkles,
  Clock, Repeat, Calendar, Shield, Hash, Shuffle, Layers, Zap, Lock, Copy, Camera, Globe, GraduationCap,
  Move, ZoomIn, RotateCcw, CircleHelp
} from 'lucide-react';
import api from '../services/api';
import toast, { Toaster } from 'react-hot-toast';
import Navbar from '../components/Navbar';
import ConfirmDialog from '../components/ConfirmDialog';
import { lazy, Suspense } from 'react';
const RichTextEditor = lazy(() => import('../components/RichTextEditor'));
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { v4 as uuidv4 } from 'uuid';
import AIGenerateModal from '../components/AIGenerateModal';
import TestCoverArtwork from '../components/TestCoverArtwork';

const questionTypesData = [
  { value: 'single-choice', labelKey: 'singleChoice', icon: Check, color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30' },
  { value: 'multiple-choice', labelKey: 'multipleChoice', icon: ListChecks, color: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30' },
  { value: 'true-false', labelKey: 'trueFalse', icon: ToggleLeft, color: 'bg-green-50 text-green-600 dark:bg-green-900/30' },
  { value: 'essay', labelKey: 'essay', icon: FileText, color: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30' },
  { value: 'matching', labelKey: 'matching', icon: Link2, color: 'bg-rose-50 text-rose-600 dark:bg-rose-900/30' },
  { value: 'fill-blank', labelKey: 'fillBlank', icon: Type, color: 'bg-teal-50 text-teal-600 dark:bg-teal-900/30' },
];

const TRANSLATION_LANGUAGE_OPTIONS = [
  { code: 'en', label: '🇬🇧 English', shortLabel: '🇬🇧 EN' },
  { code: 'ru', label: '🇷🇺 Русский', shortLabel: '🇷🇺 RU' },
  { code: 'kz', label: '🇰🇿 Қазақша', shortLabel: '🇰🇿 KZ' },
  { code: 'es', label: '🇪🇸 Español', shortLabel: '🇪🇸 ES' }
];

const TRUE_FALSE_OPTION_LABELS = {
  ru: ['Верно', 'Неверно', 'Не указано'],
  en: ['True', 'False', 'Not given'],
  kz: ['Дұрыс', 'Бұрыс', 'Берілмеген'],
  es: ['Verdadero', 'Falso', 'No se indica']
};

const COVER_FRAME_WIDTH = 800;
const COVER_FRAME_HEIGHT = 450;
const COVER_MIN_ZOOM = 1;
const COVER_MAX_ZOOM = 3;
const DESCRIPTION_WORD_LIMIT = 200;

const SETTING_HELP_TEXT = {
  en: {
    timeLimit: 'Sets the total time for the attempt. Use 0 for an unlimited test.',
    maxAttempts: 'Limits how many completed attempts one student can have.',
    inactivityTimeout: 'If the student is inactive for this many minutes, the test will warn and then submit automatically.',
    startDate: 'Students will not be able to start the test before this date and time.',
    endDate: 'After this date and time the test becomes unavailable.',
    questionPoolSize: 'If greater than 0, the system will pick only this many questions from the full pool.',
    variantsEnabled: 'Creates ticket-style variants so students receive different question orders.',
    shuffleQuestions: 'Shuffles the order of questions for each attempt.',
    shuffleOptions: 'Shuffles answer options where it is allowed. True/False questions keep a fixed order.',
    partialCredit: 'Awards part of the points for partially correct multiple-choice or matching answers.',
    showResults: 'Lets the student see the final score after finishing the test.',
    instantFeedback: 'Shows correctness immediately after answering instead of only at the end.',
    practiceMode: 'Training mode with unlimited attempts and without saving real results.',
    isPublic: 'Public tests are visible in the catalog and can be opened by anyone with access.',
    multiLanguageEnabled: 'Adds translation tabs for questions so students can switch languages during the test.',
    blockTabSwitch: 'Counts tab switches or hiding the page as anti-cheat violations. Links inside questions are disabled in this mode.',
    warnOnLeave: 'Leaving the page saves progress, pauses the timer, and records a warning.',
    finishOnLeave: 'Leaving the page immediately finishes the attempt and uses one available attempt.',
    blockCopyPaste: 'Blocks copy, paste, context menu, and text selection during the test.',
    blockScreenshot: 'Blocks print and common screenshot shortcuts where possible.',
    maxViolations: 'After this many warnings for leaving the page, the test is submitted automatically.',
  },
  ru: {
    timeLimit: 'Задаёт общее время попытки. `0` означает тест без ограничения по времени.',
    maxAttempts: 'Ограничивает, сколько завершённых попыток может быть у одного ученика.',
    inactivityTimeout: 'Если ученик бездействует указанное число минут, тест предупредит его и затем отправится автоматически.',
    startDate: 'До этой даты и времени студенты не смогут начать тест.',
    endDate: 'После этой даты и времени тест станет недоступным.',
    questionPoolSize: 'Если значение больше нуля, система возьмёт только это количество вопросов из общего банка теста.',
    variantsEnabled: 'Создаёт билеты/варианты, чтобы студенты получали разные наборы или порядок вопросов.',
    shuffleQuestions: 'Перемешивает порядок вопросов для каждой попытки.',
    shuffleOptions: 'Перемешивает варианты ответов там, где это допустимо. Для True/False порядок остаётся фиксированным.',
    partialCredit: 'Даёт часть баллов за частично верные ответы в multiple-choice и matching.',
    showResults: 'Разрешает студенту увидеть итоговый результат после завершения теста.',
    instantFeedback: 'Показывает правильность ответа сразу после выбора, а не только в конце.',
    practiceMode: 'Режим тренировки: без лимита попыток и без сохранения реальных результатов.',
    isPublic: 'Публичный тест виден в каталоге и доступен всем, у кого есть доступ к сайту.',
    multiLanguageEnabled: 'Добавляет вкладки переводов у вопросов, чтобы студент мог переключать язык во время теста.',
    blockTabSwitch: 'Считает переключение вкладок и скрытие страницы нарушением античита. В этом режиме ссылки внутри вопросов отключаются.',
    warnOnLeave: 'При уходе со страницы прогресс сохраняется, таймер ставится на паузу и записывается предупреждение.',
    finishOnLeave: 'При уходе со страницы попытка сразу завершается и списывает одну попытку.',
    blockCopyPaste: 'Блокирует копирование, вставку, контекстное меню и выделение текста во время теста.',
    blockScreenshot: 'Блокирует печать и популярные горячие клавиши для скриншотов, где это возможно.',
    maxViolations: 'После такого количества предупреждений за выход со страницы тест отправится автоматически.',
  },
  kz: {
    timeLimit: 'Әрекетке берілетін жалпы уақыт. `0` болса, уақыт шектелмейді.',
    maxAttempts: 'Бір студенттің қанша аяқталған әрекеті болатынын шектейді.',
    inactivityTimeout: 'Студент осы минуттар бойы белсенді болмаса, жүйе ескертіп, тесті автоматты түрде жібереді.',
    startDate: 'Осы күн мен уақытқа дейін студенттер тестті бастай алмайды.',
    endDate: 'Осы күн мен уақыттан кейін тест қолжетімсіз болады.',
    questionPoolSize: 'Егер мәні 0-ден үлкен болса, жүйе барлық қордан тек осы мөлшерде сұрақ таңдайды.',
    variantsEnabled: 'Студенттерге әртүрлі билет/нұсқа беру үшін сұрақтардың әртүрлі ретін жасайды.',
    shuffleQuestions: 'Әр әрекет үшін сұрақтардың ретін араластырады.',
    shuffleOptions: 'Мүмкін болған жерде жауап нұсқаларын араластырады. True/False сұрақтарында реттілік өзгермейді.',
    partialCredit: 'Multiple-choice және matching үшін жартылай дұрыс жауаптарға да балл береді.',
    showResults: 'Тест аяқталғаннан кейін студентке қорытынды нәтижені көруге мүмкіндік береді.',
    instantFeedback: 'Жауаптың дұрыстығын соңында емес, бірден көрсетеді.',
    practiceMode: 'Жаттығу режимі: әрекет саны шектелмейді және нақты нәтижелер сақталмайды.',
    isPublic: 'Жария тест каталогта көрінеді және қолжетімділігі бар кез келген адам аша алады.',
    multiLanguageEnabled: 'Сұрақтарға аударма қойындыларын қосады, сонда студент тест ішінде тілді ауыстыра алады.',
    blockTabSwitch: 'Қойынды ауыстыруды және бетті жасыруды античит бұзушылығы ретінде санайды. Бұл режимде сұрақ ішіндегі сілтемелер өшіріледі.',
    warnOnLeave: 'Беттен шыққанда прогресс сақталады, таймер тоқтайды және ескерту жазылады.',
    finishOnLeave: 'Беттен шыққанда әрекет бірден аяқталып, бір мүмкіндік жұмсалады.',
    blockCopyPaste: 'Тест кезінде көшіруді, қоюды, контекстік мәзірді және мәтін таңдауды бұғаттайды.',
    blockScreenshot: 'Мүмкін болған жерде басып шығару мен скриншот пернелерін бұғаттайды.',
    maxViolations: 'Беттен шыққаны үшін осынша ескерту жиналса, тест автоматты түрде жіберіледі.',
  },
  es: {
    timeLimit: 'Define el tiempo total del intento. `0` significa sin límite de tiempo.',
    maxAttempts: 'Limita cuántos intentos completados puede tener un estudiante.',
    inactivityTimeout: 'Si el estudiante está inactivo durante estos minutos, el examen avisará y luego se enviará automáticamente.',
    startDate: 'Antes de esta fecha y hora los estudiantes no podrán iniciar el examen.',
    endDate: 'Después de esta fecha y hora el examen dejará de estar disponible.',
    questionPoolSize: 'Si es mayor que 0, el sistema tomará solo esta cantidad de preguntas del banco completo.',
    variantsEnabled: 'Crea variantes tipo boleto para que los estudiantes reciban órdenes diferentes de preguntas.',
    shuffleQuestions: 'Mezcla el orden de las preguntas en cada intento.',
    shuffleOptions: 'Mezcla las opciones de respuesta cuando está permitido. True/False mantiene un orden fijo.',
    partialCredit: 'Otorga parte de los puntos por respuestas parcialmente correctas en multiple-choice o matching.',
    showResults: 'Permite al estudiante ver la nota final al terminar el examen.',
    instantFeedback: 'Muestra si la respuesta es correcta inmediatamente, no solo al final.',
    practiceMode: 'Modo de práctica con intentos ilimitados y sin guardar resultados reales.',
    isPublic: 'Los exámenes públicos aparecen en el catálogo y cualquiera con acceso puede abrirlos.',
    multiLanguageEnabled: 'Añade pestañas de traducción a las preguntas para que el estudiante cambie de idioma durante el examen.',
    blockTabSwitch: 'Cuenta el cambio de pestaña o esconder la página como infracciones anti-trampa. En este modo los enlaces dentro de las preguntas se desactivan.',
    warnOnLeave: 'Salir de la página guarda el progreso, pausa el temporizador y registra una advertencia.',
    finishOnLeave: 'Salir de la página finaliza el intento de inmediato y consume una oportunidad.',
    blockCopyPaste: 'Bloquea copiar, pegar, menú contextual y selección de texto durante el examen.',
    blockScreenshot: 'Bloquea la impresión y los atajos comunes de capturas cuando es posible.',
    maxViolations: 'Después de esta cantidad de advertencias por salir de la página, el examen se enviará automáticamente.',
  }
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

function getPlainText(html = '') {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function countWords(value = '') {
  return (String(value).match(/\S+/g) || []).length;
}

function limitWords(value = '', maxWords = DESCRIPTION_WORD_LIMIT) {
  const tokens = String(value).match(/\S+\s*/g) || [];
  if (tokens.length <= maxWords) return String(value);
  return tokens.slice(0, maxWords).join('').trimEnd();
}

function getCoverMetrics(coverState) {
  if (!coverState?.naturalWidth || !coverState?.naturalHeight) return null;

  const zoom = clamp(coverState.zoom || COVER_MIN_ZOOM, COVER_MIN_ZOOM, COVER_MAX_ZOOM);
  const baseScale = Math.max(
    COVER_FRAME_WIDTH / coverState.naturalWidth,
    COVER_FRAME_HEIGHT / coverState.naturalHeight
  );
  const renderScale = baseScale * zoom;
  const renderWidth = coverState.naturalWidth * renderScale;
  const renderHeight = coverState.naturalHeight * renderScale;

  return {
    zoom,
    baseScale,
    renderScale,
    renderWidth,
    renderHeight,
    minOffsetX: Math.min(0, COVER_FRAME_WIDTH - renderWidth),
    maxOffsetX: 0,
    minOffsetY: Math.min(0, COVER_FRAME_HEIGHT - renderHeight),
    maxOffsetY: 0,
  };
}

function createCoverEditorState({ src, fileName, naturalWidth, naturalHeight }) {
  const initialState = {
    src,
    fileName,
    naturalWidth,
    naturalHeight,
    zoom: COVER_MIN_ZOOM,
    offsetX: 0,
    offsetY: 0,
  };
  const metrics = getCoverMetrics(initialState);

  return {
    ...initialState,
    offsetX: metrics ? (COVER_FRAME_WIDTH - metrics.renderWidth) / 2 : 0,
    offsetY: metrics ? (COVER_FRAME_HEIGHT - metrics.renderHeight) / 2 : 0,
  };
}

function clampCoverEditorState(coverState) {
  const metrics = getCoverMetrics(coverState);
  if (!metrics) return coverState;

  return {
    ...coverState,
    zoom: metrics.zoom,
    offsetX: clamp(coverState.offsetX, metrics.minOffsetX, metrics.maxOffsetX),
    offsetY: clamp(coverState.offsetY, metrics.minOffsetY, metrics.maxOffsetY),
  };
}

function HelpHint({ text }) {
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState(null);
  const rootRef = useRef(null);
  const tooltipRef = useRef(null);
  const visible = hovered || pinned;

  useEffect(() => {
    if (!visible) {
      setTooltipStyle(null);
      return undefined;
    }

    const updatePosition = () => {
      const triggerRect = rootRef.current?.getBoundingClientRect();
      const tooltipRect = tooltipRef.current?.getBoundingClientRect();
      if (!triggerRect || !tooltipRect) return;

      const viewportPadding = 12;
      let left = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);
      left = Math.max(viewportPadding, Math.min(left, window.innerWidth - tooltipRect.width - viewportPadding));

      let top = triggerRect.bottom + 10;
      if (top + tooltipRect.height > window.innerHeight - viewportPadding) {
        top = Math.max(viewportPadding, triggerRect.top - tooltipRect.height - 10);
      }

      setTooltipStyle({
        top: `${Math.round(top)}px`,
        left: `${Math.round(left)}px`,
      });
    };

    const raf = window.requestAnimationFrame(updatePosition);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [visible]);

  useEffect(() => {
    if (!visible) return undefined;
    const handleOutside = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setHovered(false);
        setPinned(false);
      }
    };

    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside, true);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside, true);
    };
  }, [visible]);

  if (!text) return null;

  return (
    <div
      ref={rootRef}
      className="relative inline-flex"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        aria-label="Help"
        onClick={(event) => {
          event.stopPropagation();
          setPinned(prev => !prev);
        }}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 transition hover:border-primary-200 hover:text-primary-500 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-500 dark:hover:border-primary-700 dark:hover:text-primary-300"
      >
        <CircleHelp size={11} />
      </button>
      {visible && (
        <div
          ref={tooltipRef}
          style={tooltipStyle || { visibility: 'hidden' }}
          className="fixed z-[130] w-56 max-w-[calc(100vw-24px)] rounded-2xl border border-gray-200 bg-white px-3 py-2 text-[11px] font-medium leading-5 text-gray-500 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.55)] dark:border-slate-700 dark:bg-slate-900 dark:text-gray-300"
        >
          {text}
        </div>
      )}
    </div>
  );
}

function createDefaultSettings() {
  return {
    timeLimit: 0,
    shuffleQuestions: false,
    shuffleOptions: false,
    showResults: true,
    allowReview: true,
    instantFeedback: true,
    questionPoolSize: 0,
    inactivityTimeout: 0,
    practiceMode: false,
    partialCredit: false,
    variants: { enabled: false, count: 0 },
    startDate: '',
    endDate: '',
    maxAttempts: 1,
    isPublic: false,
    antiCheat: {
      blockTabSwitch: false,
      warnOnLeave: false,
      finishOnLeave: false,
      blockCopyPaste: true,
      blockScreenshot: true,
      maxViolations: 5,
    },
    multiLanguage: {
      enabled: false,
      languages: []
    }
  };
}

function mergeSettings(settings = {}) {
  const defaults = createDefaultSettings();
  const mergedAntiCheat = {
    ...defaults.antiCheat,
    ...(settings.antiCheat || {})
  };

  return {
    ...defaults,
    ...settings,
    antiCheat: mergedAntiCheat,
    variants: {
      ...defaults.variants,
      ...(settings.variants || {})
    },
    multiLanguage: {
      ...defaults.multiLanguage,
      ...(settings.multiLanguage || {})
    }
  };
}

function createEmptyTranslation() {
  return {
    questionText: '',
    options: [],
    matchPairs: [],
    passage: '',
    explanation: '',
    correctAnswer: ''
  };
}

function normalizeTranslation(translation = {}) {
  return {
    ...createEmptyTranslation(),
    ...translation,
    options: Array.isArray(translation?.options) ? [...translation.options] : [],
    matchPairs: Array.isArray(translation?.matchPairs) ? [...translation.matchPairs] : []
  };
}

function getTranslationPanelKey(questionId, langCode) {
  return `${questionId}:${langCode}`;
}

function hasTranslationContent(translation = {}) {
  const normalized = normalizeTranslation(translation);
  return Boolean(
    normalized.questionText?.trim() ||
    normalized.passage?.trim() ||
    normalized.explanation?.trim() ||
    normalized.correctAnswer?.trim() ||
    normalized.options.some(option => option?.trim()) ||
    normalized.matchPairs.some(pair => pair?.trim())
  );
}

function pickTranslationValue(existingValue = '', incomingValue = '', overwrite = false) {
  return overwrite
    ? (incomingValue || existingValue || '')
    : (existingValue || incomingValue || '');
}

function mergeTranslationArray(existingValues = [], incomingValues = [], overwrite = false) {
  const length = Math.max(existingValues.length, incomingValues.length);
  return Array.from({ length }, (_, index) => pickTranslationValue(existingValues[index], incomingValues[index], overwrite));
}

function mergeTranslationPayload(existingTranslation = {}, incomingTranslation = {}, overwrite = false) {
  const existing = normalizeTranslation(existingTranslation);
  const incoming = normalizeTranslation(incomingTranslation);

  return {
    questionText: pickTranslationValue(existing.questionText, incoming.questionText, overwrite),
    options: mergeTranslationArray(existing.options, incoming.options, overwrite),
    matchPairs: mergeTranslationArray(existing.matchPairs, incoming.matchPairs, overwrite),
    passage: pickTranslationValue(existing.passage, incoming.passage, overwrite),
    explanation: pickTranslationValue(existing.explanation, incoming.explanation, overwrite),
    correctAnswer: pickTranslationValue(existing.correctAnswer, incoming.correctAnswer, overwrite)
  };
}

function createTrueFalseOptions(language = 'ru', correctIndex = -1) {
  const labels = TRUE_FALSE_OPTION_LABELS[language] || TRUE_FALSE_OPTION_LABELS.ru;
  return labels.map((text, index) => ({
    id: uuidv4(),
    text,
    isCorrect: correctIndex === index,
    matchPair: ''
  }));
}

function detectTrueFalseOptionLanguage(options = []) {
  const sample = options.map(option => String(option?.text || '').toLowerCase()).join(' ');
  if (sample.includes('verdadero') || sample.includes('falso')) return 'es';
  if (sample.includes('дұрыс') || sample.includes('бұрыс')) return 'kz';
  if (sample.includes('true') || sample.includes('false')) return 'en';
  return 'ru';
}

function createQuestion(type = 'single-choice', baseLanguage = 'ru') {
  const base = { id: uuidv4(), type, questionText: '', passage: '', points: 1, options: [], correctAnswer: '', media: { type: '', url: '', fileName: '' }, explanation: '' };

  if (type === 'single-choice' || type === 'multiple-choice') {
    base.options = [
      { id: uuidv4(), text: '', isCorrect: false },
      { id: uuidv4(), text: '', isCorrect: false },
      { id: uuidv4(), text: '', isCorrect: false },
      { id: uuidv4(), text: '', isCorrect: false },
    ];
  } else if (type === 'true-false') {
    base.options = createTrueFalseOptions(baseLanguage);
  } else if (type === 'matching') {
    base.options = [
      { id: uuidv4(), text: '', isCorrect: true, matchPair: '' },
      { id: uuidv4(), text: '', isCorrect: true, matchPair: '' },
      { id: uuidv4(), text: '', isCorrect: true, matchPair: '' },
    ];
  }
  return base;
}

function normalizeTrueFalseQuestion(question = {}, enabledLanguages = []) {
  if (question.type !== 'true-false') return question;

  const currentOptions = Array.isArray(question.options) ? question.options : [];
  const correctIndex = Math.max(0, currentOptions.findIndex(option => option?.isCorrect));
  const baseLanguage = detectTrueFalseOptionLanguage(currentOptions);
  const normalizedLanguages = [...new Set(['en', 'ru', 'kz', 'es', ...enabledLanguages])];
  const translations = { ...(question.translations || {}) };

  normalizedLanguages.forEach((langCode) => {
    if (!translations[langCode]) return;
    translations[langCode] = {
      ...translations[langCode],
      options: [...(TRUE_FALSE_OPTION_LABELS[langCode] || TRUE_FALSE_OPTION_LABELS.ru)]
    };
  });

  return {
    ...question,
    options: createTrueFalseOptions(baseLanguage, correctIndex),
    translations
  };
}

export default function CreateTest() {
  const navigate = useNavigate();
  const { id: editId } = useParams();
  const [saving, setSaving] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeQuestion, setActiveQuestion] = useState(0);
  const [collapsed, setCollapsed] = useState({});
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [bankQuestions, setBankQuestions] = useState([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, index: null });
  const [showDraftDialog, setShowDraftDialog] = useState(false);
  const [draftStatus, setDraftStatus] = useState(''); // '' | 'saving' | 'saved'
  const [openTranslationPanels, setOpenTranslationPanels] = useState({});
  const [bulkTranslateMode, setBulkTranslateMode] = useState(false);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState([]);
  const [bulkTranslateState, setBulkTranslateState] = useState(null);
  const [coverEditor, setCoverEditor] = useState(null);
  const [showCoverPanel, setShowCoverPanel] = useState(true);
  const questionRefs = useRef({});
  const autoSaveTimer = useRef(null);
  const coverStageRef = useRef(null);
  const coverDragRef = useRef(null);
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const hasAIAccess = user?.role === 'admin' || Boolean(user?.aiAccess);
  const settingHelp = SETTING_HELP_TEXT[lang] || SETTING_HELP_TEXT.en;
  const getSettingHelp = useCallback((key) => settingHelp[key] || SETTING_HELP_TEXT.en[key] || '', [settingHelp]);
  const selectedQuestionCount = selectedQuestionIds.length;
  const isBulkTranslating = Boolean(bulkTranslateState);

  const checkAIAccess = (callback) => {
    if (!hasAIAccess) {
      toast.error('AI-функции доступны только по разрешению администратора.', {
        icon: '🔒',
        duration: 4000
      });
      return;
    }
    callback();
  };

  const questionTypes = questionTypesData.map(qt => ({ ...qt, label: t(qt.labelKey) }));

  const [test, setTest] = useState({
    title: '',
    description: '',
    coverImage: '',
    tags: [],
    tagInput: '',
    questions: [createQuestion()],
    settings: createDefaultSettings()
  });

  useEffect(() => {
    if (editId) {
      api.get(`/tests/${editId}`).then(res => {
        const t = res.data;
        setTest({
          title: t.title,
          description: t.description || '',
          coverImage: t.coverImage || '',
          tags: t.tags || [],
          tagInput: '',
          questions: t.questions || [createQuestion()],
          settings: mergeSettings(t.settings)
        });
      }).catch(() => toast.error(t('errorLoading')));
    } else {
      // Check for draft
      const draft = localStorage.getItem('unitest_draft');
      if (draft) {
        try {
          const parsed = JSON.parse(draft);
          if (parsed.title || parsed.questions?.length > 1) {
            setShowDraftDialog(true);
          }
        } catch {}
      }
    }
  }, [editId]);

  useEffect(() => {
    setSelectedQuestionIds(prev => {
      const next = prev.filter(id => test.questions.some(question => question.id === id));
      return next.length === prev.length && next.every((id, index) => id === prev[index]) ? prev : next;
    });
  }, [test.questions]);

  // Auto-save draft (debounced 2s)
  useEffect(() => {
    if (editId) return; // Don't auto-save when editing existing test
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    setDraftStatus('saving');
    autoSaveTimer.current = setTimeout(() => {
      const { tagInput, ...data } = test;
      localStorage.setItem('unitest_draft', JSON.stringify(data));
      setDraftStatus('saved');
      setTimeout(() => setDraftStatus(''), 3000);
    }, 2000);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [test, editId]);

  const restoreDraft = () => {
    try {
      const draft = JSON.parse(localStorage.getItem('unitest_draft'));
      if (draft) {
        setTest({
          ...draft,
          tagInput: '',
          questions: draft.questions || [createQuestion()],
          settings: mergeSettings(draft.settings)
        });
        toast.success(t('restore'));
      }
    } catch {}
    setShowDraftDialog(false);
  };

  useEffect(() => {
    if (!test.settings.multiLanguage?.enabled) return;

    setOpenTranslationPanels(prev => {
      const next = { ...prev };

      test.questions.forEach(question => {
        (test.settings.multiLanguage.languages || []).forEach(langCode => {
          const panelKey = getTranslationPanelKey(question.id, langCode);
          if (next[panelKey] === undefined) {
            next[panelKey] = false;
          }
        });
      });

      return next;
    });
  }, [test.questions, test.settings.multiLanguage?.enabled, test.settings.multiLanguage?.languages]);

  useEffect(() => {
    if (test.settings.multiLanguage?.enabled && test.settings.multiLanguage?.languages?.length) return;
    setBulkTranslateMode(false);
    setSelectedQuestionIds([]);
    setBulkTranslateState(null);
  }, [test.settings.multiLanguage?.enabled, test.settings.multiLanguage?.languages]);

  useEffect(() => {
    if (!test.coverImage) {
      setShowCoverPanel(true);
    }
  }, [test.coverImage]);

  const discardDraft = () => {
    localStorage.removeItem('unitest_draft');
    setShowDraftDialog(false);
  };

  const updateTest = (field, value) => setTest(prev => ({ ...prev, [field]: value }));

  const openCoverEditor = useCallback((file) => {
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      toast.error('Макс. 15MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => {
        setShowCoverPanel(true);
        setCoverEditor(
          createCoverEditorState({
            src: reader.result,
            fileName: file.name,
            naturalWidth: img.width,
            naturalHeight: img.height,
          })
        );
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }, []);

  const handleCoverFileInput = (event) => {
    const file = event.target.files?.[0];
    if (file) openCoverEditor(file);
    event.target.value = '';
  };

  const resetCoverFrame = useCallback(() => {
    setCoverEditor(prev => (prev
      ? createCoverEditorState({
          src: prev.src,
          fileName: prev.fileName,
          naturalWidth: prev.naturalWidth,
          naturalHeight: prev.naturalHeight,
        })
      : prev
    ));
  }, []);

  const updateCoverZoom = (nextZoom) => {
    setCoverEditor(prev => {
      if (!prev) return prev;

      const previousMetrics = getCoverMetrics(prev);
      const updated = { ...prev, zoom: clamp(Number(nextZoom), COVER_MIN_ZOOM, COVER_MAX_ZOOM) };
      const nextMetrics = getCoverMetrics(updated);

      if (!previousMetrics || !nextMetrics) return updated;

      const focusX = (COVER_FRAME_WIDTH / 2 - prev.offsetX) / previousMetrics.renderScale;
      const focusY = (COVER_FRAME_HEIGHT / 2 - prev.offsetY) / previousMetrics.renderScale;

      return clampCoverEditorState({
        ...updated,
        offsetX: COVER_FRAME_WIDTH / 2 - focusX * nextMetrics.renderScale,
        offsetY: COVER_FRAME_HEIGHT / 2 - focusY * nextMetrics.renderScale,
      });
    });
  };

  const handleCoverPointerDown = (event) => {
    if (!coverEditor || !coverStageRef.current) return;
    const rect = coverStageRef.current.getBoundingClientRect();

    coverDragRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      originOffsetX: coverEditor.offsetX,
      originOffsetY: coverEditor.offsetY,
      scaleX: COVER_FRAME_WIDTH / rect.width,
      scaleY: COVER_FRAME_HEIGHT / rect.height,
    };

    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handleCoverPointerMove = (event) => {
    if (!coverDragRef.current) return;

    const drag = coverDragRef.current;
    const deltaX = (event.clientX - drag.startClientX) * drag.scaleX;
    const deltaY = (event.clientY - drag.startClientY) * drag.scaleY;

    setCoverEditor(prev => prev ? clampCoverEditorState({
      ...prev,
      offsetX: drag.originOffsetX + deltaX,
      offsetY: drag.originOffsetY + deltaY,
    }) : prev);
  };

  const stopCoverDragging = (event) => {
    if (coverDragRef.current && event) {
      event.currentTarget.releasePointerCapture?.(coverDragRef.current.pointerId);
    }
    coverDragRef.current = null;
  };

  const saveCoverCrop = () => {
    if (!coverEditor) return;
    const metrics = getCoverMetrics(coverEditor);
    if (!metrics) return;

    const image = new window.Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = COVER_FRAME_WIDTH;
      canvas.height = COVER_FRAME_HEIGHT;
      const ctx = canvas.getContext('2d');

      const sx = -coverEditor.offsetX / metrics.renderScale;
      const sy = -coverEditor.offsetY / metrics.renderScale;
      const sw = COVER_FRAME_WIDTH / metrics.renderScale;
      const sh = COVER_FRAME_HEIGHT / metrics.renderScale;

      ctx.drawImage(image, sx, sy, sw, sh, 0, 0, COVER_FRAME_WIDTH, COVER_FRAME_HEIGHT);
      updateTest('coverImage', canvas.toDataURL('image/jpeg', 0.88));
      setCoverEditor(null);
      setShowCoverPanel(false);
      toast.success('Обложка обновлена');
    };
    image.src = coverEditor.src;
  };

  // AI translate a single question
  const [translatingState, setTranslatingState] = useState(null);
  const getTranslationLanguages = useCallback((targetLanguages = test.settings.multiLanguage?.languages || []) => {
    const langs = [...new Set((targetLanguages || []).filter(Boolean))];
    if (!test.settings.multiLanguage?.enabled || !langs.length) {
      toast.error(t('aiTranslationNeedsLanguages') || 'Enable translations and choose languages in settings first');
      return [];
    }
    return langs;
  }, [t, test.settings.multiLanguage]);

  const applyQuestionTranslations = useCallback((questionId, langs, incomingTranslations, overwriteExisting = false) => {
    if (!questionId || !langs?.length) return;

    setTest(prev => ({
      ...prev,
      questions: prev.questions.map(question => {
        if (question.id !== questionId) return question;

        const nextTranslations = { ...(question.translations || {}) };
        langs.forEach(langCode => {
          if (incomingTranslations?.[langCode]) {
            nextTranslations[langCode] = mergeTranslationPayload(
              nextTranslations[langCode],
              incomingTranslations[langCode],
              overwriteExisting
            );
          }
        });

        return {
          ...question,
          translations: nextTranslations
        };
      })
    }));

    setOpenTranslationPanels(prev => {
      const next = { ...prev };
      langs.forEach(langCode => {
        next[`${questionId}:${langCode}`] = true;
      });
      return next;
    });
  }, []);

  const requestAITranslations = useCallback(async (question, langs) => {
    const res = await api.post('/ai/translate', {
      questionText: question.questionText || '',
      options: question.options?.map(option => ({ text: option.text })) || [],
      matchingPairs: question.options?.map(option => option.matchPair || '') || [],
      passage: question.passage || '',
      explanation: question.explanation || '',
      correctAnswer: question.correctAnswer || '',
      targetLanguages: langs
    });

    return res.data.translations || {};
  }, []);

  const aiTranslateQuestion = async (qIndex, targetLanguages = test.settings.multiLanguage?.languages || [], overwriteExisting = false) => {
    const q = test.questions[qIndex];
    const langs = getTranslationLanguages(targetLanguages);
    if (!q || !langs.length) return;
    setTranslatingState({ qIndex, languages: langs });
    try {
      const translations = await requestAITranslations(q, langs);
      applyQuestionTranslations(q.id, langs, translations, overwriteExisting);

      toast.success(langs.length === 1
        ? `Перевод обновлён: ${langs[0].toUpperCase()}`
        : `Переводы обновлены: ${langs.length} языка(ов)`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Ошибка перевода');
    } finally {
      setTranslatingState(null);
    }
  };

  const toggleBulkTranslateMode = () => {
    if (!bulkTranslateMode) {
      const langs = getTranslationLanguages();
      if (!langs.length) return;
    }
    setBulkTranslateMode(prev => !prev);
    setSelectedQuestionIds([]);
  };

  const toggleQuestionSelection = (questionId) => {
    setSelectedQuestionIds(prev => (
      prev.includes(questionId)
        ? prev.filter(id => id !== questionId)
        : [...prev, questionId]
    ));
  };

  const selectAllQuestionsForBulkTranslate = () => {
    setSelectedQuestionIds(test.questions.map(question => question.id));
  };

  const clearBulkQuestionSelection = () => {
    setSelectedQuestionIds([]);
  };

  const aiTranslateSelectedQuestions = async () => {
    const langs = getTranslationLanguages();
    if (!langs.length) return;

    const selectedQuestions = test.questions.filter(question => selectedQuestionIds.includes(question.id));
    if (!selectedQuestions.length) {
      toast.error(t('aiSelectAtLeastOneQuestion') || 'Select at least one question');
      return;
    }

    setBulkTranslateState({ current: 0, total: selectedQuestions.length });

    let successCount = 0;
    let failedCount = 0;

    for (let index = 0; index < selectedQuestions.length; index += 1) {
      const question = selectedQuestions[index];
      setBulkTranslateState({ current: index + 1, total: selectedQuestions.length });

      try {
        const translations = await requestAITranslations(question, langs);
        applyQuestionTranslations(question.id, langs, translations, false);
        successCount += 1;
      } catch (_) {
        failedCount += 1;
      }
    }

    setBulkTranslateState(null);

    if (successCount > 0) {
      toast.success(
        t('aiSelectedQuestionsTranslated', { count: successCount })
        || `Переведено вопросов: ${successCount}`
      );
    }
    if (failedCount > 0) {
      toast.error(
        t('aiSelectedQuestionsFailed', { count: failedCount })
        || `Не удалось перевести вопросов: ${failedCount}`
      );
    }

    setBulkTranslateMode(false);
    setSelectedQuestionIds([]);
  };
  const updateSettings = (field, value) => setTest(prev => ({
    ...prev, settings: { ...prev.settings, [field]: value }
  }));
  const updateAntiCheat = (field, value) => setTest(prev => ({
    ...prev,
    settings: {
      ...prev.settings,
      antiCheat: {
        ...prev.settings.antiCheat,
        [field]: value
      }
    }
  }));

  const updateQuestion = (index, field, value) => {
    const updated = [...test.questions];
    updated[index] = { ...updated[index], [field]: value };
    setTest(prev => ({ ...prev, questions: updated }));
  };

  const updateQuestionTranslation = (qIndex, langCode, updater) => {
    setTest(prev => {
      const updated = [...prev.questions];
      const currentQuestion = updated[qIndex];
      const currentTranslation = normalizeTranslation(currentQuestion.translations?.[langCode]);
      const nextTranslation = normalizeTranslation(
        typeof updater === 'function' ? updater(currentTranslation) : updater
      );

      updated[qIndex] = {
        ...currentQuestion,
        translations: {
          ...(currentQuestion.translations || {}),
          [langCode]: nextTranslation
        }
      };

      return { ...prev, questions: updated };
    });
  };

  const clearQuestionTranslation = (qIndex, langCode) => {
    const questionId = test.questions[qIndex]?.id;
    updateQuestionTranslation(qIndex, langCode, createEmptyTranslation());
    if (questionId) {
      setOpenTranslationPanels(prev => ({
        ...prev,
        [getTranslationPanelKey(questionId, langCode)]: true
      }));
    }
  };

  const toggleTranslationPanel = (questionId, langCode) => {
    const panelKey = getTranslationPanelKey(questionId, langCode);
    setOpenTranslationPanels(prev => ({
      ...prev,
      [panelKey]: !(prev[panelKey] ?? false)
    }));
  };

  const updateOption = (qIndex, oIndex, field, value) => {
    const updated = [...test.questions];
    const opts = [...updated[qIndex].options];

    if (field === 'isCorrect' && (updated[qIndex].type === 'single-choice' || updated[qIndex].type === 'true-false')) {
      opts.forEach((o, i) => { opts[i] = { ...o, isCorrect: i === oIndex }; });
    } else {
      opts[oIndex] = { ...opts[oIndex], [field]: value };
    }

    updated[qIndex] = { ...updated[qIndex], options: opts };
    setTest(prev => ({ ...prev, questions: updated }));
  };

  const addOption = (qIndex) => {
    const updated = [...test.questions];
    updated[qIndex].options.push({ id: uuidv4(), text: '', isCorrect: false, matchPair: '' });
    setTest(prev => ({ ...prev, questions: updated }));
  };

  const removeOption = (qIndex, oIndex) => {
    const updated = [...test.questions];
    updated[qIndex].options = updated[qIndex].options.filter((_, i) => i !== oIndex);
    setTest(prev => ({ ...prev, questions: updated }));
  };

  const addQuestion = (type = 'single-choice') => {
    const newQ = createQuestion(type, lang);
    setTest(prev => ({ ...prev, questions: [...prev.questions, newQ] }));
    setActiveQuestion(test.questions.length);
    setShowAddMenu(false);
    setTimeout(() => {
      const el = questionRefs.current[test.questions.length];
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const removeQuestion = (index) => {
    if (test.questions.length <= 1) { toast.error(t('minOneQuestion')); return; }
    setTest(prev => ({ ...prev, questions: prev.questions.filter((_, i) => i !== index) }));
    if (activeQuestion >= test.questions.length - 1) setActiveQuestion(Math.max(0, test.questions.length - 2));
  };

  const scrollToQuestion = (index) => {
    setActiveQuestion(index);
    setCollapsed(prev => ({ ...prev, [index]: false }));
    const el = questionRefs.current[index];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleMediaUpload = async (qIndex, file) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post('/tests/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      updateQuestion(qIndex, 'media', res.data);
      toast.success(t('mediaUploaded'));
    } catch (err) {
      toast.error(t('errorUploadMedia'));
    }
  };

  const addTag = () => {
    if (test.tagInput.trim() && !test.tags.includes(test.tagInput.trim())) {
      updateTest('tags', [...test.tags, test.tagInput.trim()]);
      updateTest('tagInput', '');
    }
  };

  const stripHtml = (html) => getPlainText(html);
  const coverMetrics = coverEditor ? getCoverMetrics(coverEditor) : null;
  const coverPreviewTitle = test.title.trim() || 'Название теста';
  const coverPreviewDescription = test.description.trim() || 'Краткое описание теста появится здесь';
  const descriptionWordCount = countWords(test.description);
  const coverSectionTitle = (() => {
    const value = t('coverImage');
    return value && value !== 'coverImage' ? value : 'Обложка теста';
  })();
  const uploadCoverText = (() => {
    const value = t('uploadCover');
    return value && value !== 'uploadCover' ? value : 'Загрузить обложку';
  })();
  const handleDescriptionChange = (value) => {
    updateTest('description', limitWords(value, DESCRIPTION_WORD_LIMIT));
  };

  const handleSave = async () => {
    if (!test.title.trim()) { toast.error(t('enterTestTitle')); return; }
    if (test.questions.some(q => !stripHtml(q.questionText))) { toast.error(t('fillAllQuestions')); return; }

    // Validation: check for correct answers and empty options
    for (let i = 0; i < test.questions.length; i++) {
      const q = test.questions[i];
      const num = i + 1;

      // For single-choice, multiple-choice, true-false: must have at least one correct option
      if (['single-choice', 'multiple-choice', 'true-false'].includes(q.type)) {
        if (!q.options.some(o => o.isCorrect)) {
          toast.error(t('noCorrectAnswer', { num }));
          scrollToQuestion(i);
          return;
        }
      }

      // For fill-blank: must have correct answer text
      if (q.type === 'fill-blank' && !q.correctAnswer?.trim()) {
        toast.error(t('noCorrectAnswer', { num }));
        scrollToQuestion(i);
        return;
      }

      // Check for empty option texts (single/multiple choice)
      if (['single-choice', 'multiple-choice'].includes(q.type)) {
        if (q.options.some(o => !o.text.trim())) {
          toast.error(t('emptyOptions', { num }));
          scrollToQuestion(i);
          return;
        }
      }

      // Matching: check for empty texts or pairs
      if (q.type === 'matching') {
        if (q.options.some(o => !o.text.trim() || !o.matchPair?.trim())) {
          toast.error(t('emptyOptions', { num }));
          scrollToQuestion(i);
          return;
        }
      }
    }

    setSaving(true);
    try {
      const { tagInput, ...data } = test;
      data.description = limitWords(data.description || '', DESCRIPTION_WORD_LIMIT);
      data.questions = (data.questions || []).map(question => (
        question.type === 'true-false'
          ? normalizeTrueFalseQuestion(question, data.settings?.multiLanguage?.languages || [])
          : question
      ));
      if (editId) {
        await api.put(`/tests/${editId}`, data);
        toast.success(t('testUpdated'));
      } else {
        await api.post('/tests', data);
        toast.success(t('testCreated'));
        localStorage.removeItem('unitest_draft');
      }
      navigate('/my-tests');
    } catch (err) {
      toast.error(err.response?.data?.message || t('errorSaving'));
    } finally {
      setSaving(false);
    }
  };

  const handleFileImport = async (file) => {
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      const imported = [];
      
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(/[,;\t]/).map(c => c.trim().replace(/^"|"$/g, ''));
        if (cols.length < 3) continue;
        
        const [questionText, type, correctIdx, ...optTexts] = cols;
        const qType = type || 'single-choice';
        const q = createQuestion(
          qType === 'essay' || qType === 'fill-blank' || qType === 'matching' ? qType : 'single-choice',
          lang
        );
        q.questionText = questionText;
        
        if (qType === 'fill-blank') {
          q.type = 'fill-blank';
          q.correctAnswer = correctIdx;
          q.options = [];
        } else if (qType === 'essay') {
          q.type = 'essay';
          q.options = [];
        } else {
          const validOpts = optTexts.filter(Boolean);
          if (validOpts.length > 0) {
            q.options = validOpts.map((text, idx) => ({
              id: uuidv4(),
              text,
              isCorrect: String(idx + 1) === String(correctIdx) || text === correctIdx
            }));
          }
        }
        imported.push(q);
      }
      
      if (imported.length > 0) {
        setTest(prev => ({ ...prev, questions: [...prev.questions, ...imported] }));
        toast.success(`${t('importedQuestions')}: ${imported.length}`);
      } else {
        toast.error(t('cannotParseQuestions'));
      }
    } catch (err) {
      toast.error(t('errorReadingFile'));
    }
    setShowImportModal(false);
  };

  const loadBankQuestions = async () => {
    try {
      const res = await api.get('/question-bank?limit=100');
      setBankQuestions(res.data.questions || []);
      setShowBankModal(true);
    } catch (err) {
      toast.error(t('errorLoadingBank'));
    }
  };

  const addFromBank = (questions) => {
    const toAdd = questions.map(q => ({
      ...createQuestion(q.type),
      type: q.type,
      questionText: q.questionText,
      points: q.points,
      options: q.options,
      correctAnswer: q.correctAnswer || '',
      explanation: q.explanation || ''
    }));
    setTest(prev => ({ ...prev, questions: [...prev.questions, ...toAdd] }));
    toast.success(`${t('addedFromBank')}: ${toAdd.length}`);
    setShowBankModal(false);
  };

  const saveToBank = async () => {
    try {
      await api.post('/question-bank/bulk', {
        questions: test.questions,
        category: test.title
      });
      toast.success(t('savedToBank'));
    } catch (err) {
      toast.error(t('errorSavingToBank'));
    }
  };

  const MediaIcon = ({ type }) => {
    if (type === 'video') return <Video size={16} />;
    if (type === 'audio') return <Music size={16} />;
    return <Image size={16} />;
  };

  const totalPoints = test.questions.reduce((s, q) => s + (q.points || 0), 0);

  return (
    <div className="min-h-screen overflow-x-clip bg-surface">
      <Toaster position="top-right" />
      <Navbar />

      <ConfirmDialog
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, index: null })}
        onConfirm={() => removeQuestion(deleteConfirm.index)}
        title={t('deleteQuestion')}
        message={t('deleteQuestionConfirm', { num: (deleteConfirm.index || 0) + 1 })}
        confirmText={t('delete')}
        variant="danger"
      />

      <div className="mx-auto flex max-w-7xl flex-col gap-6 overflow-x-clip px-4 py-6 sm:px-6 lg:flex-row">
        {/* Left Sidebar: Question Navigator */}
        <div className="hidden lg:block w-64 flex-shrink-0">
          <div className="sticky top-24 space-y-3">
            <div className="glass-card-solid p-4">
              <h3 className="text-sm font-semibold text-dark mb-3">{t('navigation')}</h3>
              <div className="space-y-1 max-h-[50vh] overflow-y-auto pr-1">
                {test.questions.map((q, i) => {
                  const typeInfo = questionTypes.find(t => t.value === q.type);
                  return (
                    <button
                      key={q.id}
                      onClick={() => scrollToQuestion(i)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all text-left
                        ${activeQuestion === i
                          ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 font-medium'
                          : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
                    >
                      <span className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold flex-shrink-0
                        ${activeQuestion === i ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-slate-600 text-gray-500 dark:text-gray-300'}`}>
                        {i + 1}
                      </span>
                      <span className="truncate flex-1">{stripHtml(q.questionText) || typeInfo?.label || t('question')}</span>
                      {!stripHtml(q.questionText) && <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-700 text-xs text-gray-500 dark:text-gray-400 space-y-1">
                <p>{t('questionsCount')}: <strong className="text-dark">{test.questions.length}</strong></p>
                <p>{t('pointsCount')}: <strong className="text-dark">{totalPoints}</strong></p>
              </div>
            </div>

            <div className="glass-card-solid p-3 space-y-2">
              {!hasAIAccess && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-300">
                  AI-функции закрыты. Доступ выдаётся администратором.
                </div>
              )}
              <button onClick={loadBankQuestions}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                <Database size={14} /> {t('fromQuestionBank')}
              </button>
              <button onClick={() => setShowImportModal(true)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                <FileSpreadsheet size={14} /> {t('importCSV')}
              </button>
              <button onClick={() => checkAIAccess(() => setShowAIModal(true))}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  hasAIAccess
                    ? 'text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20'
                    : 'text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/10'
                }`}>
                <Sparkles size={14} /> {t('aiGenerate') || 'AI Generate'}
              </button>
              <button
                onClick={() => checkAIAccess(toggleBulkTranslateMode)}
                disabled={isBulkTranslating}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  bulkTranslateMode
                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-300'
                    : hasAIAccess
                      ? 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
                      : 'text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/10'
                } disabled:opacity-50`}
              >
                <Globe size={14} /> {t('aiTranslateSelected') || 'AI translate selected'}
              </button>
              <button onClick={saveToBank}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                <Save size={14} /> {t('saveToBank')}
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 items-center gap-3">
              <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                <ArrowLeft size={20} className="text-dark" />
              </button>
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-dark">{editId ? t('editTest') : t('createTest')}</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {test.questions.length} {t('questions')} · {totalPoints} {t('points')}
                  {!editId && draftStatus && (
                    <span className={`ml-2 ${draftStatus === 'saved' ? 'text-emerald-500' : 'text-gray-400'}`}>
                      {draftStatus === 'saving' ? t('savingDraft') : t('draftSaved')}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex w-full gap-2 sm:w-auto">
              <button onClick={() => setShowSettings(!showSettings)} className="btn-secondary flex flex-1 items-center justify-center gap-2 py-2 px-3 text-xs sm:flex-none">
                <Settings size={14} /> {t('settings')}
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSave}
                disabled={saving}
                className="btn-primary flex flex-1 items-center justify-center gap-2 py-2 px-4 text-xs sm:flex-none"
              >
                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={14} />}
                {editId ? t('update') : t('save')}
              </motion.button>
            </div>
          </motion.div>

          {/* Settings Panel */}
          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden mb-5"
              >
                <div className="glass-card-solid p-6 space-y-6">
                  {/* Section: Basic */}
                  <div>
                    <h4 className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                      <Settings size={13} />
                      {t('testSettings')}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                          <span>{t('timeLimitMin')}</span>
                          <HelpHint text={getSettingHelp('timeLimit')} />
                        </label>
                        <div className="relative">
                          <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 dark:text-gray-600" />
                          <input type="number" className="input-field text-sm py-2.5 pl-9" min="0" value={test.settings.timeLimit}
                            onChange={e => updateSettings('timeLimit', parseInt(e.target.value) || 0)} placeholder={t('noLimitPlaceholder')} />
                        </div>
                      </div>
                      <div>
                        <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                          <span>{t('maxAttempts')}</span>
                          <HelpHint text={getSettingHelp('maxAttempts')} />
                        </label>
                        <div className="relative">
                          <Repeat size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 dark:text-gray-600" />
                          <input type="number" className="input-field text-sm py-2.5 pl-9" min="1" value={test.settings.maxAttempts}
                            onChange={e => updateSettings('maxAttempts', parseInt(e.target.value) || 1)} />
                        </div>
                      </div>
                      <div>
                        <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                          <span>{t('inactivityTimeout')}</span>
                          <HelpHint text={getSettingHelp('inactivityTimeout')} />
                        </label>
                        <div className="relative">
                          <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 dark:text-gray-600" />
                          <input type="number" className="input-field text-sm py-2.5 pl-9" min="0" value={test.settings.inactivityTimeout || 0}
                            onChange={e => updateSettings('inactivityTimeout', parseInt(e.target.value) || 0)} placeholder={t('inactivityHint')} />
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1">{t('inactivityHint')}</p>
                      </div>
                    </div>
                    {/* Dates */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                      <div>
                        <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                          <span>{t('startDate')}</span>
                          <HelpHint text={getSettingHelp('startDate')} />
                        </label>
                        <div className="relative">
                          <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 dark:text-gray-600" />
                          <input type="datetime-local" className="input-field text-sm py-2.5 pl-9" value={test.settings.startDate || ''}
                            onChange={e => updateSettings('startDate', e.target.value)} />
                        </div>
                      </div>
                      <div>
                        <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                          <span>{t('endDate')}</span>
                          <HelpHint text={getSettingHelp('endDate')} />
                        </label>
                        <div className="relative">
                          <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 dark:text-gray-600" />
                          <input type="datetime-local" className="input-field text-sm py-2.5 pl-9" value={test.settings.endDate || ''}
                            onChange={e => updateSettings('endDate', e.target.value)} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="divider" />

                  {/* Section: Questions */}
                  <div>
                    <h4 className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                      <Layers size={13} />
                      {t('questionsLabel') || 'Questions'}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                      <div>
                        <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                          <span>{t('questionPoolSize')}</span>
                          <HelpHint text={getSettingHelp('questionPoolSize')} />
                        </label>
                        <div className="relative">
                          <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 dark:text-gray-600" />
                          <input type="number" className="input-field text-sm py-2.5 pl-9" min="0" value={test.settings.questionPoolSize || 0}
                            onChange={e => updateSettings('questionPoolSize', parseInt(e.target.value) || 0)} placeholder={t('poolSizeHint')} />
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1">{t('poolSizeHint')}</p>
                      </div>
                      {/* Variant/Ticket system — integrated */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                            <Ticket size={13} />
                            <span>{t('variantsEnabled') || 'Ticket system'}</span>
                            <HelpHint text={getSettingHelp('variantsEnabled')} />
                          </label>
                          <button
                            onClick={() => updateSettings('variants', { ...test.settings.variants, enabled: !test.settings.variants?.enabled })}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                              test.settings.variants?.enabled ? 'bg-indigo-500' : 'bg-gray-200 dark:bg-gray-700'
                            }`}
                          >
                            <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${
                              test.settings.variants?.enabled ? 'translate-x-[18px]' : 'translate-x-[3px]'
                            }`} />
                          </button>
                        </div>
                        {test.settings.variants?.enabled ? (
                          <div>
                            <div className="relative">
                              <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 dark:text-gray-600" />
                              <input type="number" className="input-field text-sm py-2.5 pl-9" min="2" max="100"
                                value={test.settings.variants?.count || 0}
                                onChange={e => updateSettings('variants', { ...test.settings.variants, count: parseInt(e.target.value) || 0 })}
                                placeholder={t('variantCount') || 'Number of variants'} />
                            </div>
                            <p className="text-[10px] text-gray-400 mt-1">
                              {t('variantsHint') || 'Each student gets a unique ticket with shuffled questions.'}
                            </p>
                          </div>
                        ) : (
                          <div className="input-field text-sm py-2.5 pl-3 text-gray-300 dark:text-gray-600 cursor-not-allowed">
                            {t('variantsDisabled') || 'Disabled'}
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Question toggles */}
                    <div className="space-y-2">
                      {[
                        { key: 'shuffleQuestions', label: t('shuffleQuestions'), icon: Shuffle, update: updateSettings, helpKey: 'shuffleQuestions' },
                        { key: 'shuffleOptions', label: t('shuffleOptions'), icon: Shuffle, update: updateSettings, helpKey: 'shuffleOptions' },
                        { key: 'partialCredit', label: t('partialCredit') || 'Partial credit', icon: Zap, update: updateSettings, helpKey: 'partialCredit' },
                        { key: 'showResults', label: t('showResults'), icon: Eye, update: updateSettings, helpKey: 'showResults' },
                        { key: 'instantFeedback', label: t('instantFeedback'), icon: Zap, update: updateSettings, helpKey: 'instantFeedback' },
                        { key: 'practiceMode', label: t('practiceModeLabel'), icon: GraduationCap, update: updateSettings, helpKey: 'practiceMode' },
                        { key: 'isPublic', label: t('isPublic'), icon: Globe, update: updateSettings, helpKey: 'isPublic' },
                      ].map(opt => {
                        const val = test.settings[opt.key];
                        const Icon = opt.icon;
                        return (
                          <div key={opt.key} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                            <span className="flex items-center gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                              <Icon size={14} className="text-gray-400 dark:text-gray-500" />
                              <span>{opt.label}</span>
                              <HelpHint text={getSettingHelp(opt.helpKey)} />
                            </span>
                            <button
                              onClick={() => opt.update(opt.key, !val)}
                              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                val ? 'bg-indigo-500' : 'bg-gray-200 dark:bg-gray-700'
                              }`}
                            >
                              <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${
                                val ? 'translate-x-[18px]' : 'translate-x-[3px]'
                              }`} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="divider" />

                  {/* Section: Multilingual */}
                  <div>
                    <h4 className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                      <Globe size={13} />
                      {t('multiLanguage') || 'Multilingual'}
                    </h4>
                    <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors mb-2">
                      <span className="flex items-center gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                        <Globe size={14} className="text-gray-400 dark:text-gray-500" />
                        <span>{t('multiLanguageEnabled') || 'Enable translations'}</span>
                        <HelpHint text={getSettingHelp('multiLanguageEnabled')} />
                      </span>
                      <button
                        onClick={() => updateSettings('multiLanguage', {
                          ...test.settings.multiLanguage,
                          enabled: !test.settings.multiLanguage?.enabled
                        })}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          test.settings.multiLanguage?.enabled ? 'bg-indigo-500' : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                      >
                        <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${
                          test.settings.multiLanguage?.enabled ? 'translate-x-[18px]' : 'translate-x-[3px]'
                        }`} />
                      </button>
                    </div>
                    {test.settings.multiLanguage?.enabled && (
                      <div className="px-3 space-y-2">
                        <p className="text-[10px] text-gray-400">{t('multiLanguageHint') || 'Select languages. Translation fields will appear for each question.'}</p>
                        <div className="flex gap-2">
                          {TRANSLATION_LANGUAGE_OPTIONS.map(l => {
                            const langs = test.settings.multiLanguage?.languages || [];
                            const isActive = langs.includes(l.code);
                            return (
                              <button
                                key={l.code}
                                onClick={() => {
                                  const newLangs = isActive
                                    ? langs.filter(x => x !== l.code)
                                    : [...langs, l.code];
                                  updateSettings('multiLanguage', {
                                    ...test.settings.multiLanguage,
                                    languages: newLangs
                                  });
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                                  isActive
                                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 border-primary-200 dark:border-primary-800'
                                    : 'bg-gray-50 dark:bg-slate-800 text-gray-500 border-gray-200 dark:border-slate-700 hover:border-primary-300'
                                }`}
                              >
                                {l.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="divider" />

                  {/* Section: Security */}
                  <div>
                    <h4 className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                      <Shield size={13} />
                      {t('securityLabel') || 'Security'}
                    </h4>
                    <div className="space-y-2">
                      {[
                        { key: 'blockTabSwitch', label: t('blockTabSwitch'), icon: Shield, helpKey: 'blockTabSwitch' },
                        { key: 'warnOnLeave', label: t('warnOnLeave') || 'Warn on leave', icon: Shield, helpKey: 'warnOnLeave' },
                        { key: 'finishOnLeave', label: t('finishOnLeave') || 'Finish on leave', icon: Lock, helpKey: 'finishOnLeave' },
                        { key: 'blockCopyPaste', label: t('blockCopyPaste'), icon: Copy, helpKey: 'blockCopyPaste' },
                        { key: 'blockScreenshot', label: t('blockScreenshot'), icon: Camera, helpKey: 'blockScreenshot' },
                      ].map(opt => {
                        const val = test.settings.antiCheat[opt.key];
                        const Icon = opt.icon;
                        return (
                          <div key={opt.key} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                            <span className="flex items-center gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                              <Icon size={14} className="text-gray-400 dark:text-gray-500" />
                              <span>{opt.label}</span>
                              <HelpHint text={getSettingHelp(opt.helpKey)} />
                            </span>
                            <button
                              onClick={() => updateAntiCheat(opt.key, !val)}
                              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                val ? 'bg-indigo-500' : 'bg-gray-200 dark:bg-gray-700'
                              }`}
                            >
                              <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${
                                val ? 'translate-x-[18px]' : 'translate-x-[3px]'
                              }`} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    {(test.settings.antiCheat.blockTabSwitch || test.settings.antiCheat.warnOnLeave) && (
                      <div className="mt-3">
                        <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                          <span>{t('maxViolations')}</span>
                          <HelpHint text={getSettingHelp('maxViolations')} />
                        </label>
                        <div className="relative max-w-[200px]">
                          <Shield size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 dark:text-gray-600" />
                          <input type="number" className="input-field text-sm py-2.5 pl-9" min="1" value={test.settings.antiCheat.maxViolations}
                            onChange={e => updateAntiCheat('maxViolations', parseInt(e.target.value) || 5)} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Test Info */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="glass-card-solid p-5 mb-5 space-y-3">
            <input
              className="w-full text-lg font-bold text-dark bg-transparent border-none outline-none placeholder-gray-300 dark:placeholder-gray-600"
              placeholder={t('testTitlePlaceholder')}
              value={test.title}
              onChange={e => updateTest('title', e.target.value)}
            />
            <textarea
              className="input-field resize-none text-sm py-2"
              rows="2"
              placeholder={t('testDescPlaceholder')}
              value={test.description}
              onChange={e => handleDescriptionChange(e.target.value)}
            />
            <div className="flex items-center justify-between gap-3 text-[11px]">
              <p className="text-gray-400 dark:text-gray-500">
                До {DESCRIPTION_WORD_LIMIT} слов. В карточках длинное описание аккуратно обрежется.
              </p>
              <span className={`font-medium ${descriptionWordCount >= DESCRIPTION_WORD_LIMIT ? 'text-amber-500' : 'text-gray-400 dark:text-gray-500'}`}>
                {descriptionWordCount}/{DESCRIPTION_WORD_LIMIT}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {test.tags.map((tag, i) => (
                <span key={i} className="badge-info flex items-center gap-1 text-xs">
                  {tag}
                  <button onClick={() => updateTest('tags', test.tags.filter((_, idx) => idx !== i))} className="hover:text-primary-800">
                    <X size={10} />
                  </button>
                </span>
              ))}
              <input
                className="text-xs bg-transparent outline-none placeholder-gray-400 dark:placeholder-gray-600 w-28 text-dark"
                placeholder="+ тег"
                value={test.tagInput}
                onChange={e => updateTest('tagInput', e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
              />
            </div>
            <div className="pt-2 border-t border-gray-100 dark:border-slate-700">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block flex items-center gap-1.5">
                    <Image size={12} />
                    {coverSectionTitle}
                  </label>
                  <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
                    Баннер редактируется под карточку 16:9. Блок можно свернуть после загрузки, чтобы он не мешал.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {test.coverImage && (
                    <button
                      type="button"
                      onClick={() => setShowCoverPanel(prev => !prev)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-gray-600 transition hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-300 dark:hover:bg-slate-700"
                    >
                      {showCoverPanel ? 'Свернуть блок' : 'Показать блок'}
                    </button>
                  )}
                  {test.coverImage && (
                    <button
                      type="button"
                      onClick={() => {
                        updateTest('coverImage', '');
                        setShowCoverPanel(true);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-[11px] font-semibold text-red-600 transition hover:bg-red-100 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-300 dark:hover:bg-red-900/20"
                    >
                      <Trash2 size={12} />
                      {t('delete') || 'Удалить'}
                    </button>
                  )}
                </div>
              </div>

              {showCoverPanel ? (
                <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_290px]">
                  <div className="space-y-3">
                    <div className="max-w-[760px] overflow-hidden rounded-[26px] border border-gray-200/80 bg-white shadow-[0_26px_70px_-40px_rgba(15,23,42,0.45)] dark:border-slate-700 dark:bg-slate-900/40">
                      <TestCoverArtwork
                        coverImage={test.coverImage}
                        title={coverPreviewTitle}
                        showPlaceholderCaption={false}
                        className="w-full"
                        imageOverlayClassName="absolute inset-0 bg-gradient-to-t from-slate-950/26 via-slate-950/10 to-transparent dark:from-black/34 dark:via-black/14"
                        style={{ aspectRatio: '16 / 9' }}
                      >
                        <div className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-2 sm:inset-x-4 sm:bottom-4 sm:gap-3">
                          <div className="max-w-[78%] rounded-[22px] border border-black/8 bg-white/92 px-3 py-2.5 shadow-[0_30px_70px_-28px_rgba(15,23,42,0.5)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/92 dark:shadow-[0_32px_72px_-30px_rgba(0,0,0,0.82)] sm:max-w-[64%] sm:px-4 sm:py-3">
                            <p className="text-sm font-semibold text-slate-950 dark:text-slate-50">
                              {test.coverImage ? 'Обложка готова' : 'Выберите изображение'}
                            </p>
                            <p className="mt-1 text-[11px] leading-relaxed text-slate-700 dark:text-slate-200/90">
                              {test.coverImage
                                ? 'Нужен другой кадр? Просто выбери новое изображение и редактор откроется снова.'
                                : 'После выбора откроется редактор с кадрированием и zoom.'}
                            </p>
                          </div>
                          <div className="hidden rounded-2xl border border-black/10 bg-white/84 px-3 py-2 text-[11px] font-medium text-slate-900 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/88 dark:text-slate-100 sm:block">
                            16:9 • Dashboard / Test
                          </div>
                        </div>
                      </TestCoverArtwork>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-primary-600/20 transition hover:bg-primary-700">
                        <Upload size={14} />
                        {test.coverImage ? 'Заменить и кадрировать' : `${uploadCoverText} и кадрировать`}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleCoverFileInput}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="hidden space-y-3 md:block">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">
                        Dashboard Preview
                      </p>
                      <p className="mt-1 text-[11px] text-gray-400">
                        Так карточка будет выглядеть в каталоге тестов.
                      </p>
                    </div>

                    <div className="overflow-hidden rounded-[26px] border border-gray-200/80 bg-white shadow-[0_24px_64px_-42px_rgba(15,23,42,0.45)] dark:border-slate-700 dark:bg-slate-900/40">
                      <TestCoverArtwork
                        coverImage={test.coverImage}
                        title={coverPreviewTitle}
                        showPlaceholderCaption={false}
                        className="w-full"
                        imageOverlayClassName="absolute inset-0 bg-gradient-to-t from-slate-950/16 via-slate-950/5 to-transparent dark:from-black/22"
                        style={{ aspectRatio: '16 / 9' }}
                      />
                      <div className="space-y-3 p-4">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${
                            test.settings?.isPublic
                              ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300'
                              : 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-300'
                          }`}>
                            {test.settings?.isPublic ? <Eye size={10} /> : <EyeOff size={10} />}
                            {test.settings?.isPublic ? 'Публичный' : 'Приватный'}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {test.questions.length} {t('questions')}
                          </span>
                        </div>

                        <div>
                          <h4 className="line-clamp-1 text-sm font-semibold text-dark">
                            {coverPreviewTitle}
                          </h4>
                          <p className="mt-1 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
                            {coverPreviewDescription}
                          </p>
                        </div>

                        {test.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {test.tags.slice(0, 2).map((tag, index) => (
                              <span
                                key={`${tag}-${index}`}
                                className="rounded-md bg-gray-100 px-2 py-1 text-[10px] text-gray-600 dark:bg-slate-700 dark:text-gray-300"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-gray-200/80 bg-gray-50/80 px-4 py-3 text-[11px] text-gray-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-gray-400">
                      Двигай изображение мышкой или пальцем в редакторе. Масштаб помогает убрать пустые поля и подобрать правильный кадр.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-gray-200/80 bg-gray-50/70 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                  <div className="flex items-center gap-3">
                    <div className="h-16 w-28 overflow-hidden rounded-xl border border-white/60 shadow-sm dark:border-slate-700">
                      <TestCoverArtwork
                        coverImage={test.coverImage}
                        title={coverPreviewTitle}
                        showPlaceholderCaption={false}
                        imageOverlayClassName="absolute inset-0 bg-gradient-to-t from-slate-950/12 via-slate-950/4 to-transparent dark:from-black/18"
                        className="h-full w-full"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-dark">
                        {coverPreviewTitle}
                      </p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Баннер сохранён. При необходимости можно снова открыть блок и заменить изображение.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowCoverPanel(true)}
                      className="inline-flex items-center rounded-xl bg-white px-3 py-2 text-xs font-semibold text-primary-600 shadow-sm transition hover:bg-primary-50 dark:bg-slate-900 dark:text-primary-300 dark:hover:bg-slate-800"
                    >
                      Показать
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Mobile Quick Actions */}
          {!hasAIAccess && (
            <div className="lg:hidden mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-300">
              AI-функции недоступны для этого аккаунта. Обратитесь к администратору за доступом.
            </div>
          )}
          <div className="lg:hidden flex gap-2 mb-4 overflow-x-auto pb-2">
            <button onClick={loadBankQuestions} className="btn-secondary flex items-center gap-1.5 py-1.5 px-3 text-xs whitespace-nowrap">
              <Database size={12} /> {t('fromQuestionBank')}
            </button>
            <button onClick={() => setShowImportModal(true)} className="btn-secondary flex items-center gap-1.5 py-1.5 px-3 text-xs whitespace-nowrap">
              <FileSpreadsheet size={12} /> {t('importCSV')}
            </button>
            <button onClick={() => checkAIAccess(() => setShowAIModal(true))} className={`btn-secondary flex items-center gap-1.5 py-1.5 px-3 text-xs whitespace-nowrap ${
              hasAIAccess
                ? 'text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800'
                : 'text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
            }`}>
              <Sparkles size={12} /> {t('aiGenerate') || 'AI Generate'}
            </button>
            <button
              onClick={() => checkAIAccess(toggleBulkTranslateMode)}
              disabled={isBulkTranslating}
              className={`btn-secondary flex items-center gap-1.5 py-1.5 px-3 text-xs whitespace-nowrap ${
                bulkTranslateMode
                  ? 'text-emerald-600 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : hasAIAccess
                    ? 'text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
                    : 'text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
              } disabled:opacity-50`}
            >
              <Globe size={12} /> {t('aiTranslateSelected') || 'AI translate selected'}
            </button>
            <button onClick={saveToBank} className="btn-secondary flex items-center gap-1.5 py-1.5 px-3 text-xs whitespace-nowrap">
              <Save size={12} /> {t('saveToBank')}
            </button>
          </div>

          {/* Questions */}
          <div className="space-y-4">
            {(bulkTranslateMode || selectedQuestionCount > 0) && (
              <div className="glass-card-solid p-3 sm:p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-500 dark:text-indigo-300">
                      {t('aiTranslationSelectionTitle') || 'AI translation selection'}
                    </p>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                      {bulkTranslateState
                        ? `${t('aiTranslatingSelectedProgress') || 'Translating selected questions'} ${bulkTranslateState.current}/${bulkTranslateState.total}`
                        : `${t('questionsCount') || 'Questions'}: ${selectedQuestionCount}`
                      }
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={selectAllQuestionsForBulkTranslate}
                      disabled={isBulkTranslating}
                      className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-50 dark:border-slate-700 dark:text-gray-300 dark:hover:bg-slate-800"
                    >
                      {t('selectAll') || 'Select all'}
                    </button>
                    <button
                      type="button"
                      onClick={clearBulkQuestionSelection}
                      disabled={isBulkTranslating}
                      className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-50 dark:border-slate-700 dark:text-gray-300 dark:hover:bg-slate-800"
                    >
                      {t('clearAll') || 'Clear all'}
                    </button>
                    <button
                      type="button"
                      onClick={() => checkAIAccess(aiTranslateSelectedQuestions)}
                      disabled={isBulkTranslating || !selectedQuestionCount}
                      className="rounded-xl bg-indigo-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-600 disabled:opacity-50"
                    >
                      {isBulkTranslating
                        ? (t('aiTranslatingSelected') || 'AI translating...')
                        : (t('aiTranslateSelected') || 'AI translate selected')
                      }
                    </button>
                    <button
                      type="button"
                      onClick={toggleBulkTranslateMode}
                      disabled={isBulkTranslating}
                      className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-50 dark:border-slate-700 dark:text-gray-300 dark:hover:bg-slate-800"
                    >
                      {t('cancel') || 'Cancel'}
                    </button>
                  </div>
                </div>
              </div>
            )}
            <AnimatePresence>
              {test.questions.map((question, qIndex) => (
                <motion.div
                  key={question.id}
                  ref={el => questionRefs.current[qIndex] = el}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  className={`glass-card-solid overflow-hidden transition-all
                    ${activeQuestion === qIndex ? 'ring-2 ring-primary-500/30' : ''}`}
                  onClick={() => setActiveQuestion(qIndex)}
                >
                  {/* Question header */}
                  <div className="flex items-center justify-between p-4 cursor-pointer select-none"
                    onClick={e => { e.stopPropagation(); setCollapsed(prev => ({ ...prev, [qIndex]: !prev[qIndex] })); }}>
                    <div className="flex items-center gap-3 min-w-0">
                      {bulkTranslateMode && (
                        <label
                          className="flex items-center"
                          onClick={event => event.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={selectedQuestionIds.includes(question.id)}
                            disabled={isBulkTranslating}
                            onChange={() => toggleQuestionSelection(question.id)}
                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                          />
                        </label>
                      )}
                      <span className="flex items-center justify-center w-7 h-7 bg-primary-50 dark:bg-primary-900/30 text-primary-600 rounded-lg font-bold text-xs flex-shrink-0">
                        {qIndex + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-dark truncate">
                          {stripHtml(question.questionText) || t('newQuestion')}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {questionTypes.find(t => t.value === question.type)?.label} • {question.points} б.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={e => { e.stopPropagation(); setDeleteConfirm({ open: true, index: qIndex }); }}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 size={14} />
                      </button>
                      {collapsed[qIndex] ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronUp size={16} className="text-gray-400" />}
                    </div>
                  </div>

                  {/* Collapsible body */}
                  <AnimatePresence initial={false}>
                  {!collapsed[qIndex] && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      style={{ overflow: 'hidden' }}
                    >
                    <div className="px-4 pb-4 space-y-3">
                      {/* Type + Points */}
                      <div className="flex items-center gap-3">
                        <select
                          value={question.type}
                          onChange={e => {
                            const newQ = createQuestion(e.target.value, lang);
                            newQ.questionText = question.questionText;
                            newQ.points = question.points;
                            newQ.media = question.media;
                            newQ.id = question.id;
                            const updated = [...test.questions];
                            updated[qIndex] = newQ;
                            setTest(prev => ({ ...prev, questions: updated }));
                          }}
                          className="text-xs font-medium bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-primary-500/20 text-dark"
                        >
                          {questionTypes.map(t => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                        <div className="flex items-center gap-1">
                          <input type="number" min="0" className="w-14 text-center input-field py-1 px-1 text-xs"
                            value={question.points} onChange={e => updateQuestion(qIndex, 'points', parseInt(e.target.value) || 0)} />
                          <span className="text-[10px] text-gray-500">{t('points')}</span>
                        </div>
                      </div>

                      {/* Question text */}
                      <Suspense fallback={<div className="input-field animate-pulse h-20" />}>
                        <RichTextEditor
                          content={question.questionText}
                          onChange={val => updateQuestion(qIndex, 'questionText', val)}
                          placeholder={t('questionTextPlaceholder')}
                          disableLinks={test.settings.antiCheat.blockTabSwitch}
                        />
                      </Suspense>

                      {/* Multilingual translations — compact with AI */}
                      {test.settings.multiLanguage?.enabled && test.settings.multiLanguage?.languages?.length > 0 && (
                        <div className="rounded-xl border border-primary-200/50 dark:border-primary-800/50 bg-primary-50/30 dark:bg-primary-900/10 overflow-hidden" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-between gap-3 px-3 py-2">
                            <span className="text-[10px] text-primary-600 dark:text-primary-400 font-semibold uppercase tracking-wide flex items-center gap-1">
                              <Globe size={10} /> {t('translations') || 'Переводы'}
                              {test.settings.multiLanguage.languages.some(languageCode => hasTranslationContent(question.translations?.[languageCode])) && (
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ml-1" />
                              )}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                checkAIAccess(() => aiTranslateQuestion(qIndex));
                              }}
                              disabled={translatingState?.qIndex === qIndex || isBulkTranslating}
                              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition ${
                                hasAIAccess
                                  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-900/50'
                                  : 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/30'
                              } disabled:opacity-50`}
                            >
                              {translatingState?.qIndex === qIndex ? (
                                <><Sparkles size={10} className="animate-spin" /> Заполняем...</>
                              ) : (
                                <><Sparkles size={10} /> AI заполнить пустые</>
                              )}
                            </button>
                          </div>
                          <div className="px-3 pb-3 space-y-2">
                            {test.settings.multiLanguage.languages.map(langCode => {
                              const langMeta = TRANSLATION_LANGUAGE_OPTIONS.find(option => option.code === langCode);
                              const trans = normalizeTranslation(question.translations?.[langCode]);
                              const hasTranslation = hasTranslationContent(trans);
                              const panelKey = getTranslationPanelKey(question.id, langCode);
                              const isOpen = openTranslationPanels[panelKey] ?? false;
                              const isLangTranslating = translatingState?.qIndex === qIndex
                                && translatingState.languages?.length === 1
                                && translatingState.languages[0] === langCode;
                              const showPassageField = Boolean(question.passage?.trim() || trans.passage?.trim());
                              const showExplanationField = Boolean(question.explanation?.trim() || trans.explanation?.trim());
                              const showCorrectAnswerField = question.type === 'fill-blank' || Boolean(question.correctAnswer?.trim() || trans.correctAnswer?.trim());
                              const showMatchingPairs = question.type === 'matching' && question.options?.some(option => option.matchPair?.trim());

                              return (
                                <div key={langCode} className="rounded-lg border border-gray-200/80 bg-white/80 dark:border-slate-700 dark:bg-slate-900/20">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleTranslationPanel(question.id, langCode);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800/40 transition"
                                  >
                                    <span className="font-medium">{langMeta?.shortLabel || langCode.toUpperCase()}</span>
                                    {hasTranslation && <span className="text-emerald-500 text-[9px]">✓</span>}
                                    {isLangTranslating && <span className="text-purple-500 text-[9px]">AI</span>}
                                    <ChevronDown size={10} className={`ml-auto transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                  </button>

                                  {isOpen && (
                                    <div className="px-3 pb-3 space-y-3 border-t border-gray-100 dark:border-slate-700/80">
                                      <div className="pt-2">
                                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">
                                          Вопрос
                                        </p>
                                        <div onClick={e => e.stopPropagation()}>
                                          <Suspense fallback={<div className="h-24 rounded-xl border border-dashed border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-800/60" />}>
                                            <RichTextEditor
                                              content={trans.questionText}
                                              onChange={value => updateQuestionTranslation(qIndex, langCode, current => ({ ...current, questionText: value }))}
                                              placeholder="Перевод текста вопроса"
                                              className="text-xs"
                                              disableLinks
                                            />
                                          </Suspense>
                                        </div>
                                      </div>

                                      {question.options?.length > 0 && (
                                        <div className="space-y-2">
                                          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">
                                            Варианты ответа
                                          </p>
                                          {question.options.map((opt, oi) => (
                                            <input
                                              key={oi}
                                              className="input-field text-xs py-1.5"
                                              placeholder={`Вариант ${oi + 1}: ${opt.text?.substring(0, 40) || '...'}`}
                                              value={trans.options?.[oi] || ''}
                                              onClick={e => e.stopPropagation()}
                                              onChange={e => {
                                                updateQuestionTranslation(qIndex, langCode, current => {
                                                  const nextOptions = [...(current.options || [])];
                                                  nextOptions[oi] = e.target.value;
                                                  return { ...current, options: nextOptions };
                                                });
                                              }}
                                            />
                                          ))}
                                        </div>
                                      )}

                                      {showMatchingPairs && (
                                        <div className="space-y-2">
                                          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">
                                            Правая часть сопоставления
                                          </p>
                                          {question.options.map((opt, oi) => (
                                            <input
                                              key={`pair-${oi}`}
                                              className="input-field text-xs py-1.5"
                                              placeholder={`Пара ${oi + 1}: ${opt.matchPair?.substring(0, 40) || '...'}`}
                                              value={trans.matchPairs?.[oi] || ''}
                                              onClick={e => e.stopPropagation()}
                                              onChange={e => {
                                                updateQuestionTranslation(qIndex, langCode, current => {
                                                  const nextPairs = [...(current.matchPairs || [])];
                                                  nextPairs[oi] = e.target.value;
                                                  return { ...current, matchPairs: nextPairs };
                                                });
                                              }}
                                            />
                                          ))}
                                        </div>
                                      )}

                                      {showPassageField && (
                                        <div>
                                          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">
                                            Passage
                                          </p>
                                          <div onClick={e => e.stopPropagation()}>
                                            <Suspense fallback={<div className="h-24 rounded-xl border border-dashed border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-800/60" />}>
                                              <RichTextEditor
                                                content={trans.passage}
                                                onChange={value => updateQuestionTranslation(qIndex, langCode, current => ({ ...current, passage: value }))}
                                                placeholder="Перевод текста / passage"
                                                className="text-xs"
                                                contentClassName="min-h-[180px] max-h-[420px] overflow-auto resize-y"
                                                editorClassName="min-h-[180px] h-full"
                                                disableLinks
                                              />
                                            </Suspense>
                                          </div>
                                        </div>
                                      )}

                                      {showCorrectAnswerField && (
                                        <div>
                                          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">
                                            Правильный ответ
                                          </p>
                                          <input
                                            className="input-field text-xs py-1.5"
                                            placeholder="Правильный ответ"
                                            value={trans.correctAnswer}
                                            onClick={e => e.stopPropagation()}
                                            onChange={e => updateQuestionTranslation(qIndex, langCode, current => ({ ...current, correctAnswer: e.target.value }))}
                                          />
                                        </div>
                                      )}

                                      {showExplanationField && (
                                        <div>
                                          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">
                                            Пояснение
                                          </p>
                                          <div onClick={e => e.stopPropagation()}>
                                            <Suspense fallback={<div className="h-20 rounded-xl border border-dashed border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-800/60" />}>
                                              <RichTextEditor
                                                content={trans.explanation}
                                                onChange={value => updateQuestionTranslation(qIndex, langCode, current => ({ ...current, explanation: value }))}
                                                placeholder="Пояснение"
                                                className="text-xs"
                                                disableLinks
                                              />
                                            </Suspense>
                                          </div>
                                        </div>
                                      )}

                                      <div className="flex flex-wrap gap-2 pt-1">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            checkAIAccess(() => aiTranslateQuestion(qIndex, [langCode]));
                                          }}
                                          disabled={isLangTranslating}
                                          className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition ${
                                            hasAIAccess
                                              ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50'
                                              : 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/30'
                                          } disabled:opacity-50`}
                                        >
                                          {isLangTranslating ? 'AI...' : 'AI заполнить'}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            clearQuestionTranslation(qIndex, langCode);
                                          }}
                                          className="px-2.5 py-1.5 rounded-lg text-[10px] font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600 transition"
                                        >
                                          Очистить
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Optional passage / reading text */}
                      <div>
                        {!question.passage ? (
                          <button
                            onClick={() => updateQuestion(qIndex, 'passage', ' ')}
                            className="flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-700 font-medium"
                          >
                            <FileText size={12} />
                            {t('addPassage')}
                          </button>
                        ) : (
                          <>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                                <FileText size={12} /> {t('passage')}
                              </span>
                              <button
                                onClick={() => updateQuestion(qIndex, 'passage', '')}
                                className="text-xs text-red-500 hover:text-red-600"
                              >
                                {t('delete')}
                              </button>
                            </div>
                            <div onClick={e => e.stopPropagation()}>
                              <Suspense fallback={<div className="h-24 rounded-xl border border-dashed border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-800/60" />}>
                                <RichTextEditor
                                  content={question.passage}
                                  onChange={value => updateQuestion(qIndex, 'passage', value || ' ')}
                                  placeholder={t('passagePlaceholder')}
                                  contentClassName="min-h-[180px] max-h-[420px] overflow-auto resize-y"
                                  editorClassName="min-h-[180px] h-full"
                                  disableLinks={test.settings.antiCheat.blockTabSwitch}
                                />
                              </Suspense>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Media upload */}
                      <div>
                        {question.media?.url ? (
                          <div className="space-y-2">
                            {/* Media preview */}
                            <div className="rounded-xl overflow-hidden bg-gray-50 dark:bg-slate-700">
                              {question.media.type === 'image' && (
                                <img src={question.media.url} alt="" className="w-full max-h-48 object-contain" />
                              )}
                              {question.media.type === 'video' && (
                                <video controls playsInline preload="metadata" className="w-full max-h-48">
                                  <source src={question.media.url} />
                                </video>
                              )}
                              {question.media.type === 'audio' && (
                                <div className="p-4">
                                  <audio src={question.media.url} controls className="w-full" />
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-slate-700 rounded-lg text-xs">
                              <MediaIcon type={question.media.type} />
                              <span className="text-gray-600 dark:text-gray-300 flex-1 truncate">{question.media.fileName}</span>
                              <button onClick={() => updateQuestion(qIndex, 'media', { type: '', url: '', fileName: '' })}
                                className="text-gray-400 hover:text-red-500"><X size={14} /></button>
                            </div>
                          </div>
                        ) : (
                          <label className="flex items-center gap-2 p-2.5 border-2 border-dashed border-gray-200 dark:border-slate-600 rounded-lg cursor-pointer 
                            hover:border-primary-300 hover:bg-primary-50/30 dark:hover:bg-primary-900/10 transition-all text-xs text-gray-500 dark:text-gray-400">
                            <Upload size={14} />
                            {t('addMedia')}
                            <input type="file" className="hidden" accept="image/*,video/*,audio/*"
                              onChange={e => e.target.files[0] && handleMediaUpload(qIndex, e.target.files[0])} />
                          </label>
                        )}
                      </div>

                      {/* Options based on type */}
                      {(question.type === 'single-choice' || question.type === 'multiple-choice') && (
                        <div className="space-y-2">
                          {question.options.map((opt, oIndex) => (
                            <div key={opt.id} className="flex items-center gap-2">
                              <button
                                onClick={() => updateOption(qIndex, oIndex, 'isCorrect', !opt.isCorrect)}
                                className={`w-5 h-5 ${question.type === 'single-choice' ? 'rounded-full' : 'rounded-md'} border-2 flex items-center justify-center transition-all flex-shrink-0
                                  ${opt.isCorrect ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 dark:border-slate-500 hover:border-emerald-400'}`}
                              >
                                {opt.isCorrect && <Check size={10} className="text-white" />}
                              </button>
                              <input className="input-field py-1.5 text-sm" placeholder={`${t('optionPlaceholder')} ${oIndex + 1}`}
                                value={opt.text} onChange={e => updateOption(qIndex, oIndex, 'text', e.target.value)} />
                              {question.options.length > 2 && (
                                <button onClick={() => removeOption(qIndex, oIndex)}
                                  className="text-gray-400 hover:text-red-500 flex-shrink-0"><X size={14} /></button>
                              )}
                            </div>
                          ))}
                          <button onClick={() => addOption(qIndex)}
                            className="flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-700 font-medium">
                            <Plus size={12} /> {t('addOption')}
                          </button>
                        </div>
                      )}

                      {question.type === 'true-false' && (
                        <div className="space-y-1.5">
                          {question.options.map((opt, oIndex) => (
                            <button key={opt.id} onClick={() => updateOption(qIndex, oIndex, 'isCorrect', true)}
                              className={`w-full flex items-center gap-2.5 p-2.5 rounded-lg border-2 transition-all text-xs font-medium
                                ${opt.isCorrect ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' : 'border-gray-200 dark:border-slate-600 hover:border-gray-300 text-gray-600 dark:text-gray-400'}`}>
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center
                                ${opt.isCorrect ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 dark:border-slate-500'}`}>
                                {opt.isCorrect && <Check size={8} className="text-white" />}
                              </div>
                              {opt.text}
                            </button>
                          ))}
                        </div>
                      )}

                      {question.type === 'essay' && (
                        <div className="p-3 bg-gray-50 dark:bg-slate-700 rounded-lg text-xs text-gray-500 dark:text-gray-400 italic">
                          {t('essayHint')}
                        </div>
                      )}

                      {question.type === 'fill-blank' && (
                        <div>
                          <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">{t('correctAnswer')}</label>
                          <input className="input-field text-sm py-2" placeholder={t('enterCorrectAnswer')}
                            value={question.correctAnswer} onChange={e => updateQuestion(qIndex, 'correctAnswer', e.target.value)} />
                        </div>
                      )}

                      {question.type === 'matching' && (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-3 mb-1">
                            <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">{t('element')}</span>
                            <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">{t('pair')}</span>
                          </div>
                          {question.options.map((opt, oIndex) => (
                            <div key={opt.id} className="grid grid-cols-2 gap-2 items-center">
                              <input className="input-field py-1.5 text-sm" placeholder={`${t('element')} ${oIndex + 1}`}
                                value={opt.text} onChange={e => updateOption(qIndex, oIndex, 'text', e.target.value)} />
                              <div className="flex items-center gap-1.5">
                                <input className="input-field py-1.5 text-sm" placeholder={`${t('pair')} ${oIndex + 1}`}
                                  value={opt.matchPair || ''} onChange={e => updateOption(qIndex, oIndex, 'matchPair', e.target.value)} />
                                {question.options.length > 2 && (
                                  <button onClick={() => removeOption(qIndex, oIndex)}
                                    className="text-gray-400 hover:text-red-500 flex-shrink-0"><X size={14} /></button>
                                )}
                              </div>
                            </div>
                          ))}
                          <button onClick={() => addOption(qIndex)}
                            className="flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-700 font-medium">
                            <Plus size={12} /> {t('addPair')}
                          </button>
                        </div>
                      )}

                      {/* Explanation */}
                      <div className="pt-2 border-t border-gray-100 dark:border-slate-700">
                        <input className="input-field py-1.5 text-xs" placeholder={t('explanationPlaceholder')}
                          value={question.explanation} onChange={e => updateQuestion(qIndex, 'explanation', e.target.value)} />
                      </div>
                    </div>
                    </motion.div>
                  )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Add question button (sticky) */}
          <div className="sticky bottom-4 mt-5 z-10">
            <div className="relative">
              <AnimatePresence>
                {showAddMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute bottom-full mb-2 left-0 right-0 glass-card-solid p-3 shadow-glass-lg"
                  >
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {questionTypes.map(t => (
                        <button key={t.value} onClick={() => addQuestion(t.value)}
                          className="flex items-center gap-2 p-3 rounded-xl border border-gray-200 dark:border-slate-600
                            hover:border-primary-300 hover:bg-primary-50/30 dark:hover:bg-primary-900/10 transition-all group">
                          <div className={`w-8 h-8 ${t.color} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform`}>
                            <t.icon size={14} />
                          </div>
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{t.label}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                onClick={() => setShowAddMenu(!showAddMenu)}
                className="w-full btn-primary flex items-center justify-center gap-2 py-3 text-sm shadow-xl"
              >
                <Plus size={18} />
                {t('addQuestion')}
              </button>

              {/* Bottom save button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSave}
                disabled={saving}
                className="w-full btn-primary flex items-center justify-center gap-2 py-3 text-sm mt-3 bg-emerald-600 hover:bg-emerald-700 shadow-xl"
              >
                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={16} />}
                {editId ? t('updateTest') : t('saveTest')}
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {coverEditor && coverMetrics && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-end justify-center p-2 sm:items-center sm:p-4"
            onClick={() => {
              coverDragRef.current = null;
              setCoverEditor(null);
            }}
          >
            <div className="absolute inset-0 bg-black/55 backdrop-blur-md" />
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.96 }}
              onClick={(event) => event.stopPropagation()}
              className="relative flex h-[calc(100vh-0.5rem)] w-full max-w-6xl flex-col overflow-hidden rounded-[24px] border border-white/20 bg-white shadow-2xl dark:border-slate-700/70 dark:bg-slate-900 sm:h-auto sm:max-h-[calc(100vh-1rem)] sm:rounded-[28px]"
            >
              <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 dark:border-slate-800 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:px-6 sm:py-5">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-500">
                    Cover Editor
                  </p>
                  <h3 className="mt-1 text-lg font-bold text-dark sm:text-xl">Подгони баннер под карточку</h3>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
                    Перетаскивай изображение внутри рамки 16:9 и сразу смотри, как оно сядет в каталоге.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    coverDragRef.current = null;
                    setCoverEditor(null);
                  }}
                  className="rounded-xl p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-800 dark:hover:text-gray-200"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                <div className="grid gap-4 px-3 py-3 sm:gap-5 sm:px-6 sm:py-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="space-y-4 sm:space-y-5">
                  <div className="overflow-hidden rounded-[26px] border border-slate-200 bg-slate-950 shadow-[0_36px_80px_-50px_rgba(15,23,42,0.85)] dark:border-slate-700">
                    <div
                      ref={coverStageRef}
                      onPointerDown={handleCoverPointerDown}
                      onPointerMove={handleCoverPointerMove}
                      onPointerUp={stopCoverDragging}
                      onPointerCancel={stopCoverDragging}
                      className="relative w-full touch-none select-none"
                      style={{ aspectRatio: '16 / 9' }}
                    >
                      <img
                        src={coverEditor.src}
                        alt=""
                        draggable={false}
                        className="absolute max-w-none cursor-grab active:cursor-grabbing"
                        style={{
                          width: coverMetrics.renderWidth,
                          height: coverMetrics.renderHeight,
                          left: coverEditor.offsetX,
                          top: coverEditor.offsetY,
                        }}
                      />
                      <div className="pointer-events-none absolute inset-0 border border-white/30" />
                      <div className="pointer-events-none absolute left-3 top-3 rounded-full border border-white/18 bg-black/32 px-2.5 py-1 text-[10px] font-medium text-white/90 backdrop-blur-sm sm:left-4 sm:top-4 sm:px-3 sm:py-1.5 sm:text-[11px]">
                        16:9 safe frame
                      </div>
                      <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-2 rounded-full border border-white/18 bg-black/32 px-2.5 py-1 text-[10px] text-white/80 backdrop-blur-sm sm:bottom-4 sm:left-4 sm:px-3 sm:py-1.5 sm:text-[11px]">
                        <Move size={12} />
                        Потяни, чтобы сдвинуть кадр
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-dark">
                        <ZoomIn size={16} className="text-primary-500" />
                        Масштаб
                      </div>
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        {Math.round((coverEditor.zoom || 1) * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={COVER_MIN_ZOOM}
                      max={COVER_MAX_ZOOM}
                      step="0.01"
                      value={coverEditor.zoom || COVER_MIN_ZOOM}
                      onChange={(event) => updateCoverZoom(event.target.value)}
                      className="mt-3 w-full accent-primary-600"
                    />
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={resetCoverFrame}
                        className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition hover:bg-white dark:border-slate-700 dark:text-gray-300 dark:hover:bg-slate-700"
                      >
                        <RotateCcw size={13} />
                        Сбросить кадр
                      </button>
                      <span className="inline-flex items-center rounded-xl bg-primary-50 px-3 py-2 text-[11px] text-primary-600 dark:bg-primary-900/20 dark:text-primary-300">
                        Файл: {coverEditor.fileName || 'image'}
                      </span>
                    </div>
                  </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                      Live Preview
                    </p>
                    <h4 className="mt-1 text-sm font-semibold text-dark">Как это увидят в Dashboard</h4>
                  </div>

                    <div className="mx-auto w-full max-w-[320px] overflow-hidden rounded-[26px] border border-gray-200/80 bg-white shadow-[0_28px_70px_-45px_rgba(15,23,42,0.48)] dark:border-slate-700 dark:bg-slate-900/60 lg:max-w-none">
                      <div className="relative overflow-hidden" style={{ aspectRatio: '16 / 9' }}>
                        <img
                          src={coverEditor.src}
                          alt=""
                          className="absolute max-w-none"
                          style={{
                            width: `${(coverMetrics.renderWidth / COVER_FRAME_WIDTH) * 100}%`,
                            height: `${(coverMetrics.renderHeight / COVER_FRAME_HEIGHT) * 100}%`,
                            left: `${(coverEditor.offsetX / COVER_FRAME_WIDTH) * 100}%`,
                            top: `${(coverEditor.offsetY / COVER_FRAME_HEIGHT) * 100}%`,
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/14 via-transparent to-transparent" />
                      </div>
                      <div className="space-y-3 p-4">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${
                            test.settings?.isPublic
                              ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300'
                              : 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-300'
                          }`}>
                            {test.settings?.isPublic ? <Eye size={10} /> : <EyeOff size={10} />}
                            {test.settings?.isPublic ? 'Публичный' : 'Приватный'}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {test.questions.length} {t('questions')}
                          </span>
                        </div>
                        <h4 className="line-clamp-1 text-sm font-semibold text-dark">{coverPreviewTitle}</h4>
                        <p className="line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
                          {coverPreviewDescription}
                        </p>
                      </div>
                    </div>

                    <div className="hidden rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-[11px] text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/10 dark:text-emerald-300 sm:block">
                      Сохраняется уже итоговый JPEG 800×450. То, что видишь здесь, и пойдёт в `Dashboard` и `Test Profile`.
                    </div>
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 z-10 flex flex-col-reverse gap-2 border-t border-gray-100 bg-white/95 px-4 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 sm:flex-row sm:justify-end sm:gap-3 sm:px-6 sm:py-5">
                <button
                  type="button"
                  onClick={() => {
                    coverDragRef.current = null;
                    setCoverEditor(null);
                  }}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 dark:border-slate-700 dark:text-gray-300 dark:hover:bg-slate-800 sm:w-auto"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={saveCoverCrop}
                  className="w-full rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-600/20 transition hover:bg-primary-700 sm:w-auto"
                >
                  Сохранить обложку
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Import CSV Modal */}
      <AnimatePresence>
        {showImportModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setShowImportModal(false)}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              onClick={e => e.stopPropagation()} className="relative w-full max-w-md glass-card-solid p-6">
              <h3 className="text-lg font-bold text-dark mb-2">{t('importFromCSV')}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                Формат: <code className="bg-gray-100 dark:bg-slate-700 px-1 rounded">Вопрос, тип, правильный, вариант1, вариант2, ...</code><br/>
                ???: single-choice, multiple-choice, true-false, essay, fill-blank, matching.<br/>
                Первая строка — заголовок (пропускается).
              </p>
              <label className="flex flex-col items-center gap-2 p-8 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl cursor-pointer
                hover:border-primary-400 hover:bg-primary-50/30 dark:hover:bg-primary-900/10 transition-all">
                <FileSpreadsheet size={32} className="text-gray-400" />
                <span className="text-sm text-gray-500 dark:text-gray-400">{t('clickToSelectFile')}</span>
                <span className="text-xs text-gray-400">.csv, .txt</span>
                <input type="file" className="hidden" accept=".csv,.txt,.tsv"
                  onChange={e => e.target.files[0] && handleFileImport(e.target.files[0])} />
              </label>
              <button onClick={() => setShowImportModal(false)}
                className="w-full btn-secondary mt-3 text-sm py-2">{t('cancel')}</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bank Modal */}
      <AnimatePresence>
        {showBankModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setShowBankModal(false)}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              onClick={e => e.stopPropagation()} className="relative w-full max-w-lg glass-card-solid p-6 max-h-[80vh] overflow-y-auto">
              <h3 className="text-lg font-bold text-dark mb-4">{t('questionBankTitle')}</h3>
              {bankQuestions.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">{t('bankEmpty')}</p>
              ) : (
                <>
                  <div className="space-y-2 mb-4">
                    {bankQuestions.map(q => (
                      <label key={q._id} className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer">
                        <input type="checkbox" className="mt-0.5 accent-primary-600" value={q._id} />
                        <div className="min-w-0">
                          <p className="text-sm text-dark truncate">{q.questionText}</p>
                          <p className="text-[10px] text-gray-400">{questionTypes.find(t => t.value === q.type)?.label} • {q.points} б.</p>
                        </div>
                      </label>
                    ))}
                  </div>
                  <button onClick={() => {
                    const checks = document.querySelectorAll('input[type=checkbox]:checked');
                    const ids = Array.from(checks).map(c => c.value);
                    const selected = bankQuestions.filter(q => ids.includes(q._id));
                    if (selected.length) addFromBank(selected);
                    else toast.error(t('selectQuestions'));
                  }} className="w-full btn-primary text-sm py-2">
                    {t('addSelected')}
                  </button>
                </>
              )}
              <button onClick={() => setShowBankModal(false)} className="w-full btn-secondary mt-2 text-sm py-2">{t('close')}</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Draft Recovery Dialog */}
      <AnimatePresence>
        {showDraftDialog && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
            <motion.div initial={{scale:0.9}} animate={{scale:1}} exit={{scale:0.9}} className="card p-6 max-w-md w-full space-y-4">
              <h3 className="text-lg font-bold">{t('draftFound')}</h3>
              <p className="text-sm text-secondary">{t('restoreDraft')}</p>
              <div className="flex gap-3">
                <button onClick={restoreDraft} className="flex-1 btn-primary py-2 text-sm">{t('restore')}</button>
                <button onClick={discardDraft} className="flex-1 btn-secondary py-2 text-sm">{t('discard')}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Generate Modal */}
      <AIGenerateModal
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
        currentLanguage={lang}
        onGenerated={(questions) => {
          setTest(prev => ({
            ...prev,
            questions: [...prev.questions, ...questions]
          }));
          setActiveQuestion(test.questions.length);
          toast.success(t('aiQuestionsAdded')?.replace('{{count}}', questions.length) || `${questions.length} questions added!`);
        }}
      />
    </div>
  );
}
