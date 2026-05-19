import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Crown, Sparkles, Trophy, Flame, CheckCircle2 } from 'lucide-react';

/**
 * CelebrationEngine — global "wow moment" overlay for the app.
 *
 * Renders a Dynamic-Island-style toast at the top of the screen + an optional
 * confetti burst. Other components dispatch celebrations via the
 * `useCelebration()` hook:
 *
 *   const celebrate = useCelebration();
 *   celebrate({ kind: 'levelUp', level: 6 });
 *   celebrate({ kind: 'perfect',  testTitle: 'Test name' });
 *   celebrate({ kind: 'badge',    badge: 'three_day_streak' });
 *   celebrate({ kind: 'sprint',   xp: 120 });
 *   celebrate({ kind: 'streak',   days: 7 });
 *
 * Multiple celebrations queue and play one after another so we never stack
 * three toasts on top of each other.
 *
 * Visual: chunky border + offset shadow, paper palette, no neon. Confetti
 * uses simple coloured squares falling from the top.
 *
 * `prefers-reduced-motion` disables confetti and shortens the toast.
 */

const CelebrationContext = createContext(() => {});

/** Public hook — call to trigger a celebration from anywhere. */
export function useCelebration() {
  return useContext(CelebrationContext);
}

const KIND_THEMES = {
  levelUp: {
    Icon: Crown,
    accent: '#7c3aed',         // violet-600
    accentBorder: '#4c1d95',   // violet-900
    accentSoft: '#ede9fe',     // violet-100
    confettiColors: ['#a78bfa', '#7c3aed', '#fcd34d', '#ffffff'],
    confettiCount: 70,
    duration: 4200
  },
  perfect: {
    Icon: Sparkles,
    accent: '#f59e0b',
    accentBorder: '#7c2d12',
    accentSoft: '#fef3c7',
    confettiColors: ['#fcd34d', '#f59e0b', '#a3e635', '#ffffff'],
    confettiCount: 90,
    duration: 4400
  },
  badge: {
    Icon: Trophy,
    accent: '#ea580c',
    accentBorder: '#7c2d12',
    accentSoft: '#ffedd5',
    confettiColors: ['#fb923c', '#f59e0b', '#a78bfa'],
    confettiCount: 50,
    duration: 4000
  },
  sprint: {
    Icon: CheckCircle2,
    accent: '#0284c7',
    accentBorder: '#0c4a6e',
    accentSoft: '#e0f2fe',
    confettiColors: ['#38bdf8', '#0284c7', '#a3e635'],
    confettiCount: 60,
    duration: 4000
  },
  streak: {
    Icon: Flame,
    accent: '#dc2626',
    accentBorder: '#7f1d1d',
    accentSoft: '#fee2e2',
    confettiColors: ['#fb923c', '#f97316', '#facc15'],
    confettiCount: 60,
    duration: 4000
  }
};

const BADGE_LABELS = {
  first_completion: 'Первое прохождение',
  three_day_streak: 'Серия 3 дня',
  ten_completed: '10 пройденных тестов',
  perfect_score: 'Идеальный результат',
  first_arena: 'Первая арена',
  arena_winner: 'Победа в арене',
  duel_winner: 'Победа в дуэли'
};

function buildToastContent(event) {
  switch (event.kind) {
    case 'levelUp':
      return {
        eyebrow: 'Новый уровень',
        title: `Уровень ${event.level || '?'}`,
        body: 'Отличная работа! Продолжай в том же темпе.'
      };
    case 'perfect':
      return {
        eyebrow: 'Идеальный результат',
        title: '100%',
        body: event.testTitle ? `Тест: ${event.testTitle}` : 'Все ответы верны.'
      };
    case 'badge':
      return {
        eyebrow: 'Новое достижение',
        title: BADGE_LABELS[event.badge] || event.badge,
        body: 'Бейдж разблокирован.'
      };
    case 'sprint':
      return {
        eyebrow: 'Спринт завершён',
        title: `+${event.xp || 0} XP`,
        body: 'Недельная цель выполнена.'
      };
    case 'streak':
      return {
        eyebrow: 'Серия',
        title: `${event.days || 0} дней подряд`,
        body: 'Не сбавляй темп.'
      };
    default:
      return { eyebrow: 'Событие', title: '', body: '' };
  }
}

function ConfettiBurst({ colors, count }) {
  const reduced = useReducedMotion();
  const pieces = useMemo(() => {
    if (reduced) return [];
    return Array.from({ length: count }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.3,
      duration: 1.6 + Math.random() * 1.6,
      size: 6 + Math.round(Math.random() * 8),
      rotate: Math.round(Math.random() * 720 - 360),
      color: colors[i % colors.length]
    }));
  }, [colors, count, reduced]);

  if (reduced) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          initial={{ y: '-8vh', x: 0, opacity: 1, rotate: 0 }}
          animate={{
            y: '110vh',
            x: [0, p.left % 2 === 0 ? 40 : -40, 0],
            rotate: p.rotate,
            opacity: [1, 1, 0]
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: [0.2, 0.6, 0.4, 1]
          }}
          style={{
            position: 'absolute',
            left: `${p.left}%`,
            top: 0,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: 2
          }}
        />
      ))}
    </div>
  );
}

function ToastIsland({ event, theme, onClose }) {
  const Icon = theme.Icon;
  const content = buildToastContent(event);

  return (
    <motion.div
      key={event.id}
      role="status"
      aria-live="polite"
      initial={{ y: -40, scale: 0.85, opacity: 0 }}
      animate={{ y: 0, scale: 1, opacity: 1 }}
      exit={{ y: -16, scale: 0.92, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 360, damping: 26 }}
      className="pointer-events-auto fixed left-1/2 top-4 z-[70] -translate-x-1/2"
    >
      <button
        type="button"
        onClick={onClose}
        className="flex items-center gap-3 rounded-full border-[3px] py-2.5 pl-2.5 pr-5"
        style={{
          backgroundColor: theme.accentSoft,
          borderColor: theme.accentBorder,
          boxShadow: `0 6px 0 ${theme.accentBorder}`,
          color: '#0f172a'
        }}
      >
        <span
          className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border-[3px]"
          style={{
            backgroundColor: '#fff',
            borderColor: theme.accentBorder,
            color: theme.accent
          }}
        >
          <Icon size={17} strokeWidth={2.6} />
        </span>
        <div className="text-left leading-tight">
          <p
            className="text-[10px] font-black uppercase tracking-[0.16em]"
            style={{ color: theme.accentBorder }}
          >
            {content.eyebrow}
          </p>
          <p className="mt-0.5 max-w-[220px] truncate text-sm font-black sm:max-w-[320px]">
            {content.title}
          </p>
          {content.body ? (
            <p className="max-w-[220px] truncate text-[11px] font-semibold text-slate-700/80 sm:max-w-[320px]">
              {content.body}
            </p>
          ) : null}
        </div>
      </button>
    </motion.div>
  );
}

export default function CelebrationProvider({ children }) {
  const [queue, setQueue] = useState([]);
  const [active, setActive] = useState(null);
  const idCounterRef = useRef(0);

  const enqueue = useCallback((event) => {
    if (!event || !event.kind) return;
    const id = ++idCounterRef.current;
    setQueue((prev) => [...prev, { id, ...event }]);
  }, []);

  // Pull next event from queue when nothing's playing.
  useEffect(() => {
    if (active || queue.length === 0) return;
    const [next, ...rest] = queue;
    setActive(next);
    setQueue(rest);
  }, [queue, active]);

  // Auto-dismiss after theme.duration.
  useEffect(() => {
    if (!active) return undefined;
    const theme = KIND_THEMES[active.kind] || KIND_THEMES.levelUp;
    const t = setTimeout(() => setActive(null), theme.duration);
    return () => clearTimeout(t);
  }, [active]);

  const handleClose = useCallback(() => setActive(null), []);

  const theme = active ? KIND_THEMES[active.kind] || KIND_THEMES.levelUp : null;

  return (
    <CelebrationContext.Provider value={enqueue}>
      {children}
      <AnimatePresence>
        {active && theme ? (
          <>
            <ConfettiBurst
              key={`confetti-${active.id}`}
              colors={theme.confettiColors}
              count={theme.confettiCount}
            />
            <ToastIsland event={active} theme={theme} onClose={handleClose} />
          </>
        ) : null}
      </AnimatePresence>
    </CelebrationContext.Provider>
  );
}
