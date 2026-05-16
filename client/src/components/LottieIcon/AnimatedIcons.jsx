// Кастомные анимированные иконки на framer-motion + lucide-react.
//
// История: первая итерация фичи использовала Lottie с placeholder-JSON,
// которые на UI выглядели как «крутящиеся кружочки». Вместо подбора и
// лицензирования внешних Lottie-ассетов мы анимируем существующие
// `lucide-react` иконки через framer-motion (уже стоит в проекте).
// Получается ощутимо красивее, без +48 KB Lottie-рантайма и без вопросов
// по лицензиям.
//
// Каждая иконка — простой React-компонент со стандартными props:
//   - size (px)
//   - color (CSS-цвет, по умолчанию currentColor)
//   - playing (нужно ли играть; если false — иконка статична на первом кадре)
//   - loop (если true — повторяется бесконечно)
//   - className (на корневой motion.div)
//
// LottieIcon выбирает нужный компонент по `name` и пробрасывает props.

import { motion } from 'framer-motion';
import {
  Bell,
  Trophy,
  Loader2,
  Inbox,
  CheckCircle2,
  Flame,
} from 'lucide-react';

// Общий wrapper с правильным размером и aria-нейтральным окружением.
function MotionWrapper({ children, size, className, ...rest }) {
  return (
    <motion.span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        lineHeight: 0,
      }}
      {...rest}
    >
      {children}
    </motion.span>
  );
}

// ---------- Bell: качается влево-вправо, как настоящий колокольчик ----------
export function AnimatedBell({ size = 24, color, playing, loop, className }) {
  return (
    <MotionWrapper size={size} className={className}>
      <motion.span
        style={{ originY: 0.1, display: 'inline-block', lineHeight: 0 }}
        animate={
          playing
            ? { rotate: [0, -18, 14, -10, 6, -3, 0] }
            : { rotate: 0 }
        }
        transition={{
          duration: 0.9,
          ease: 'easeInOut',
          repeat: loop ? Infinity : 0,
          repeatDelay: loop ? 1.6 : 0,
        }}
      >
        <Bell size={size} color={color} strokeWidth={2.2} />
      </motion.span>
    </MotionWrapper>
  );
}

// ---------- Trophy: подскакивает + лёгкий wiggle ----------
export function AnimatedTrophy({ size = 24, color, playing, loop, className }) {
  return (
    <MotionWrapper size={size} className={className}>
      <motion.span
        style={{ display: 'inline-block', lineHeight: 0 }}
        animate={
          playing
            ? { y: [0, -6, 0, -3, 0], rotate: [0, -6, 6, -3, 0] }
            : { y: 0, rotate: 0 }
        }
        transition={{
          duration: 1.0,
          ease: 'easeInOut',
          repeat: loop ? Infinity : 0,
          repeatDelay: loop ? 1.4 : 0,
        }}
      >
        <Trophy
          size={size}
          color={color || '#f59e0b'}
          fill={color || '#fde68a'}
          strokeWidth={2}
        />
      </motion.span>
    </MotionWrapper>
  );
}

// ---------- Loader: плавное непрерывное вращение ----------
export function AnimatedLoader({ size = 48, color, playing, loop, className }) {
  // У лоадера loop по дефолту true (играет, пока виден).
  const shouldSpin = playing !== false; // playing=undefined тоже true
  return (
    <MotionWrapper size={size} className={className}>
      <motion.span
        style={{ display: 'inline-block', lineHeight: 0 }}
        animate={shouldSpin ? { rotate: 360 } : { rotate: 0 }}
        transition={{
          duration: 1.1,
          ease: 'linear',
          repeat: shouldSpin && loop !== false ? Infinity : 0,
        }}
      >
        <Loader2 size={size} color={color || '#7c3aed'} strokeWidth={2.4} />
      </motion.span>
    </MotionWrapper>
  );
}

// ---------- Empty: плавно покачивается вверх-вниз, лёгкий fade ----------
export function AnimatedEmpty({ size = 120, color, playing, loop, className }) {
  const shouldFloat = playing !== false;
  return (
    <MotionWrapper size={size} className={className}>
      <motion.span
        style={{ display: 'inline-block', lineHeight: 0 }}
        animate={
          shouldFloat
            ? { y: [0, -8, 0, -4, 0], opacity: [0.6, 1, 0.85, 1, 0.6] }
            : { y: 0, opacity: 1 }
        }
        transition={{
          duration: 3.2,
          ease: 'easeInOut',
          repeat: shouldFloat && loop !== false ? Infinity : 0,
        }}
      >
        <Inbox size={size} color={color || '#94a3b8'} strokeWidth={1.6} />
      </motion.span>
    </MotionWrapper>
  );
}

// ---------- TestSuccess: pop + galочка появляется штрихом ----------
export function AnimatedTestSuccess({
  size = 72,
  color,
  playing,
  loop,
  className,
}) {
  const stroke = color || '#10b981';

  return (
    <MotionWrapper size={size} className={className}>
      <motion.svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        initial={{ scale: 0.6, opacity: 0 }}
        animate={
          playing
            ? { scale: [0.6, 1.15, 1], opacity: [0, 1, 1] }
            : { scale: 1, opacity: 1 }
        }
        transition={{
          duration: 0.6,
          ease: 'easeOut',
          repeat: loop ? Infinity : 0,
          repeatDelay: loop ? 1.5 : 0,
        }}
        style={{ display: 'block' }}
      >
        {/* Внешний круг */}
        <motion.circle
          cx="50"
          cy="50"
          r="44"
          fill="none"
          stroke={stroke}
          strokeWidth="6"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0.6 }}
          animate={
            playing ? { pathLength: 1, opacity: 1 } : { pathLength: 1 }
          }
          transition={{
            duration: 0.55,
            ease: 'easeOut',
            repeat: loop ? Infinity : 0,
            repeatDelay: loop ? 1.5 : 0,
          }}
        />
        {/* Заливка фоном */}
        <motion.circle
          cx="50"
          cy="50"
          r="44"
          fill={stroke}
          opacity="0.12"
          initial={{ scale: 0 }}
          animate={playing ? { scale: 1 } : { scale: 1 }}
          transition={{
            duration: 0.4,
            delay: 0.1,
            ease: 'easeOut',
            repeat: loop ? Infinity : 0,
            repeatDelay: loop ? 1.5 : 0,
          }}
          style={{ transformOrigin: '50% 50%' }}
        />
        {/* Галочка штрихом */}
        <motion.path
          d="M30 52 L45 67 L72 38"
          fill="none"
          stroke={stroke}
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={playing ? { pathLength: 1 } : { pathLength: 1 }}
          transition={{
            duration: 0.45,
            delay: 0.25,
            ease: 'easeOut',
            repeat: loop ? Infinity : 0,
            repeatDelay: loop ? 1.5 : 0,
          }}
        />
      </motion.svg>
    </MotionWrapper>
  );
}

// ---------- ReactionFire: дрожит, как пламя, на hover ----------
export function AnimatedFire({ size = 24, color, playing, loop, className }) {
  return (
    <MotionWrapper size={size} className={className}>
      <motion.span
        style={{ display: 'inline-block', lineHeight: 0, originY: 1 }}
        animate={
          playing
            ? {
                scale: [1, 1.18, 0.95, 1.12, 1],
                rotate: [0, -4, 5, -3, 0],
                y: [0, -2, 1, -1, 0],
              }
            : { scale: 1, rotate: 0, y: 0 }
        }
        transition={{
          duration: 0.7,
          ease: 'easeInOut',
          repeat: loop || playing ? Infinity : 0,
          repeatDelay: 0,
        }}
      >
        <Flame
          size={size}
          color={color || '#f97316'}
          fill={color || '#fbbf24'}
          strokeWidth={2}
        />
      </motion.span>
    </MotionWrapper>
  );
}

// Static fallback (используется в том же компоненте `LottieIcon`, когда
// нужно отрендерить иконку без анимации — на всякий случай).
export const STATIC_ICONS = {
  bell: Bell,
  trophy: Trophy,
  loading: Loader2,
  empty: Inbox,
  testSuccess: CheckCircle2,
  reactionFire: Flame,
};

// Именованная карта name → анимированный компонент. LottieIcon диспетчит
// рендер по этой карте.
export const ANIMATED_ICONS = {
  bell: AnimatedBell,
  trophy: AnimatedTrophy,
  loading: AnimatedLoader,
  empty: AnimatedEmpty,
  testSuccess: AnimatedTestSuccess,
  reactionFire: AnimatedFire,
};
