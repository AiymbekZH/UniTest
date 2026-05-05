import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Loader2, MessageSquare, Search, Users, X } from 'lucide-react';
import api from '../../../services/api';

/**
 * Cross-chat search palette (Cmd/Ctrl+K).
 *
 * Calls Phase-1's GET /api/messages/search?q=&limit=&before= which
 * searches DM + group text bodies the user has access to, returns
 * results tagged with `chatType` + `chatId`. Click a result navigates
 * to /chat/{kind}/{chatId} with the message id passed via state so
 * `ChatLayout` can scroll-into-view + briefly flash that bubble.
 *
 * UX details:
 *   - Debounced 250 ms.
 *   - Shows last 8 results, no pagination yet (Phase 4b can add it
 *     once we see how heavily the feature is used).
 *   - Esc closes; ↑↓ navigate; Enter opens highlighted.
 *   - Highlights the matched substring in the snippet, with a few
 *     surrounding characters for context.
 */
export default function GlobalSearchModal({ open, onClose }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const debounceRef = useRef(null);
  const inputRef = useRef(null);
  const lastReqRef = useRef(0);

  // Reset on open + autofocus.
  useEffect(() => {
    if (!open) return;
    setQuery('');
    setResults([]);
    setActiveIdx(0);
    setLoading(false);
    // Defer focus until the modal mounts so iOS Safari brings up the
    // keyboard. Without setTimeout the focus call fires before paint.
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  // Debounced fetch.
  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const reqId = ++lastReqRef.current;
      try {
        const res = await api.get(`/messages/search?q=${encodeURIComponent(query.trim())}&limit=20`);
        // Drop stale results — without this guard a fast typist can
        // overwrite a newer query's results with an older response.
        if (reqId !== lastReqRef.current) return;
        setResults(res.data?.results || []);
        setActiveIdx(0);
      } catch (err) {
        if (reqId === lastReqRef.current) setResults([]);
      } finally {
        if (reqId === lastReqRef.current) setLoading(false);
      }
    }, 250);

    return () => debounceRef.current && clearTimeout(debounceRef.current);
  }, [query, open]);

  // Keyboard nav.
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose?.(); }
      else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIdx(i => Math.min(results.length - 1, i + 1));
      }
      else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIdx(i => Math.max(0, i - 1));
      }
      else if (e.key === 'Enter') {
        const r = results[activeIdx];
        if (r) openResult(r);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, results, activeIdx]);

  const openResult = (r) => {
    onClose?.();
    // ChatLayout reads `state.highlightMessageId` and scrolls/flashes
    // that bubble after the messages load.
    navigate(`/chat/${r.chatType}/${r.chatId}`, {
      state: { highlightMessageId: r._id },
    });
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[85] flex items-start justify-center bg-slate-900/50 px-3 pt-16 backdrop-blur-sm sm:pt-24"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: -20, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          className="chunky-card flex max-h-[70vh] w-full max-w-xl flex-col overflow-hidden p-0"
        >
          {/* ── Search input ── */}
          <div className="flex flex-shrink-0 items-center gap-2 border-b-2 border-slate-200 px-3 py-2.5 dark:border-slate-700">
            <Search size={16} className="flex-shrink-0 text-slate-400" strokeWidth={2.4} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск по всем сообщениям..."
              className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100"
            />
            {loading && <Loader2 size={14} className="flex-shrink-0 animate-spin text-slate-400" strokeWidth={2.4} />}
            <kbd className="hidden flex-shrink-0 rounded-md border-2 border-slate-300 bg-slate-50 px-1.5 py-0.5 text-[9px] font-black text-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 sm:inline-block">
              ESC
            </kbd>
            <button
              type="button"
              onClick={onClose}
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 sm:hidden"
              aria-label="Закрыть"
            >
              <X size={14} />
            </button>
          </div>

          {/* ── Results ── */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {query.trim().length < 2 && (
              <EmptyHint />
            )}
            {query.trim().length >= 2 && !loading && results.length === 0 && (
              <div className="px-6 py-10 text-center">
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Ничего не найдено</p>
                <p className="mt-1 text-[11px] font-medium text-slate-400">
                  Попробуйте другие слова или фрагмент покороче
                </p>
              </div>
            )}
            {results.length > 0 && (
              <ul className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {results.map((r, i) => (
                  <ResultRow
                    key={String(r._id)}
                    result={r}
                    query={query.trim()}
                    active={i === activeIdx}
                    onMouseEnter={() => setActiveIdx(i)}
                    onClick={() => openResult(r)}
                  />
                ))}
              </ul>
            )}
          </div>

          {/* ── Footer ── */}
          <div className="flex flex-shrink-0 items-center gap-3 border-t-2 border-slate-200 px-3 py-2 text-[10px] font-bold text-slate-400 dark:border-slate-700">
            <span className="hidden items-center gap-1 sm:inline-flex">
              <kbd className="rounded border border-slate-300 px-1 dark:border-slate-600">↑↓</kbd> навигация
            </span>
            <span className="hidden items-center gap-1 sm:inline-flex">
              <kbd className="rounded border border-slate-300 px-1 dark:border-slate-600">Enter</kbd> открыть
            </span>
            <span className="ml-auto">{results.length > 0 && `${results.length} результат${results.length === 1 ? '' : results.length < 5 ? 'а' : 'ов'}`}</span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ──────────────────────────────────────────────────────────────────────
function EmptyHint() {
  return (
    <div className="px-6 py-10 text-center">
      <Search size={26} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" strokeWidth={2.2} />
      <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
        Введите минимум 2 символа
      </p>
      <p className="mt-1 text-[10px] font-medium text-slate-400">
        Поиск по всем личкам и группам, где вы участник
      </p>
    </div>
  );
}

function ResultRow({ result, query, active, onClick, onMouseEnter }) {
  const isGroup = result.chatType === 'group';
  const senderName = result.sender
    ? `${result.sender.firstName || ''} ${result.sender.lastName || ''}`.trim() || 'Без имени'
    : 'Удалён';
  const date = result.createdAt
    ? new Date(result.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';

  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        className={`flex w-full items-start gap-3 px-4 py-2.5 text-left transition ${
          active
            ? 'bg-primary-50 dark:bg-primary-900/20'
            : 'hover:bg-slate-50 dark:hover:bg-slate-700/40'
        }`}
      >
        <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center border-2 border-slate-300 bg-slate-50 text-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 ${
          isGroup ? 'rounded-xl' : 'rounded-2xl'
        }`}>
          {isGroup
            ? <Users size={13} strokeWidth={2.4} />
            : <MessageSquare size={13} strokeWidth={2.4} />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="truncate text-xs font-black text-slate-900 dark:text-white">{senderName}</span>
            <span className="flex-shrink-0 text-[9px] font-bold text-slate-400">{date}</span>
          </div>
          <p className="mt-0.5 line-clamp-2 text-[11px] font-medium text-slate-600 dark:text-slate-300">
            <Highlight text={result.text || ''} query={query} />
          </p>
        </div>
      </button>
    </li>
  );
}

// Wrap each occurrence of `query` in a highlight span. We escape the
// query string for regex safety. Case-insensitive match.
function Highlight({ text, query }) {
  if (!query) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(${escaped})`, 'ig');
  const parts = text.split(re);
  return (
    <>
      {parts.map((part, i) =>
        re.test(part)
          ? <mark key={i} className="rounded bg-amber-200/80 px-0.5 text-amber-900 dark:bg-amber-500/40 dark:text-amber-100">{part}</mark>
          : <span key={i}>{part}</span>
      )}
    </>
  );
}
