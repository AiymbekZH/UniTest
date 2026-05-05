import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { AtSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { connectSocket, getSocket } from '../services/socket';
import { useAuth } from './AuthContext';

const ChatInboxContext = createContext(null);
const SOUND_URL = '/message-sounds/sound_17216.mp3';

export function ChatInboxProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const currentUserId = user?._id || user?.id;
  const navigate = useNavigate();
  const [activeChat, setActiveChat] = useState({ kind: null, id: null });
  const [unreadConversationIds, setUnreadConversationIds] = useState([]);
  const [unreadGroupIds, setUnreadGroupIds] = useState([]);
  const audioRef = useRef(null);
  // Tracks message ids we've already toasted for so a stale
  // re-broadcast (rare, but possible if the user reconnects mid-emit)
  // doesn't trigger a duplicate notification.
  const mentionedSeenRef = useRef(new Set());

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setActiveChat({ kind: null, id: null });
      setUnreadConversationIds([]);
      setUnreadGroupIds([]);
      return;
    }

    audioRef.current = new Audio(SOUND_URL);
    audioRef.current.preload = 'auto';
  }, [currentUserId, isAuthenticated]);

  const fetchSummaries = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const [dmRes, groupRes] = await Promise.all([
        api.get('/dm/unread-summary'),
        api.get('/groups/unread-summary'),
      ]);

      setUnreadConversationIds(dmRes.data.unreadConversationIds || []);
      setUnreadGroupIds(groupRes.data.unreadGroupIds || []);
    } catch {
      // Ignore summary fetch errors and keep current state.
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchSummaries();
  }, [fetchSummaries, isAuthenticated, currentUserId]);

  useEffect(() => {
    if (!isAuthenticated || !user) return undefined;

    const socket = connectSocket() || getSocket();
    if (!socket) return undefined;

    const playSound = () => {
      if (!audioRef.current) return;
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    };

    const handleDmMessage = (message) => {
      const senderId = message.sender?._id || message.sender;
      if (!message.conversationId || senderId === currentUserId) return;

      if (activeChat.kind === 'dm' && activeChat.id === message.conversationId) {
        return;
      }

      setUnreadConversationIds(prev => (
        prev.includes(message.conversationId) ? prev : [...prev, message.conversationId]
      ));
      playSound();
    };

    const handleGroupInbox = (payload) => {
      const { groupId, senderId, mentioned, messageId } = payload || {};
      if (!groupId || senderId === currentUserId) return;

      // ── Mention notification (Phase 4) ──
      // We toast even if the chat is currently active — a personal
      // mention is worth a glance (sender's choice was deliberate)
      // even when the user is already in the room. The unread badge
      // skip below still applies for non-mention regular fanout.
      if (mentioned && messageId && !mentionedSeenRef.current.has(messageId)) {
        mentionedSeenRef.current.add(messageId);
        // Bound the dedupe set so it doesn't grow forever in long
        // sessions. 200 ids is comfortably more than any realistic
        // window of bursty mentions.
        if (mentionedSeenRef.current.size > 200) {
          const arr = Array.from(mentionedSeenRef.current);
          mentionedSeenRef.current = new Set(arr.slice(-100));
        }
        const senderName = [
          payload.senderFirstName,
          payload.senderLastName,
        ].filter(Boolean).join(' ').trim() || 'Кто-то';
        const groupName = payload.groupName || 'группе';
        const snippet = (payload.textSnippet || '').trim();
        toast.custom((t) => (
          <button
            type="button"
            onClick={() => {
              toast.dismiss(t.id);
              navigate(`/chat/group/${groupId}`);
            }}
            className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border-2 border-amber-500 bg-white px-4 py-3 text-left shadow-[0_4px_0_#d97706] transition active:translate-y-[2px] dark:bg-slate-800 ${
              t.visible ? 'animate-in fade-in slide-in-from-top-2' : 'opacity-0'
            }`}
          >
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
              <AtSign size={16} strokeWidth={2.6} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black text-slate-900 dark:text-white">
                {senderName} упомянул вас
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                {groupName}
              </p>
              {snippet && (
                <p className="mt-1 line-clamp-2 text-[11px] text-slate-600 dark:text-slate-300">
                  {snippet}
                </p>
              )}
            </div>
          </button>
        ), { duration: 5000 });
      }

      if (activeChat.kind === 'group' && activeChat.id === groupId) {
        return;
      }

      setUnreadGroupIds(prev => (prev.includes(groupId) ? prev : [...prev, groupId]));
      playSound();
    };

    const handleGroupKicked = ({ groupId }) => {
      if (!groupId) return;
      setUnreadGroupIds(prev => prev.filter(id => id !== groupId));
      if (activeChat.kind === 'group' && activeChat.id === groupId) {
        setActiveChat({ kind: null, id: null });
      }
    };

    const handleDmDeleted = ({ mode }) => {
      if (mode === 'everyone') fetchSummaries();
    };

    const handleGroupDeleted = ({ mode }) => {
      if (mode === 'everyone') fetchSummaries();
    };

    const handleConnect = () => {
      fetchSummaries();
    };

    socket.on('connect', handleConnect);
    socket.on('dm:message', handleDmMessage);
    socket.on('group:inbox', handleGroupInbox);
    socket.on('group:kicked', handleGroupKicked);
    socket.on('dm:messageDeleted', handleDmDeleted);
    socket.on('group:messageDeleted', handleGroupDeleted);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('dm:message', handleDmMessage);
      socket.off('group:inbox', handleGroupInbox);
      socket.off('group:kicked', handleGroupKicked);
      socket.off('dm:messageDeleted', handleDmDeleted);
      socket.off('group:messageDeleted', handleGroupDeleted);
    };
  }, [activeChat.id, activeChat.kind, currentUserId, isAuthenticated]);

  const openChat = useCallback((kind, id) => {
    setActiveChat({ kind, id });
  }, []);

  const clearActiveChat = useCallback(() => {
    setActiveChat({ kind: null, id: null });
  }, []);

  const markConversationRead = useCallback((conversationId) => {
    if (!conversationId) return;
    setUnreadConversationIds(prev => prev.filter(id => id !== conversationId));
    const socket = getSocket() || connectSocket();
    socket?.emit('dm:read', { conversationId });
  }, []);

  const markGroupRead = useCallback((groupId) => {
    if (!groupId) return;
    setUnreadGroupIds(prev => prev.filter(id => id !== groupId));
    const socket = getSocket() || connectSocket();
    socket?.emit('group:read', { groupId });
  }, []);

  const value = useMemo(() => ({
    activeChat,
    unreadConversationIds,
    unreadGroupIds,
    hasUnreadMessages: unreadConversationIds.length > 0,
    hasUnreadGroups: unreadGroupIds.length > 0,
    hasAnyChatUnread: unreadConversationIds.length > 0 || unreadGroupIds.length > 0,
    openChat,
    clearActiveChat,
    markConversationRead,
    markGroupRead,
    refreshChatSummary: fetchSummaries,
  }), [activeChat, clearActiveChat, fetchSummaries, markConversationRead, markGroupRead, openChat, unreadConversationIds, unreadGroupIds]);

  return (
    <ChatInboxContext.Provider value={value}>
      {children}
    </ChatInboxContext.Provider>
  );
}

export function useChatInbox() {
  const context = useContext(ChatInboxContext);
  if (!context) {
    throw new Error('useChatInbox must be used within ChatInboxProvider');
  }
  return context;
}
