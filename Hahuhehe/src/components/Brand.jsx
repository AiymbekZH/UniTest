export default function Brand({ compact = false }) {
  return (
    <div className={`brand ${compact ? 'brand-compact' : ''}`}>
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <defs>
          <linearGradient id="brand-ink" x1="28" y1="20" x2="72" y2="98" gradientUnits="userSpaceOnUse">
            <stop stopColor="var(--ink-soft)" />
            <stop offset="1" stopColor="var(--ink)" />
          </linearGradient>
          <linearGradient id="brand-accent" x1="45" y1="52" x2="101" y2="92" gradientUnits="userSpaceOnUse">
            <stop stopColor="var(--accent)" />
            <stop offset="1" stopColor="var(--accent-bright)" />
          </linearGradient>
        </defs>
        <path d="M36 28V71C36 86.464 48.536 99 64 99C79.464 99 92 86.464 92 71V60.5" stroke="url(#brand-ink)" strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" />
        <path className="brand-check" d="M49 58L63 72L98 36" stroke="url(#brand-accent)" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {!compact && (
        <div>
          <strong>UniTest</strong>
          <span>Product prototype</span>
        </div>
      )}
    </div>
  );
}
