export default function BrandLogo({
  size = 36,
  className = '',
  markClassName = '',
  showWordmark = false,
  wordmarkClassName = '',
  stacked = false
}) {
  const containerClass = stacked
    ? 'inline-flex flex-col items-start gap-2'
    : 'inline-flex items-center gap-2.5';

  return (
    <span className={`${containerClass} ${className}`.trim()}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={markClassName}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="unitest-black" x1="28" y1="20" x2="72" y2="98" gradientUnits="userSpaceOnUse">
            <stop stopColor="#262626" />
            <stop offset="1" stopColor="#09090B" />
          </linearGradient>
          <linearGradient id="unitest-orange" x1="45" y1="52" x2="101" y2="92" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F97316" />
            <stop offset="1" stopColor="#FDBA74" />
          </linearGradient>
          <filter id="unitest-glow" x="24" y="18" width="82" height="82" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <path
          d="M36 28V71C36 86.464 48.536 99 64 99C79.464 99 92 86.464 92 71V60.5"
          stroke="url(#unitest-black)"
          strokeWidth="18"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <g filter="url(#unitest-glow)">
          <path
            d="M49 58L63 72L98 36"
            stroke="url(#unitest-orange)"
            strokeWidth="16"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </svg>

      {showWordmark ? (
        <span className={`font-black tracking-tight ${wordmarkClassName}`.trim()}>
          UniTest
        </span>
      ) : null}
    </span>
  );
}
