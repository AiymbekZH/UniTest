/**
 * Cross-chat message operations: edit, forward, global search.
 *
 * These three endpoints are the only place in the codebase that needs to
 * dispatch over `chatType` (DM vs group). Everything else stays in
 * `routes/dm.js` and `routes/groups.js`. Phase 1 keeps reading/writing the
 * legacy `DMMessage` / `Message` collections — Phase 5 will migrate to the
 * unified `ChatMessage` and these handlers will lose their dispatch.
 *
 * Mounted at `/api/messages`.
 *
 * Endpoints:
 *   POST  /:id/edit                 → edit own text message (24h window)
 *   POST  /:id/forward              → forward to N target chats
 *   GET   /search?q=&limit=20       → global text search across my chats
 *
 * Socket broadcasts on success:
 *   chat:message:edited      { chatType, chatId, message }
 *   chat:message:forwarded   { destinations: [{chatType, chatId, messageId}] }
 *
 * Both sockets are emitted via `req.app.get('io')` and reach the same
 * rooms the legacy `dm:` / `group:` events use. The new client (Phase 2)
 * will subscribe to the unified events; the old client never listens for
 * them, so backward-compat is intact.
 */
const express = require('express');
const mongoose = require('mongoose');
const { auth } = require('../middleware/auth');

const DMMessage = require('../models/DMMessage');
const Message = require('../models/Message'); // group
const DirectMessage = require('../models/DirectMessage');
const Group = require('../models/Group');

const router = express.Router();

const EDIT_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

// ─────────────────────────────────────────────────────────────────────
// Internal: locate a message by id in DM or group collections.
// Returns { kind: 'dm'|'group', message, chat } or null.
// ─────────────────────────────────────────────────────────────────────
async function findMessageAnywhere(id) {
  if (!mongoose.isValidObjectId(id)) return null;

  // Try DM first; majority of writes are DMs in this app.
  const dm = await DMMessage.findById(id);
  if (dm) {
    const chat = await DirectMessage.findById(dm.conversation);
    return { kind: 'dm', message: dm, chat };
  }

  const gm = await Message.findById(id);
  if (gm) {
    const chat = await Group.findById(gm.group);
    return { kind: 'group', message: gm, chat };
  }

  return null;
}

// User has access to chat? DM = participant. Group = active member.
function userIsInChat(kind, chat, userId) {
  if (!chat) return false;
  if (kind === 'dm') {
    return chat.participants.some(p => String(p) === String(userId));
  }
  if (kind === 'group') {
    if (chat.isDeleted) return false;
    return chat.members.some(m => String(m.user) === String(userId));
  }
  return false;
}

// Emit a typed broadcast on the right rooms for the chat. Uses the same
// rooms the legacy dm: / group: events use so both old and new clients
// receive updates without separate plumbing.
function broadcast(io, kind, chat, event, payload) {
  if (!io) return;
  if (kind === 'dm') {
    for (const pid of chat.participants) {
      io.to(`user:${pid}`).emit(event, payload);
    }
  } else if (kind === 'group') {
    io.to(`group:${chat._id}`).emit(event, payload);
  }
}

// ─────────────────────────────────────────────────────────────────────
// EDIT
// POST /api/messages/:id/edit   { text }
// ─────────────────────────────────────────────────────────────────────
router.post('/:id/edit', auth, async (req, res) => {
  try {
    const found = await findMessageAnywhere(req.params.id);
    if (!found) return res.status(404).json({ message: 'Сообщение не найдено' });

    const { kind, message, chat } = found;
    if (!userIsInChat(kind, chat, req.user._id)) {
      return res.status(403).json({ message: 'Нет доступа к этому чату' });
    }

    if (String(message.sender) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Можно редактировать только свои сообщения' });
    }
    if (message.isDeleted) {
      return res.status(400).json({ message: 'Сообщение удалено' });
    }
    if (message.type !== 'text') {
      return res.status(400).json({
        message: 'Можно редактировать только текстовые сообщения',
      });
    }

    const ageMs = Date.now() - new Date(message.createdAt).getTime();
    if (ageMs > EDIT_WINDOW_MS) {
      return res.status(400).json({
        message: 'Истекло время редактирования (24 часа)',
      });
    }

    const { text } = req.body || {};
    const newText = (text || '').toString().trim();
    if (!newText) {
      return res.status(400).json({ message: 'Текст не может быть пустым' });
    }
    if (newText.length > 4096) {
      return res.status(400).json({ message: 'Текст слишком длинный (макс. 4096)' });
    }
    if (newText === message.text) {
      // Nothing actually changed — short-circuit so we don't trigger
      // a needless socket broadcast and bump editedAt.
      return res.json({ ok: true, message: message.toJSON(), unchanged: true });
    }

    message.text = newText;
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    // Repopulate sender for the broadcast — clients render the bubble
    // from this payload directly (same shape as initial dm/group events).
    await message.populate('sender', 'firstName lastName avatar uniqueId');

    const io = req.app.get('io');
    const payload = {
      chatType: kind,
      chatId: kind === 'dm' ? chat._id : chat._id,
      messageId: message._id,
      message: message.toJSON(),
      // Legacy field shape — DM clients expect `conversationId`, group
      // clients expect `groupId`. Send both so old and new clients work.
      conversationId: kind === 'dm' ? chat._id : undefined,
      groupId: kind === 'group' ? chat._id : undefined,
    };
    broadcast(io, kind, chat, 'chat:message:edited', payload);

    res.json({ ok: true, message: message.toJSON() });
  } catch (err) {
    console.error('[messages] edit error:', err.message);
    res.status(500).json({ message: 'Ошибка редактирования' });
  }
});

// ─────────────────────────────────────────────────────────────────────
// FORWARD
// POST /api/messages/:id/forward
//   { targets: [{ chatType: 'dm'|'group', chatId }, ...], note? }
//
// Creates one new message per target, each carrying a `forwardedFrom`
// snapshot of the origin. We don't run any cross-chat referential check
// — if the user passes a chatId they aren't a member of, that single
// target is rejected and the others still go through.
// ─────────────────────────────────────────────────────────────────────
router.post('/:id/forward', auth, async (req, res) => {
  try {
    const found = await findMessageAnywhere(req.params.id);
    if (!found) return res.status(404).json({ message: 'Сообщение не найдено' });

    const { kind: srcKind, message: src, chat: srcChat } = found;
    if (!userIsInChat(srcKind, srcChat, req.user._id)) {
      return res.status(403).json({ message: 'Нет доступа к источнику' });
    }
    if (src.isDeleted) {
      return res.status(400).json({ message: 'Удалённое сообщение нельзя переслать' });
    }

    const { targets, note } = req.body || {};
    if (!Array.isArray(targets) || targets.length === 0) {
      return res.status(400).json({ message: 'Не указаны получатели' });
    }
    if (targets.length > 20) {
      return res.status(400).json({ message: 'Слишком много получателей (макс. 20)' });
    }

    // Resolve sender's display name for the forwarded snapshot.
    await src.populate('sender', 'firstName lastName');
    const senderName = `${src.sender?.firstName || ''} ${src.sender?.lastName || ''}`.trim() || 'Пользователь';

    const forwardedFrom = {
      messageId: src._id,
      senderId: src.sender?._id || src.sender,
      senderName,
      chatType: srcKind,
      chatId: srcKind === 'dm' ? srcChat._id : srcChat._id,
    };

    const results = [];
    const io = req.app.get('io');

    for (const t of targets) {
      try {
        if (!t || !t.chatType || !t.chatId || !mongoose.isValidObjectId(t.chatId)) {
          results.push({ target: t, ok: false, reason: 'BAD_TARGET' });
          continue;
        }

        if (t.chatType === 'dm') {
          const conv = await DirectMessage.findById(t.chatId);
          if (!conv || !userIsInChat('dm', conv, req.user._id)) {
            results.push({ target: t, ok: false, reason: 'NO_ACCESS' });
            continue;
          }

          const fwd = new DMMessage({
            conversation: conv._id,
            sender: req.user._id,
            type: src.type === 'system' ? 'text' : (src.type || 'text'),
            text: src.text || '',
            attachments: src.attachments || [],
            forwardedFrom,
            meta: src.meta || {},
            readBy: [req.user._id],
          });
          // Optional commentary attached to the forward — sent as a separate
          // text DM right after if non-empty.
          await fwd.save();
          await fwd.populate('sender', 'firstName lastName avatar uniqueId');

          conv.lastMessage = fwd._id;
          conv.lastActivity = new Date();
          await conv.save();

          // Reuse the legacy dm:message event so old clients show it.
          for (const pid of conv.participants) {
            io?.to(`user:${pid}`).emit('dm:message', {
              ...fwd.toJSON(),
              conversationId: conv._id,
            });
          }

          if (note && typeof note === 'string' && note.trim()) {
            const noteMsg = new DMMessage({
              conversation: conv._id,
              sender: req.user._id,
              type: 'text',
              text: note.trim().slice(0, 4096),
              readBy: [req.user._id],
            });
            await noteMsg.save();
            await noteMsg.populate('sender', 'firstName lastName avatar uniqueId');
            conv.lastMessage = noteMsg._id;
            conv.lastActivity = new Date();
            await conv.save();
            for (const pid of conv.participants) {
              io?.to(`user:${pid}`).emit('dm:message', {
                ...noteMsg.toJSON(),
                conversationId: conv._id,
              });
            }
          }

          results.push({ target: t, ok: true, messageId: fwd._id });
          continue;
        }

        if (t.chatType === 'group') {
          const grp = await Group.findById(t.chatId);
          if (!grp || !userIsInChat('group', grp, req.user._id)) {
            results.push({ target: t, ok: false, reason: 'NO_ACCESS' });
            continue;
          }
          if (!grp.hasPermission?.(req.user._id, 'sendMessages')) {
            results.push({ target: t, ok: false, reason: 'NO_PERMISSION' });
            continue;
          }

          const fwd = new Message({
            group: grp._id,
            sender: req.user._id,
            type: src.type === 'system' ? 'text' : (src.type || 'text'),
            text: src.text || '',
            attachments: src.attachments || [],
            forwardedFrom,
            meta: src.meta || {},
          });
          await fwd.save();
          await fwd.populate('sender', 'firstName lastName avatar uniqueId');

          io?.to(`group:${grp._id}`).emit('group:message', fwd.toJSON());

          if (note && typeof note === 'string' && note.trim()) {
            const noteMsg = new Message({
              group: grp._id,
              sender: req.user._id,
              type: 'text',
              text: note.trim().slice(0, 4096),
            });
            await noteMsg.save();
            await noteMsg.populate('sender', 'firstName lastName avatar uniqueId');
            io?.to(`group:${grp._id}`).emit('group:message', noteMsg.toJSON());
          }

          results.push({ target: t, ok: true, messageId: fwd._id });
          continue;
        }

        results.push({ target: t, ok: false, reason: 'UNKNOWN_KIND' });
      } catch (innerErr) {
        console.error('[messages] forward target error:', innerErr.message);
        results.push({ target: t, ok: false, reason: 'SERVER_ERROR' });
      }
    }

    const okResults = results.filter(r => r.ok);

    // Unified broadcast for new clients listening for it. Old clients ignore.
    const io2 = req.app.get('io');
    if (io2) {
      io2.to(`user:${req.user._id}`).emit('chat:message:forwarded', {
        sourceMessageId: src._id,
        results: okResults.map(r => ({
          chatType: r.target.chatType,
          chatId: r.target.chatId,
          messageId: r.messageId,
        })),
      });
    }

    res.json({
      ok: okResults.length > 0,
      delivered: okResults.length,
      total: targets.length,
      results,
    });
  } catch (err) {
    console.error('[messages] forward error:', err.message);
    res.status(500).json({ message: 'Ошибка пересылки' });
  }
});

// ─────────────────────────────────────────────────────────────────────
// GLOBAL SEARCH
// GET /api/messages/search?q=&limit=20&before=
//
// Searches text in all DMs the user is a participant of, and all groups
// the user is a member of. We use a regex (case-insensitive) instead of
// $text to keep behavior intuitive on short queries (Mongo $text needs
// stemming-aware tokens, ignores 1-letter words, and won't match prefixes).
//
// Pagination: cursor-style on `_id` via `before`. Use `before` from the
// last result to fetch the next page.
// ─────────────────────────────────────────────────────────────────────
router.get('/search', auth, async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (q.length < 2) return res.json({ results: [] });

    const limit = Math.min(50, Math.max(5, parseInt(req.query.limit) || 20));
    const before = req.query.before && mongoose.isValidObjectId(req.query.before)
      ? new mongoose.Types.ObjectId(req.query.before)
      : null;

    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const textFilter = { text: { $regex: escaped, $options: 'i' } };

    // Gather DM conversation ids the user is in, and group ids.
    const [conversations, groups] = await Promise.all([
      DirectMessage.find({ participants: req.user._id }).select('_id').lean(),
      Group.find({ 'members.user': req.user._id, isDeleted: false }).select('_id').lean(),
    ]);
    const convIds = conversations.map(c => c._id);
    const groupIds = groups.map(g => g._id);

    const dmFilter = {
      ...textFilter,
      conversation: { $in: convIds },
      isDeleted: false,
      deletedFor: { $ne: req.user._id },
      ...(before ? { _id: { $lt: before } } : {}),
    };
    const groupFilter = {
      ...textFilter,
      group: { $in: groupIds },
      isDeleted: false,
      deletedFor: { $ne: req.user._id },
      ...(before ? { _id: { $lt: before } } : {}),
    };

    // Fetch slightly more than the page so we can interleave + truncate.
    const fetchEach = limit + 5;
    const [dmHits, groupHits] = await Promise.all([
      DMMessage.find(dmFilter)
        .sort({ _id: -1 })
        .limit(fetchEach)
        .populate('sender', 'firstName lastName avatar uniqueId')
        .lean(),
      Message.find(groupFilter)
        .sort({ _id: -1 })
        .limit(fetchEach)
        .populate('sender', 'firstName lastName avatar uniqueId')
        .lean(),
    ]);

    // Tag each hit with chatType + chatId so the client can route on click.
    const tagged = [
      ...dmHits.map(m => ({ ...m, chatType: 'dm', chatId: m.conversation })),
      ...groupHits.map(m => ({ ...m, chatType: 'group', chatId: m.group })),
    ];

    // Interleave by `_id` desc (which sorts by creation time on default
    // ObjectId values). This gives a unified "newest first" feed.
    tagged.sort((a, b) => String(b._id).localeCompare(String(a._id)));

    res.json({
      results: tagged.slice(0, limit),
      hasMore: tagged.length > limit,
    });
  } catch (err) {
    console.error('[messages] search error:', err.message);
    res.status(500).json({ message: 'Ошибка поиска' });
  }
});

module.exports = router;
