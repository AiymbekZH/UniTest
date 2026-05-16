// Vitest setup file.
//
// Responsibilities:
//   1. Register @testing-library/jest-dom matchers (toBeInTheDocument, toHaveClass, ...).
//   2. Configure fast-check default numRuns = 100 globally (per design.md / requirements 3.1, 3.4).
//   3. Provide default mocks for `window.matchMedia` and `window.IntersectionObserver`,
//      since happy-dom does not implement them and many LottieIcon code paths read them.
//   4. Expose a tiny module-cache reset registry so future tasks can register cleanup
//      callbacks (e.g. for memoization Maps inside LottieIcon) and have them flushed
//      between tests.

import '@testing-library/jest-dom/vitest'
import * as fc from 'fast-check'
import { afterEach, beforeEach, vi } from 'vitest'

// --- fast-check defaults ---
// numRuns: 100 satisfies the property-test budget specified in requirements 3.1, 3.4.
// Individual tests can still raise this locally via fc.assert(prop, { numRuns: ... }).
// FC_SEED is honoured so CI / local debugging can reproduce a specific failing run
// (`FC_SEED=1234 npm test`). When unset, fast-check picks a random seed per process.
const fcGlobalConfig = { numRuns: 100 }
const rawSeed = typeof process !== 'undefined' && process.env ? process.env.FC_SEED : undefined
if (rawSeed !== undefined && rawSeed !== '') {
  const parsedSeed = Number(rawSeed)
  if (Number.isFinite(parsedSeed)) {
    fcGlobalConfig.seed = parsedSeed
  }
}
fc.configureGlobal(fcGlobalConfig)

// --- window.matchMedia default mock ---
// Default: nothing matches (e.g. prefers-reduced-motion: reduce → false).
// Tests that need a specific value should override window.matchMedia themselves.
function defaultMatchMediaImpl(query) {
  const listeners = new Set()
  return {
    matches: false,
    media: String(query ?? ''),
    onchange: null,
    addListener: (cb) => listeners.add(cb), // legacy
    removeListener: (cb) => listeners.delete(cb), // legacy
    addEventListener: (_type, cb) => listeners.add(cb),
    removeEventListener: (_type, cb) => listeners.delete(cb),
    dispatchEvent: () => false,
  }
}

// --- window.IntersectionObserver default mock ---
// No-op observer that never fires. Tests can override with their own controllable mock.
class DefaultIntersectionObserver {
  constructor(callback, options) {
    this.callback = callback
    this.options = options ?? {}
    this.root = (options && options.root) ?? null
    this.rootMargin = (options && options.rootMargin) ?? '0px'
    this.thresholds = (options && (Array.isArray(options.threshold) ? options.threshold : [options.threshold ?? 0])) ?? [0]
  }
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return [] }
}

function installDefaultBrowserMocks() {
  // matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn(defaultMatchMediaImpl),
  })
  // IntersectionObserver
  Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    configurable: true,
    value: DefaultIntersectionObserver,
  })
  if (typeof globalThis !== 'undefined') {
    globalThis.IntersectionObserver = DefaultIntersectionObserver
  }
}

// --- Module-cache reset registry ---
// LottieIcon will eventually keep module-scope caches (parsed Lottie JSON,
// failedNames Set, etc.). Tests that touch those modules can register a reset
// callback once at module-init time; the registry flushes all callbacks before
// every test so state never leaks across tests.
const moduleCacheResetCallbacks = new Set()

/**
 * Register a callback that resets a module-scope cache. The callback will be
 * invoked before every test (in `beforeEach`) automatically.
 *
 * Returns an unregister function so a test can opt out if it wants.
 *
 * @param {() => void} resetFn
 * @returns {() => void} unregister
 */
export function registerModuleCacheReset(resetFn) {
  if (typeof resetFn !== 'function') {
    throw new TypeError('registerModuleCacheReset expects a function')
  }
  moduleCacheResetCallbacks.add(resetFn)
  return () => {
    moduleCacheResetCallbacks.delete(resetFn)
  }
}

/**
 * Flush every registered module-cache reset callback. Exposed primarily for
 * tests that want to reset state mid-test; otherwise this runs automatically
 * in `beforeEach`.
 */
export function resetAllModuleCaches() {
  for (const cb of moduleCacheResetCallbacks) {
    try {
      cb()
    } catch (err) {
      // Surface but do not abort other resets.
      // eslint-disable-next-line no-console
      console.error('[vitest.setup] module cache reset callback threw:', err)
    }
  }
}

// Make the registry available globally for tests that don't want to import it.
// (assigned after `resetLottieModuleCaches` is declared below)

/**
 * Resilient helper that resets the module-scope caches inside the LottieIcon
 * subsystem between tests. The target modules do not exist yet (they will be
 * created in subsequent tasks), so this helper:
 *
 *   - Dynamically imports each known module path and silently no-ops if the
 *     module is missing or the resolution fails.
 *   - Resets only the exports it recognises; unknown shapes are ignored.
 *
 * Currently targets:
 *   - `src/components/LottieIcon/LottieErrorBoundary.jsx`  → `failedNames` (Set)
 *   - `src/components/LottieIcon/LottieIcon.jsx`           → `__animationDataCache` (Map) [optional]
 *   - `src/components/LottieIcon/animationDataCache.js`    → `animationDataCache` (Map) [optional]
 *
 * Returns a Promise so callers can `await` the flush; the lifecycle hook does
 * not await it because Vitest will pick up later resolutions before the next
 * test step thanks to its microtask draining.
 *
 * @returns {Promise<void>}
 */
export async function resetLottieModuleCaches() {
  const targets = [
    {
      path: '/src/components/LottieIcon/LottieErrorBoundary.jsx',
      reset: (mod) => {
        if (mod && mod.failedNames && typeof mod.failedNames.clear === 'function') {
          mod.failedNames.clear()
        }
      },
    },
    {
      path: '/src/components/LottieIcon/LottieIcon.jsx',
      reset: (mod) => {
        if (mod && mod.__animationDataCache && typeof mod.__animationDataCache.clear === 'function') {
          mod.__animationDataCache.clear()
        }
      },
    },
    {
      path: '/src/components/LottieIcon/animationDataCache.js',
      reset: (mod) => {
        if (mod && mod.animationDataCache && typeof mod.animationDataCache.clear === 'function') {
          mod.animationDataCache.clear()
        }
      },
    },
  ]

  await Promise.all(
    targets.map(async ({ path, reset }) => {
      try {
        // Vite test resolves absolute-from-root paths via its module graph; if
        // the file is missing the import rejects and we silently move on.
        const mod = await import(/* @vite-ignore */ path)
        reset(mod)
      } catch {
        // Module not present yet (or failed to load) — that's expected during
        // early-task setup and is intentionally non-fatal.
      }
    }),
  )
}

// Expose helpers globally so tests can grab them without an import statement.
globalThis.__lottieTestUtils = {
  registerModuleCacheReset,
  resetAllModuleCaches,
  resetLottieModuleCaches,
}

// --- Lifecycle hooks ---
beforeEach(() => {
  installDefaultBrowserMocks()
  resetAllModuleCaches()
})

afterEach(() => {
  // Vitest's `clearMocks`/`restoreMocks` already covers vi.fn() state; this is
  // a defense-in-depth flush so any stray module-scope caches don't leak.
  resetAllModuleCaches()
})

// Run once at startup so even pre-`beforeEach` code (module top-level in tests)
// sees the mocks in place.
installDefaultBrowserMocks()
