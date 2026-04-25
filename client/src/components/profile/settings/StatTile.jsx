const TONE_MAP = {
  primary: { bg: 'bg-primary-50 dark:bg-primary-900/20', fg: 'text-primary-600 dark:text-primary-300', shadow: '#9a3412' },
  amber:   { bg: 'bg-amber-50 dark:bg-amber-900/20',     fg: 'text-amber-600 dark:text-amber-300',     shadow: '#78350f' },
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', fg: 'text-emerald-600 dark:text-emerald-300', shadow: '#065f46' },
  blue:    { bg: 'bg-blue-50 dark:bg-blue-900/20',       fg: 'text-blue-600 dark:text-blue-300',       shadow: '#1e3a8a' }
};

export default function StatTile({ icon: Icon, label, value, tone = 'primary' }) {
  const t = TONE_MAP[tone] || TONE_MAP.primary;
  return (
    <div
      className="min-w-0 rounded-xl border-2 border-slate-900 bg-white p-2.5 sm:rounded-2xl sm:p-4 dark:border-white dark:bg-slate-900"
      style={{ boxShadow: `0 3px 0 ${t.shadow}` }}
    >
      <div className={`inline-flex h-7 w-7 items-center justify-center rounded-lg sm:h-10 sm:w-10 sm:rounded-xl ${t.bg} ${t.fg}`}>
        <Icon size={14} className="sm:hidden" />
        <Icon size={18} className="hidden sm:block" />
      </div>
      <p className="mt-1.5 truncate font-mono text-lg font-black tracking-tight text-dark dark:text-white sm:mt-3 sm:text-2xl">{value}</p>
      <p className="mt-0.5 break-words text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 sm:text-[11px] sm:tracking-widest">{label}</p>
    </div>
  );
}
