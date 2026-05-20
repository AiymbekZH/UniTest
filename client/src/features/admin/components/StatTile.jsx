import { motion } from 'framer-motion';
import AnimatedCounter from '../../../components/AnimatedCounter';

/**
 * StatTile — chunky KPI tile used across admin sections.
 * Optional `tone` lets the tile change shadow color on hover.
 */
const TONE_SHADOWS = {
  slate: '0 6px 0 #0f172a',
  amber: '0 6px 0 #92400e',
  emerald: '0 6px 0 #065f46',
  rose: '0 6px 0 #881337',
  violet: '0 6px 0 #4c1d95',
  sky: '0 6px 0 #075985'
};

export default function StatTile({ icon: Icon, label, value, tone = 'slate', accent }) {
  const shadow = TONE_SHADOWS[tone] || TONE_SHADOWS.slate;
  const iconColor = accent || {
    slate: '#0f172a',
    amber: '#b45309',
    emerald: '#047857',
    rose: '#be123c',
    violet: '#6d28d9',
    sky: '#0284c7'
  }[tone];

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ type: 'spring', stiffness: 320, damping: 22 }}
      className="rounded-2xl border-[3px] border-slate-900 bg-white p-4 dark:border-white dark:bg-slate-900"
      style={{ boxShadow: '0 4px 0 #0f172a' }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = shadow; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 4px 0 #0f172a'; }}
    >
      {Icon ? (
        <Icon size={16} strokeWidth={2.6} style={{ color: iconColor }} />
      ) : null}
      <p className="mt-3 font-mono text-2xl font-black tracking-tight text-slate-900 dark:text-white">
        {typeof value === 'number' ? <AnimatedCounter value={value} duration={0.9} /> : value}
      </p>
      <p className="mt-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>
    </motion.div>
  );
}
