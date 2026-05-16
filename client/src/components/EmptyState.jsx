import React from 'react';
import LottieIcon from './LottieIcon';

/**
 * `EmptyState` — generic placeholder for "no data" surfaces (Req 9.4).
 *
 * Renders a centered Lottie illustration with a caption beneath it. The
 * underlying `LottieIcon` already honours `prefers-reduced-motion` and
 * gracefully falls back to a static `lucide-react` icon, so this component
 * inherits that behaviour for free.
 *
 * @param {{
 *   illustration?: string,
 *   caption: string,
 *   className?: string,
 * }} props
 *   - `illustration`: registry key for the Lottie asset (default `'empty'`).
 *   - `caption`: visible text shown beneath the illustration. Required.
 *   - `className`: optional extra classes appended to the wrapper.
 */
export function EmptyState({ illustration = 'empty', caption, className }) {
  const wrapperClass = [
    'flex flex-col items-center justify-center gap-3 py-8 text-center',
    className || '',
  ]
    .join(' ')
    .trim();

  return (
    <div className={wrapperClass}>
      <LottieIcon
        name={illustration}
        trigger="autoplay"
        loop={true}
        size={120}
      />
      <p className="text-sm text-slate-500 dark:text-slate-400">{caption}</p>
    </div>
  );
}

export default EmptyState;
