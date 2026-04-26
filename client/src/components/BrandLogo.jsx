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

  return (
    <span className={`${containerClass} ${className}`.trim()}>
      <img
        src="/Logo_UniTest.png"
        alt="UniTest"
        width={size}
        height={size}
        loading="eager"
        decoding="async"
        draggable={false}
        className={`block flex-shrink-0 select-none object-contain ${markClassName}`.trim()}
        style={{ width: size, height: size }}
      />

      {showWordmark ? (
        <span className={`font-black tracking-tight ${wordmarkClassName}`.trim()}>
          UniTest
        </span>
      ) : null}
    </span>
  );
}
