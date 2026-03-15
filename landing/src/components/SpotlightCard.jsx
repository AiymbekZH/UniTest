import { useRef, useCallback } from 'react';

/**
 * Card with mouse-tracking spotlight effect (like Vercel's cards).
 */
export default function SpotlightCard({ children, className = '', style = {}, as: Tag = 'div' }) {
  const ref = useRef(null);

  const handleMouseMove = useCallback((e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
    el.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
  }, []);

  return (
    <Tag
      ref={ref}
      className={`spotlight-card ${className}`}
      style={style}
      onMouseMove={handleMouseMove}
    >
      {children}
    </Tag>
  );
}
