const Message = require('../models/Message');
const Group = require('../models/Group');
const { extractMentions } = require('../utils/mentions');
const { sanitizePlainText } = require('../utils/sanitize');

// Match the DM cap so error copy stays consistent across both surfaces.
const MAX_ATTACHMENT_BYTES = 7 * 1024 * 1024;

function safeAck(ack, payload) {
  if (typeof ack !== 'function') return;
  try { ack(payload); } catch (_) { /* socket already closed */ }
}

// Mirrors failDm in socket/dm.js — every group:message reject path needs
// to surface a typed error so the client doesn't silently lose the user's
// text. Same anti-pattern fix.
function failGroup(socket, ack, code, message) {
  socket.emit('group:error', { code, message });
  safeAck(ack, { ok: false, code, message });
}

async function markGroupAsRead(groupId, userId) {
  const group = await Group.findById(groupId);
  if (!group || group.isDeleted) return null;

  const member = group.members.find(m => m.user.toString() === userId.toString());
  if (!member) return null;

  member.lastReadAt = new Date();
  await group.save();
  return group;
}

module.exports = function (io) {
  io.on('connection', (socket) => {
    if (!socket.user) return;

    // ── JOIN GROUP ROOM ──
    socket.on('group:join', async (groupId) => {
      try {
        const group = await Group.findById(groupId);
        if (!group || group.isDeleted) return;
        const isMember = group.members.some(m => m.user.toString() === socket.user._id.toString());
        if (!isMember) return;
        socket.join(`group:${groupId}`);
      } catch (e) { /* ignore */ }
    });

    socket.on('group:leave', (groupId) => {
      socket.leave(`group:${groupId}`);
    });

    // ── SEND MESSAGE ──
    // Same ack-callback contract as dm:message — the client emits with a
    // 2nd arg and waits for { ok, message } back. Without this the silent
    // returns below would eat the user's text on any validation miss.
    socket.on('group:message', async (data, ack) => {
      try {
        const { groupId, text, type = 'text', replyTo, attachments, clientId } =
          data || {};

        if (!groupId) {
          return failGroup(socket, ack, 'NO_GROUP_ID', 'Не указана группа');
        }

        const group = await Group.findById(groupId);
        if (!group || group.isDeleted) {
          return failGroup(socket, ack, 'GROUP_NOT_FOUND', 'Группа не найдена');
        }

        // Check membership
        const isMember = group.members.some(
          m => m.user.toString() === socket.user._id.toString()
        );
        if (!isMember) {
          return failGroup(socket, ack, 'NOT_MEMBER', 'Вы не участник группы');
        }

        // Check sendMessages permission
        if (!group.hasPermission(socket.user._id, 'sendMessages')) {
          return failGroup(socket, ack, 'NO_PERMISSION_SEND',
            'Нет разрешения отправлять сообщения');
        }

        // Validate
        if (type === 'text' && (!text || !text.trim())) {
          return failGroup(socket, ack, 'EMPTY_TEXT', 'Сообщение не может быть пустым');
        }
        if (['image', 'video', 'file', 'audio'].includes(type) &&
            (!attachments || attachments.length === 0)) {
          return failGroup(socket, ack, 'NO_ATTACHMENTS', 'Нет вложений для отправки');
        }

        // Size check on attachments
        if (attachments?.length > 0) {
          for (const att of attachments) {
            if (att.data && att.data.length > MAX_ATTACHMENT_BYTES) {
              return failGroup(socket, ack, 'ATTACHMENT_TOO_LARGE',
                'Файл слишком большой (макс. ~5 MB исходных)');
            }
          }
        }

        // ── Mention extraction (Phase 4b-A) ──
        // We only run this when the message has user-authored text;
        // attachment-only messages can't carry @mentions and the
        // population join below is unnecessary. group.members already
        // holds all the username/name fields we need (the User docs
        // are auto-populated via the schema).
        let mentionedUserIds = [];
        if (text && text.trim()) {
          // group.members[i].user is an ObjectId by default — we need
          // the populated User docs to read `username`. The schema's
          // hooks don't auto-populate, so do it here.
          await group.populate('members.user', 'username firstName lastName');
          mentionedUserIds = extractMentions(text, group.members);
        }

        const message = new Message({
          group: groupId,
          sender: socket.user._id,
          type,
          text: sanitizePlainText(text || '').slice(0, 5000),
          attachments: attachments || [],
          replyTo: replyTo || null,
          mentions: mentionedUserIds,
        });

        await message.save();
        await message.populate('sender', 'firstName lastName avatar uniqueId');
        // Populate mentions so the client can resolve @username spans
        // to display-friendly names without an extra round trip.
        if (mentionedUserIds.length > 0) {
          await message.populate('mentions', 'firstName lastName username avatar uniqueId');
        }
        if (message.replyTo) {
          await message.populate({
            path: 'replyTo',
            select: 'text sender type isDeleted',
            populate: { path: 'sender', select: 'firstName lastName' }
          });
        }

        // clientId is echoed back so the sender can swap their optimistic
        // bubble for the persisted server copy without duplicating.
        const payload = {
          ...message.toJSON(),
          clientId: clientId || null,
        };

        io.to(`group:${groupId}`).emit('group:message', payload);

        if (type !== 'system') {
          // Set of mentioned user ids for O(1) lookup during fanout.
          const mentionSet = new Set(mentionedUserIds.map(String));
          // Pre-compute display strings for the toast that the client
          // shows when `mentioned` is true. We send these only on the
          // mention path so the per-recipient payload stays compact
          // for the (much more common) non-mention case.
          const senderFirstName = socket.user.firstName || '';
          const senderLastName = socket.user.lastName || '';
          const groupName = group.name || '';
          for (const member of group.members) {
            const memberUserId = (member.user?._id || member.user).toString();
            if (memberUserId === socket.user._id.toString()) continue;
            const isMentioned = mentionSet.has(memberUserId);
            io.to(`user:${memberUserId}`).emit('group:inbox', {
              groupId,
              messageId: message._id,
              senderId: socket.user._id.toString(),
              // Surface the mention bit so the inbox/notification UI
              // can flag this message as personally addressed without
              // having to re-parse the text on the client.
              mentioned: isMentioned,
              ...(isMentioned ? {
                senderFirstName,
                senderLastName,
                groupName,
                // Short text snippet for the toast body. Capped client-
                // side too but cap here so we don't pump the whole
                // message body across the wire when it's irrelevant.
                textSnippet: (text || '').slice(0, 80),
              } : {}),
            });
          }
        }

        safeAck(ack, { ok: true, message: payload });
      } catch (e) {
        console.error('group:message error:', e.message);
        failGroup(socket, ack, 'SERVER_ERROR', 'Ошибка сервера. Попробуйте ещё раз.');
      }
    });

    // ── DELETE MESSAGE ──
    socket.on('group:deleteMessage', async (data) => {
      try {
        const { groupId, messageId, mode = 'everyone' } = data;
        const message = await Message.findById(messageId);
        if (!message || message.group.toString() !== groupId) return;

        const group = await Group.findById(groupId);
        if (!group) return;

        const isMember = group.members.some(m => m.user.toString() === socket.user._id.toString());
        if (!isMember) return;

        if (mode === 'self') {
          if (!message.deletedFor.some(id => id.toString() === socket.user._id.toString())) {
            message.deletedFor.push(socket.user._id);
            await message.save();
          }
          socket.emit('group:messageDeleted', { messageId, groupId, mode: 'self' });
          return;
        }

        const isAuthor = message.sender.toString() === socket.user._id.toString();
        const canDelete = group.hasPermission(socket.user._id, 'deleteMessages');

        if (!isAuthor && !canDelete) {
          return socket.emit('group:error', { message: 'Нет разрешения удалять сообщения' });
        }

        message.isDeleted = true;
        message.isPinned = false;
        message.text = '';
        message.attachments = [];
        message.deletedFor = [];
        await message.save();

        io.to(`group:${groupId}`).emit('group:messageDeleted', {
          messageId,
          groupId,
          mode: 'everyone',
        });
      } catch (e) {
        console.error('group:deleteMessage error:', e.message);
      }
    });

    // ── PIN / UNPIN MESSAGE ──
    socket.on('group:pinMessage', async (data) => {
      try {
        const { groupId, messageId } = data;
        const group = await Group.findById(groupId);
        if (!group || !group.hasPermission(socket.user._id, 'pinMessages')) return;

        const message = await Message.findById(messageId);
        if (!message || message.group.toString() !== groupId) return;

        message.isPinned = !message.isPinned;
        await message.save();

        io.to(`group:${groupId}`).emit('group:messagePinned', {
          messageId,
          isPinned: message.isPinned,
          groupId,
        });
      } catch (e) {
        console.error('group:pinMessage error:', e.message);
      }
    });

    // ── TYPING INDICATOR ──
    socket.on('group:typing', ({ groupId }) => {
      socket.to(`group:${groupId}`).emit('group:typing', {
        userId: socket.user._id,
        name: socket.user.firstName,
      });
    });

    socket.on('group:stopTyping', ({ groupId }) => {
      socket.to(`group:${groupId}`).emit('group:stopTyping', {
        userId: socket.user._id,
      });
    });

    socket.on('group:read', async ({ groupId }) => {
      try {
        await markGroupAsRead(groupId, socket.user._id);
      } catch (e) {
        console.error('group:read error:', e.message);
      }
    });
  });
};
