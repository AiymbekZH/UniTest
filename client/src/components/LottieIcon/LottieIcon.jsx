import React, { lazy, Suspense, useEffect, useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { useReducedMotionLive } from './useReducedMotionLive';
import {
  LottieErrorBoundary,
  hasFailed,
  markFailed,
} from './LottieErrorBoundary';
import { computeAria } from './computeAria';
import { lottieRegistry, hasIcon } from '../../assets/lottie/registry';

// `LottiePlayer` is loaded as a separate chunk (Lottie_Chunk) — see Req 3.1.
// `LottieIcon` itself stays in the Initial_Bundle, but anything that touches
// `lottie-web` lives behind this lazy import.
const LottiePlayer = lazy(() => import('./LottiePlayer.jsx'));

/**
 * Module-scope cache: parsed Lottie JSON keyed by registry name.
 *
 * Survives mount → unmount → mount cycles within the same page session, so
 * `lottieRegistry[name].loader` is invoked at most once per name (Property 10,
 * Req 3.5).
 *
 * Exposed under the `__animationDataCache` name because `vitest.setup.js`
 * already references it for inter-test reset.
 *
 * @type {Map<string, object>}
 */
export const __animationDataCache = new Map();

/**
 * Module-scope set of in-flight loader Promises, keyed by registry name.
 *
 * When two concurrent mounts of the same `name` race, both share one Promise
 * so the asset chunk is fetched exactly once (Property 10).
 *
 * @type {Map<string, Promise<object>>}
 */
const __inFlight = new Map();

/**
 * Test-only helper: clear the parsed-JSON cache. Production code must not
 * call this — Req 3.5 specifies that the cache lives for the whole session.
 */
export function __clearAnimationDataCacheForTests() {
  __animationDataCache.clear();
  __inFlight.clear();
}

const isDev =
  typeof import.meta !== 'undefined' &&
  import.meta.env &&
  import.meta.env.DEV;

/**
 * Renders a Static_Fallback_Icon inside a wrapper span sized to `size×size`.
 *
 * The wrapper carries `className` and the precomputed ARIA attributes so the
 * fallback path is accessibility-equivalent to the Lottie path (Req 6.1–6.3).
 * `onClick` is wired through so a clickable icon under reduce-motion remains
 * clickable.
 */
function FallbackIconRenderer({ Icon, size, className, aria, onClick }) {
  const wrapperStyle = {
    display: 'inline-block',
    width: size,
    height: size,
  };
  return (
    <span
      className={className}
      style={wrapperStyle}
      onClick={onClick}
      {...aria}
    >
      {Icon ? <Icon size={size} /> : null}
    </span>
  );
}

/**
 * Invisible placeholder of exactly `size×size`. Rendered while the asset
 * chunk and/or LottiePlayer chunk are loading so layout (CLS) is preserved.
 *
 * Always `aria-hidden` — screen readers should not announce a transient
 * loading slot. The real ARIA label is applied once content arrives.
 */
function Placeholder({ size, className }) {
  return (
    <span
      aria-hidden="true"
      className={className}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
      }}
    />
  );
}

/**
 * `LottieIcon` — public, eager wrapper.
 *
 * See `design.md → Components and Interfaces → LottieIcon` for the full
 * prop contract; the JSDoc below restates only what affects this file.
 *
 * Render-path selection:
 *
 *   1. Reduce-motion / unknown name / previously-failed name / fresh load
 *      error → Static_Fallback_Icon synchronously (no loader call, no lazy
 *      chunk fetched). Validates Req 2.1, 2.2, 7.4 and Properties 7, 9, 18.
 *
 *   2. Asset chunk still loading → invisible Placeholder of the right size
 *      (anti-CLS).
 *
 *   3. Ready → `LottiePlayer` rendered inside `LottieErrorBoundary` and
 *      `Suspense`. Any chunk-load failure (Req 7.1) or runtime/validation
 *      failure (Req 7.2, 7.3) bubbles to the boundary, which renders the
 *      same Static_Fallback_Icon.
 *
 * The asset chunk is fetched here (in `LottieIcon`, not `LottiePlayer`),
 * the parsed JSON memoized via `__animationDataCache`, and the already-
 * parsed `animationData` handed to `LottiePlayer` as a prop. This keeps
 * loader-call counting deterministic (Property 10) and means `LottiePlayer`
 * never has to know about the registry.
 *
 * @param {{
 *   name: string,
 *   size?: number,
 *   className?: string,
 *   loop?: boolean,
 *   autoplay?: boolean,
 *   trigger?: 'autoplay' | 'hover' | 'click' | 'inView',
 *   speed?: number,
 *   colorOverride?: Record<string, string>,
 *   ariaLabel?: string,
 *   onClick?: (event: any) => void,
 *   fallbackIcon?: React.ComponentType<{ size?: number, className?: string }>,
 * }} props
 */
export function LottieIcon(props) {
  const {
    name,
    size = 24,
    className,
    loop,
    autoplay,
    trigger,
    speed,
    colorOverride,
    ariaLabel,
    onClick,
    fallbackIcon,
  } = props;

  const reducedMotion = useReducedMotionLive();
  const inRegistry = hasIcon(name);

  // Initial cache hit lets us skip the placeholder frame entirely on a
  // remount of an already-loaded `name` (Req 3.5, Property 10).
  const [animationData, setAnimationData] = useState(() =>
    inRegistry ? __animationDataCache.get(name) : undefined
  );

  // Local "load failed" mirror of the module-scope `failedNames` set. We
  // need a state slot — and not just `hasFailed(name)` directly — so that
  // catching a failure inside the loader effect triggers a re-render.
  const [loadError, setLoadError] = useState(false);

  // Resolve the static fallback component:
  //   1. `fallbackIcon` prop wins (Req 2.4, Property 9).
  //   2. Otherwise, the registry entry's declared fallback.
  //   3. Otherwise (unknown name), `HelpCircle` as a last-resort universal.
  const FallbackIcon =
    fallbackIcon ||
    (inRegistry ? lottieRegistry[name].fallback : HelpCircle);

  // ARIA attributes for both the Lottie and the fallback render paths.
  // `computeAria` itself decides role / aria-label / aria-hidden / tabIndex /
  // onKeyDown — we only spread the result.
  const aria = computeAria({ ariaLabel, trigger, onClick });

  // DEV-only diagnostic for unknown names. Fires once per (name, inRegistry)
  // change so re-renders don't spam the console.
  useEffect(() => {
    if (!inRegistry && isDev) {
      // eslint-disable-next-line no-console
      console.error('[LottieIcon] unknown name:', name);
    }
  }, [name, inRegistry]);

  // Loader effect.
  //
  // Skipped entirely (no network, no `loader()` call, no Lottie_Chunk)
  // when any short-circuit condition holds — this is what lets Property 7
  // hold under reduce-motion and Property 18 after a previous failure.
  useEffect(() => {
    // A new `name` resets any stale local error/data — but only if the
    // previous value was for a different name. Cheap to do unconditionally.
    setLoadError(false);

    if (reducedMotion) return undefined;
    if (!inRegistry) return undefined;
    if (hasFailed(name)) return undefined;

    if (__animationDataCache.has(name)) {
      setAnimationData(__animationDataCache.get(name));
      return undefined;
    }

    let cancelled = false;

    let promise = __inFlight.get(name);
    if (!promise) {
      promise = lottieRegistry[name]
        .loader()
        .then((mod) => {
          // ESM JSON imports show up as `{ default: { ... } }`; raw JS
          // modules may resolve to the value directly. Normalise both.
          const data = mod && mod.default ? mod.default : mod;
          __animationDataCache.set(name, data);
          return data;
        })
        .catch((err) => {
          // Mark before re-throw so any concurrent mounts of the same `name`
          // observe the failure on their next render (Req 7.4, Property 18).
          markFailed(name);
          if (isDev) {
            // eslint-disable-next-line no-console
            console.error('[LottieIcon] failed to load asset', name, err);
          }
          throw err;
        })
        .finally(() => {
          __inFlight.delete(name);
        });
      __inFlight.set(name, promise);
    }

    promise
      .then((data) => {
        if (!cancelled) setAnimationData(data);
      })
      .catch(() => {
        // `markFailed(name)` was already called above. Flip local state to
        // force a re-render that picks the fallback path (Req 7.2, 7.3).
        if (!cancelled) setLoadError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [name, reducedMotion, inRegistry]);

  // ---------------------------------------------------------------------
  // Render path 1: synchronous fallback.
  //
  // Covers: prefers-reduced-motion, unknown name, previously-failed name in
  // this session (Req 7.4), and a fresh load failure detected in the loader
  // effect above. ARIA stays correct because `aria` is computed once and
  // applied to both render paths uniformly (Req 2.1, 2.4, 6.x).
  // ---------------------------------------------------------------------
  if (reducedMotion || !inRegistry || hasFailed(name) || loadError) {
    return (
      <FallbackIconRenderer
        Icon={FallbackIcon}
        size={size}
        className={className}
        aria={aria}
        onClick={onClick}
      />
    );
  }

  // ---------------------------------------------------------------------
  // Render path 2: asset chunk still loading → invisible placeholder.
  // Same dimensions as the eventual content so layout doesn't shift (CLS).
  // ---------------------------------------------------------------------
  if (!animationData) {
    return <Placeholder size={size} className={className} />;
  }

  // ---------------------------------------------------------------------
  // Render path 3: ready. Lazy `LottiePlayer` inside an error boundary and
  // a Suspense placeholder. The error boundary catches:
  //   - rejected dynamic import of LottiePlayer (Req 7.1)
  //   - `markFailed`-then-throw paths inside LottiePlayer (Req 7.2, 7.3)
  //   - any other render-time failure of the lottie-web runtime
  // ---------------------------------------------------------------------
  const fallbackElement = (
    <FallbackIconRenderer
      Icon={FallbackIcon}
      size={size}
      className={className}
      aria={aria}
      onClick={onClick}
    />
  );

  return (
    <LottieErrorBoundary fallback={fallbackElement}>
      <Suspense
        fallback={<Placeholder size={size} className={className} />}
      >
        <LottiePlayer
          name={name}
          animationData={animationData}
          size={size}
          className={className}
          loop={loop}
          autoplay={autoplay}
          trigger={trigger}
          speed={speed}
          colorOverride={colorOverride}
          ariaLabel={ariaLabel}
          onClick={onClick}
          fallback={FallbackIcon}
        />
      </Suspense>
    </LottieErrorBoundary>
  );
}

export default LottieIcon;
