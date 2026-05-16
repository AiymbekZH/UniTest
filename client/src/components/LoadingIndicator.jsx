// LoadingIndicator — page-level Lottie loader.
//
// Thin wrapper over `LottieIcon` configured per Requirement 9.3 of the
// `lottie-animated-icons` spec:
//   - asset name "loading" (registered in `assets/lottie/registry.js`),
//   - `trigger="autoplay"` + `loop` so the spinner runs continuously while
//     visible (the off-screen-pause logic still applies — see Req 11.1),
//   - default size 48 px to match the PageLoader visuals,
//   - default `ariaLabel="Loading"` so screen readers announce the busy
//     state via the `role="img"` path of `computeAria` (Req 6.1, 6.2).
//
// Existing `Loader2` / `animate-spin` spinners in the codebase are kept as-is
// (Req 9.7 — only the listed integration points change in this iteration).
//
// Usage:
//   import LoadingIndicator from '@/components/LoadingIndicator';
//   ...
//   <LoadingIndicator />            // defaults: size=48, ariaLabel="Loading"
//   <LoadingIndicator size={32} />  // smaller variant
//   <LoadingIndicator ariaLabel="Загрузка" />  // localised label
import React from 'react';
import { LottieIcon } from './LottieIcon';

/**
 * @param {{
 *   size?: number,
 *   ariaLabel?: string,
 *   className?: string,
 * }} props
 */
export function LoadingIndicator({
  size = 48,
  ariaLabel = 'Loading',
  className,
}) {
  return (
    <LottieIcon
      name="loading"
      trigger="autoplay"
      loop
      size={size}
      ariaLabel={ariaLabel}
      className={className}
    />
  );
}

export default LoadingIndicator;
