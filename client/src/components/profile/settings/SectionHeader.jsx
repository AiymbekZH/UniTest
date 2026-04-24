export default function SectionHeader({ eyebrow, title, subtitle, action }) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-100 pb-5 dark:border-slate-800 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? (
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-primary-500 dark:text-primary-300">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-1 text-2xl font-black tracking-tight text-dark sm:text-3xl">{title}</h2>
        {subtitle ? (
          <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
        ) : null}
      </div>
      {action ? <div className="flex items-center gap-2">{action}</div> : null}
    </div>
  );
}
