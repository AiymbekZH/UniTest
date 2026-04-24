import { motion } from 'framer-motion';

/**
 * Chunky tile button for answer options (Arena / Take test).
 * Has hard drop-shadow that collapses on active.
 */
const COLOR_MAP = {
  red:     { bg: '#EF4444', shadow: '#7f1d1d' },
  blue:    { bg: '#3B82F6', shadow: '#1e3a8a' },
  amber:   { bg: '#F59E0B', shadow: '#92400e' },
  emerald: { bg: '#10B981', shadow: '#064e3b' },
  slate:   { bg: '#1f2937', shadow: '#020617' },
  primary: { bg: '#F97316', shadow: '#9a3412' }
};

export default function ChunkyTile({
  color = 'red',
  children,
  className = '',
  active = false,
  reveal = null, // null | 'correct' | 'wrong' | 'dim'
  onClick,
  disabled,
  motionProps = {},
  ...rest
}) {
  const c = COLOR_MAP[color] || COLOR_MAP.red;

  const revealCls = reveal === 'correct'
    ? 'ring-[6px] ring-white'
    : reveal === 'wrong'
      ? 'opacity-60 ring-[4px] ring-red-300'
      : reveal === 'dim'
        ? 'opacity-35 grayscale'
        : active
          ? 'ring-[6px] ring-white'
          : '';

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileTap={disabled ? undefined : { y: 4 }}
      className={`chunky-tile text-white ${revealCls} ${className}`}
      style={{ background: c.bg, boxShadow: `0 8px 0 ${c.shadow}` }}
      {...motionProps}
      {...rest}
    >
      {children}
    </motion.button>
  );
}
