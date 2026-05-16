import React from 'react';

/**
 * Module-scope set of Lottie asset names that have failed to load or render
 * during the current page session. Lives for the entire page lifetime so that
 * subsequent mounts of the same `name` short-circuit to the static fallback
 * without retrying the network request.
 *
 * The boundary itself does NOT mutate this set — the caller (LottiePlayer)
 * calls `markFailed(name)` after specific catches (chunk load failure, asset
 * load failure, invalid Lottie JSON, runtime error). The boundary only
 * renders `props.fallback` once an error has been caught.
 *
 * @see Requirement 7.4 — "no automatic retry within current page session"
 * @type {Set<string>}
 */
export const failedNames = new Set();

/**
 * Record that the Lottie asset with the given `name` has failed.
 * Safe to call multiple times; the underlying `Set` deduplicates.
 *
 * @param {string} name - Asset name from the Lottie registry.
 */
export function markFailed(name) {
  if (typeof name === 'string' && name.length > 0) {
    failedNames.add(name);
  }
}

/**
 * Check whether the Lottie asset with the given `name` has previously failed
 * during this page session.
 *
 * @param {string} name - Asset name from the Lottie registry.
 * @returns {boolean} `true` if the asset has been marked as failed.
 */
export function hasFailed(name) {
  return typeof name === 'string' && failedNames.has(name);
}

/**
 * Test-only helper: clear the `failedNames` set so that test cases can run
 * in isolation without leaking failure state across tests. Production code
 * must not call this — Requirement 7.4 specifies that the UI does not retry
 * within the same page session.
 */
export function clearFailedForTests() {
  failedNames.clear();
}

/**
 * Error boundary that catches:
 *   - rejected dynamic imports of the Lottie chunk (Requirement 7.1)
 *   - rejected dynamic imports of an asset chunk (Requirement 7.2)
 *   - validation/runtime errors thrown from `LottiePlayer` (Requirement 7.3)
 *
 * On error it renders `this.props.fallback` (a Static_Fallback_Icon element)
 * instead of crashing the parent React tree.
 *
 * The boundary does NOT call `markFailed(name)` itself — the throwing code
 * path inside `LottiePlayer` is responsible for marking the specific asset
 * name as failed before re-throwing. This keeps the boundary generic and the
 * failure-attribution logic close to the actual catch site.
 *
 * Props:
 *   - `fallback: React.ReactNode` — element rendered when an error is caught.
 *   - `children: React.ReactNode` — subtree guarded by the boundary.
 */
export class LottieErrorBoundary extends React.Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(err) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error('[LottieIcon] runtime error', err);
    }
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export default LottieErrorBoundary;
