import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Users, X } from 'lucide-react';
import api from '../../../services/api';

/**
 * Bottom-sheet (mobile) / centered modal (desktop) for starting a new
 * chat. Search by ник/email/uniqueId for DMs, or pick a group from the
 * user's group list. Same modal handles both — single source of "start
 * chatting" affordance, similar to Telegram's New Message button.
 *
 * Uses /api/dm/search/users (Phase 0) and /api/groups/my (existing).
 */
export default function NewChatSheet({ open, onClose, onPickDmUser, onPickGroup }) {
  const [tab, setTab] = useState('dm'); // 'dm' | 'group'
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);

  // Reset on each open so we don't leak state between sessions.
  useEffect(() => {
    if (open) {
      setTab('dm');
      setQuery('');
      setUsers([]);
      // Pre-fetch groups in background so the Groups tab is instant.
      api.get('/groups/my').then((res) => setGroups(res.data || [])).catch(() => {});
    }
  }, [open]);

  // Debounced user search.
  useEffect(() => {
    if (tab !== 'dm') return;
    if (!query || query.trim().length < 2) {
      setUsers([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get('/dm/search/users', { params: { q: query.trim() } });
        setUsers(res.data || []);
      } catch (_) {
        setUsers([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => debounceRef.current && clearTimeout(debounceRef.current);
  }, [query, tab]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-900/50 backdrop-blur-sm sm:items-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="chunky-card flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden p-0 sm:max-h-[640px] sm:rounded-3xl"
            style={{ borderTopLeftRadius: '24px', borderTopRightRadius: '24px' }}
          >
            {/* Header */}
            <div className="flex flex-shrink-0 items-center justify-between border-b-2 border-slate-200 px-4 py-3 dark:border-slate-700">
              <h3 className="text-base font-black text-slate-900 dark:text-white">Новый чат</h3>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
                aria-label="Закрыть"
              >
                <X size={16} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex flex-shrink-0 gap-1.5 border-b-2 border-slate-200 px-4 py-2 dark:border-slate-700">
              {[
                { id: 'dm', label: 'Пользователь' },
                { id: 'group', label: 'Группы' },
              ].map(t => {
                const on = tab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id)}
                    className={`rounded-full border-2 px-3 py-1 text-[11px] font-black transition active:translate-y-[1px] ${
                      on
                        ? 'border-slate-900 bg-primary-500 text-white dark:border-white'
                        : 'border-slate-300 bg-white text-slate-600 hover:border-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                    style={on ? { boxShadow: '0 2px 0 #9a3412' } : undefined}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>

            {/* Search input — visible only for DM tab */}
            {tab === 'dm' && (
              <div className="flex-shrink-0 px-4 py-3">
                <div className="relative">
                  <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    autoFocus
                    type="text"
                    placeholder="Имя, email или #ID"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full rounded-xl border-2 border-slate-300 bg-white py-2 pl-9 pr-3 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-primary-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
            )}

            {/* Body */}
            <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
              {tab === 'dm' && (
                <>
                  {query.trim().length < 2 ? (
                    <p className="px-4 py-8 text-center text-xs font-medium text-slate-400">
                      Начните вводить имя, email или #ID
                    </p>
                  ) : loading ? (
                    <p className="px-4 py-8 text-center text-xs font-medium text-slate-400">Поиск...</p>
                  ) : users.length === 0 ? (
                    <p className="px-4 py-8 text-center text-xs font-medium text-slate-400">Никого не найдено</p>
                  ) : (
                    users.map(u => (
                      <button
                        key={u._id}
                        type="button"
                        onClick={() => onPickDmUser?.(u)}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-slate-100 dark:hover:bg-slate-700/60"
                      >
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-slate-900 bg-white text-xs font-black text-slate-700 dark:border-white dark:bg-slate-700 dark:text-white">
                          {u.avatar
                            ? <img src={u.avatar} alt="" className="h-full w-full object-cover" />
                            : (u.firstName?.[0] || '?').toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                            {u.firstName} {u.lastName}
                          </p>
                          <p className="truncate text-[11px] font-bold text-primary-500 dark:text-primary-300">
                            {u.username ? `@${u.username}` : `#${(u.uniqueId || '').slice(0, 6)}`}
                          </p>
                        </div>
                        <Plus size={14} className="flex-shrink-0 text-slate-400" />
                      </button>
                    ))
                  )}
                </>
              )}

              {tab === 'group' && (
                <>
                  {groups.length === 0 ? (
                    <p className="px-4 py-8 text-center text-xs font-medium text-slate-400">
                      Нет групп — создайте новую на странице /groups
                    </p>
                  ) : (
                    groups.map(g => (
                      <button
                        key={g._id}
                        type="button"
                        onClick={() => onPickGroup?.(g)}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-slate-100 dark:hover:bg-slate-700/60"
                      >
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-slate-900 bg-amber-100 text-xs font-black text-amber-700 dark:border-white dark:bg-amber-900/30 dark:text-amber-200">
                          {g.avatar
                            ? <img src={g.avatar} alt="" className="h-full w-full object-cover" />
                            : <Users size={16} strokeWidth={2.4} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{g.name}</p>
                          <p className="truncate text-[11px] font-medium text-slate-500 dark:text-slate-400">
                            {g.members?.length || 0} участников
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
