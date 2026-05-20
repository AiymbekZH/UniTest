import { motion } from 'framer-motion';
import { BarChart3, Users, FileText, Flag, History } from 'lucide-react';

/**
 * AdminSidebar — vertical chunky-pill nav for the admin console.
 *
 * On mobile (<lg) the parent collapses it into a horizontally-scrollable
 * top bar; we just render the same buttons either way so layout decisions
 * are localised to the parent.
 */
export const ADMIN_SECTIONS = [
  { key: 'dashboard', icon: BarChart3, accent: '#0f172a' },
  { key: 'users',     icon: Users,     accent: '#0369a1' },
  { key: 'content',   icon: FileText,  accent: '#047857' },
  { key: 'reports',   icon: Flag,      accent: '#9f1239' },
  { key: 'audit',     icon: History,   accent: '#5b21b6' }
];

export default function AdminSidebar({ active, onChange, labels, badges = {} }) {
  return (
    <nav className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar lg:flex-col lg:gap-2 lg:overflow-visible lg:pb-0">
      {ADMIN_SECTIONS.map(({ key, icon: Icon, accent }, i) => {
        const isActive = active === key;
        const badge = badges[key];
        return (
          <motion.button
            key={key}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, delay: i * 0.04 }}
            type="button"
            onClick={() => onChange(key)}
            className={`group relative inline-flex items-center gap-2.5 whitespace-nowrap rounded-2xl border-[3px] px-4 py-2.5 text-sm font-black transition-transform active:translate-y-[2px] ${
              isActive
                ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900'
                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
            }`}
            style={{
              boxShadow: isActive ? `0 4px 0 ${accent}` : '0 4px 0 #cbd5e1'
            }}
          >
            <Icon
              size={16}
              strokeWidth={2.6}
              style={{ color: isActive ? undefined : accent }}
            />
            <span>{labels[key]}</span>
            {badge ? (
              <span
                className={`ml-auto inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-black ${
                  isActive ? 'bg-amber-400 text-slate-900' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
                }`}
              >
                {badge > 99 ? '99+' : badge}
              </span>
            ) : null}
          </motion.button>
        );
      })}
    </nav>
  );
}
