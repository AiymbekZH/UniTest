const DMMessage = require('../models/DMMessage');
const DirectMessage = require('../models/DirectMessage');
const { sanitizePlainText } = require('../utils/sanitize');

// 7 MB ≈ 5 MB raw after base64 (4/3 expansion). Single source of truth so
// the cap matches the user-facing copy and isn't re-derived in 3 places.
const MAX_ATTACHMENT_BYTES = 7 * 1024 * 1024;

// Try to call the optional ack callback an emit can carry. Wrapped in a
// try/catch because clients on flaky networks can disconnect mid-RPC and
// throwing here would crash the whole `dm:message` handler.
function safeAck(ack, payload) {
  if (typeof ack !== 'function') return;
  try { ack(payload); } catch (_) { /* socket already closed */ }
}

// Helper: emit a typed dm:error AND ack the same payload, so clients that
// use either path (legacy event vs new ack callback) see the failure. The
// silent `return` paths in the old code are exactly what made messages
// vanish without a trace — never repeat that.
function failDm(socket, ack, code, message) {
  socket.emit('dm:error', { code, message });
  safeAck(ack, { ok: false, code, message });
}

async function resolveLastVisibleMessageId(conversationId) {
  const latest = await DMMessage.findOne({
    conversation: conversationId,
    isDeleted: false,
  })
    .sort({ createdAt: -1 })
    .select('_id');

  return latest?._id || null;
}

module.exports = function (io) {
  io.on('connection', (socket) => {
    if (!socket.user) return;

    // Join personal room for DMs
    socket.join(`user:${socket.user._id}`);

    // ── SEND DM ──
    // Accepts an optional 2nd arg (ack callback) so the client knows the
    // message was actually persisted. Without an ack the client used to
    // optimistically clear the input and pray for an echo — when the echo
    // never arrived (validation, stale conv, banned user, expired token)
    // the message silently disappeared. That is the bug we're closing.
    socket.on('dm:message', async (data, ack) => {
      try {
        const { conversationId, text, type = 'text', replyTo, attachments, clientId } =
          data || {};

        if (!conversationId) {
          return failDm(socket, ack, 'NO_CONVERSATION_ID', 'Не указан диалог');
        }

        const conversation = await DirectMessage.findById(conversationId);
        if (!conversation) {
          return failDm(socket, ack, 'CONVERSATION_NOT_FOUND', 'Диалог не найден');
        }

        // Verify sender is a participant
        const isParticipant = conversation.participants.some(
          p => p.toString() === socket.user._id.toString()
        );
        if (!isParticipant) {
          return failDm(socket, ack, 'NOT_PARTICIPANT', 'Вы не участник этого диалога');
        }

        // Validate
        if (type === 'text' && (!text || !text.trim())) {
          return failDm(socket, ack, 'EMPTY_TEXT', 'Сообщение не может быть пустым');
        }
        if (['image', 'video', 'file', 'audio'].includes(type) &&
            (!attachments || attachments.length === 0)) {
          return failDm(socket, ack, 'NO_ATTACHMENTS', 'Нет вложений для отправки');
        }

        // Size check
        if (attachments?.length > 0) {
          for (const att of attachments) {
            if (att.data && att.data.length > MAX_ATTACHMENT_BYTES) {
              return failDm(socket, ack, 'ATTACHMENT_TOO_LARGE',
                'Файл слишком большой (макс. ~5 MB исходных)');
            }
          }
        }

        const message = new DMMessage({
          conversation: conversationId,
          sender: socket.user._id,
          type,
          text: sanitizePlainText(text || '').slice(0, 5000),
          attachments: attachments || [],
          replyTo: replyTo || null,
          readBy: [socket.user._id],
        });

        await message.save();
        await message.populate('sender', 'firstName lastName avatar uniqueId');
        if (message.replyTo) {
          await message.populate({
            path: 'replyTo',
            select: 'text sender type isDeleted',
            populate: { path: 'sender', select: 'firstName lastName' }
          });
        }

        // Update conversation
        conversation.lastMessage = message._id;
        conversation.lastActivity = new Date();
        await conversation.save();

        // Build the broadcast payload once. `clientId` lets the sender's
        // own client correlate this echo back to its optimistic placeholder
        // and replace it instead of duplicating.
        const payload = {
          ...message.toJSON(),
          conversationId,
          clientId: clientId || null,
        };

        // Emit to both participants
        for (const pid of conversation.participants) {
          io.to(`user:${pid}`).emit('dm:message', payload);
        }

        safeAck(ack, { ok: true, message: payload });
      } catch (e) {
        console.error('dm:message error:', e.message);
        failDm(socket, ack, 'SERVER_ERROR', 'Ошибка сервера. Попробуйте ещё раз.');
      }
    });

    // ── MARK AS READ ──
    socket.on('dm:read', async ({ conversationId }) => {
      try {
        await DMMessage.updateMany(
          {
            conversation: conversationId,
            isDeleted: false,
            deletedFor: { $ne: socket.user._id },
            readBy: { $ne: socket.user._id },
          },
          { $addToSet: { readBy: socket.user._id } }
        );

        const conversation = await DirectMessage.findById(conversationId);
        if (conversation) {
          const otherParticipant = conversation.participants.find(
            p => p.toString() !== socket.user._id.toString()
          );
          if (otherParticipant) {
            io.to(`user:${otherParticipant}`).emit('dm:read', {
              conversationId,
              readBy: socket.user._id,
            });
          }
        }
      } catch (e) {
        console.error('dm:read error:', e.message);
      }
    });

    socket.on('dm:deleteMessage', async ({ conversationId, messageId, mode = 'everyone' }) => {
      try {
        const conversation = await DirectMessage.findById(conversationId);
        if (!conversation) {
          return socket.emit('dm:error', {
            code: 'CONVERSATION_NOT_FOUND',
            message: 'Диалог не найден',
          });
        }

        const isParticipant = conversation.participants.some(
          p => p.toString() === socket.user._id.toString()
        );
        if (!isParticipant) {
          return socket.emit('dm:error', {
            code: 'NOT_PARTICIPANT',
            message: 'Вы не участник этого диалога',
          });
        }

        const message = await DMMessage.findById(messageId);
        if (!message || message.conversation.toString() !== conversationId) {
          return socket.emit('dm:error', {
            code: 'MESSAGE_NOT_FOUND',
            message: 'Сообщение не найдено',
          });
        }

        if (mode === 'self') {
          if (!message.deletedFor.some(id => id.toString() === socket.user._id.toString())) {
            message.deletedFor.push(socket.user._id);
            await message.save();
          }

          socket.emit('dm:messageDeleted', {
            conversationId,
            messageId,
            mode: 'self',
          });
          return;
        }

        if (message.sender.toString() !== socket.user._id.toString()) {
          return socket.emit('dm:error', {
            code: 'NOT_AUTHOR',
            message: 'Можно удалить у всех только своё сообщение',
          });
        }

        message.isDeleted = true;
        message.text = '';
        message.attachments = [];
        message.deletedFor = [];
        await message.save();

        if (conversation.lastMessage?.toString() === messageId) {
          conversation.lastMessage = await resolveLastVisibleMessageId(conversationId);
          await conversation.save();
        }

        for (const pid of conversation.participants) {
          io.to(`user:${pid}`).emit('dm:messageDeleted', {
            conversationId,
            messageId,
            mode: 'everyone',
          });
        }
      } catch (e) {
        console.error('dm:deleteMessage error:', e.message);
      }
    });

    // ── TYPING ──
    socket.on('dm:typing', async ({ conversationId }) => {
      try {
        const conversation = await DirectMessage.findById(conversationId);
        if (!conversation) return;
        const other = conversation.participants.find(
          p => p.toString() !== socket.user._id.toString()
        );
        if (other) {
          io.to(`user:${other}`).emit('dm:typing', {
            conversationId,
            userId: socket.user._id,
            name: socket.user.firstName,
          });
        }
      } catch (e) { /* ignore */ }
    });

    // ── REACTION TOGGLE ──
    socket.on('dm:reaction', async ({ conversationId, messageId, emoji }) => {
      try {
        if (!conversationId || !messageId || !emoji) return;
        if (typeof emoji !== 'string' || emoji.length > 12) return;

        const conversation = await DirectMessage.findById(conversationId);
        if (!conversation) return;

        const isParticipant = conversation.participants.some(
          p => p.toString() === socket.user._id.toString()
        );
        if (!isParticipant) return;

        const message = await DMMessage.findById(messageId);
        if (!message || message.conversation.toString() !== conversationId) return;
        if (message.isDeleted) return;

        const userIdStr = socket.user._id.toString();
        const reactions = message.reactions || [];
        let entry = reactions.find(r => r.emoji === emoji);

        if (!entry) {
          entry = { emoji, users: [socket.user._id] };
          reactions.push(entry);
        } else {
          const idx = entry.users.findIndex(u => u.toString() === userIdStr);
          if (idx >= 0) {
            entry.users.splice(idx, 1);
            if (entry.users.length === 0) {
              const removeIdx = reactions.indexOf(entry);
              reactions.splice(removeIdx, 1);
            }
          } else {
            entry.users.push(socket.user._id);
          }
        }

        message.reactions = reactions;
        await message.save();

        for (const pid of conversation.participants) {
          io.to(`user:${pid}`).emit('dm:reaction', {
            conversationId,
            messageId,
            reactions: message.reactions,
          });
        }
      } catch (e) {
        console.error('dm:reaction error:', e.message);
      }
    });

    socket.on('dm:stopTyping', async ({ conversationId }) => {
      try {
        const conversation = await DirectMessage.findById(conversationId);
        if (!conversation) return;
        const other = conversation.participants.find(
          p => p.toString() !== socket.user._id.toString()
        );
        if (other) {
          io.to(`user:${other}`).emit('dm:stopTyping', {
            conversationId,
            userId: socket.user._id,
          });
        }
      } catch (e) { /* ignore */ }
    });
  });
};
