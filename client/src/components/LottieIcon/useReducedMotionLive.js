import { useSyncExternalStore } from 'react';

/**
 * Live subscription to the user's `prefers-reduced-motion` preference.
 *
 * Implementation notes:
 * - Uses `useSyncExternalStore` so updates are observed within the same
 *   React commit (Requirement 2.3: changes reflect within one render cycle).
 * - SSR-safe: `getServerSnapshot` returns `false` and `subscribe` is a no-op
 *   when `window` is unavailable so server rendering never throws and
 *   defaults to "motion allowed" (Requirement 2.1).
 *
 * @returns {boolean} `true` when the user prefers reduced motion.
 */

const QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(cb) {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {};
  }
  const mql = window.matchMedia(QUERY);
  // Modern browsers: addEventListener('change', cb). All evergreen targets we
  // support implement this signature, so we don't carry a legacy fallback.
  mql.addEventListener('change', cb);
  return () => mql.removeEventListener('change', cb);
}

function getSnapshot() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia(QUERY).matches;
}

function getServerSnapshot() {
  return false;
}

export function useReducedMotionLive() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export default useReducedMotionLive;
