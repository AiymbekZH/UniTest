/**
 * Arena sound effects generated via Web Audio API (tone sequences) —
 * zero external asset deps. Each "sound" is a short oscillator pattern.
 * Respects a global mute flag persisted in localStorage.
 */

const STORAGE_KEY = 'unitest.arena.muted';

let audioCtx = null;

function getCtx() {
  if (typeof window === 'undefined') return null;
  if (audioCtx) return audioCtx;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  } catch (_) {
    audioCtx = null;
  }
  return audioCtx;
}

function isMuted() {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch (_) { return false; }
}

export function setArenaMuted(muted) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, muted ? '1' : '0');
  } catch (_) { /* ignore */ }
}

export function getArenaMuted() {
  return isMuted();
}

function playTone({ freq = 440, duration = 0.12, type = 'sine', gain = 0.18, startDelay = 0 }) {
  const ctx = getCtx();
  if (!ctx || isMuted()) return;
  const now = ctx.currentTime + startDelay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(gain, now + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(g).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

export const arenaSounds = {
  tick: () => playTone({ freq: 880, duration: 0.05, type: 'square', gain: 0.05 }),
  countdown: () => {
    playTone({ freq: 520, duration: 0.2, type: 'triangle', gain: 0.22 });
  },
  go: () => {
    playTone({ freq: 660, duration: 0.08, type: 'sine' });
    playTone({ freq: 880, duration: 0.12, type: 'sine', startDelay: 0.07 });
    playTone({ freq: 1320, duration: 0.2, type: 'sine', startDelay: 0.17 });
  },
  correct: () => {
    playTone({ freq: 660, duration: 0.08, type: 'sine' });
    playTone({ freq: 990, duration: 0.14, type: 'sine', startDelay: 0.07 });
  },
  wrong: () => {
    playTone({ freq: 220, duration: 0.18, type: 'sawtooth', gain: 0.16 });
    playTone({ freq: 140, duration: 0.22, type: 'sawtooth', gain: 0.12, startDelay: 0.1 });
  },
  powerUp: () => {
    playTone({ freq: 520, duration: 0.05, type: 'square', gain: 0.1 });
    playTone({ freq: 780, duration: 0.05, type: 'square', gain: 0.1, startDelay: 0.05 });
    playTone({ freq: 1040, duration: 0.1, type: 'square', gain: 0.12, startDelay: 0.1 });
  },
  combo: () => {
    playTone({ freq: 880, duration: 0.06, type: 'sine' });
    playTone({ freq: 1320, duration: 0.08, type: 'sine', startDelay: 0.06 });
  },
  final: () => {
    playTone({ freq: 523, duration: 0.15, type: 'sine' });
    playTone({ freq: 659, duration: 0.15, type: 'sine', startDelay: 0.12 });
    playTone({ freq: 784, duration: 0.22, type: 'sine', startDelay: 0.25 });
  },
  reaction: () => {
    playTone({ freq: 1100, duration: 0.05, type: 'triangle', gain: 0.08 });
  }
};
