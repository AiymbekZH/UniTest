export default function SectionHeader({ eyebrow, title, subtitle, action }) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 dark:border-slate-800 sm:flex-row sm:items-end sm:justify-between sm:pb-5">
      <div className="min-w-0 flex-1">
        {eyebrow ? (
          <p className="truncate text-[10px] font-black uppercase tracking-[0.18em] text-primary-500 dark:text-primary-300 sm:text-[11px]">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-1 break-words text-xl font-black tracking-tight text-dark sm:text-3xl">{title}</h2>
        {subtitle ? (
          <p className="mt-1 max-w-2xl break-words text-xs text-slate-500 dark:text-slate-400 sm:text-sm">{subtitle}</p>
        ) : null}
      </div>
      {action ? <div className="flex flex-shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  );
}
