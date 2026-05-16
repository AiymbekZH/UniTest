// LottieIcon — публичный анимированный компонент-иконка.
//
// Имя сохранено по историческим причинам (в первой итерации был настоящий
// Lottie-рантайм). Сейчас рендерит framer-motion + lucide-react анимации
// из ./AnimatedIcons.jsx — это даёт чистый визуал, нулевой дополнительный
// бандл (framer-motion и lucide-react уже стоят в проекте) и никаких
// плейсхолдер-«кружочков».
//
// Публичный API не менялся, чтобы существующие интеграции
// (NotificationBell, PublicAchievementsTab, LoadingIndicator, EmptyState,
// ResultPage, MessageBubble) работали как есть.
//
// Props:
//   - name             ('bell'|'trophy'|'loading'|'empty'|'testSuccess'|'reactionFire')
//   - size             px (default 24)
//   - className        прокидывается в корневой элемент
//   - loop             если true — анимация повторяется
//   - autoplay         если true — играет сразу после монтирования
//   - trigger          'autoplay' | 'hover' | 'click' | 'inView' (default 'autoplay')
//   - speed            (legacy, игнорируется в новой реализации)
//   - colorOverride    (legacy, игнорируется)
//   - ariaLabel        для a11y (role="img" + aria-label)
//   - onClick          обработчик клика
//   - fallbackIcon     legacy, см. ниже
//
// `prefers-reduced-motion: reduce` уважается через useReducedMotionLive:
// в этом режиме рендерится статичная lucide-иконка без motion-обёртки.

import React, { useEffect, useRef, useState } from 'react';
import { useReducedMotionLive } from './useReducedMotionLive';
import { useInView } from './useInView';
import { computeAria } from './computeAria';
import { ANIMATED_ICONS, STATIC_ICONS } from './AnimatedIcons';

const isDev =
  typeof import.meta !== 'undefined' &&
  import.meta.env &&
  import.meta.env.DEV;

function StaticIcon({ name, size, color, className, fallbackIcon }) {
  // Выбор статичной lucide-иконки: пользовательский `fallbackIcon` имеет
  // приоритет над дефолтом из STATIC_ICONS.
  const Icon = fallbackIcon || STATIC_ICONS[name];
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
      }}
    >
      {Icon ? <Icon size={size} color={color} /> : null}
    </span>
  );
}

export function LottieIcon(props) {
  const {
    name,
    size = 24,
    className,
    loop,
    autoplay,
    trigger = 'autoplay',
    ariaLabel,
    onClick,
    fallbackIcon,
    color,
  } = props;

  const reducedMotion = useReducedMotionLive();
  const containerRef = useRef(null);
  const inView = useInView(containerRef, { rootMargin: '0px' });

  const [hovered, setHovered] = useState(false);
  const [clickPlaying, setClickPlaying] = useState(false);
  const playedInViewOnceRef = useRef(false);

  // Когда вышли из viewport — сбрасываем «уже играл по inView», чтобы при
  // повторном входе анимация снова сыграла. Можно убрать, если не нужно.
  useEffect(() => {
    if (!inView) {
      playedInViewOnceRef.current = false;
    }
  }, [inView]);

  // Определяем, нужно ли «играть» прямо сейчас.
  let playing = false;
  if (inView) {
    if (trigger === 'autoplay') {
      playing = autoplay !== false; // default true
    } else if (trigger === 'hover') {
      playing = hovered;
    } else if (trigger === 'click') {
      playing = clickPlaying;
    } else if (trigger === 'inView') {
      // Сыграет один раз при первом входе в viewport, если loop !== true.
      if (!playedInViewOnceRef.current) {
        playedInViewOnceRef.current = true;
        playing = true;
      } else {
        playing = !!loop;
      }
    }
  }

  const aria = computeAria({ ariaLabel, trigger, onClick });

  const handleMouseEnter = trigger === 'hover' ? () => setHovered(true) : undefined;
  const handleMouseLeave = trigger === 'hover' ? () => setHovered(false) : undefined;

  const handleClick = (event) => {
    if (trigger === 'click') {
      // Перезапускаем анимацию на каждом клике.
      setClickPlaying(false);
      requestAnimationFrame(() => setClickPlaying(true));
    }
    if (typeof onClick === 'function') onClick(event);
  };

  // Reduce-motion: статичная иконка, никаких motion-эффектов.
  if (reducedMotion) {
    return (
      <span
        ref={containerRef}
        className={className}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: size,
          height: size,
        }}
        onClick={handleClick}
        {...aria}
      >
        <StaticIcon
          name={name}
          size={size}
          color={color}
          fallbackIcon={fallbackIcon}
        />
      </span>
    );
  }

  // Неизвестное имя → fallback на статичную иконку (если её знаем).
  const Animated = ANIMATED_ICONS[name];
  if (!Animated) {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.error('[LottieIcon] unknown name:', name);
    }
    return (
      <span
        ref={containerRef}
        className={className}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: size,
          height: size,
        }}
        onClick={handleClick}
        {...aria}
      >
        <StaticIcon
          name={name}
          size={size}
          color={color}
          fallbackIcon={fallbackIcon}
        />
      </span>
    );
  }

  return (
    <span
      ref={containerRef}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      {...aria}
    >
      <Animated
        size={size}
        color={color}
        playing={playing}
        loop={!!loop}
      />
    </span>
  );
}

// Module-scope cache — оставлен пустым для обратной совместимости с
// vitest.setup.js (он импортирует это имя для сброса между тестами).
export const __animationDataCache = new Map();
export function __clearAnimationDataCacheForTests() {
  __animationDataCache.clear();
}

export default LottieIcon;
