import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Search, X } from 'lucide-react';
import api from '../../../services/api';

/**
 * Per-chat search panel. Slides in from the top of the chat area
 * when opened (via InfoDrawer's "Найти в чате" quick action) and
 * lists matching messages from the current chat.
 *
 * Why a panel and not a modal?
 *   The chat surface stays visible behind it so when the user
 *   clicks a result we can scroll-and-highlight that bubble in
 *   place. A modal would obscure the surface and force a close
 *   animation before the highlight could land cleanly.
 *
 * Result click flow:
 *   - The panel calls onJump(messageId).
 *   - ChatLayout sets `highlightMessageId` for ChatRoomMessages.
 *   - ChatRoomMessages already implements scroll-into-view + a
 *     amber ring (Phase 4 "jump from global search").
 *   - The panel then closes itself.
 *
 * If the matched message is too far up in history to be in the
 * currently-loaded slice, the highlight effect is a no-op (the
 * DOM query returns nothing). We surface this as a soft toast
 * via the `notFoundInLoaded` callback so the parent can decide
 * whether to fetch the surrounding context.
 */
const ENDPOINT = {
  dm: (chatId) => `/dm/conversations/${chatId}/search`,
  group: (chatId) => `/groups/${chatId}/messages/search`,
};

export default function InChatSearch({ open, kind, chatId, onClose, onJump }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  // Whenever the panel is opened, reset state and focus the input so
  // users can start typing immediately (parity with Cmd+K UX).
  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      // Defer focus a tick so the slide-in animation doesn't pop the
      // mobile keyboard mid-transition (looks janky on iOS).
      const t = setTimeout(() => inputRef.current?.focus(), 220);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Esc closes.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Debounced fetch. 200 ms feels responsive without hammering the
  // endpoint while the user is mid-word.
  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    if (!chatId || !ENDPOINT[kind]) return;

    setLoading(true);
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const res = await api.get(ENDPOINT[kind](chatId), { params: { q: trimmed } });
        if (cancelled) return;
        const arr = Array.isArray(res.data) ? res.data : [];
        setResults(arr);
      } catch (_) {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 200);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query, kind, chatId, open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: -16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -16, opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="absolute inset-x-0 top-0 z-30 flex max-h-[60%] flex-col border-b-2 border-slate-200 bg-white shadow-[0_8px_24px_-12px_rgba(15,23,42,0.25)] dark:border-slate-700 dark:bg-slate-900"
        >
          {/* Input row */}
          <div className="flex flex-shrink-0 items-center gap-2 border-b border-slate-100 px-3 py-2.5 dark:border-slate-800">
            <Search size={14} className="flex-shrink-0 text-slate-400" strokeWidth={2.4} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Найти в этом чате..."
              className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
            />
            {loading && <Loader2 size={13} className="animate-spin text-slate-400" />}
            <button
              type="button"
              onClick={onClose}
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
              aria-label="Закрыть поиск"
            >
              <X size={14} />
            </button>
          </div>

          {/* Result list */}
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {query.trim().length >= 2 && !loading && results.length === 0 && (
              <p className="px-3 py-6 text-center text-xs font-bold text-slate-400">
                Ничего не найдено
              </p>
            )}

            {query.trim().length < 2 && !loading && (
              <p className="px-3 py-6 text-center text-[11px] font-medium text-slate-400">
                Введите минимум 2 символа
              </p>
            )}

            {results.map(msg => (
              <ResultRow
                key={msg._id}
                message={msg}
                query={query}
                onClick={() => {
                  onJump?.(msg._id);
                  onClose?.();
                }}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function timeAgo(date) {
  const now = new Date();
  const d = new Date(date);
  const diff = (now - d) / 1000;
  if (diff < 3600) return `${Math.floor(diff / 60) || 1}м`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}ч`;
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}д`;
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

/**
 * Single result row. Renders the sender's name, the time, and a snippet
 * of the message text with the matching substring marked. We don't
 * render attachments — search is text-only, and an audio match would
 * be confusing here anyway.
 */
function ResultRow({ message, query, onClick }) {
  const text = message.text || '';
  const sender = message.sender;
  const name = sender ? `${sender.firstName || ''} ${sender.lastName || ''}`.trim() : 'Удалён';

  // Build a snippet centered on the match so the user can verify
  // visually that this is the message they meant. No regex magic
  // here — `q` is the user's input, possibly empty in edge cases.
  const q = query.trim();
  const lower = text.toLowerCase();
  const matchIdx = q ? lower.indexOf(q.toLowerCase()) : -1;
  let before = '';
  let match = '';
  let after = '';
  if (matchIdx >= 0) {
    const start = Math.max(0, matchIdx - 25);
    before = (start > 0 ? '…' : '') + text.slice(start, matchIdx);
    match = text.slice(matchIdx, matchIdx + q.length);
    after = text.slice(matchIdx + q.length, matchIdx + q.length + 60);
    if (matchIdx + q.length + 60 < text.length) after += '…';
  } else {
    before = text.slice(0, 90);
    if (text.length > 90) before += '…';
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start gap-2 rounded-xl px-3 py-2 text-left transition hover:bg-slate-100 dark:hover:bg-slate-800"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[11px] font-black text-slate-700 dark:text-slate-200">
            {name}
          </span>
          <span className="text-[10px] font-medium text-slate-400">
            {timeAgo(message.createdAt)}
          </span>
        </div>
        <p className="mt-0.5 truncate text-xs text-slate-600 dark:text-slate-300">
          {before}
          <span className="rounded bg-amber-200 px-0.5 font-bold text-slate-900 dark:bg-amber-500/40 dark:text-amber-100">
            {match}
          </span>
          {after}
        </p>
      </div>
    </button>
  );
}
