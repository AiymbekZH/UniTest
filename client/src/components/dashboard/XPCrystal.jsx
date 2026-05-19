import { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Crown, Sparkles, Star } from 'lucide-react';

/**
 * Tier palette by level. Each tier reuses the chunky / paper visual language
 * (solid fill, thick border, offset shadow) but shifts hue so the player feels
 * progression. No glow, no neon — colours are muted but distinct.
 */
function tierForLevel(level) {
  const lvl = Number.isFinite(Number(level)) ? Math.max(1, Number(level)) : 1;
  if (lvl >= 50) {
    return {
      key: 'master',
      label: 'Master',
      fill: '#fde68a',          // amber-200
      border: '#7c2d12',        // brown-950
      shadow: '#92400e',        // brown-700
      ring: '#d97706',          // amber-600
      track: '#fef3c7',         // amber-100
      ink: '#0f172a'
    };
  }
  if (lvl >= 25) {
    return {
      key: 'expert',
      label: 'Expert',
      fill: '#fbcfe8',          // pink-200
      border: '#831843',        // pink-900
      shadow: '#9d174d',        // pink-800
      ring: '#db2777',          // pink-600
      track: '#fce7f3',         // pink-100
      ink: '#0f172a'
    };
  }
  if (lvl >= 10) {
    return {
      key: 'adept',
      label: 'Adept',
      fill: '#bae6fd',          // sky-200
      border: '#0c4a6e',        // sky-900
      shadow: '#075985',        // sky-800
      ring: '#0284c7',          // sky-600
      track: '#e0f2fe',         // sky-100
      ink: '#0f172a'
    };
  }
  return {
    key: 'rookie',
    label: 'Rookie',
    fill: '#a7f3d0',            // emerald-200
    border: '#064e3b',          // emerald-900
    shadow: '#065f46',          // emerald-800
    ring: '#059669',            // emerald-600
    track: '#d1fae5',           // emerald-100
    ink: '#0f172a'
  };
}

/**
 * XPCrystal — chunky 3D-feel crystal showing the player's level + progress.
 *
 * Design principles (matches paper hero family):
 *   - solid colour fills, no gradients, no glow
 *   - thick outline + offset shadow like chunky-card
 *   - progress drawn as a stroke on a circular track
 *   - 3 small orbiting motes (icons) drift around the crystal at different
 *     speeds — adds life without going neon
 *   - prefers-reduced-motion: all motion is disabled, crystal stays static
 *
 * Props:
 *   - level         number
 *   - xp            number (current XP total)
 *   - xpIntoLevel   number (XP earned within the current level)
 *   - xpForNextLevel number (XP target for the current level → next)
 *   - size          px (default 220)
 *   - tier          optional override of the tier palette (otherwise derived
 *                   from level via tierForLevel)
 */
export default function XPCrystal({
  level = 1,
  xp = 0,
  xpIntoLevel = 0,
  xpForNextLevel = 100,
  size = 220,
  tier
}) {
  const reduced = useReducedMotion();
  const palette = useMemo(() => tier || tierForLevel(level), [tier, level]);

  const safeForNext = Math.max(1, Number(xpForNextLevel) || 100);
  const safeInto = Math.max(0, Math.min(safeForNext, Number(xpIntoLevel) || 0));
  const progress = safeInto / safeForNext;

  // SVG geometry (uses 200x200 viewBox; visually scaled to `size`).
  const radius = 86;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference * (1 - progress);

  // Orbiting mote angles (seeded by tier so they differ per tier — feels like
  // each tier has its own constellation).
  const orbitOffset = palette.key === 'master' ? 0
    : palette.key === 'expert' ? 30
    : palette.key === 'adept' ? 60
    : 90;

  const motes = [
    { Icon: Star,     dur: 14, delay: 0, r: 96, baseAngle: 0 + orbitOffset },
    { Icon: Sparkles, dur: 18, delay: 0, r: 105, baseAngle: 130 + orbitOffset },
    { Icon: Star,     dur: 22, delay: 0, r: 114, baseAngle: 245 + orbitOffset }
  ];

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {/* Outer offset-shadow plate behind the crystal — gives the chunky 3D feel */}
      <span
        aria-hidden="true"
        className="absolute rounded-[40%]"
        style={{
          inset: 6,
          backgroundColor: palette.shadow,
          transform: 'translate(0, 8px)',
          opacity: 0.9
        }}
      />

      {/* Crystal body */}
      <div
        className="relative inline-flex items-center justify-center rounded-[40%] border-[5px]"
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: palette.fill,
          borderColor: palette.border,
          color: palette.ink
        }}
      >
        {/* SVG ring (track + filled progress) */}
        <svg
          viewBox="0 0 200 200"
          className="absolute inset-0 h-full w-full"
          style={{ transform: 'rotate(-90deg)' }}
          aria-hidden="true"
        >
          {/* Track */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke={palette.track}
            strokeWidth="10"
            strokeLinecap="round"
          />
          {/* Filled progress */}
          <motion.circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke={palette.ring}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: reduced ? strokeOffset : strokeOffset }}
            transition={{
              duration: reduced ? 0 : 1.4,
              ease: 'easeOut'
            }}
          />
        </svg>

        {/* Crown above level (inside crystal) */}
        <div className="relative z-10 flex flex-col items-center justify-center px-3 text-center">
          <Crown size={18} strokeWidth={2.6} style={{ color: palette.ring }} />
          <p
            className="mt-1 font-mono text-[11px] font-black uppercase tracking-[0.2em]"
            style={{ color: palette.ring }}
          >
            {palette.label}
          </p>
          <motion.p
            initial={reduced ? false : { scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.45, ease: 'backOut' }}
            className="mt-0.5 font-mono text-5xl font-black leading-none"
          >
            {level}
          </motion.p>
          <p className="mt-1 text-[10px] font-bold tracking-wide opacity-70">
            {safeInto} / {safeForNext} XP
          </p>
        </div>
      </div>

      {/* Orbiting motes — drift around the crystal */}
      {motes.map(({ Icon, dur, delay, r, baseAngle }, i) => (
        <motion.span
          key={i}
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 inline-flex items-center justify-center"
          style={{
            width: 22,
            height: 22,
            marginLeft: -11,
            marginTop: -11,
            color: palette.ring
          }}
          animate={
            reduced
              ? undefined
              : {
                  // We rotate the wrapper so the mote orbits around centre,
                  // and translate-x by the orbit radius so it stays on the
                  // ring. Counter-rotate the inner Icon so it doesn't tumble.
                  rotate: [baseAngle, baseAngle + 360]
                }
          }
          transition={{
            duration: dur,
            ease: 'linear',
            repeat: Infinity,
            delay
          }}
        >
          <span
            className="inline-flex items-center justify-center"
            style={{ transform: `translateX(${r}px)` }}
          >
            <motion.span
              animate={reduced ? undefined : { rotate: [-baseAngle, -baseAngle - 360] }}
              transition={{
                duration: dur,
                ease: 'linear',
                repeat: Infinity,
                delay
              }}
              className="inline-flex"
            >
              <Icon size={16} strokeWidth={2.6} />
            </motion.span>
          </span>
        </motion.span>
      ))}

      {/* Total XP badge floating bottom-right of crystal */}
      <div
        className="absolute -bottom-1 -right-2 inline-flex items-center gap-1 rounded-full border-[3px] bg-white px-2.5 py-1 text-[11px] font-black"
        style={{
          borderColor: palette.border,
          color: palette.ink,
          boxShadow: `0 3px 0 ${palette.border}`
        }}
      >
        <Sparkles size={11} strokeWidth={2.8} style={{ color: palette.ring }} />
        {Number(xp || 0).toLocaleString('ru-RU').replace(/\u00A0/g, ' ')} XP
      </div>
    </div>
  );
}
