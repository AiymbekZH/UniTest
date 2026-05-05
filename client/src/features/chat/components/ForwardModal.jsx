import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bookmark, Check, Forward as ForwardIcon, Loader2, MessageSquare, Search, Send, Users, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../services/api';

/**
 * Forward modal for the new chat shell.
 *
 * Flow:
 *   1. Open with a `message` to forward.
 *   2. Show all my DMs + groups in one searchable list.
 *   3. User toggles up to 20 targets. Optional note textarea.
 *   4. Submit → POST /api/messages/:id/forward with { targets, note }.
 *   5. On success toast and close. Server emits sockets so the open
 *      chats receive the new bubbles automatically.
 *
 * The list is built once per open from /api/dm + /api/groups so we don't
 * pay a repeat fetch on every modal open in the same session — both
 * endpoints are already loaded by the chat list shell, but the modal
 * doesn't have a clean way to share that state without prop-drilling
 * the entire chat list.
 */
const MAX_TARGETS = 20;

export default function ForwardModal({ open, message, onClose, currentUserId }) {
  const [chats, setChats] = useState([]);     // unified list of {kind,id,title,avatar,subtitle}
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(new Set()); // Set<`${kind}:${id}`>
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reset on open so reopening with a different message starts clean.
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelected(new Set());
      setNote('');
      setSubmitting(false);
    }
  }, [open]);

  // Fetch combined chat list when the modal opens.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const [dmRes, gRes] = await Promise.all([
          api.get('/dm/conversations'),
          api.get('/groups/my').catch(() => ({ data: [] })), // groups/my may 404 for users not in any
        ]);
        if (cancelled) return;

        const dms = (dmRes.data || []).map(c => {
          // Phase 4 Saved Messages: self-DM shows up as Избранное
          // with a bookmark tile so users can forward into their own
          // notes chat. Sorted first further down.
          if (c.isSelf) {
            return {
              key: `dm:${c._id}`,
              kind: 'dm',
              id: c._id,
              title: 'Избранное',
              avatar: null,
              subtitle: 'Заметки для себя',
              isSaved: true,
            };
          }
          const other = (c.participants || []).find(p => String(p?._id) !== String(currentUserId));
          return {
            key: `dm:${c._id}`,
            kind: 'dm',
            id: c._id,
            title: other ? `${other.firstName || ''} ${other.lastName || ''}`.trim() : 'Диалог',
            avatar: other?.avatar || null,
            subtitle: 'Личный чат',
          };
        });

        const groups = (gRes.data || []).map(g => ({
          key: `group:${g._id}`,
          kind: 'group',
          id: g._id,
          title: g.name || 'Группа',
          avatar: g.avatar || null,
          subtitle: `${(g.members?.length || 0)} участников`,
          isGroup: true,
        }));

        // Saved first, then remaining DMs (more frequent forward
        // target), then groups. Stable sort within each bucket.
        const saved = dms.filter(d => d.isSaved);
        const plainDms = dms.filter(d => !d.isSaved);
        setChats([...saved, ...plainDms, ...groups]);
      } catch (err) {
        if (!cancelled) toast.error('Не удалось загрузить чаты');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, currentUserId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return chats;
    return chats.filter(c => c.title.toLowerCase().includes(q));
  }, [chats, query]);

  const toggle = (key) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else if (next.size < MAX_TARGETS) {
        next.add(key);
      } else {
        toast(`Максимум ${MAX_TARGETS} получателей`, { icon: '⚠️' });
        return prev;
      }
      return next;
    });
  };

  const submit = async () => {
    if (!message?._id || selected.size === 0) return;
    setSubmitting(true);

    const targets = chats
      .filter(c => selected.has(c.key))
      .map(c => ({ chatType: c.kind, chatId: c.id }));

    try {
      const res = await api.post(`/messages/${message._id}/forward`, {
        targets,
        note: note.trim() || undefined,
      });
      const delivered = res.data?.delivered || 0;
      if (delivered === 0) {
        toast.error('Не удалось переслать ни в один чат');
      } else if (delivered === targets.length) {
        toast.success(`Переслано в ${delivered} чат${delivered === 1 ? '' : delivered < 5 ? 'а' : 'ов'}`);
      } else {
        toast.success(`Переслано в ${delivered} из ${targets.length}`);
      }
      onClose?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Ошибка пересылки');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  // ── Preview text for the source message ──
  // Keep it short; the user already sees it in the chat behind the modal.
  const preview =
    message?.type === 'text'
      ? (message.text || '').slice(0, 120)
      : message?.type === 'image' ? '📷 Изображение'
      : message?.type === 'video' ? '🎥 Видео'
      : message?.type === 'audio' ? '🎤 Голосовое'
      : message?.type === 'sticker' ? '🎨 Стикер'
      : message?.type === 'file' ? '📎 Файл'
      : 'Сообщение';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 p-3 backdrop-blur-sm sm:p-6"
        onClick={submitting ? undefined : onClose}
      >
        <motion.div
          initial={{ y: 20, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 20, opacity: 0, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          className="chunky-card flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden p-0"
        >
          {/* ── Header ── */}
          <div className="flex flex-shrink-0 items-center gap-2 border-b-2 border-slate-200 px-4 py-3 dark:border-slate-700">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border-2 border-slate-900 bg-primary-500 text-white dark:border-white">
              <ForwardIcon size={15} strokeWidth={2.6} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-black text-slate-900 dark:text-white">Переслать</h3>
              <p className="truncate text-[11px] font-medium text-slate-400">{preview}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-700"
              aria-label="Закрыть"
            >
              <X size={16} />
            </button>
          </div>

          {/* ── Search ── */}
          <div className="flex-shrink-0 border-b-2 border-slate-200 px-4 py-2.5 dark:border-slate-700">
            <div className="relative">
              <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Поиск чата..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={submitting}
                className="w-full rounded-xl border-2 border-slate-200 bg-white py-2 pl-9 pr-3 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-primary-500 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          {/* ── List ── */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 size={18} className="animate-spin text-slate-400" strokeWidth={2.4} />
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                  {chats.length === 0 ? 'Нет чатов' : 'Ничего не найдено'}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {filtered.map(c => {
                  const checked = selected.has(c.key);
                  return (
                    <li key={c.key}>
                      <button
                        type="button"
                        onClick={() => toggle(c.key)}
                        disabled={submitting}
                        className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition disabled:opacity-50 ${
                          checked
                            ? 'bg-primary-50 hover:bg-primary-100 dark:bg-primary-900/20 dark:hover:bg-primary-900/30'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-700/40'
                        }`}
                      >
                        <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden border-2 text-xs font-black ${
                          c.isGroup ? 'rounded-xl' : 'rounded-2xl'
                        } ${
                          c.isSaved
                            ? 'border-slate-900 bg-amber-400 text-slate-900 dark:border-white'
                            : 'border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200'
                        }`}>
                          {c.isSaved
                            ? <Bookmark size={13} strokeWidth={2.6} fill="currentColor" />
                            : c.avatar
                              ? <img src={c.avatar} alt="" className="h-full w-full object-cover" />
                              : c.isGroup
                                ? <Users size={13} strokeWidth={2.4} />
                                : (c.title.slice(0, 1) || '?').toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{c.title}</p>
                          <p className="truncate text-[11px] font-medium text-slate-400">{c.subtitle}</p>
                        </div>
                        <div className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg border-2 transition ${
                          checked
                            ? 'border-slate-900 bg-primary-500 text-white dark:border-white'
                            : 'border-slate-300 bg-white text-transparent dark:border-slate-600 dark:bg-slate-800'
                        }`}>
                          <Check size={12} strokeWidth={3} />
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* ── Note + send ── */}
          <div className="flex-shrink-0 space-y-2 border-t-2 border-slate-200 p-3 dark:border-slate-700">
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Добавить комментарий (необязательно)"
              maxLength={500}
              disabled={submitting}
              className="w-full resize-none rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-primary-500 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                Выбрано: {selected.size}{selected.size > 0 ? ` / ${MAX_TARGETS}` : ''}
              </span>
              <button
                type="button"
                onClick={submit}
                disabled={selected.size === 0 || submitting}
                className="ml-auto inline-flex items-center gap-1.5 rounded-xl border-2 border-slate-900 bg-primary-500 px-3 py-2 text-xs font-black text-white transition active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white"
                style={{ boxShadow: '0 3px 0 #9a3412' }}
              >
                {submitting
                  ? <><Loader2 size={12} className="animate-spin" strokeWidth={2.6} /> Пересылаем...</>
                  : <><Send size={12} strokeWidth={2.8} /> Переслать</>}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
