const Message = require('../models/Message');
const Group = require('../models/Group');

module.exports = function (io) {
  io.on('connection', (socket) => {
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
    socket.on('group:message', async (data) => {
      try {
        const { groupId, text, type = 'text', replyTo, attachments } = data;
        if (!groupId) return;

        const group = await Group.findById(groupId);
        if (!group || group.isDeleted) return;

        // Check membership
        const isMember = group.members.some(m => m.user.toString() === socket.user._id.toString());
        if (!isMember) return;

        // Check sendMessages permission
        if (!group.hasPermission(socket.user._id, 'sendMessages')) {
          return socket.emit('group:error', { message: 'Нет разрешения отправлять сообщения' });
        }

        // Validate
        if (type === 'text' && (!text || !text.trim())) return;
        if (['image', 'file', 'audio'].includes(type) && (!attachments || attachments.length === 0)) return;

        // Size check on attachments
        if (attachments?.length > 0) {
          for (const att of attachments) {
            if (att.data && att.data.length > 7 * 1024 * 1024) { // ~5MB base64
              return socket.emit('group:error', { message: 'Файл слишком большой (макс. 5MB)' });
            }
          }
        }

        const message = new Message({
          group: groupId,
          sender: socket.user._id,
          type,
          text: text?.trim() || '',
          attachments: attachments || [],
          replyTo: replyTo || null,
        });

        await message.save();
        await message.populate('sender', 'firstName lastName avatar uniqueId');
        if (message.replyTo) {
          await message.populate({
            path: 'replyTo',
            select: 'text sender type',
            populate: { path: 'sender', select: 'firstName lastName' }
          });
        }

        io.to(`group:${groupId}`).emit('group:message', message);
      } catch (e) {
        console.error('group:message error:', e.message);
      }
    });

    // ── DELETE MESSAGE ──
    socket.on('group:deleteMessage', async (data) => {
      try {
        const { groupId, messageId } = data;
        const message = await Message.findById(messageId);
        if (!message || message.group.toString() !== groupId) return;

        const group = await Group.findById(groupId);
        if (!group) return;

        const isAuthor = message.sender.toString() === socket.user._id.toString();
        const canDelete = group.hasPermission(socket.user._id, 'deleteMessages');

        if (!isAuthor && !canDelete) {
          return socket.emit('group:error', { message: 'Нет разрешения удалять сообщения' });
        }

        message.isDeleted = true;
        message.text = '';
        message.attachments = [];
        await message.save();

        io.to(`group:${groupId}`).emit('group:messageDeleted', { messageId, groupId });
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
  });
};
