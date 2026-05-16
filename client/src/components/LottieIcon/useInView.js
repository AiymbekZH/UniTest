// useInView — a thin React hook around a single IntersectionObserver instance.
//
// Used by LottieIcon for two purposes (see design.md):
//   1. trigger="inView" — start the animation when the element enters the
//      viewport (Requirement 1.9).
//   2. Off-screen pause for any trigger — pause the animation while the
//      element is outside the viewport (Requirement 11.1).
//
// Contract:
//   useInView(ref, { rootMargin = '0px', threshold = 0 } = {}) -> boolean
//
// Behaviour:
//   - One IntersectionObserver instance per mounted hook call.
//   - State is updated from `entries[0].isIntersecting` in the observer
//     callback. The observer is disconnected and its reference cleared in
//     the effect's cleanup.
//   - Feature detection: if `IntersectionObserver` is not available, the
//     hook returns `true` so callers degrade to autoplay (i.e. the
//     animation behaves as if always visible). A `console.warn` is emitted
//     once per session in DEV builds only.

import { useEffect, useRef, useState } from 'react';

// Module-scope flag so the DEV warning is emitted at most once per session
// even if many LottieIcon instances mount on the same page.
let warnedAboutMissingIO = false;

export function useInView(ref, { rootMargin = '0px', threshold = 0 } = {}) {
  const hasIO = typeof IntersectionObserver !== 'undefined';

  // When IntersectionObserver is unavailable we treat the element as always
  // in view (degrade to autoplay). Otherwise start as `false` until the
  // observer reports the first entry.
  const [inView, setInView] = useState(!hasIO);
  const observerRef = useRef(null);

  useEffect(() => {
    if (!hasIO) {
      if (import.meta.env.DEV && !warnedAboutMissingIO) {
        warnedAboutMissingIO = true;
        // eslint-disable-next-line no-console
        console.warn(
          '[LottieIcon] IntersectionObserver unavailable, falling back to always-in-view'
        );
      }
      return undefined;
    }

    const target = ref?.current;
    if (!target) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        setInView(entry.isIntersecting);
      },
      { rootMargin, threshold }
    );

    observerRef.current = observer;
    observer.observe(target);

    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
  }, [ref, hasIO, rootMargin, threshold]);

  return inView;
}

export default useInView;
