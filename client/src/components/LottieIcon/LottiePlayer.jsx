import { useEffect, useRef, useState } from 'react';
import { useLottieAnimation } from './useLottieAnimation';
import { useInView } from './useInView';
import { computeAria } from './computeAria';
import { markFailed } from './LottieErrorBoundary';

// LottiePlayer — внутренний lazy компонент.
//
// Контракт (см. design.md → "LottiePlayer (внутренний, ленивый)"):
//   - Получает уже разрешённый `animationData` от eager-обёртки `LottieIcon`.
//     Сама загрузка ассет-чанка живёт в `LottieIcon`, чтобы LottiePlayer
//     отвечал ровно за одно: запуск рантайма lottie-web на готовом JSON.
//   - Получает `name` исключительно для `markFailed(name)` при ошибке
//     валидации Lottie JSON (Req 7.3, 7.4).
//   - Получает `fallback` в общем API ради единообразия с `LottieIconProps`,
//     но не использует его сам — рендером fallback занимается
//     `LottieErrorBoundary` в родителе.
//
// Дефолты trigger/loop/autoplay (см. таблицу в design.md):
//   autoplay  → loop=false, autoplay=true
//   hover     → loop=false, autoplay=false
//   click     → loop=false, autoplay=false
//   inView    → loop=false, autoplay=false (старт по пересечению)
//
// State-machine триггеров (Req 1.7–1.9):
//   - autoplay : играет когда inView, пауза когда вне viewport (Req 11.1)
//   - inView   : играет один раз при первом входе в viewport
//   - hover    : играет пока hovered && inView, иначе pause на первом кадре
//   - click    : играет один проход на каждый клик; пауза когда вне viewport
//
// Off-screen pause универсален: любой триггер уходит в stop() при !inView
// (Req 11.1). Cleanup и destroy лежат на `useLottieAnimation` (Req 11.2).

/**
 * Минимальная санитарная проверка Lottie JSON — Req 7.3.
 * Проверяем только верхнеуровневые поля; глубокий парсинг доверен lottie-web.
 *
 * @param {unknown} data
 * @returns {boolean}
 */
function isValidLottie(data) {
  if (!data || typeof data !== 'object') return false;
  // `v` (версия Bodymovin) — может быть строкой "5.7.4" или числом.
  const vOk =
    typeof data.v === 'string' || typeof data.v === 'number';
  // `fr`, `w`, `h` — числовые поля; допускаем строки-числа на случай
  // экзотических экспортов, но `Number(x)` должен дать конечное число.
  const numericOk = (x) => {
    if (typeof x === 'number') return Number.isFinite(x);
    if (typeof x === 'string') {
      const n = Number(x);
      return Number.isFinite(n);
    }
    return false;
  };
  return (
    vOk &&
    numericOk(data.fr) &&
    numericOk(data.w) &&
    numericOk(data.h) &&
    Array.isArray(data.layers)
  );
}

/**
 * Резолвинг дефолтов props по триггеру.
 *
 * @param {string|undefined} trigger
 * @param {boolean|undefined} loopProp
 * @param {boolean|undefined} autoplayProp
 */
function resolveDefaults(trigger, loopProp, autoplayProp) {
  const t = trigger || 'autoplay';
  const loop = typeof loopProp === 'boolean' ? loopProp : false;
  const autoplay =
    typeof autoplayProp === 'boolean' ? autoplayProp : t === 'autoplay';
  return { trigger: t, loop, autoplay };
}

/**
 * @typedef {Object} LottiePlayerProps
 * @property {string} name
 * @property {object} animationData
 * @property {React.ComponentType<any>} [fallback]  Не используется напрямую,
 *   присутствует для согласованности API с LottieIconProps.
 * @property {number} [size]
 * @property {string} [className]
 * @property {boolean} [loop]
 * @property {boolean} [autoplay]
 * @property {'autoplay'|'hover'|'click'|'inView'} [trigger]
 * @property {number} [speed]
 * @property {Record<string,string>} [colorOverride]
 * @property {string} [ariaLabel]
 * @property {(event: any) => void} [onClick]
 */

/**
 * @param {LottiePlayerProps} props
 */
export function LottiePlayer(props) {
  const {
    name,
    animationData,
    size = 24,
    className,
    loop: loopProp,
    autoplay: autoplayProp,
    trigger: triggerProp,
    speed = 1,
    colorOverride,
    ariaLabel,
    onClick,
  } = props;

  // 1) Валидация JSON. Делается на каждом рендере, но дёшево (несколько
  //    typeof). При ошибке — markFailed + throw → ErrorBoundary поймает и
  //    отрисует fallback (Req 7.3, 7.4).
  if (!isValidLottie(animationData)) {
    markFailed(name);
    throw new Error(
      '[LottieIcon] invalid Lottie JSON for "' + String(name) + '"'
    );
  }

  const { trigger, loop, autoplay } = resolveDefaults(
    triggerProp,
    loopProp,
    autoplayProp
  );

  const containerRef = useRef(null);
  const inView = useInView(containerRef, { rootMargin: '0px' });

  // hover-триггер: одна булева переменная состояния.
  const [hovered, setHovered] = useState(false);
  // click-триггер: одноразовый флаг, сбрасываемый сразу после play(). Это
  // позволяет повторный клик заново «дёрнуть» play даже если предыдущий
  // проход не доиграл.
  const [clickPlaying, setClickPlaying] = useState(false);
  // inView-триггер: проигрываем ровно один раз при первом входе в viewport.
  // Используем ref, а не state, чтобы не вызывать перерендер при выставлении.
  const playedInViewOnceRef = useRef(false);

  const { play, stop, goToFirstFrame, isReady } = useLottieAnimation({
    container: containerRef,
    animationData,
    loop,
    autoplay,
    speed,
    colorOverride,
  });

  // 2) Универсальный state-machine эффект.
  //    Один useEffect, гейтящий все переходы по `isReady`. Любой выход
  //    из viewport → stop() (Req 11.1). Каждый триггер реализует свою
  //    подсемантику внутри.
  useEffect(() => {
    if (!isReady) return;

    if (!inView) {
      stop();
      return;
    }

    if (trigger === 'autoplay') {
      play();
      return;
    }

    if (trigger === 'inView') {
      if (!playedInViewOnceRef.current) {
        goToFirstFrame();
        play();
        playedInViewOnceRef.current = true;
      }
      return;
    }

    if (trigger === 'hover') {
      if (hovered) {
        play();
      } else {
        goToFirstFrame();
      }
      return;
    }

    if (trigger === 'click') {
      if (clickPlaying) {
        goToFirstFrame();
        play();
        // Сбрасываем флаг, иначе при следующем рендере (например, при
        // изменении inView) эффект повторно ре-триггернёт play().
        setClickPlaying(false);
      }
      return;
    }
  }, [
    isReady,
    inView,
    trigger,
    hovered,
    clickPlaying,
    play,
    stop,
    goToFirstFrame,
  ]);

  // 3) Обработчики DOM-событий.
  //    Hover-обработчики вешаем только при trigger="hover" (Req 1.8).
  //    Click-обработчик — всегда: пользовательский `onClick` должен
  //    сработать вне зависимости от `trigger`.
  const handleMouseEnter =
    trigger === 'hover' ? () => setHovered(true) : undefined;
  const handleMouseLeave =
    trigger === 'hover' ? () => setHovered(false) : undefined;

  const handleClick = (event) => {
    if (trigger === 'click') {
      setClickPlaying(true);
    }
    if (typeof onClick === 'function') onClick(event);
  };

  // 4) ARIA. computeAria сам решает: role="img" + aria-label, или
  //    aria-hidden, или role="button" + tabIndex + onKeyDown.
  const aria = computeAria({ ariaLabel, trigger, onClick });

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: size, height: size, display: 'inline-block' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      {...aria}
    />
  );
}

export default LottiePlayer;
