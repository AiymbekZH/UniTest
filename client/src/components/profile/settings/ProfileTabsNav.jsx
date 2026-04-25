import { motion } from 'framer-motion';

export default function ProfileTabsNav({ tabs, activeId, onChange }) {
  return (
    <>
      {/* Mobile: horizontal scrollable chunky pills (NO negative margins - bulletproof) */}
      <div className="lg:hidden sticky top-14 z-30 -mt-1 rounded-2xl border-2 border-slate-900 bg-white/95 backdrop-blur-sm dark:border-white dark:bg-slate-900/95" style={{ boxShadow: '0 3px 0 #0f172a' }}>
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto px-2 py-2 sm:gap-2 sm:px-3 sm:py-2.5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.id === activeId;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onChange(tab.id)}
                className={`flex-shrink-0 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border-2 px-3 py-2 text-[11px] font-black transition active:translate-y-[1px] sm:gap-2 sm:px-4 sm:py-2.5 sm:text-xs ${
                  isActive
                    ? 'border-slate-900 bg-primary-500 text-white dark:border-white'
                    : 'border-slate-900 bg-white text-slate-900 dark:border-white dark:bg-slate-800 dark:text-white'
                }`}
                style={{ boxShadow: isActive ? '0 3px 0 #9a3412' : '0 2px 0 #0f172a' }}
              >
                <Icon size={13} />
                <span>{tab.label}</span>
                {tab.badge ? (
                  <span className={`ml-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-black ${
                    isActive ? 'bg-white text-primary-600' : 'bg-red-500 text-white'
                  }`}>
                    {tab.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop: vertical sidebar */}
      <aside className="hidden lg:block">
        <div className="sticky top-24">
          <nav
            className="chunky-card overflow-hidden p-2"
            aria-label="Profile sections"
          >
            <ul className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = tab.id === activeId;
                return (
                  <li key={tab.id}>
                    <button
                      type="button"
                      onClick={() => onChange(tab.id)}
                      className={`group relative flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition ${
                        isActive
                          ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-200'
                          : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="profile-tab-indicator"
                          className="absolute inset-y-2 left-0 w-1 rounded-full bg-primary-500"
                          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                        />
                      )}
                      <span
                        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border-2 transition ${
                          isActive
                            ? 'border-primary-600 bg-primary-500 text-white'
                            : 'border-slate-200 bg-white text-slate-500 group-hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                        }`}
                      >
                        <Icon size={15} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-black tracking-tight">{tab.label}</span>
                        {tab.description ? (
                          <span className="mt-0.5 block truncate text-[11px] text-slate-400 dark:text-slate-500">
                            {tab.description}
                          </span>
                        ) : null}
                      </span>
                      {tab.badge ? (
                        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-black text-white">
                          {tab.badge}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </aside>
    </>
  );
}
