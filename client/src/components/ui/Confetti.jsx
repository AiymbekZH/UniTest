import { useEffect, useRef } from 'react';

/**
 * Lightweight canvas confetti (no glow / blur).
 * Emits ~120 solid-color particles from top that fall with gravity.
 */
const COLORS = ['#F97316', '#EF4444', '#10B981', '#3B82F6', '#F59E0B', '#111827'];

export default function Confetti({ active = true, duration = 2400, count = 120 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!active) return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    let raf = 0;
    let stopped = false;
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    const resize = () => {
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const particles = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.clientWidth,
      y: -10 - Math.random() * 60,
      vx: (Math.random() - 0.5) * 2,
      vy: 2 + Math.random() * 3,
      size: 6 + Math.random() * 6,
      rot: Math.random() * Math.PI * 2,
      vrot: (Math.random() - 0.5) * 0.2,
      color: COLORS[Math.floor(Math.random() * COLORS.length)]
    }));

    const startedAt = performance.now();

    const loop = (now) => {
      if (stopped) return;
      const elapsed = now - startedAt;
      ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.08;
        p.rot += p.vrot;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.5);
        ctx.restore();
      });
      if (elapsed < duration + 1500) {
        raf = requestAnimationFrame(loop);
      }
    };
    raf = requestAnimationFrame(loop);

    const stopTimer = setTimeout(() => { stopped = true; }, duration + 1500);

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      clearTimeout(stopTimer);
      window.removeEventListener('resize', resize);
    };
  }, [active, duration, count]);

  if (!active) return null;
  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-40 h-full w-full"
      aria-hidden
    />
  );
}
