/**
 * Arena sound effects generated via Web Audio API (tone sequences) —
 * zero external asset deps. Each "sound" is a short oscillator pattern.
 * Respects a global mute flag persisted in localStorage.
 *
 * AUDIO VIBES (Phase 3): runtime-selectable theme palette that swaps the
 * waveform/freq family for all sounds. The active vibe is set by the host
 * arena (room.settings.audioVibe) and propagated via setAudioVibe().
 */

const STORAGE_KEY = 'unitest.arena.muted';
const VIBE_STORAGE_KEY = 'unitest.arena.audioVibe';

let audioCtx = null;
let currentVibe = 'default';

// Vibe palettes — small param overrides per-sound. Keys must match the keys in
// the `arenaSounds` object below; missing keys fall back to default behavior.
const VIBES = {
  default: {},

  // Bright, broadcast-style: triangle/sine, mid-high tones, slight major-chord uplift.
  quizshow: {
    correct:   { type: 'triangle', f1: 783, f2: 1175, gain: 0.22 },
    wrong:     { type: 'sawtooth', f1: 196, f2: 147, gain: 0.18 },
    countdown: { type: 'triangle', f1: 587, gain: 0.24 },
    go:        { type: 'triangle', f1: 783, f2: 1175, f3: 1568 },
    powerUp:   { type: 'triangle', f1: 587, f2: 880, f3: 1175 },
    final:     { type: 'triangle', f1: 523, f2: 659, f3: 1046 }
  },

  // Lo-fi 8-bit: square waves, lower octaves, no decay easing.
  '8bit': {
    correct:   { type: 'square', f1: 660, f2: 880, gain: 0.16 },
    wrong:     { type: 'square', f1: 196, f2: 110, gain: 0.18 },
    countdown: { type: 'square', f1: 440, gain: 0.16 },
    go:        { type: 'square', f1: 523, f2: 659, f3: 784 },
    powerUp:   { type: 'square', f1: 392, f2: 587, f3: 784 },
    final:     { type: 'square', f1: 392, f2: 523, f3: 659 },
    tick:      { type: 'square', f1: 1318, gain: 0.06 }
  },

  // Cinematic: deep sine, longer release, lower fundamental.
  cinematic: {
    correct:   { type: 'sine', f1: 392, f2: 523, gain: 0.20, longer: true },
    wrong:     { type: 'sine', f1: 110, f2: 82, gain: 0.16, longer: true },
    countdown: { type: 'sine', f1: 261, gain: 0.20, longer: true },
    go:        { type: 'sine', f1: 261, f2: 329, f3: 392, longer: true },
    powerUp:   { type: 'sine', f1: 220, f2: 329, f3: 392, longer: true },
    final:     { type: 'sine', f1: 196, f2: 261, f3: 392, longer: true }
  },

  // Chill: sine, soft, mid-low, gentle attacks.
  chill: {
    correct:   { type: 'sine', f1: 587, f2: 880, gain: 0.14 },
    wrong:     { type: 'sine', f1: 196, f2: 165, gain: 0.10 },
    countdown: { type: 'sine', f1: 392, gain: 0.14 },
    go:        { type: 'sine', f1: 392, f2: 523, f3: 659 },
    powerUp:   { type: 'sine', f1: 440, f2: 587, f3: 880 },
    final:     { type: 'sine', f1: 392, f2: 523, f3: 698 }
  }
};

function getVibeParams(soundKey) {
  const palette = VIBES[currentVibe] || {};
  return palette[soundKey] || {};
}

export function setAudioVibe(vibe) {
  if (!VIBES[vibe]) vibe = 'default';
  currentVibe = vibe;
  if (typeof window !== 'undefined') {
    try { window.localStorage.setItem(VIBE_STORAGE_KEY, vibe); } catch (_) { /* noop */ }
  }
}

export function getAudioVibe() {
  return currentVibe;
}

// Hydrate from storage on module load (so vibe persists across reloads / pages).
if (typeof window !== 'undefined') {
  try {
    const saved = window.localStorage.getItem(VIBE_STORAGE_KEY);
    if (saved && VIBES[saved]) currentVibe = saved;
  } catch (_) { /* noop */ }
}

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
  tick: () => {
    const v = getVibeParams('tick');
    playTone({ freq: v.f1 || 880, duration: 0.05, type: v.type || 'square', gain: v.gain || 0.05 });
  },
  countdown: () => {
    const v = getVibeParams('countdown');
    playTone({ freq: v.f1 || 520, duration: v.longer ? 0.32 : 0.2, type: v.type || 'triangle', gain: v.gain || 0.22 });
  },
  go: () => {
    const v = getVibeParams('go');
    const t = v.type || 'sine';
    const d = v.longer ? 0.18 : 0.08;
    playTone({ freq: v.f1 || 660, duration: d, type: t });
    playTone({ freq: v.f2 || 880, duration: d + 0.04, type: t, startDelay: 0.07 });
    playTone({ freq: v.f3 || 1320, duration: d + 0.12, type: t, startDelay: 0.17 });
  },
  correct: () => {
    const v = getVibeParams('correct');
    const t = v.type || 'sine';
    const d = v.longer ? 0.22 : 0.08;
    playTone({ freq: v.f1 || 660, duration: d, type: t, gain: v.gain });
    playTone({ freq: v.f2 || 990, duration: d + 0.06, type: t, startDelay: 0.07, gain: v.gain });
  },
  wrong: () => {
    const v = getVibeParams('wrong');
    const t = v.type || 'sawtooth';
    const d = v.longer ? 0.30 : 0.18;
    playTone({ freq: v.f1 || 220, duration: d, type: t, gain: v.gain || 0.16 });
    playTone({ freq: v.f2 || 140, duration: d + 0.04, type: t, gain: (v.gain || 0.16) * 0.75, startDelay: 0.1 });
  },
  powerUp: () => {
    const v = getVibeParams('powerUp');
    const t = v.type || 'square';
    playTone({ freq: v.f1 || 520, duration: 0.05, type: t, gain: 0.1 });
    playTone({ freq: v.f2 || 780, duration: 0.05, type: t, gain: 0.1, startDelay: 0.05 });
    playTone({ freq: v.f3 || 1040, duration: 0.1, type: t, gain: 0.12, startDelay: 0.1 });
  },
  combo: () => {
    playTone({ freq: 880, duration: 0.06, type: 'sine' });
    playTone({ freq: 1320, duration: 0.08, type: 'sine', startDelay: 0.06 });
  },
  final: () => {
    const v = getVibeParams('final');
    const t = v.type || 'sine';
    playTone({ freq: v.f1 || 523, duration: 0.15, type: t });
    playTone({ freq: v.f2 || 659, duration: 0.15, type: t, startDelay: 0.12 });
    playTone({ freq: v.f3 || 784, duration: 0.22, type: t, startDelay: 0.25 });
  },
  reaction: () => {
    playTone({ freq: 1100, duration: 0.05, type: 'triangle', gain: 0.08 });
  },
  // Boss Round dramatic dramatic intro — fired when entering a 'boss' question.
  bossIntro: () => {
    playTone({ freq: 110, duration: 0.5, type: 'sawtooth', gain: 0.20 });
    playTone({ freq: 165, duration: 0.4, type: 'sawtooth', gain: 0.18, startDelay: 0.18 });
    playTone({ freq: 220, duration: 0.6, type: 'sine', gain: 0.16, startDelay: 0.4 });
  },
  // Crown change — short triumphant flourish.
  crown: () => {
    playTone({ freq: 988, duration: 0.06, type: 'triangle', gain: 0.18 });
    playTone({ freq: 1318, duration: 0.10, type: 'triangle', gain: 0.18, startDelay: 0.06 });
    playTone({ freq: 1568, duration: 0.18, type: 'sine', gain: 0.18, startDelay: 0.16 });
  }
};
