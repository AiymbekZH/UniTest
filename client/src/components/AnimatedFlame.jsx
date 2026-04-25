import { Flame } from 'lucide-react';
import AnimatedIcon from './AnimatedIcon';

/**
 * Reusable animated flame icon. Intensity scales with streak value:
 *  - streak === 0: static flame
 *  - streak 1-3:   subtle flame-flicker
 *  - streak >= 4:  strong flame-flicker (faster + bigger amplitude)
 *
 * Respects prefers-reduced-motion via underlying AnimatedIcon.
 */
export default function AnimatedFlame({ streak = 0, size = 14, className = '' }) {
  const preset =
    streak >= 4 ? 'flame-flicker-strong'
    : streak >= 1 ? 'flame-flicker'
    : null;

  if (!preset) {
    return <Flame size={size} className={className} />;
  }

  return (
    <AnimatedIcon
      icon={Flame}
      size={size}
      iconClassName={className}
      preset={preset}
      active
      hover={false}
    />
  );
}
