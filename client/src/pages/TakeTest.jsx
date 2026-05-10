import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, AlertTriangle, ChevronLeft, ChevronRight, Send,
  Image, Video, Music, Shield, User, Check, X, Ticket, Loader2, Dumbbell, Globe,
  Play, Star, Users as UsersIcon, BarChart3, FileText, RefreshCw, ArrowRight,
  TrendingUp, Trophy, ChevronRight as ChevronRightIcon
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import useAntiCheat from '../hooks/useAntiCheat';
import toast, { Toaster } from 'react-hot-toast';
import ConfirmDialog from '../components/ConfirmDialog';
import TestCoverArtwork from '../components/TestCoverArtwork';

// Matching question component with interactive drag-and-drop style matching
function MatchingQuestion({
  question,
  currentAnswer,
  onAnswer,
  getLeftText = (option) => option.text,
  getRightText = (text) => text
}) {
  const { t } = useLanguage();
  const [selectedLeft, setSelectedLeft] = useState(null);
  const pairs = currentAnswer?.matchingPairs || [];
  const rightSide = question.matchingRightSide || [];

  // Color palette for matched pairs
  const pairColors = [
    { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-400', text: 'text-blue-600 dark:text-blue-400', dot: 'bg-blue-500' },
    { bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-400', text: 'text-purple-600 dark:text-purple-400', dot: 'bg-purple-500' },
    { bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-400', text: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
    { bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-400', text: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' },
    { bg: 'bg-rose-50 dark:bg-rose-900/20', border: 'border-rose-400', text: 'text-rose-600 dark:text-rose-400', dot: 'bg-rose-500' },
    { bg: 'bg-cyan-50 dark:bg-cyan-900/20', border: 'border-cyan-400', text: 'text-cyan-600 dark:text-cyan-400', dot: 'bg-cyan-500' },
    { bg: 'bg-indigo-50 dark:bg-indigo-900/20', border: 'border-indigo-400', text: 'text-primary-600 dark:text-primary-400', dot: 'bg-indigo-500' },
    { bg: 'bg-teal-50 dark:bg-teal-900/20', border: 'border-teal-400', text: 'text-teal-600 dark:text-teal-400', dot: 'bg-teal-500' },
  ];

  const getPairIndex = (leftId) => {
    const idx = pairs.findIndex(p => p.left === leftId);
    return idx >= 0 ? idx % pairColors.length : -1;
  };

  const getRightPairIndex = (rightText) => {
    const idx = pairs.findIndex(p => p.right === rightText);
    return idx >= 0 ? idx % pairColors.length : -1;
  };

  const handleLeftClick = (optId) => {
    if (getMatchedRight(optId)) {
      removePair(optId);
      return;
    }
    setSelectedLeft(selectedLeft === optId ? null : optId);
  };

  const handleRightClick = (rightText) => {
    if (!selectedLeft) {
      // If right is already matched, free it
      const existingPair = pairs.find(p => p.right === rightText);
      if (existingPair) {
        const newPairs = pairs.filter(p => p.right !== rightText);
        onAnswer(newPairs);
      }
      return;
    }
    // Create or update the pair
    const newPairs = pairs.filter(p => p.left !== selectedLeft && p.right !== rightText);
    newPairs.push({ left: selectedLeft, right: rightText });
    onAnswer(newPairs);
    setSelectedLeft(null);
  };

  const removePair = (leftId) => {
    const newPairs = pairs.filter(p => p.left !== leftId);
    onAnswer(newPairs);
  };

  const getMatchedRight = (leftId) => pairs.find(p => p.left === leftId)?.right;
  const isRightUsed = (rightText) => pairs.some(p => p.right === rightText);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-xl border border-primary-200 dark:border-primary-800">
        <div className="w-6 h-6 bg-primary-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="text-white text-xs font-bold">?</span>
        </div>
        <p className="text-xs text-primary-700 dark:text-primary-300">
          {t('matchingHint')}
        </p>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary-500 to-emerald-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(pairs.length / question.options.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <span className="text-xs font-medium text-gray-500">{pairs.length}/{question.options.length}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
        {/* Left column */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full bg-primary-500" />
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('elements')}</p>
          </div>
          {question.options.map((opt, optionIndex) => {
            const matched = getMatchedRight(opt.id);
            const isSelected = selectedLeft === opt.id;
            const colorIdx = getPairIndex(opt.id);
            const color = colorIdx >= 0 ? pairColors[colorIdx] : null;
            return (
              <motion.button
                key={opt.id}
                whileTap={{ scale: 0.97 }}
                whileHover={{ scale: 1.01 }}
                onClick={() => handleLeftClick(opt.id)}
                className={`w-full text-left p-3.5 rounded-xl border-2 text-sm font-medium transition-all relative overflow-hidden ${matched && color
                    ? `${color.border} ${color.bg} ${color.text}`
                    : isSelected
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 ring-2 ring-primary-300 dark:ring-primary-700 shadow-lg shadow-primary-500/10'
                      : 'border-gray-200 dark:border-slate-600 hover:border-primary-300 dark:hover:border-primary-600 text-dark hover:shadow-md'
                  }`}
              >
                {color && colorIdx >= 0 && (
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${color.dot}`} />
                )}
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${matched ? `${color?.dot || 'bg-emerald-500'} text-white` : isSelected ? 'bg-primary-500 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-500'
                    }`}>
                    {matched ? '✓' : (optionIndex + 1)}
                  </div>
                  <span className="flex-1">{getLeftText(opt, optionIndex)}</span>
                </div>
                {matched && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-2 pt-2 border-t border-current/10 flex items-center gap-1.5"
                  >
                    <span className="text-xs opacity-70">→</span>
                    <span className="text-xs font-medium">{getRightText(matched)}</span>
                    <span className="text-[10px] ml-auto opacity-50 hover:opacity-100">(×)</span>
                  </motion.div>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Right column */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('pairs')}</p>
          </div>
          {rightSide.map((text, idx) => {
            const used = isRightUsed(text);
            const colorIdx = getRightPairIndex(text);
            const color = colorIdx >= 0 ? pairColors[colorIdx] : null;
            return (
              <motion.button
                key={idx}
                whileTap={{ scale: 0.97 }}
                whileHover={{ scale: selectedLeft ? 1.02 : 1.0 }}
                onClick={() => handleRightClick(text)}
                className={`w-full text-left p-3.5 rounded-xl border-2 text-sm font-medium transition-all relative overflow-hidden ${used && color
                    ? `${color.border} ${color.bg} ${color.text} opacity-75`
                    : selectedLeft
                      ? 'border-amber-300 dark:border-amber-600 bg-amber-50/70 dark:bg-amber-900/20 hover:border-amber-400 dark:hover:border-amber-500 text-dark cursor-pointer hover:shadow-md'
                      : 'border-gray-200 dark:border-slate-600 text-dark'
                  }`}
              >
                {color && colorIdx >= 0 && (
                  <div className={`absolute right-0 top-0 bottom-0 w-1 ${color.dot}`} />
                )}
                <div className="flex items-center gap-2">
                  <span className="flex-1">{getRightText(text, idx)}</span>
                  {used && color && (
                    <div className={`w-5 h-5 rounded-md ${color.dot} text-white flex items-center justify-center`}>
                      <span className="text-[10px] font-bold">✓</span>
                    </div>
                  )}
                  {selectedLeft && !used && (
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      className="w-5 h-5 rounded-md bg-amber-400 text-white flex items-center justify-center"
                    >
                      <span className="text-[10px] font-bold">+</span>
                    </motion.div>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Matched pairs summary */}
      {pairs.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-100 dark:border-slate-700"
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">{t('yourPairs')}</p>
          <div className="flex flex-wrap gap-1.5">
            {pairs.map((p, i) => {
              const leftIndex = question.options.findIndex(option => option.id === p.left);
              const leftOption = leftIndex >= 0 ? question.options[leftIndex] : null;
              const leftText = leftOption ? getLeftText(leftOption, leftIndex) : p.left;
              const color = pairColors[i % pairColors.length];
              return (
                <span key={i} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${color.bg} ${color.text} border ${color.border}`}>
                  {leftText} → {getRightText(p.right)}
                </span>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}

const hasHtmlMarkup = (value = '') => /<\/?[a-z][\s\S]*>/i.test(value);

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const stripHtml = (value = '') => String(value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

function toRichTextHtml(value = '') {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!normalized) return '';
  if (hasHtmlMarkup(normalized)) return normalized;
  return `<p>${escapeHtml(normalized).replace(/\n/g, '<br />')}</p>`;
}

const TEST_SESSION_PREFIX = 'testSession_';
const SAVED_SESSION_TTL_MS = 5 * 60 * 1000;

function createSessionId() {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function getSessionStorageKey(shareLink = '') {
  return `${TEST_SESSION_PREFIX}${shareLink}`;
}

function readSavedSession(shareLink = '') {
  if (!shareLink || typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(getSessionStorageKey(shareLink));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getSavedSessionAgeMs(savedSession) {
  if (!savedSession?.updatedAt) return Number.POSITIVE_INFINITY;
  const updatedAtMs = new Date(savedSession.updatedAt).getTime();
  if (!Number.isFinite(updatedAtMs)) return Number.POSITIVE_INFINITY;
  return Date.now() - updatedAtMs;
}

function isSavedSessionExpired(savedSession) {
  return getSavedSessionAgeMs(savedSession) > SAVED_SESSION_TTL_MS;
}

function readCookie(name) {
  const prefix = `${name}=`;
  const parts = document.cookie ? document.cookie.split('; ') : [];
  const found = parts.find(part => part.startsWith(prefix));
  return found ? decodeURIComponent(found.slice(prefix.length)) : '';
}

function getQuestionPreviewText(question, testLang, t, fallbackIndex = 0) {
  const translatedText = testLang && question?.translations?.[testLang]?.questionText;
  const text = stripHtml(translatedText || question?.questionText || '');
  if (text) return text;
  return `${t('question') || 'Question'} ${fallbackIndex + 1}`;
}

// Pre-start metric tile (chunky)
function PreStartTile({ icon: Icon, label, value, tone = 'primary', valueClassName = '' }) {
  const tones = {
    primary: { bg: 'bg-primary-50 dark:bg-primary-900/20', text: 'text-primary-700 dark:text-primary-300', icon: 'text-primary-600 dark:text-primary-300', shadow: '#9a3412' },
    amber: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-300', icon: 'text-amber-600 dark:text-amber-300', shadow: '#78350f' },
    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-300', icon: 'text-emerald-600 dark:text-emerald-300', shadow: '#065f46' },
    blue: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-300', icon: 'text-blue-600 dark:text-blue-300', shadow: '#1e3a8a' },
    red: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-300', icon: 'text-red-600 dark:text-red-300', shadow: '#7f1d1d' },
    slate: { bg: 'bg-slate-50 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-200', icon: 'text-slate-500 dark:text-slate-400', shadow: '#0f172a' },
  };
  const c = tones[tone] || tones.primary;
  return (
    <div
      className={`rounded-2xl border-2 border-slate-900 ${c.bg} p-3 dark:border-white sm:p-4`}
      style={{ boxShadow: `0 4px 0 ${c.shadow}` }}
    >
      <Icon className={`mb-1 h-5 w-5 ${c.icon} sm:h-6 sm:w-6`} strokeWidth={2.4} />
      <p className={`font-mono text-xl font-black ${c.text} sm:text-2xl ${valueClassName}`}>{value}</p>
      <p className={`text-[9px] font-black uppercase tracking-widest ${c.icon} sm:text-[10px]`}>{label}</p>
    </div>
  );
}

export default function TakeTest() {
  const { shareLink } = useParams();
  const [searchParams] = useSearchParams();
  const isPractice = searchParams.get('practice') === 'true';
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, lang } = useLanguage();

  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deadlineError, setDeadlineError] = useState(null); // { code, startDate?, endDate? }
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [guestName, setGuestName] = useState('');
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [violations, setViolations] = useState([]);
  const [started, setStarted] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showViolationWarning, setShowViolationWarning] = useState(false);
  const [lastViolationText, setLastViolationText] = useState('');
  const [attemptInfo, setAttemptInfo] = useState({ attempts: 0, maxAttempts: 0 });
  const [pastAttempts, setPastAttempts] = useState({ attempts: [], count: 0, best: 0 });
  const [isPublicTest, setIsPublicTest] = useState(false);
  const [testLang, setTestLang] = useState(null); // null = original, 'en'/'ru'/'kz'/'es' = translated
  const [elapsedActiveSeconds, setElapsedActiveSeconds] = useState(0);
  const [sessionPaused, setSessionPaused] = useState(false);
  const [sessionId, setSessionId] = useState(() => createSessionId());
  const dialogOpenRef = useRef(false);
  const navScrollRef = useRef(null);
  const submittingRef = useRef(false);
  const leaveGuardRef = useRef(false);
  const forceSubmitRef = useRef(null);
  const runtimeRef = useRef({});
  const restoredSessionRef = useRef(false);
  const leaveViolationLockRef = useRef(0);
  const hardExitInFlightRef = useRef(false);

  // Persistent guest ID for attempt tracking (browser fingerprint)
  const getGuestId = () => {
    const storageKey = 'unitest_guest_id';
    let id = localStorage.getItem(storageKey);
    if (!id) {
      id = 'guest_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
      localStorage.setItem(storageKey, id);
    }
    return id;
  };

  // Ticket/Variant system
  const [ticketState, setTicketState] = useState(null); // null = not loaded, { variants, myVariant }
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [ticketLoading, setTicketLoading] = useState(false);

  // Instant feedback state
  const [feedback, setFeedback] = useState({}); // { [questionId]: { isCorrect, correctOptionIds, correctText, correctPairs, explanation, checked } }
  const [checkingAnswer, setCheckingAnswer] = useState(false);

  // Session timeout (inactivity)
  const [showInactivityWarning, setShowInactivityWarning] = useState(false);
  const [inactivityCountdown, setInactivityCountdown] = useState(60);
  const lastActivityRef = useRef(Date.now());
  const inactivityTimerRef = useRef(null);
  const countdownRef = useRef(null);
  const practiceSavedToast = {
    en: 'Practice result saved separately from official attempts',
    ru: 'Результат тренировки сохранён отдельно от официальных попыток',
    kz: 'Жаттығу нәтижесі ресми әрекеттерден бөлек сақталды',
    es: 'El resultado de práctica se guardó aparte de los intentos oficiales'
  };

  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (showInactivityWarning) {
      setShowInactivityWarning(false);
      setInactivityCountdown(60);
      if (countdownRef.current) clearInterval(countdownRef.current);
    }
  }, [showInactivityWarning]);

  const sessionStorageKey = getSessionStorageKey(shareLink);
  const blockTabSwitchEnabled = Boolean(test?.settings?.antiCheat?.blockTabSwitch);
  const warnOnLeaveEnabled = Boolean(test?.settings?.antiCheat?.warnOnLeave);
  const finishOnLeaveEnabled = Boolean(test?.settings?.antiCheat?.finishOnLeave);
  const shouldRecordLeaveWarning = warnOnLeaveEnabled && !blockTabSwitchEnabled;
  const leaveMonitoringEnabled = blockTabSwitchEnabled || warnOnLeaveEnabled || finishOnLeaveEnabled;

  const clearSavedSession = useCallback(() => {
    if (isPractice) return;
    try {
      localStorage.removeItem(sessionStorageKey);
    } catch {}
  }, [isPractice, sessionStorageKey]);

  const persistSessionSnapshot = useCallback((overrides = {}) => {
    if (!shareLink || isPractice) return null;

    const current = runtimeRef.current;
    const snapshot = {
      testId: current.test?._id || '',
      shareLink,
      testTitle: current.test?.title || '',
      coverImage: current.test?.coverImage || '',
      questionCount: current.test?.questions?.length || 0,
      answers: current.answers || {},
      currentQ: current.currentQ || 0,
      violations: current.violations || [],
      guestName: current.guestName || '',
      timeLeft: typeof current.timeLeft === 'number' ? current.timeLeft : null,
      selectedVariant: current.selectedVariant || 0,
      elapsedActiveSeconds: current.elapsedActiveSeconds || 0,
      sessionId: current.sessionId || sessionId,
      started: Boolean(current.started),
      testLang: current.testLang || null,
      sessionPaused: Boolean(current.sessionPaused),
      updatedAt: new Date().toISOString(),
      ...overrides
    };

    try {
      localStorage.setItem(sessionStorageKey, JSON.stringify(snapshot));
    } catch {}

    return snapshot;
  }, [isPractice, sessionId, sessionStorageKey, shareLink]);

  const ensureSessionId = useCallback(() => {
    const existing = runtimeRef.current.sessionId || sessionId;
    if (existing) return existing;
    const nextSessionId = createSessionId();
    setSessionId(nextSessionId);
    runtimeRef.current = {
      ...runtimeRef.current,
      sessionId: nextSessionId
    };
    return nextSessionId;
  }, [sessionId]);

  useEffect(() => {
    submittingRef.current = submitting;
  }, [submitting]);

  useEffect(() => {
    runtimeRef.current = {
      test,
      answers,
      currentQ,
      violations,
      guestName,
      timeLeft,
      selectedVariant,
      elapsedActiveSeconds,
      sessionId,
      started,
      testLang,
      sessionPaused
    };
  }, [test, answers, currentQ, violations, guestName, timeLeft, selectedVariant, elapsedActiveSeconds, sessionId, started, testLang, sessionPaused]);

  useEffect(() => {
    if (!started || sessionPaused || !test?.settings?.inactivityTimeout) return;
    const timeoutMs = test.settings.inactivityTimeout * 60 * 1000;
    inactivityTimerRef.current = setInterval(() => {
      const idle = Date.now() - lastActivityRef.current;
      if (idle >= timeoutMs && !showInactivityWarning) {
        setShowInactivityWarning(true);
        setInactivityCountdown(60);
        countdownRef.current = setInterval(() => {
          setInactivityCountdown(prev => {
            if (prev <= 1) {
              clearInterval(countdownRef.current);
              setShowInactivityWarning(false);
              forceSubmitRef.current?.();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    }, 5000);

    const events = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'];
    events.forEach(e => window.addEventListener(e, resetActivity, { passive: true }));

    return () => {
      clearInterval(inactivityTimerRef.current);
      clearInterval(countdownRef.current);
      events.forEach(e => window.removeEventListener(e, resetActivity));
    };
  }, [started, sessionPaused, test, showInactivityWarning, resetActivity]);

  const applyViolationFeedback = useCallback((violation, count, shouldAppend = true) => {
    if (dialogOpenRef.current) return;
    if (shouldAppend) {
      setViolations(prev => [...prev, violation]);
    }
    setLastViolationText(violation.details);
    setShowViolationWarning(true);
    if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);

    if (test?.settings?.antiCheat?.maxViolations && count >= test.settings.antiCheat.maxViolations) {
      setTimeout(() => {
        setShowViolationWarning(false);
        toast.error(t('violationLimitExceeded'), { duration: 3200 });
        forceSubmitRef.current?.();
      }, 1500);
    }
  }, [test, t]);

  const handleViolation = useCallback((violation, count) => {
    applyViolationFeedback(violation, count, true);
  }, [applyViolationFeedback]);

  const recordLeaveViolation = useCallback((details) => {
    const now = Date.now();
    if (now - leaveViolationLockRef.current < 1200) return null;
    leaveViolationLockRef.current = now;

    const violation = { type: 'tab-switch', timestamp: new Date().toISOString(), details };
    const nextViolations = [...(runtimeRef.current.violations || []), violation];
    runtimeRef.current.violations = nextViolations;
    setViolations(nextViolations);
    persistSessionSnapshot({ violations: nextViolations, sessionPaused: true });
    applyViolationFeedback(violation, nextViolations.length, false);
    return violation;
  }, [applyViolationFeedback, persistSessionSnapshot]);

  const pauseActiveSession = useCallback(() => {
    if (!runtimeRef.current.started || hardExitInFlightRef.current) return;
    runtimeRef.current.sessionPaused = true;
    setSessionPaused(true);
    clearInterval(countdownRef.current);
    setShowInactivityWarning(false);
    setInactivityCountdown(60);
    persistSessionSnapshot({ sessionPaused: true });
  }, [persistSessionSnapshot]);

  const resumeActiveSession = useCallback(() => {
    if (!runtimeRef.current.started || hardExitInFlightRef.current) return;
    runtimeRef.current.sessionPaused = false;
    setSessionPaused(false);
    resetActivity();
    persistSessionSnapshot({ sessionPaused: false });
  }, [persistSessionSnapshot, resetActivity]);

  useAntiCheat({
    enabled: started && (
      test?.settings?.antiCheat?.blockTabSwitch ||
      test?.settings?.antiCheat?.blockCopyPaste ||
      test?.settings?.antiCheat?.blockScreenshot
    ),
    settings: test?.settings?.antiCheat,
    onViolation: handleViolation
  });

  const refreshAttemptInfo = useCallback(async (currentTest) => {
    if (!currentTest?._id) return;
    try {
      const guestId = !user ? getGuestId() : '';
      const attUrl = `/results/my-attempts/${currentTest._id}${guestId ? `?guestId=${guestId}` : ''}`;
      const attRes = await api.get(attUrl);
      setAttemptInfo({ attempts: attRes.data.attempts, maxAttempts: currentTest.settings?.maxAttempts || 0 });
    } catch (_) {}
    // Past attempts list (for pre-start "Твои попытки" block)
    try {
      const guestId = !user ? getGuestId() : '';
      const listUrl = `/results/my-attempts-list/${currentTest._id}${guestId ? `?guestId=${guestId}` : ''}`;
      const listRes = await api.get(listUrl);
      setPastAttempts(listRes.data || { attempts: [], count: 0, best: 0 });
    } catch (_) {}
  }, [user]);

  const fetchTest = async (variantNum) => {
    try {
      const savedSession = !variantNum && !isPractice ? readSavedSession(shareLink) : null;
      const effectiveVariant = variantNum || savedSession?.selectedVariant || 0;
      const url = effectiveVariant
        ? `/tests/share/${shareLink}?variant=${effectiveVariant}`
        : `/tests/share/${shareLink}`;
      const res = await api.get(url);
      setTest(res.data);
      setIsPublicTest(res.data.settings?.isPublic === true);
      if (effectiveVariant) setSelectedVariant(effectiveVariant);

      if (res.data.settings?.variants?.enabled && !isPractice) {
        try {
          const ticketRes = await api.get(`/tests/${res.data._id}/tickets`);
          setTicketState(ticketRes.data);
          if (savedSession?.selectedVariant) {
            setSelectedVariant(savedSession.selectedVariant);
          } else if (ticketRes.data.myVariant && !ticketRes.data.isPublic) {
            setSelectedVariant(ticketRes.data.myVariant);
          }
        } catch (_) {}
      }

      if (!user) setShowGuestForm(true);
      await refreshAttemptInfo(res.data);
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.code) {
        setDeadlineError(err.response.data);
      } else {
        toast.error(t('testNotFound'));
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    restoredSessionRef.current = false;
    hardExitInFlightRef.current = false;
    leaveGuardRef.current = false;
    setLoading(true);
    fetchTest();
  }, [shareLink]);

  useEffect(() => {
    if (!test || !started || isPractice) return;
    persistSessionSnapshot();
  }, [test, started, isPractice, answers, currentQ, violations, guestName, timeLeft, selectedVariant, elapsedActiveSeconds, testLang, sessionPaused, persistSessionSnapshot]);

  useEffect(() => {
    return () => {
      if (!isPractice && runtimeRef.current.started && !leaveGuardRef.current) {
        persistSessionSnapshot({ sessionPaused: true });
      }
    };
  }, [isPractice, persistSessionSnapshot]);

  useEffect(() => {
    if (!started || !test?.settings?.timeLimit || typeof timeLeft === 'number') return;
    setTimeLeft(test.settings.timeLimit * 60);
  }, [started, test, timeLeft]);

  useEffect(() => {
    if (!started || !test || sessionPaused || submitting) return;
    const hasTimeLimit = Boolean(test.settings?.timeLimit);

    const timer = setInterval(() => {
      setElapsedActiveSeconds(prev => prev + 1);

      if (hasTimeLimit) {
        setTimeLeft(prev => {
          const nextValue = typeof prev === 'number' ? prev : test.settings.timeLimit * 60;
          if (nextValue <= 1) {
            clearInterval(timer);
            toast.error(t('timeUp'));
            forceSubmitRef.current?.();
            return 0;
          }
          return nextValue - 1;
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [started, test, sessionPaused, submitting, t]);

  // Auto-scroll navigator to current question
  useEffect(() => {
    if (navScrollRef.current) {
      const container = navScrollRef.current;
      const activeBtn = container.children[0]?.children[currentQ];
      if (activeBtn) {
        const containerRect = container.getBoundingClientRect();
        const btnRect = activeBtn.getBoundingClientRect();
        const scrollLeft = activeBtn.offsetLeft - containerRect.width / 2 + btnRect.width / 2;
        container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
      }
    }
  }, [currentQ]);

  // Keyboard shortcuts: 1-9 for options, ←/→ for nav, Enter for next/submit
  useEffect(() => {
    if (!started || !test) return;
    const handler = (e) => {
      // Skip if typing in input/textarea
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      // Skip if dialog is open
      if (showSubmitConfirm || showViolationWarning || showInactivityWarning) return;

      const q = test.questions[currentQ];
      if (!q) return;
      const isLocked = feedback[q.id]?.checked;

      // 1-9: select option
      if (e.key >= '1' && e.key <= '9' && !isLocked) {
        const idx = parseInt(e.key) - 1;
        if (q.type === 'single-choice' || q.type === 'true-false') {
          if (q.options[idx]) {
            e.preventDefault();
            handleAnswer(q.id, 'single', q.options[idx].id);
          }
        } else if (q.type === 'multiple-choice') {
          if (q.options[idx]) {
            e.preventDefault();
            handleAnswer(q.id, 'multiple', q.options[idx].id);
          }
        }
      }

      // ArrowLeft: prev question
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentQ(prev => Math.max(0, prev - 1));
      }

      // ArrowRight: next question
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (currentQ < test.questions.length - 1) {
          setCurrentQ(prev => prev + 1);
        }
      }

      // Enter: next question or submit
      if (e.key === 'Enter') {
        e.preventDefault();
        if (currentQ < test.questions.length - 1) {
          setCurrentQ(prev => prev + 1);
        } else {
          handleSubmit();
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [started, test, currentQ, feedback, showSubmitConfirm, showViolationWarning, showInactivityWarning]);

  // Ticket polling: refresh every 2 seconds when ticket picker is open
  useEffect(() => {
    if (!test?.settings?.variants?.enabled || selectedVariant || started || isPractice) return;
    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/tests/${test._id}/tickets`);
        setTicketState(res.data);
        if (res.data.myVariant) setSelectedVariant(res.data.myVariant);
      } catch (_) { }
    }, 2000);
    return () => clearInterval(interval);
  }, [test, selectedVariant, started, isPractice]);

  const claimTicket = async (variantNumber) => {
    setTicketLoading(true);
    try {
      const res = await api.post(`/tests/${test._id}/tickets/claim`, {
        variantNumber,
        guestName: !user ? guestName : ''
      });
      setSelectedVariant(res.data.variantNumber);
      // Re-fetch test with variant ordering
      await fetchTest(res.data.variantNumber);
      toast.success(`🎫 ${t('ticketChosen', { n: res.data.variantNumber })}`);
    } catch (err) {
      if (err.response?.status === 409) {
        toast.error(err.response.data.message || t('ticketAlreadyTaken'));
        // Refresh tickets
        try {
          const ticketRes = await api.get(`/tests/${test._id}/tickets`);
          setTicketState(ticketRes.data);
        } catch (_) { }
      } else {
        toast.error(t('ticketSelectError'));
      }
    } finally {
      setTicketLoading(false);
    }
  };

  const startTest = () => {
    if (!user && !guestName.trim()) {
      toast.error(t('enterYourName'));
      return;
    }
    leaveGuardRef.current = false;
    ensureSessionId();
    runtimeRef.current.started = true;
    runtimeRef.current.sessionPaused = false;
    runtimeRef.current.guestName = guestName;
    setElapsedActiveSeconds(prev => prev || 0);
    setSessionPaused(false);
    setStarted(true);
    setShowGuestForm(false);
  };

  const handleAnswer = (questionId, type, value) => {
    // Don't allow changing answer if already checked in instant feedback mode
    if (feedback[questionId]?.checked) return;

    setAnswers(prev => {
      const existing = prev[questionId] || { questionId, selectedOptions: [], textAnswer: '', matchingPairs: [] };

      if (type === 'single') {
        return { ...prev, [questionId]: { ...existing, selectedOptions: [value] } };
      }
      if (type === 'multiple') {
        const opts = existing.selectedOptions.includes(value)
          ? existing.selectedOptions.filter(o => o !== value)
          : [...existing.selectedOptions, value];
        return { ...prev, [questionId]: { ...existing, selectedOptions: opts } };
      }
      if (type === 'text') {
        return { ...prev, [questionId]: { ...existing, textAnswer: value } };
      }
      if (type === 'match') {
        const pairs = [...existing.matchingPairs];
        const idx = pairs.findIndex(p => p.left === value.left);
        if (idx >= 0) pairs[idx] = value;
        else pairs.push(value);
        return { ...prev, [questionId]: { ...existing, matchingPairs: pairs } };
      }
      return prev;
    });
  };

  // Check answer for instant feedback
  const checkAnswer = async (questionId) => {
    if (feedback[questionId]?.checked || checkingAnswer) return;
    const answer = answers[questionId];
    if (!answer) return;

    setCheckingAnswer(true);
    try {
      const res = await api.post(`/tests/${test._id}/check-answer`, {
        questionId,
        selectedOptions: answer.selectedOptions,
        textAnswer: answer.textAnswer,
        matchingPairs: answer.matchingPairs,
        language: testLang || ''
      });
      setFeedback(prev => ({
        ...prev,
        [questionId]: { ...res.data, checked: true }
      }));
    } catch (err) {
      toast.error(t('errorCheckingAnswer'));
    } finally {
      setCheckingAnswer(false);
    }
  };

  // Auto-check on answer for single-choice/true-false in instant feedback mode
  useEffect(() => {
    if (!test?.settings?.instantFeedback) return;
    const q = test.questions[currentQ];
    if (!q) return;
    const answer = answers[q.id];
    if (!answer || feedback[q.id]?.checked) return;

    if ((q.type === 'single-choice' || q.type === 'true-false') && answer.selectedOptions?.length > 0) {
      checkAnswer(q.id);
    }
  }, [answers, currentQ, test, feedback]);

  const createSubmissionPayload = useCallback((sourceState) => {
    const current = sourceState || runtimeRef.current;
    const currentTest = current?.test;
    if (!currentTest) return null;

    const formattedAnswers = currentTest.questions.map(q => {
      const answer = current.answers?.[q.id] || { questionId: q.id, selectedOptions: [], textAnswer: '', matchingPairs: [] };
      return { ...answer, questionId: q.id };
    });

    return {
      testId: currentTest._id,
      answers: formattedAnswers,
      guestName: !user ? (current.guestName || '') : '',
      guestId: !user ? getGuestId() : '',
      isPractice,
      variantNumber: current.selectedVariant || 0,
      violations: current.violations || [],
      timeSpent: Math.max(0, Math.round(current.elapsedActiveSeconds || 0)),
      sessionId: current.sessionId || ensureSessionId()
    };
  }, [ensureSessionId, isPractice, user]);

  const submitResultRequest = useCallback(async ({ keepalive = false, sourceState = null } = {}) => {
    const payload = createSubmissionPayload(sourceState);
    if (!payload) return null;

    if (!keepalive) {
      const res = await api.post('/results', payload);
      return res.data;
    }

    const headers = {
      'Content-Type': 'application/json'
    };
    const token = localStorage.getItem('unitest_token');
    if (token) headers.Authorization = `Bearer ${token}`;

    const csrfToken = readCookie('csrf_token');
    if (csrfToken) headers['X-CSRF-Token'] = csrfToken;

    const response = await fetch('/api/results', {
      method: 'POST',
      credentials: 'include',
      keepalive: true,
      headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error('submit_failed');
    }

    return response.json();
  }, [createSubmissionPayload]);

  const expireSavedSession = useCallback(async (savedSession, currentTest) => {
    if (!savedSession?.started || !currentTest || isPractice) return false;

    try {
      await submitResultRequest({
        sourceState: {
          ...savedSession,
          test: currentTest
        }
      });
      await refreshAttemptInfo(currentTest);
      clearSavedSession();
      toast.error(t('savedSessionExpired'));
      return true;
    } catch (_) {
      clearSavedSession();
      toast.error(t('savedSessionExpired'));
      await refreshAttemptInfo(currentTest);
      return false;
    }
  }, [clearSavedSession, isPractice, refreshAttemptInfo, submitResultRequest, t]);

  useEffect(() => {
    if (!test || isPractice || restoredSessionRef.current) return;
    const restored = readSavedSession(shareLink);
    if (!restored || restored.testId !== test._id || !restored.started) return;

    restoredSessionRef.current = true;

    if (restored.resumeBlocked) {
      clearSavedSession();
      toast.error(t('savedSessionClosed'));
      return;
    }

    if (isSavedSessionExpired(restored)) {
      expireSavedSession(restored, test);
      return;
    }

    setAnswers(restored.answers || {});
    setCurrentQ(restored.currentQ || 0);
    setViolations(restored.violations || []);
    setGuestName(restored.guestName || '');
    setTimeLeft(typeof restored.timeLeft === 'number' ? restored.timeLeft : null);
    setSelectedVariant(restored.selectedVariant || null);
    setElapsedActiveSeconds(restored.elapsedActiveSeconds || 0);
    setSessionId(restored.sessionId || createSessionId());
    setTestLang(restored.testLang || null);
    setSessionPaused(false);
    runtimeRef.current.started = true;
    runtimeRef.current.sessionPaused = false;
    leaveGuardRef.current = false;
    setStarted(true);
    setShowGuestForm(false);
    resetActivity();
    toast.success(t('savedSessionRestored'));
  }, [test, isPractice, shareLink, clearSavedSession, expireSavedSession, resetActivity, t]);

  const finishSessionOnLeave = useCallback(async ({ keepalive = false } = {}) => {
    if (!runtimeRef.current.started || isPractice || hardExitInFlightRef.current) return null;

    hardExitInFlightRef.current = true;
    leaveGuardRef.current = true;
    runtimeRef.current.sessionPaused = true;
    setSessionPaused(true);
    setSubmitting(true);
    persistSessionSnapshot({
      sessionPaused: true,
      resumeBlocked: true,
      blockedReason: 'finishOnLeave'
    });

    try {
      const result = await submitResultRequest({ keepalive });
      clearSavedSession();
      if (result?._id) {
        navigate(`/result/${result._id}`);
      }
      return result;
    } catch (err) {
      if (!keepalive) {
        leaveGuardRef.current = false;
        hardExitInFlightRef.current = false;
        setSubmitting(false);
        toast.error(t('errorSubmitting'));
      }
      return null;
    }
  }, [clearSavedSession, isPractice, navigate, persistSessionSnapshot, submitResultRequest, t]);

  const handleSubmit = useCallback(async (force = false) => {
    if (!force) {
      dialogOpenRef.current = true;
      setShowSubmitConfirm(true);
      return;
    }

    setSubmitting(true);
    leaveGuardRef.current = true;

    try {
      const result = await submitResultRequest();
      clearSavedSession();
      if (isPractice) {
        toast.success(practiceSavedToast[lang] || practiceSavedToast.en);
      }
      navigate(`/result/${result._id}`);
    } catch (err) {
      leaveGuardRef.current = false;
      toast.error(t('errorSubmitting'));
    } finally {
      setSubmitting(false);
    }
  }, [clearSavedSession, isPractice, lang, navigate, submitResultRequest, t]);

  useEffect(() => {
    forceSubmitRef.current = () => handleSubmit(true);
  }, [handleSubmit]);

  useEffect(() => {
    if (!started || isPractice) return;

    const guardState = { unitestGuard: true, shareLink, ts: Date.now() };
    if (finishOnLeaveEnabled) {
      window.history.pushState(guardState, '', window.location.href);
    }

    const handleVisibilityChange = () => {
      if (leaveGuardRef.current || submittingRef.current) return;

      if (document.hidden) {
        pauseActiveSession();
        if (finishOnLeaveEnabled) {
          finishSessionOnLeave({ keepalive: true });
        } else if (shouldRecordLeaveWarning) {
          recordLeaveViolation(t('leaveWarningRecorded'));
        }
        return;
      }

      if (!finishOnLeaveEnabled) {
        resumeActiveSession();
      }
    };

    const handlePageHide = () => {
      if (leaveGuardRef.current || submittingRef.current) return;
      pauseActiveSession();
      if (finishOnLeaveEnabled) {
        finishSessionOnLeave({ keepalive: true });
      } else {
        persistSessionSnapshot({ sessionPaused: true });
      }
    };

    const handlePopState = () => {
      if (leaveGuardRef.current || submittingRef.current) return;

      pauseActiveSession();

      if (finishOnLeaveEnabled) {
        window.history.pushState(guardState, '', window.location.href);
        finishSessionOnLeave();
        return;
      }

      if (shouldRecordLeaveWarning) {
        recordLeaveViolation(t('leaveWarningRecorded'));
      } else {
        persistSessionSnapshot({ sessionPaused: true });
      }
    };

    const handleBeforeUnload = () => {
      if (leaveGuardRef.current || submittingRef.current) return;
      pauseActiveSession();
      if (finishOnLeaveEnabled) {
        finishSessionOnLeave({ keepalive: true });
      } else {
        persistSessionSnapshot({ sessionPaused: true });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [
    started,
    isPractice,
    shareLink,
    blockTabSwitchEnabled,
    finishOnLeaveEnabled,
    warnOnLeaveEnabled,
    shouldRecordLeaveWarning,
    finishSessionOnLeave,
    pauseActiveSession,
    persistSessionSnapshot,
    recordLeaveViolation,
    resumeActiveSession,
    t
  ]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isInstantFeedback = test?.settings?.instantFeedback;
  const answeredCount = test ? test.questions.filter(q => !!answers[q.id]).length : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="w-10 h-10 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!test && deadlineError) {
    const isNotStarted = deadlineError.code === 'NOT_STARTED';
    const dateStr = isNotStarted
      ? new Date(deadlineError.startDate).toLocaleString()
      : new Date(deadlineError.endDate).toLocaleString();
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface p-4 lg:items-start lg:pt-10">
        
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
          className="max-w-sm w-full glass-card p-8 text-center">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg
            ${isNotStarted ? 'bg-amber-500 shadow-amber-500/30' : 'bg-red-500 shadow-red-500/30'}`}>
            <Clock className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-dark mb-2">
            {isNotStarted ? (t('testNotAvailableYet') || 'Test is not available yet') : (t('testFinished') || 'Test is finished')}
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            {isNotStarted
              ? (t('testOpensAt', { date: dateStr }) || `The test opens at: ${dateStr}`)
              : (t('testWasAvailableUntil', { date: dateStr }) || `The test was available until: ${dateStr}`)
            }
          </p>
          <button onClick={() => navigate('/')} className="chunky-btn-primary w-full py-3 text-sm">
            {t('back') || 'Назад'}
          </button>
        </motion.div>
      </div>
    );
  }

  if (!test) return null;

  const question = test.questions[currentQ];
  const progress = ((currentQ + 1) / test.questions.length) * 100;
  const currentAnswer = answers[question?.id];
  const currentFeedback = feedback[question?.id];

  // Helper: get translated text for simple fields (questionText, passage, explanation)
  const getTransField = (field, fallback) => {
    if (testLang && question?.translations) {
      const t = question.translations instanceof Map
        ? question.translations.get(testLang)
        : question.translations?.[testLang];
      if (t?.[field]) return t[field];
    }
    return fallback;
  };

  // Helper: get translated option text
  const getOptText = (opt, optIndex) => {
    if (testLang && question?.translations) {
      const t = question.translations instanceof Map
        ? question.translations.get(testLang)
        : question.translations?.[testLang];
      if (t?.options?.[optIndex]) return t.options[optIndex];
    }
    return opt.text;
  };

  const getMatchingPairText = (originalText, rightIndex = -1) => {
    if (testLang && Array.isArray(question?.matchingRightSideTranslations?.[testLang])) {
      if (rightIndex >= 0 && question.matchingRightSideTranslations[testLang][rightIndex]) {
        return question.matchingRightSideTranslations[testLang][rightIndex];
      }

      const fallbackIndex = question.matchingRightSide?.findIndex(value => value === originalText) ?? -1;
      if (fallbackIndex >= 0 && question.matchingRightSideTranslations[testLang][fallbackIndex]) {
        return question.matchingRightSideTranslations[testLang][fallbackIndex];
      }
    }

    return originalText;
  };

  // Helper for option feedback styling
  const getOptionFeedbackClass = (optId) => {
    if (!currentFeedback?.checked) return '';
    const isSelected = currentAnswer?.selectedOptions?.includes(optId);
    const isCorrect = currentFeedback.correctOptionIds?.includes(optId);
    if (isCorrect) return 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-200 dark:ring-emerald-800';
    if (isSelected && !isCorrect) return 'border-red-500 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 ring-2 ring-red-200 dark:ring-red-800';
    return 'opacity-50';
  };

  const displayedQuestionHtml = toRichTextHtml(getTransField('questionText', question?.questionText || ''));
  const displayedPassageHtml = toRichTextHtml(getTransField('passage', question?.passage || ''));
  const displayedExplanationHtml = toRichTextHtml(getTransField('explanation', currentFeedback?.explanation || question?.explanation || ''));
  const hasDisplayedPassage = Boolean(stripHtml(displayedPassageHtml));
  const hasDisplayedExplanation = Boolean(stripHtml(displayedExplanationHtml));
  const handleContentLinkClick = (event) => {
    const link = event.target.closest('a');
    if (!link) return;
    event.preventDefault();
    if (blockTabSwitchEnabled) return;
    window.open(link.href, '_blank', 'noopener,noreferrer');
  };

  // Pre-start screen
  if (!started) {
    const creator = test.creator;
    const creatorName = creator
      ? `${creator.firstName || ''} ${creator.lastName || ''}`.trim() || creator.email || 'Автор'
      : null;
    const ratingValue = Number(test.rating || 0);
    const ratingCount = Number(test.ratingCount || 0);
    const attemptCount = Number(test.attemptCount || 0);
    const averageScore = Number(test.averageScore || 0);
    const startDisabled =
      (!isPractice && attemptInfo.maxAttempts > 0 && attemptInfo.attempts >= attemptInfo.maxAttempts) ||
      (test.settings?.variants?.enabled && !isPractice && !selectedVariant);

    const formatRelative = (date) => {
      if (!date) return '';
      const d = new Date(date);
      const diffMs = Date.now() - d.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      if (diffMin < 1) return 'только что';
      if (diffMin < 60) return `${diffMin} мин назад`;
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return `${diffHr} ч назад`;
      const diffDay = Math.floor(diffHr / 24);
      if (diffDay < 7) return `${diffDay} дн назад`;
      return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    };

    return (
      <div className="min-h-screen bg-surface px-3 py-6 sm:px-6 sm:py-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto w-full max-w-xl space-y-4 sm:space-y-5"
        >
          {/* Practice mode banner */}
          {isPractice && (
            <div
              className="flex items-center justify-center gap-2 rounded-2xl border-2 border-emerald-700 bg-emerald-50 px-4 py-2.5 text-emerald-700 dark:border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300"
              style={{ boxShadow: '0 3px 0 #065f46' }}
            >
              <Dumbbell size={15} strokeWidth={2.4} />
              <span className="text-xs font-black uppercase tracking-widest">{t('practiceMode')}</span>
            </div>
          )}

          {/* Cover */}
          <div
            className="overflow-hidden rounded-3xl border-2 border-slate-900 dark:border-white"
            style={{ boxShadow: '0 6px 0 var(--shadow-chunky, #e2e8f0)' }}
          >
            <TestCoverArtwork
              coverImage={test.coverImage}
              title={test.title}
              className="w-full"
              imageOverlayClassName="absolute inset-0 bg-gradient-to-t from-slate-950/30 via-transparent to-transparent"
              style={{ aspectRatio: '16 / 9' }}
            >
              {leaveMonitoringEnabled && (
                <div
                  className="absolute left-3 top-3 flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-slate-900 bg-red-500 text-white dark:border-white"
                  style={{ boxShadow: '0 3px 0 #7f1d1d' }}
                  title="Anti-cheat"
                >
                  <Shield size={18} strokeWidth={2.6} />
                </div>
              )}
              {ratingValue > 0 && (
                <div
                  className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border-2 border-slate-900 bg-amber-400 px-2.5 py-1 text-xs font-black text-slate-900 dark:border-white"
                  style={{ boxShadow: '0 3px 0 #78350f' }}
                >
                  <Star size={11} strokeWidth={2.8} className="fill-slate-900" />
                  {ratingValue.toFixed(1)}
                </div>
              )}
            </TestCoverArtwork>
          </div>

          {/* Title + description */}
          <div className="text-center">
            <h1 className="font-mono text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              {test.title}
            </h1>
            {test.description && (
              <p className="mt-1.5 text-sm font-medium text-slate-500 dark:text-slate-400">
                {test.description}
              </p>
            )}
          </div>

          {/* Author + social signals */}
          {(creator || ratingCount > 0 || attemptCount > 0) && (
            <div
              className="chunky-card flex items-center gap-3 p-3 sm:p-4"
            >
              {creator ? (
                <Link
                  to={`/user/${creator._id}`}
                  className="flex min-w-0 flex-1 items-center gap-2.5 transition active:translate-y-[1px]"
                >
                  <div
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-slate-900 bg-gradient-to-br from-primary-400 to-primary-600 text-sm font-black text-white dark:border-white"
                    style={{ boxShadow: '0 2px 0 #0f172a' }}
                  >
                    {creator.avatar ? (
                      <img src={creator.avatar} alt="" className="h-full w-full object-cover" />
                    ) : (
                      `${(creator.firstName?.[0] || 'U').toUpperCase()}${(creator.lastName?.[0] || '').toUpperCase()}`
                    )}
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Автор</p>
                    <p className="truncate text-sm font-black text-slate-900 dark:text-white">{creatorName}</p>
                  </div>
                  <ArrowRight size={14} strokeWidth={2.6} className="flex-shrink-0 text-slate-400" />
                </Link>
              ) : (
                <div className="min-w-0 flex-1" />
              )}
              {(attemptCount > 0 || averageScore > 0) && (
                <div className="flex flex-shrink-0 items-center gap-2 border-l-2 border-slate-200 pl-3 text-[11px] font-bold text-slate-600 dark:border-slate-700 dark:text-slate-300">
                  {attemptCount > 0 && (
                    <span className="inline-flex items-center gap-1" title="Прохождений">
                      <UsersIcon size={11} strokeWidth={2.6} /> {attemptCount}
                    </span>
                  )}
                  {averageScore > 0 && (
                    <span className="inline-flex items-center gap-1" title="Средний балл">
                      <BarChart3 size={11} strokeWidth={2.6} /> {averageScore}%
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Metric tiles */}
          <div className="grid grid-cols-2 gap-3 [&>*]:min-w-0 sm:grid-cols-4">
            <PreStartTile
              icon={FileText}
              label={t('questions')}
              value={test.questions.length}
              tone="primary"
            />
            {test.settings?.timeLimit > 0 ? (
              <PreStartTile
                icon={Clock}
                label={t('min')}
                value={test.settings.timeLimit}
                tone="amber"
              />
            ) : (
              <PreStartTile
                icon={Clock}
                label="Время"
                value="∞"
                tone="emerald"
              />
            )}
            {test.settings?.maxAttempts > 0 ? (
              <PreStartTile
                icon={RefreshCw}
                label={t('attempts')}
                value={`${attemptInfo.attempts}/${test.settings.maxAttempts}`}
                tone={attemptInfo.attempts >= test.settings.maxAttempts ? 'red' : 'blue'}
              />
            ) : (
              <PreStartTile
                icon={RefreshCw}
                label={t('attempts')}
                value="∞"
                tone="blue"
              />
            )}
            <PreStartTile
              icon={test.settings?.instantFeedback ? Check : Send}
              label="Режим"
              value={test.settings?.instantFeedback ? 'Мгновенный' : 'Обычный'}
              tone={test.settings?.instantFeedback ? 'emerald' : 'slate'}
              valueClassName="text-xs sm:text-sm"
            />
          </div>

          {/* Mode badges */}
          <div className="flex flex-wrap justify-center gap-2">
            {leaveMonitoringEnabled && (
              <span
                className="inline-flex items-center gap-1.5 rounded-full border-2 border-red-700 bg-red-50 px-3 py-1 text-[11px] font-black text-red-700 dark:border-red-300 dark:bg-red-900/30 dark:text-red-300"
                style={{ boxShadow: '0 2px 0 #7f1d1d' }}
              >
                <Shield size={11} strokeWidth={2.8} /> Anti-cheat
              </span>
            )}
            {test.settings?.instantFeedback && (
              <span
                className="inline-flex items-center gap-1.5 rounded-full border-2 border-primary-700 bg-primary-50 px-3 py-1 text-[11px] font-black text-primary-700 dark:border-primary-300 dark:bg-primary-900/30 dark:text-primary-300"
                style={{ boxShadow: '0 2px 0 #9a3412' }}
              >
                <Check size={11} strokeWidth={2.8} /> {t('instantFeedback')}
              </span>
            )}
            {test.settings?.variants?.enabled && (
              <span
                className="inline-flex items-center gap-1.5 rounded-full border-2 border-purple-700 bg-purple-50 px-3 py-1 text-[11px] font-black text-purple-700 dark:border-purple-300 dark:bg-purple-900/30 dark:text-purple-300"
                style={{ boxShadow: '0 2px 0 #581c87' }}
              >
                <Ticket size={11} strokeWidth={2.8} /> Билеты
              </span>
            )}
            {isPractice && (
              <span
                className="inline-flex items-center gap-1.5 rounded-full border-2 border-emerald-700 bg-emerald-50 px-3 py-1 text-[11px] font-black text-emerald-700 dark:border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300"
                style={{ boxShadow: '0 2px 0 #065f46' }}
              >
                <Dumbbell size={11} strokeWidth={2.8} /> Практика
              </span>
            )}
          </div>

          {/* Anti-cheat rules */}
          {leaveMonitoringEnabled && (
            <div
              className="rounded-3xl border-2 border-red-700 bg-red-50 p-4 text-left dark:border-red-300 dark:bg-red-900/20"
              style={{ boxShadow: '0 6px 0 #7f1d1d' }}
            >
              <h3 className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-red-700 dark:text-red-300">
                <Shield size={14} strokeWidth={2.6} /> {t('testRules')}
              </h3>
              <ul className="space-y-1.5 text-xs font-medium text-red-700 dark:text-red-200">
                {blockTabSwitchEnabled && (
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-600" />
                    {t('tabSwitchBlocked')}: {test.settings.antiCheat.maxViolations}
                  </li>
                )}
                {warnOnLeaveEnabled && (
                  <>
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-600" />
                      {t('ruleLeaveWarning')}
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-600" />
                      {t('ruleMaxViolations', { max: test.settings.antiCheat.maxViolations })}
                    </li>
                  </>
                )}
                {finishOnLeaveEnabled && (
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-600" />
                    {t('ruleLeaveEndsTest')}
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Instant feedback info */}
          {test.settings?.instantFeedback && (
            <div
              className="rounded-3xl border-2 border-primary-700 bg-primary-50 p-4 text-left dark:border-primary-300 dark:bg-primary-900/20"
              style={{ boxShadow: '0 6px 0 #9a3412' }}
            >
              <h3 className="mb-1 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-primary-700 dark:text-primary-300">
                <Check size={14} strokeWidth={2.6} /> {t('modeInstantFeedback')}
              </h3>
              <p className="text-xs font-medium text-primary-700 dark:text-primary-200">
                {t('instantFeedbackInfo')}
              </p>
            </div>
          )}

          {/* Practice mode info */}
          {isPractice && (
            <div
              className="rounded-3xl border-2 border-emerald-700 bg-emerald-50 p-4 text-left dark:border-emerald-300 dark:bg-emerald-900/20"
              style={{ boxShadow: '0 6px 0 #065f46' }}
            >
              <h3 className="mb-1 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
                <Dumbbell size={14} strokeWidth={2.6} /> {t('practiceMode')}
              </h3>
              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-200">
                {t('practiceModeDesc')}
              </p>
            </div>
          )}

          {/* Ticket / Variant picker */}
          {test.settings?.variants?.enabled && !isPractice && (
            <div
              className="rounded-3xl border-2 border-purple-700 bg-purple-50 p-4 dark:border-purple-300 dark:bg-purple-900/20"
              style={{ boxShadow: '0 6px 0 #581c87' }}
            >
              {selectedVariant ? (
                <div className="text-center">
                  <div
                    className="mx-auto mb-2 inline-flex items-center gap-2 rounded-2xl border-2 border-slate-900 bg-purple-600 px-4 py-2 text-base font-black text-white dark:border-white"
                    style={{ boxShadow: '0 3px 0 #581c87' }}
                  >
                    <Ticket size={18} strokeWidth={2.6} />
                    {t('ticketN', { n: selectedVariant })}
                  </div>
                  <p className="text-xs font-bold text-purple-700 dark:text-purple-300">{t('ticketReady')}</p>
                  {isPublicTest && (
                    <button
                      onClick={() => setSelectedVariant(null)}
                      className="mt-2 text-xs font-black text-purple-600 underline hover:text-purple-800 dark:text-purple-300"
                    >
                      {t('changeTicket') || 'Сменить билет'}
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <h3 className="mb-3 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest text-purple-700 dark:text-purple-300">
                    <Ticket size={14} strokeWidth={2.6} />
                    {t('chooseTicket')}
                  </h3>
                  <div className="grid grid-cols-5 gap-2 [&>*]:min-w-0">
                    {ticketState?.variants?.map((v) => {
                      const isDisabled = !isPublicTest && v.claimed;
                      return (
                        <motion.button
                          key={v.number}
                          whileHover={!isDisabled ? { scale: 1.06 } : {}}
                          whileTap={!isDisabled ? { scale: 0.94 } : {}}
                          onClick={() => !isDisabled && !ticketLoading && claimTicket(v.number)}
                          disabled={isDisabled || ticketLoading}
                          className={`relative flex aspect-square items-center justify-center rounded-xl border-2 text-sm font-black transition active:translate-y-[2px] disabled:cursor-not-allowed ${
                            isDisabled
                              ? 'border-red-700 bg-red-100 text-red-400 dark:border-red-300 dark:bg-red-900/30 dark:text-red-500'
                              : 'border-slate-900 bg-white text-purple-700 hover:bg-purple-100 dark:border-white dark:bg-slate-800 dark:text-purple-300 dark:hover:bg-purple-900/30'
                          }`}
                          style={{ boxShadow: isDisabled ? '0 2px 0 #7f1d1d' : '0 3px 0 #0f172a' }}
                        >
                          {v.number}
                          {isDisabled && (
                            <X size={20} className="absolute text-red-400/60" strokeWidth={3} />
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                  {ticketLoading && (
                    <div className="mt-3 inline-flex w-full items-center justify-center gap-2 text-xs font-bold text-purple-700 dark:text-purple-300">
                      <Loader2 size={13} className="animate-spin" />
                      {t('claimingTicket')}
                    </div>
                  )}
                  <p className="mt-3 text-center text-[11px] font-bold text-purple-600 dark:text-purple-300">
                    {isPublicTest
                      ? (t('ticketHintPublic') || 'Выберите любой билет.')
                      : t('ticketHint')
                    }
                  </p>
                </>
              )}
            </div>
          )}

          {/* Past attempts (только если есть) */}
          {pastAttempts.attempts.length > 0 && (
            <div className="chunky-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  <TrendingUp size={14} strokeWidth={2.6} className="text-emerald-500" />
                  Твои попытки
                </h3>
                {pastAttempts.best > 0 && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full border-2 border-amber-700 bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-700 dark:border-amber-300 dark:bg-amber-900/30 dark:text-amber-300"
                    style={{ boxShadow: '0 2px 0 #78350f' }}
                  >
                    <Trophy size={10} strokeWidth={2.8} /> Лучший: {pastAttempts.best}%
                  </span>
                )}
              </div>
              <div className="space-y-1.5">
                {pastAttempts.attempts.map((a) => {
                  const tone = a.percentage >= 75 ? 'emerald' : a.percentage >= 50 ? 'amber' : 'red';
                  const toneClasses = {
                    emerald: 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-300',
                    amber: 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-600 dark:bg-amber-900/20 dark:text-amber-300',
                    red: 'border-red-300 bg-red-50 text-red-700 dark:border-red-600 dark:bg-red-900/20 dark:text-red-300',
                  };
                  return (
                    <Link
                      key={a._id}
                      to={`/result/${a._id}`}
                      className={`flex items-center justify-between gap-2 rounded-xl border-2 px-3 py-2 text-sm font-bold transition active:translate-y-[1px] ${toneClasses[tone]}`}
                    >
                      <span className="font-mono text-base font-black">{a.percentage}%</span>
                      <span className="flex-1 text-right text-[11px] font-bold opacity-70">
                        {formatRelative(a.completedAt)}
                      </span>
                      <ChevronRightIcon size={14} strokeWidth={2.6} className="opacity-50" />
                    </Link>
                  );
                })}
                {pastAttempts.count > pastAttempts.attempts.length && (
                  <p className="pt-1 text-center text-[11px] font-bold text-slate-400">
                    + ещё {pastAttempts.count - pastAttempts.attempts.length}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Attempt limit exceeded */}
          {!isPractice && attemptInfo.maxAttempts > 0 && attemptInfo.attempts >= attemptInfo.maxAttempts && (
            <div
              className="rounded-3xl border-2 border-red-700 bg-red-50 p-4 text-center dark:border-red-300 dark:bg-red-900/20"
              style={{ boxShadow: '0 6px 0 #7f1d1d' }}
            >
              <p className="flex items-center justify-center gap-2 text-sm font-black text-red-700 dark:text-red-300">
                <X size={16} strokeWidth={2.6} />
                {t('allAttemptsUsed')} ({attemptInfo.maxAttempts})
              </p>
            </div>
          )}

          {/* Guest name form */}
          {showGuestForm && (
            <div className="chunky-card p-4">
              <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                {t('yourName')}
              </label>
              <input
                className="chunky-input"
                placeholder={t('enterFullName')}
                value={guestName}
                onChange={e => setGuestName(e.target.value)}
              />
            </div>
          )}

          {/* Start button */}
          <motion.button
            whileHover={!startDisabled ? { scale: 1.01 } : {}}
            whileTap={!startDisabled ? { scale: 0.98 } : {}}
            onClick={startTest}
            disabled={startDisabled}
            className="chunky-btn-primary w-full justify-center gap-2 py-4 text-base"
          >
            <Play size={18} strokeWidth={2.8} />
            {t('startTestBtn')}
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      

      <ConfirmDialog
        isOpen={showSubmitConfirm}
        onClose={() => {
          setShowSubmitConfirm(false);
          dialogOpenRef.current = false;
        }}
        onConfirm={() => {
          setShowSubmitConfirm(false);
          dialogOpenRef.current = false;
          handleSubmit(true);
        }}
        title={t('finishTestTitle')}
        message={t('finishTestMessage', { answered: answeredCount, total: test.questions.length })}
        confirmText={t('finishBtn')}
        cancelText={t('continueTest')}
        variant="warning"
      />

      {/* Inactivity warning modal */}
      <AnimatePresence>
        {showInactivityWarning && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center">
              <div className="w-14 h-14 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Clock className="w-7 h-7 text-amber-600" />
              </div>
              <h3 className="text-lg font-bold text-dark mb-2">{t('inactivityWarning') || 'Are you still there?'}</h3>
              <p className="text-sm text-gray-500 mb-1">{t('inactivityCountdownMsg', { seconds: inactivityCountdown }) || 'The test will be submitted automatically soon.'}</p>
              <p className="text-3xl font-mono font-bold text-amber-600 mb-5">{inactivityCountdown}s</p>
              <button onClick={resetActivity}
                className="chunky-btn-primary w-full py-3 text-sm">
                {t('imHere') || "I'm here!"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Chunky top bar ── */}
      <div className="sticky top-0 z-50 border-b-2 border-slate-200 bg-white/95 backdrop-blur-xl safe-area-top dark:border-slate-700 dark:bg-slate-900/95">
        <div className="mx-auto max-w-4xl px-3 py-2.5 sm:px-5 sm:py-3 lg:max-w-[1120px]">
          <div className="flex items-center justify-between gap-3">
            {/* Title + variant badge */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <h2 className="truncate text-xs font-black tracking-tight text-dark sm:text-sm">
                {test.title}
              </h2>
              {selectedVariant > 0 && (
                <span
                  className="flex-shrink-0 inline-flex items-center gap-1 rounded-xl border-2 border-purple-700 bg-purple-50 px-2 py-0.5 text-[10px] font-black text-purple-700 dark:border-purple-300 dark:bg-purple-900/30 dark:text-purple-300"
                  style={{ boxShadow: '0 2px 0 #581c87' }}
                >
                  <Ticket size={10} strokeWidth={2.6} />#{selectedVariant}
                </span>
              )}
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0">
              {violations.length > 0 && (
                <span
                  className="inline-flex items-center gap-1 rounded-xl border-2 border-red-700 bg-red-50 px-2 py-1 text-[10px] font-black text-red-700 dark:border-red-300 dark:bg-red-900/30 dark:text-red-300"
                  style={{ boxShadow: '0 2px 0 #7f1d1d' }}
                >
                  <AlertTriangle size={10} strokeWidth={2.6} /> {violations.length}
                </span>
              )}
              {timeLeft !== null && (
                <div
                  className={`inline-flex items-center gap-1.5 rounded-xl border-2 px-2.5 py-1 font-mono text-xs font-black sm:text-sm ${
                    timeLeft < 60
                      ? 'border-red-700 bg-red-50 text-red-700 animate-pulse dark:border-red-300 dark:bg-red-900/30 dark:text-red-300'
                      : 'border-slate-200 bg-gray-50 text-dark dark:border-slate-600 dark:bg-slate-800'
                  }`}
                  style={{ boxShadow: timeLeft < 60 ? '0 2px 0 #7f1d1d' : '0 2px 0 #e2e8f0' }}
                >
                  <Clock size={12} strokeWidth={2.6} />
                  {formatTime(timeLeft)}
                </div>
              )}
              <span
                className="inline-flex items-center rounded-xl border-2 border-slate-200 bg-gray-50 px-2.5 py-1 text-xs font-black text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
                style={{ boxShadow: '0 2px 0 #e2e8f0' }}
              >
                {currentQ + 1}/{test.questions.length}
              </span>
              <button
                onClick={() => handleSubmit()}
                disabled={submitting}
                className="hidden lg:inline-flex chunky-btn-success items-center gap-2 py-2 px-4 text-xs"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Send size={14} strokeWidth={2.6} />
                    <span>{t('finishTest')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
          {/* Progress bar — chunky */}
          <div className="mt-2.5 h-2 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden border border-gray-200 dark:border-slate-600">
            <motion.div
              className="h-full rounded-full"
              style={{
                background: 'linear-gradient(90deg, #f97316, #ea580c, #c2410c)',
                boxShadow: '0 0 8px rgba(249, 115, 22, 0.4)'
              }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      </div>

       {/* Question area */}
      <div className="mx-auto flex w-full flex-1 justify-center gap-5 px-3 py-3 pb-28 sm:px-4 sm:py-4 sm:pb-32 lg:max-w-[1120px] lg:py-5">
        {/* ── Desktop sidebar — compact grid ── */}
        <aside className="hidden lg:block w-[220px] flex-shrink-0">
          <div className="sticky top-[100px] flex max-h-[calc(100vh-116px)] flex-col chunky-card p-5">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">{t('navigation') || 'Навигация'}</h3>

            {/* Compact number grid */}
            <div className="grid grid-cols-5 gap-1.5 overflow-y-auto pb-3">
              {test.questions.map((q, i) => {
                const answered = !!answers[q.id];
                const fb = feedback[q.id];
                const isCurrent = i === currentQ;
                return (
                  <button
                    key={i}
                    onClick={() => setCurrentQ(i)}
                    className={`relative aspect-square rounded-xl border-2 text-xs font-black transition-all active:translate-y-[2px] ${
                      isCurrent
                        ? 'border-slate-900 bg-primary-500 text-white dark:border-white'
                        : fb?.checked
                          ? fb.isCorrect
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-700 dark:border-emerald-400 dark:bg-emerald-900/30 dark:text-emerald-300'
                            : 'border-red-600 bg-red-50 text-red-700 dark:border-red-400 dark:bg-red-900/30 dark:text-red-300'
                          : answered
                            ? 'border-primary-500 bg-primary-50 text-primary-700 dark:border-primary-400 dark:bg-primary-900/20 dark:text-primary-300'
                            : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-500 dark:hover:border-slate-500'
                    }`}
                    style={{
                      boxShadow: isCurrent
                        ? '0 3px 0 #9a3412'
                        : fb?.checked
                          ? fb.isCorrect ? '0 2px 0 #065f46' : '0 2px 0 #7f1d1d'
                          : '0 2px 0 #e2e8f0'
                    }}
                  >
                    {i + 1}
                    {fb?.checked && !isCurrent && (
                      <div className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 ${
                        fb.isCorrect ? 'bg-emerald-500' : 'bg-red-500'
                      }`} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Answered count */}
            <div className="mt-3 rounded-xl border-2 border-slate-200 bg-gray-50 p-3 text-center dark:border-slate-600 dark:bg-slate-800" style={{ boxShadow: '0 2px 0 #e2e8f0' }}>
              <p className="font-mono text-lg font-black text-dark">{answeredCount}<span className="text-gray-300 dark:text-gray-600">/{test.questions.length}</span></p>
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">{t('answered') || 'отвечено'}</p>
            </div>

            {/* Keyboard shortcuts */}
            <div className="flex flex-col gap-1.5 pt-3 mt-auto border-t-2 border-slate-100 dark:border-slate-700">
              <span className="text-[10px] text-gray-400 flex items-center justify-between"><kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-slate-700 rounded-lg text-[9px] font-mono font-black border border-gray-200 dark:border-slate-600">1-9</kbd> {t('selectOption') || 'выбрать'}</span>
              <span className="text-[10px] text-gray-400 flex items-center justify-between"><kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-slate-700 rounded-lg text-[9px] font-mono font-black border border-gray-200 dark:border-slate-600">← →</kbd> {t('navigation') || 'навигация'}</span>
              <span className="text-[10px] text-gray-400 flex items-center justify-between"><kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-slate-700 rounded-lg text-[9px] font-mono font-black border border-gray-200 dark:border-slate-600">Enter</kbd> {t('next') || 'далее'}</span>
            </div>
          </div>
        </aside>

        <main className="flex-1 min-w-0 max-w-[760px] w-full mx-auto lg:mx-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQ}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25 }}
            className="chunky-card p-4 sm:p-6 md:p-8"
          >
            {/* Question header — chunky */}
            <div className="flex items-center gap-2 mb-4 sm:mb-5 flex-wrap">
              <span
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border-2 border-slate-900 bg-primary-500 text-sm font-black text-white dark:border-white"
                style={{ boxShadow: '0 3px 0 #9a3412' }}
              >
                {currentQ + 1}
              </span>
              <span
                className="inline-flex items-center gap-1 rounded-xl border-2 border-amber-600 bg-amber-50 px-2.5 py-1 text-[10px] font-black text-amber-700 dark:border-amber-300 dark:bg-amber-900/30 dark:text-amber-300"
                style={{ boxShadow: '0 2px 0 #92400e' }}
              >
                <Star size={10} strokeWidth={2.8} className="fill-amber-500 text-amber-500" />
                {question.points} {question.points === 1 ? t('point') : t('points')}
              </span>
              {question.type === 'multiple-choice' && (
                <span
                  className="inline-flex items-center rounded-xl border-2 border-purple-600 bg-purple-50 px-2.5 py-1 text-[10px] font-black text-purple-700 dark:border-purple-300 dark:bg-purple-900/30 dark:text-purple-300"
                  style={{ boxShadow: '0 2px 0 #581c87' }}
                >
                  {t('multipleChoice')}
                </span>
              )}
              {currentFeedback?.checked && (
                <span
                  className={`ml-auto inline-flex items-center gap-1 rounded-xl border-2 px-2.5 py-1 text-[10px] font-black ${currentFeedback.isCorrect
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-700 dark:border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300'
                      : 'border-red-600 bg-red-50 text-red-700 dark:border-red-300 dark:bg-red-900/30 dark:text-red-300'
                    }`}
                  style={{ boxShadow: currentFeedback.isCorrect ? '0 2px 0 #065f46' : '0 2px 0 #7f1d1d' }}
                >
                  {currentFeedback.isCorrect ? <Check size={12} strokeWidth={2.8} /> : <X size={12} strokeWidth={2.8} />}
                  {currentFeedback.isCorrect ? t('correct') : t('incorrect')}
                </span>
              )}
            </div>

            {/* Multilingual language switcher */}
            {test.settings?.multiLanguage?.enabled && test.settings?.multiLanguage?.languages?.length > 0 && (
              <div className="flex items-center gap-1.5 mb-3">
                <Globe size={12} className="text-gray-400" />
                <button
                  onClick={() => setTestLang(null)}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${!testLang ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  {t('original') || 'Original'}
                </button>
                {test.settings.multiLanguage.languages.map(code => {
                  const labels = { en: 'EN', ru: 'RU', kz: 'KZ', es: 'ES' };
                  return (
                    <button
                      key={code}
                      onClick={() => setTestLang(code)}
                      className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${testLang === code ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      {labels[code] || code}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Passage / Reading text */}
            {hasDisplayedPassage && (
              <div className="mb-4 sm:mb-5 p-3 sm:p-4 bg-amber-50/70 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl">
                <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-1.5">
                  <span className="w-4 h-4 bg-amber-500 rounded flex items-center justify-center text-white text-[8px]">T</span>
                  {t('passageLabel') || 'Text'}
                </p>
                <div
                  className="prose prose-sm max-w-none text-sm text-gray-700 dark:prose-invert dark:text-gray-300"
                  dangerouslySetInnerHTML={{ __html: displayedPassageHtml }}
                  onClick={handleContentLinkClick}
                />
              </div>
            )}

            {/* Question text */}
            <div
              className="text-base sm:text-lg font-semibold text-dark mb-4 sm:mb-6 leading-relaxed prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: displayedQuestionHtml }}
              onClick={handleContentLinkClick}
            />

            {/* Media */}
            {question.media?.url && (
              <div className="mb-4 sm:mb-6 rounded-xl overflow-hidden bg-gray-50 dark:bg-slate-700">
                {question.media.type === 'image' && (
                  <img src={question.media.url} alt="" className="w-full max-h-64 sm:max-h-96 object-contain" />
                )}
                {question.media.type === 'video' && (
                  <video controls playsInline preload="metadata" className="w-full max-h-64 sm:max-h-96">
                    <source src={question.media.url} />
                  </video>
                )}
                {question.media.type === 'audio' && (
                  <div className="p-4 sm:p-6">
                    <audio src={question.media.url} controls className="w-full" />
                  </div>
                )}
              </div>
            )}

            {/* Answer options — Single choice / True-false — chunky */}
            {(question.type === 'single-choice' || question.type === 'true-false') && (
              <div className="space-y-2.5 sm:space-y-3">
                {question.options.map((opt, optIdx) => {
                  const selected = currentAnswer?.selectedOptions?.includes(opt.id);
                  const fbClass = getOptionFeedbackClass(opt.id);
                  const isLocked = currentFeedback?.checked;
                  const isCorrectOpt = currentFeedback?.correctOptionIds?.includes(opt.id);
                  const letter = String.fromCharCode(65 + optIdx);
                  return (
                    <motion.button
                      key={opt.id}
                      whileTap={!isLocked ? { scale: 0.98 } : {}}
                      onClick={() => handleAnswer(question.id, 'single', opt.id)}
                      disabled={isLocked}
                      className={`w-full text-left p-3.5 sm:p-4 rounded-2xl border-2 transition-all duration-150 ${fbClass || (
                          selected
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                            : 'border-slate-200 dark:border-slate-600 hover:border-primary-300 dark:hover:border-primary-600 hover:bg-primary-50/30 dark:hover:bg-primary-900/10'
                        )
                        } ${isLocked ? 'cursor-default' : 'active:translate-y-[2px]'}`}
                      style={{
                        boxShadow: fbClass
                          ? isCorrectOpt ? '0 3px 0 #065f46' : selected ? '0 3px 0 #7f1d1d' : '0 2px 0 #e2e8f0'
                          : selected ? '0 3px 0 #9a3412' : '0 3px 0 #e2e8f0'
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl border-2 flex items-center justify-center text-sm font-black flex-shrink-0 transition-all ${
                          currentFeedback?.checked
                            ? isCorrectOpt
                              ? 'border-emerald-600 bg-emerald-500 text-white'
                              : selected ? 'border-red-600 bg-red-500 text-white' : 'border-slate-200 bg-gray-50 text-slate-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-500'
                            : selected ? 'border-primary-600 bg-primary-500 text-white' : 'border-slate-200 bg-gray-50 text-slate-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-400'
                        }`}>
                          {currentFeedback?.checked
                            ? isCorrectOpt ? <Check size={16} strokeWidth={3} /> : selected ? <X size={16} strokeWidth={3} /> : letter
                            : letter
                          }
                        </div>
                        <span className="font-bold text-sm flex-1 text-dark">{getOptText(opt, optIdx)}</span>
                        <kbd className={`hidden sm:inline px-1.5 py-0.5 rounded-lg text-[9px] font-mono font-black border ${
                          selected ? 'border-primary-300 bg-primary-100 text-primary-600 dark:border-primary-600 dark:bg-primary-900/30 dark:text-primary-300' : 'border-gray-200 bg-gray-50 text-gray-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-500'
                        }`}>{optIdx + 1}</kbd>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}

            {/* Multiple choice — chunky */}
            {question.type === 'multiple-choice' && (
              <div className="space-y-2.5 sm:space-y-3">
                {question.options.map((opt, optIdx) => {
                  const selected = currentAnswer?.selectedOptions?.includes(opt.id);
                  const fbClass = getOptionFeedbackClass(opt.id);
                  const isLocked = currentFeedback?.checked;
                  const isCorrectOpt = currentFeedback?.correctOptionIds?.includes(opt.id);
                  const letter = String.fromCharCode(65 + optIdx);
                  return (
                    <motion.button
                      key={opt.id}
                      whileTap={!isLocked ? { scale: 0.98 } : {}}
                      onClick={() => handleAnswer(question.id, 'multiple', opt.id)}
                      disabled={isLocked}
                      className={`w-full text-left p-3.5 sm:p-4 rounded-2xl border-2 transition-all duration-150 ${fbClass || (
                          selected
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                            : 'border-slate-200 dark:border-slate-600 hover:border-primary-300 dark:hover:border-primary-600 hover:bg-primary-50/30 dark:hover:bg-primary-900/10'
                        )
                        } ${isLocked ? 'cursor-default' : 'active:translate-y-[2px]'}`}
                      style={{
                        boxShadow: fbClass
                          ? isCorrectOpt ? '0 3px 0 #065f46' : selected ? '0 3px 0 #7f1d1d' : '0 2px 0 #e2e8f0'
                          : selected ? '0 3px 0 #9a3412' : '0 3px 0 #e2e8f0'
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl border-2 flex items-center justify-center text-sm font-black flex-shrink-0 transition-all ${
                          currentFeedback?.checked
                            ? isCorrectOpt
                              ? 'border-emerald-600 bg-emerald-500 text-white'
                              : selected ? 'border-red-600 bg-red-500 text-white' : 'border-slate-200 bg-gray-50 text-slate-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-500'
                            : selected ? 'border-primary-600 bg-primary-500 text-white' : 'border-slate-200 bg-gray-50 text-slate-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-400'
                        }`}>
                          {currentFeedback?.checked
                            ? isCorrectOpt ? <Check size={16} strokeWidth={3} /> : selected ? <X size={16} strokeWidth={3} /> : letter
                            : selected ? <Check size={14} strokeWidth={3} /> : letter
                          }
                        </div>
                        <span className="font-bold text-sm flex-1 text-dark">{getOptText(opt, optIdx)}</span>
                        <kbd className={`hidden sm:inline px-1.5 py-0.5 rounded-lg text-[9px] font-mono font-black border ${
                          selected ? 'border-primary-300 bg-primary-100 text-primary-600 dark:border-primary-600 dark:bg-primary-900/30 dark:text-primary-300' : 'border-gray-200 bg-gray-50 text-gray-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-500'
                        }`}>{optIdx + 1}</kbd>
                      </div>
                    </motion.button>
                  );
                })}
                {!currentFeedback?.checked && (
                  <>
                    <p className="text-[10px] sm:text-xs text-gray-400 mt-1">{t('multipleAnswersHint')}</p>
                    {isInstantFeedback && currentAnswer?.selectedOptions?.length > 0 && (
                      <motion.button
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => checkAnswer(question.id)}
                        disabled={checkingAnswer}
                        className="w-full mt-2 py-2.5 rounded-xl bg-primary-600 text-white font-medium text-sm hover:bg-primary-700 transition-colors disabled:opacity-50"
                      >
                        {checkingAnswer ? t('checking') : t('checkAnswer')}
                      </motion.button>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Essay */}
            {question.type === 'essay' && (
              <div>
                <textarea
                  className="input-field resize-none text-sm"
                  rows="5"
                  placeholder={t('writeYourAnswer')}
                  value={currentAnswer?.textAnswer || ''}
                  onChange={e => handleAnswer(question.id, 'text', e.target.value)}
                  style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
                  disabled={currentFeedback?.checked}
                />
                {isInstantFeedback && !currentFeedback?.checked && (
                  <p className="text-[10px] sm:text-xs text-gray-400 mt-1">{t('essayCheckedByTeacher')}</p>
                )}
              </div>
            )}

            {/* Fill blank */}
            {question.type === 'fill-blank' && (
              <div>
                <div className="flex gap-2">
                  <input
                    className="input-field text-base sm:text-lg flex-1"
                    placeholder={t('enterAnswer')}
                    value={currentAnswer?.textAnswer || ''}
                    onChange={e => handleAnswer(question.id, 'text', e.target.value)}
                    disabled={currentFeedback?.checked}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && isInstantFeedback && currentAnswer?.textAnswer?.trim()) {
                        checkAnswer(question.id);
                      }
                    }}
                  />
                  {isInstantFeedback && !currentFeedback?.checked && currentAnswer?.textAnswer?.trim() && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => checkAnswer(question.id)}
                      disabled={checkingAnswer}
                      className="px-4 rounded-xl bg-primary-600 text-white font-medium text-sm hover:bg-primary-700 transition-colors disabled:opacity-50 flex-shrink-0"
                    >
                      {checkingAnswer ? '...' : 'OK'}
                    </motion.button>
                  )}
                </div>
                {currentFeedback?.checked && !currentFeedback.isCorrect && currentFeedback.correctText && (
                  <motion.p
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2 text-sm text-emerald-600 dark:text-emerald-400 font-medium"
                  >
                    {t('correctAnswerIs')}: {currentFeedback.correctText}
                  </motion.p>
                )}
              </div>
            )}

            {/* Matching */}
            {question.type === 'matching' && (
              <div>
                <MatchingQuestion
                  question={question}
                  currentAnswer={currentAnswer}
                  getLeftText={getOptText}
                  getRightText={getMatchingPairText}
                  onAnswer={(pairs) => {
                    if (currentFeedback?.checked) return;
                    setAnswers(prev => ({
                      ...prev,
                      [question.id]: {
                        ...(prev[question.id] || { questionId: question.id, selectedOptions: [], textAnswer: '' }),
                        matchingPairs: pairs
                      }
                    }));
                  }}
                />
                {isInstantFeedback && !currentFeedback?.checked && currentAnswer?.matchingPairs?.length === question.options?.length && (
                  <motion.button
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => checkAnswer(question.id)}
                    disabled={checkingAnswer}
                    className="w-full mt-3 py-2.5 rounded-xl bg-primary-600 text-white font-medium text-sm hover:bg-primary-700 transition-colors disabled:opacity-50"
                  >
                    {checkingAnswer ? t('checking') : t('checkAnswer')}
                  </motion.button>
                )}
              </div>
            )}

            {/* Feedback explanation */}
            {currentFeedback?.checked && hasDisplayedExplanation && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-4 p-3 sm:p-4 rounded-xl bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800"
              >
                <p className="text-xs font-semibold text-primary-700 dark:text-primary-400 mb-1">{t('explanationLabel')}</p>
                <div
                  className="prose prose-sm max-w-none text-sm text-blue-600 dark:prose-invert dark:text-blue-300"
                  dangerouslySetInnerHTML={{ __html: displayedExplanationHtml }}
                />
              </motion.div>
            )}

            {/* Feedback result banner */}
            {currentFeedback?.checked && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className={`mt-4 p-3 rounded-xl flex items-center gap-3 ${currentFeedback.isCorrect
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                  }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${currentFeedback.isCorrect ? 'bg-emerald-500' : 'bg-red-500'
                  }`}>
                  {currentFeedback.isCorrect
                    ? <Check size={16} className="text-white" />
                    : <X size={16} className="text-white" />
                  }
                </div>
                <div>
                  <p className={`text-sm font-bold ${currentFeedback.isCorrect ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>
                    {currentFeedback.isCorrect ? t('correctBanner') : t('incorrectBanner')}
                  </p>
                  <p className={`text-xs ${currentFeedback.isCorrect ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      +{currentFeedback.isCorrect ? currentFeedback.points : (currentFeedback.partialPoints || 0)} {t('outOfPoints')} {currentFeedback.points} {t('points')}
                    {!currentFeedback.isCorrect && currentFeedback.partialPoints > 0 && (
                      <span className="ml-1 text-amber-600 dark:text-amber-400">({t('partialCreditLabel') || 'partial credit'})</span>
                    )}
                  </p>
                </div>
                {currentQ < test.questions.length - 1 && (
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setCurrentQ(prev => prev + 1)}
                    className="ml-auto px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 text-xs font-medium text-dark hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-1"
                  >
                    {t('next')} <ChevronRight size={12} />
                  </motion.button>
                )}
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
      </div>

      {/* ── Fixed bottom navigation — chunky ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t-2 border-slate-200 bg-white/95 backdrop-blur-xl safe-area-bottom lg:hidden dark:border-slate-700 dark:bg-slate-900/95">
        <div className="max-w-3xl mx-auto">
          {/* Scrollable question pills */}
          <div
            ref={navScrollRef}
            className="overflow-x-auto scrollbar-hide px-3 sm:px-4 pt-2.5 pb-1"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <div className="flex items-center gap-1.5 w-max mx-auto">
              {test.questions.map((q, i) => {
                const answered = !!answers[q.id];
                const fb = feedback[q.id];
                const isCurrent = i === currentQ;
                return (
                  <button
                    key={i}
                    onClick={() => setCurrentQ(i)}
                    className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl border-2 text-[11px] sm:text-xs font-black transition-all flex-shrink-0 relative active:translate-y-[1px] ${isCurrent
                        ? 'border-slate-900 bg-primary-500 text-white dark:border-white'
                        : fb?.checked
                          ? fb.isCorrect
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-700 dark:border-emerald-400 dark:bg-emerald-900/30 dark:text-emerald-300'
                            : 'border-red-600 bg-red-50 text-red-700 dark:border-red-400 dark:bg-red-900/30 dark:text-red-300'
                          : answered
                            ? 'border-primary-500 bg-primary-50 text-primary-700 dark:border-primary-400 dark:bg-primary-900/20 dark:text-primary-300'
                            : 'border-slate-200 bg-white text-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-500'
                      }`}
                    style={{ boxShadow: isCurrent ? '0 2px 0 #9a3412' : '0 1px 0 #e2e8f0' }}
                  >
                    {i + 1}
                    {fb?.checked && !isCurrent && (
                      <div className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-white dark:border-slate-900 ${fb.isCorrect ? 'bg-emerald-500' : 'bg-red-500'
                        }`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between px-3 sm:px-4 pb-2.5 pt-1.5 gap-2">
            <button
              onClick={() => setCurrentQ(prev => Math.max(0, prev - 1))}
              disabled={currentQ === 0}
              className="chunky-btn-ghost items-center gap-1 py-2 px-3 sm:px-4 text-sm disabled:opacity-30"
            >
              <ChevronLeft size={16} strokeWidth={2.6} />
              <span>{t('prev')}</span>
            </button>

            <div className="text-[10px] sm:text-xs font-black text-gray-400 text-center">
              {answeredCount}/{test.questions.length}
            </div>

            {currentQ < test.questions.length - 1 ? (
              <button
                onClick={() => setCurrentQ(prev => prev + 1)}
                className="chunky-btn-primary items-center gap-1 py-2 px-3 sm:px-4 text-sm"
              >
                <span>{t('next')}</span>
                <ChevronRight size={16} strokeWidth={2.6} />
              </button>
            ) : (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => handleSubmit()}
                disabled={submitting}
                className="chunky-btn-success items-center gap-1.5 py-2 px-3 sm:px-4 text-sm disabled:opacity-50"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <><Send size={14} strokeWidth={2.6} /> <span>{t('finishTest')}</span></>
                )}
              </motion.button>
            )}
          </div>
        </div>
      </div>

      {/* Full-screen violation warning overlay */}
      <AnimatePresence>
        {showViolationWarning && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xl">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="relative max-w-md w-full overflow-hidden rounded-[30px] border border-red-200/20 bg-white text-center shadow-[0_30px_100px_-40px_rgba(239,68,68,0.7)] dark:bg-slate-900">
              <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-br from-red-500/18 via-rose-500/10 to-transparent" />
              <div className="relative p-7 sm:p-8">
                <div className="mx-auto mb-5 flex h-[72px] w-[72px] items-center justify-center rounded-[22px] border border-red-200 bg-red-50 shadow-sm dark:border-red-900/40 dark:bg-red-950/40">
                  <AlertTriangle className="h-9 w-9 text-red-500" />
                </div>
                <span className="inline-flex items-center rounded-full bg-red-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-red-500 dark:bg-red-950/40 dark:text-red-300">
                  Anti-cheat
                </span>
                <h3 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">
                  {t('violation') || 'Нарушение правил!'}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-500 dark:text-slate-300">{lastViolationText}</p>
                <div className="mt-6 rounded-2xl border border-red-100 bg-red-50/70 px-4 py-4 dark:border-red-900/30 dark:bg-red-950/30">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-red-400 dark:text-red-300">Count</p>
                  <p className="mt-1 text-xl font-mono font-bold text-red-500 dark:text-red-300">
                    {t('violationCount', { current: violations.length, max: test?.settings?.antiCheat?.maxViolations || '---' })}
                  </p>
                </div>
                <button onClick={() => setShowViolationWarning(false)}
                  className="mt-6 w-full rounded-2xl bg-red-500 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-red-600">
                  {t('understood') || 'Понятно'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
