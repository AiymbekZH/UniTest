import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { File as FileIcon, Image as ImageIcon, Loader2, Music, Palette, Play, Search, Users, Video, X } from 'lucide-react';
import api from '../../../services/api';

// Process-scoped cache of fetched media-thumbnail blobs keyed by
// messageId. Lives outside the component so it survives drawer
// open/close cycles within a single SPA session — re-opening the
// drawer for the same chat doesn't re-fetch the same thumbnails.
//
// We keep object URLs (created via URL.createObjectURL) here, NOT
// the original base64 strings. Object URLs are cheaper for the
// browser to render in <img> repeatedly. Lifecycle is process-long;
// we accept the small leak in exchange for simplicity.
const thumbnailCache = new Map();

/**
 * Right-side info drawer for an open chat.
 *
 * Tabs:
 *   - "Медиа"  → image + video attachments (image-grid layout)
 *   - "Файлы"  → file + audio attachments (list layout with filenames)
 *
 * Data is loaded from the Phase-1 endpoints:
 *   GET /api/dm/conversations/:id/media?type=&before=&limit=
 *   GET /api/groups/:id/media?type=&before=&limit=
 *
 * The endpoints already strip `attachments.data` server-side so the
 * gallery list payload is small. Clicking a media tile pops the
 * Phase-3b MediaViewer (the parent supplies `onPreview` which
 * already does this for in-chat media).
 *
 * Pagination: cursor-style on `_id` via `before`. We keep a single
 * `nextBefore` ref per tab.
 */
const PAGE_SIZE = 30;

export default function InfoDrawer({ open, onClose, kind, chatId, chatTitle, isGroup, memberCount, onOpenWallpaper, onOpenSearchInChat }) {
  const [tab, setTab] = useState('media'); // 'media' | 'files'
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const cursorRef = useRef(null);
  const requestKeyRef = useRef('');

  // Whenever the drawer opens or the tab/chat changes, reset and refetch.
  useEffect(() => {
    if (!open || !chatId) return;
    setItems([]);
    setHasMore(false);
    cursorRef.current = null;
    fetchPage({ replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, chatId, kind, tab]);

  async function fetchPage({ replace = false } = {}) {
    if (!chatId) return;
    // Build the URL based on chat kind. Server contract is identical
    // shape, only the prefix differs.
    const baseUrl = kind === 'group'
      ? `/groups/${chatId}/media`
      : `/dm/conversations/${chatId}/media`;
    // Each tab maps to multiple types — server accepts a single `type`
    // but to keep the implementation small here we pass the most
    // representative one and filter client-side. The /media endpoint
    // without a `type` returns all four kinds; we use that and filter.
    const params = new URLSearchParams();
    params.set('limit', PAGE_SIZE);
    if (cursorRef.current) params.set('before', cursorRef.current);

    const reqKey = `${kind}:${chatId}:${tab}:${cursorRef.current || 'first'}`;
    requestKeyRef.current = reqKey;

    setLoading(true);
    try {
      const res = await api.get(`${baseUrl}?${params.toString()}`);
      // Bail if a newer request superseded this one (tab switch, chat
      // change). Without this guard a stale fetch could overwrite the
      // current tab's items.
      if (requestKeyRef.current !== reqKey) return;
      const all = Array.isArray(res.data?.items) ? res.data.items : [];
      const filtered = all.filter(m => {
        if (tab === 'media') return m.type === 'image' || m.type === 'video';
        // 'files' tab
        return m.type === 'file' || m.type === 'audio';
      });
      const merged = replace ? filtered : [...items, ...filtered];
      setItems(merged);
      setHasMore(Boolean(res.data?.hasMore));
      const last = all[all.length - 1];
      cursorRef.current = last ? last._id : cursorRef.current;
    } catch (err) {
      // Silent fail — drawer will show "пусто" instead of an error toast.
    } finally {
      if (requestKeyRef.current === reqKey) setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex justify-end bg-slate-900/40 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.aside
            initial={{ x: 380, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 380, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="flex h-full w-full max-w-sm flex-col border-l-2 border-slate-200 bg-white shadow-[-4px_0_0_#0f172a] dark:border-slate-700 dark:bg-slate-900"
          >
            {/* ── Header ── */}
            <div className="flex flex-shrink-0 items-center gap-2 border-b-2 border-slate-200 px-4 py-3 dark:border-slate-700">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Информация
                </p>
                <p className="truncate text-sm font-black text-slate-900 dark:text-white">
                  {chatTitle || 'Чат'}
                </p>
                {isGroup && typeof memberCount === 'number' && (
                  <p className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                    <Users size={10} strokeWidth={2.4} /> {memberCount} участников
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
                aria-label="Закрыть"
              >
                <X size={16} />
              </button>
            </div>

            {/* ── Quick actions (above tabs) ── */}
            {(onOpenWallpaper || onOpenSearchInChat) && (
              <div className="flex flex-shrink-0 flex-col gap-2 border-b-2 border-slate-200 px-4 py-3 dark:border-slate-700">
                {onOpenSearchInChat && (
                  <button
                    type="button"
                    onClick={onOpenSearchInChat}
                    className="flex w-full items-center gap-2 rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-700 transition active:translate-y-[1px] hover:border-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-500"
                    style={{ boxShadow: '0 2px 0 #0f172a' }}
                  >
                    <Search size={13} strokeWidth={2.4} />
                    Найти в чате
                  </button>
                )}
                {onOpenWallpaper && (
                  <button
                    type="button"
                    onClick={onOpenWallpaper}
                    className="flex w-full items-center gap-2 rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-700 transition active:translate-y-[1px] hover:border-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-500"
                    style={{ boxShadow: '0 2px 0 #0f172a' }}
                  >
                    <Palette size={13} strokeWidth={2.4} />
                    Изменить фон
                  </button>
                )}
              </div>
            )}

            {/* ── Tabs ── */}
            <div className="flex flex-shrink-0 border-b-2 border-slate-200 dark:border-slate-700">
              <TabButton active={tab === 'media'} onClick={() => setTab('media')}>
                <ImageIcon size={12} strokeWidth={2.4} /> Медиа
              </TabButton>
              <TabButton active={tab === 'files'} onClick={() => setTab('files')}>
                <FileIcon size={12} strokeWidth={2.4} /> Файлы
              </TabButton>
            </div>

            {/* ── Body ── */}
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {items.length === 0 && loading && (
                <div className="flex items-center justify-center py-10">
                  <Loader2 size={18} className="animate-spin text-slate-400" strokeWidth={2.4} />
                </div>
              )}

              {items.length === 0 && !loading && (
                <div className="px-6 py-12 text-center">
                  <p className="text-xs font-bold text-slate-400">
                    {tab === 'media' ? 'Нет медиа в этом чате' : 'Нет файлов в этом чате'}
                  </p>
                </div>
              )}

              {tab === 'media' && items.length > 0 && (
                <div className="grid grid-cols-3 gap-1.5 [&>*]:min-w-0">
                  {items.map(m => (
                    <MediaThumb key={m._id} message={m} kind={kind} chatId={chatId} />
                  ))}
                </div>
              )}

              {tab === 'files' && items.length > 0 && (
                <ul className="space-y-1.5">
                  {items.map(m => (
                    <FileRow key={m._id} message={m} />
                  ))}
                </ul>
              )}

              {hasMore && items.length > 0 && (
                <button
                  type="button"
                  onClick={() => fetchPage()}
                  disabled={loading}
                  className="mx-auto mt-3 flex items-center gap-1.5 rounded-xl border-2 border-slate-300 bg-white px-3 py-1.5 text-xs font-black text-slate-700 transition active:translate-y-[1px] disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                >
                  {loading
                    ? <><Loader2 size={11} className="animate-spin" /> Загружаем</>
                    : 'Показать ещё'}
                </button>
              )}
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ──────────────────────────────────────────────────────────────────────
function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex flex-1 items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-black transition ${
        active
          ? 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-300'
          : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
      }`}
    >
      {children}
    </button>
  );
}

/**
 * Media gallery tile.
 *
 * The /media list endpoint deliberately strips attachments.data so
 * the payload stays small. To render real thumbnails we lazy-fetch
 * the full attachment for each message via /media/:messageId/attachment
 * once the tile scrolls into view (IntersectionObserver), then cache
 * the resulting blob URL in a module-scoped Map for the rest of the
 * SPA session.
 *
 * Why object URLs over data: URLs?
 *   Repeated <img src="data:..."> renders re-decode base64 each
 *   render in some browsers. Object URLs hand the browser a real
 *   resource it can decode once and pin in its image cache.
 *
 * Why the IntersectionObserver instead of fetching on mount?
 *   A 60-item gallery would fire 60 parallel requests on drawer
 *   open. Lazy-load yields 6-9 immediately (just what's visible)
 *   and the rest as the user scrolls.
 */
function MediaThumb({ message, kind, chatId }) {
  const att = message.attachments?.[0];
  const isVideo = message.type === 'video';
  const filename = att?.filename || '';
  const ref = useRef(null);
  const [src, setSrc] = useState(() => thumbnailCache.get(String(message._id)) || null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (src || error) return;
    const node = ref.current;
    if (!node) return;
    if (!chatId || !kind || !message?._id) return;

    // Don't bother for non-image/video — files / audio show an icon.
    if (!isVideo && message.type !== 'image') return;

    let cancelled = false;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.some(e => e.isIntersecting);
      if (!visible) return;
      observer.disconnect();
      if (cancelled) return;

      // Recheck cache (another tile of the same message could have
      // resolved while we were waiting for visibility — rare but
      // possible if duplicates exist).
      const cached = thumbnailCache.get(String(message._id));
      if (cached) { setSrc(cached); return; }

      setLoading(true);
      const url = kind === 'group'
        ? `/groups/${chatId}/media/${message._id}/attachment`
        : `/dm/conversations/${chatId}/media/${message._id}/attachment`;
      api.get(url)
        .then(res => {
          if (cancelled) return;
          const data = res.data?.data;
          const mimetype = res.data?.mimetype || att?.mimetype || 'image/jpeg';
          if (!data) throw new Error('no data');
          // Build a Blob → object URL. The base64 may already be
          // prefixed with `data:` (older messages do this); strip
          // the prefix in that case.
          const raw = data.startsWith('data:') ? data.split(',', 2)[1] || '' : data;
          // atob → Uint8Array → Blob.
          const bin = atob(raw);
          const bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
          const blob = new Blob([bytes], { type: mimetype });
          const objUrl = URL.createObjectURL(blob);
          thumbnailCache.set(String(message._id), objUrl);
          setSrc(objUrl);
        })
        .catch(() => { if (!cancelled) setError(true); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, { rootMargin: '120px' /* prefetch tiles just below the fold */ });

    observer.observe(node);
    return () => { cancelled = true; observer.disconnect(); };
  }, [src, error, kind, chatId, message?._id, message?.type, isVideo, att?.mimetype]);

  return (
    <div
      ref={ref}
      className="relative aspect-square overflow-hidden rounded-lg border-2 border-slate-200 bg-slate-50 transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800"
      title={filename}
    >
      {src && !error ? (
        <>
          {isVideo ? (
            // Videos render via <video> with metadata only — first frame
            // shows in most browsers without playing. Cheap thumbnail.
            <video
              src={src}
              className="h-full w-full object-cover"
              preload="metadata"
              muted
              playsInline
            />
          ) : (
            <img
              src={src}
              alt={filename}
              className="h-full w-full object-cover"
              loading="lazy"
              draggable={false}
            />
          )}
          {isVideo && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-900">
                <Play size={14} strokeWidth={2.6} fill="currentColor" />
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-1.5 text-center text-slate-400">
          {loading
            ? <Loader2 size={16} className="animate-spin" strokeWidth={2.2} />
            : isVideo
              ? <Video size={18} strokeWidth={2.2} />
              : <ImageIcon size={18} strokeWidth={2.2} />}
          {error && (
            <span className="text-[9px] font-bold text-slate-500">Не удалось</span>
          )}
        </div>
      )}
    </div>
  );
}

function FileRow({ message }) {
  const att = message.attachments?.[0];
  const isAudio = message.type === 'audio';
  const filename = att?.filename || (isAudio ? 'Голосовое' : 'Файл');
  const size = att?.size || 0;
  return (
    <li className="flex items-center gap-2 rounded-xl border-2 border-slate-200 bg-white p-2.5 dark:border-slate-700 dark:bg-slate-800">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border-2 border-slate-300 bg-slate-50 text-slate-500 dark:border-slate-600 dark:bg-slate-900">
        {isAudio
          ? <Music size={14} strokeWidth={2.4} />
          : <FileIcon size={14} strokeWidth={2.4} />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-bold text-slate-900 dark:text-white">{filename}</p>
        <p className="text-[10px] font-medium text-slate-400">
          {formatSize(size)}
          {message.sender?.firstName && (
            <> · {message.sender.firstName}</>
          )}
        </p>
      </div>
    </li>
  );
}

function formatSize(bytes) {
  if (!bytes) return '0 КБ';
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} КБ`;
  return `${(kb / 1024).toFixed(1)} МБ`;
}
