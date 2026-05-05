import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import MessageBubble from '../components/MessageBubble';
import DateSeparator from '../components/DateSeparator';
// Phase 3b: pinch-zoom + carousel viewer. The legacy MediaViewerModal
// stays alive for /messages-era pages (none currently — they redirect)
// but the new chat shell uses this enhanced one.
import MediaViewer from '../viewer/MediaViewer';
// Phase 4c: chat wallpaper painted below the message bubbles. The hook
// reads the user's pick from localStorage + subscribes to cross-tab
// changes so every open tab updates together.
import { useWallpaper } from '../wallpaper/useWallpaper';
import { useTheme } from '../../../context/ThemeContext';

/**
 * Scrollable message list for the new chat shell. Mirrors the legacy
 * MessageList behavior:
 *   - auto-scroll to bottom on new messages, but only if the user was
 *     already near the bottom (so we don't yank them out of history).
 *   - sticky scroll-to-bottom FAB when scrolled up far.
 *   - infinite-scroll backwards via onLoadMore when the top sentinel
 *     hits the viewport.
 *
 * No virtualization. Our chats rarely exceed a few hundred messages
 * and react-virtuoso would add 30KB gzipped. We can revisit if perf
 * becomes a problem.
 */
function isSameDay(a, b) {
  const da = new Date(a);
  const db = new Date(b);
  return da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate();
}

export default function ChatRoomMessages({
  messages,
  currentUserId,
  otherUserId,
  loading,
  hasMore,
  onLoadMore,
  onReply,
  onDelete,
  onReact,
  onPin,
  onEdit,
  onForward,
  onCopy,
  onRetry,
  highlightMessageId,
  canPin,
  canDeleteEveryone,
  getMemberRoleColor,
}) {
  const containerRef = useRef(null);
  const bottomRef = useRef(null);
  const topSentinelRef = useRef(null);
  const prevLenRef = useRef(0);
  const [autoScroll, setAutoScroll] = useState(true);
  // Open viewer state. We hold ONLY the clicked media descriptor here;
  // the carousel `list` is computed below from the current `messages`
  // array via memo so the viewer can swipe between every image/video
  // visible in the chat without an extra fetch.
  const [mediaViewer, setMediaViewer] = useState(null);

  // ── Auto-scroll on new bottom messages ──
  useEffect(() => {
    if (autoScroll && messages.length > prevLenRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
    prevLenRef.current = messages.length;
  }, [messages.length, autoScroll]);

  // ── Track scroll position to enable / disable autoScroll ──
  const onScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setAutoScroll(distFromBottom < 120);
  }, []);

  // ── Top sentinel: load more when in view ──
  useEffect(() => {
    if (!hasMore || !onLoadMore) return;
    const sentinel = topSentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !loading) {
        // Preserve current scroll position when prepending older messages
        // so the user doesn't visually "jump" up. Pattern: capture
        // scrollHeight before, restore offset after.
        const el = containerRef.current;
        const before = el?.scrollHeight || 0;
        Promise.resolve(onLoadMore()).then(() => {
          requestAnimationFrame(() => {
            if (!el) return;
            const after = el.scrollHeight;
            el.scrollTop += after - before;
          });
        });
      }
    }, { rootMargin: '100px 0px 0px 0px' });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, onLoadMore, loading]);

  // Highlighted message scroll-into-view (jump-to-message UX).
  useEffect(() => {
    if (!highlightMessageId) return;
    const el = containerRef.current?.querySelector(`[data-msg-id="${highlightMessageId}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlightMessageId, messages.length]);

  // ── Carousel list + active index for the viewer. ──
  // Built lazily from the current `messages` so opening the viewer is
  // O(messages * attachments) but cheap (few hundred items, sync).
  // Re-computed only when `messages` changes — not on every viewer
  // open — and indexOf below stays sub-millisecond at our scale.
  const mediaList = useMemo(() => {
    if (!Array.isArray(messages)) return [];
    const out = [];
    for (const m of messages) {
      if (m.type === 'sticker' || m.isDeleted) continue;
      for (const att of m.attachments || []) {
        if (!att?.mimetype) continue;
        if (att.mimetype.startsWith('image/')) {
          out.push({ kind: 'image', attachment: att, messageId: m._id });
        } else if (att.mimetype.startsWith('video/')) {
          out.push({ kind: 'video', attachment: att, messageId: m._id });
        }
      }
    }
    return out;
  }, [messages]);

  const mediaIndex = useMemo(() => {
    if (!mediaViewer) return 0;
    const i = mediaList.findIndex(m =>
      m.attachment === mediaViewer.attachment ||
      m.attachment?.filename === mediaViewer.attachment?.filename
    );
    return Math.max(0, i);
  }, [mediaViewer, mediaList]);

  // ── Wallpaper layer state ──
  // The chosen wallpaper (if any) paints UNDER the messages via an
  // absolutely-positioned div inside the scroll container. We use a
  // separate layer rather than a background on the scroll div itself
  // so the overlay veil (which regulates contrast with bubbles) can
  // sit between wallpaper and bubbles without affecting scroll.
  const { wallpaper } = useWallpaper();
  const { dark } = useTheme();
  const overlayAlpha = wallpaper
    ? (dark ? wallpaper.overlayDark ?? 0 : wallpaper.overlayLight ?? 0)
    : 0;
  const overlayColor = dark ? '0, 0, 0' : '255, 255, 255';

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {/* Wallpaper + contrast veil.
          Mounted inside the flex column (not the scroll container) so
          it fills the whole chat area including the empty space below
          short conversations. pointer-events-none lets clicks pass
          through to the scroll layer on top. */}
      {wallpaper && (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-0"
            style={{
              backgroundImage: `url(${wallpaper.file})`,
              backgroundSize:
                wallpaper.mode === 'cover' ? 'cover' :
                wallpaper.mode === 'contain' ? 'contain' : '320px',
              backgroundRepeat: wallpaper.mode === 'tile' ? 'repeat' : 'no-repeat',
              backgroundPosition: 'center',
            }}
          />
          {overlayAlpha > 0 && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-0"
              style={{ background: `rgba(${overlayColor}, ${overlayAlpha})` }}
            />
          )}
        </>
      )}

      <div
        ref={containerRef}
        onScroll={onScroll}
        className="relative z-10 flex-1 overflow-y-auto px-3 py-3 sm:px-4"
      >
        {/* Top sentinel for infinite-scroll back */}
        {hasMore && (
          <div ref={topSentinelRef} className="flex justify-center py-2">
            {loading
              ? <Loader2 size={16} className="animate-spin text-slate-400" />
              : <span className="text-[10px] font-bold text-slate-400">↑ Прокрутите вверх</span>}
          </div>
        )}

        {!hasMore && messages.length === 0 && !loading && (
          <p className="py-8 text-center text-xs font-medium text-slate-400">
            Здесь пока тихо. Напишите первое сообщение!
          </p>
        )}

        {messages.map((msg, idx) => {
          const senderId = msg.sender?._id || msg.sender;
          const isOwn = String(senderId) === String(currentUserId);
          const prev = idx > 0 ? messages[idx - 1] : null;
          const showDate = !prev || !isSameDay(prev.createdAt, msg.createdAt);

          // Read receipt: only meaningful in DM. Other party = otherUserId.
          const isReadByOther = isOwn && otherUserId
            ? Array.isArray(msg.readBy) && msg.readBy.some(u => String(u?._id || u) === String(otherUserId))
            : false;

          return (
            <div key={msg._id}>
              {showDate && <DateSeparator date={msg.createdAt} />}
              <MessageBubble
                message={msg}
                isOwn={isOwn}
                isReadByOther={isReadByOther}
                isHighlighted={highlightMessageId === msg._id}
                roleColor={getMemberRoleColor?.(senderId)}
                canPin={canPin}
                canEdit={isOwn}
                canDeleteEveryone={canDeleteEveryone}
                onReply={onReply}
                onReact={onReact}
                onPin={onPin}
                onDelete={onDelete}
                onEdit={onEdit}
                onForward={onForward}
                onCopy={onCopy}
                onPreviewMedia={setMediaViewer}
                onRetry={onRetry}
              />
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      {/* Scroll-to-bottom FAB */}
      {!autoScroll && (
        <button
          type="button"
          onClick={() => {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
            setAutoScroll(true);
          }}
          className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-full border-2 border-slate-900 bg-white text-slate-700 transition active:translate-y-[2px] dark:border-white dark:bg-slate-800 dark:text-slate-200"
          style={{ boxShadow: '0 3px 0 #0f172a' }}
          aria-label="К новым сообщениям"
        >
          <ChevronDown size={18} strokeWidth={2.6} />
        </button>
      )}

      {/* Build a flat list of every image/video attachment in the chat
          so the viewer can swipe between them. Stickers are excluded
          since they're tiny and zooming them isn't useful. */}
      <MediaViewer
        media={mediaViewer}
        list={mediaList}
        index={mediaIndex}
        onClose={() => setMediaViewer(null)}
      />
    </div>
  );
}
