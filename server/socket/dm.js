const DMMessage = require('../models/DMMessage');
const DirectMessage = require('../models/DirectMessage');

module.exports = function (io) {
  io.on('connection', (socket) => {
    // Join personal room for DMs
    socket.join(`user:${socket.user._id}`);

    // ── SEND DM ──
    socket.on('dm:message', async (data) => {
      try {
        const { conversationId, text, type = 'text', replyTo, attachments } = data;
        if (!conversationId) return;

        const conversation = await DirectMessage.findById(conversationId);
        if (!conversation) return;

        // Verify sender is a participant
        const isParticipant = conversation.participants.some(
          p => p.toString() === socket.user._id.toString()
        );
        if (!isParticipant) return;

        // Validate
        if (type === 'text' && (!text || !text.trim())) return;

        // Size check
        if (attachments?.length > 0) {
          for (const att of attachments) {
            if (att.data && att.data.length > 7 * 1024 * 1024) {
              return socket.emit('dm:error', { message: 'Файл слишком большой (макс. 5MB)' });
            }
          }
        }

        const message = new DMMessage({
          conversation: conversationId,
          sender: socket.user._id,
          type,
          text: text?.trim() || '',
          attachments: attachments || [],
          replyTo: replyTo || null,
          readBy: [socket.user._id],
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

        // Update conversation
        conversation.lastMessage = message._id;
        conversation.lastActivity = new Date();
        await conversation.save();

        // Emit to both participants
        for (const pid of conversation.participants) {
          io.to(`user:${pid}`).emit('dm:message', {
            ...message.toJSON(),
            conversationId,
          });
        }
      } catch (e) {
        console.error('dm:message error:', e.message);
      }
    });

    // ── MARK AS READ ──
    socket.on('dm:read', async ({ conversationId }) => {
      try {
        await DMMessage.updateMany(
          {
            conversation: conversationId,
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
