import { useEffect, useRef, useState } from 'react';
import { animate, motion, useReducedMotion } from 'framer-motion';

/**
 * AnimatedCounter — плавно отсчитывает число от 0 (или предыдущего значения)
 * до `value`. Используется в hero и stat-плитках дашборда, чтобы при
 * первом появлении и при обновлениях прогресса (XP, streak, level)
 * пользователь видел «оживший» счётчик, а не статичную цифру.
 *
 * Уважает prefers-reduced-motion: при включённом — рендерит финальное
 * значение мгновенно без анимации.
 *
 * Props:
 *   - value: number — целевое число.
 *   - duration: number (s) — длительность отсчёта (default 1.2).
 *   - format: (n: number) => string — формат финального текста (default Math.round + toLocaleString).
 *   - className: строка для span'а.
 */
export default function AnimatedCounter({
  value = 0,
  duration = 1.2,
  format,
  className,
}) {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(reduced ? value : 0);
  const prevRef = useRef(reduced ? value : 0);

  const fmt =
    format ||
    ((n) => Math.round(n).toLocaleString('ru-RU').replace(/\u00A0/g, ' '));

  useEffect(() => {
    if (reduced) {
      setDisplay(value);
      prevRef.current = value;
      return undefined;
    }
    const from = prevRef.current ?? 0;
    const to = Number(value) || 0;
    if (from === to) return undefined;

    const controls = animate(from, to, {
      duration,
      ease: 'easeOut',
      onUpdate: (v) => setDisplay(v),
    });
    prevRef.current = to;
    return () => controls.stop();
  }, [value, duration, reduced]);

  return (
    <motion.span
      className={className}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      {fmt(display)}
    </motion.span>
  );
}
