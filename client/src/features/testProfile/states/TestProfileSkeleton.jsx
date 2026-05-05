// Full-page skeleton for the TestProfile shell. Renders the same
// layout grid as the real page so the content doesn't jump on load
// transition (CLS = 0). Uses Tailwind's animate-pulse on skeleton
// tiles — no shimmer wrapper, no dependencies.

function Pulse({ className = '' }) {
  return <div className={`animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-700 ${className}`} />;
}

export default function TestProfileSkeleton() {
  return (
    <main className="mx-auto max-w-5xl px-4 pb-24 pt-4 sm:px-6 sm:pt-6">
      {/* Back button */}
      <Pulse className="mb-5 h-9 w-24 rounded-xl" />

      {/* Hero */}
      <div className="chunky-card mb-6 overflow-hidden p-0">
        <Pulse className="aspect-[16/9] w-full rounded-none" />
        <div className="space-y-3 p-5 sm:p-6">
          <Pulse className="h-6 w-2/3 rounded-xl" />
          <Pulse className="h-4 w-full rounded-lg" />
          <Pulse className="h-4 w-3/4 rounded-lg" />
          <div className="flex flex-wrap gap-2 pt-2">
            <Pulse className="h-7 w-20 rounded-full" />
            <Pulse className="h-7 w-16 rounded-full" />
            <Pulse className="h-7 w-24 rounded-full" />
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <div className="chunky-card p-5">
            <Pulse className="mb-3 h-5 w-40 rounded-lg" />
            <Pulse className="h-3 w-full rounded-full" />
          </div>
          <div className="chunky-card p-5">
            <Pulse className="mb-3 h-5 w-32 rounded-lg" />
            <div className="flex flex-wrap gap-2">
              <Pulse className="h-7 w-24 rounded-full" />
              <Pulse className="h-7 w-20 rounded-full" />
              <Pulse className="h-7 w-28 rounded-full" />
            </div>
          </div>
          <div className="chunky-card p-5">
            <Pulse className="mb-3 h-5 w-28 rounded-lg" />
            <Pulse className="h-28 w-full rounded-xl" />
          </div>
        </div>
        <div className="space-y-5">
          <div className="chunky-card p-5">
            <Pulse className="mb-4 h-12 w-full rounded-2xl" />
            <Pulse className="mb-2 h-10 w-full rounded-xl" />
            <Pulse className="h-10 w-full rounded-xl" />
          </div>
          <div className="chunky-card p-5">
            <Pulse className="mb-3 h-5 w-28 rounded-lg" />
            <div className="space-y-2">
              <Pulse className="h-10 w-full rounded-xl" />
              <Pulse className="h-10 w-full rounded-xl" />
              <Pulse className="h-10 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
