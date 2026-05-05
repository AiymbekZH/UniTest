import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { connectSocket, getSocket } from '../../services/socket';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useChatInbox } from '../../context/ChatInboxContext';

import ChatListSidebar from './ChatList/ChatListSidebar';
import ChatRoomHeader from './ChatRoom/ChatRoomHeader';
import ChatRoomMessages from './ChatRoom/ChatRoomMessages';
import ChatRoomComposer from './ChatRoom/ChatRoomComposer';
import ChatRoomEmpty from './ChatRoom/ChatRoomEmpty';

import { useChatSocket } from './hooks/useChatSocket';
import { useOptimisticMessages } from './hooks/useOptimisticMessages';
import { useTypingBroadcaster } from './hooks/useTypingBroadcaster';

/**
 * Top-level shell for the new mobile-first chat experience. Mounted at:
 *   /chat                     → sidebar only (mobile: just list)
 *   /chat/dm/:conversationId  → DM open
 *   /chat/group/:groupId      → group open
 *
 * Old `/messages` and `/groups/:id` routes remain untouched for now;
 * Phase 5 cuts them over.
 *
 * The layout is purely URL-driven: the URL is the source of truth for
 * which chat is open. This makes deep-linking, browser back, and
 * "share this chat" all just work.
 */
export default function ChatLayout() {
  const navigate = useNavigate();
  const { kind: routeKind, chatId: routeChatId } = useParams();

  const { user } = useAuth();
  const { markConversationRead, markGroupRead } = useChatInbox() || {};
  const currentUserId = user?._id || user?.id;

  // Active chat — derived from URL but also held in state so we can
  // hydrate full chat metadata (otherUserId, group object) without
  // refetching on every render.
  const [activeChat, setActiveChat] = useState(null); // { kind, id, conversation?, group? }
  const [chatLoading, setChatLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [replyTo, setReplyTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);
  const [presenceMap, setPresenceMap] = useState({});
  const typingTimers = useRef({});
  const oldestIdRef = useRef(null); // for cursor pagination

  const isOpen = Boolean(activeChat);
  const kind = activeChat?.kind || null;
  const chatId = activeChat?.id || null;

  // ── Hooks: optimistic message store + socket subscriptions + typing ──
  const {
    messages, setMessages,
    sendMessage, retryMessage,
    applyIncoming, applyDeleted, applyReaction, applyEdit, applyReadByOther,
  } = useOptimisticMessages({ kind, chatId, currentUser: user });

  const { ping: pingTyping } = useTypingBroadcaster({ kind, chatId });

  // ── URL → activeChat sync ──
  // When the user navigates to /chat/dm/:id we need the DM doc to know
  // who the "other user" is. For groups we want the group object so
  // the header can render the avatar. Both fetched once per chat switch.
  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      if (!routeKind || !routeChatId) {
        setActiveChat(null);
        return;
      }
      try {
        if (routeKind === 'dm') {
          // We don't have a direct GET /api/dm/conversations/:id endpoint —
          // the conversation comes back as part of the messages call's
          // 403/404 path. Instead, find it in the sidebar's list via a
          // dedicated lookup endpoint; for Phase 2 we hit the messages
          // endpoint which 403's if we're not in the conv, and infer
          // the otherUserId from the first message we get back. If the
          // conv is empty, the sidebar's selection has the conv object
          // already and passes it via state. Fallback: navigate to /chat.
          if (!cancelled) {
            // The optimistic path: assume the URL is valid; useChatSocket
            // will subscribe to the right rooms regardless. We hydrate
            // `otherUserId` lazily from message senders.
            setActiveChat(prev => {
              if (prev?.kind === 'dm' && prev.id === routeChatId) return prev;
              return { kind: 'dm', id: routeChatId };
            });
          }
        } else if (routeKind === 'group') {
          const res = await api.get(`/groups/${routeChatId}`);
          if (cancelled) return;
          setActiveChat({ kind: 'group', id: routeChatId, group: res.data });
        }
      } catch (err) {
        if (!cancelled) {
          toast.error('Чат недоступен');
          navigate('/chat');
        }
      }
    }
    hydrate();
    return () => { cancelled = true; };
  }, [routeKind, routeChatId, navigate]);

  // ── Initial messages load on chat open ──
  useEffect(() => {
    if (!kind || !chatId) return;
    let cancelled = false;
    setChatLoading(true);
    setHasMore(true);
    oldestIdRef.current = null;

    async function load() {
      try {
        const url = kind === 'dm'
          ? `/dm/conversations/${chatId}/messages`
          : `/groups/${chatId}/messages`;
        const res = await api.get(url);
        if (cancelled) return;
        const list = Array.isArray(res.data) ? res.data : [];
        setMessages(list);
        setHasMore(list.length >= 50);
        if (list.length > 0) {
          oldestIdRef.current = list[0]._id;
        }
        // Mark read.
        if (kind === 'dm') {
          getSocket()?.emit('dm:read', { conversationId: chatId });
          markConversationRead?.(chatId);
        } else {
          markGroupRead?.(chatId);
        }
      } catch (err) {
        if (!cancelled) toast.error('Не удалось загрузить сообщения');
      } finally {
        if (!cancelled) setChatLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [kind, chatId, setMessages, markConversationRead, markGroupRead]);

  // ── Cursor pagination back ──
  const loadMore = useCallback(async () => {
    if (!kind || !chatId || chatLoading || !hasMore || !oldestIdRef.current) return;
    setChatLoading(true);
    try {
      const url = kind === 'dm'
        ? `/dm/conversations/${chatId}/messages`
        : `/groups/${chatId}/messages`;
      const res = await api.get(url, { params: { before: oldestIdRef.current } });
      const list = Array.isArray(res.data) ? res.data : [];
      if (list.length === 0) {
        setHasMore(false);
        return;
      }
      setMessages(prev => [...list, ...prev]);
      oldestIdRef.current = list[0]._id;
      setHasMore(list.length >= 50);
    } catch (_) { /* swallow */ }
    finally { setChatLoading(false); }
  }, [kind, chatId, chatLoading, hasMore, setMessages]);

  // ── Subscribe to socket events for this chat ──
  useChatSocket({
    kind,
    chatId,
    currentUserId,
    handlers: {
      onIncoming: (msg) => {
        applyIncoming(msg);
        // Mark read so receipts move forward.
        if (kind === 'dm') {
          getSocket()?.emit('dm:read', { conversationId: chatId });
        } else {
          markGroupRead?.(chatId);
        }
      },
      onOwnEcho: (msg) => applyIncoming(msg),
      onDeleted: applyDeleted,
      onReaction: applyReaction,
      onEdited: applyEdit,
      onReadByOther: applyReadByOther,
      onTyping: ({ userId, name }) => {
        setTypingUsers(prev => {
          if (prev.find(u => u.userId === userId)) return prev;
          return [...prev, { userId, name }];
        });
        clearTimeout(typingTimers.current[userId]);
        typingTimers.current[userId] = setTimeout(() => {
          setTypingUsers(prev => prev.filter(u => u.userId !== userId));
        }, 3000);
      },
      onStopTyping: ({ userId }) => {
        setTypingUsers(prev => prev.filter(u => u.userId !== userId));
      },
      onError: ({ code, message }) => {
        if (code === 'EMPTY_TEXT') return;
        if (message) toast.error(message);
      },
    },
  });

  // ── Presence subscription (DM only — keep it cheap) ──
  useEffect(() => {
    const socket = connectSocket() || getSocket();
    if (!socket) return;
    const onPresence = ({ userId, online, lastSeen }) => {
      setPresenceMap(prev => ({ ...prev, [String(userId)]: { online, lastSeen } }));
    };
    socket.on('presence:update', onPresence);
    return () => { socket.off('presence:update', onPresence); };
  }, []);

  // ── Action handlers ──
  const handleDelete = useCallback((message, mode) => {
    const socket = getSocket();
    if (!socket || !chatId) return;
    if (kind === 'dm') {
      socket.emit('dm:deleteMessage', { conversationId: chatId, messageId: message._id, mode });
    } else {
      socket.emit('group:deleteMessage', { groupId: chatId, messageId: message._id, mode });
    }
  }, [kind, chatId]);

  const handleReact = useCallback((message, emoji) => {
    const socket = getSocket();
    if (!socket || !chatId) return;
    if (kind === 'dm') {
      socket.emit('dm:reaction', { conversationId: chatId, messageId: message._id, emoji });
    } else {
      // Group reactions land in Phase 3 socket extension; for now no-op.
      toast('Реакции в группах появятся скоро', { icon: '✨' });
    }
  }, [kind, chatId]);

  const handlePin = useCallback((message) => {
    const socket = getSocket();
    if (!socket || !chatId || kind !== 'group') return;
    socket.emit('group:pinMessage', { groupId: chatId, messageId: message._id });
  }, [kind, chatId]);

  const handleEditSubmit = useCallback(async (message, newText) => {
    try {
      // Optimistic update — flip the bubble immediately so the user
      // doesn't wait on the network round-trip. The chat:message:edited
      // socket broadcast (or direct response below) confirms it.
      setMessages(prev => prev.map(m =>
        m._id === message._id
          ? { ...m, text: newText, isEdited: true, editedAt: new Date().toISOString() }
          : m
      ));
      await api.post(`/messages/${message._id}/edit`, { text: newText });
      return true;
    } catch (err) {
      const msg = err?.response?.data?.message || 'Не удалось отредактировать';
      toast.error(msg);
      // Revert on failure.
      setMessages(prev => prev.map(m =>
        m._id === message._id ? { ...m, text: message.text, isEdited: message.isEdited, editedAt: message.editedAt } : m
      ));
      return false;
    }
  }, [setMessages]);

  const handleForward = useCallback(() => {
    // Phase 4 will add a target-picker modal. For now, surface a hint.
    toast('Пересылка появится в следующем обновлении', { icon: '🚧' });
  }, []);

  const handleCopy = useCallback((message) => {
    if (!message?.text) return;
    navigator.clipboard?.writeText(message.text).then(
      () => toast.success('Скопировано'),
      () => toast.error('Не удалось скопировать')
    );
  }, []);

  // ── Sidebar selection callbacks ──
  const onSelectDm = useCallback((conv) => {
    navigate(`/chat/dm/${conv._id}`);
    // Cache the conv on activeChat so we don't have to refetch participants.
    setActiveChat({ kind: 'dm', id: conv._id, conversation: conv });
  }, [navigate]);

  const onSelectGroup = useCallback((group) => {
    navigate(`/chat/group/${group._id}`);
    setActiveChat({ kind: 'group', id: group._id, group });
  }, [navigate]);

  const onStartDmWithUser = useCallback(async (otherUser) => {
    try {
      const res = await api.post('/dm/conversations', { participantId: otherUser._id });
      onSelectDm(res.data);
    } catch (err) {
      toast.error('Не удалось начать диалог');
    }
  }, [onSelectDm]);

  // ── Header derived data ──
  const otherUserDm = useMemo(() => {
    const conv = activeChat?.conversation;
    if (!conv) return null;
    return conv.participants?.find(p => String(p._id) !== String(currentUserId)) || null;
  }, [activeChat, currentUserId]);

  // For DM chats opened directly via URL (no conv state yet), try to
  // infer otherUserId from any non-self message in the list.
  const inferredOtherFromMessages = useMemo(() => {
    if (kind !== 'dm') return null;
    for (const m of messages) {
      const sid = m.sender?._id || m.sender;
      if (sid && String(sid) !== String(currentUserId)) {
        return m.sender; // populated object
      }
    }
    return null;
  }, [kind, messages, currentUserId]);

  const dmHeader = useMemo(() => {
    if (kind !== 'dm') return null;
    const u = otherUserDm || inferredOtherFromMessages;
    const presence = u?._id ? presenceMap[String(u._id)] : null;
    return {
      title: u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Без имени' : '...',
      subtitle: presence?.online ? 'в сети' : '',
      avatar: u?.avatar || '',
      fallback: u?.firstName?.[0] || '?',
      online: !!presence?.online,
      otherUserId: u?._id || null,
    };
  }, [kind, otherUserDm, inferredOtherFromMessages, presenceMap]);

  const groupHeader = useMemo(() => {
    if (kind !== 'group') return null;
    const g = activeChat?.group;
    if (!g) return { title: '...', subtitle: '', avatar: '', fallback: '?', online: false };
    return {
      title: g.name,
      subtitle: `${g.members?.length || 0} участников`,
      avatar: g.avatar || '',
      fallback: g.name?.[0] || '?',
      online: false,
      groupId: g._id,
    };
  }, [kind, activeChat]);

  const header = kind === 'dm' ? dmHeader : groupHeader;

  // ── Permissions ──
  const canPin = useMemo(() => {
    if (kind !== 'group' || !activeChat?.group) return false;
    const g = activeChat.group;
    const member = g.members?.find(m => String(m.user?._id || m.user) === String(currentUserId));
    if (!member) return false;
    const role = g.roles?.find(r => r._id === member.roleId);
    return role?.permissions?.pinMessages === true || member.roleId === 'owner';
  }, [kind, activeChat, currentUserId]);

  const canDeleteEveryone = useMemo(() => {
    if (kind !== 'group' || !activeChat?.group) return false;
    const g = activeChat.group;
    const member = g.members?.find(m => String(m.user?._id || m.user) === String(currentUserId));
    if (!member) return false;
    const role = g.roles?.find(r => r._id === member.roleId);
    return role?.permissions?.deleteMessages === true || member.roleId === 'owner';
  }, [kind, activeChat, currentUserId]);

  const canSend = useMemo(() => {
    if (kind !== 'group' || !activeChat?.group) return true;
    const g = activeChat.group;
    const member = g.members?.find(m => String(m.user?._id || m.user) === String(currentUserId));
    if (!member) return false;
    const role = g.roles?.find(r => r._id === member.roleId);
    return role?.permissions?.sendMessages !== false; // default true
  }, [kind, activeChat, currentUserId]);

  const getMemberRoleColor = useCallback((senderId) => {
    if (kind !== 'group' || !activeChat?.group) return null;
    const g = activeChat.group;
    const member = g.members?.find(m => String(m.user?._id || m.user) === String(senderId));
    if (!member) return null;
    const role = g.roles?.find(r => r._id === member.roleId);
    return role?.color || null;
  }, [kind, activeChat]);

  // ── Render ──
  // overflow-hidden here blocks both scroll axes; min-w-0 on the chat
  // section is the critical bit — without it, any child with intrinsic
  // width larger than the column (e.g. a wide voice-recorder UI) would
  // push the section past the viewport and scroll the page sideways.
  return (
    <div className="flex h-[100dvh] overflow-hidden bg-surface">
      <ChatListSidebar
        currentUserId={currentUserId}
        presenceMap={presenceMap}
        activeKind={kind}
        activeChatId={chatId}
        onSelectDm={onSelectDm}
        onSelectGroup={onSelectGroup}
        onStartDmWithUser={onStartDmWithUser}
        hidden={isOpen}
      />

      <section className={`min-w-0 flex-1 flex-col overflow-hidden bg-white dark:bg-slate-800 ${isOpen ? 'flex' : 'hidden sm:flex'}`}>
        {isOpen ? (
          <>
            <ChatRoomHeader
              kind={kind}
              title={header?.title}
              subtitle={header?.subtitle}
              avatar={header?.avatar}
              fallback={header?.fallback}
              online={header?.online}
              isGroup={kind === 'group'}
              groupId={header?.groupId}
              otherUserId={header?.otherUserId}
              onBack={() => navigate('/chat')}
            />
            <ChatRoomMessages
              messages={messages}
              currentUserId={currentUserId}
              otherUserId={dmHeader?.otherUserId}
              loading={chatLoading}
              hasMore={hasMore}
              onLoadMore={loadMore}
              onReply={setReplyTo}
              onDelete={handleDelete}
              onReact={handleReact}
              onPin={handlePin}
              onEdit={(m) => { setReplyTo(null); setEditingMessage(m); }}
              onForward={handleForward}
              onCopy={handleCopy}
              onRetry={retryMessage}
              canPin={canPin}
              canDeleteEveryone={canDeleteEveryone}
              getMemberRoleColor={getMemberRoleColor}
            />
            {typingUsers.length > 0 && (
              <div className="flex flex-shrink-0 items-center gap-2 border-t border-slate-200 px-4 py-1.5 text-[11px] font-medium text-slate-500 dark:border-slate-700 dark:text-slate-400">
                <span className="inline-flex gap-0.5">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400" style={{ animationDelay: '120ms' }} />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400" style={{ animationDelay: '240ms' }} />
                </span>
                <span>
                  {typingUsers.length === 1
                    ? `${typingUsers[0].name || 'Кто-то'} печатает…`
                    : 'Несколько печатают…'}
                </span>
              </div>
            )}
            <ChatRoomComposer
              onSend={sendMessage}
              onEdit={handleEditSubmit}
              onTypingPing={pingTyping}
              replyTo={replyTo}
              onCancelReply={() => setReplyTo(null)}
              editingMessage={editingMessage}
              onCancelEdit={() => setEditingMessage(null)}
              disabled={!canSend}
              placeholder={canSend ? 'Сообщение...' : 'Нет права отправки в этой группе'}
            />
          </>
        ) : (
          <ChatRoomEmpty />
        )}
      </section>
    </div>
  );
}
