import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Search, MessageSquare, User as UserIcon } from 'lucide-react';
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
            unreadCount: senderId !== user?._id && !isOpenConversation
              ? (updated[idx].unreadCount || 0) + 1
              : 0,
          };
          updated.sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));
          return updated;
        });

        // Add to messages if this conversation is open
        if (isOpenConversation) {
          setMessages(prev => [...prev, msg]);
          if (senderId !== user?._id) {
            markConversationRead(msg.conversationId);
          }
        }
      };

      const handleTyping = ({ conversationId, userId, name }) => {
        if (userId === user?._id) return;
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

      s.on('dm:message', handleMsg);
      s.on('dm:typing', handleTyping);
      s.on('dm:stopTyping', handleStopTyping);
      s.on('dm:messageDeleted', handleDeleted);
      s.on('dm:error', handleError);

      return () => {
        s.off('dm:message', handleMsg);
        s.off('dm:typing', handleTyping);
        s.off('dm:stopTyping', handleStopTyping);
        s.off('dm:messageDeleted', handleDeleted);
        s.off('dm:error', handleError);
      };
    }
  }, []);

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

  const getOtherUser = (conv) => {
    return conv.participants?.find(p => p._id !== user?._id) || conv.participants?.[0];
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

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex h-[calc(100vh-120px)] bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden">
          {/* Sidebar – conversations list */}
          <div className={`w-full sm:w-80 flex-shrink-0 border-r border-gray-200 dark:border-slate-700 flex flex-col ${selectedConv ? 'hidden sm:flex' : 'flex'}`}>
            <div className="p-4 border-b border-gray-100 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-3">
                <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition">
                  <ArrowLeft size={16} className="text-gray-400" />
                </button>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Сообщения</h1>
              </div>
              {/* Search */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-gray-50 dark:bg-slate-700 border-0 text-sm text-gray-800 dark:text-gray-100 outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30"
                  placeholder="Поиск по нику, email, ID..."
                  value={searchQuery}
                  onChange={(e) => searchUsers(e.target.value)}
                />
              </div>
            </div>

            {/* Search results */}
            {searchQuery.length >= 2 && (
              <div className="border-b border-gray-100 dark:border-slate-700 max-h-48 overflow-y-auto">
                {searching ? (
                  <p className="text-xs text-gray-400 text-center py-4">Поиск...</p>
                ) : searchResults.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">Не найдено</p>
                ) : (
                  searchResults.map(u => (
                    <button key={u._id} onClick={() => startConversation(u._id)}
                      className="w-full text-left flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-slate-700 transition">
                      <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-slate-600 flex items-center justify-center text-xs font-bold text-gray-500 dark:text-gray-300 overflow-hidden flex-shrink-0">
                        {u.avatar ? <img src={u.avatar} className="w-full h-full object-cover" /> : (u.firstName?.[0] || '?').toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{u.lastName} {u.firstName}</p>
                        <p className="text-[11px] text-gray-400 truncate">{u.email}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Conversations */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="space-y-2 p-3">{[1,2,3].map(i => <div key={i} className="h-16 rounded-xl bg-gray-100 dark:bg-slate-700 animate-pulse" />)}</div>
              ) : conversations.length === 0 && searchQuery.length < 2 ? (
                <div className="text-center py-16">
                  <MessageSquare size={28} className="text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">Нет диалогов</p>
                  <p className="text-xs text-gray-400 mt-1">Найдите пользователя через поиск</p>
                </div>
              ) : (
                conversations.map(conv => {
                  const other = getOtherUser(conv);
                  const isActive = selectedConv?._id === conv._id;
                  return (
                    <button key={conv._id} onClick={() => selectConversation(conv)}
                      className={`w-full text-left flex items-center gap-3 p-3 transition ${isActive ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-slate-700/50'}`}>
                      <div className="w-11 h-11 rounded-full bg-gray-200 dark:bg-slate-600 flex items-center justify-center text-sm font-bold text-gray-500 dark:text-gray-300 overflow-hidden flex-shrink-0">
                        {other?.avatar ? <img src={other.avatar} className="w-full h-full object-cover" /> : (other?.firstName?.[0] || '?').toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{other?.firstName} {other?.lastName}</p>
                          <span className="text-[10px] text-gray-400 flex-shrink-0 ml-2">{timeAgo(conv.lastActivity)}</span>
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <p className="text-xs text-gray-400 truncate">{conv.lastMessage?.text || '...'}</p>
                          {conv.unreadCount > 0 && (
                            <span className="ml-2 w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] flex items-center justify-center font-medium flex-shrink-0">{conv.unreadCount}</span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Chat area */}
          <div className={`flex-1 flex flex-col ${selectedConv ? 'flex' : 'hidden sm:flex'}`}>
            {selectedConv ? (
              <>
                {/* Header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-slate-700">
                  <button onClick={() => { setSelectedConv(null); setMessages([]); }} className="sm:hidden p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition">
                    <ArrowLeft size={16} className="text-gray-400" />
                  </button>
                  {(() => {
                    const other = getOtherUser(selectedConv);
                    return (
                      <>
                        <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-slate-600 flex items-center justify-center text-xs font-bold text-gray-500 dark:text-gray-300 overflow-hidden flex-shrink-0">
                          {other?.avatar ? <img src={other.avatar} className="w-full h-full object-cover" /> : (other?.firstName?.[0] || '?').toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{other?.firstName} {other?.lastName}</p>
                          <p className="text-[10px] text-gray-400">{other?.email}</p>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Messages */}
                <MessageList
                  messages={messages}
                  currentUserId={user?._id}
                  onReply={setReplyTo}
                  onDelete={deleteMessage}
                  onPin={() => {}}
                  getDeleteOptions={(message, isOwn) => ({ self: true, everyone: isOwn })}
                  canPin={false}
                  onLoadMore={loadMore}
                  hasMore={hasMore}
                  loading={chatLoading}
                  getMemberRoleColor={() => null}
                />
                <TypingIndicator typingUsers={typingUsers} />
                <ChatInput
                  onSend={sendMessage}
                  replyTo={replyTo}
                  onCancelReply={() => setReplyTo(null)}
                />
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare size={40} className="text-gray-200 dark:text-slate-600 mx-auto mb-3" />
                  <p className="text-sm text-gray-400">Выберите диалог</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
