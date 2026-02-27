import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, AlertTriangle, ChevronLeft, ChevronRight, Send,
  Image, Video, Music, Shield, User, Check, X, Eye, Ticket, Loader2
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import useAntiCheat from '../hooks/useAntiCheat';
import toast, { Toaster } from 'react-hot-toast';
import ConfirmDialog from '../components/ConfirmDialog';

// Matching question component with interactive drag-and-drop style matching
function MatchingQuestion({ question, currentAnswer, onAnswer }) {
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
    { bg: 'bg-indigo-50 dark:bg-indigo-900/20', border: 'border-indigo-400', text: 'text-indigo-600 dark:text-indigo-400', dot: 'bg-indigo-500' },
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
          Нажмите на элемент слева, затем на его пару справа. Совпавшие пары будут выделены одним цветом.
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
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Элементы</p>
          </div>
          {question.options.map(opt => {
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
                className={`w-full text-left p-3.5 rounded-xl border-2 text-sm font-medium transition-all relative overflow-hidden ${
                  matched && color
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
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    matched ? `${color?.dot || 'bg-emerald-500'} text-white` : isSelected ? 'bg-primary-500 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-500'
                  }`}>
                    {matched ? '✓' : (question.options.indexOf(opt) + 1)}
                  </div>
                  <span className="flex-1">{opt.text}</span>
                </div>
                {matched && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }} 
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-2 pt-2 border-t border-current/10 flex items-center gap-1.5"
                  >
                    <span className="text-xs opacity-70">→</span>
                    <span className="text-xs font-medium">{matched}</span>
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
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Пары</p>
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
                className={`w-full text-left p-3.5 rounded-xl border-2 text-sm font-medium transition-all relative overflow-hidden ${
                  used && color
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
                  <span className="flex-1">{text}</span>
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
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Ваши пары:</p>
          <div className="flex flex-wrap gap-1.5">
            {pairs.map((p, i) => {
              const leftText = question.options.find(o => o.id === p.left)?.text || p.left;
              const color = pairColors[i % pairColors.length];
              return (
                <span key={i} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${color.bg} ${color.text} border ${color.border}`}>
                  {leftText} → {p.right}
                </span>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default function TakeTest() {
  const { shareLink } = useParams();
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get('preview') === 'true';
  const isPractice = searchParams.get('practice') === 'true';
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();

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
  const startTimeRef = useRef(null);
  const dialogOpenRef = useRef(false);
  const navScrollRef = useRef(null);

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

  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (showInactivityWarning) {
      setShowInactivityWarning(false);
      setInactivityCountdown(60);
      if (countdownRef.current) clearInterval(countdownRef.current);
    }
  }, [showInactivityWarning]);

  useEffect(() => {
    if (!started || !test?.settings?.inactivityTimeout) return;
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
              handleSubmit(true);
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
  }, [started, test, showInactivityWarning, resetActivity]);

  // Anti-cheat
  const handleViolation = useCallback((violation, count) => {
    if (dialogOpenRef.current) return;
    setViolations(prev => [...prev, violation]);
    setLastViolationText(violation.details);
    setShowViolationWarning(true);
    if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);

    if (test?.settings?.antiCheat?.maxViolations && count >= test.settings.antiCheat.maxViolations) {
      setTimeout(() => {
        setShowViolationWarning(false);
        toast.error(t('violationLimitExceeded'), { duration: 5000 });
        handleSubmit(true);
      }, 1500);
    }
  }, [test]);

  useAntiCheat({
    enabled: started && test?.settings?.antiCheat?.blockTabSwitch,
    onViolation: handleViolation
  });

  useEffect(() => {
    fetchTest();
  }, [shareLink]);

  // Timer
  useEffect(() => {
    if (!started || !test?.settings?.timeLimit) return;
    const totalSeconds = test.settings.timeLimit * 60;
    setTimeLeft(totalSeconds);

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          toast.error(t('timeUp'));
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [started, test]);

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

  const fetchTest = async (variantNum) => {
    try {
      const url = variantNum
        ? `/tests/share/${shareLink}?variant=${variantNum}`
        : `/tests/share/${shareLink}`;
      const res = await api.get(url);
      setTest(res.data);

      // Check if test has variant system enabled
      if (res.data.settings?.variants?.enabled && !isPreview && !isPractice) {
        // Fetch ticket status
        try {
          const ticketRes = await api.get(`/tests/${res.data._id}/tickets`);
          setTicketState(ticketRes.data);
          if (ticketRes.data.myVariant) {
            setSelectedVariant(ticketRes.data.myVariant);
          }
        } catch (_) {}
      }

      if (!user) setShowGuestForm(true);
      try {
        const attRes = await api.get(`/results/my-attempts/${res.data._id}`);
        setAttemptInfo({ attempts: attRes.data.attempts, maxAttempts: res.data.settings?.maxAttempts || 0 });
      } catch (_) {}
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

  // Ticket polling: refresh every 2 seconds when ticket picker is open
  useEffect(() => {
    if (!test?.settings?.variants?.enabled || selectedVariant || started || isPreview || isPractice) return;
    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/tests/${test._id}/tickets`);
        setTicketState(res.data);
        if (res.data.myVariant) setSelectedVariant(res.data.myVariant);
      } catch (_) {}
    }, 2000);
    return () => clearInterval(interval);
  }, [test, selectedVariant, started, isPreview, isPractice]);

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
      toast.success(`🎫 Билет #${res.data.variantNumber} выбран!`);
    } catch (err) {
      if (err.response?.status === 409) {
        toast.error(err.response.data.message || 'Билет уже занят!');
        // Refresh tickets
        try {
          const ticketRes = await api.get(`/tests/${test._id}/tickets`);
          setTicketState(ticketRes.data);
        } catch (_) {}
      } else {
        toast.error('Ошибка при выборе билета');
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
    startTimeRef.current = Date.now();
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
        matchingPairs: answer.matchingPairs
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

  const handleSubmit = async (force = false) => {
    if (!force) {
      dialogOpenRef.current = true;
      setShowSubmitConfirm(true);
      return;
    }

    // Preview mode: don't save results, just navigate back
    if (isPreview) {
      toast.success(t('previewMode') || 'Превью завершен — результат не сохраняется');
      navigate(-1);
      return;
    }

    // Practice mode: don't save results, show score locally
    if (isPractice) {
      toast.success(t('practiceModeDesc') || 'Тренировка завершена — результат не сохраняется');
      navigate(`/test-profile/${shareLink}`);
      return;
    }

    setSubmitting(true);
    const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);

    try {
      const formattedAnswers = test.questions.map(q => {
        const a = answers[q.id] || { questionId: q.id, selectedOptions: [], textAnswer: '', matchingPairs: [] };
        return { ...a, questionId: q.id };
      });

      const res = await api.post('/results', {
        testId: test._id,
        answers: formattedAnswers,
        guestName: !user ? guestName : '',
        violations,
        timeSpent
      });

      navigate(`/result/${res.data._id}`);
    } catch (err) {
      toast.error(t('errorSubmitting'));
    } finally {
      setSubmitting(false);
    }
  };

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4">
        <Toaster position="top-right" />
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
          className="max-w-sm w-full glass-card p-8 text-center">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg
            ${isNotStarted ? 'bg-amber-500 shadow-amber-500/30' : 'bg-red-500 shadow-red-500/30'}`}>
            <Clock className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-dark mb-2">
            {isNotStarted ? 'Тест ещё не доступен' : 'Тест завершён'}
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            {isNotStarted
              ? `Тест откроется: ${dateStr}`
              : `Тест был доступен до: ${dateStr}`
            }
          </p>
          <button onClick={() => navigate('/')} className="btn-primary w-full py-3">
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

  // Helper for option feedback styling
  const getOptionFeedbackClass = (optId) => {
    if (!currentFeedback?.checked) return '';
    const isSelected = currentAnswer?.selectedOptions?.includes(optId);
    const isCorrect = currentFeedback.correctOptionIds?.includes(optId);
    if (isCorrect) return 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-200 dark:ring-emerald-800';
    if (isSelected && !isCorrect) return 'border-red-500 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 ring-2 ring-red-200 dark:ring-red-800';
    return 'opacity-50';
  };

  // Pre-start screen
  if (!started) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4">
        <Toaster position="top-right" />
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full glass-card p-8 text-center"
        >
          {/* Preview mode banner */}
          {isPreview && (
            <div className="flex items-center justify-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-2.5 mb-5 text-amber-700 dark:text-amber-400">
              <Eye size={15} />
              <span className="text-sm font-semibold">Режим превью — результаты не сохраняются</span>
            </div>
          )}
          <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary-600/30">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-dark mb-2">{test.title}</h1>
          {test.description && <p className="text-gray-500 text-sm mb-4">{test.description}</p>}

          <div className="flex flex-wrap justify-center gap-3 mb-6 text-sm">
            <span className="badge-info">{test.questions.length} {t('questions')}</span>
            {test.settings?.timeLimit > 0 && (
              <span className="badge-warning flex items-center gap-1">
                <Clock size={12} /> {test.settings.timeLimit} {t('min')}
              </span>
            )}
            {test.settings?.maxAttempts > 0 && (
              <span className="badge-info flex items-center gap-1">
                {t('attempts')}: {attemptInfo.attempts}/{test.settings.maxAttempts}
              </span>
            )}
            {test.settings?.antiCheat?.blockTabSwitch && (
              <span className="badge-danger flex items-center gap-1">
                <AlertTriangle size={12} /> Anti-cheat
              </span>
            )}
            {test.settings?.instantFeedback && (
              <span className="badge-info flex items-center gap-1">
                <Check size={12} /> {t('instantFeedback')}
              </span>
            )}
          </div>

          {/* Anti-cheat rules warning */}
          {test.settings?.antiCheat?.blockTabSwitch && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-4 text-left">
              <h3 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2 flex items-center gap-2">
                <Shield size={16} /> {t('testRules')}
              </h3>
              <ul className="text-xs text-red-600 dark:text-red-300 space-y-1.5">
                <li>-- {t('ruleNoLeave')}</li>
                <li>-- {t('ruleViolationsTracked')}</li>
                <li>-- {t('ruleMaxViolations', { max: test.settings.antiCheat.maxViolations })}</li>
              </ul>
            </div>
          )}

          {/* Instant feedback info */}
          {test.settings?.instantFeedback && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-4 text-left">
              <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-400 mb-1 flex items-center gap-2">
                <Check size={16} /> {t('modeInstantFeedback')}
              </h3>
              <p className="text-xs text-blue-600 dark:text-blue-300">
                {t('instantFeedbackInfo')}
              </p>
            </div>
          )}

          {/* Practice mode info */}
          {isPractice && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 mb-4 text-center">
              <h3 className="text-sm font-semibold text-green-700 dark:text-green-400 mb-1 flex items-center justify-center gap-2">
                🏋️ {t('practiceMode')}
              </h3>
              <p className="text-xs text-green-600 dark:text-green-300">
                {t('practiceModeDesc')}
              </p>
            </div>
          )}

          {/* Preview mode info */}
          {isPreview && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-4 text-center">
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                👁️ {t('previewMode')}
              </p>
            </div>
          )}

          {/* Ticket/Variant picker */}
          {test.settings?.variants?.enabled && !isPreview && !isPractice && (
            <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4 mb-4">
              {selectedVariant ? (
                <div className="text-center">
                  <div className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-lg mb-2">
                    <Ticket size={20} />
                    {t('ticketN', { n: selectedVariant })}
                  </div>
                  <p className="text-xs text-indigo-600 dark:text-indigo-400">{t('ticketReady')}</p>
                </div>
              ) : (
                <>
                  <h3 className="text-sm font-semibold text-indigo-700 dark:text-indigo-400 mb-3 flex items-center justify-center gap-2">
                    <Ticket size={16} />
                    {t('chooseTicket')}
                  </h3>
                  <div className="grid grid-cols-5 gap-2">
                    {ticketState?.variants?.map((v) => (
                      <motion.button
                        key={v.number}
                        whileHover={!v.claimed ? { scale: 1.1 } : {}}
                        whileTap={!v.claimed ? { scale: 0.95 } : {}}
                        onClick={() => !v.claimed && !ticketLoading && claimTicket(v.number)}
                        disabled={v.claimed || ticketLoading}
                        className={`relative aspect-square rounded-lg font-bold text-sm flex items-center justify-center transition-all ${
                          v.claimed
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-400 dark:text-red-500 cursor-not-allowed border border-red-200 dark:border-red-800'
                            : 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-800/50 cursor-pointer border border-indigo-200 dark:border-indigo-700 shadow-sm hover:shadow-md'
                        }`}
                      >
                        {v.number}
                        {v.claimed && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <X size={24} className="text-red-400/50" />
                          </div>
                        )}
                      </motion.button>
                    ))}
                  </div>
                  {ticketLoading && (
                    <div className="mt-3 text-center">
                      <div className="inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-sm">
                        <Loader2 size={14} className="animate-spin" />
                        {t('claimingTicket')}
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-3 text-center">
                    {t('ticketHint')}
                  </p>
                </>
              )}
            </div>
          )}

          {/* Attempt limit exceeded */}
          {!isPractice && !isPreview && attemptInfo.maxAttempts > 0 && attemptInfo.attempts >= attemptInfo.maxAttempts && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-4 text-center">
              <p className="text-sm font-semibold text-red-600">{t('allAttemptsUsed')} ({attemptInfo.maxAttempts})</p>
            </div>
          )}

          {/* Guest name form */}
          {showGuestForm && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 text-left">{t('yourName')}</label>
              <input className="input-field" placeholder={t('enterFullName')}
                value={guestName} onChange={e => setGuestName(e.target.value)} />
            </div>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={startTest}
            disabled={
              (!isPractice && !isPreview && attemptInfo.maxAttempts > 0 && attemptInfo.attempts >= attemptInfo.maxAttempts) ||
              (test.settings?.variants?.enabled && !isPreview && !isPractice && !selectedVariant)
            }
            className="btn-primary w-full text-lg py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('startTestBtn')}
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <Toaster position="top-right" />

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
              <h3 className="text-lg font-bold text-dark mb-2">\u0412\u044b \u0435\u0449\u0451 \u0437\u0434\u0435\u0441\u044c?</h3>
              <p className="text-sm text-gray-500 mb-1">\u0414\u043e\u043b\u0433\u043e\u0435 \u0431\u0435\u0437\u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435. \u0422\u0435\u0441\u0442 \u0431\u0443\u0434\u0435\u0442 \u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043d \u0447\u0435\u0440\u0435\u0437:</p>
              <p className="text-3xl font-mono font-bold text-amber-600 mb-5">{inactivityCountdown}s</p>
              <button onClick={resetActivity}
                className="w-full btn-primary py-3 text-sm">
                \u042f \u0437\u0434\u0435\u0441\u044c, \u043f\u0440\u043e\u0434\u043e\u043b\u0436\u0438\u0442\u044c \u0442\u0435\u0441\u0442
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Compact top bar */}
      <div className="sticky top-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-gray-100 dark:border-slate-700 safe-area-top">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-2 sm:py-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs sm:text-sm font-semibold text-dark truncate max-w-[40%] sm:max-w-none">
              {test.title}
              {selectedVariant > 0 && (
                <span className="ml-2 inline-flex items-center gap-1 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded text-[10px] font-bold">
                  <Ticket size={10} />#{selectedVariant}
                </span>
              )}
            </h2>
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              {violations.length > 0 && (
                <span className="badge-danger flex items-center gap-1 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5">
                  <AlertTriangle size={10} /> {violations.length}
                </span>
              )}
              {timeLeft !== null && (
                <span className={`flex items-center gap-1 text-xs sm:text-sm font-mono font-bold ${timeLeft < 60 ? 'text-red-600 animate-pulse' : 'text-dark'}`}>
                  <Clock size={12} className="sm:w-3.5 sm:h-3.5" />
                  {formatTime(timeLeft)}
                </span>
              )}
              <span className="text-xs text-gray-400 font-medium bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-md">
                {currentQ + 1}/{test.questions.length}
              </span>
            </div>
          </div>
          {/* Progress bar */}
          <div className="h-1 sm:h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden mt-2">
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #a855f7)' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      </div>

      {/* Question area - grows to fill available space */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-3 sm:px-4 py-4 sm:py-8 pb-28 sm:pb-32">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQ}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25 }}
            className="glass-card-solid p-4 sm:p-6 md:p-8"
          >
            {/* Question header */}
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <span className="w-7 h-7 sm:w-8 sm:h-8 bg-primary-100 dark:bg-primary-900/30 text-primary-600 rounded-lg flex items-center justify-center font-bold text-xs sm:text-sm">
                {currentQ + 1}
              </span>
              <span className="text-[10px] sm:text-xs text-gray-400 font-medium">
                {question.points} {question.points === 1 ? t('point') : t('points')}
              </span>
              {question.type === 'multiple-choice' && (
                <span className="text-[10px] sm:text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-md font-medium">
                  {t('multipleChoice')}
                </span>
              )}
              {currentFeedback?.checked && (
                <span className={`ml-auto text-[10px] sm:text-xs px-2 py-0.5 rounded-md font-bold ${
                  currentFeedback.isCorrect
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600'
                    : 'bg-red-100 dark:bg-red-900/30 text-red-600'
                }`}>
                  {currentFeedback.isCorrect ? t('correct') : t('incorrect')}
                </span>
              )}
            </div>

            {/* Passage / Reading text */}
            {question.passage && question.passage.trim() && (
              <div className="mb-4 sm:mb-5 p-3 sm:p-4 bg-amber-50/70 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl">
                <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-1.5">
                  <span className="w-4 h-4 bg-amber-500 rounded flex items-center justify-center text-white text-[8px]">T</span>
                  Текст
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{question.passage}</p>
              </div>
            )}

            {/* Question text */}
            <h3 className="text-base sm:text-lg font-semibold text-dark mb-4 sm:mb-6 leading-relaxed">
              {question.questionText}
            </h3>

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

            {/* Answer options — Single choice / True-false */}
            {(question.type === 'single-choice' || question.type === 'true-false') && (
              <div className="space-y-2 sm:space-y-3">
                {question.options.map(opt => {
                  const selected = currentAnswer?.selectedOptions?.includes(opt.id);
                  const fbClass = getOptionFeedbackClass(opt.id);
                  const isLocked = currentFeedback?.checked;
                  return (
                    <motion.button
                      key={opt.id}
                      whileTap={!isLocked ? { scale: 0.98 } : {}}
                      onClick={() => handleAnswer(question.id, 'single', opt.id)}
                      disabled={isLocked}
                      className={`w-full text-left p-3 sm:p-4 rounded-xl border-2 transition-all duration-200 ${
                        fbClass || (
                          selected
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                            : 'border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500 hover:bg-gray-50 dark:hover:bg-slate-700/50'
                        )
                      } ${isLocked ? 'cursor-default' : 'active:scale-[0.98]'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                          currentFeedback?.checked
                            ? currentFeedback.correctOptionIds?.includes(opt.id)
                              ? 'border-emerald-500 bg-emerald-500'
                              : selected ? 'border-red-500 bg-red-500' : 'border-gray-300 dark:border-slate-500'
                            : selected ? 'border-primary-500 bg-primary-500' : 'border-gray-300 dark:border-slate-500'
                        }`}>
                          {(selected || currentFeedback?.correctOptionIds?.includes(opt.id)) && (
                            <div className="w-2 h-2 bg-white rounded-full" />
                          )}
                        </div>
                        <span className="font-medium text-sm flex-1">{opt.text}</span>
                        {currentFeedback?.checked && currentFeedback.correctOptionIds?.includes(opt.id) && (
                          <Check size={16} className="text-emerald-500 flex-shrink-0" />
                        )}
                        {currentFeedback?.checked && selected && !currentFeedback.correctOptionIds?.includes(opt.id) && (
                          <X size={16} className="text-red-500 flex-shrink-0" />
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}

            {/* Multiple choice */}
            {question.type === 'multiple-choice' && (
              <div className="space-y-2 sm:space-y-3">
                {question.options.map(opt => {
                  const selected = currentAnswer?.selectedOptions?.includes(opt.id);
                  const fbClass = getOptionFeedbackClass(opt.id);
                  const isLocked = currentFeedback?.checked;
                  return (
                    <motion.button
                      key={opt.id}
                      whileTap={!isLocked ? { scale: 0.98 } : {}}
                      onClick={() => handleAnswer(question.id, 'multiple', opt.id)}
                      disabled={isLocked}
                      className={`w-full text-left p-3 sm:p-4 rounded-xl border-2 transition-all duration-200 ${
                        fbClass || (
                          selected
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                            : 'border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500 hover:bg-gray-50 dark:hover:bg-slate-700/50'
                        )
                      } ${isLocked ? 'cursor-default' : 'active:scale-[0.98]'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                          currentFeedback?.checked
                            ? currentFeedback.correctOptionIds?.includes(opt.id)
                              ? 'border-emerald-500 bg-emerald-500'
                              : selected ? 'border-red-500 bg-red-500' : 'border-gray-300 dark:border-slate-500'
                            : selected ? 'border-primary-500 bg-primary-500' : 'border-gray-300 dark:border-slate-500'
                        }`}>
                          {(selected || (currentFeedback?.checked && currentFeedback.correctOptionIds?.includes(opt.id))) && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span className="font-medium text-sm flex-1">{opt.text}</span>
                        {currentFeedback?.checked && currentFeedback.correctOptionIds?.includes(opt.id) && (
                          <Check size={16} className="text-emerald-500 flex-shrink-0" />
                        )}
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
            {currentFeedback?.checked && currentFeedback.explanation && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-4 p-3 sm:p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
              >
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1">{t('explanationLabel')}</p>
                <p className="text-sm text-blue-600 dark:text-blue-300">{currentFeedback.explanation}</p>
              </motion.div>
            )}

            {/* Feedback result banner */}
            {currentFeedback?.checked && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className={`mt-4 p-3 rounded-xl flex items-center gap-3 ${
                  currentFeedback.isCorrect
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  currentFeedback.isCorrect ? 'bg-emerald-500' : 'bg-red-500'
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
                    +{currentFeedback.isCorrect ? currentFeedback.points : 0} {t('outOfPoints')} {currentFeedback.points} {t('points')}
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

      {/* Fixed bottom navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-gray-200 dark:border-slate-700 safe-area-bottom">
        <div className="max-w-3xl mx-auto">
          {/* Scrollable question navigator */}
          <div
            ref={navScrollRef}
            className="overflow-x-auto scrollbar-hide px-3 sm:px-4 pt-2 pb-1"
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
                    className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg text-[11px] sm:text-xs font-semibold transition-all flex-shrink-0 relative ${
                      isCurrent
                        ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/30 scale-110'
                        : fb?.checked
                          ? fb.isCorrect
                            ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                          : answered
                            ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 border border-primary-200 dark:border-primary-800'
                            : 'bg-gray-100 dark:bg-slate-700 text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-600 border border-transparent'
                    }`}
                  >
                    {i + 1}
                    {fb?.checked && !isCurrent && (
                      <div className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-white dark:border-slate-900 ${
                        fb.isCorrect ? 'bg-emerald-500' : 'bg-red-500'
                      }`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between px-3 sm:px-4 pb-2 pt-1 gap-2">
            <button
              onClick={() => setCurrentQ(prev => Math.max(0, prev - 1))}
              disabled={currentQ === 0}
              className="flex items-center gap-1 px-3 sm:px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-30 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 active:scale-95"
            >
              <ChevronLeft size={16} />
              <span>{t('prev')}</span>
            </button>

            <div className="text-[10px] sm:text-xs text-gray-400 font-medium text-center">
              {answeredCount}/{test.questions.length} {t('answered')}
            </div>

            {currentQ < test.questions.length - 1 ? (
              <button
                onClick={() => setCurrentQ(prev => prev + 1)}
                className="flex items-center gap-1 px-3 sm:px-4 py-2 rounded-xl text-sm font-medium transition-all bg-primary-600 text-white hover:bg-primary-700 active:scale-95 shadow-sm"
              >
                <span>{t('next')}</span>
                <ChevronRight size={16} />
              </button>
            ) : (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => handleSubmit()}
                disabled={submitting}
                className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm shadow-emerald-600/20 disabled:opacity-50 transition-all"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <><Send size={14} /> <span>{t('finishTest')}</span></>
                )}
              </motion.button>
            )}
          </div>
        </div>
      </div>

      {/* Full-screen violation warning overlay */}
      <AnimatePresence>
        {showViolationWarning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-red-900/90 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.5 }}
              className="text-center p-8 max-w-md"
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: 2, duration: 0.4 }}
              >
                <AlertTriangle className="w-20 h-20 sm:w-24 sm:h-24 text-red-300 mx-auto mb-6" />
              </motion.div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">{t('violation')}</h2>
              <p className="text-red-200 text-base sm:text-lg mb-2">{lastViolationText}</p>
              <p className="text-red-300 text-sm mb-8">
                {t('violationCount', { current: violations.length, max: test?.settings?.antiCheat?.maxViolations || '---' })}
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowViolationWarning(false)}
                className="bg-white text-red-600 font-bold py-3 px-8 rounded-xl text-lg hover:bg-red-50 transition-colors shadow-xl"
              >
                {t('understood')}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
