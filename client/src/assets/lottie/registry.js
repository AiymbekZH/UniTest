import { Bell, Trophy, Loader2, Inbox, CheckCircle2, Smile } from 'lucide-react';

// Map registry KEY (camelCase logical name used by callers) to ASSET FILE basename.
// File basenames are kebab-case ("test-success") to match the JSON filenames in
// this directory; registry keys are camelCase ("testSuccess") to match the
// JavaScript naming convention used by callers.
export const lottieRegistry = Object.freeze({
  bell: {
    loader: () => import('./bell.json'),
    fallback: Bell,
    defaultSize: 16,
    description: 'Notification bell — plays once on inView',
  },
  trophy: {
    loader: () => import('./trophy.json'),
    fallback: Trophy,
    defaultSize: 22,
    description: 'Achievement trophy — plays once on inView',
  },
  loading: {
    loader: () => import('./loading.json'),
    fallback: Loader2,
    defaultSize: 48,
    description: 'Page-level loading indicator — looping autoplay',
  },
  empty: {
    loader: () => import('./empty.json'),
    fallback: Inbox,
    defaultSize: 120,
    description: 'Empty-state illustration — looping autoplay',
  },
  testSuccess: {
    loader: () => import('./test-success.json'),
    fallback: CheckCircle2,
    defaultSize: 72,
    description: 'Test submission success — autoplay once',
  },
  reactionFire: {
    loader: () => import('./reaction-fire.json'),
    fallback: Smile,
    defaultSize: 24,
    description: 'Fire chat reaction — plays once on hover',
  },
});

// Runtime guard: unique keys (defense-in-depth — Object literal already enforces
// this syntactically, but a programmatic mutation could violate it). Throws
// only in DEV so production never throws on import.
const keys = Object.keys(lottieRegistry);
if (keys.length !== new Set(keys).size) {
  const message = '[lottieRegistry] duplicate keys detected: ' + keys.join(', ');
  if (import.meta.env && import.meta.env.DEV) {
    throw new Error(message);
  }
  // production: silent — Vite plugin (task 9.1) catches this at build time.
}

// Convenience hasIcon check used by LottieIcon for unknown-name fallback.
export function hasIcon(name) {
  return typeof name === 'string' && Object.prototype.hasOwnProperty.call(lottieRegistry, name);
}

export default lottieRegistry;
