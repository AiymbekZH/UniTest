import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Search, MessageSquare, User as UserIcon, Swords, Plus, X as XIcon, Sparkles, Pin, BellOff, Archive, MoreVertical, Inbox } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useChatInbox } from '../context/ChatInboxContext';
import { connectSocket, getSocket } from '../services/socket';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import MessageList from '../components/chat/MessageList';
import ChatInput from '../components/chat/ChatInput';
import TypingIndicator from '../components/chat/TypingIndicator';

export default function Messages() {
  const { user } = useAuth();
  const { openChat, clearActiveChat, markConversationRead } = useChatInbox();
  const navigate = useNavigate();
  const currentUserId = user?._id || user?.id;
  const [conversations, setConversations] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [replyTo, setReplyTo] = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showDuelModal, setShowDuelModal] = useState(false);
  const [duelTests, setDuelTests] = useState([]);
  const [duelLoading, setDuelLoading] = useState(false);
  const [presenceMap, setPresenceMap] = useState({}); // { userId: { online: bool, lastSeen: ISO } }
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'archived'
  const [menuConvId, setMenuConvId] = useState(null);
  const [showChatSearch, setShowChatSearch] = useState(false);
  const [chatSearchQ, setChatSearchQ] = useState('');
  const [chatSearchResults, setChatSearchResults] = useState([]);
  const [chatSearching, setChatSearching] = useState(false);
  const [highlightMessageId, setHighlightMessageId] = useState(null);
  const typingTimeoutRef = useRef({});
  const socketRef = useRef(null);
  const selectedConversationIdRef = useRef(null);

  useEffect(() => {
    selectedConversationIdRef.current = selectedConv?._id || null;
  }, [selectedConv?._id]);

  useEffect(() => {
    const s = connectSocket();
    socketRef.current = s;
    fetchConversations();

    if (s) {
      const handleMsg = (msg) => {
        const senderId = msg.sender?._id || msg.sender;
        const isOpenConversation = selectedConversationIdRef.current === msg.conversationId;

        // Update conversations list
        setConversations(prev => {
          const idx = prev.findIndex(c => c._id === msg.conversationId);
          if (idx === -1) {
            fetchConversations();
            return prev;
          }
          const updated = [...prev];
          updated[idx] = {
            ...updated[idx],
            lastMessage: msg,
            lastActivity: new Date().toISOString(),
            unreadCount: senderId !== currentUserId && !isOpenConversation
              ? (updated[idx].unreadCount || 0) + 1
              : 0,
          };
          updated.sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));
          return updated;
        });

        // Add to messages if this conversation is open
        if (isOpenConversation) {
          setMessages(prev => [...prev, msg]);
          if (senderId !== currentUserId) {
            markConversationRead(msg.conversationId);
          }
        }
      };

      const handleTyping = ({ conversationId, userId, name }) => {
        if (userId === currentUserId) return;
        setTypingUsers(prev => {
          if (prev.find(u => u.userId === userId)) return prev;
          return [...prev, { userId, name }];
        });
        clearTimeout(typingTimeoutRef.current[userId]);
        typingTimeoutRef.current[userId] = setTimeout(() => {
          setTypingUsers(prev => prev.filter(u => u.userId !== userId));
        }, 3000);
      };

      const handleStopTyping = ({ userId }) => {
        setTypingUsers(prev => prev.filter(u => u.userId !== userId));
      };

      const handleDeleted = ({ conversationId, messageId, mode }) => {
        if (selectedConversationIdRef.current === conversationId) {
          setMessages(prev => (
            mode === 'self'
              ? prev.filter(msg => msg._id !== messageId)
              : prev.map(msg => msg._id === messageId ? { ...msg, isDeleted: true, text: '', attachments: [] } : msg)
          ));
        }
        fetchConversations();
      };

      const handleError = ({ message }) => {
        if (message) toast.error(message);
      };

      const handleDmRead = ({ conversationId, readBy }) => {
        // The other party read messages in this conversation —
        // mark all our own messages there as readBy them.
        if (selectedConversationIdRef.current !== conversationId) return;
        const readerId = String(readBy);
        setMessages(prev => prev.map(msg => {
          const senderId = String(msg.sender?._id || msg.sender || '');
          if (senderId !== currentUserId) return msg;
          const cur = Array.isArray(msg.readBy) ? msg.readBy : [];
          if (cur.some(id => String(id?._id || id) === readerId)) return msg;
          return { ...msg, readBy: [...cur, readerId] };
        }));
      };

      const handlePresence = ({ userId, online, lastSeen }) => {
        if (!userId) return;
        setPresenceMap(prev => ({ ...prev, [String(userId)]: { online: !!online, lastSeen } }));
      };

      const handlePresenceList = ({ statuses }) => {
        if (!Array.isArray(statuses)) return;
        setPresenceMap(prev => {
          const next = { ...prev };
          for (const st of statuses) {
            if (st?.userId) next[String(st.userId)] = { online: !!st.online, lastSeen: st.lastSeen };
          }
          return next;
        });
      };

      const handleReaction = ({ conversationId, messageId, reactions }) => {
        if (selectedConversationIdRef.current !== conversationId) return;
        setMessages(prev => prev.map(msg =>
          msg._id === messageId ? { ...msg, reactions } : msg
        ));
      };

      s.on('dm:message', handleMsg);
      s.on('dm:typing', handleTyping);
      s.on('dm:stopTyping', handleStopTyping);
      s.on('dm:messageDeleted', handleDeleted);
      s.on('dm:read', handleDmRead);
      s.on('dm:reaction', handleReaction);
      s.on('dm:error', handleError);
      s.on('presence:update', handlePresence);
      s.on('presence:list', handlePresenceList);

      return () => {
        s.off('dm:message', handleMsg);
        s.off('dm:typing', handleTyping);
        s.off('dm:stopTyping', handleStopTyping);
        s.off('dm:messageDeleted', handleDeleted);
        s.off('dm:read', handleDmRead);
        s.off('dm:reaction', handleReaction);
        s.off('dm:error', handleError);
        s.off('presence:update', handlePresence);
        s.off('presence:list', handlePresenceList);
      };
    }
  }, []);

  // Request presence for all conversation partners when conversations load
  useEffect(() => {
    if (!conversations.length) return;
    const s = socketRef.current || getSocket();
    if (!s) return;
    const userIds = conversations
      .map(c => getOtherUser(c)?._id)
      .filter(Boolean);
    if (userIds.length > 0) {
      s.emit('presence:get', { userIds });
    }
  }, [conversations.length]);

  useEffect(() => {
    if (selectedConv?._id) {
      openChat('dm', selectedConv._id);
      markConversationRead(selectedConv._id);
      return;
    }
    clearActiveChat();
  }, [clearActiveChat, markConversationRead, openChat, selectedConv?._id]);

  useEffect(() => () => clearActiveChat(), [clearActiveChat]);

  const fetchConversations = async () => {
    try {
      const res = await api.get('/dm/conversations');
      setConversations(res.data);
    } catch (e) { /* ignore */ }
    finally { setLoading(false); }
  };

  const handleReact = (message, emoji) => {
    if (!selectedConv?._id || !message?._id || !emoji) return;
    const s = socketRef.current || getSocket();
    if (!s) return;
    s.emit('dm:reaction', {
      conversationId: selectedConv._id,
      messageId: message._id,
      emoji,
    });
  };

  const runChatSearch = async (query) => {
    setChatSearchQ(query);
    if (!selectedConv?._id || query.trim().length < 2) {
      setChatSearchResults([]);
      return;
    }
    setChatSearching(true);
    try {
      const res = await api.get(`/dm/conversations/${selectedConv._id}/search`, {
        params: { q: query.trim() },
      });
      setChatSearchResults(res.data || []);
    } catch (e) {
      setChatSearchResults([]);
    } finally {
      setChatSearching(false);
    }
  };

  const jumpToMessage = (msgId) => {
    setShowChatSearch(false);
    setChatSearchQ('');
    setChatSearchResults([]);
    setHighlightMessageId(msgId);
    setTimeout(() => {
      const el = document.querySelector(`[data-msg-id="${msgId}"]`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
    setTimeout(() => setHighlightMessageId(null), 2200);
  };

  const toggleConvFlag = async (convId, action) => {
    // action: 'pin' | 'mute' | 'archive'
    const flagKey = action === 'pin' ? 'isPinned' : action === 'mute' ? 'isMuted' : 'isArchived';
    // Optimistic update
    setConversations(prev => prev.map(c => c._id === convId ? { ...c, [flagKey]: !c[flagKey] } : c));
    setMenuConvId(null);
    try {
      const res = await api.patch(`/dm/conversations/${convId}/${action}`);
      const newVal = res.data?.[flagKey];
      setConversations(prev => {
        let next = prev.map(c => c._id === convId ? { ...c, [flagKey]: newVal } : c);
        // Re-sort to keep pinned at top
        next = [...next].sort((a, b) => {
          if (!!a.isPinned !== !!b.isPinned) return a.isPinned ? -1 : 1;
          return new Date(b.lastActivity) - new Date(a.lastActivity);
        });
        return next;
      });
      const labels = {
        pin: newVal ? 'Закреплено' : 'Откреплено',
        mute: newVal ? 'Уведомления отключены' : 'Уведомления включены',
        archive: newVal ? 'Перенесено в архив' : 'Возвращено из архива',
      };
      toast.success(labels[action]);
    } catch (e) {
      // Rollback
      setConversations(prev => prev.map(c => c._id === convId ? { ...c, [flagKey]: !c[flagKey] } : c));
      toast.error('Ошибка');
    }
  };

  const loadMessages = async (convId, reset = false) => {
    setChatLoading(true);
    try {
      const oldest = reset ? undefined : messages[0]?._id;
      const url = `/dm/conversations/${convId}/messages?limit=50${oldest ? `&before=${oldest}` : ''}`;
      const res = await api.get(url);
      if (reset) { setMessages(res.data); setHasMore(res.data.length >= 50); }
      else { setMessages(prev => [...res.data, ...prev]); setHasMore(res.data.length >= 50); }
    } catch (e) { /* ignore */ }
    finally { setChatLoading(false); }
  };

  const selectConversation = (conv) => {
    setSelectedConv(conv);
    setMessages([]);
    setTypingUsers([]);
    loadMessages(conv._id, true);
    markConversationRead(conv._id);
    setConversations(prev => prev.map(c => c._id === conv._id ? { ...c, unreadCount: 0 } : c));
  };

  const loadMore = useCallback(async () => {
    if (!selectedConv || chatLoading) return;
    await loadMessages(selectedConv._id, false);
  }, [selectedConv, chatLoading, messages]);

  const sendMessage = (data) => {
    const s = socketRef.current || getSocket();
    if (!s || !selectedConv) return;
    s.emit('dm:message', { conversationId: selectedConv._id, ...data });
    s.emit('dm:stopTyping', { conversationId: selectedConv._id });
  };

  const deleteMessage = (message, mode) => {
    const s = socketRef.current || getSocket();
    if (!s || !selectedConv) return;
    s.emit('dm:deleteMessage', {
      conversationId: selectedConv._id,
      messageId: message._id,
      mode,
    });
  };

  const searchUsers = async (q) => {
    setSearchQuery(q);
    if (q.trim().length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await api.get(`/dm/search/users?q=${encodeURIComponent(q.trim())}`);
      setSearchResults(res.data);
    } catch (e) { /* ignore */ }
    finally { setSearching(false); }
  };

  const startConversation = async (participantId) => {
    try {
      const res = await api.post('/dm/conversations', { participantId });
      // Add to list if not already there
      setConversations(prev => {
        if (prev.find(c => c._id === res.data._id)) return prev;
        return [res.data, ...prev];
      });
      selectConversation(res.data);
      setSearchQuery('');
      setSearchResults([]);
    } catch (e) { toast.error(e.response?.data?.message || 'Ошибка'); }
  };

  const getOtherUser = (conv) => (
    conv.participants?.find(p => p._id !== currentUserId) || conv.participants?.[0]
  );

  const openDuelModal = async () => {
    if (!selectedConv?._id) return;
    setShowDuelModal(true);
    setDuelLoading(true);
    try {
      const res = await api.get('/tests?limit=50&sort=popular');
      setDuelTests(res.data.tests || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Не удалось загрузить тесты для дуэли');
    } finally {
      setDuelLoading(false);
    }
  };

  const startDuel = async (testId) => {
    if (!selectedConv?._id) return;
    setDuelLoading(true);
    try {
      const res = await api.post('/arena/rooms', {
        testId,
        sourceType: 'dm_duel',
        conversationId: selectedConv._id
      });
      setShowDuelModal(false);
      navigate(`/arena/code/${res.data.room.joinCode}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Не удалось отправить дуэль');
    } finally {
      setDuelLoading(false);
    }
  };

  const timeAgo = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const now = new Date();
    const diff = (now - d) / 1000;
    if (diff < 60) return 'сейчас';
    if (diff < 3600) return `${Math.floor(diff / 60)} мин`;
    if (diff < 86400) return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  };

  const formatLastSeen = (lastSeen) => {
    if (!lastSeen) return 'был давно';
    const d = new Date(lastSeen);
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return 'был только что';
    if (diff < 3600) return `был ${Math.floor(diff / 60)} мин назад`;
    if (diff < 86400) return `был ${Math.floor(diff / 3600)} ч назад`;
    if (diff < 86400 * 7) return `был ${Math.floor(diff / 86400)} дн назад`;
    return `был ${d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}`;
  };

  const presenceFor = (userId) => {
    if (!userId) return { online: false, lastSeen: null };
    return presenceMap[String(userId)] || { online: false, lastSeen: null };
  };

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <main className="mx-auto max-w-6xl px-2 py-3 sm:px-4 sm:py-5 lg:px-6">
        <div className="chunky-card flex h-[calc(100vh-110px)] overflow-hidden p-0 sm:h-[calc(100vh-130px)]">
          {/* ── Sidebar: conversations list ── */}
          <aside
            className={`w-full flex-shrink-0 flex-col border-r-2 border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 sm:flex sm:w-[320px] ${
              selectedConv ? 'hidden sm:flex' : 'flex'
            }`}
          >
            {/* Sidebar header */}
            <div className="flex-shrink-0 border-b-2 border-slate-200 px-3 py-3 dark:border-slate-700 sm:px-4 sm:py-4">
              <div className="mb-3 flex items-center gap-2">
                <button
                  onClick={() => navigate(-1)}
                  className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border-2 border-slate-900 bg-white text-slate-900 transition active:translate-y-[2px] dark:border-white dark:bg-slate-900 dark:text-white"
                  style={{ boxShadow: '0 3px 0 #0f172a' }}
                  aria-label="Назад"
                >
                  <ArrowLeft size={15} strokeWidth={2.4} />
                </button>
                <h1 className="text-base font-black tracking-tight text-slate-900 dark:text-white">Сообщения</h1>
                {conversations.length > 0 && (
                  <span className="ml-auto inline-flex h-6 min-w-[24px] items-center justify-center rounded-full border-2 border-slate-900 bg-primary-50 px-1.5 text-[10px] font-black text-primary-700 dark:border-white dark:bg-primary-900/20 dark:text-primary-200">
                    {conversations.length}
                  </span>
                )}
              </div>
              {/* Chunky search */}
              <div className="relative">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  className="w-full rounded-xl border-2 border-slate-300 bg-white py-2 pl-9 pr-3 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-primary-900/30"
                  placeholder="Поиск по нику, email, ID..."
                  value={searchQuery}
                  onChange={(e) => searchUsers(e.target.value)}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => { setSearchQuery(''); setSearchResults([]); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700"
                    aria-label="Очистить"
                  >
                    <XIcon size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* Search results */}
            {searchQuery.length >= 2 && (
              <div className="flex-shrink-0 border-b-2 border-slate-200 bg-slate-50/60 dark:border-slate-700 dark:bg-slate-900/40">
                <p className="px-4 pt-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Найдено
                </p>
                <div className="max-h-56 overflow-y-auto py-2">
                  {searching ? (
                    <p className="py-4 text-center text-xs font-medium text-slate-400">Поиск...</p>
                  ) : searchResults.length === 0 ? (
                    <p className="py-4 text-center text-xs font-medium text-slate-400">Никого не найдено</p>
                  ) : (
                    searchResults.map(u => (
                      <button
                        key={u._id}
                        onClick={() => startConversation(u._id)}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-white dark:hover:bg-slate-800"
                      >
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-slate-900 bg-white text-xs font-black text-slate-700 dark:border-white dark:bg-slate-700 dark:text-white">
                          {u.avatar ? <img src={u.avatar} className="h-full w-full object-cover" alt="" /> : (u.firstName?.[0] || '?').toUpperCase()}
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
                </div>
              </div>
            )}

            {/* Filter tabs: All / Archived */}
            {!loading && conversations.length > 0 && (
              <div className="flex-shrink-0 border-b-2 border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
                <div className="flex gap-1.5">
                  {[
                    { id: 'all', label: 'Активные', icon: Inbox, count: conversations.filter(c => !c.isArchived).length },
                    { id: 'archived', label: 'Архив', icon: Archive, count: conversations.filter(c => c.isArchived).length },
                  ].map(t => {
                    const isOn = filterMode === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setFilterMode(t.id)}
                        className={`inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1 text-[11px] font-black transition active:translate-y-[1px] ${
                          isOn
                            ? 'border-slate-900 bg-primary-500 text-white dark:border-white'
                            : 'border-slate-300 bg-white text-slate-600 hover:border-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                        style={isOn ? { boxShadow: '0 2px 0 #9a3412' } : undefined}
                      >
                        <t.icon size={11} strokeWidth={2.4} />
                        <span>{t.label}</span>
                        {t.count > 0 && (
                          <span className={`ml-0.5 rounded-full px-1.5 text-[9px] ${isOn ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300'}`}>
                            {t.count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Conversations list */}
            <div className="flex-1 overflow-y-auto p-2" onClick={() => menuConvId && setMenuConvId(null)}>
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
              ) : conversations.length === 0 && searchQuery.length < 2 ? (
                <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
                  <div
                    className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-slate-900 bg-primary-50 text-primary-500 dark:border-white dark:bg-primary-900/20 dark:text-primary-300"
                    style={{ boxShadow: '0 3px 0 #0f172a' }}
                  >
                    <MessageSquare size={24} strokeWidth={2.2} />
                  </div>
                  <p className="text-sm font-black text-slate-900 dark:text-white">Нет диалогов</p>
                  <p className="mt-1 text-xs font-medium text-slate-400">
                    Найди пользователя через поиск выше
                  </p>
                </div>
              ) : (() => {
                const visible = conversations.filter(c => filterMode === 'archived' ? c.isArchived : !c.isArchived);
                if (visible.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
                      <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-slate-300 bg-slate-50 text-slate-400 dark:border-slate-600 dark:bg-slate-900/30">
                        {filterMode === 'archived' ? <Archive size={20} strokeWidth={2.2} /> : <Inbox size={20} strokeWidth={2.2} />}
                      </div>
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        {filterMode === 'archived' ? 'Архив пуст' : 'Нет активных диалогов'}
                      </p>
                    </div>
                  );
                }
                return visible.map(conv => {
                  const other = getOtherUser(conv);
                  const isActive = selectedConv?._id === conv._id;
                  const presence = presenceFor(other?._id);
                  const menuOpen = menuConvId === conv._id;
                  return (
                    <div
                      key={conv._id}
                      className={`group relative mb-1.5 rounded-2xl border-2 transition ${
                        isActive
                          ? 'border-slate-900 bg-primary-50 dark:border-white dark:bg-primary-900/15'
                          : 'border-transparent hover:border-slate-200 hover:bg-slate-50 dark:hover:border-slate-700 dark:hover:bg-slate-700/40'
                      }`}
                      style={isActive ? { boxShadow: '0 2px 0 #0f172a' } : undefined}
                    >
                      <button
                        type="button"
                        onClick={() => selectConversation(conv)}
                        onContextMenu={(e) => { e.preventDefault(); setMenuConvId(menuOpen ? null : conv._id); }}
                        className="flex w-full items-center gap-3 px-3 py-2.5 text-left active:translate-y-[1px]"
                      >
                        <div className="relative flex-shrink-0">
                          <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border-2 border-slate-900 bg-white text-sm font-black text-slate-700 dark:border-white dark:bg-slate-700 dark:text-white">
                            {other?.avatar ? <img src={other.avatar} className="h-full w-full object-cover" alt="" /> : (other?.firstName?.[0] || '?').toUpperCase()}
                          </div>
                          {presence.online && (
                            <span
                              className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500 dark:border-slate-800"
                              aria-label="online"
                            />
                          )}
                        </div>
                        <div className="min-w-0 flex-1 pr-7">
                          <div className="flex items-baseline justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-1.5">
                              <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                                {other?.firstName} {other?.lastName}
                              </p>
                              {conv.isPinned && <Pin size={11} strokeWidth={2.6} className="flex-shrink-0 text-primary-500" />}
                              {conv.isMuted && <BellOff size={11} strokeWidth={2.6} className="flex-shrink-0 text-slate-400" />}
                            </div>
                            <span className="flex-shrink-0 text-[10px] font-bold text-slate-400">{timeAgo(conv.lastActivity)}</span>
                          </div>
                          <div className="mt-0.5 flex items-center justify-between gap-2">
                            <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                              {conv.lastMessage?.text || '...'}
                            </p>
                            {conv.unreadCount > 0 && (
                              <span
                                className={`flex h-5 min-w-[20px] flex-shrink-0 items-center justify-center rounded-full border-2 px-1 text-[10px] font-black ${
                                  conv.isMuted
                                    ? 'border-slate-400 bg-slate-300 text-white dark:border-slate-500 dark:bg-slate-600'
                                    : 'border-slate-900 bg-primary-500 text-white dark:border-white'
                                }`}
                              >
                                {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>

                      {/* Menu trigger */}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setMenuConvId(menuOpen ? null : conv._id); }}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 opacity-0 transition hover:bg-white hover:text-slate-700 group-hover:opacity-100 dark:hover:bg-slate-700 dark:hover:text-white"
                        aria-label="Действия"
                        style={menuOpen ? { opacity: 1 } : undefined}
                      >
                        <MoreVertical size={14} strokeWidth={2.4} />
                      </button>

                      {/* Context menu */}
                      {menuOpen && (
                        <div
                          className="absolute right-2 top-12 z-30 min-w-[170px] rounded-xl border-2 border-slate-900 bg-white p-1.5 dark:border-white dark:bg-slate-800"
                          style={{ boxShadow: '0 4px 0 #0f172a' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => toggleConvFlag(conv._id, 'pin')}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-bold text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                          >
                            <Pin size={13} strokeWidth={2.4} />
                            {conv.isPinned ? 'Открепить' : 'Закрепить'}
                          </button>
                          <button
                            onClick={() => toggleConvFlag(conv._id, 'mute')}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-bold text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                          >
                            <BellOff size={13} strokeWidth={2.4} />
                            {conv.isMuted ? 'Включить уведомления' : 'Отключить уведомления'}
                          </button>
                          <button
                            onClick={() => toggleConvFlag(conv._id, 'archive')}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-bold text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                          >
                            <Archive size={13} strokeWidth={2.4} />
                            {conv.isArchived ? 'Из архива' : 'В архив'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          </aside>

          {/* ── Chat area ── */}
          <section className={`flex-1 flex-col ${selectedConv ? 'flex' : 'hidden sm:flex'}`}>
            {selectedConv ? (
              <>
                {/* Chat header */}
                <div className="flex flex-shrink-0 items-center gap-2.5 border-b-2 border-slate-200 bg-white px-3 py-3 dark:border-slate-700 dark:bg-slate-800 sm:gap-3 sm:px-4">
                  <button
                    onClick={() => { setSelectedConv(null); setMessages([]); }}
                    className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border-2 border-slate-900 bg-white text-slate-900 transition active:translate-y-[2px] dark:border-white dark:bg-slate-900 dark:text-white sm:hidden"
                    style={{ boxShadow: '0 3px 0 #0f172a' }}
                    aria-label="Назад к списку"
                  >
                    <ArrowLeft size={15} strokeWidth={2.4} />
                  </button>
                  {(() => {
                    const other = getOtherUser(selectedConv);
                    const presence = presenceFor(other?._id);
                    return (
                      <>
                        <button
                          type="button"
                          onClick={() => other?._id && navigate(`/profile/${other._id}`)}
                          className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-slate-900 bg-white text-xs font-black text-slate-700 transition hover:scale-[1.04] dark:border-white dark:bg-slate-700 dark:text-white"
                        >
                          {other?.avatar ? <img src={other.avatar} className="h-full w-full object-cover" alt="" /> : (other?.firstName?.[0] || '?').toUpperCase()}
                          {presence.online && (
                            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 dark:border-slate-800" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => other?._id && navigate(`/profile/${other._id}`)}
                          className="min-w-0 flex-1 text-left transition hover:opacity-80"
                        >
                          <p className="truncate text-sm font-black text-slate-900 dark:text-white">
                            {other?.firstName} {other?.lastName}
                          </p>
                          <p className="truncate text-[11px] font-bold">
                            {presence.online
                              ? <span className="text-emerald-600 dark:text-emerald-400">в сети</span>
                              : <span className="text-slate-400">{formatLastSeen(presence.lastSeen)}</span>}
                          </p>
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowChatSearch(prev => !prev)}
                          className={`inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border-2 border-slate-900 transition active:translate-y-[2px] dark:border-white ${
                            showChatSearch
                              ? 'bg-primary-500 text-white'
                              : 'bg-white text-slate-700 dark:bg-slate-900 dark:text-slate-200'
                          }`}
                          style={{ boxShadow: showChatSearch ? '0 3px 0 #9a3412' : '0 3px 0 #0f172a' }}
                          aria-label="Поиск в чате"
                          title="Поиск в чате"
                        >
                          <Search size={14} strokeWidth={2.4} />
                        </button>
                        <button
                          type="button"
                          onClick={openDuelModal}
                          className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-xl border-2 border-slate-900 bg-orange-50 px-2.5 py-2 text-[11px] font-black text-orange-700 transition active:translate-y-[2px] dark:border-white dark:bg-orange-900/20 dark:text-orange-300 sm:gap-2 sm:px-3 sm:text-xs"
                          style={{ boxShadow: '0 3px 0 #c2410c' }}
                        >
                          <Swords size={13} strokeWidth={2.4} /> <span className="hidden sm:inline">Дуэль</span>
                        </button>
                      </>
                    );
                  })()}
                </div>

                {/* In-chat search overlay */}
                {showChatSearch && (
                  <div className="flex-shrink-0 border-b-2 border-slate-200 bg-slate-50/60 dark:border-slate-700 dark:bg-slate-900/40">
                    <div className="px-3 py-2 sm:px-4">
                      <div className="relative">
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" strokeWidth={2.4} />
                        <input
                          autoFocus
                          type="text"
                          value={chatSearchQ}
                          onChange={(e) => runChatSearch(e.target.value)}
                          placeholder="Поиск по сообщениям..."
                          className="w-full rounded-xl border-2 border-slate-300 bg-white py-2 pl-9 pr-9 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
                        />
                        <button
                          type="button"
                          onClick={() => { setShowChatSearch(false); setChatSearchQ(''); setChatSearchResults([]); }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700"
                          aria-label="Закрыть поиск"
                        >
                          <XIcon size={13} />
                        </button>
                      </div>
                    </div>
                    {chatSearchQ.trim().length >= 2 && (
                      <div className="max-h-72 overflow-y-auto border-t-2 border-slate-200 dark:border-slate-700">
                        {chatSearching ? (
                          <p className="py-4 text-center text-xs font-medium text-slate-400">Поиск...</p>
                        ) : chatSearchResults.length === 0 ? (
                          <p className="py-4 text-center text-xs font-medium text-slate-400">Ничего не найдено</p>
                        ) : (
                          <>
                            <p className="px-4 pt-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                              Найдено: {chatSearchResults.length}
                            </p>
                            <div className="py-1">
                              {chatSearchResults.map(m => {
                                const senderName = m.sender?._id === currentUserId
                                  ? 'Вы'
                                  : m.sender?.firstName || '';
                                const dateStr = new Date(m.createdAt).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
                                return (
                                  <button
                                    key={m._id}
                                    onClick={() => jumpToMessage(m._id)}
                                    className="block w-full px-4 py-2 text-left transition hover:bg-white dark:hover:bg-slate-800"
                                  >
                                    <div className="flex items-baseline justify-between gap-3">
                                      <span className="truncate text-[11px] font-black text-primary-600 dark:text-primary-300">{senderName}</span>
                                      <span className="flex-shrink-0 text-[10px] font-bold text-slate-400">{dateStr}</span>
                                    </div>
                                    <p className="mt-0.5 line-clamp-2 text-xs font-medium text-slate-700 dark:text-slate-200">
                                      {m.text}
                                    </p>
                                  </button>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Messages */}
                <MessageList
                  messages={messages}
                  currentUserId={currentUserId}
                  otherUserId={getOtherUser(selectedConv)?._id}
                  onReply={setReplyTo}
                  onDelete={deleteMessage}
                  onReact={handleReact}
                  onPin={() => {}}
                  getDeleteOptions={(message, isOwn) => ({ self: true, everyone: isOwn })}
                  canPin={false}
                  onLoadMore={loadMore}
                  hasMore={hasMore}
                  loading={chatLoading}
                  getMemberRoleColor={() => null}
                  highlightMessageId={highlightMessageId}
                />
                <TypingIndicator typingUsers={typingUsers} />
                <ChatInput
                  onSend={sendMessage}
                  replyTo={replyTo}
                  onCancelReply={() => setReplyTo(null)}
                />
              </>
            ) : (
              /* Empty state — desktop only (mobile shows sidebar) */
              <div className="flex flex-1 items-center justify-center bg-slate-50/40 px-6 py-12 dark:bg-slate-900/30">
                <div className="text-center">
                  <div
                    className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl border-2 border-slate-900 bg-primary-50 text-primary-500 dark:border-white dark:bg-primary-900/20 dark:text-primary-300"
                    style={{ boxShadow: '0 4px 0 #0f172a' }}
                  >
                    <MessageSquare size={36} strokeWidth={2} />
                  </div>
                  <p className="text-base font-black text-slate-900 dark:text-white">Выбери диалог</p>
                  <p className="mt-2 max-w-xs text-xs font-medium text-slate-500 dark:text-slate-400">
                    Открой переписку слева или найди нового собеседника через поиск
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* ── Duel modal ── */}
      <AnimatePresence>
        {showDuelModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
            onClick={() => setShowDuelModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.96 }}
              onClick={(event) => event.stopPropagation()}
              className="chunky-card w-full max-w-xl overflow-hidden p-0 sm:rounded-3xl"
              style={{ borderTopLeftRadius: '24px', borderTopRightRadius: '24px' }}
            >
              <div className="flex items-start gap-3 border-b-2 border-slate-200 p-5 dark:border-slate-700 sm:p-6">
                <div
                  className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border-2 border-slate-900 bg-orange-100 text-orange-600 dark:border-white dark:bg-orange-900/30 dark:text-orange-300"
                  style={{ boxShadow: '0 3px 0 #c2410c' }}
                >
                  <Swords size={20} strokeWidth={2.4} />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-orange-500">DM Duel</p>
                  <h3 className="mt-1 text-lg font-black text-slate-900 dark:text-white sm:text-xl">Выбери тест для дуэли</h3>
                  <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                    Любой публичный или твой собственный.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDuelModal(false)}
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border-2 border-slate-900 bg-white text-slate-700 transition active:translate-y-[2px] dark:border-white dark:bg-slate-800 dark:text-white"
                  style={{ boxShadow: '0 3px 0 #0f172a' }}
                  aria-label="Закрыть"
                >
                  <XIcon size={15} strokeWidth={2.4} />
                </button>
              </div>

              <div className="p-4 sm:p-5">
                {duelLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-200 border-t-orange-500" />
                  </div>
                ) : duelTests.length === 0 ? (
                  <p className="py-8 text-center text-sm font-medium text-slate-400">Нет доступных тестов для дуэли</p>
                ) : (
                  <div className="max-h-[55vh] space-y-2 overflow-y-auto pr-1">
                    {duelTests.map((test) => (
                      <button
                        key={test._id}
                        type="button"
                        onClick={() => startDuel(test._id)}
                        className="w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-left transition active:translate-y-[2px] hover:border-orange-400 hover:bg-orange-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-orange-500 dark:hover:bg-orange-900/15"
                        style={{ boxShadow: '0 2px 0 #e2e8f0' }}
                      >
                        <p className="truncate text-sm font-black text-slate-900 dark:text-white">{test.title}</p>
                        <p className="mt-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                          {test.questions?.length || 0} вопросов · {test.settings?.isPublic ? 'public' : 'private / твой'}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
