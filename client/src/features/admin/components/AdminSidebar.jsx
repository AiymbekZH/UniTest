import { motion } from 'framer-motion';
import { BarChart3, Users, FileText, Flag, History } from 'lucide-react';

/**
 * AdminSidebar — chunky nav for the admin console.
 *
 * Mobile (<lg): horizontal sticky tab bar (visible icons + labels, fits
 *   on a 360-wide phone — buttons shrink to icons only on <380px).
 * Desktop (lg+): vertical chunky-pill rail.
 *
 * The sticky-on-mobile behaviour means the user never needs to scroll to
 * the top of the page to switch sections, fixing the "long list = lost
 * navigation" problem.
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
    <nav
      className="
        sticky top-2 z-20
        -mx-3 flex gap-1 overflow-x-auto border-b border-slate-200/60
        bg-[#FFF8EE]/90 px-3 py-2 backdrop-blur hide-scrollbar
        dark:border-slate-700/60 dark:bg-slate-900/85
        sm:-mx-0 sm:rounded-2xl sm:border sm:px-2
        lg:static lg:flex-col lg:gap-2 lg:overflow-visible
        lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-0
      "
    >
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
            className={`
              group relative inline-flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-2xl
              border-2 px-3 py-2 text-[12px] font-black transition-transform active:translate-y-[1px]
              sm:gap-2 sm:px-3.5 sm:py-2.5 sm:text-sm
              lg:border-[3px] lg:px-4
              ${
                isActive
                  ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }
            `}
            style={{
              boxShadow: isActive ? `0 3px 0 ${accent}` : '0 3px 0 #cbd5e1'
            }}
          >
            <Icon
              size={15}
              strokeWidth={2.6}
              className="flex-shrink-0"
              style={{ color: isActive ? undefined : accent }}
            />
            <span>{labels[key]}</span>
            {badge ? (
              <span
                className={`ml-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-black sm:ml-auto sm:h-5 sm:min-w-[20px] sm:px-1.5 sm:text-[10px] ${
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
