const User = require('../models/User');
const DirectMessage = require('../models/DirectMessage');

// userId -> Set<socketId>
const onlineUsers = new Map();

function isOnline(userId) {
  if (!userId) return false;
  const set = onlineUsers.get(String(userId));
  return !!(set && set.size > 0);
}

async function getDmPartnerIds(userId) {
  const conversations = await DirectMessage.find({ participants: userId })
    .select('participants')
    .lean();
  const partners = new Set();
  for (const c of conversations) {
    for (const p of c.participants) {
      const pid = String(p);
      if (pid !== String(userId)) partners.add(pid);
    }
  }
  return [...partners];
}

module.exports = function (io) {
  io.on('connection', async (socket) => {
    if (!socket.user) return;

    const userId = String(socket.user._id);

    // Track socket
    let set = onlineUsers.get(userId);
    const wasOffline = !set || set.size === 0;
    if (!set) {
      set = new Set();
      onlineUsers.set(userId, set);
    }
    set.add(socket.id);

    // First socket → broadcast 'online' to DM partners + self confirmation
    if (wasOffline) {
      try {
        const partnerIds = await getDmPartnerIds(userId);
        for (const pid of partnerIds) {
          io.to(`user:${pid}`).emit('presence:update', {
            userId,
            online: true,
            lastSeen: new Date().toISOString(),
          });
        }
      } catch (e) { /* ignore */ }
    }

    // Allow client to query specific users' status
    socket.on('presence:get', async ({ userIds } = {}) => {
      if (!Array.isArray(userIds) || userIds.length === 0) return;
      const ids = userIds.map(String).slice(0, 200);
      try {
        const users = await User.find({ _id: { $in: ids } })
          .select('_id lastSeen')
          .lean();
        const result = users.map(u => ({
          userId: String(u._id),
          online: isOnline(u._id),
          lastSeen: u.lastSeen || u.createdAt || null,
        }));
        socket.emit('presence:list', { statuses: result });
      } catch (e) { /* ignore */ }
    });

    socket.on('disconnect', async () => {
      const cur = onlineUsers.get(userId);
      if (!cur) return;
      cur.delete(socket.id);
      if (cur.size === 0) {
        onlineUsers.delete(userId);
        const lastSeen = new Date();
        try {
          await User.updateOne({ _id: userId }, { $set: { lastSeen } });
          const partnerIds = await getDmPartnerIds(userId);
          for (const pid of partnerIds) {
            io.to(`user:${pid}`).emit('presence:update', {
              userId,
              online: false,
              lastSeen: lastSeen.toISOString(),
            });
          }
        } catch (e) { /* ignore */ }
      }
    });
  });
};

module.exports.isOnline = isOnline;
