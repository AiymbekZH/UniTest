export default function BrandLogo({
  size = 36,
  className = '',
  markClassName = '',
  showWordmark = false,
  wordmarkClassName = '',
  stacked = false,
}) {
  const containerClass = stacked
    ? 'inline-flex flex-col items-start gap-2'
    : 'inline-flex items-center gap-2.5';

  // Source PNG has empty padding around the icon; zoom-crop via overflow + scale
  const ZOOM = 1.55;

  return (
    <span className={`${containerClass} ${className}`.trim()}>
      <span
        className={`relative inline-block flex-shrink-0 overflow-hidden ${markClassName}`.trim()}
        style={{ width: size, height: size }}
        aria-hidden="true"
      >
        <img
          src="/Logo_UniTest.png"
          alt="UniTest"
          loading="eager"
          decoding="async"
          draggable={false}
          className="absolute left-1/2 top-1/2 max-w-none select-none"
          style={{
            width: size,
            height: size,
            objectFit: 'contain',
            transform: `translate(-50%, -50%) scale(${ZOOM})`,
            transformOrigin: 'center',
          }}
        />
      </span>

      {showWordmark ? (
        <span className={`font-black tracking-tight ${wordmarkClassName}`.trim()}>
          UniTest
        </span>
      ) : null}
    </span>
  );
}
