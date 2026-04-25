import { useEffect, useRef } from 'react';
import { Flame } from 'lucide-react';
import AnimatedIcon from './AnimatedIcon';

/**
 * Reusable animated flame icon. Intensity scales with streak value:
 *  - streak === 0:  static flame (lucide icon)
 *  - streak 1-3:    gentle animation (1x speed for video, flame-flicker for fallback)
 *  - streak >= 4:   intense animation (1.5x speed for video, flame-flicker-strong for fallback)
 *
 * Source priority (auto-detected at build time via Vite):
 *  1. src/assets/flame/flame.webm  (best — supports alpha transparency, scales speed)
 *  2. src/assets/flame/flame.mp4   (no transparency on most browsers)
 *  3. src/assets/flame/flame.gif   (supports transparency; can't change playback speed)
 *  4. src/assets/flame/flame.webp  (animated webp; supports transparency)
 *  5. Lucide Flame + framer-motion (built-in fallback if no asset present)
 *
 * Respects prefers-reduced-motion: shows static icon when reduce-motion is enabled.
 */

// Vite static analysis requires a literal glob pattern.
const videoModules = import.meta.glob('../assets/flame/flame.{webm,mp4}', {
  eager: true,
  import: 'default',
  query: '?url'
});
const imageModules = import.meta.glob('../assets/flame/flame.{gif,webp,apng,png}', {
  eager: true,
  import: 'default',
  query: '?url'
});
const videoSrc = Object.values(videoModules)[0] || null;
const imageSrc = Object.values(imageModules)[0] || null;

const prefersReducedMotion =
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Raster/video assets read visually smaller than stroke-based vector icons of the same px size,
// so we upscale them to match the visual weight of the surrounding UI text.
const RASTER_SIZE_MULTIPLIER = 1.6;

export default function AnimatedFlame({ streak = 0, size = 14, className = '' }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = streak >= 4 ? 1.5 : 1;
  }, [streak]);

  // Static fallback for streak === 0 or reduced-motion users
  if (streak === 0 || prefersReducedMotion) {
    return <Flame size={size} className={className} />;
  }

  // Custom video asset present → render <video>
  if (videoSrc) {
    const px = Math.round(size * RASTER_SIZE_MULTIPLIER);
    return (
      <video
        ref={videoRef}
        src={videoSrc}
        muted
        loop
        autoPlay
        playsInline
        aria-hidden="true"
        className={`inline-block shrink-0 align-middle ${className}`}
        style={{ width: px, height: px, objectFit: 'contain' }}
      />
    );
  }

  // Custom GIF/WebP/APNG asset present → render <img>
  if (imageSrc) {
    const px = Math.round(size * RASTER_SIZE_MULTIPLIER);
    return (
      <img
        src={imageSrc}
        alt=""
        aria-hidden="true"
        className={`inline-block shrink-0 align-middle ${className}`}
        style={{ width: px, height: px, objectFit: 'contain' }}
      />
    );
  }

  // Built-in fallback → framer-motion flame flicker
  const preset = streak >= 4 ? 'flame-flicker-strong' : 'flame-flicker';
  return (
    <AnimatedIcon
      icon={Flame}
      size={size}
      iconClassName={className}
      preset={preset}
      active
      hover={false}
    />
  );
}
