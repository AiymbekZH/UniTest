import { Play } from 'lucide-react';

/**
 * Telegram-style album grid renderer for 2-10 image/video tiles
 * inside a single message bubble.
 *
 * Inputs:
 *   `tiles` — flat array of `{ attachment, messageId }`. Built by
 *   ChatRoomMessages from the grouped streak; we don't accept raw
 *   message arrays so this component stays purely presentational.
 *
 *   `onPreviewMedia(descriptor)` — same callback shape MessageBubble
 *   already passes. We forward `{ kind: 'image'|'video', attachment,
 *   messageId }` so the parent can position the carousel correctly.
 *
 * Layout choices (mirrored from Telegram desktop):
 *   2  → 1×2 row
 *   3  → 1 large left + 2 stacked right
 *   4  → 2×2
 *   5+ → 2×2 with the 4th tile carrying a "+N" overlay over the
 *        remaining count. Tapping it still opens the carousel which
 *        already supports swiping past the 4 visible tiles.
 *
 * Aspect handling:
 *   We render every tile as a square (`aspect-square`) with
 *   `object-cover`. Mixing portrait / landscape originals into a
 *   neat grid otherwise looks ragged. The viewer shows the original
 *   aspect when the user taps in.
 *
 * Why not CSS subgrid / dynamic ratios?
 *   Telegram's "smart" layout is non-trivial (publishes a paper-y
 *   algorithm). Square tiles get 90% of the visual benefit at
 *   <100 lines of CSS, which is the right tradeoff here.
 */
function attachmentSrc(att) {
  if (!att) return '';
  if (att.url) return att.url;
  return att.data?.startsWith('data:') ? att.data : `data:${att.mimetype};base64,${att.data}`;
}

function isVideoTile(att) {
  return att?.mimetype?.startsWith('video/');
}

export default function AlbumGrid({ tiles, onPreviewMedia, isOwn }) {
  if (!Array.isArray(tiles) || tiles.length === 0) return null;
  const total = tiles.length;
  // Cap visible cells at 4. Anything beyond shows behind a "+N"
  // overlay to keep the grid bounded vertically.
  const visible = tiles.slice(0, 4);
  const hidden = total - visible.length;

  // Layout class + per-tile spans.
  let containerClass;
  const tileSpans = []; // CSS class per visible tile
  if (total === 2) {
    containerClass = 'grid grid-cols-2 grid-rows-1 gap-1';
    tileSpans.push('', '');
  } else if (total === 3) {
    containerClass = 'grid grid-cols-2 grid-rows-2 gap-1';
    // First tile spans both rows on the left, others stack right.
    tileSpans.push('row-span-2', '', '');
  } else {
    // 4 → exact 2x2; 5+ → same 2x2 but last shows +N badge.
    containerClass = 'grid grid-cols-2 grid-rows-2 gap-1';
    tileSpans.push('', '', '', '');
  }

  return (
    <div className={`mt-2 w-[260px] max-w-full overflow-hidden rounded-xl ${containerClass}`}>
      {visible.map((tile, idx) => {
        const att = tile.attachment;
        const src = attachmentSrc(att);
        const vid = isVideoTile(att);
        const isLast = idx === visible.length - 1;
        const showOverflow = hidden > 0 && isLast;
        return (
          <button
            key={`${tile.messageId}-${idx}`}
            type="button"
            onClick={() => onPreviewMedia?.({
              kind: vid ? 'video' : 'image',
              attachment: att,
              messageId: tile.messageId,
            })}
            // For total=3 the first tile gets row-span-2 → has to be
            // tall (2 rows worth). Square aspect-ratio doesn't work
            // there; we let the grid decide the height instead.
            className={`relative overflow-hidden bg-slate-200 transition hover:opacity-95 dark:bg-slate-700 ${tileSpans[idx]} ${
              total === 3 && idx === 0 ? '' : 'aspect-square'
            }`}
          >
            {vid ? (
              <>
                <video
                  src={src}
                  className="h-full w-full object-cover"
                  muted
                  playsInline
                  preload="metadata"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/15">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-900">
                    <Play size={16} strokeWidth={2.6} fill="currentColor" />
                  </div>
                </div>
              </>
            ) : (
              <img
                src={src}
                alt={att?.filename || ''}
                className="h-full w-full object-cover"
                draggable={false}
              />
            )}
            {showOverflow && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/55 text-2xl font-black text-white">
                +{hidden}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
