import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Inbox, MessageSquare, Plus, Users } from 'lucide-react';
import api from '../../../services/api';
import ChatListItem from './ChatListItem';
import NewChatSheet from './NewChatSheet';

/**
 * Unified left-side sidebar that lists DMs AND groups in one stream,
 * sorted by lastActivity. Pinned items float to the top.
 *
 * Source data:
 *   - GET /api/dm/conversations  → conversations with lastMessage,
 *     unreadCount, isPinned/isMuted/isArchived flags.
 *   - GET /api/groups/my         → user's groups (no unread metadata
 *     in current API; we render unread=0 for groups in this Phase 2
 *     pass; Phase 4 wires it up via /groups/unread-summary).
 *
 * Active selection is driven by URL params via the parent layout, so
 * this component is mostly presentational.
 */
function getOtherUser(conv, currentUserId) {
  return conv?.participants?.find(p => String(p?._id || p) !== String(currentUserId));
}

export default function ChatListSidebar({
  currentUserId,
  presenceMap,
  activeKind,        // 'dm' | 'group' | null
  activeChatId,      // string | null
  onSelectDm,        // (conversation) => void
  onSelectGroup,     // (group) => void
  onStartDmWithUser, // (user) => Promise<void>
  hidden,            // boolean (mobile: hide when chat open)
}) {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' | 'dm' | 'group' | 'unread'
  const [newOpen, setNewOpen] = useState(false);

  // Initial fetch — hydrate both lists in parallel.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        // Phase 4 Saved Messages: ensure the self-DM exists before
        // the list query so it always shows up in the result. The
        // endpoint is idempotent (get-or-create) — zero server work
        // on subsequent mounts.
        const [convRes, groupRes] = await Promise.all([
          api.get('/dm/saved').then(() => api.get('/dm/conversations')),
          api.get('/groups/my'),
        ]);
        if (cancelled) return;
        setConversations(convRes.data || []);
        setGroups(groupRes.data || []);
      } catch (_) {
        // Silent — banner errors handled by global axios interceptor.
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // Normalize both into the uniform ChatListItem shape so the rendering
  // map below doesn't need to branch.
  const items = useMemo(() => {
    const dmItems = (conversations || [])
      .filter(c => !c.isArchived)
      .map(c => {
        // Saved Messages: single-participant self-DM. Render with
        // bookmark icon and a 'pinned-forever' treatment so it stays
        // at the top of the list regardless of last activity.
        if (c.isSelf) {
          return {
            key: `dm-${c._id}`,
            kind: 'dm',
            chatId: c._id,
            iconType: 'saved',
            title: 'Избранное',
            subtitle: c.lastMessage?.text
              || (c.lastMessage?.attachments?.length ? '📎 Вложение' : 'Заметки и файлы для себя'),
            avatar: '',
            fallback: '★',
            online: false,
            isGroup: false,
            // Force isPinned true for sort anchoring. The explicit
            // pinnedBy state on the doc is ignored for self-DMs since
            // 'unpin' doesn't make sense here.
            isPinned: true,
            isMuted: false,
            unreadCount: 0, // Own messages never count as unread.
            lastActivity: c.lastActivity,
            raw: c,
          };
        }

        const other = getOtherUser(c, currentUserId);
        const presence = presenceMap?.[String(other?._id)] || {};
        return {
          key: `dm-${c._id}`,
          kind: 'dm',
          chatId: c._id,
          title: `${other?.firstName || ''} ${other?.lastName || ''}`.trim() || 'Без имени',
          subtitle: c.lastMessage?.text || (c.lastMessage?.attachments?.length ? '📎 Вложение' : '...'),
          avatar: other?.avatar || '',
          fallback: other?.firstName?.[0] || '?',
          online: !!presence.online,
          isGroup: false,
          isPinned: !!c.isPinned,
          isMuted: !!c.isMuted,
          unreadCount: c.unreadCount || 0,
          lastActivity: c.lastActivity,
          raw: c,
        };
      });

    const groupItems = (groups || [])
      .filter(g => !g.isDeleted)
      .map(g => ({
        key: `group-${g._id}`,
        kind: 'group',
        chatId: g._id,
        title: g.name,
        subtitle: g.announcement?.text || `${g.members?.length || 0} участников`,
        avatar: g.avatar || '',
        fallback: g.name?.[0] || '?',
        online: false,
        isGroup: true,
        memberCount: g.members?.length || 0,
        isPinned: false,
        isMuted: false,
        unreadCount: 0, // Phase 4: wire group unread aggregate
        lastActivity: g.updatedAt || g.createdAt,
        raw: g,
      }));

    let merged = [...dmItems, ...groupItems];

    // Apply filter.
    if (filter === 'dm') merged = merged.filter(i => i.kind === 'dm');
    else if (filter === 'group') merged = merged.filter(i => i.kind === 'group');
    else if (filter === 'unread') merged = merged.filter(i => i.unreadCount > 0);

    // Sort: Saved Messages always at the very top, then pinned, then
    // lastActivity desc. Two tiers of priority so the self-DM never
    // falls below a busier pinned DM.
    merged.sort((a, b) => {
      const aSaved = a.iconType === 'saved' ? 1 : 0;
      const bSaved = b.iconType === 'saved' ? 1 : 0;
      if (aSaved !== bSaved) return bSaved - aSaved;
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return new Date(b.lastActivity || 0) - new Date(a.lastActivity || 0);
    });

    return merged;
  }, [conversations, groups, currentUserId, presenceMap, filter]);

  const totalUnread = items.reduce((sum, i) => sum + (i.unreadCount || 0), 0);

  return (
    <aside className={`w-full flex-shrink-0 flex-col border-r-2 border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 sm:flex sm:w-[320px] ${
      hidden ? 'hidden sm:flex' : 'flex'
    }`}>
      {/* Header */}
      <div className="flex-shrink-0 border-b-2 border-slate-200 px-3 py-3 dark:border-slate-700 sm:px-4 sm:py-4">
        <div className="mb-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border-2 border-slate-900 bg-white text-slate-900 transition active:translate-y-[2px] dark:border-white dark:bg-slate-900 dark:text-white"
            style={{ boxShadow: '0 3px 0 #0f172a' }}
            aria-label="Назад"
          >
            <ArrowLeft size={15} strokeWidth={2.4} />
          </button>
          <h1 className="text-base font-black tracking-tight text-slate-900 dark:text-white">Чаты</h1>
          {totalUnread > 0 && (
            <span className="ml-auto inline-flex h-6 min-w-[24px] items-center justify-center rounded-full border-2 border-slate-900 bg-primary-500 px-1.5 text-[10px] font-black text-white dark:border-white">
              {totalUnread > 99 ? '99+' : totalUnread}
            </span>
          )}
          <button
            type="button"
            onClick={() => setNewOpen(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border-2 border-slate-900 bg-primary-500 text-white transition active:translate-y-[2px] dark:border-white"
            style={{ boxShadow: '0 3px 0 #9a3412' }}
            aria-label="Новый чат"
            title="Новый чат"
          >
            <Plus size={15} strokeWidth={2.6} />
          </button>
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'all', label: 'Все', icon: Inbox },
            { id: 'dm', label: 'Личные', icon: MessageSquare },
            { id: 'group', label: 'Группы', icon: Users },
            { id: 'unread', label: 'Непроч.', icon: null },
          ].map(t => {
            const on = filter === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setFilter(t.id)}
                className={`inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1 text-[11px] font-black transition active:translate-y-[1px] ${
                  on
                    ? 'border-slate-900 bg-primary-500 text-white dark:border-white'
                    : 'border-slate-300 bg-white text-slate-600 hover:border-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300'
                }`}
                style={on ? { boxShadow: '0 2px 0 #9a3412' } : undefined}
              >
                {t.icon && <t.icon size={11} strokeWidth={2.4} />}
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="space-y-2 p-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-center gap-3 rounded-2xl border-2 border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/40">
                <div className="h-11 w-11 flex-shrink-0 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-700" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-2/3 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                  <div className="h-2.5 w-1/2 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
            <div
              className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-slate-900 bg-primary-50 text-primary-500 dark:border-white dark:bg-primary-900/20 dark:text-primary-300"
              style={{ boxShadow: '0 3px 0 #0f172a' }}
            >
              <MessageSquare size={24} strokeWidth={2.2} />
            </div>
            <p className="text-sm font-black text-slate-900 dark:text-white">Здесь пока пусто</p>
            <p className="mt-1 text-xs font-medium text-slate-400">
              Найдите кого-нибудь через «+» сверху
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {items.map(it => {
              const active = activeKind === it.kind && String(activeChatId) === String(it.chatId);
              return (
                <ChatListItem
                  key={it.key}
                  chat={it}
                  active={active}
                  onClick={() => {
                    if (it.kind === 'dm') onSelectDm?.(it.raw);
                    else onSelectGroup?.(it.raw);
                  }}
                />
              );
            })}
          </div>
        )}
      </div>

      <NewChatSheet
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onPickDmUser={async (u) => {
          setNewOpen(false);
          await onStartDmWithUser?.(u);
        }}
        onPickGroup={(g) => {
          setNewOpen(false);
          onSelectGroup?.(g);
        }}
      />
    </aside>
  );
}
