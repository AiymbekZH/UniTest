import { useEffect, useRef } from 'react';
import { connectSocket, getSocket } from '../../../services/socket';

/**
 * Subscribes to all chat-related socket events for a single open chat
 * (DM or group) and dispatches them via a stable callback bag. Lives in
 * the new features/chat/ shell only — the legacy `pages/Messages.jsx`
 * and `pages/Groups.jsx` continue to subscribe inline since I don't
 * want to refactor them in Phase 2.
 *
 * The callback bag pattern (one ref of handlers vs N props) lets the
 * caller pass freshly-bound handlers each render without re-subscribing
 * the socket on every render, which would otherwise drop and re-attach
 * listeners constantly and miss events in between.
 *
 * Listens to BOTH legacy events (dm:message, group:message, etc.) AND
 * the new unified events from Phase 1's REST routes (chat:message:edited,
 * chat:message:forwarded). Phase 5 will collapse the legacy ones.
 */
export function useChatSocket({ kind, chatId, currentUserId, handlers }) {
  // Keep a live ref to the latest handlers so the stable subscription
  // below always calls into the most recent version. Without this, the
  // closure inside the useEffect would freeze handlers from the first
  // render and never see updated state setters.
  const handlersRef = useRef(handlers);
  useEffect(() => { handlersRef.current = handlers; }, [handlers]);

  useEffect(() => {
    if (!kind || !chatId) return;

    const socket = connectSocket() || getSocket();
    if (!socket) return;

    // Mirror the room-join pattern of the legacy pages so the server
    // emits group:* events to us. DMs use `user:${id}` rooms which the
    // server auto-joins on socket connect — no explicit join needed.
    if (kind === 'group') {
      socket.emit('group:join', chatId);
    }

    // ── Helpers — always call into current handlers via the ref ──
    const call = (name, ...args) => {
      const fn = handlersRef.current?.[name];
      if (typeof fn === 'function') fn(...args);
    };

    // ── DM event handlers ──
    const onDmMessage = (msg) => {
      // Echo for own optimistic message: the parent is responsible for
      // matching by clientId. We just pass through.
      const senderId = msg.sender?._id || msg.sender;
      const isOwnEcho = senderId && currentUserId && String(senderId) === String(currentUserId);
      const isThisChat =
        kind === 'dm' &&
        (String(msg.conversationId || msg.conversation) === String(chatId));
      call(isOwnEcho && isThisChat ? 'onOwnEcho' : (isThisChat ? 'onIncoming' : 'onOutsideMessage'), msg);
    };

    const onDmDeleted = ({ conversationId, messageId, mode }) => {
      if (kind !== 'dm') return;
      if (String(conversationId) !== String(chatId)) return;
      call('onDeleted', { messageId, mode });
    };

    const onDmRead = ({ conversationId, readBy }) => {
      if (kind !== 'dm') return;
      if (String(conversationId) !== String(chatId)) return;
      call('onReadByOther', { readBy });
    };

    const onDmReaction = ({ conversationId, messageId, reactions }) => {
      if (kind !== 'dm') return;
      if (String(conversationId) !== String(chatId)) return;
      call('onReaction', { messageId, reactions });
    };

    const onDmTyping = ({ conversationId, userId, name }) => {
      if (kind !== 'dm' || String(conversationId) !== String(chatId)) return;
      if (String(userId) === String(currentUserId)) return;
      call('onTyping', { userId, name });
    };

    const onDmStopTyping = ({ conversationId, userId }) => {
      if (kind !== 'dm' || String(conversationId) !== String(chatId)) return;
      call('onStopTyping', { userId });
    };

    const onDmError = (payload) => call('onError', payload);

    // ── Group event handlers ──
    const onGroupMessage = (msg) => {
      const senderId = msg.sender?._id || msg.sender;
      const isOwnEcho = senderId && currentUserId && String(senderId) === String(currentUserId);
      const groupId = msg.group?._id || msg.group;
      const isThisChat = kind === 'group' && String(groupId) === String(chatId);
      call(isOwnEcho && isThisChat ? 'onOwnEcho' : (isThisChat ? 'onIncoming' : 'onOutsideMessage'), msg);
    };

    const onGroupDeleted = ({ groupId, messageId, mode }) => {
      if (kind !== 'group' || String(groupId) !== String(chatId)) return;
      call('onDeleted', { messageId, mode });
    };

    const onGroupTyping = ({ groupId, userId, name }) => {
      if (kind !== 'group' || String(groupId) !== String(chatId)) return;
      if (String(userId) === String(currentUserId)) return;
      call('onTyping', { userId, name });
    };

    const onGroupStopTyping = ({ groupId, userId }) => {
      if (kind !== 'group' || String(groupId) !== String(chatId)) return;
      call('onStopTyping', { userId });
    };

    const onGroupError = (payload) => call('onError', payload);

    // ── Phase 1 unified events ──
    // The REST edit/forward endpoints emit these in addition to the legacy
    // dm:message / group:message broadcasts so old clients still see
    // forwards as new messages. Edits only travel via these new events
    // (the old socket flow had no edit broadcast at all), so the new
    // shell relies on this entirely for live edit updates.
    const onEdited = (payload) => {
      const { chatType, conversationId, groupId } = payload;
      const incomingId = chatType === 'dm' ? conversationId : groupId;
      if (chatType !== kind) return;
      if (String(incomingId) !== String(chatId)) return;
      call('onEdited', payload);
    };

    // ── Subscribe ──
    socket.on('dm:message', onDmMessage);
    socket.on('dm:messageDeleted', onDmDeleted);
    socket.on('dm:read', onDmRead);
    socket.on('dm:reaction', onDmReaction);
    socket.on('dm:typing', onDmTyping);
    socket.on('dm:stopTyping', onDmStopTyping);
    socket.on('dm:error', onDmError);

    socket.on('group:message', onGroupMessage);
    socket.on('group:messageDeleted', onGroupDeleted);
    socket.on('group:typing', onGroupTyping);
    socket.on('group:stopTyping', onGroupStopTyping);
    socket.on('group:error', onGroupError);

    socket.on('chat:message:edited', onEdited);

    return () => {
      if (kind === 'group') {
        socket.emit('group:leave', chatId);
      }
      socket.off('dm:message', onDmMessage);
      socket.off('dm:messageDeleted', onDmDeleted);
      socket.off('dm:read', onDmRead);
      socket.off('dm:reaction', onDmReaction);
      socket.off('dm:typing', onDmTyping);
      socket.off('dm:stopTyping', onDmStopTyping);
      socket.off('dm:error', onDmError);

      socket.off('group:message', onGroupMessage);
      socket.off('group:messageDeleted', onGroupDeleted);
      socket.off('group:typing', onGroupTyping);
      socket.off('group:stopTyping', onGroupStopTyping);
      socket.off('group:error', onGroupError);

      socket.off('chat:message:edited', onEdited);
    };
  }, [kind, chatId, currentUserId]);
}
