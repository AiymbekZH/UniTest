import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { connectSocket, getSocket } from '../../../services/socket';

/**
 * Wraps the optimistic-send + ack-callback + retry pattern that
 * `pages/Messages.jsx` and `pages/Groups.jsx` open-coded after Phase 0.
 * The new chat shell uses this hook so all three paths share one
 * implementation and one set of bug fixes.
 *
 * Args:
 *   kind          : 'dm' | 'group'
 *   chatId        : conversation/group _id (string)
 *   currentUser   : { _id, firstName, lastName, avatar, uniqueId }
 *
 * Returns:
 *   messages      : current message array (most-recent-last)
 *   setMessages   : low-level setter for hydrating from REST loads
 *   sendMessage   : (data) => boolean (false on hard failure)
 *   retryMessage  : (failedMessage) => void
 *   hydrateLoaded : helper that prepends a server page to the start
 */
export function useOptimisticMessages({ kind, chatId, currentUser }) {
  const [messages, setMessages] = useState([]);
  const currentUserId = currentUser?._id || currentUser?.id;

  // chatId in a ref because socket callbacks (e.g. an ack arriving late)
  // would otherwise capture the chatId from the moment they were
  // scheduled, not the moment they fire. With a ref, late acks for an
  // already-closed chat get safely ignored.
  const chatIdRef = useRef(chatId);
  useEffect(() => { chatIdRef.current = chatId; }, [chatId]);

  // Reset on chat switch — caller is responsible for re-loading via REST.
  useEffect(() => {
    setMessages([]);
  }, [kind, chatId]);

  const sendMessage = useCallback((data) => {
    const socket = getSocket() || connectSocket();
    if (!socket || !chatId) {
      toast.error(socket
        ? 'Чат не выбран'
        : 'Нет соединения. Перезагрузите страницу.');
      return false;
    }

    const clientId = `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Build the optimistic placeholder. Mirrors the schema the server
    // emits back so the bubble component never sees `undefined`.
    const optimistic = {
      _id: clientId,
      clientId,
      sender: {
        _id: currentUserId,
        firstName: currentUser?.firstName,
        lastName: currentUser?.lastName,
        avatar: currentUser?.avatar,
        uniqueId: currentUser?.uniqueId,
      },
      type: data.type || 'text',
      text: data.text || '',
      attachments: data.attachments || [],
      replyTo: data.replyTo
        // Look up the live reply target from current state so the bubble
        // can render its preview. When the ack-echo lands we'll get the
        // populated server version.
        ? (messages.find(m => m._id === data.replyTo) || { _id: data.replyTo })
        : null,
      createdAt: new Date().toISOString(),
      readBy: [currentUserId],
      reactions: [],
      isDeleted: false,
      status: 'sending',
      // Preserve the original payload so retry can replay without
      // round-tripping through the composer.
      _retryPayload: data,
      // Also copy chat discriminator so list filters work uniformly.
      ...(kind === 'dm' ? { conversation: chatId, conversationId: chatId } : { group: chatId }),
    };

    setMessages(prev => [...prev, optimistic]);

    const eventName = kind === 'dm' ? 'dm:message' : 'group:message';
    const payload = kind === 'dm'
      ? {
          conversationId: chatId,
          ...data,
          replyTo: data.replyTo || null,
          clientId,
        }
      : {
          groupId: chatId,
          ...data,
          replyTo: data.replyTo || null,
          clientId,
        };

    // 8s timeout matches the legacy pages — generous for slow mobile data
    // image upload but short enough to surface failures before the user
    // starts wondering "is this stuck?".
    socket.timeout(8000).emit(eventName, payload, (err, ack) => {
      // Stale ack — chat was switched before the server replied. Drop
      // the optimistic bubble so it doesn't leak into the next chat.
      if (chatIdRef.current !== chatId) {
        setMessages(prev => prev.filter(m => m.clientId !== clientId));
        return;
      }
      if (err) {
        setMessages(prev => prev.map(m =>
          m.clientId === clientId ? { ...m, status: 'failed' } : m
        ));
        return;
      }
      if (ack && ack.ok === false) {
        setMessages(prev => prev.map(m =>
          m.clientId === clientId ? { ...m, status: 'failed' } : m
        ));
        if (ack.message && ack.code !== 'EMPTY_TEXT') toast.error(ack.message);
        return;
      }
      // ok=true — the broadcast handler upstream swaps the bubble in via
      // clientId match.
    });

    // Stop typing indicator on send so the recipient's view stays clean.
    socket.emit(kind === 'dm' ? 'dm:stopTyping' : 'group:stopTyping',
      kind === 'dm' ? { conversationId: chatId } : { groupId: chatId });

    return true;
  }, [kind, chatId, currentUserId, currentUser, messages]);

  const retryMessage = useCallback((failedMsg) => {
    if (!failedMsg?._retryPayload) return;
    const data = failedMsg._retryPayload;
    setMessages(prev => prev.filter(m => m.clientId !== failedMsg.clientId));
    sendMessage(data);
  }, [sendMessage]);

  // ── Echo / incoming swap helper. Call from the socket subscription. ──
  // Replaces an own-optimistic bubble by clientId; otherwise appends.
  const applyIncoming = useCallback((msg) => {
    setMessages(prev => {
      const echoClientId = msg.clientId || null;
      const senderId = msg.sender?._id || msg.sender;
      if (echoClientId && String(senderId) === String(currentUserId)) {
        const idx = prev.findIndex(m => m.clientId === echoClientId);
        if (idx >= 0) {
          const next = prev.slice();
          next[idx] = msg;
          return next;
        }
      }
      if (msg._id && prev.some(m => m._id === msg._id)) return prev;
      return [...prev, msg];
    });
  }, [currentUserId]);

  // ── Mark a delete event ──
  const applyDeleted = useCallback(({ messageId, mode }) => {
    setMessages(prev => mode === 'self'
      ? prev.filter(m => m._id !== messageId)
      : prev.map(m => m._id === messageId
          ? { ...m, isDeleted: true, text: '', attachments: [] }
          : m));
  }, []);

  // ── Apply a reaction event ──
  const applyReaction = useCallback(({ messageId, reactions }) => {
    setMessages(prev => prev.map(m =>
      m._id === messageId ? { ...m, reactions } : m));
  }, []);

  // ── Apply an edit event (Phase 1 unified chat:message:edited) ──
  const applyEdit = useCallback((payload) => {
    const next = payload.message;
    if (!next?._id) return;
    setMessages(prev => prev.map(m =>
      m._id === next._id
        ? { ...m, text: next.text, isEdited: true, editedAt: next.editedAt || new Date().toISOString() }
        : m));
  }, []);

  // ── Mark messages as read by other (DM only) ──
  const applyReadByOther = useCallback(({ readBy }) => {
    const readerId = String(readBy);
    setMessages(prev => prev.map(msg => {
      const senderId = String(msg.sender?._id || msg.sender || '');
      if (senderId !== String(currentUserId)) return msg;
      const list = Array.isArray(msg.readBy) ? msg.readBy : [];
      if (list.some(u => String(u?._id || u) === readerId)) return msg;
      return { ...msg, readBy: [...list, readerId] };
    }));
  }, [currentUserId]);

  return {
    messages,
    setMessages,
    sendMessage,
    retryMessage,
    applyIncoming,
    applyDeleted,
    applyReaction,
    applyEdit,
    applyReadByOther,
  };
}
