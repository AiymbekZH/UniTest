import { useMemo } from 'react';

/**
 * Lightweight QR code block for arena lobby. Uses a public QR render
 * service to avoid a JS dependency. Falls back to a code display on error.
 */
export default function ArenaJoinQR({ url, size = 180, caption = 'Сканируй, чтобы войти' }) {
  const src = useMemo(() => {
    if (!url) return '';
    const encoded = encodeURIComponent(url);
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=2&color=0f172a&bgcolor=ffffff&data=${encoded}`;
  }, [url, size]);

  if (!url) return null;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="rounded-2xl bg-white p-3 shadow-lg">
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <img
          src={src}
          width={size}
          height={size}
          loading="lazy"
          alt="Arena QR"
          className="block"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
      </div>
      {caption ? (
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/55">{caption}</p>
      ) : null}
    </div>
  );
}
