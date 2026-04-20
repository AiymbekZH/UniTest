import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import api from '../services/api';
import { connectSocket, getSocket } from '../services/socket';
import { useAuth } from './AuthContext';

const ChatInboxContext = createContext(null);
const SOUND_URL = '/message-sounds/sound_17216.mp3';

export function ChatInboxProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const currentUserId = user?._id || user?.id;
  const [activeChat, setActiveChat] = useState({ kind: null, id: null });
  const [unreadConversationIds, setUnreadConversationIds] = useState([]);
  const [unreadGroupIds, setUnreadGroupIds] = useState([]);
  const audioRef = useRef(null);

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

    const handleGroupInbox = ({ groupId, senderId }) => {
      if (!groupId || senderId === currentUserId) return;

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
