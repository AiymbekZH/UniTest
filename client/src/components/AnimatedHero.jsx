import { motion, useReducedMotion } from 'framer-motion';

/**
 * AnimatedHero — reusable premium hero banner with SVG background animations.
 *
 * Presets:
 *  - chunky  — neobrutalism: solid ink (slate-900), chunky decor shapes, no glow (DEFAULT)
 *  - paper   — cream paper with hand-drawn dots/grid, dark text (light alt for chunky)
 *  - aurora  — warm orange/amber blobs on soft mesh (legacy, kept for compatibility)
 *  - mesh    — dark gradient mesh with dot grid + animated lines (AdminPanel)
 *  - gold    — radial gold rays + floating stars (Leaderboard, TestResults)
 *  - grid    — light grid 40×40 with floating squares (Groups, TestProfile)
 *  - neon    — neon orange waves on near-black (Arena)
 *
 * Heights:
 *  - sm: 180px (compact)
 *  - md: 240px (default)
 *  - lg: 320px (spacious)
 */

const HEIGHT_CLASSES = {
  sm: 'min-h-[180px]',
  md: 'min-h-[240px]',
  lg: 'min-h-[320px]'
};

const PRESET_BG = {
  chunky:
    // Solid deep slate ink — no gradient, no glow. Fits chunky-card visual language.
    'bg-slate-900',
  paper:
    // Warm cream paper, matches chunky-card-cream identity.
    'bg-[#FFF8EE]',
  aurora:
    'bg-[linear-gradient(135deg,#fff7ed_0%,#fdba74_32%,#fb923c_58%,#fef3c7_100%)]',
  mesh:
    'bg-[radial-gradient(circle_at_20%_20%,rgba(249,115,22,0.28),transparent_38%),radial-gradient(circle_at_80%_30%,rgba(30,41,59,0.35),transparent_40%),linear-gradient(135deg,#0f172a_0%,#1e293b_55%,#0f172a_100%)]',
  gold:
    'bg-[radial-gradient(circle_at_50%_40%,rgba(253,224,71,0.45),transparent_50%),linear-gradient(135deg,#fffbea_0%,#fde68a_40%,#fcd34d_70%,#fef3c7_100%)]',
  grid:
    'bg-[linear-gradient(135deg,#fffaf4_0%,#ffedd5_50%,#fde68a_100%)]',
  neon:
    'bg-[radial-gradient(circle_at_30%_20%,rgba(249,115,22,0.22),transparent_40%),radial-gradient(circle_at_80%_70%,rgba(245,158,11,0.14),transparent_45%),linear-gradient(135deg,#0a0a0b_0%,#111113_100%)]'
};

const TEXT_TONE = {
  chunky: 'text-white',
  paper: 'text-slate-900',
  aurora: 'text-slate-900',
  mesh: 'text-white',
  gold: 'text-slate-900',
  grid: 'text-slate-900',
  neon: 'text-white'
};

const SUBTITLE_TONE = {
  chunky: 'text-white/75',
  paper: 'text-slate-700/85',
  aurora: 'text-slate-700/80',
  mesh: 'text-white/75',
  gold: 'text-slate-700/80',
  grid: 'text-slate-600/85',
  neon: 'text-white/70'
};

const EYEBROW_TONE = {
  chunky: 'text-amber-300',
  paper: 'text-amber-700/85',
  aurora: 'text-primary-700/80',
  mesh: 'text-primary-300',
  gold: 'text-amber-700/80',
  grid: 'text-primary-600/80',
  neon: 'text-primary-300'
};

/* ───────────────────── Preset SVG layers ───────────────────── */

function AuroraLayer({ still }) {
  const anim = still ? {} : { x: [0, 28, 0], y: [0, -14, 0] };
  const anim2 = still ? {} : { x: [0, -22, 0], y: [0, 18, 0] };
  const anim3 = still ? {} : { x: [0, 14, 0], y: [0, -10, 0] };
  return (
    <div className="absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute -left-16 top-6 h-52 w-52 rounded-full bg-white/40 blur-3xl"
        animate={anim}
        transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute right-6 top-10 h-56 w-56 rounded-full bg-orange-300/30 blur-3xl"
        animate={anim2}
        transition={{ duration: 13, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -bottom-10 left-1/3 h-52 w-52 rounded-full bg-amber-200/30 blur-3xl"
        animate={anim3}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}

function MeshLayer({ still }) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            'radial-gradient(circle, rgba(255,255,255,0.55) 1px, transparent 1px)',
          backgroundSize: '22px 22px'
        }}
      />
      <svg
        className="absolute inset-0 h-full w-full opacity-80"
        viewBox="0 0 1200 400"
        preserveAspectRatio="none"
      >
        <motion.path
          d="M0,180 C240,120 380,280 620,210 C840,148 970,60 1200,130"
          fill="none"
          stroke="rgba(249,115,22,0.55)"
          strokeWidth="2"
          animate={
            still
              ? undefined
              : {
                  d: [
                    'M0,180 C240,120 380,280 620,210 C840,148 970,60 1200,130',
                    'M0,168 C230,108 392,290 630,200 C852,144 966,76 1200,140',
                    'M0,180 C240,120 380,280 620,210 C840,148 970,60 1200,130'
                  ]
                }
          }
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.path
          d="M0,320 C210,280 360,200 520,240 C680,280 820,360 1000,320 C1110,296 1160,272 1200,280"
          fill="none"
          stroke="rgba(255,255,255,0.28)"
          strokeDasharray="6 10"
          strokeWidth="1.5"
          animate={
            still
              ? undefined
              : {
                  d: [
                    'M0,320 C210,280 360,200 520,240 C680,280 820,360 1000,320 C1110,296 1160,272 1200,280',
                    'M0,310 C220,272 370,210 530,248 C690,284 830,348 1010,314 C1116,292 1158,276 1200,284',
                    'M0,320 C210,280 360,200 520,240 C680,280 820,360 1000,320 C1110,296 1160,272 1200,280'
                  ]
                }
          }
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        />
      </svg>
      <motion.div
        className="absolute -right-20 top-[-6rem] h-64 w-64 rounded-full bg-primary-500/20 blur-3xl"
        animate={still ? undefined : { x: [0, -24, 0], y: [0, 16, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}

function GoldLayer({ still }) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Rays */}
      <svg
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-60"
        width="1400"
        height="700"
        viewBox="0 0 1400 700"
      >
        {Array.from({ length: 10 }).map((_, i) => {
          const angle = (360 / 10) * i;
          return (
            <motion.rect
              key={i}
              x="695"
              y="0"
              width="10"
              height="700"
              rx="4"
              fill="url(#goldRayGradient)"
              style={{ transformOrigin: '700px 350px' }}
              animate={still ? undefined : { rotate: [angle, angle + 8, angle] }}
              transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: i * 0.1 }}
              transform={`rotate(${angle} 700 350)`}
            />
          );
        })}
        <defs>
          <linearGradient id="goldRayGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fcd34d" stopOpacity="0" />
            <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#fcd34d" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
      {/* Stars */}
      {[
        { top: '15%', left: '10%', size: 6, delay: 0 },
        { top: '30%', right: '12%', size: 4, delay: 0.5 },
        { top: '60%', left: '18%', size: 5, delay: 1 },
        { bottom: '18%', right: '20%', size: 6, delay: 1.5 },
        { top: '25%', left: '42%', size: 3, delay: 0.3 },
        { bottom: '25%', left: '55%', size: 4, delay: 2 }
      ].map((s, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-amber-400"
          style={{
            top: s.top,
            bottom: s.bottom,
            left: s.left,
            right: s.right,
            width: s.size,
            height: s.size,
            boxShadow: '0 0 10px rgba(251,191,36,0.7)'
          }}
          animate={still ? undefined : { opacity: [0.3, 1, 0.3], scale: [1, 1.3, 1] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut', delay: s.delay }}
        />
      ))}
    </div>
  );
}

function GridLayer({ still }) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(249,115,22,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(249,115,22,0.08) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(circle at center, black 60%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(circle at center, black 60%, transparent 100%)'
        }}
      />
      <motion.div
        className="absolute left-[8%] top-[22%] h-20 w-20 rounded-2xl border border-white/60 bg-white/45 backdrop-blur-xl"
        animate={still ? undefined : { y: [0, -12, 0], rotate: [0, -4, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute right-[10%] top-[18%] h-16 w-16 rounded-2xl border border-orange-200/70 bg-orange-200/35 backdrop-blur-xl"
        animate={still ? undefined : { y: [0, 14, 0], rotate: [0, 5, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute left-[58%] bottom-[20%] h-14 w-14 rounded-xl border border-amber-200/60 bg-amber-100/35 backdrop-blur-xl"
        animate={still ? undefined : { x: [0, 16, 0], y: [0, -10, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}

function NeonLayer({ still }) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(249,115,22,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(249,115,22,0.5) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(circle at center, black 40%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(circle at center, black 40%, transparent 100%)'
        }}
      />
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1200 400"
        preserveAspectRatio="none"
      >
        <motion.path
          d="M0,220 C200,180 380,280 620,220 C820,170 950,100 1200,160"
          fill="none"
          stroke="rgba(249,115,22,0.7)"
          strokeWidth="2.5"
          filter="url(#glow)"
          animate={
            still
              ? undefined
              : {
                  d: [
                    'M0,220 C200,180 380,280 620,220 C820,170 950,100 1200,160',
                    'M0,210 C210,172 390,290 630,210 C830,164 960,108 1200,170',
                    'M0,220 C200,180 380,280 620,220 C820,170 950,100 1200,160'
                  ]
                }
          }
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>
      <motion.div
        className="absolute right-[-6rem] bottom-[-6rem] h-64 w-64 rounded-full bg-primary-500/22 blur-3xl"
        animate={still ? undefined : { x: [0, -22, 0], y: [0, -14, 0] }}
        transition={{ duration: 13, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}

/* ───────────────── Chunky preset (default, neobrutalism) ───────────────── */

/**
 * ChunkyLayer — fits the chunky-card visual language:
 *   - Solid deep slate ink background (handled by PRESET_BG).
 *   - Static-ish geometric shapes with thick borders and offset shadows.
 *   - Subtle grain via dotted SVG pattern.
 *   - Tiny parallax drift (x ± 4-6 px) so it breathes without feeling neon.
 */
function ChunkyLayer({ still }) {
  const driftA = still ? {} : { x: [0, 5, 0], y: [0, -4, 0] };
  const driftB = still ? {} : { x: [0, -4, 0], y: [0, 6, 0] };
  const driftC = still ? {} : { rotate: [0, 6, 0], y: [0, -3, 0] };
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Subtle dot grain */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)',
          backgroundSize: '22px 22px'
        }}
      />
      {/* Diagonal lines, very subtle */}
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(135deg, rgba(255,255,255,0.6) 0 1px, transparent 1px 14px)'
        }}
      />

      {/* Chunky decor: outline circle, top-right */}
      <motion.div
        className="absolute right-[-2rem] top-[-2rem] h-40 w-40 rounded-full border-[6px] border-amber-300/85"
        style={{ boxShadow: '0 8px 0 rgba(217, 119, 6, 0.35)' }}
        animate={driftA}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Chunky decor: filled square, bottom-left */}
      <motion.div
        className="absolute -left-6 -bottom-6 h-28 w-28 rotate-12 rounded-2xl border-[5px] border-white/95 bg-amber-400/85"
        style={{ boxShadow: '0 8px 0 rgba(15, 23, 42, 0.45)' }}
        animate={driftB}
        transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Chunky decor: small star/rotor, mid */}
      <motion.svg
        className="absolute right-[18%] bottom-[12%] h-12 w-12"
        viewBox="0 0 100 100"
        animate={driftC}
        transition={{ duration: 13, repeat: Infinity, ease: 'easeInOut' }}
      >
        <path
          d="M50 4 L60 38 L96 40 L66 60 L78 96 L50 76 L22 96 L34 60 L4 40 L40 38 Z"
          fill="rgba(252, 211, 77, 0.9)"
          stroke="rgba(15, 23, 42, 0.85)"
          strokeWidth="4"
          strokeLinejoin="round"
        />
      </motion.svg>

      {/* Chunky decor: dotted line, top-left */}
      <svg
        className="absolute left-6 top-10 h-16 w-32 opacity-70"
        viewBox="0 0 200 80"
      >
        <path
          d="M0 60 Q 50 0, 100 50 T 200 30"
          fill="none"
          stroke="rgba(252, 211, 77, 0.65)"
          strokeWidth="3"
          strokeDasharray="4 8"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

/* ───────────────── Paper preset (light, cream alt) ───────────────── */

/**
 * PaperLayer — cream paper variant in chunky language.
 * Same shapes, lighter ink-on-paper feel, dark text.
 */
function PaperLayer({ still }) {
  const driftA = still ? {} : { x: [0, 5, 0], y: [0, -4, 0] };
  const driftB = still ? {} : { x: [0, -4, 0], y: [0, 6, 0] };
  const driftC = still ? {} : { rotate: [0, 6, 0], y: [0, -3, 0] };
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Paper grain */}
      <div
        className="absolute inset-0 opacity-[0.10]"
        style={{
          backgroundImage:
            'radial-gradient(circle, rgba(15,23,42,0.5) 1px, transparent 1px)',
          backgroundSize: '22px 22px'
        }}
      />
      <motion.div
        className="absolute right-[-2rem] top-[-2rem] h-40 w-40 rounded-full border-[6px] border-amber-500/55"
        style={{ boxShadow: '0 8px 0 rgba(146, 64, 14, 0.18)' }}
        animate={driftA}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -left-6 -bottom-6 h-28 w-28 rotate-12 rounded-2xl border-[5px] border-slate-900 bg-amber-200"
        style={{ boxShadow: '0 8px 0 rgba(15, 23, 42, 0.45)' }}
        animate={driftB}
        transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.svg
        className="absolute right-[18%] bottom-[12%] h-12 w-12"
        viewBox="0 0 100 100"
        animate={driftC}
        transition={{ duration: 13, repeat: Infinity, ease: 'easeInOut' }}
      >
        <path
          d="M50 4 L60 38 L96 40 L66 60 L78 96 L50 76 L22 96 L34 60 L4 40 L40 38 Z"
          fill="rgba(245, 158, 11, 0.9)"
          stroke="rgba(15, 23, 42, 0.85)"
          strokeWidth="4"
          strokeLinejoin="round"
        />
      </motion.svg>
    </div>
  );
}

const LAYERS = {
  chunky: ChunkyLayer,
  paper: PaperLayer,
  aurora: AuroraLayer,
  mesh: MeshLayer,
  gold: GoldLayer,
  grid: GridLayer,
  neon: NeonLayer
};

/* ───────────────────── Main component ───────────────────── */

export default function AnimatedHero({
  preset = 'paper',
  height = 'md',
  title,
  subtitle,
  eyebrow,
  icon,
  actions,
  stats,
  children,
  className = '',
  contentClassName = ''
}) {
  const reduced = useReducedMotion();
  const Layer = LAYERS[preset] || LAYERS.paper;
  const bg = PRESET_BG[preset] || PRESET_BG.paper;
  const textTone = TEXT_TONE[preset] || TEXT_TONE.paper;
  const subTone = SUBTITLE_TONE[preset] || SUBTITLE_TONE.paper;
  const eyeTone = EYEBROW_TONE[preset] || EYEBROW_TONE.paper;

  const isChunky = preset === 'chunky' || preset === 'paper';
  const containerBorder = isChunky
    ? 'border-[3px] border-slate-900 dark:border-white'
    : 'border border-white/60 dark:border-slate-700/60';
  const containerShadow = isChunky ? { boxShadow: '0 8px 0 #0f172a' } : undefined;

  return (
    <div
      className={`relative overflow-hidden rounded-3xl ${containerBorder} ${bg} ${HEIGHT_CLASSES[height]} ${className}`}
      style={containerShadow}
    >
      <Layer still={reduced} />

      {/* Soft overlay for readability on lighter presets */}
      {preset === 'aurora' || preset === 'grid' || preset === 'gold' ? (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/0 via-white/0 to-white/20" />
      ) : null}

      {/* Chunky preset gets a thick neobrutalism border + offset shadow that matches chunky-card. */}
      {preset === 'chunky' || preset === 'paper' ? null : null}

      <div
        className={`relative z-10 flex h-full flex-col justify-between gap-5 p-6 sm:p-8 ${contentClassName}`}
      >
        {/* Top: eyebrow + actions */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {icon ? (
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                  preset === 'mesh' || preset === 'neon'
                    ? 'border border-white/20 bg-white/10 text-white backdrop-blur-xl'
                    : preset === 'chunky'
                      ? 'border-[3px] border-amber-300 bg-slate-800 text-amber-300'
                      : preset === 'paper'
                        ? 'border-[3px] border-slate-900 bg-amber-200 text-slate-900'
                        : 'border border-white/70 bg-white/90 text-primary-600 shadow-sm'
                }`}
              >
                {icon}
              </div>
            ) : null}
            {eyebrow ? (
              <p
                className={`text-[11px] font-semibold uppercase tracking-widest ${eyeTone}`}
              >
                {eyebrow}
              </p>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>

        {/* Middle: title + subtitle or custom children */}
        {children ? (
          <div className="flex-1">{children}</div>
        ) : (
          <div className="min-w-0">
            {title ? (
              <h1 className={`text-2xl font-bold tracking-tight sm:text-3xl ${textTone}`}>
                {title}
              </h1>
            ) : null}
            {subtitle ? (
              <p className={`mt-2 max-w-2xl text-sm sm:text-base ${subTone}`}>{subtitle}</p>
            ) : null}
          </div>
        )}

        {/* Bottom: stats pills (chunky) */}
        {Array.isArray(stats) && stats.length > 0 ? (
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {stats.map((stat, i) => {
              const isDark = preset === 'mesh' || preset === 'neon' || preset === 'chunky';
              const isPaper = preset === 'paper';
              return (
                <div
                  key={stat.label || i}
                  className={`inline-flex items-center gap-2 rounded-2xl border-[3px] px-3 py-2 sm:px-4 sm:py-2.5 ${
                    isPaper
                      ? 'border-slate-900 bg-white text-slate-900'
                      : isDark
                        ? 'border-white bg-slate-800 text-white'
                        : 'border-slate-900 bg-white text-slate-900 dark:border-white dark:bg-slate-900 dark:text-slate-100'
                  }`}
                  style={{
                    boxShadow:
                      isPaper
                        ? '0 4px 0 #0f172a'
                        : isDark
                          ? '0 4px 0 rgba(252, 211, 77, 0.7)'
                          : '0 3px 0 #0f172a'
                  }}
                >
                  {stat.icon ? (
                    <span
                      className={
                        isPaper
                          ? 'text-amber-600'
                          : isDark
                            ? 'text-amber-300'
                            : 'text-primary-500'
                      }
                    >
                      {stat.icon}
                    </span>
                  ) : null}
                  <div className="leading-tight">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60">
                      {stat.label}
                    </p>
                    <p className="font-mono text-sm font-black">{stat.value}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
