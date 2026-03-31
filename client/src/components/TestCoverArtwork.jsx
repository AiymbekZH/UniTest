import { useId } from 'react';
import { motion } from 'framer-motion';

function AnimatedPlaceholder({ title = '', showCaption = true }) {
  const uid = useId().replace(/:/g, '-');
  const gradientId = `cover-gradient-${uid}`;
  const glowPrimaryId = `cover-glow-primary-${uid}`;
  const glowSecondaryId = `cover-glow-secondary-${uid}`;
  const patternId = `cover-pattern-${uid}`;
  const maskId = `cover-mask-${uid}`;
  const initial = title?.trim()?.[0]?.toUpperCase() || 'U';

  return (
    <>
      <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f8fbff" />
            <stop offset="35%" stopColor="#dbeafe" />
            <stop offset="68%" stopColor="#c4b5fd" />
            <stop offset="100%" stopColor="#c7f9e6" />
          </linearGradient>
          <radialGradient id={glowPrimaryId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={glowSecondaryId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
          </radialGradient>
          <pattern id={patternId} width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M48 0H0V48" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
          </pattern>
          <mask id={maskId}>
            <rect width="1600" height="900" rx="48" fill="white" />
          </mask>
        </defs>

        <rect width="1600" height="900" fill={`url(#${gradientId})`} />
        <rect width="1600" height="900" fill={`url(#${patternId})`} opacity="0.45" />

        <g mask={`url(#${maskId})`}>
          <circle cx="1260" cy="200" r="340" fill={`url(#${glowPrimaryId})`}>
            <animate attributeName="cx" values="1260;1180;1260" dur="14s" repeatCount="indefinite" />
            <animate attributeName="cy" values="200;280;200" dur="17s" repeatCount="indefinite" />
          </circle>
          <circle cx="340" cy="710" r="360" fill={`url(#${glowSecondaryId})`}>
            <animate attributeName="cx" values="340;450;340" dur="16s" repeatCount="indefinite" />
            <animate attributeName="cy" values="710;620;710" dur="19s" repeatCount="indefinite" />
          </circle>

          <g opacity="0.5">
            <path
              d="M-20 620C180 520 280 740 510 640C700 556 820 318 1010 360C1180 398 1228 642 1410 630C1512 623 1568 560 1620 510"
              fill="none"
              stroke="rgba(255,255,255,0.75)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray="16 18"
            >
              <animate attributeName="stroke-dashoffset" values="0;-102" dur="10s" repeatCount="indefinite" />
            </path>
            <path
              d="M-40 320C152 240 282 416 472 372C636 334 724 178 922 184C1136 190 1212 454 1410 442C1496 436 1554 390 1640 334"
              fill="none"
              stroke="rgba(99,102,241,0.32)"
              strokeWidth="12"
              strokeLinecap="round"
            />
          </g>

          <g>
            <rect x="168" y="186" width="328" height="188" rx="32" fill="rgba(255,255,255,0.44)">
              <animate attributeName="y" values="186;168;186" dur="9s" repeatCount="indefinite" />
            </rect>
            <rect x="1032" y="128" width="280" height="162" rx="30" fill="rgba(255,255,255,0.32)">
              <animate attributeName="y" values="128;154;128" dur="11s" repeatCount="indefinite" />
            </rect>
            <rect x="930" y="548" width="380" height="188" rx="34" fill="rgba(255,255,255,0.36)">
              <animate attributeName="x" values="930;954;930" dur="12s" repeatCount="indefinite" />
            </rect>
          </g>

          <g transform="translate(192 570)">
            <rect width="310" height="168" rx="28" fill="rgba(255,255,255,0.84)" />
            <rect x="28" y="32" width="124" height="18" rx="9" fill="rgba(99,102,241,0.18)" />
            <rect x="28" y="74" width="190" height="22" rx="11" fill="rgba(15,23,42,0.14)" />
            <rect x="28" y="110" width="244" height="18" rx="9" fill="rgba(15,23,42,0.08)" />
            <circle cx="252" cy="44" r="28" fill="rgba(99,102,241,0.14)" />
            <text x="252" y="51" textAnchor="middle" fontSize="28" fontWeight="700" fill="#4f46e5">
              {initial}
            </text>
          </g>
        </g>
      </svg>

      {showCaption && (
        <div className="absolute inset-x-4 bottom-4 sm:inset-x-5 sm:bottom-5">
          <div className="inline-flex max-w-[82%] items-center gap-3 rounded-2xl border border-white/50 bg-white/74 px-4 py-3 shadow-[0_24px_60px_-24px_rgba(15,23,42,0.42)] backdrop-blur-md dark:border-slate-700/60 dark:bg-slate-900/70">
            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-primary-100 text-sm font-bold text-primary-600 dark:bg-primary-900/40 dark:text-primary-300">
              {initial}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                {title?.trim() || 'UniTest'}
              </p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-300">
                Красивая обложка появится автоматически после загрузки
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function TestCoverArtwork({
  coverImage,
  title = '',
  className = '',
  imageClassName = 'h-full w-full object-cover',
  showPlaceholderCaption = true,
  imageOverlayClassName = 'absolute inset-0 bg-gradient-to-t from-slate-950/14 via-slate-950/4 to-transparent',
  children,
  ...rest
}) {
  return (
    <div className={`relative overflow-hidden bg-slate-100 ${className}`} {...rest}>
      {coverImage ? (
        <>
          <motion.img
            src={coverImage}
            alt=""
            className={imageClassName}
            initial={{ scale: 1.04, opacity: 0.9 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          />
          <div className={imageOverlayClassName} />
          <div className="pointer-events-none absolute inset-0">
            <motion.div
              className="absolute -left-12 top-[-18%] h-36 w-36 rounded-full bg-sky-300/12 blur-3xl"
              animate={{ x: [0, 20, 0], y: [0, 12, 0], opacity: [0.16, 0.28, 0.16] }}
              transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute -right-16 bottom-[-24%] h-44 w-44 rounded-full bg-primary-400/14 blur-3xl"
              animate={{ x: [0, -22, 0], y: [0, -14, 0], opacity: [0.14, 0.24, 0.14] }}
              transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
        </>
      ) : (
        <AnimatedPlaceholder title={title} showCaption={showPlaceholderCaption} />
      )}
      {children}
    </div>
  );
}
