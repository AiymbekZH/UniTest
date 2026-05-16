// Lifecycle manager for a single lottie-web animation instance.
//
// Responsibilities (mapped to Requirements 1.10, 5.2, 11.2 and to the
// design in `.kiro/specs/lottie-animated-icons/design.md`):
//
//   - The lottie-web runtime is loaded via a *dynamic* import of the light
//     SVG-only build so it ends up in a separate lazy chunk and never in
//     the Initial_Bundle (Req 3.1, see also `LottiePlayer` lazy wrapper).
//   - On mount we apply `colorOverride` to a clone of `animationData`
//     before calling `lottie.loadAnimation` (`applyColorOverride` itself
//     uses `structuredClone`, so the caller's object is never mutated).
//   - On `speed` change we call `animation.setSpeed(speed)` without
//     recreating the instance (Req 1.10).
//   - On `colorOverride` change we re-patch the live layers in-place and
//     force a re-render via `goToAndStop(currentFrame, true)` so the new
//     colors appear without going through `loadAnimation` again (Req 5.2).
//   - On unmount we call `animation.destroy()` synchronously inside the
//     React cleanup phase, regardless of whether the instance reached
//     "ready" (Req 11.2).

import { useCallback, useEffect, useRef, useState } from 'react';
import { applyColorOverride } from './applyColorOverride';

/**
 * Stable JSON representation of an object for shallow content comparison.
 * Only used to detect "did colorOverride actually change" between renders
 * — it does not need to be a perfectly canonical encoding.
 *
 * @param {unknown} obj
 * @returns {string}
 */
function stableStringify(obj) {
  if (obj == null) return '';
  if (typeof obj !== 'object') return String(obj);
  return JSON.stringify(obj, Object.keys(obj).sort());
}

/**
 * Manage the lifecycle of a single lottie-web animation.
 *
 * @param {Object} args
 * @param {{ current: HTMLElement | null }} args.container
 *   Ref to the DOM element that lottie-web will render into.
 * @param {object} args.animationData
 *   Parsed Lottie JSON. Treated as immutable — a clone is patched and
 *   handed to `lottie.loadAnimation`.
 * @param {boolean} [args.loop=false]
 * @param {boolean} [args.autoplay=false]
 * @param {number} [args.speed=1] Strictly positive playback rate.
 * @param {Record<string, string>} [args.colorOverride]
 *   Mapping `originalColor -> targetColor` applied to vector layers.
 * @returns {{
 *   play: () => void,
 *   stop: () => void,
 *   goToFirstFrame: () => void,
 *   isReady: boolean,
 * }}
 */
export function useLottieAnimation({
  container,
  animationData,
  loop,
  autoplay,
  speed,
  colorOverride,
}) {
  const animationRef = useRef(null);
  const [isReady, setIsReady] = useState(false);

  // Track the latest content-hash of colorOverride so the dedicated effect
  // below can detect "really changed" vs. "new object reference, same
  // content" without re-applying the patch needlessly.
  const colorOverrideKeyRef = useRef(stableStringify(colorOverride));

  // Keep the latest animationData around for the colorOverride effect:
  // it needs to re-run applyColorOverride against the *original* data, not
  // against the already-patched live object (otherwise we would chain
  // overrides on top of each other).
  const animationDataRef = useRef(animationData);
  useEffect(() => {
    animationDataRef.current = animationData;
  }, [animationData]);

  // Main effect: create the lottie instance.
  // Deliberately depends only on inputs that require a full
  // `loadAnimation`. `speed` and `colorOverride` are handled by their own
  // effects so that updates to them never destroy/recreate the player.
  useEffect(() => {
    if (!container || !container.current || !animationData) return undefined;

    let cancelled = false;
    let domLoadedHandler = null;
    let createdAnim = null;

    (async () => {
      // Dynamic import — must NEVER be statically referenced anywhere in
      // the eager graph or the runtime would land in Initial_Bundle.
      const mod = await import('lottie-web/build/player/lottie_light');
      const lottie = mod.default || mod;

      if (cancelled || !container.current) return;

      const { data } = applyColorOverride(animationData, colorOverride);

      const anim = lottie.loadAnimation({
        container: container.current,
        renderer: 'svg',
        loop: !!loop,
        autoplay: !!autoplay,
        animationData: data,
      });

      animationRef.current = anim;
      createdAnim = anim;

      // Apply initial speed inside the load effect so the very first
      // playback already runs at the requested rate.
      if (typeof speed === 'number' && speed > 0) {
        anim.setSpeed(speed);
      }

      // Refresh the colorOverride key so the dedicated colorOverride
      // effect treats this exact mapping as already-applied.
      colorOverrideKeyRef.current = stableStringify(colorOverride);

      domLoadedHandler = () => {
        if (!cancelled) setIsReady(true);
      };
      anim.addEventListener('DOMLoaded', domLoadedHandler);
    })();

    return () => {
      cancelled = true;
      const anim = animationRef.current || createdAnim;
      if (anim) {
        if (domLoadedHandler) {
          try {
            anim.removeEventListener('DOMLoaded', domLoadedHandler);
          } catch (_e) {
            // lottie-web's removeEventListener may throw if events are
            // already torn down; safe to ignore during cleanup.
          }
        }
        // Synchronous destroy — Req 11.2.
        anim.destroy();
      }
      animationRef.current = null;
      setIsReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [container, animationData, loop, autoplay]);

  // Speed-only effect. Skips the very first commit because the main
  // effect already calls setSpeed once at creation; on subsequent renders
  // this propagates new speed values without recreating the player.
  useEffect(() => {
    const anim = animationRef.current;
    if (!anim) return;
    if (typeof speed === 'number' && speed > 0) {
      anim.setSpeed(speed);
    }
  }, [speed]);

  // colorOverride-only effect. Re-applies the mapping to the live layers
  // without going through loadAnimation again (Req 5.2).
  //
  // Implementation notes: lottie-web's renderer keeps internal references
  // to layer objects, so we cannot wholesale replace `anim.animationData`.
  // Instead we run applyColorOverride against the *original* animationData
  // to get a freshly-patched copy, then copy the recomputed `layers` into
  // the live `animationData` reference and force a single-frame re-render.
  // This is best-effort — lottie-web reads the new color values on the
  // next rendered frame.
  useEffect(() => {
    const nextKey = stableStringify(colorOverride);
    if (nextKey === colorOverrideKeyRef.current) return;
    colorOverrideKeyRef.current = nextKey;

    const anim = animationRef.current;
    if (!anim) return;

    const original = animationDataRef.current;
    if (!original) return;

    const { data } = applyColorOverride(original, colorOverride);

    // Mutate the live animationData in place so lottie-web picks up the
    // new colors on the next render tick. Replacing the `layers` array is
    // safe because the recomputed layers are deep clones from
    // structuredClone inside applyColorOverride.
    if (anim.animationData && Array.isArray(data.layers)) {
      anim.animationData.layers = data.layers;
    }

    // Force lottie-web to redraw the current frame so the change is
    // visible immediately. Prefer the renderer's frame API when present,
    // otherwise fall back to goToAndStop on the current frame.
    try {
      if (anim.renderer && typeof anim.renderer.renderFrame === 'function') {
        anim.renderer.renderFrame(anim.currentFrame);
      } else if (typeof anim.goToAndStop === 'function') {
        anim.goToAndStop(anim.currentFrame || 0, true);
      }
    } catch (_e) {
      // Swallow — a failed redraw still leaves the next natural tick to
      // pick up the new colors. We deliberately don't surface this to the
      // ErrorBoundary because the animation itself is still healthy.
    }
  }, [colorOverride]);

  const play = useCallback(() => {
    const anim = animationRef.current;
    if (anim && typeof anim.play === 'function') anim.play();
  }, []);

  const stop = useCallback(() => {
    const anim = animationRef.current;
    if (anim && typeof anim.stop === 'function') anim.stop();
  }, []);

  const goToFirstFrame = useCallback(() => {
    const anim = animationRef.current;
    if (anim && typeof anim.goToAndStop === 'function') {
      anim.goToAndStop(0, true);
    }
  }, []);

  return { play, stop, goToFirstFrame, isReady };
}

export default useLottieAnimation;
